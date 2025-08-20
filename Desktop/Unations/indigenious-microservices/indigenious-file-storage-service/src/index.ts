import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import multer from 'multer';
import { FileStorageService } from './services/file-storage.service';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const app = express();
const prisma = new PrismaClient();
const fileService = new FileStorageService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max file size
    files: 10 // Max 10 files per upload
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow serving files cross-origin
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP'
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 uploads per 5 minutes
  message: 'Upload rate limit exceeded'
});

app.use('/api', limiter);
app.use('/api/files/upload', uploadLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const stats = await fileService.getStorageStats();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-file-storage-service',
      timestamp: new Date().toISOString(),
      stats: {
        totalFiles: stats.totalFiles.toString(),
        totalSize: stats.totalSize.toString()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validation schemas
const uploadOptionsSchema = z.object({
  indigenousFile: z.boolean().optional(),
  culturalContent: z.boolean().optional(),
  sacredContent: z.boolean().optional(),
  elderContent: z.boolean().optional(),
  traditionalKnowledge: z.boolean().optional(),
  nation: z.string().optional(),
  territory: z.string().optional(),
  language: z.string().optional(),
  accessLevel: z.enum(['PUBLIC', 'PRIVATE', 'RESTRICTED', 'SACRED']).optional(),
  dataResidency: z.string().optional(),
  elderApprovalRequired: z.boolean().optional(),
  ceremonyRestricted: z.boolean().optional(),
  seasonalAccess: z.boolean().optional(),
  moonPhaseRestricted: z.boolean().optional(),
  genderRestricted: z.string().optional(),
  ageRestricted: z.number().optional(),
  retentionPeriod: z.number().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  metadata: z.any().optional()
});

// API Routes

// Upload file(s)
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Parse and validate options
    const options = uploadOptionsSchema.parse({
      ...req.body,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined
    });
    
    // Check permissions for Indigenous content
    if ((options.sacredContent || options.elderContent) && 
        !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for sacred/Elder content' });
    }
    
    const fileId = await fileService.uploadFile(req.file, {
      ...options,
      userId,
      ownerType: req.body.ownerType || 'USER'
    });
    
    res.status(201).json({ fileId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload file' 
    });
  }
});

// Bulk upload
app.post('/api/files/upload/bulk', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const options = uploadOptionsSchema.parse(req.body);
    
    const fileIds = [];
    for (const file of req.files) {
      try {
        const fileId = await fileService.uploadFile(file, {
          ...options,
          userId
        });
        fileIds.push(fileId);
      } catch (error) {
        console.error('Failed to upload file:', file.originalname, error);
      }
    }
    
    res.json({ 
      uploaded: fileIds.length,
      total: req.files.length,
      fileIds 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload files' 
    });
  }
});

// Download file
app.get('/api/files/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check access permissions
    if (file.accessLevel === 'SACRED' && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to sacred content' });
    }
    
    if (file.elderContent && !['admin', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Elder content' });
    }
    
    const buffer = await fileService.downloadFile(fileId, userId);
    
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': buffer.length.toString()
    });
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to download file' 
    });
  }
});

// Get file info
app.get('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        permissions: {
          where: { userId }
        },
        shares: {
          where: { active: true }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        }
      }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check access permissions
    const hasAccess = file.ownerUserId === userId || 
                     file.permissions.length > 0 ||
                     file.accessLevel === 'PUBLIC' ||
                     ['admin'].includes(userRole);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Remove sensitive fields for non-owners
    if (file.ownerUserId !== userId && userRole !== 'admin') {
      delete (file as any).encryptionKey;
      delete (file as any).md5Hash;
      delete (file as any).sha256Hash;
    }
    
    res.json(file);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get file info' 
    });
  }
});

// Update file
app.put('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Only owner or admin can update
    if (file.ownerUserId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: req.body
    });
    
    res.json(updatedFile);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update file' 
    });
  }
});

// Delete file
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check permissions
    const canDelete = file.ownerUserId === userId || 
                     userRole === 'admin' ||
                     (await prisma.filePermission.findFirst({
                       where: { fileId, userId, canDelete: true }
                     }));
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Soft delete
    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() }
    });
    
    // Create audit entry
    await prisma.fileAudit.create({
      data: {
        fileId,
        action: 'DELETE',
        userId,
        userName: req.headers['x-user-name'] as string,
        userRole,
        indigenousAction: file.indigenousFile,
        elderAction: file.elderContent,
        ceremonyContext: file.ceremonyRestricted
      }
    });
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete file' 
    });
  }
});

// Share file
app.post('/api/files/:fileId/share', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check share permissions
    const canShare = file.ownerUserId === userId ||
                    (await prisma.filePermission.findFirst({
                      where: { fileId, userId, canShare: true }
                    }));
    
    if (!canShare) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check Indigenous content sharing restrictions
    if (file.sacredContent && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Cannot share sacred content' });
    }
    
    const shareId = await fileService.shareFile(fileId, {
      ...req.body,
      sharedBy: userId
    });
    
    const share = await prisma.fileShare.findUnique({
      where: { id: shareId }
    });
    
    res.status(201).json(share);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to share file' 
    });
  }
});

// Grant permission
app.post('/api/files/:fileId/permissions', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Only owner or admin can grant permissions
    if (file.ownerUserId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if granting Elder permission
    if (req.body.elderPermission && !['admin', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Elders can grant Elder permissions' });
    }
    
    const permissionId = await fileService.grantPermission({
      ...req.body,
      fileId,
      grantedBy: userId
    });
    
    res.status(201).json({ permissionId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to grant permission' 
    });
  }
});

// Convert file
app.post('/api/files/:fileId/convert', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { targetFormat, options } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check access
    if (file.ownerUserId !== userId) {
      const permission = await prisma.filePermission.findFirst({
        where: { fileId, userId, canRead: true }
      });
      
      if (!permission) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const conversion = await prisma.fileConversion.create({
      data: {
        fileId,
        conversionType: options?.type || 'FORMAT',
        targetFormat,
        status: 'PENDING',
        quality: options?.quality,
        resolution: options?.resolution
      }
    });
    
    // Queue conversion job
    await fileService.conversionQueue.add('convertFile', {
      fileId,
      targetFormat,
      options
    });
    
    res.status(202).json({ 
      conversionId: conversion.id,
      status: 'PENDING' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start conversion' 
    });
  }
});

// Folders

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Check permissions for Indigenous folders
    if ((req.body.sacredFolder || req.body.elderFolder) && 
        !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for sacred/Elder folders' });
    }
    
    const folderId = await fileService.createFolder({
      ...req.body,
      ownerUserId: userId
    });
    
    res.status(201).json({ folderId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create folder' 
    });
  }
});

// Get folders
app.get('/api/folders', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { parentFolderId, nation } = req.query;
    
    const where: any = {
      ownerUserId: userId,
      deletedAt: null
    };
    
    if (parentFolderId) where.parentFolderId = parentFolderId;
    if (nation) where.nation = nation;
    
    // Include shared folders
    const folders = await prisma.folder.findMany({
      where,
      orderBy: { folderName: 'asc' }
    });
    
    res.json(folders);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get folders' 
    });
  }
});

// Storage management

// Get storage quota
app.get('/api/storage/quota', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    const quota = await prisma.storageQuota.findUnique({
      where: { userId }
    });
    
    if (!quota) {
      // Return default quota
      return res.json({
        totalQuota: '10737418240', // 10GB
        usedSpace: '0',
        maxFileSize: '104857600', // 100MB
        currentFiles: 0,
        usagePercentage: 0
      });
    }
    
    const usagePercentage = Number(quota.usedSpace) / Number(quota.totalQuota) * 100;
    
    res.json({
      ...quota,
      totalQuota: quota.totalQuota.toString(),
      usedSpace: quota.usedSpace.toString(),
      maxFileSize: quota.maxFileSize.toString(),
      ceremonyQuota: quota.ceremonyQuota?.toString(),
      elderQuota: quota.elderQuota?.toString(),
      sacredQuota: quota.sacredQuota?.toString(),
      usagePercentage
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get storage quota' 
    });
  }
});

// Get storage stats
app.get('/api/storage/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { nation } = req.query;
    
    const stats = await fileService.getStorageStats(
      userId,
      nation as string
    );
    
    // Convert BigInt to strings for JSON serialization
    const jsonStats = {
      ...stats,
      totalSize: stats.totalSize.toString(),
      indigenousSize: stats.indigenousSize.toString(),
      byCategory: stats.byCategory.map((cat: any) => ({
        ...cat,
        _sum: { size: cat._sum.size?.toString() }
      })),
      byProvider: stats.byProvider.map((prov: any) => ({
        ...prov,
        _sum: { size: prov._sum.size?.toString() }
      }))
    };
    
    res.json(jsonStats);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get storage stats' 
    });
  }
});

// Indigenous-specific endpoints

// Get Indigenous files
app.get('/api/files/indigenous', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { nation, category, limit = 50, offset = 0 } = req.query;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous files' });
    }
    
    const where: any = {
      indigenousFile: true,
      deletedAt: null
    };
    
    if (nation) where.nation = nation;
    if (category) where.category = category;
    
    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        fileId: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        size: true,
        nation: true,
        territory: true,
        language: true,
        culturalContent: true,
        sacredContent: true,
        elderContent: true,
        traditionalKnowledge: true,
        accessLevel: true,
        createdAt: true
      }
    });
    
    res.json({ 
      files: files.map(f => ({ ...f, size: f.size.toString() })) 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get Indigenous files' 
    });
  }
});

// Get sacred content
app.get('/api/files/sacred', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { nation, limit = 50, offset = 0 } = req.query;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to sacred content' });
    }
    
    const where: any = {
      sacredContent: true,
      deletedAt: null
    };
    
    if (nation) where.nation = nation;
    
    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ 
      files: files.map(f => ({ ...f, size: f.size.toString() })) 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get sacred files' 
    });
  }
});

// Backup management

// Create backup job
app.post('/api/backup/jobs', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'backup-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const job = await prisma.backupJob.create({
      data: {
        ...req.body,
        jobId: `backup-${Date.now()}`
      }
    });
    
    // Queue backup job
    if (job.schedule) {
      await fileService.backupQueue.add(
        'runBackup',
        { jobId: job.id },
        { repeat: { cron: job.schedule } }
      );
    } else {
      await fileService.backupQueue.add('runBackup', { jobId: job.id });
    }
    
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create backup job' 
    });
  }
});

// Get backup jobs
app.get('/api/backup/jobs', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'backup-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const jobs = await prisma.backupJob.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(jobs.map(j => ({
      ...j,
      bytesBackedUp: j.bytesBackedUp.toString()
    })));
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get backup jobs' 
    });
  }
});

// Audit logs

// Get audit logs
app.get('/api/audit', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { fileId, userId, action, limit = 100, offset = 0 } = req.query;
    
    if (!['admin', 'auditor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const where: any = {};
    if (fileId) where.fileId = fileId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    
    const logs = await prisma.fileAudit.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get audit logs' 
    });
  }
});

// Data sovereignty

// Get sovereignty rules
app.get('/api/sovereignty/rules', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'sovereignty-admin', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const rules = await prisma.dataSovereigntyRule.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get sovereignty rules' 
    });
  }
});

// Create sovereignty rule
app.post('/api/sovereignty/rules', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'sovereignty-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const rule = await prisma.dataSovereigntyRule.create({
      data: req.body
    });
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create sovereignty rule' 
    });
  }
});

// Listen for file events
fileService.on('fileUploaded', (file) => {
  console.log('File uploaded:', file.fileId);
});

fileService.on('quotaWarning', ({ userId, usagePercentage }) => {
  console.log(`Quota warning for user ${userId}: ${usagePercentage}%`);
  // Would trigger notification
});

fileService.on('elderApprovalExpired', ({ fileId }) => {
  console.log(`Elder approval expired for file ${fileId}`);
  // Would trigger notification to Elders
});

fileService.on('fileConverted', ({ fileId, convertedFileId, format }) => {
  console.log(`File ${fileId} converted to ${format}: ${convertedFileId}`);
});

fileService.on('backupCompleted', ({ jobId, filesBackedUp, bytesBackedUp }) => {
  console.log(`Backup job ${jobId} completed: ${filesBackedUp} files, ${bytesBackedUp} bytes`);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3047;

app.listen(PORT, () => {
  console.log(`Indigenous File Storage Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-cloud storage (S3, Azure, GCS, MinIO)');
  console.log('- Indigenous data sovereignty');
  console.log('- Sacred content protection');
  console.log('- Elder approval workflows');
  console.log('- Ceremony and seasonal restrictions');
  console.log('- Moon phase awareness');
  console.log('- File encryption for sensitive content');
  console.log('- Comprehensive audit logging');
  console.log('- Storage quotas with nation-specific allocations');
  console.log('- File versioning and conversion');
  console.log('- Automated backup jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await prisma.$disconnect();
  process.exit(0);
});