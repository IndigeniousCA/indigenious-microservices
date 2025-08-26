import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import winston from 'winston';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { BackupService } from './services/backup.service';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.json({ 
      status: 'healthy',
      service: 'backup-service',
      timestamp: new Date().toISOString(),
      features: {
        backup: true,
        restore: true,
        disasterRecovery: true,
        indigenousDataSovereignty: true
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Database or Redis connection failed'
    });
  }
});

// Backup endpoints
app.post('/api/backups/create', async (req, res) => {
  try {
    const result = await BackupService.createBackup({
      name: req.body.name,
      type: req.body.type || 'FULL',
      scope: req.body.scope || 'SYSTEM',
      source: req.body.source,
      databases: req.body.databases,
      services: req.body.services,
      includeIndigenousData: req.body.includeIndigenousData !== false,
      dataSovereignty: req.body.dataSovereignty,
      destination: req.body.destination || 'S3',
      encrypt: req.body.encrypt !== false,
      compress: req.body.compress !== false,
      createdBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    // Emit real-time update
    io.emit('backup:created', {
      backupId: result.backupId,
      status: result.status
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Backup created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore endpoints
app.post('/api/backups/restore', async (req, res) => {
  try {
    // Validate Band approval for Indigenous data
    if (req.body.indigenousDataIncluded && !req.body.bandApproval) {
      return res.status(403).json({
        error: 'Band approval required for restoring Indigenous data'
      });
    }
    
    const result = await BackupService.restoreBackup({
      backupId: req.body.backupId,
      targetEnvironment: req.body.targetEnvironment,
      targetDatabase: req.body.targetDatabase,
      partialRestore: req.body.partialRestore,
      selectedData: req.body.selectedData,
      indigenousDataIncluded: req.body.indigenousDataIncluded,
      bandApproval: req.body.bandApproval,
      performedBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    // Emit real-time update
    io.emit('restore:completed', {
      restoreId: result.restoreId,
      status: result.status
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Restore completed successfully'
    });
  } catch (error: any) {
    logger.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule endpoints
app.post('/api/backups/schedule', async (req, res) => {
  try {
    const result = await BackupService.createBackupSchedule({
      name: req.body.name,
      schedule: req.body.schedule, // Cron expression
      type: req.body.type || 'INCREMENTAL',
      scope: req.body.scope || 'DATABASE',
      source: req.body.source,
      databases: req.body.databases,
      services: req.body.services,
      retentionDays: req.body.retentionDays || 30,
      includeIndigenousData: req.body.includeIndigenousData !== false,
      requireDataApproval: req.body.requireDataApproval,
      destination: req.body.destination || 'S3',
      notificationEmails: req.body.notificationEmails,
      createdBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Backup schedule created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating backup schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verification endpoints
app.post('/api/backups/:backupId/verify', async (req, res) => {
  try {
    const result = await BackupService.verifyBackup(
      req.params.backupId,
      req.body.verificationType || 'FULL'
    );
    
    res.json({
      success: true,
      ...result,
      message: 'Backup verification completed'
    });
  } catch (error: any) {
    logger.error('Error verifying backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disaster Recovery endpoints
app.post('/api/dr/plans', async (req, res) => {
  try {
    const result = await BackupService.createDisasterRecoveryPlan({
      planName: req.body.planName,
      description: req.body.description,
      rto: req.body.rto || 60, // Recovery Time Objective in minutes
      rpo: req.body.rpo || 15, // Recovery Point Objective in minutes
      criticalSystems: req.body.criticalSystems,
      indigenousDataSystems: req.body.indigenousDataSystems,
      dataSovereigntyPlan: req.body.dataSovereigntyPlan,
      culturalProtocols: req.body.culturalProtocols,
      procedures: req.body.procedures,
      primaryContact: req.body.primaryContact,
      createdBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Disaster recovery plan created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating DR plan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dr/incidents', async (req, res) => {
  try {
    const result = await BackupService.handleIncident({
      planId: req.body.planId,
      severity: req.body.severity,
      type: req.body.type,
      description: req.body.description,
      affectedSystems: req.body.affectedSystems,
      indigenousDataAffected: req.body.indigenousDataAffected,
      incidentCommander: req.body.incidentCommander,
      reportedBy: req.body.reportedBy || req.headers['x-user-id'] as string || 'system'
    });
    
    // Emit critical alert
    io.emit('incident:declared', {
      incidentId: result.incidentId,
      severity: req.body.severity,
      indigenousDataAffected: req.body.indigenousDataAffected
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Incident declared and recovery initiated'
    });
  } catch (error: any) {
    logger.error('Error handling incident:', error);
    res.status(500).json({ error: error.message });
  }
});

// List backups
app.get('/api/backups', async (req, res) => {
  try {
    const { status, source, includeIndigenous, limit = 20, offset = 0 } = req.query;
    
    const backups = await prisma.backup.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(source && { source: source as any }),
        ...(includeIndigenous !== undefined && { 
          includeIndigenousData: includeIndigenous === 'true' 
        })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        backupId: true,
        name: true,
        type: true,
        scope: true,
        source: true,
        size: true,
        compressedSize: true,
        status: true,
        includeIndigenousData: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        storageLocation: true,
        expiresAt: true
      }
    });
    
    // Convert BigInt to string for JSON serialization
    const serializedBackups = backups.map(backup => ({
      ...backup,
      size: backup.size?.toString(),
      compressedSize: backup.compressedSize?.toString()
    }));
    
    res.json({
      success: true,
      backups: serializedBackups,
      count: serializedBackups.length,
      hasMore: serializedBackups.length === parseInt(limit as string)
    });
  } catch (error: any) {
    logger.error('Error listing backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backup details
app.get('/api/backups/:backupId', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { backupId: req.params.backupId },
      include: {
        restores: {
          select: {
            restoreId: true,
            status: true,
            startedAt: true,
            completedAt: true
          }
        },
        verifications: {
          select: {
            verificationType: true,
            status: true,
            completedAt: true
          }
        }
      }
    });
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Convert BigInt to string
    const serializedBackup = {
      ...backup,
      size: backup.size?.toString(),
      compressedSize: backup.compressedSize?.toString(),
      restores: backup.restores.map(r => ({
        ...r,
        dataRestored: r.dataRestored?.toString()
      }))
    };
    
    res.json({
      success: true,
      backup: serializedBackup
    });
  } catch (error: any) {
    logger.error('Error getting backup details:', error);
    res.status(500).json({ error: error.message });
  }
});

// List restore operations
app.get('/api/restores', async (req, res) => {
  try {
    const { status, environment, limit = 20, offset = 0 } = req.query;
    
    const restores = await prisma.restoreOperation.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(environment && { targetEnvironment: environment as string })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        backup: {
          select: {
            backupId: true,
            name: true
          }
        }
      }
    });
    
    // Convert BigInt to string
    const serializedRestores = restores.map(restore => ({
      ...restore,
      dataRestored: restore.dataRestored?.toString()
    }));
    
    res.json({
      success: true,
      restores: serializedRestores,
      count: serializedRestores.length
    });
  } catch (error: any) {
    logger.error('Error listing restores:', error);
    res.status(500).json({ error: error.message });
  }
});

// List backup schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      where: {
        enabled: req.query.enabled !== 'false'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      schedules,
      count: schedules.length
    });
  } catch (error: any) {
    logger.error('Error listing schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update schedule
app.put('/api/schedules/:scheduleId', async (req, res) => {
  try {
    const updated = await prisma.backupSchedule.update({
      where: { id: req.params.scheduleId },
      data: {
        enabled: req.body.enabled,
        schedule: req.body.schedule,
        retentionDays: req.body.retentionDays,
        notificationEmails: req.body.notificationEmails
      }
    });
    
    res.json({
      success: true,
      schedule: updated,
      message: 'Schedule updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// List DR plans
app.get('/api/dr/plans', async (req, res) => {
  try {
    const plans = await prisma.disasterRecoveryPlan.findMany({
      where: {
        isActive: req.query.active !== 'false'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        incidents: {
          where: {
            status: { not: 'CLOSED' }
          },
          select: {
            incidentId: true,
            severity: true,
            status: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      plans,
      count: plans.length
    });
  } catch (error: any) {
    logger.error('Error listing DR plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// List incidents
app.get('/api/dr/incidents', async (req, res) => {
  try {
    const { status, severity, limit = 20, offset = 0 } = req.query;
    
    const incidents = await prisma.disasterRecoveryIncident.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(severity && { severity: severity as any })
      },
      orderBy: { reportedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        plan: {
          select: {
            planName: true,
            rto: true,
            rpo: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      incidents,
      count: incidents.length
    });
  } catch (error: any) {
    logger.error('Error listing incidents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Audit log endpoints
app.get('/api/audit', async (req, res) => {
  try {
    const { action, entityType, performedBy, limit = 50 } = req.query;
    
    const logs = await prisma.backupAuditLog.findMany({
      where: {
        ...(action && { action: action as any }),
        ...(entityType && { entityType: entityType as string }),
        ...(performedBy && { performedBy: performedBy as string })
      },
      orderBy: { performedAt: 'desc' },
      take: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error: any) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Storage locations
app.get('/api/storage', async (req, res) => {
  try {
    const locations = await prisma.storageLocation.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        healthStatus: true,
        totalCapacity: true,
        usedCapacity: true,
        availableCapacity: true,
        dataSovereigntyCompliant: true,
        dataResidency: true
      }
    });
    
    // Convert BigInt to string
    const serializedLocations = locations.map(loc => ({
      ...loc,
      totalCapacity: loc.totalCapacity?.toString(),
      usedCapacity: loc.usedCapacity?.toString(),
      availableCapacity: loc.availableCapacity?.toString()
    }));
    
    res.json({
      success: true,
      locations: serializedLocations,
      count: serializedLocations.length
    });
  } catch (error: any) {
    logger.error('Error listing storage locations:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);
  
  // Subscribe to backup progress
  socket.on('subscribe:backup', async (data) => {
    const { backupId } = data;
    socket.join(`backup:${backupId}`);
    
    // Send current status
    const backup = await prisma.backup.findUnique({
      where: { backupId },
      select: {
        status: true,
        progress: true
      }
    });
    
    if (backup) {
      socket.emit('backup:status', backup);
    }
  });
  
  // Subscribe to restore progress
  socket.on('subscribe:restore', async (data) => {
    const { restoreId } = data;
    socket.join(`restore:${restoreId}`);
    
    // Send current status
    const restore = await prisma.restoreOperation.findUnique({
      where: { restoreId },
      select: {
        status: true,
        progress: true
      }
    });
    
    if (restore) {
      socket.emit('restore:status', restore);
    }
  });
  
  // Subscribe to incident updates
  socket.on('subscribe:incidents', () => {
    socket.join('incidents:all');
  });
  
  // Subscribe to storage health
  socket.on('subscribe:storage-health', () => {
    socket.join('storage:health');
  });
  
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily backup verification
cron.schedule('0 2 * * *', async () => {
  logger.info('Running daily backup verification');
  try {
    const recentBackups = await prisma.backup.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        status: 'COMPLETED'
      }
    });
    
    for (const backup of recentBackups) {
      await BackupService.verifyBackup(backup.backupId, 'CHECKSUM');
    }
    
    logger.info(`Verified ${recentBackups.length} backups`);
  } catch (error) {
    logger.error('Backup verification failed:', error);
  }
});

// Storage health monitoring (every hour)
cron.schedule('0 * * * *', async () => {
  logger.info('Monitoring storage health');
  try {
    await BackupService.monitorStorageHealth();
    
    // Get current health status
    const locations = await prisma.storageLocation.findMany({
      where: { isActive: true },
      select: {
        name: true,
        healthStatus: true
      }
    });
    
    // Broadcast health status
    io.to('storage:health').emit('storage:health-update', locations);
  } catch (error) {
    logger.error('Storage health monitoring failed:', error);
  }
});

// Weekly DR plan test reminder
cron.schedule('0 9 * * MON', async () => {
  logger.info('Sending DR plan test reminders');
  try {
    const plans = await prisma.disasterRecoveryPlan.findMany({
      where: {
        isActive: true,
        nextTestDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    for (const plan of plans) {
      // Send reminder notification
      io.emit('dr:test-reminder', {
        planId: plan.id,
        planName: plan.planName,
        nextTestDate: plan.nextTestDate
      });
    }
    
    logger.info(`Sent ${plans.length} DR test reminders`);
  } catch (error) {
    logger.error('Failed to send DR reminders:', error);
  }
});

// Monthly retention policy enforcement
cron.schedule('0 3 1 * *', async () => {
  logger.info('Enforcing retention policies');
  try {
    // Find expired backups
    const expired = await prisma.backup.findMany({
      where: {
        expiresAt: {
          lte: new Date()
        },
        status: { not: 'EXPIRED' }
      }
    });
    
    for (const backup of expired) {
      await prisma.backup.update({
        where: { id: backup.id },
        data: { status: 'EXPIRED' }
      });
    }
    
    logger.info(`Marked ${expired.length} backups as expired`);
    
    // Archive old backups to Glacier
    const toArchive = await prisma.backup.findMany({
      where: {
        createdAt: {
          lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
        },
        storageClass: { not: 'GLACIER' },
        status: 'COMPLETED'
      }
    });
    
    for (const backup of toArchive) {
      // Move to Glacier storage class
      await prisma.backup.update({
        where: { id: backup.id },
        data: { 
          storageClass: 'GLACIER',
          status: 'ARCHIVED'
        }
      });
    }
    
    logger.info(`Archived ${toArchive.length} backups to Glacier`);
  } catch (error) {
    logger.error('Retention policy enforcement failed:', error);
  }
});

// Indigenous data sovereignty compliance check (weekly)
cron.schedule('0 10 * * FRI', async () => {
  logger.info('Running Indigenous data sovereignty compliance check');
  try {
    const indigenousBackups = await prisma.backup.findMany({
      where: {
        includeIndigenousData: true,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Check compliance for each backup
    const nonCompliant = [];
    for (const backup of indigenousBackups) {
      if (!backup.dataSovereignty) {
        nonCompliant.push(backup.backupId);
      }
    }
    
    if (nonCompliant.length > 0) {
      // Send compliance alert
      io.emit('compliance:alert', {
        type: 'INDIGENOUS_DATA_SOVEREIGNTY',
        affectedBackups: nonCompliant,
        message: 'Indigenous data backups missing sovereignty controls'
      });
    }
    
    logger.info(`Compliance check complete. ${nonCompliant.length} issues found`);
  } catch (error) {
    logger.error('Compliance check failed:', error);
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize service
async function initialize() {
  try {
    // Initialize backup service
    await BackupService.initialize();
    
    // Start server
    const PORT = process.env.PORT || 3024;
    httpServer.listen(PORT, () => {
      logger.info(`💾 Backup Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Features enabled:');
      logger.info('  - Automated backup scheduling');
      logger.info('  - Multi-cloud storage support (S3, Glacier, GCS)');
      logger.info('  - Point-in-time recovery');
      logger.info('  - Indigenous data sovereignty compliance');
      logger.info('  - Disaster recovery planning');
      logger.info('  - Backup encryption and compression');
      logger.info('  - Real-time backup monitoring');
      logger.info('  - Retention policy automation');
      logger.info('  - Backup integrity verification');
      logger.info('  - Incident response management');
    });
  } catch (error) {
    logger.error('Failed to initialize service:', error);
    process.exit(1);
  }
}

// Start the service
initialize();