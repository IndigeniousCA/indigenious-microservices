import express from 'express';
import httpProxy from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import CircuitBreaker from 'opossum';

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Service registry with nature mapping
const services = {
  // Foundation Elements (Earth, Water, Fire, Air)
  auth: { 
    url: 'http://localhost:3001', 
    element: 'earth',
    symbol: '🌍',
    health: 100,
    description: 'Deep roots authentication'
  },
  user: { 
    url: 'http://localhost:3002', 
    element: 'earth',
    symbol: '👤',
    health: 100,
    description: 'User management'
  },
  business: { 
    url: 'http://localhost:3003', 
    element: 'earth',
    symbol: '🏢',
    health: 100,
    description: 'Business entities'
  },
  
  // Water Services (Flow)
  rfq: { 
    url: 'http://localhost:3004', 
    element: 'water',
    symbol: '💧',
    health: 100,
    description: 'RFQ flowing rivers'
  },
  payment: { 
    url: 'http://localhost:3005', 
    element: 'water',
    symbol: '💰',
    health: 100,
    description: 'Payment streams'
  },
  
  // Fire Services (Transformation)
  analytics: { 
    url: 'http://localhost:3006', 
    element: 'fire',
    symbol: '📊',
    health: 100,
    description: 'Data transformation'
  },
  ai: { 
    url: 'http://localhost:3007', 
    element: 'fire',
    symbol: '🤖',
    health: 100,
    description: 'AI intelligence'
  },
  
  // Air Services (Communication)
  chat: { 
    url: 'http://localhost:3008', 
    element: 'air',
    symbol: '💬',
    health: 100,
    description: 'Wind messages'
  },
  notification: { 
    url: 'http://localhost:3009', 
    element: 'air',
    symbol: '🔔',
    health: 100,
    description: 'Bird songs'
  },
  
  // Life Services (Growth)
  document: { 
    url: 'http://localhost:3010', 
    element: 'life',
    symbol: '📄',
    health: 100,
    description: 'Document seeds'
  },
  compliance: { 
    url: 'http://localhost:3011', 
    element: 'life',
    symbol: '✅',
    health: 100,
    description: 'Seasonal compliance'
  },
  
  // Additional Services
  blockchain: { 
    url: 'http://localhost:3012', 
    element: 'crystal',
    symbol: '⛓️',
    health: 100,
    description: 'Immutable ledger'
  },
  banking: { 
    url: 'http://localhost:3013', 
    element: 'water',
    symbol: '🏦',
    health: 100,
    description: 'Financial rivers'
  },
  capital: { 
    url: 'http://localhost:3014', 
    element: 'earth',
    symbol: '💎',
    health: 100,
    description: 'Resource accumulation'
  },
  cultural: { 
    url: 'http://localhost:3015', 
    element: 'spirit',
    symbol: '🪶',
    health: 100,
    description: 'Cultural wisdom'
  }
};

// Circuit breaker options
const breakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Create circuit breakers for each service
const breakers = new Map();
Object.keys(services).forEach(serviceName => {
  const breaker = new CircuitBreaker(async (req: express.Request) => {
    // Circuit breaker logic will be implemented per service
    return true;
  }, breakerOptions);
  
  breaker.on('open', () => {
    logger.warn(`Circuit breaker opened for ${serviceName}`);
    services[serviceName as keyof typeof services].health = 0;
  });
  
  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open for ${serviceName}`);
    services[serviceName as keyof typeof services].health = 50;
  });
  
  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${serviceName}`);
    services[serviceName as keyof typeof services].health = 100;
  });
  
  breakers.set(serviceName, breaker);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true
}));

app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, the river needs time to flow'
});

app.use('/api', limiter);

// Health check endpoint - Ecosystem vitals
app.get('/health', async (req, res) => {
  const serviceHealths = await Promise.all(
    Object.entries(services).map(async ([name, service]) => {
      try {
        const response = await fetch(`${service.url}/health`);
        const health = response.ok ? 100 : 0;
        services[name as keyof typeof services].health = health;
        return { name, health, element: service.element, symbol: service.symbol };
      } catch (error) {
        services[name as keyof typeof services].health = 0;
        return { name, health: 0, element: service.element, symbol: service.symbol };
      }
    })
  );
  
  const overallHealth = serviceHealths.reduce((sum, s) => sum + s.health, 0) / serviceHealths.length;
  
  res.json({
    status: overallHealth > 80 ? 'thriving' : overallHealth > 50 ? 'growing' : 'struggling',
    overallHealth: Math.round(overallHealth),
    ecosystem: {
      season: getCurrentSeason(),
      timeOfDay: getTimeOfDay(),
      weather: overallHealth > 80 ? 'sunny' : overallHealth > 50 ? 'cloudy' : 'stormy'
    },
    services: serviceHealths,
    message: 'Gateway connecting all forest services 🌲'
  });
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  const serviceList = Object.entries(services).map(([name, config]) => ({
    name,
    ...config,
    status: config.health > 80 ? 'healthy' : config.health > 50 ? 'degraded' : 'unhealthy'
  }));
  
  res.json({
    services: serviceList,
    elements: {
      earth: serviceList.filter(s => s.element === 'earth'),
      water: serviceList.filter(s => s.element === 'water'),
      fire: serviceList.filter(s => s.element === 'fire'),
      air: serviceList.filter(s => s.element === 'air'),
      life: serviceList.filter(s => s.element === 'life'),
      other: serviceList.filter(s => !['earth', 'water', 'fire', 'air', 'life'].includes(s.element))
    }
  });
});

// Dynamic proxy routing with circuit breaker
Object.keys(services).forEach(serviceName => {
  const serviceConfig = services[serviceName as keyof typeof services];
  
  app.use(`/api/${serviceName}`, async (req, res, next) => {
    const breaker = breakers.get(serviceName);
    
    try {
      // Check circuit breaker
      await breaker.fire(req);
      
      // Log request
      logger.info(`Routing to ${serviceName}: ${req.method} ${req.path}`);
      
      // Cache key for GET requests
      if (req.method === 'GET') {
        const cacheKey = `gateway:${serviceName}:${req.path}:${JSON.stringify(req.query)}`;
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          logger.info(`Cache hit for ${cacheKey}`);
          return res.json(JSON.parse(cached));
        }
      }
      
      // Proxy to service
      const { createProxyMiddleware } = httpProxy;
      const proxy = createProxyMiddleware({
        target: serviceConfig.url,
        changeOrigin: true,
        pathRewrite: {
          [`^/api/${serviceName}`]: ''
        },
        onProxyRes: async (proxyRes, req, res) => {
          // Cache successful GET responses
          if (req.method === 'GET' && proxyRes.statusCode === 200) {
            let body = '';
            proxyRes.on('data', (chunk) => {
              body += chunk;
            });
            proxyRes.on('end', async () => {
              const cacheKey = `gateway:${serviceName}:${req.path}:${JSON.stringify(req.query)}`;
              await redis.setex(cacheKey, 60, body); // Cache for 1 minute
              logger.info(`Cached response for ${cacheKey}`);
            });
          }
        },
        onError: (err, req, res) => {
          logger.error(`Proxy error for ${serviceName}:`, err);
          (res as express.Response).status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            message: `The ${serviceConfig.element} element is disturbed 🌊`
          });
        }
      });
      
      proxy(req, res, next);
    } catch (error) {
      logger.error(`Circuit breaker error for ${serviceName}:`, error);
      res.status(503).json({
        error: 'Service circuit breaker open',
        service: serviceName,
        message: `The ${serviceConfig.element} element needs time to recover 🍃`,
        health: serviceConfig.health
      });
    }
  });
});

// Websocket proxy for real-time services
const server = app.listen(process.env.PORT || 3000, () => {
  logger.info(`🌲 Indigenous API Gateway running on port ${process.env.PORT || 3000}`);
  logger.info(`🔗 Connecting ${Object.keys(services).length} services to the forest network`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

// Helper functions
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export default app;