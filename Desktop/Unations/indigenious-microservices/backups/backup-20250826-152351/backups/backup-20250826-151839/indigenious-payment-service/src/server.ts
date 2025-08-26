import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import paymentRoutes from './routes/payment.routes';
import stripeRoutes from './routes/stripe.routes';
import paypalRoutes from './routes/paypal.routes';
import interacRoutes from './routes/interac.routes';
import quickPayRoutes from './routes/quick-pay.routes';
import taxRoutes from './routes/tax.routes';
import healthRoutes from './routes/health.routes';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializePaymentProviders } from './config/payment-providers';
import { startMetricsServer } from './monitoring/metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

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
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many payment requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/v1/payments', authMiddleware, paymentLimiter, paymentRoutes);
app.use('/api/v1/stripe', authMiddleware, paymentLimiter, stripeRoutes);
app.use('/api/v1/paypal', authMiddleware, paymentLimiter, paypalRoutes);
app.use('/api/v1/interac', authMiddleware, paymentLimiter, interacRoutes);
app.use('/api/v1/quick-pay', authMiddleware, paymentLimiter, quickPayRoutes);
app.use('/api/v1/tax', authMiddleware, taxRoutes);

// Stripe webhook endpoint (no auth, uses signature verification)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { processWebhook } = await import('./services/stripe.service');
  await processWebhook(req, res);
});

// PayPal webhook endpoint
app.post('/webhook/paypal', express.raw({ type: 'application/json' }), async (req, res) => {
  const { processWebhook } = await import('./services/paypal.service');
  await processWebhook(req, res);
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

    // Initialize payment providers
    await initializePaymentProviders();
    logger.info('Payment providers initialized');

    // Start metrics server
    startMetricsServer();
    logger.info('Metrics server started');

    // Start main server
    const server = app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Payment providers: Stripe, PayPal, Interac');
      logger.info('Features: Quick Pay (24hr), Canadian Tax, Indigenous Preferences');
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