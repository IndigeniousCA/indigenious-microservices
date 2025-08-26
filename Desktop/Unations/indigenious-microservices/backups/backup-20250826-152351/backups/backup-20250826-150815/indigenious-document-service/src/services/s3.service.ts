import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { Readable } from 'stream';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined, // Use IAM role if no credentials provided
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'indigenious-documents';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for multipart upload
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  acl?: 'private' | 'public-read';
  serverSideEncryption?: boolean;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  etag?: string;
  versionId?: string;
  size?: number;
}

export class S3Service {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    file: Buffer | Readable,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const key = this.generateKey(fileName);
      const contentType = options.contentType || mime.lookup(fileName) || 'application/octet-stream';

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          ...options.metadata,
          uploadedAt: new Date().toISOString(),
        },
        Tagging: options.tags ? this.formatTags(options.tags) : undefined,
        ACL: options.acl || 'private',
        ServerSideEncryption: options.serverSideEncryption ? 'AES256' : undefined,
      });

      const response = await s3Client.send(command);

      logger.info('File uploaded to S3', {
        key,
        bucket: BUCKET_NAME,
        etag: response.ETag,
        versionId: response.VersionId,
      });

      return {
        key,
        bucket: BUCKET_NAME,
        url: this.getPublicUrl(key),
        etag: response.ETag,
        versionId: response.VersionId,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload large file using multipart upload
   */
  static async uploadLargeFile(
    filePath: string,
    fileName: string,
    fileSize: number,
    onProgress?: (percentage: number) => void
  ): Promise<UploadResult> {
    const key = this.generateKey(fileName);
    let uploadId: string | undefined;

    try {
      // Initiate multipart upload
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: mime.lookup(fileName) || 'application/octet-stream',
      });

      const { UploadId } = await s3Client.send(createCommand);
      uploadId = UploadId;

      // Upload parts
      const numParts = Math.ceil(fileSize / CHUNK_SIZE);
      const parts = [];
      let uploadedBytes = 0;

      for (let i = 0; i < numParts; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const partNumber = i + 1;

        // In real implementation, read chunk from file
        const chunk = Buffer.alloc(end - start); // Placeholder

        const uploadPartCommand = new UploadPartCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: chunk,
        });

        const { ETag } = await s3Client.send(uploadPartCommand);
        
        parts.push({
          ETag,
          PartNumber: partNumber,
        });

        uploadedBytes += chunk.length;
        if (onProgress) {
          onProgress((uploadedBytes / fileSize) * 100);
        }
      }

      // Complete multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });

      const response = await s3Client.send(completeCommand);

      logger.info('Large file uploaded via multipart', {
        key,
        bucket: BUCKET_NAME,
        parts: parts.length,
      });

      return {
        key,
        bucket: BUCKET_NAME,
        url: this.getPublicUrl(key),
        etag: response.ETag,
        versionId: response.VersionId,
        size: fileSize,
      };
    } catch (error) {
      // Abort multipart upload on error
      if (uploadId) {
        await this.abortMultipartUpload(key, uploadId);
      }
      logger.error('Multipart upload failed', error);
      throw error;
    }
  }

  /**
   * Download a file from S3
   */
  static async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file body received');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Failed to download file from S3', error);
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }

  /**
   * Get presigned URL for direct upload
   */
  static async getPresignedUploadUrl(
    fileName: string,
    contentType?: string,
    expiresIn = PRESIGNED_URL_EXPIRY
  ): Promise<{ url: string; key: string }> {
    try {
      const key = this.generateKey(fileName);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType || mime.lookup(fileName) || 'application/octet-stream',
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });

      return { url, key };
    } catch (error) {
      logger.error('Failed to generate presigned upload URL', error);
      throw error;
    }
  }

  /**
   * Get presigned URL for download
   */
  static async getPresignedDownloadUrl(
    key: string,
    expiresIn = PRESIGNED_URL_EXPIRY,
    fileName?: string
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: fileName 
          ? `attachment; filename="${fileName}"`
          : undefined,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate presigned download URL', error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      
      logger.info('File deleted from S3', { key, bucket: BUCKET_NAME });
    } catch (error) {
      logger.error('Failed to delete file from S3', error);
      throw error;
    }
  }

  /**
   * Copy a file within S3 (for versioning)
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
      });

      await s3Client.send(command);
      
      logger.info('File copied in S3', {
        source: sourceKey,
        destination: destinationKey,
      });
    } catch (error) {
      logger.error('Failed to copy file in S3', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      logger.error('Failed to get file metadata', error);
      throw error;
    }
  }

  /**
   * List files with prefix
   */
  static async listFiles(
    prefix: string,
    maxKeys = 100
  ): Promise<Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await s3Client.send(command);

      return (response.Contents || []).map(item => ({
        key: item.Key!,
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
    } catch (error) {
      logger.error('Failed to list files', error);
      throw error;
    }
  }

  /**
   * Generate unique S3 key
   */
  private static generateKey(fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const uuid = uuidv4();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `documents/${year}/${month}/${day}/${uuid}/${sanitizedFileName}`;
  }

  /**
   * Get public URL for a file
   */
  private static getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  /**
   * Format tags for S3
   */
  private static formatTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Abort multipart upload
   */
  private static async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      });

      await s3Client.send(command);
      logger.info('Multipart upload aborted', { key, uploadId });
    } catch (error) {
      logger.error('Failed to abort multipart upload', error);
    }
  }
}

// Export convenience functions
export async function uploadFile(
  file: Buffer | Readable,
  fileName: string,
  options?: UploadOptions
): Promise<UploadResult> {
  return S3Service.uploadFile(file, fileName, options);
}

export async function downloadFile(key: string): Promise<Buffer> {
  return S3Service.downloadFile(key);
}

export async function getSignedUploadUrl(
  fileName: string,
  contentType?: string
): Promise<{ url: string; key: string }> {
  return S3Service.getPresignedUploadUrl(fileName, contentType);
}

export async function getSignedDownloadUrl(
  documentId: string,
  token?: string
): Promise<string> {
  // In real implementation, validate token and get key from database
  const key = `documents/${documentId}`;
  return S3Service.getPresignedDownloadUrl(key);
}

export default S3Service;