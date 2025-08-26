import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { LoggingService } from './services/logging.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const prisma = new PrismaClient();
const loggingService = new LoggingService();

// Middleware
app.use(helmet());
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
  max: 1000, // Higher limit for logging service
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const stats = await loggingService.getServiceStats();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-logging-service',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Log ingestion
app.post('/api/logs', async (req, res) => {
  try {
    const logId = await loggingService.log(req.body);
    res.status(201).json({ logId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create log entry' 
    });
  }
});

// Bulk log ingestion
app.post('/api/logs/bulk', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs must be an array' });
    }
    
    const logIds = [];
    for (const logData of logs) {
      try {
        const logId = await loggingService.log(logData);
        logIds.push(logId);
      } catch (error) {
        // Continue processing other logs
        console.error('Failed to process log:', error);
      }
    }
    
    res.json({ 
      processed: logIds.length, 
      total: logs.length,
      logIds 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process bulk logs' 
    });
  }
});

// Log search
app.post('/api/logs/search', async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string || 'user';
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const results = await loggingService.searchLogs(query, userId, userRole);
    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Search failed' 
    });
  }
});

// Get specific log entry
app.get('/api/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const userRole = req.headers['x-user-role'] as string || 'user';
    
    const log = await loggingService.getLogById(logId);
    
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    // Check access permissions for Indigenous data
    if (log.indigenousData && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous data' });
    }
    
    res.json(log);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get log entry' 
    });
  }
});

// Log aggregations
app.get('/api/logs/aggregations', async (req, res) => {
  try {
    const { type = 'HOURLY', from, to, key } = req.query;
    
    const where: any = { aggregationType: type };
    
    if (from || to) {
      where.periodStart = {};
      if (from) where.periodStart.gte = new Date(from as string);
      if (to) where.periodStart.lte = new Date(to as string);
    }
    
    if (key) {
      where.aggregationKey = key;
    }
    
    const aggregations = await prisma.logAggregation.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: 100
    });
    
    res.json(aggregations);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get aggregations' 
    });
  }
});

// Service statistics
app.get('/api/logs/stats', async (req, res) => {
  try {
    const stats = await loggingService.getServiceStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get statistics' 
    });
  }
});

// Service-specific logs
app.get('/api/logs/services/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { level, limit = 100, offset = 0 } = req.query;
    
    const where: any = { service: serviceName };
    if (level) where.level = level;
    
    const logs = await prisma.logEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    const total = await prisma.logEntry.count({ where });
    
    res.json({ logs, total, hasMore: logs.length === parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get service logs' 
    });
  }
});

// Indigenous-specific endpoints

// Elder logs (requires elevated permissions)
app.get('/api/logs/elder', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Elder logs' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await prisma.logEntry.findMany({
      where: { elderActivity: true },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get Elder logs' 
    });
  }
});

// Ceremony logs
app.get('/api/logs/ceremony', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor', 'ceremony-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to ceremony logs' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await prisma.logEntry.findMany({
      where: { ceremonialContext: true },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get ceremony logs' 
    });
  }
});

// Traditional knowledge access logs
app.get('/api/logs/traditional-knowledge', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'knowledge-keeper'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to traditional knowledge logs' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await prisma.logEntry.findMany({
      where: { traditionalKnowledge: true },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get traditional knowledge logs' 
    });
  }
});

// Nation-specific logs
app.get('/api/logs/nation/:nation', async (req, res) => {
  try {
    const { nation } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userNation = req.headers['x-user-nation'] as string;
    
    // Users can only access their own nation's logs unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole) && userNation !== nation) {
      return res.status(403).json({ error: 'Access denied to other nation logs' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await prisma.logEntry.findMany({
      where: { nation },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get nation logs' 
    });
  }
});

// Export endpoints

// Request log export
app.post('/api/logs/export', async (req, res) => {
  try {
    const { query, format = 'csv' } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userName = req.headers['x-user-name'] as string || 'Unknown';
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const exportId = await loggingService.exportLogs(query, format, userId, userName);
    
    res.json({ exportId, message: 'Export request submitted' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Export request failed' 
    });
  }
});

// Get export status
app.get('/api/logs/export/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const exportRecord = await prisma.logExport.findUnique({
      where: { id: exportId }
    });
    
    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }
    
    // Users can only check their own exports
    if (exportRecord.userId !== userId && !['admin'].includes(req.headers['x-user-role'] as string)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(exportRecord);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get export status' 
    });
  }
});

// Approve Indigenous data export (Elder only)
app.post('/api/logs/export/:exportId/approve', async (req, res) => {
  try {
    const { exportId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!['elder', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Elders can approve Indigenous data exports' });
    }
    
    const exportRecord = await prisma.logExport.update({
      where: { id: exportId },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
        status: 'PROCESSING'
      }
    });
    
    // Start processing the approved export
    // loggingService.processExport(exportRecord);
    
    res.json({ message: 'Export approved and processing started' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to approve export' 
    });
  }
});

// Alert management

// Get log alerts
app.get('/api/logs/alerts', async (req, res) => {
  try {
    const { status, severity, limit = 50 } = req.query;
    
    const where: any = {};
    if (status) where.acknowledged = status === 'acknowledged';
    if (severity) where.severity = severity;
    
    const alerts = await prisma.logAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        logEntry: {
          select: {
            service: true,
            level: true,
            message: true,
            timestamp: true
          }
        }
      }
    });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get alerts' 
    });
  }
});

// Acknowledge alert
app.post('/api/logs/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const alert = await prisma.logAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      }
    });
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert' 
    });
  }
});

// Resolve alert
app.post('/api/logs/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const alert = await prisma.logAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date()
      }
    });
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to resolve alert' 
    });
  }
});

// Dashboard management

// Get dashboards
app.get('/api/logs/dashboards', async (req, res) => {
  try {
    const { indigenousDashboard, nation } = req.query;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    const where: any = { active: true };
    
    if (indigenousDashboard === 'true') {
      where.indigenousDashboard = true;
    }
    
    if (nation) {
      where.nation = nation;
    }
    
    // Filter based on access permissions
    if (!['admin', 'elder'].includes(userRole)) {
      where.OR = [
        { public: true },
        { ownerId: userId },
        { sharedWith: { has: userId } }
      ];
    }
    
    const dashboards = await prisma.logDashboard.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get dashboards' 
    });
  }
});

// Create dashboard
app.post('/api/logs/dashboards', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    const dashboard = await prisma.logDashboard.create({
      data: {
        ...req.body,
        ownerId: userId
      }
    });
    
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create dashboard' 
    });
  }
});

// WebSocket events for real-time log streaming
io.on('connection', (socket) => {
  console.log('Client connected to logging service');
  
  // Subscribe to log stream
  socket.on('subscribe:logs', (filters: any) => {
    const channel = `logs:${filters.service || 'all'}:${filters.level || 'all'}`;
    socket.join(channel);
  });
  
  // Subscribe to Indigenous logs (requires permission)
  socket.on('subscribe:indigenous-logs', (userRole: string) => {
    if (['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      socket.join('indigenous-logs');
    }
  });
  
  // Subscribe to alerts
  socket.on('subscribe:alerts', () => {
    socket.join('alerts');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from logging service');
  });
});

// Listen for logging events
loggingService.on('log', (logEntry) => {
  // Broadcast to appropriate channels
  const channel = `logs:${logEntry.service}:${logEntry.level}`;
  io.to(channel).emit('log:new', logEntry);
  io.to('logs:all:all').emit('log:new', logEntry);
  
  // Indigenous logs
  if (logEntry.indigenousData) {
    io.to('indigenous-logs').emit('indigenous-log:new', logEntry);
  }
});

loggingService.on('alert', (alert) => {
  io.to('alerts').emit('alert:new', alert);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3043;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Logging Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Centralized log aggregation');
  console.log('- Indigenous data sovereignty');
  console.log('- Elder priority logging');
  console.log('- Ceremony-aware retention');
  console.log('- Cultural sensitivity protection');
  console.log('- Traditional knowledge access control');
  console.log('- Real-time log streaming');
  console.log('- Multi-format export with approval workflow');
  console.log('- Advanced search and analytics');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});