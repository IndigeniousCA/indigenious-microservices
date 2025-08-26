import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { S3Service, UploadResult } from './s3.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { DocumentStatus, DocumentCategory, AccessLevel } from '../types/document.types';

export interface CreateDocumentInput {
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: DocumentCategory;
  tags?: string[];
  projectId?: string;
  rfqId?: string;
  businessId: string;
  uploadedBy: string;
  accessLevel?: AccessLevel;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[];
  accessLevel?: AccessLevel;
  metadata?: Record<string, any>;
}

export interface DocumentFilter {
  businessId?: string;
  category?: DocumentCategory;
  tags?: string[];
  projectId?: string;
  rfqId?: string;
  uploadedBy?: string;
  status?: DocumentStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export class DocumentService {
  /**
   * Create a new document record
   */
  static async createDocument(
    input: CreateDocumentInput,
    s3Result: UploadResult
  ): Promise<any> {
    try {
      const document = await prisma.document.create({
        data: {
          id: uuidv4(),
          title: input.title,
          description: input.description,
          fileName: input.fileName,
          fileType: this.getFileExtension(input.fileName),
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          s3Key: s3Result.key,
          s3Bucket: s3Result.bucket,
          url: s3Result.url,
          etag: s3Result.etag,
          
          category: input.category,
          tags: input.tags || [],
          projectId: input.projectId,
          rfqId: input.rfqId,
          businessId: input.businessId,
          
          version: 1,
          isLatest: true,
          
          uploadedBy: input.uploadedBy,
          status: DocumentStatus.READY,
          accessLevel: input.accessLevel || AccessLevel.PRIVATE,
          
          metadata: input.metadata || {},
          viewCount: 0,
          downloadCount: 0,
        },
      });

      // Cache document metadata
      await this.cacheDocument(document);

      // Create initial version record
      await this.createVersion(document.id, {
        version: 1,
        s3Key: s3Result.key,
        fileSize: input.fileSize,
        uploadedBy: input.uploadedBy,
        changes: 'Initial upload',
      });

      logger.info('Document created', {
        documentId: document.id,
        title: document.title,
        businessId: document.businessId,
      });

      return document;
    } catch (error) {
      logger.error('Failed to create document', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  static async getDocument(documentId: string, incrementView = false): Promise<any> {
    try {
      // Check cache first
      const cached = await redis.get(`document:${documentId}`);
      if (cached) {
        const document = JSON.parse(cached);
        
        if (incrementView) {
          // Async increment view count
          this.incrementViewCount(documentId);
        }
        
        return document;
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
          sharedWith: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      if (incrementView) {
        await this.incrementViewCount(documentId);
      }

      // Cache document
      await this.cacheDocument(document);

      return document;
    } catch (error) {
      logger.error('Failed to get document', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  static async updateDocument(
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<any> {
    try {
      const document = await prisma.document.update({
        where: { id: documentId },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await redis.del(`document:${documentId}`);

      logger.info('Document updated', { documentId });

      return document;
    } catch (error) {
      logger.error('Failed to update document', error);
      throw error;
    }
  }

  /**
   * Upload new version of document
   */
  static async uploadNewVersion(
    documentId: string,
    file: Buffer,
    fileName: string,
    uploadedBy: string,
    changes?: string
  ): Promise<any> {
    try {
      // Get current document
      const currentDoc = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!currentDoc) {
        throw new Error('Document not found');
      }

      // Upload new file to S3
      const s3Result = await S3Service.uploadFile(file, fileName, {
        metadata: {
          documentId,
          version: (currentDoc.version + 1).toString(),
        },
      });

      // Create new version record
      const newVersion = await this.createVersion(documentId, {
        version: currentDoc.version + 1,
        s3Key: s3Result.key,
        fileSize: file.length,
        uploadedBy,
        changes: changes || `Version ${currentDoc.version + 1}`,
      });

      // Update document with new version
      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: {
          version: currentDoc.version + 1,
          s3Key: s3Result.key,
          url: s3Result.url,
          etag: s3Result.etag,
          fileSize: file.length,
          fileName,
          updatedAt: new Date(),
        },
      });

      // Mark previous versions as not latest
      await prisma.documentVersion.updateMany({
        where: {
          documentId,
          version: { lt: newVersion.version },
        },
        data: { isLatest: false },
      });

      // Invalidate cache
      await redis.del(`document:${documentId}`);

      logger.info('New document version uploaded', {
        documentId,
        version: newVersion.version,
      });

      return updatedDoc;
    } catch (error) {
      logger.error('Failed to upload new version', error);
      throw error;
    }
  }

  /**
   * List documents with filters
   */
  static async listDocuments(
    filter: DocumentFilter,
    page = 1,
    limit = 20
  ): Promise<{ documents: any[]; total: number }> {
    try {
      const where: any = {};

      if (filter.businessId) where.businessId = filter.businessId;
      if (filter.category) where.category = filter.category;
      if (filter.projectId) where.projectId = filter.projectId;
      if (filter.rfqId) where.rfqId = filter.rfqId;
      if (filter.uploadedBy) where.uploadedBy = filter.uploadedBy;
      if (filter.status) where.status = filter.status;

      if (filter.tags && filter.tags.length > 0) {
        where.tags = { hasSome: filter.tags };
      }

      if (filter.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { fileName: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) where.createdAt.gte = filter.startDate;
        if (filter.endDate) where.createdAt.lte = filter.endDate;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.document.count({ where }),
      ]);

      return { documents, total };
    } catch (error) {
      logger.error('Failed to list documents', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete all versions from S3
      const deletePromises = [
        S3Service.deleteFile(document.s3Key),
        ...document.versions.map(v => S3Service.deleteFile(v.s3Key)),
      ];

      await Promise.all(deletePromises);

      // Delete from database
      await prisma.document.delete({
        where: { id: documentId },
      });

      // Remove from cache
      await redis.del(`document:${documentId}`);

      logger.info('Document deleted', { documentId });
    } catch (error) {
      logger.error('Failed to delete document', error);
      throw error;
    }
  }

  /**
   * Get document versions
   */
  static async getVersions(documentId: string): Promise<any[]> {
    try {
      const versions = await prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { version: 'desc' },
        include: {
          uploadedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return versions;
    } catch (error) {
      logger.error('Failed to get document versions', error);
      throw error;
    }
  }

  /**
   * Restore specific version
   */
  static async restoreVersion(documentId: string, versionNumber: number): Promise<any> {
    try {
      const version = await prisma.documentVersion.findUnique({
        where: {
          documentId_version: {
            documentId,
            version: versionNumber,
          },
        },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      // Copy old version file as new version
      const newVersion = await prisma.documentVersion.count({
        where: { documentId },
      }) + 1;

      const newKey = `documents/${documentId}/v${newVersion}/${version.fileName}`;
      await S3Service.copyFile(version.s3Key, newKey);

      // Create new version record
      await this.createVersion(documentId, {
        version: newVersion,
        s3Key: newKey,
        fileSize: version.fileSize,
        uploadedBy: version.uploadedBy,
        changes: `Restored from version ${versionNumber}`,
      });

      // Update document
      const document = await prisma.document.update({
        where: { id: documentId },
        data: {
          version: newVersion,
          s3Key: newKey,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await redis.del(`document:${documentId}`);

      logger.info('Document version restored', {
        documentId,
        restoredVersion: versionNumber,
        newVersion,
      });

      return document;
    } catch (error) {
      logger.error('Failed to restore version', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for document
   */
  static async generateThumbnail(documentId: string): Promise<string | null> {
    try {
      const document = await this.getDocument(documentId);
      
      // Only generate thumbnails for supported types
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!supportedTypes.includes(document.mimeType)) {
        return null;
      }

      // Queue thumbnail generation job
      const { addJob } = await import('../config/queue');
      await addJob('generateThumbnail', {
        documentId,
        s3Key: document.s3Key,
        mimeType: document.mimeType,
      });

      return 'processing';
    } catch (error) {
      logger.error('Failed to generate thumbnail', error);
      return null;
    }
  }

  /**
   * Helper: Create version record
   */
  private static async createVersion(
    documentId: string,
    data: {
      version: number;
      s3Key: string;
      fileSize: number;
      uploadedBy: string;
      changes?: string;
    }
  ): Promise<any> {
    return prisma.documentVersion.create({
      data: {
        id: uuidv4(),
        documentId,
        version: data.version,
        s3Key: data.s3Key,
        fileSize: data.fileSize,
        uploadedBy: data.uploadedBy,
        changes: data.changes,
        isLatest: true,
      },
    });
  }

  /**
   * Helper: Cache document
   */
  private static async cacheDocument(document: any): Promise<void> {
    await redis.setex(
      `document:${document.id}`,
      3600, // 1 hour
      JSON.stringify(document)
    );
  }

  /**
   * Helper: Increment view count
   */
  private static async incrementViewCount(documentId: string): Promise<void> {
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        },
      });
    } catch (error) {
      // Don't fail if view count update fails
      logger.warn('Failed to increment view count', { documentId, error });
    }
  }

  /**
   * Helper: Get file extension
   */
  private static getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  /**
   * Search documents using full-text search
   */
  static async searchDocuments(
    query: string,
    businessId?: string,
    limit = 20
  ): Promise<any[]> {
    try {
      // In production, would use ElasticSearch or similar
      // For now, use database search
      const documents = await prisma.document.findMany({
        where: {
          AND: [
            businessId ? { businessId } : {},
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { fileName: { contains: query, mode: 'insensitive' } },
                { tags: { has: query } },
              ],
            },
          ],
        },
        take: limit,
        orderBy: { viewCount: 'desc' },
      });

      return documents;
    } catch (error) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }
}

export default DocumentService;