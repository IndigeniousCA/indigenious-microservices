import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Redis client for caching and rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Service routing configuration - ALL 49 SERVICES
const services = {
  // Core Services (1-10)
  '/api/users': 'http://user-service:3001',
  '/api/business': 'http://business-service:3002',
  '/api/rfq': 'http://rfq-service:3003',
  '/api/payments': 'http://payment-service:3004',
  '/api/documents': 'http://document-service:3005',
  '/api/notifications': 'http://notification-service:3006',
  '/api/chat': 'http://chat-service:3007',
  '/api/analytics': 'http://analytics-service:3008',
  '/api/compliance': 'http://compliance-service:3009',
  '/api/auth': 'http://auth-service:3044',
  
  // AI & Intelligence (11-20)
  '/api/ai/core': 'http://ai-core-service:3010',
  '/api/ai/intelligence': 'http://ai-intelligence-service:3011',
  '/api/market-intelligence': 'http://market-intelligence-service:3012',
  '/api/fraud': 'http://fraud-service:3013',
  '/api/verification': 'http://verification-service:3014',
  '/api/evaluation': 'http://evaluation-service:3015',
  '/api/pipeline': 'http://pipeline-service:3016',
  '/api/reporting': 'http://reporting-service:3017',
  '/api/search': 'http://search-service:3018',
  '/api/recommendations': 'http://recommendation-service:3019',
  
  // Business Operations (21-30)
  '/api/bonding': 'http://bonding-service:3020',
  '/api/community': 'http://community-service:3021',
  '/api/training': 'http://training-service:3022',
  '/api/vendors': 'http://vendor-service:3023',
  '/api/suppliers': 'http://supplier-service:3024',
  '/api/inventory': 'http://inventory-service:3025',
  '/api/warehouse': 'http://warehouse-service:3026',
  '/api/distribution': 'http://distribution-service:3027',
  '/api/returns': 'http://returns-service:3028',
  '/api/customers': 'http://customer-service:3029',
  
  // Communication (31-40)
  '/api/email': 'http://email-service:3030',
  '/api/sms': 'http://sms-service:3031',
  '/api/push': 'http://push-notification-service:3032',
  '/api/feedback': 'http://feedback-service:3033',
  '/api/help': 'http://help-service:3034',
  '/api/video': 'http://video-service:3035',
  '/api/voice': 'http://voice-service:3036',
  '/api/storage': 'http://file-storage-service:3037',
  '/api/cdn': 'http://cdn-service:3038',
  '/api/backup': 'http://backup-service:3039',
  
  // Infrastructure (41-49)
  '/api/cache': 'http://cache-service:3040',
  '/api/queue': 'http://queue-service:3041',
  '/api/monitoring': 'http://monitoring-service:3042',
  '/api/logging': 'http://logging-service:3043',
  '/api/agents': 'http://agent-monitoring-service:3045',
  '/api/ambient': 'http://ambient-intelligence-service:3046',
  '/api/pr': 'http://pr-automation-service:3047',
  '/api/design': 'http://design-system-service:3049',
};

// Set up proxy routes for each service
Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Routing ${req.method} ${req.originalUrl} to ${target}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(502).json({ 
        error: 'Service temporarily unavailable',
        service: target,
        message: err.message 
      });
    }
  }));
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  res.json({
    services: Object.keys(services).map(path => ({
      path,
      target: services[path],
      status: 'active'
    })),
    total: Object.keys(services).length,
    platform: 'Indigenous Procurement Platform',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableServices: Object.keys(services)
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`📡 Routing ${Object.keys(services).length} microservices`);
  logger.info('🌍 Indigenous Procurement Platform - Gateway Ready');
});