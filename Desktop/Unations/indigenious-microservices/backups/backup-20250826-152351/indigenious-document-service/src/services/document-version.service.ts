import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { S3Client, CopyObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  filename: string;
  s3Key: string;
  size: number;
  checksum: string;
  changes?: string;
  createdBy: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface VersionComparisonResult {
  added: string[];
  removed: string[];
  modified: string[];
  similarity: number;
}

export class DocumentVersionService {
  private static s3Client: S3Client;
  private static readonly BUCKET_NAME = process.env.S3_BUCKET_NAME || 'indigenious-documents';
  private static readonly MAX_VERSIONS = 50;
  private static readonly VERSION_RETENTION_DAYS = 365; // 1 year

  /**
   * Initialize the version service
   */
  static async initialize(): Promise<void> {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ca-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Create a new version of a document
   */
  static async createVersion(
    documentId: string,
    newFileKey: string,
    fileSize: number,
    userId: string,
    changes?: string,
    metadata?: Record<string, any>
  ): Promise<DocumentVersion> {
    try {
      // Get current document
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Determine next version number
      const currentVersion = document.versions[0];
      const nextVersionNumber = currentVersion ? currentVersion.versionNumber + 1 : 1;

      // If this is not the first version, archive the current version
      if (currentVersion) {
        await this.archiveCurrentVersion(document);
      }

      // Calculate checksum for new version
      const checksum = await this.calculateFileChecksum(newFileKey);

      // Create version record
      const version = await prisma.documentVersion.create({
        data: {
          id: uuidv4(),
          documentId,
          versionNumber: nextVersionNumber,
          filename: document.originalName,
          s3Key: newFileKey,
          size: fileSize,
          checksum,
          changes,
          createdBy: userId,
          metadata: metadata || {},
        },
      });

      // Update main document to point to new version
      await prisma.document.update({
        where: { id: documentId },
        data: {
          s3Key: newFileKey,
          size: fileSize,
          checksum,
          currentVersion: nextVersionNumber,
          lastModifiedBy: userId,
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await redis.del(`document:${documentId}`);
      await redis.del(`document-versions:${documentId}`);

      // Clean up old versions if exceeding limit
      await this.cleanupOldVersions(documentId);

      logger.info('Document version created', {
        documentId,
        versionNumber: nextVersionNumber,
        userId,
      });

      return this.formatVersion(version);
    } catch (error) {
      logger.error('Failed to create document version', error);
      throw error;
    }
  }

  /**
   * Get all versions of a document
   */
  static async getVersions(
    documentId: string,
    options: {
      page?: number;
      limit?: number;
      includeDeleted?: boolean;
    } = {}
  ): Promise<{
    versions: DocumentVersion[];
    total: number;
    currentVersion: number;
  }> {
    try {
      // Check cache
      const cacheKey = `document-versions:${documentId}`;
      const cached = await redis.get(cacheKey);
      if (cached && !options.page) {
        return JSON.parse(cached);
      }

      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = { documentId };
      if (!options.includeDeleted) {
        where.deletedAt = null;
      }

      const [versions, total, document] = await Promise.all([
        prisma.documentVersion.findMany({
          where,
          orderBy: { versionNumber: 'desc' },
          skip,
          take: limit,
        }),
        prisma.documentVersion.count({ where }),
        prisma.document.findUnique({
          where: { id: documentId },
          select: { currentVersion: true },
        }),
      ]);

      const result = {
        versions: versions.map(v => this.formatVersion(v)),
        total,
        currentVersion: document?.currentVersion || 0,
      };

      // Cache if getting all versions
      if (!options.page) {
        await redis.setex(cacheKey, 3600, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      logger.error('Failed to get document versions', error);
      throw error;
    }
  }

  /**
   * Get a specific version of a document
   */
  static async getVersion(
    documentId: string,
    versionNumber: number
  ): Promise<DocumentVersion> {
    try {
      const version = await prisma.documentVersion.findFirst({
        where: {
          documentId,
          versionNumber,
        },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      return this.formatVersion(version);
    } catch (error) {
      logger.error('Failed to get document version', error);
      throw error;
    }
  }

  /**
   * Restore a previous version
   */
  static async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string
  ): Promise<DocumentVersion> {
    try {
      // Get the version to restore
      const versionToRestore = await this.getVersion(documentId, versionNumber);

      // Copy the old version's file to a new location
      const newKey = `documents/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uuidv4()}-restored`;
      
      await this.s3Client.send(new CopyObjectCommand({
        Bucket: this.BUCKET_NAME,
        CopySource: `${this.BUCKET_NAME}/${versionToRestore.s3Key}`,
        Key: newKey,
      }));

      // Create a new version with the restored content
      const restoredVersion = await this.createVersion(
        documentId,
        newKey,
        versionToRestore.size,
        userId,
        `Restored from version ${versionNumber}`,
        {
          restoredFrom: versionNumber,
          restoredAt: new Date(),
        }
      );

      logger.info('Document version restored', {
        documentId,
        restoredVersion: versionNumber,
        newVersion: restoredVersion.versionNumber,
      });

      return restoredVersion;
    } catch (error) {
      logger.error('Failed to restore document version', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    documentId: string,
    version1: number,
    version2: number
  ): Promise<VersionComparisonResult> {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(documentId, version1),
        this.getVersion(documentId, version2),
      ]);

      // Compare metadata
      const comparison: VersionComparisonResult = {
        added: [],
        removed: [],
        modified: [],
        similarity: 0,
      };

      // Compare file sizes
      if (v1.size !== v2.size) {
        comparison.modified.push(`Size changed from ${v1.size} to ${v2.size} bytes`);
      }

      // Compare checksums
      if (v1.checksum !== v2.checksum) {
        comparison.modified.push('File content has changed');
      }

      // Calculate similarity based on size difference
      const sizeDiff = Math.abs(v1.size - v2.size);
      const avgSize = (v1.size + v2.size) / 2;
      comparison.similarity = Math.max(0, 100 - (sizeDiff / avgSize) * 100);

      // Compare metadata
      const v1Meta = v1.metadata || {};
      const v2Meta = v2.metadata || {};

      const v1Keys = Object.keys(v1Meta);
      const v2Keys = Object.keys(v2Meta);

      comparison.added = v2Keys.filter(key => !v1Keys.includes(key));
      comparison.removed = v1Keys.filter(key => !v2Keys.includes(key));

      const commonKeys = v1Keys.filter(key => v2Keys.includes(key));
      for (const key of commonKeys) {
        if (JSON.stringify(v1Meta[key]) !== JSON.stringify(v2Meta[key])) {
          comparison.modified.push(`Metadata '${key}' changed`);
        }
      }

      return comparison;
    } catch (error) {
      logger.error('Failed to compare versions', error);
      throw error;
    }
  }

  /**
   * Delete a version (soft delete)
   */
  static async deleteVersion(
    documentId: string,
    versionNumber: number,
    userId: string
  ): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Cannot delete current version
      if (document.currentVersion === versionNumber) {
        throw new Error('Cannot delete current version');
      }

      // Soft delete the version
      await prisma.documentVersion.update({
        where: {
          documentId_versionNumber: {
            documentId,
            versionNumber,
          },
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Clear cache
      await redis.del(`document-versions:${documentId}`);

      logger.info('Document version deleted', {
        documentId,
        versionNumber,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete document version', error);
      throw error;
    }
  }

  /**
   * Get version history with detailed changes
   */
  static async getVersionHistory(
    documentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    timeline: Array<{
      date: string;
      versions: DocumentVersion[];
      summary: string;
    }>;
    totalChanges: number;
    contributors: Array<{
      userId: string;
      versionCount: number;
      lastContribution: Date;
    }>;
  }> {
    try {
      const where: any = { documentId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const versions = await prisma.documentVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Group by date
      const timeline: Map<string, DocumentVersion[]> = new Map();
      const contributors: Map<string, { count: number; lastDate: Date }> = new Map();

      for (const version of versions) {
        const dateKey = dayjs(version.createdAt).format('YYYY-MM-DD');
        
        if (!timeline.has(dateKey)) {
          timeline.set(dateKey, []);
        }
        timeline.get(dateKey)!.push(this.formatVersion(version));

        // Track contributors
        if (!contributors.has(version.createdBy)) {
          contributors.set(version.createdBy, { count: 0, lastDate: version.createdAt });
        }
        const contrib = contributors.get(version.createdBy)!;
        contrib.count++;
        if (version.createdAt > contrib.lastDate) {
          contrib.lastDate = version.createdAt;
        }
      }

      // Format timeline
      const formattedTimeline = Array.from(timeline.entries()).map(([date, dateVersions]) => ({
        date,
        versions: dateVersions,
        summary: `${dateVersions.length} version(s) created`,
      }));

      // Format contributors
      const formattedContributors = Array.from(contributors.entries()).map(([userId, stats]) => ({
        userId,
        versionCount: stats.count,
        lastContribution: stats.lastDate,
      }));

      return {
        timeline: formattedTimeline,
        totalChanges: versions.length,
        contributors: formattedContributors.sort((a, b) => b.versionCount - a.versionCount),
      };
    } catch (error) {
      logger.error('Failed to get version history', error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for a specific version
   */
  static async getVersionDownloadUrl(
    documentId: string,
    versionNumber: number,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const version = await this.getVersion(documentId, versionNumber);

      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: version.s3Key,
        ResponseContentDisposition: `attachment; filename="${version.filename}-v${versionNumber}"`,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // Log version access
      await prisma.documentAccess.create({
        data: {
          documentId,
          action: `download_version_${versionNumber}`,
          userId: 'anonymous', // Would be from auth context
          timestamp: new Date(),
        },
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate version download URL', error);
      throw error;
    }
  }

  /**
   * Helper: Archive current version before creating new one
   */
  private static async archiveCurrentVersion(document: any): Promise<void> {
    const archiveKey = `archives/documents/${document.id}/v${document.currentVersion || 1}/${document.s3Key.split('/').pop()}`;
    
    await this.s3Client.send(new CopyObjectCommand({
      Bucket: this.BUCKET_NAME,
      CopySource: `${this.BUCKET_NAME}/${document.s3Key}`,
      Key: archiveKey,
      StorageClass: 'GLACIER_IR', // Cost-effective storage for archives
    }));
  }

  /**
   * Helper: Clean up old versions
   */
  private static async cleanupOldVersions(documentId: string): Promise<void> {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      skip: this.MAX_VERSIONS,
    });

    if (versions.length > 0) {
      // Move old versions to archive storage
      for (const version of versions) {
        const archiveKey = `archives/old-versions/${documentId}/${version.s3Key}`;
        
        await this.s3Client.send(new CopyObjectCommand({
          Bucket: this.BUCKET_NAME,
          CopySource: `${this.BUCKET_NAME}/${version.s3Key}`,
          Key: archiveKey,
          StorageClass: 'DEEP_ARCHIVE',
        }));

        // Mark as archived
        await prisma.documentVersion.update({
          where: { id: version.id },
          data: { 
            archived: true,
            archivedAt: new Date(),
          },
        });
      }

      logger.info(`Archived ${versions.length} old versions for document ${documentId}`);
    }
  }

  /**
   * Helper: Calculate file checksum
   */
  private static async calculateFileChecksum(s3Key: string): Promise<string> {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: s3Key,
    }));

    const chunks: Buffer[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Helper: Format version data
   */
  private static formatVersion(version: any): DocumentVersion {
    return {
      id: version.id,
      documentId: version.documentId,
      versionNumber: version.versionNumber,
      filename: version.filename,
      s3Key: version.s3Key,
      size: version.size,
      checksum: version.checksum,
      changes: version.changes,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      metadata: version.metadata,
    };
  }
}

export default DocumentVersionService;