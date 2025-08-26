import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './utils/database';
import { initializeRedis } from './utils/redis';
import { initializeElasticsearch } from './utils/elasticsearch';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { rfqRouter } from './api/routes';
import { TemplateService } from './services/template-service';
import cron from 'cron';
import { RFQService } from './services/rfq-service';
import { ContractService } from './services/contract-service';
import { InvitationService } from './services/invitation-service';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Service-Token']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'rfq-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const { query } = await import('./utils/database');
    await query('SELECT 1');
    
    // Check Redis connection
    const { getRedis } = await import('./utils/redis');
    await getRedis().ping();
    
    // Check Elasticsearch connection
    const { getElasticsearchClient } = await import('./utils/elasticsearch');
    await getElasticsearchClient().ping();
    
    res.json({ 
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        redis: 'connected',
        elasticsearch: 'connected'
      }
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ 
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    service: 'rfq-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform
    }
  });
});

// API routes
app.use('/api/rfqs', rfqRouter);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Cron jobs for scheduled tasks
const rfqService = new RFQService();
const contractService = new ContractService();
const invitationService = new InvitationService();

// Schedule deadline reminders (runs every hour)
const deadlineReminderJob = new cron.CronJob('0 * * * *', async () => {
  try {
    await rfqService.scheduleDeadlineReminders();
    logger.info('RFQ deadline reminders sent');
  } catch (error) {
    logger.error('Failed to send deadline reminders:', error);
  }
});

// Schedule contract deadline checks (runs daily at 9 AM)
const contractDeadlineJob = new cron.CronJob('0 9 * * *', async () => {
  try {
    await contractService.checkContractDeadlines();
    logger.info('Contract deadline checks completed');
  } catch (error) {
    logger.error('Failed to check contract deadlines:', error);
  }
});

// Schedule invitation cleanup (runs daily at 2 AM)
const invitationCleanupJob = new cron.CronJob('0 2 * * *', async () => {
  try {
    const expiredCount = await invitationService.expireOldInvitations();
    logger.info(`Expired ${expiredCount} old invitations`);
  } catch (error) {
    logger.error('Failed to expire old invitations:', error);
  }
});

// Start server
async function startServer() {
  try {
    // Initialize connections
    logger.info('Initializing database connection...');
    await connectDatabase();
    
    logger.info('Initializing Redis connection...');
    await initializeRedis();
    
    logger.info('Initializing Elasticsearch connection...');
    await initializeElasticsearch();
    
    // Create default templates if they don't exist
    logger.info('Creating default RFQ templates...');
    const templateService = new TemplateService();
    await templateService.createDefaultTemplates();
    
    // Start cron jobs
    logger.info('Starting scheduled jobs...');
    deadlineReminderJob.start();
    contractDeadlineJob.start();
    invitationCleanupJob.start();
    
    app.listen(PORT, () => {
      logger.info(`🚀 RFQ Service running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
      logger.info(`🔍 Elasticsearch connected for search`);
      logger.info(`⚡ Redis connected for caching`);
      logger.info(`🔄 Scheduled jobs started`);
      logger.info(`📋 Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ Ready check: http://localhost:${PORT}/ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  // Stop cron jobs
  deadlineReminderJob.stop();
  contractDeadlineJob.stop();
  invitationCleanupJob.stop();
  
  // Close connections
  try {
    const { closeElasticsearch } = await import('./utils/elasticsearch');
    await closeElasticsearch();
    logger.info('Elasticsearch connection closed');
  } catch (error) {
    logger.error('Error closing Elasticsearch:', error);
  }
  
  try {
    const { getRedis } = await import('./utils/redis');
    getRedis().disconnect();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis:', error);
  }
  
  // Exit process
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;