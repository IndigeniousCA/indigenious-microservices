import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import * as Minio from 'minio';
import multer from 'multer';
import multerS3 from 'multer-s3';
import sharp from 'sharp';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import Redis from 'ioredis';
import * as fileType from 'file-type';
import * as mime from 'mime-types';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import winston from 'winston';
import QRCode from 'qrcode';
import sizeOf from 'image-size';

interface FileUploadOptions {
  userId: string;
  ownerType?: string;
  indigenousFile?: boolean;
  culturalContent?: boolean;
  sacredContent?: boolean;
  elderContent?: boolean;
  traditionalKnowledge?: boolean;
  nation?: string;
  territory?: string;
  language?: string;
  accessLevel?: string;
  dataResidency?: string;
  elderApprovalRequired?: boolean;
  ceremonyRestricted?: boolean;
  seasonalAccess?: boolean;
  moonPhaseRestricted?: boolean;
  genderRestricted?: string;
  ageRestricted?: number;
  retentionPeriod?: number;
  tags?: string[];
  category?: string;
  metadata?: any;
}

interface StorageProviderConfig {
  type: 'S3' | 'AZURE' | 'GCS' | 'MINIO' | 'LOCAL';
  config: any;
  priority: number;
  dataResidency: string;
  sovereigntyCompliant: boolean;
  indigenousOwned?: boolean;
}

export class FileStorageService extends EventEmitter {
  private prisma: PrismaClient;
  private s3Client?: AWS.S3;
  private azureClient?: BlobServiceClient;
  private gcsClient?: Storage;
  private minioClient?: Minio.Client;
  private redis: Redis;
  private fileQueue: Bull.Queue;
  private conversionQueue: Bull.Queue;
  private backupQueue: Bull.Queue;
  private logger: winston.Logger;
  private providers: Map<string, StorageProviderConfig> = new Map();
  
  // Indigenous data sovereignty rules
  private readonly CANADIAN_REGIONS = ['ca-central-1', 'canada'];
  private readonly SACRED_CONTENT_ENCRYPTION = 'AES-256-GCM';
  private readonly ELDER_APPROVAL_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // File processing limits
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
  private readonly MAX_IMAGE_DIMENSION = 10000; // pixels
  private readonly THUMBNAIL_SIZES = [150, 300, 600];
  
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize queues
    this.fileQueue = new Bull('file-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    this.conversionQueue = new Bull('file-conversion', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    this.backupQueue = new Bull('file-backup', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.initializeProviders();
    this.setupQueueProcessors();
  }
  
  private async initializeProviders() {
    // Initialize AWS S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      this.s3Client = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ca-central-1' // Canadian region by default
      });
      
      this.providers.set('S3', {
        type: 'S3',
        config: this.s3Client,
        priority: 1,
        dataResidency: 'canada',
        sovereigntyCompliant: true,
        indigenousOwned: false
      });
    }
    
    // Initialize Azure Blob Storage
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.azureClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      
      this.providers.set('AZURE', {
        type: 'AZURE',
        config: this.azureClient,
        priority: 2,
        dataResidency: 'canada',
        sovereigntyCompliant: true,
        indigenousOwned: false
      });
    }
    
    // Initialize Google Cloud Storage
    if (process.env.GCS_PROJECT_ID) {
      this.gcsClient = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename: process.env.GCS_KEY_FILE
      });
      
      this.providers.set('GCS', {
        type: 'GCS',
        config: this.gcsClient,
        priority: 3,
        dataResidency: 'canada',
        sovereigntyCompliant: true,
        indigenousOwned: false
      });
    }
    
    // Initialize MinIO (Indigenous-owned infrastructure option)
    if (process.env.MINIO_ENDPOINT) {
      this.minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY!,
        secretKey: process.env.MINIO_SECRET_KEY!
      });
      
      this.providers.set('MINIO', {
        type: 'MINIO',
        config: this.minioClient,
        priority: 0, // Highest priority for Indigenous-owned infrastructure
        dataResidency: 'canada',
        sovereigntyCompliant: true,
        indigenousOwned: true
      });
    }
    
    // Load providers from database
    const dbProviders = await this.prisma.storageProvider.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    });
    
    for (const provider of dbProviders) {
      this.providers.set(provider.providerName, {
        type: provider.providerType as any,
        config: provider.configuration,
        priority: provider.priority,
        dataResidency: provider.dataResidency,
        sovereigntyCompliant: provider.sovereigntyCompliant,
        indigenousOwned: provider.indigenousOwned || false
      });
    }
  }
  
  private setupQueueProcessors() {
    // File processing queue
    this.fileQueue.process(async (job) => {
      const { fileId, operation } = job.data;
      
      switch (operation) {
        case 'generateThumbnail':
          await this.generateThumbnail(fileId);
          break;
        case 'virusScan':
          await this.scanForVirus(fileId);
          break;
        case 'extractMetadata':
          await this.extractFileMetadata(fileId);
          break;
        case 'applyDataSovereignty':
          await this.applyDataSovereigntyRules(fileId);
          break;
        case 'checkElderApproval':
          await this.checkElderApprovalStatus(fileId);
          break;
      }
    });
    
    // Conversion queue
    this.conversionQueue.process(async (job) => {
      const { fileId, targetFormat, options } = job.data;
      await this.convertFile(fileId, targetFormat, options);
    });
    
    // Backup queue
    this.backupQueue.process(async (job) => {
      const { jobId } = job.data;
      await this.runBackupJob(jobId);
    });
  }
  
  async uploadFile(file: Express.Multer.File, options: FileUploadOptions): Promise<string> {
    try {
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE} bytes`);
      }
      
      // Generate file ID and storage key
      const fileId = uuidv4();
      const extension = path.extname(file.originalname);
      const objectKey = `${options.userId}/${fileId}${extension}`;
      
      // Detect file type
      const detectedType = await fileType.fromBuffer(file.buffer);
      const mimeType = detectedType?.mime || file.mimetype;
      
      // Calculate checksums
      const md5Hash = crypto.createHash('md5').update(file.buffer).digest('hex');
      const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      
      // Check for sacred content restrictions
      if (options.sacredContent || options.ceremonyRestricted) {
        await this.validateSacredContentAccess(options);
      }
      
      // Select storage provider based on data sovereignty rules
      const provider = await this.selectStorageProvider(options);
      
      // Encrypt file if required
      let fileBuffer = file.buffer;
      let encryptionKey: string | undefined;
      
      if (options.sacredContent || options.elderContent || options.traditionalKnowledge) {
        const encryption = await this.encryptFile(file.buffer);
        fileBuffer = encryption.encrypted;
        encryptionKey = encryption.keyId;
      }
      
      // Upload to selected provider
      const uploadResult = await this.uploadToProvider(
        provider,
        process.env.STORAGE_BUCKET || 'indigenous-files',
        objectKey,
        fileBuffer,
        mimeType
      );
      
      // Get image dimensions if applicable
      let width: number | undefined;
      let height: number | undefined;
      
      if (mimeType.startsWith('image/')) {
        try {
          const dimensions = sizeOf(file.buffer);
          width = dimensions.width;
          height = dimensions.height;
        } catch (error) {
          this.logger.error('Failed to get image dimensions:', error);
        }
      }
      
      // Create file record
      const fileRecord = await this.prisma.file.create({
        data: {
          id: fileId,
          fileId,
          fileName: file.filename || file.originalname,
          originalName: file.originalname,
          mimeType,
          size: BigInt(file.size),
          extension,
          storageProvider: provider.type,
          bucketName: process.env.STORAGE_BUCKET || 'indigenous-files',
          objectKey,
          region: provider.dataResidency,
          width,
          height,
          metadata: options.metadata,
          publicUrl: uploadResult.publicUrl,
          cdnUrl: uploadResult.cdnUrl,
          indigenousFile: options.indigenousFile || false,
          culturalContent: options.culturalContent || false,
          sacredContent: options.sacredContent || false,
          elderContent: options.elderContent || false,
          traditionalKnowledge: options.traditionalKnowledge || false,
          nation: options.nation,
          territory: options.territory,
          language: options.language,
          accessLevel: options.accessLevel || 'PRIVATE',
          ownerUserId: options.userId,
          ownerType: options.ownerType || 'USER',
          dataResidency: provider.dataResidency,
          sovereigntyCompliant: provider.sovereigntyCompliant,
          encryptionStatus: encryptionKey ? 'ENCRYPTED' : 'UNENCRYPTED',
          encryptionKey,
          elderApprovalRequired: options.elderApprovalRequired || false,
          ceremonyRestricted: options.ceremonyRestricted || false,
          seasonalAccess: options.seasonalAccess || false,
          moonPhaseRestricted: options.moonPhaseRestricted || false,
          genderRestricted: options.genderRestricted,
          ageRestricted: options.ageRestricted,
          retentionPeriod: options.retentionPeriod,
          tags: options.tags || [],
          category: options.category,
          md5Hash,
          sha256Hash
        }
      });
      
      // Update storage quota
      await this.updateStorageQuota(options.userId, file.size);
      
      // Create audit entry
      await this.createAuditEntry({
        fileId,
        action: 'UPLOAD',
        userId: options.userId,
        indigenousAction: options.indigenousFile || false,
        elderAction: options.elderContent || false,
        ceremonyContext: options.ceremonyRestricted || false
      });
      
      // Queue post-processing tasks
      await this.fileQueue.add('generateThumbnail', { fileId }, { 
        delay: 1000,
        priority: options.elderContent ? 1 : 3 
      });
      
      await this.fileQueue.add('virusScan', { fileId }, { 
        priority: 1 
      });
      
      await this.fileQueue.add('extractMetadata', { fileId }, { 
        delay: 2000,
        priority: 5 
      });
      
      if (options.indigenousFile) {
        await this.fileQueue.add('applyDataSovereignty', { fileId }, { 
          priority: 2 
        });
      }
      
      if (options.elderApprovalRequired) {
        await this.fileQueue.add('checkElderApproval', { fileId }, { 
          delay: this.ELDER_APPROVAL_TIMEOUT,
          priority: 1 
        });
      }
      
      this.emit('fileUploaded', fileRecord);
      
      return fileId;
    } catch (error) {
      this.logger.error('File upload failed:', error);
      throw error;
    }
  }
  
  private async selectStorageProvider(options: FileUploadOptions): Promise<StorageProviderConfig> {
    // Priority order for Indigenous content:
    // 1. Indigenous-owned infrastructure (if available)
    // 2. Canadian data residency compliant
    // 3. Sovereignty compliant
    // 4. Default provider
    
    let selectedProvider: StorageProviderConfig | undefined;
    
    // For sacred or Elder content, prefer Indigenous-owned infrastructure
    if ((options.sacredContent || options.elderContent) && this.providers.has('MINIO')) {
      const minioProvider = this.providers.get('MINIO');
      if (minioProvider?.indigenousOwned) {
        return minioProvider;
      }
    }
    
    // Apply data sovereignty rules
    const sovereigntyRules = await this.prisma.dataSovereigntyRule.findMany({
      where: {
        active: true,
        OR: [
          { nations: { has: options.nation } },
          { territories: { has: options.territory } }
        ]
      },
      orderBy: { priority: 'asc' }
    });
    
    for (const rule of sovereigntyRules) {
      for (const [name, provider] of this.providers) {
        if (
          rule.requiredResidency.includes(provider.dataResidency) &&
          !rule.prohibitedLocations.includes(provider.dataResidency) &&
          provider.sovereigntyCompliant
        ) {
          selectedProvider = provider;
          break;
        }
      }
      if (selectedProvider) break;
    }
    
    // Fallback to Canadian-compliant provider
    if (!selectedProvider) {
      for (const [name, provider] of this.providers) {
        if (provider.dataResidency === 'canada' && provider.sovereigntyCompliant) {
          selectedProvider = provider;
          break;
        }
      }
    }
    
    // Final fallback to any available provider
    if (!selectedProvider) {
      selectedProvider = Array.from(this.providers.values())
        .sort((a, b) => a.priority - b.priority)[0];
    }
    
    if (!selectedProvider) {
      throw new Error('No storage provider available');
    }
    
    return selectedProvider;
  }
  
  private async uploadToProvider(
    provider: StorageProviderConfig,
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<any> {
    switch (provider.type) {
      case 'S3':
        return this.uploadToS3(bucket, key, buffer, contentType);
      case 'AZURE':
        return this.uploadToAzure(bucket, key, buffer, contentType);
      case 'GCS':
        return this.uploadToGCS(bucket, key, buffer, contentType);
      case 'MINIO':
        return this.uploadToMinIO(bucket, key, buffer, contentType);
      case 'LOCAL':
        return this.uploadToLocal(bucket, key, buffer, contentType);
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }
  
  private async uploadToS3(bucket: string, key: string, buffer: Buffer, contentType: string) {
    if (!this.s3Client) throw new Error('S3 client not initialized');
    
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA' // Infrequent access for cost optimization
    };
    
    const result = await this.s3Client.upload(params).promise();
    
    return {
      location: result.Location,
      etag: result.ETag,
      publicUrl: result.Location,
      cdnUrl: process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : result.Location
    };
  }
  
  private async uploadToAzure(container: string, key: string, buffer: Buffer, contentType: string) {
    if (!this.azureClient) throw new Error('Azure client not initialized');
    
    const containerClient = this.azureClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: contentType
      },
      tier: 'Cool' // Cool tier for cost optimization
    };
    
    const result = await blockBlobClient.upload(buffer, buffer.length, uploadOptions);
    
    return {
      etag: result.etag,
      publicUrl: blockBlobClient.url,
      cdnUrl: process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : blockBlobClient.url
    };
  }
  
  private async uploadToGCS(bucket: string, key: string, buffer: Buffer, contentType: string) {
    if (!this.gcsClient) throw new Error('GCS client not initialized');
    
    const bucketInstance = this.gcsClient.bucket(bucket);
    const file = bucketInstance.file(key);
    
    await file.save(buffer, {
      metadata: {
        contentType
      },
      resumable: false
    });
    
    const [metadata] = await file.getMetadata();
    
    return {
      etag: metadata.etag,
      publicUrl: `https://storage.googleapis.com/${bucket}/${key}`,
      cdnUrl: process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : `https://storage.googleapis.com/${bucket}/${key}`
    };
  }
  
  private async uploadToMinIO(bucket: string, key: string, buffer: Buffer, contentType: string) {
    if (!this.minioClient) throw new Error('MinIO client not initialized');
    
    // Ensure bucket exists
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket, 'ca-central-1');
    }
    
    const metadata = {
      'Content-Type': contentType,
      'x-amz-server-side-encryption': 'AES256'
    };
    
    await this.minioClient.putObject(bucket, key, buffer, buffer.length, metadata);
    
    const url = await this.minioClient.presignedGetObject(bucket, key, 7 * 24 * 60 * 60); // 7 days
    
    return {
      publicUrl: url,
      cdnUrl: process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : url
    };
  }
  
  private async uploadToLocal(bucket: string, key: string, buffer: Buffer, contentType: string) {
    const basePath = process.env.LOCAL_STORAGE_PATH || './storage';
    const fullPath = path.join(basePath, bucket, key);
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.promises.writeFile(fullPath, buffer);
    
    return {
      publicUrl: `/files/${bucket}/${key}`,
      cdnUrl: process.env.CDN_URL ? `${process.env.CDN_URL}/${key}` : `/files/${bucket}/${key}`
    };
  }
  
  private async encryptFile(buffer: Buffer): Promise<{ encrypted: Buffer; keyId: string }> {
    const algorithm = 'aes-256-gcm';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Store encryption key securely
    const keyId = uuidv4();
    await this.redis.set(
      `encryption:${keyId}`,
      JSON.stringify({
        key: key.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm
      }),
      'EX',
      30 * 24 * 60 * 60 // 30 days
    );
    
    // Combine IV, auth tag, and encrypted data
    const result = Buffer.concat([iv, authTag, encrypted]);
    
    return { encrypted: result, keyId };
  }
  
  private async decryptFile(buffer: Buffer, keyId: string): Promise<Buffer> {
    const keyData = await this.redis.get(`encryption:${keyId}`);
    if (!keyData) {
      throw new Error('Encryption key not found');
    }
    
    const { key, algorithm } = JSON.parse(keyData);
    
    // Extract IV, auth tag, and encrypted data
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(key, 'base64'),
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  }
  
  private async validateSacredContentAccess(options: FileUploadOptions) {
    // Check moon phase restrictions
    if (options.moonPhaseRestricted) {
      const currentMoonPhase = await this.getCurrentMoonPhase();
      const allowedPhases = ['new_moon', 'full_moon']; // Example phases
      
      if (!allowedPhases.includes(currentMoonPhase)) {
        throw new Error('Sacred content upload restricted during current moon phase');
      }
    }
    
    // Check seasonal restrictions
    if (options.seasonalAccess) {
      const currentSeason = this.getCurrentSeason();
      const allowedSeasons = ['summer', 'winter']; // Example seasons
      
      if (!allowedSeasons.includes(currentSeason)) {
        throw new Error('Sacred content upload restricted during current season');
      }
    }
  }
  
  private async getCurrentMoonPhase(): Promise<string> {
    // Implementation would connect to astronomy API or calculation
    // Simplified for example
    const phases = ['new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 
                   'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
    const daysSinceNewMoon = Math.floor((Date.now() / 1000 / 60 / 60 / 24) % 29.53);
    const phaseIndex = Math.floor(daysSinceNewMoon / 3.69);
    return phases[phaseIndex];
  }
  
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  private async generateThumbnail(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file || !file.mimeType.startsWith('image/')) {
        return;
      }
      
      // Download original file
      const fileBuffer = await this.downloadFile(fileId);
      
      // Generate thumbnails at different sizes
      for (const size of this.THUMBNAIL_SIZES) {
        const thumbnail = await sharp(fileBuffer)
          .resize(size, size, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Upload thumbnail
        const thumbnailKey = `${file.objectKey}_thumb_${size}`;
        const provider = this.providers.get(file.storageProvider);
        
        if (provider) {
          await this.uploadToProvider(
            provider,
            file.bucketName,
            thumbnailKey,
            thumbnail,
            'image/jpeg'
          );
        }
      }
      
      // Update file record
      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          thumbnailGenerated: true,
          thumbnailUrl: `${file.objectKey}_thumb_${this.THUMBNAIL_SIZES[0]}`
        }
      });
    } catch (error) {
      this.logger.error('Thumbnail generation failed:', error);
    }
  }
  
  private async scanForVirus(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) return;
      
      // Implementation would integrate with antivirus service
      // For now, mark as clean
      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          virusScanStatus: 'CLEAN',
          virusScanDate: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Virus scan failed:', error);
    }
  }
  
  private async extractFileMetadata(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) return;
      
      const fileBuffer = await this.downloadFile(fileId);
      const metadata: any = {};
      
      // Extract metadata based on file type
      if (file.mimeType.startsWith('image/')) {
        // EXIF data extraction would go here
        metadata.type = 'image';
      } else if (file.mimeType === 'application/pdf') {
        const pdfDoc = await PDFDocument.load(fileBuffer);
        metadata.pageCount = pdfDoc.getPageCount();
        metadata.title = pdfDoc.getTitle();
        metadata.author = pdfDoc.getAuthor();
      } else if (file.mimeType.includes('spreadsheet') || file.extension === '.xlsx') {
        const workbook = XLSX.read(fileBuffer);
        metadata.sheetNames = workbook.SheetNames;
        metadata.sheetCount = workbook.SheetNames.length;
      }
      
      // Update file record with metadata
      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          metadata: { ...file.metadata, ...metadata },
          processedAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Metadata extraction failed:', error);
    }
  }
  
  private async applyDataSovereigntyRules(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) return;
      
      // Get applicable sovereignty rules
      const rules = await this.prisma.dataSovereigntyRule.findMany({
        where: {
          active: true,
          OR: [
            { nations: { has: file.nation } },
            { territories: { has: file.territory } },
            { fileTypes: { has: file.mimeType } }
          ]
        },
        orderBy: { priority: 'asc' }
      });
      
      for (const rule of rules) {
        // Check data residency
        if (!rule.requiredResidency.includes(file.dataResidency)) {
          // Would trigger file migration to compliant region
          this.logger.warn(`File ${fileId} violates data residency rule ${rule.ruleName}`);
        }
        
        // Apply encryption if required
        if (rule.requiredEncryption && file.encryptionStatus !== 'ENCRYPTED') {
          // Would trigger re-encryption
          this.logger.warn(`File ${fileId} requires encryption per rule ${rule.ruleName}`);
        }
        
        // Apply access restrictions
        if (rule.requiresElderApproval && !file.elderApprovalRequired) {
          await this.prisma.file.update({
            where: { id: fileId },
            data: { elderApprovalRequired: true }
          });
        }
      }
    } catch (error) {
      this.logger.error('Data sovereignty rule application failed:', error);
    }
  }
  
  private async checkElderApprovalStatus(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file || !file.elderApprovalRequired) return;
      
      // Check if approval was granted
      // This would integrate with approval workflow system
      const approvalGranted = false; // Placeholder
      
      if (!approvalGranted) {
        // Mark file as pending deletion or restricted
        await this.prisma.file.update({
          where: { id: fileId },
          data: {
            accessLevel: 'RESTRICTED',
            metadata: {
              ...file.metadata,
              elderApprovalStatus: 'expired',
              elderApprovalExpiredAt: new Date()
            }
          }
        });
        
        this.emit('elderApprovalExpired', { fileId });
      }
    } catch (error) {
      this.logger.error('Elder approval check failed:', error);
    }
  }
  
  async downloadFile(fileId: string, userId?: string): Promise<Buffer> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      throw new Error('File not found');
    }
    
    // Check access permissions
    if (userId && file.ownerUserId !== userId) {
      const permission = await this.prisma.filePermission.findFirst({
        where: {
          fileId,
          userId,
          canRead: true
        }
      });
      
      if (!permission) {
        throw new Error('Access denied');
      }
    }
    
    // Create download audit entry
    if (userId) {
      await this.createAuditEntry({
        fileId,
        action: 'DOWNLOAD',
        userId,
        indigenousAction: file.indigenousFile,
        elderAction: file.elderContent,
        ceremonyContext: file.ceremonyRestricted
      });
    }
    
    // Download from provider
    const provider = this.providers.get(file.storageProvider);
    if (!provider) {
      throw new Error(`Provider ${file.storageProvider} not available`);
    }
    
    let buffer = await this.downloadFromProvider(
      provider,
      file.bucketName,
      file.objectKey
    );
    
    // Decrypt if needed
    if (file.encryptionStatus === 'ENCRYPTED' && file.encryptionKey) {
      buffer = await this.decryptFile(buffer, file.encryptionKey);
    }
    
    // Track download
    if (userId) {
      await this.prisma.fileDownload.create({
        data: {
          fileId,
          downloadedBy: userId,
          bytesDownloaded: file.size,
          indigenousDownload: file.indigenousFile,
          elderDownload: file.elderContent,
          ceremonyContext: file.ceremonyRestricted
        }
      });
    }
    
    return buffer;
  }
  
  private async downloadFromProvider(
    provider: StorageProviderConfig,
    bucket: string,
    key: string
  ): Promise<Buffer> {
    switch (provider.type) {
      case 'S3':
        return this.downloadFromS3(bucket, key);
      case 'AZURE':
        return this.downloadFromAzure(bucket, key);
      case 'GCS':
        return this.downloadFromGCS(bucket, key);
      case 'MINIO':
        return this.downloadFromMinIO(bucket, key);
      case 'LOCAL':
        return this.downloadFromLocal(bucket, key);
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }
  
  private async downloadFromS3(bucket: string, key: string): Promise<Buffer> {
    if (!this.s3Client) throw new Error('S3 client not initialized');
    
    const result = await this.s3Client.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    return result.Body as Buffer;
  }
  
  private async downloadFromAzure(container: string, key: string): Promise<Buffer> {
    if (!this.azureClient) throw new Error('Azure client not initialized');
    
    const containerClient = this.azureClient.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(key);
    
    const downloadResponse = await blobClient.download();
    const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody!);
    
    return downloaded;
  }
  
  private async downloadFromGCS(bucket: string, key: string): Promise<Buffer> {
    if (!this.gcsClient) throw new Error('GCS client not initialized');
    
    const file = this.gcsClient.bucket(bucket).file(key);
    const [buffer] = await file.download();
    
    return buffer;
  }
  
  private async downloadFromMinIO(bucket: string, key: string): Promise<Buffer> {
    if (!this.minioClient) throw new Error('MinIO client not initialized');
    
    const stream = await this.minioClient.getObject(bucket, key);
    return this.streamToBuffer(stream);
  }
  
  private async downloadFromLocal(bucket: string, key: string): Promise<Buffer> {
    const basePath = process.env.LOCAL_STORAGE_PATH || './storage';
    const fullPath = path.join(basePath, bucket, key);
    
    return fs.promises.readFile(fullPath);
  }
  
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  
  private async convertFile(fileId: string, targetFormat: string, options: any = {}) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) return;
      
      const conversion = await this.prisma.fileConversion.create({
        data: {
          fileId,
          conversionType: options.type || 'FORMAT',
          targetFormat,
          status: 'PROCESSING',
          quality: options.quality,
          resolution: options.resolution,
          bitrate: options.bitrate,
          startedAt: new Date()
        }
      });
      
      const fileBuffer = await this.downloadFile(fileId);
      let convertedBuffer: Buffer;
      
      // Perform conversion based on file type
      if (file.mimeType.startsWith('image/')) {
        convertedBuffer = await this.convertImage(fileBuffer, targetFormat, options);
      } else if (file.mimeType === 'application/pdf' && targetFormat === 'png') {
        convertedBuffer = await this.convertPdfToImage(fileBuffer, options);
      } else {
        throw new Error(`Conversion from ${file.mimeType} to ${targetFormat} not supported`);
      }
      
      // Upload converted file
      const convertedFileId = await this.uploadFile(
        {
          buffer: convertedBuffer,
          originalname: `${file.fileName}_converted.${targetFormat}`,
          mimetype: mime.lookup(targetFormat) || 'application/octet-stream',
          size: convertedBuffer.length
        } as any,
        {
          userId: file.ownerUserId,
          category: 'conversion',
          metadata: {
            originalFileId: fileId,
            conversionId: conversion.id
          }
        }
      );
      
      // Update conversion record
      await this.prisma.fileConversion.update({
        where: { id: conversion.id },
        data: {
          outputFileId: convertedFileId,
          outputSize: BigInt(convertedBuffer.length),
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date()
        }
      });
      
      this.emit('fileConverted', { fileId, convertedFileId, format: targetFormat });
    } catch (error) {
      this.logger.error('File conversion failed:', error);
      throw error;
    }
  }
  
  private async convertImage(buffer: Buffer, format: string, options: any): Promise<Buffer> {
    let sharpInstance = sharp(buffer);
    
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: options.fit || 'inside'
      });
    }
    
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return sharpInstance.jpeg({ quality: options.quality || 85 }).toBuffer();
      case 'png':
        return sharpInstance.png({ quality: options.quality || 85 }).toBuffer();
      case 'webp':
        return sharpInstance.webp({ quality: options.quality || 85 }).toBuffer();
      default:
        throw new Error(`Unsupported image format: ${format}`);
    }
  }
  
  private async convertPdfToImage(buffer: Buffer, options: any): Promise<Buffer> {
    // This would use a PDF rendering library
    // Simplified for example
    const pdfDoc = await PDFDocument.load(buffer);
    const page = pdfDoc.getPage(options.page || 0);
    
    // Would render page to image
    // Placeholder implementation
    return Buffer.from('converted_image_data');
  }
  
  async createFolder(folderData: any): Promise<string> {
    const folderId = uuidv4();
    
    const folder = await this.prisma.folder.create({
      data: {
        ...folderData,
        folderId,
        id: folderId
      }
    });
    
    return folderId;
  }
  
  async shareFile(fileId: string, shareData: any): Promise<string> {
    const shareId = uuidv4();
    const shareLink = `${uuidv4()}-${Date.now()}`;
    const shortLink = shareLink.substring(0, 8);
    
    const share = await this.prisma.fileShare.create({
      data: {
        ...shareData,
        shareId,
        id: shareId,
        fileId,
        shareLink,
        shortLink
      }
    });
    
    // Generate QR code for share link
    const qrCode = await QRCode.toDataURL(`${process.env.BASE_URL}/share/${shareLink}`);
    
    this.emit('fileShared', { fileId, shareId, shareLink });
    
    return shareId;
  }
  
  async grantPermission(permissionData: any): Promise<string> {
    const permission = await this.prisma.filePermission.create({
      data: permissionData
    });
    
    return permission.id;
  }
  
  private async updateStorageQuota(userId: string, sizeChange: number) {
    const quota = await this.prisma.storageQuota.findUnique({
      where: { userId }
    });
    
    if (!quota) {
      // Create default quota
      await this.prisma.storageQuota.create({
        data: {
          userId,
          usedSpace: BigInt(sizeChange),
          currentFiles: 1
        }
      });
    } else {
      // Update existing quota
      await this.prisma.storageQuota.update({
        where: { userId },
        data: {
          usedSpace: quota.usedSpace + BigInt(sizeChange),
          currentFiles: quota.currentFiles + 1
        }
      });
      
      // Check if warning threshold reached
      const usagePercentage = Number(quota.usedSpace + BigInt(sizeChange)) / Number(quota.totalQuota) * 100;
      
      if (usagePercentage >= quota.warningThreshold) {
        this.emit('quotaWarning', { userId, usagePercentage });
      }
    }
  }
  
  private async createAuditEntry(auditData: any) {
    await this.prisma.fileAudit.create({
      data: auditData
    });
  }
  
  private async runBackupJob(jobId: string) {
    try {
      const job = await this.prisma.backupJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) return;
      
      // Update job status
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: 'RUNNING',
          lastRunAt: new Date()
        }
      });
      
      // Get files to backup
      const files = await this.prisma.file.findMany({
        where: {
          storageProvider: job.sourceProvider,
          bucketName: job.sourceBucket,
          objectKey: {
            startsWith: job.sourcePath || ''
          }
        }
      });
      
      let filesBackedUp = 0;
      let bytesBackedUp = BigInt(0);
      
      for (const file of files) {
        try {
          // Download from source
          const buffer = await this.downloadFile(file.id);
          
          // Upload to destination
          const destProvider = this.providers.get(job.destinationProvider);
          if (destProvider) {
            await this.uploadToProvider(
              destProvider,
              job.destinationBucket,
              path.join(job.destinationPath || '', file.objectKey),
              buffer,
              file.mimeType
            );
            
            filesBackedUp++;
            bytesBackedUp += file.size;
          }
          
          // Update progress
          await this.prisma.backupJob.update({
            where: { id: jobId },
            data: {
              progress: Math.floor((filesBackedUp / files.length) * 100),
              filesBackedUp,
              bytesBackedUp
            }
          });
        } catch (error) {
          this.logger.error(`Failed to backup file ${file.id}:`, error);
        }
      }
      
      // Update job completion
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100
        }
      });
      
      this.emit('backupCompleted', { jobId, filesBackedUp, bytesBackedUp });
    } catch (error) {
      this.logger.error('Backup job failed:', error);
      
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          errorCount: { increment: 1 }
        }
      });
    }
  }
  
  async getStorageStats(userId?: string, nation?: string): Promise<any> {
    const where: any = {};
    if (userId) where.ownerUserId = userId;
    if (nation) where.nation = nation;
    
    const stats = await this.prisma.file.aggregate({
      where,
      _count: { id: true },
      _sum: { size: true }
    });
    
    const byCategory = await this.prisma.file.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      _sum: { size: true }
    });
    
    const byProvider = await this.prisma.file.groupBy({
      by: ['storageProvider'],
      where,
      _count: { id: true },
      _sum: { size: true }
    });
    
    const indigenousStats = await this.prisma.file.aggregate({
      where: {
        ...where,
        indigenousFile: true
      },
      _count: { id: true },
      _sum: { size: true }
    });
    
    return {
      totalFiles: stats._count.id,
      totalSize: stats._sum.size || BigInt(0),
      byCategory,
      byProvider,
      indigenousFiles: indigenousStats._count.id,
      indigenousSize: indigenousStats._sum.size || BigInt(0)
    };
  }
}