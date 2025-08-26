import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import notificationRoutes from './routes/notification.routes';
import emailRoutes from './routes/email.routes';
import smsRoutes from './routes/sms.routes';
import pushRoutes from './routes/push.routes';
import preferenceRoutes from './routes/preference.routes';
import templateRoutes from './routes/template.routes';
import healthRoutes from './routes/health.routes';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeQueue } from './config/queue';
import { initializeProviders } from './config/providers';
import { startMetricsServer } from './monitoring/metrics';
import { setupSocketHandlers } from './services/realtime.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Create HTTP server for Socket.IO
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 notifications per window
  message: 'Too many notification requests, please try again later.',
});

const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/v1/notifications', authMiddleware, notificationLimiter, notificationRoutes);
app.use('/api/v1/email', authMiddleware, notificationLimiter, emailRoutes);
app.use('/api/v1/sms', authMiddleware, notificationLimiter, smsRoutes);
app.use('/api/v1/push', authMiddleware, notificationLimiter, pushRoutes);
app.use('/api/v1/preferences', authMiddleware, preferenceRoutes);
app.use('/api/v1/templates', authMiddleware, templateRoutes);
app.use('/api/v1/bulk', authMiddleware, bulkLimiter, notificationRoutes);

// Socket.IO real-time notifications
setupSocketHandlers(io);

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

    // Initialize notification providers
    await initializeProviders();
    logger.info('Notification providers initialized');

    // Initialize job queue
    await initializeQueue();
    logger.info('Job queue initialized');

    // Start metrics server
    startMetricsServer();
    logger.info('Metrics server started');

    // Start main server
    server.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Providers: Email (SendGrid/SES), SMS (Twilio), Push (FCM/WebPush)');
      logger.info('Features: Templates, Preferences, Bulk sending, Real-time updates');
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
export { io };