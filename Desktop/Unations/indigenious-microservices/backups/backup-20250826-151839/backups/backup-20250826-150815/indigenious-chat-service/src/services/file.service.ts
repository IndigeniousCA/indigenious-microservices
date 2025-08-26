import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import path from 'path';
import { FileUploadResult, FileMetadata, FileValidation } from '../types/file.types';

export class FileService {
  private static s3Client: S3Client;
  private static readonly BUCKET_NAME = process.env.S3_BUCKET_NAME || 'indigenous-chat-files';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    blueprints: ['application/dwg', 'application/dxf', 'application/vnd.autodesk.autocad.dwg'],
    compressed: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  };

  /**
   * Initialize S3 client
   */
  static initialize(): void {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      } : undefined,
    });
    
    logger.info('File service initialized');
  }

  /**
   * Upload file to S3
   */
  static async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId: string,
    conversationId: string
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file, mimeType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const fileId = uuidv4();
      const fileExtension = path.extname(fileName);
      const key = `conversations/${conversationId}/${fileId}${fileExtension}`;

      // Generate thumbnail for images
      let thumbnailUrl = null;
      if (this.ALLOWED_FILE_TYPES.images.includes(mimeType)) {
        thumbnailUrl = await this.generateThumbnail(file, key);
      }

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: mimeType,
        Metadata: {
          userId,
          conversationId,
          originalName: fileName,
        },
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(uploadCommand);

      // Generate signed URL for access
      const url = await this.getSignedUrl(key);

      // Store file metadata in database
      const fileRecord = await prisma.file.create({
        data: {
          id: fileId,
          fileName,
          mimeType,
          size: file.length,
          s3Key: key,
          conversationId,
          uploadedBy: userId,
          thumbnailUrl,
          metadata: {
            originalName: fileName,
            extension: fileExtension,
          },
        },
      });

      logger.info('File uploaded successfully', {
        fileId,
        fileName,
        size: file.length,
        conversationId,
      });

      return {
        fileId,
        url,
        fileName,
        mimeType,
        size: file.length,
        thumbnailUrl,
      };
    } catch (error) {
      logger.error('Failed to upload file', error);
      throw error;
    }
  }

  /**
   * Process file attachment for message
   */
  static async processFileAttachment(data: {
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
  }): Promise<FileMetadata> {
    try {
      // Extract file info
      const fileExtension = path.extname(data.fileName);
      const isImage = this.ALLOWED_FILE_TYPES.images.includes(data.mimeType);
      const isDocument = this.ALLOWED_FILE_TYPES.documents.includes(data.mimeType) ||
                        this.ALLOWED_FILE_TYPES.spreadsheets.includes(data.mimeType);
      const isBlueprint = this.ALLOWED_FILE_TYPES.blueprints.includes(data.mimeType);

      // Determine file category
      let category = 'other';
      if (isImage) category = 'image';
      else if (isDocument) category = 'document';
      else if (isBlueprint) category = 'blueprint';

      return {
        url: data.url,
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        extension: fileExtension,
        category,
        isImage,
        isDocument,
        isBlueprint,
      };
    } catch (error) {
      logger.error('Failed to process file attachment', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for image
   */
  private static async generateThumbnail(
    imageBuffer: Buffer,
    originalKey: string
  ): Promise<string> {
    try {
      const thumbnailKey = originalKey.replace(/(\.[^.]+)$/, '_thumb$1');
      
      const thumbnail = await sharp(imageBuffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'centre',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const uploadCommand = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(uploadCommand);

      return await this.getSignedUrl(thumbnailKey);
    } catch (error) {
      logger.error('Failed to generate thumbnail', error);
      return '';
    }
  }

  /**
   * Get signed URL for file access
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate signed URL', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file record
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: file.s3Key,
      });

      await this.s3Client.send(deleteCommand);

      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbnailKey = file.s3Key.replace(/(\.[^.]+)$/, '_thumb$1');
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: thumbnailKey,
        }));
      }

      // Delete from database
      await prisma.file.delete({
        where: { id: fileId },
      });

      logger.info('File deleted successfully', { fileId });
    } catch (error) {
      logger.error('Failed to delete file', error);
      throw error;
    }
  }

  /**
   * Validate file
   */
  private static validateFile(file: Buffer, mimeType: string): FileValidation {
    // Check file size
    if (file.length > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // Check file type
    const allowedTypes = Object.values(this.ALLOWED_FILE_TYPES).flat();
    if (!allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: 'File type not allowed',
      };
    }

    // Additional validation for executables
    const dangerousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.app'];
    const hasD dangerousExtension = dangerousExtensions.some(ext => 
      file.toString('utf8', 0, 100).toLowerCase().includes(ext)
    );
    
    if (hasDangerousExtension) {
      return {
        valid: false,
        error: 'Potentially dangerous file detected',
      };
    }

    return { valid: true };
  }

  /**
   * Get conversation files
   */
  static async getConversationFiles(
    conversationId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
    } = {}
  ): Promise<any[]> {
    try {
      const { limit = 50, offset = 0, category } = options;

      const files = await prisma.file.findMany({
        where: {
          conversationId,
          ...(category && {
            metadata: {
              path: ['category'],
              equals: category,
            },
          }),
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      // Generate fresh signed URLs
      const filesWithUrls = await Promise.all(
        files.map(async (file) => ({
          ...file,
          url: await this.getSignedUrl(file.s3Key),
          thumbnailUrl: file.thumbnailUrl ? 
            await this.getSignedUrl(file.s3Key.replace(/(\.[^.]+)$/, '_thumb$1')) : 
            null,
        }))
      );

      return filesWithUrls;
    } catch (error) {
      logger.error('Failed to get conversation files', error);
      throw error;
    }
  }

  /**
   * Handle RFQ document upload
   */
  static async uploadRFQDocument(
    file: Buffer,
    fileName: string,
    mimeType: string,
    rfqId: string,
    userId: string
  ): Promise<FileUploadResult> {
    try {
      const fileId = uuidv4();
      const fileExtension = path.extname(fileName);
      const key = `rfq/${rfqId}/${fileId}${fileExtension}`;

      // Special handling for blueprints and CAD files
      const isBlueprint = this.ALLOWED_FILE_TYPES.blueprints.includes(mimeType);
      
      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: mimeType,
        Metadata: {
          userId,
          rfqId,
          originalName: fileName,
          documentType: isBlueprint ? 'blueprint' : 'document',
        },
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(uploadCommand);

      // Generate signed URL
      const url = await this.getSignedUrl(key, 7200); // 2 hour expiry for RFQ docs

      // Store in database
      await prisma.rfqDocument.create({
        data: {
          id: fileId,
          rfqId,
          fileName,
          mimeType,
          size: file.length,
          s3Key: key,
          uploadedBy: userId,
          isBlueprint,
          metadata: {
            originalName: fileName,
            extension: fileExtension,
          },
        },
      });

      logger.info('RFQ document uploaded', {
        fileId,
        rfqId,
        fileName,
        isBlueprint,
      });

      return {
        fileId,
        url,
        fileName,
        mimeType,
        size: file.length,
        isBlueprint,
      };
    } catch (error) {
      logger.error('Failed to upload RFQ document', error);
      throw error;
    }
  }

  /**
   * Get file statistics for conversation
   */
  static async getConversationFileStats(conversationId: string): Promise<any> {
    try {
      const stats = await prisma.file.groupBy({
        by: ['mimeType'],
        where: { conversationId },
        _count: {
          id: true,
        },
        _sum: {
          size: true,
        },
      });

      const totalFiles = await prisma.file.count({
        where: { conversationId },
      });

      const totalSize = await prisma.file.aggregate({
        where: { conversationId },
        _sum: {
          size: true,
        },
      });

      return {
        totalFiles,
        totalSize: totalSize._sum.size || 0,
        byType: stats,
      };
    } catch (error) {
      logger.error('Failed to get file statistics', error);
      throw error;
    }
  }
}

export default FileService;