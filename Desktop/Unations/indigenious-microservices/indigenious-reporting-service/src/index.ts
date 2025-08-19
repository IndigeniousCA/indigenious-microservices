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
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Services
import { ReportingService } from './services/reporting.service';

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
app.use(express.json({ limit: '10mb' }));
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
    await redis.ping();
    res.json({ 
      status: 'healthy',
      service: 'reporting-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Report generation endpoints
app.post('/api/reports/indigenous', async (req, res) => {
  try {
    const report = await ReportingService.generateIndigenousReport({
      type: req.body.type || 'INDIGENOUS_PARTICIPATION',
      businessId: req.body.businessId,
      dateRange: {
        start: new Date(req.body.startDate),
        end: new Date(req.body.endDate)
      },
      filters: req.body.filters,
      includeRecommendations: req.body.includeRecommendations !== false,
      format: req.body.format || 'PDF'
    });
    
    res.json({
      success: true,
      ...report,
      message: 'Indigenous procurement report generated successfully'
    });
  } catch (error: any) {
    logger.error('Error generating Indigenous report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/generate', async (req, res) => {
  try {
    const { reportType, parameters, format } = req.body;
    
    // Generate report based on type
    let report;
    if (reportType === 'INDIGENOUS_PARTICIPATION') {
      report = await ReportingService.generateIndigenousReport({
        ...parameters,
        format: format || 'PDF'
      });
    } else {
      // Handle other report types
      report = await ReportingService.generateIndigenousReport({
        type: reportType,
        ...parameters,
        format: format || 'PDF'
      });
    }
    
    res.json({
      success: true,
      ...report
    });
  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard endpoints
app.post('/api/dashboards/indigenous', async (req, res) => {
  try {
    const dashboard = await ReportingService.createIndigenousDashboard({
      businessId: req.body.businessId,
      userId: req.body.userId || req.headers['x-user-id'] as string,
      name: req.body.name || 'Indigenous Procurement Dashboard',
      bandFocus: req.body.bandFocus
    });
    
    res.json({
      success: true,
      ...dashboard,
      message: 'Indigenous dashboard created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// KPI tracking endpoints
app.get('/api/kpis/indigenous', async (req, res) => {
  try {
    const kpis = await ReportingService.trackIndigenousKPIs();
    
    res.json({
      success: true,
      kpis,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error tracking KPIs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Predictive analytics endpoints
app.post('/api/analytics/predict', async (req, res) => {
  try {
    const predictions = await ReportingService.generatePredictiveAnalytics({
      businessId: req.body.businessId,
      horizon: req.body.horizon || 90
    });
    
    res.json({
      success: true,
      ...predictions,
      message: 'Predictive analytics generated successfully'
    });
  } catch (error: any) {
    logger.error('Error generating predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compliance monitoring endpoints
app.post('/api/compliance/alerts/setup', async (req, res) => {
  try {
    const alerts = await ReportingService.setupComplianceAlerts({
      businessId: req.body.businessId,
      thresholds: req.body.thresholds || {
        critical: 3,
        warning: 4,
        target: 5
      }
    });
    
    res.json({
      success: true,
      ...alerts,
      message: 'Compliance alerts configured successfully'
    });
  } catch (error: any) {
    logger.error('Error setting up alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time metrics endpoint
app.get('/api/metrics/realtime', async (req, res) => {
  try {
    const metrics = await redis.hgetall('realtime:metrics');
    
    res.json({
      success: true,
      metrics: {
        indigenousSpendPercentage: parseFloat(metrics.indigenousSpendPercentage || '0'),
        activeIndigenousSuppliers: parseInt(metrics.activeIndigenousSuppliers || '0'),
        complianceStatus: metrics.complianceStatus || 'unknown',
        lastUpdated: metrics.lastUpdated || new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Error fetching real-time metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Historical data endpoints
app.get('/api/reports/history', async (req, res) => {
  try {
    const { businessId, reportType, limit = 10 } = req.query;
    
    const reports = await prisma.report.findMany({
      where: {
        ...(businessId && { businessId: businessId as string }),
        ...(reportType && { type: reportType as any })
      },
      orderBy: { generatedAt: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        reportNumber: true,
        title: true,
        type: true,
        generatedAt: true,
        fileUrl: true,
        status: true
      }
    });
    
    res.json({
      success: true,
      reports,
      count: reports.length
    });
  } catch (error: any) {
    logger.error('Error fetching report history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export endpoints
app.get('/api/reports/:reportId/export', async (req, res) => {
  try {
    const { format = 'PDF' } = req.query;
    
    const report = await prisma.report.findUnique({
      where: { id: req.params.reportId }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Create export record
    const exportRecord = await prisma.reportExport.create({
      data: {
        reportId: report.id,
        format: format as any,
        fileUrl: report.fileUrl || '',
        fileSize: report.fileSize || 0,
        exportedBy: req.headers['x-user-id'] as string || 'anonymous'
      }
    });
    
    // Update download count
    await prisma.report.update({
      where: { id: report.id },
      data: { downloadCount: { increment: 1 } }
    });
    
    res.json({
      success: true,
      downloadUrl: report.fileUrl,
      format,
      exportId: exportRecord.id
    });
  } catch (error: any) {
    logger.error('Error exporting report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule report endpoints
app.post('/api/reports/schedule', async (req, res) => {
  try {
    const schedule = await prisma.reportSchedule.create({
      data: {
        reportType: req.body.reportType,
        name: req.body.name,
        description: req.body.description,
        schedule: req.body.schedule, // Cron expression
        timezone: req.body.timezone || 'UTC',
        parameters: req.body.parameters,
        filters: req.body.filters,
        recipients: req.body.recipients,
        format: req.body.format || ['PDF'],
        includeIndigenous: req.body.includeIndigenous !== false,
        indigenousOnly: req.body.indigenousOnly || false,
        createdBy: req.body.userId || 'system'
      }
    });
    
    res.json({
      success: true,
      scheduleId: schedule.id,
      nextRun: schedule.nextRun,
      message: 'Report scheduled successfully'
    });
  } catch (error: any) {
    logger.error('Error scheduling report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Indigenous insights endpoints
app.get('/api/insights/indigenous', async (req, res) => {
  try {
    const insights = await prisma.indigenousInsight.findMany({
      where: {
        status: 'NEW',
        validUntil: { gte: new Date() }
      },
      orderBy: { significance: 'desc' },
      take: 10
    });
    
    res.json({
      success: true,
      insights,
      count: insights.length
    });
  } catch (error: any) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);
  
  // Subscribe to real-time metrics
  socket.on('subscribe:metrics', async (data) => {
    const { businessId } = data;
    socket.join(`metrics:${businessId || 'all'}`);
    
    // Send current metrics
    const metrics = await redis.hgetall(`metrics:${businessId || 'all'}`);
    socket.emit('metrics:update', metrics);
  });
  
  // Subscribe to Indigenous KPIs
  socket.on('subscribe:indigenous-kpis', async () => {
    socket.join('indigenous-kpis');
    
    // Send current KPIs
    const kpis = await ReportingService.trackIndigenousKPIs();
    socket.emit('kpis:update', kpis);
  });
  
  // Subscribe to compliance alerts
  socket.on('subscribe:compliance', async (data) => {
    const { businessId } = data;
    socket.join(`compliance:${businessId || 'all'}`);
  });
  
  // Dashboard updates
  socket.on('dashboard:refresh', async (data) => {
    const { dashboardId } = data;
    
    // Fetch latest widget data
    const widgets = await prisma.dashboardWidget.findMany({
      where: { dashboardId }
    });
    
    for (const widget of widgets) {
      // Get widget data
      const widgetData = await redis.hget('widget:data', widget.id);
      socket.emit('widget:update', {
        widgetId: widget.id,
        data: widgetData ? JSON.parse(widgetData) : null
      });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Calculate Indigenous KPIs every hour
cron.schedule('0 * * * *', async () => {
  logger.info('Calculating Indigenous KPIs');
  try {
    const kpis = await ReportingService.trackIndigenousKPIs();
    
    // Broadcast to connected clients
    io.to('indigenous-kpis').emit('kpis:update', kpis);
    
    // Check for compliance issues
    const indigenousSpendKPI = kpis.find(k => k.kpi === 'Indigenous Spend Percentage');
    if (indigenousSpendKPI && indigenousSpendKPI.value < 5) {
      io.to('compliance:all').emit('compliance:alert', {
        type: 'BELOW_TARGET',
        value: indigenousSpendKPI.value,
        target: 5,
        gap: 5 - indigenousSpendKPI.value
      });
    }
    
    logger.info('KPIs calculated and broadcast');
  } catch (error) {
    logger.error('Error calculating KPIs:', error);
  }
});

// Generate daily Indigenous report
cron.schedule('0 9 * * *', async () => {
  logger.info('Generating daily Indigenous report');
  try {
    const report = await ReportingService.generateIndigenousReport({
      type: 'INDIGENOUS_PARTICIPATION',
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      includeRecommendations: true,
      format: 'PDF'
    });
    
    logger.info(`Daily report generated: ${report.reportNumber}`);
    
    // Notify stakeholders
    io.emit('report:ready', {
      reportId: report.reportId,
      type: 'DAILY_INDIGENOUS',
      url: report.fileUrl
    });
  } catch (error) {
    logger.error('Error generating daily report:', error);
  }
});

// Update real-time metrics every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('Updating real-time metrics');
  try {
    // Calculate current metrics
    const totalSpend = 50000000; // Would fetch from database
    const indigenousSpend = 2100000; // Would fetch from database
    const percentage = (indigenousSpend / totalSpend) * 100;
    
    const metrics = {
      indigenousSpendPercentage: percentage.toFixed(2),
      activeIndigenousSuppliers: '78',
      complianceStatus: percentage >= 5 ? 'COMPLIANT' : 'NON_COMPLIANT',
      lastUpdated: new Date().toISOString()
    };
    
    // Store in Redis
    await redis.hmset('realtime:metrics', metrics);
    
    // Broadcast updates
    io.to('metrics:all').emit('metrics:update', metrics);
    
    logger.info('Real-time metrics updated');
  } catch (error) {
    logger.error('Error updating metrics:', error);
  }
});

// Weekly compliance check
cron.schedule('0 9 * * MON', async () => {
  logger.info('Running weekly compliance check');
  try {
    // Setup compliance alerts for all businesses
    const alerts = await ReportingService.setupComplianceAlerts({
      thresholds: {
        critical: 3,
        warning: 4,
        target: 5
      }
    });
    
    logger.info('Weekly compliance check completed');
    
    // Send compliance summary
    io.emit('compliance:weekly-summary', {
      date: new Date().toISOString(),
      alertsConfigured: alerts.alertsCreated,
      status: 'active'
    });
  } catch (error) {
    logger.error('Error in compliance check:', error);
  }
});

// Clean up old reports monthly
cron.schedule('0 2 1 * *', async () => {
  logger.info('Cleaning up old reports');
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const deleted = await prisma.report.deleteMany({
      where: {
        generatedAt: { lt: sixMonthsAgo },
        isPublic: false
      }
    });
    
    logger.info(`Cleaned up ${deleted.count} old reports`);
  } catch (error) {
    logger.error('Error cleaning up reports:', error);
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

// Start server
const PORT = process.env.PORT || 3023;
httpServer.listen(PORT, () => {
  logger.info(`📊 Reporting Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - Indigenous procurement analytics (5% mandate tracking)');
  logger.info('  - Real-time KPI monitoring');
  logger.info('  - Predictive analytics with ML');
  logger.info('  - Compliance alerts and monitoring');
  logger.info('  - Interactive dashboards with Indigenous focus');
  logger.info('  - Multi-format report generation (PDF, Excel, CSV)');
  logger.info('  - Scheduled report automation');
  logger.info('  - Band/Nation specific analytics');
  logger.info('  - WebSocket real-time updates');
  logger.info('  - AI-powered insights and recommendations');
});