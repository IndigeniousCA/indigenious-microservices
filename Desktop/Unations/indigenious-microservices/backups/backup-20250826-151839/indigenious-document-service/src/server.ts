import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import documentRoutes from './routes/document.routes';
import uploadRoutes from './routes/upload.routes';
import versionRoutes from './routes/version.routes';
import shareRoutes from './routes/share.routes';
import searchRoutes from './routes/search.routes';
import healthRoutes from './routes/health.routes';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeS3 } from './config/s3';
import { initializeQueue } from './config/queue';
import { startMetricsServer } from './monitoring/metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow S3 resources
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per window
  message: 'Too many upload requests, please try again later.',
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 downloads per window
});

// Body parsing (JSON only - file uploads handled by multer)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/v1/documents', authMiddleware, documentRoutes);
app.use('/api/v1/upload', authMiddleware, uploadLimiter, uploadRoutes);
app.use('/api/v1/versions', authMiddleware, versionRoutes);
app.use('/api/v1/share', authMiddleware, shareRoutes);
app.use('/api/v1/search', authMiddleware, searchRoutes);

// Public download endpoint with signed URLs
app.get('/download/:documentId', downloadLimiter, async (req, res, next) => {
  try {
    const { getSignedDownloadUrl } = await import('./services/s3.service');
    const url = await getSignedDownloadUrl(req.params.documentId, req.query.token as string);
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.path,
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized');

    // Initialize Redis
    await initializeRedis();
    logger.info('Redis initialized');

    // Initialize S3
    await initializeS3();
    logger.info('S3 initialized');

    // Initialize job queue
    await initializeQueue();
    logger.info('Job queue initialized');

    // Start metrics server
    startMetricsServer();
    logger.info('Metrics server started');

    // Start main server
    const server = app.listen(PORT, () => {
      logger.info(`Document Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Features: S3 storage, OCR, virus scanning, versioning');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;