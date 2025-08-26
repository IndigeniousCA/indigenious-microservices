import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import archiver from 'archiver';
import unzipper from 'unzipper';
import fileType from 'file-type';
import ClamAV from 'node-clamav';
import mime from 'mime-types';

export interface DocumentMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  businessId?: string;
  userId: string;
  category?: string;
  tags?: string[];
  isIndigenous?: boolean;
  language?: string;
  checksum: string;
  scanStatus?: 'pending' | 'clean' | 'infected' | 'error';
  createdAt: Date;
  updatedAt?: Date;
}

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  scanForVirus?: boolean;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
  detectLanguage?: boolean;
}

export class DocumentStorageService {
  private static s3Client: S3Client;
  private static clamav: ClamAV;
  private static readonly BUCKET_NAME = process.env.S3_BUCKET_NAME || 'indigenious-documents';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly THUMBNAIL_SIZE = { width: 200, height: 200 };
  private static readonly SIGNED_URL_EXPIRY = 3600; // 1 hour

  /**
   * Initialize the storage service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize S3 client
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ca-central-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      // Initialize ClamAV for virus scanning
      if (process.env.ENABLE_VIRUS_SCAN === 'true') {
        this.clamav = new ClamAV({
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
        });
      }

      logger.info('Document storage service initialized');
    } catch (error) {
      logger.error('Failed to initialize document storage service', error);
      throw error;
    }
  }

  /**
   * Configure multer for file uploads
   */
  static getMulterUpload(options: UploadOptions = {}) {
    const storage = multerS3({
      s3: this.s3Client,
      bucket: this.BUCKET_NAME,
      acl: 'private',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, {
          originalName: file.originalname,
          uploadedBy: (req as any).user?.userId || 'anonymous',
          businessId: (req as any).user?.businessId || '',
        });
      },
      key: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        const key = `documents/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueId}${ext}`;
        cb(null, key);
      },
    });

    const fileFilter = (req: any, file: any, cb: any) => {
      // Check file type
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;
        
        const isAllowed = options.allowedTypes.some(type => 
          type === mimeType || type === ext.substring(1)
        );

        if (!isAllowed) {
          return cb(new Error(`File type ${ext} not allowed`), false);
        }
      }

      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: options.maxSize || this.MAX_FILE_SIZE,
      },
    });
  }

  /**
   * Upload document with metadata
   */
  static async uploadDocument(
    file: Express.Multer.File,
    metadata: Partial<DocumentMetadata>,
    options: UploadOptions = {}
  ): Promise<DocumentMetadata> {
    try {
      const documentId = uuidv4();
      const fileKey = (file as any).key || file.filename;
      
      // Calculate file checksum
      const fileBuffer = file.buffer || await fs.readFile(file.path);
      const checksum = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // Scan for viruses if enabled
      let scanStatus: string = 'pending';
      if (options.scanForVirus && this.clamav) {
        try {
          const scanResult = await this.scanFile(fileBuffer);
          scanStatus = scanResult.isInfected ? 'infected' : 'clean';
          
          if (scanResult.isInfected) {
            // Delete infected file
            await this.deleteFile(fileKey);
            throw new Error(`File infected with: ${scanResult.viruses.join(', ')}`);
          }
        } catch (error) {
          logger.error('Virus scan failed', error);
          scanStatus = 'error';
        }
      }

      // Detect file type from buffer
      const detectedType = await fileType.fromBuffer(fileBuffer);
      const mimeType = detectedType?.mime || file.mimetype;

      // Generate thumbnail for images
      let thumbnailKey: string | undefined;
      if (options.generateThumbnail && mimeType.startsWith('image/')) {
        thumbnailKey = await this.generateThumbnail(fileBuffer, fileKey);
      }

      // Extract text content for searchability
      let extractedText: string | undefined;
      if (options.extractMetadata) {
        extractedText = await this.extractTextContent(fileBuffer, mimeType);
      }

      // Detect language if Indigenous content
      let detectedLanguage: string | undefined;
      if (options.detectLanguage && extractedText) {
        detectedLanguage = await this.detectIndigenousLanguage(extractedText);
      }

      // Store document metadata in database
      const document = await prisma.document.create({
        data: {
          id: documentId,
          filename: fileKey,
          originalName: file.originalname,
          mimeType,
          size: file.size,
          businessId: metadata.businessId,
          userId: metadata.userId!,
          category: metadata.category,
          tags: metadata.tags || [],
          isIndigenous: metadata.isIndigenous || !!detectedLanguage,
          language: detectedLanguage || metadata.language,
          checksum,
          scanStatus,
          s3Key: fileKey,
          thumbnailKey,
          extractedText,
          metadata: {
            ...metadata,
            uploadedAt: new Date(),
          },
        },
      });

      // Cache document metadata
      await this.cacheDocumentMetadata(document);

      logger.info('Document uploaded successfully', {
        documentId,
        filename: file.originalname,
        size: file.size,
      });

      return this.formatDocumentMetadata(document);
    } catch (error) {
      logger.error('Failed to upload document', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  static async getDocument(documentId: string): Promise<DocumentMetadata> {
    try {
      // Check cache first
      const cached = await redis.get(`document:${documentId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const metadata = this.formatDocumentMetadata(document);
      
      // Cache for future requests
      await this.cacheDocumentMetadata(document);

      return metadata;
    } catch (error) {
      logger.error('Failed to get document', error);
      throw error;
    }
  }

  /**
   * Get signed URL for document download
   */
  static async getSignedDownloadUrl(
    documentId: string,
    expiresIn: number = this.SIGNED_URL_EXPIRY
  ): Promise<string> {
    try {
      const document = await this.getDocument(documentId);
      
      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: document.filename,
        ResponseContentDisposition: `attachment; filename="${document.originalName}"`,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // Log download request
      await this.logDocumentAccess(documentId, 'download');

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL', error);
      throw error;
    }
  }

  /**
   * Get signed URL for document upload
   */
  static async getSignedUploadUrl(
    filename: string,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<{ uploadUrl: string; key: string }> {
    try {
      const uniqueId = uuidv4();
      const ext = path.extname(filename);
      const key = `documents/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueId}${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          originalName: filename,
          ...metadata,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      return { uploadUrl, key };
    } catch (error) {
      logger.error('Failed to generate upload URL', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId);

      // Delete from S3
      await this.deleteFile(document.filename);

      // Delete thumbnail if exists
      if ((document as any).thumbnailKey) {
        await this.deleteFile((document as any).thumbnailKey);
      }

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
   * Create document archive (ZIP)
   */
  static async createArchive(
    documentIds: string[],
    archiveName: string
  ): Promise<string> {
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const archiveKey = `archives/${uuidv4()}-${archiveName}.zip`;
      const passThrough = new (require('stream')).PassThrough();

      // Upload archive to S3 as it's created
      const uploadPromise = this.s3Client.send(new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: archiveKey,
        Body: passThrough,
        ContentType: 'application/zip',
      }));

      archive.pipe(passThrough);

      // Add documents to archive
      for (const documentId of documentIds) {
        const document = await this.getDocument(documentId);
        
        const command = new GetObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: document.filename,
        });

        const response = await this.s3Client.send(command);
        const stream = response.Body as any;

        archive.append(stream, { name: document.originalName });
      }

      await archive.finalize();
      await uploadPromise;

      // Generate signed URL for download
      const downloadUrl = await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: archiveKey,
        }),
        { expiresIn: 3600 }
      );

      return downloadUrl;
    } catch (error) {
      logger.error('Failed to create archive', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  static async searchDocuments(
    query: string,
    filters: {
      businessId?: string;
      userId?: string;
      category?: string;
      tags?: string[];
      language?: string;
      isIndigenous?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    documents: DocumentMetadata[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Apply filters
      if (filters.businessId) where.businessId = filters.businessId;
      if (filters.userId) where.userId = filters.userId;
      if (filters.category) where.category = filters.category;
      if (filters.language) where.language = filters.language;
      if (filters.isIndigenous !== undefined) where.isIndigenous = filters.isIndigenous;
      
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      // Text search
      if (query) {
        where.OR = [
          { originalName: { contains: query, mode: 'insensitive' } },
          { extractedText: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.document.count({ where }),
      ]);

      return {
        documents: documents.map(doc => this.formatDocumentMetadata(doc)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }

  /**
   * Helper: Scan file for viruses
   */
  private static async scanFile(buffer: Buffer): Promise<{
    isInfected: boolean;
    viruses: string[];
  }> {
    try {
      const result = await this.clamav.scanBuffer(buffer);
      return {
        isInfected: result.isInfected,
        viruses: result.viruses || [],
      };
    } catch (error) {
      logger.error('Virus scan failed', error);
      throw error;
    }
  }

  /**
   * Helper: Generate thumbnail for images
   */
  private static async generateThumbnail(
    buffer: Buffer,
    originalKey: string
  ): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(this.THUMBNAIL_SIZE.width, this.THUMBNAIL_SIZE.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = originalKey.replace(/(\.[^.]+)$/, '-thumb.jpg');

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }));

      return thumbnailKey;
    } catch (error) {
      logger.error('Failed to generate thumbnail', error);
      return '';
    }
  }

  /**
   * Helper: Extract text content from document
   */
  private static async extractTextContent(
    buffer: Buffer,
    mimeType: string
  ): Promise<string | undefined> {
    // This would use OCR or text extraction services
    // Placeholder implementation
    return undefined;
  }

  /**
   * Helper: Detect Indigenous language in text
   */
  private static async detectIndigenousLanguage(text: string): Promise<string | undefined> {
    const indigenousPatterns = {
      ojibwe: [/\bmigwech\b/i, /\banishinaabe\b/i, /\bboozhoo\b/i],
      cree: [/\btansi\b/i, /\bkahkiyaw\b/i, /\bekosi\b/i],
      inuktitut: [/\bᐃᓄᒃᑎᑐᑦ\b/, /\bqujannamiik\b/i],
      mikmaq: [/\bwela'lin\b/i, /\bkwe'\b/i, /\bmsit\b/i],
      mohawk: [/\bskennen\b/i, /\bnia:wen\b/i],
    };

    for (const [language, patterns] of Object.entries(indigenousPatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        return language;
      }
    }

    return undefined;
  }

  /**
   * Helper: Delete file from S3
   */
  private static async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    }));
  }

  /**
   * Helper: Cache document metadata
   */
  private static async cacheDocumentMetadata(document: any): Promise<void> {
    const metadata = this.formatDocumentMetadata(document);
    await redis.setex(
      `document:${document.id}`,
      3600, // 1 hour
      JSON.stringify(metadata)
    );
  }

  /**
   * Helper: Log document access
   */
  private static async logDocumentAccess(
    documentId: string,
    action: string
  ): Promise<void> {
    await prisma.documentAccess.create({
      data: {
        documentId,
        action,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Helper: Format document metadata
   */
  private static formatDocumentMetadata(document: any): DocumentMetadata {
    return {
      id: document.id,
      filename: document.filename || document.s3Key,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      businessId: document.businessId,
      userId: document.userId,
      category: document.category,
      tags: document.tags,
      isIndigenous: document.isIndigenous,
      language: document.language,
      checksum: document.checksum,
      scanStatus: document.scanStatus,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}

export default DocumentStorageService;