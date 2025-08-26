import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import analyticsRoutes from './routes/analytics.routes';
import metricsRoutes from './routes/metrics.routes';
import reportRoutes from './routes/report.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { requestLogger } from './middleware/logger.middleware';

// Import services
import { MetricsCollector } from './services/metrics-collector.service';
import { AnalyticsEngine } from './services/analytics-engine.service';
import { DataAggregator } from './services/data-aggregator.service';
import { ReportGenerator } from './services/report-generator.service';

// Import jobs
import { startScheduledJobs } from './jobs/scheduler';
import { startKafkaConsumer } from './services/kafka-consumer.service';

// Import utils
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { clickhouse } from './config/clickhouse';

const app: Application = express();
const server = createServer(app);
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redis.ping();
    
    // Check ClickHouse connection
    await clickhouse.ping();
    
    res.status(200).json({
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service dependencies unavailable',
    });
  }
});

// API Routes
app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);
app.use('/api/v1/metrics', authMiddleware, metricsRoutes);
app.use('/api/v1/reports', authMiddleware, reportRoutes);
app.use('/api/v1/dashboard', authMiddleware, dashboardRoutes);

// Public endpoints for embedded dashboards
app.get('/api/v1/public/stats/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const widget = await AnalyticsEngine.getPublicWidget(widgetId);
    res.json(widget);
  } catch (error) {
    res.status(404).json({ error: 'Widget not found' });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize metrics collector
    await MetricsCollector.initialize();
    
    // Initialize analytics engine
    await AnalyticsEngine.initialize();
    
    // Initialize data aggregator
    await DataAggregator.initialize();
    
    // Start scheduled jobs
    await startScheduledJobs();
    
    // Start Kafka consumer for real-time events
    if (process.env.ENABLE_KAFKA === 'true') {
      await startKafkaConsumer();
    }
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await prisma.$connect();
    logger.info('Database connected');
    
    // Initialize services
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`Analytics service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redis.quit();
  await clickhouse.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redis.quit();
  await clickhouse.close();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;