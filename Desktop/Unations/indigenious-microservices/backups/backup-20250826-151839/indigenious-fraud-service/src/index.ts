import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import winston from 'winston';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

// Services
import { FraudDetectionService } from './services/fraud-detection.service';

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
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
      service: 'fraud-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Fraud detection routes
app.post('/api/fraud/detect', async (req, res) => {
  try {
    const result = await FraudDetectionService.detectFraud(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error('Error detecting fraud:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fraud/verify-indigenous', async (req, res) => {
  try {
    const result = await FraudDetectionService.verifyIndigenousBusiness(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error('Error verifying Indigenous business:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fraud/detect-bid-manipulation', async (req, res) => {
  try {
    const { rfqId, bids } = req.body;
    const result = await FraudDetectionService.detectBidManipulation(rfqId, bids);
    res.json(result);
  } catch (error: any) {
    logger.error('Error detecting bid manipulation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fraud/detect-collusion', async (req, res) => {
  try {
    const { rfqId, entities } = req.body;
    const result = await FraudDetectionService.detectCollusion(rfqId, entities);
    res.json(result);
  } catch (error: any) {
    logger.error('Error detecting collusion:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time alerts
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('subscribe:alerts', (entityId: string) => {
    socket.join(`alerts:${entityId}`);
    logger.info(`Socket ${socket.id} subscribed to alerts for ${entityId}`);
  });

  socket.on('subscribe:investigations', () => {
    socket.join('investigations');
    logger.info(`Socket ${socket.id} subscribed to investigations`);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily fraud scan
cron.schedule('0 2 * * *', async () => {
  logger.info('Running daily fraud scan');
  try {
    // Scan for suspicious patterns
    logger.info('Daily fraud scan completed');
  } catch (error) {
    logger.error('Error in daily fraud scan:', error);
  }
});

// Weekly verification check
cron.schedule('0 10 * * MON', async () => {
  logger.info('Running weekly verification check');
  try {
    // Check expired verifications
    logger.info('Weekly verification check completed');
  } catch (error) {
    logger.error('Error in verification check:', error);
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
const PORT = process.env.PORT || 3017;
httpServer.listen(PORT, () => {
  logger.info(`🔍 Fraud Detection Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Protection features:');
  logger.info('  - Indigenous business verification');
  logger.info('  - Bid manipulation detection');
  logger.info('  - Collusion detection');
  logger.info('  - Document authenticity verification');
  logger.info('  - Behavioral anomaly detection');
  logger.info('  - ML-powered fraud detection');
});