import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import conversationRoutes from './routes/conversation.routes';
import messageRoutes from './routes/message.routes';
import healthRoutes from './routes/health.routes';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { setupSocketHandlers } from './handlers/socket.handler';
import { MessageService } from './services/message.service';
import { ConversationService } from './services/conversation.service';
import { PresenceService } from './services/presence.service';
import { startMetricsServer } from './utils/metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Create HTTP server for Socket.IO
const server = createServer(app);

// Initialize Socket.IO with Redis adapter for scaling
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
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
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Too many messages, please slow down.',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/v1/conversations', authMiddleware, apiLimiter, conversationRoutes);
app.use('/api/v1/messages', authMiddleware, messageLimiter, messageRoutes);

// Socket.IO handlers
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

    // Initialize services
    await MessageService.initialize();
    await ConversationService.initialize();
    await PresenceService.initialize();
    logger.info('Services initialized');

    // Start metrics server
    startMetricsServer();
    logger.info('Metrics server started');

    // Start main server
    server.listen(PORT, () => {
      logger.info(`Chat Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('WebSocket transport enabled for real-time messaging');
      logger.info('Features: Direct messages, Group chats, RFQ discussions, File sharing');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      
      // Close Socket.IO connections
      io.close(() => {
        logger.info('Socket.IO connections closed');
      });

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
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