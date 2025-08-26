import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import certificationRoutes from './routes/certification.routes';
import auditRoutes from './routes/audit.routes';
import complianceRoutes from './routes/compliance.routes';
import verificationRoutes from './routes/verification.routes';
import reportRoutes from './routes/report.routes';
import healthRoutes from './routes/health.routes';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeServices } from './config/services';
import { startComplianceMonitor } from './services/monitoring.service';
import { startScheduledTasks } from './utils/scheduler';
import { startMetricsServer } from './utils/metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

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
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
});

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Strict limit for verification requests
  message: 'Too many verification attempts, please try again later.',
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/v1/certifications', authMiddleware, apiLimiter, certificationRoutes);
app.use('/api/v1/audit', authMiddleware, apiLimiter, auditRoutes);
app.use('/api/v1/compliance', authMiddleware, apiLimiter, complianceRoutes);
app.use('/api/v1/verification', authMiddleware, verificationLimiter, verificationRoutes);
app.use('/api/v1/reports', authMiddleware, apiLimiter, reportRoutes);

// Public verification endpoint (for external verification)
app.get('/api/v1/public/verify/:certificationNumber', async (req, res) => {
  try {
    const { certificationNumber } = req.params;
    const { CertificationService } = await import('./services/certification.service');
    const result = await CertificationService.publicVerification(certificationNumber);
    res.json(result);
  } catch (error) {
    res.status(404).json({ valid: false, message: 'Certification not found' });
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

    // Initialize services
    await initializeServices();
    logger.info('Services initialized');

    // Start compliance monitoring
    await startComplianceMonitor();
    logger.info('Compliance monitor started');

    // Start scheduled tasks
    await startScheduledTasks();
    logger.info('Scheduled tasks started');

    // Start metrics server
    startMetricsServer();
    logger.info('Metrics server started');

    // Start main server
    app.listen(PORT, () => {
      logger.info(`Compliance Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Features: Certification verification, Audit trails, Regulatory compliance');
      logger.info('Integrations: CCAB, Government registries, Document validation');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;