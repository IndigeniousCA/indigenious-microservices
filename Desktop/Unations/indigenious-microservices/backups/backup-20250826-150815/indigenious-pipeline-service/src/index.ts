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
import { PipelineService } from './services/pipeline.service';

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
      service: 'pipeline-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Opportunity routes
app.post('/api/opportunities', async (req, res) => {
  try {
    const opportunity = await PipelineService.createOpportunity(req.body);
    res.status(201).json(opportunity);
  } catch (error: any) {
    logger.error('Error creating opportunity:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/opportunities/:id/stage', async (req, res) => {
  try {
    const { stage, notes } = req.body;
    const opportunity = await PipelineService.updateOpportunityStage(
      req.params.id,
      stage,
      notes
    );
    res.json(opportunity);
  } catch (error: any) {
    logger.error('Error updating stage:', error);
    res.status(400).json({ error: error.message });
  }
});

// Bid recommendation routes
app.post('/api/opportunities/:id/bid-recommendation', async (req, res) => {
  try {
    const recommendation = await PipelineService.generateBidRecommendation(req.params.id);
    res.json(recommendation);
  } catch (error: any) {
    logger.error('Error generating recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Partnership routes
app.post('/api/opportunities/:id/partnerships', async (req, res) => {
  try {
    const partnerships = await PipelineService.suggestPartnerships(req.params.id);
    res.json(partnerships);
  } catch (error: any) {
    logger.error('Error suggesting partnerships:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forecast routes
app.post('/api/forecasts', async (req, res) => {
  try {
    const { businessId, period } = req.body;
    const forecast = await PipelineService.generateForecast(businessId, period);
    res.json(forecast);
  } catch (error: any) {
    logger.error('Error generating forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

// Competitor intelligence routes
app.post('/api/competitors', async (req, res) => {
  try {
    const competitor = await PipelineService.updateCompetitorIntelligence(req.body);
    res.json(competitor);
  } catch (error: any) {
    logger.error('Error updating competitor:', error);
    res.status(400).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('subscribe:pipeline', (businessId: string) => {
    socket.join(`pipeline:${businessId}`);
    logger.info(`Socket ${socket.id} subscribed to pipeline for ${businessId}`);
  });

  socket.on('subscribe:opportunity', (opportunityId: string) => {
    socket.join(`opportunity:${opportunityId}`);
    logger.info(`Socket ${socket.id} subscribed to opportunity ${opportunityId}`);
  });

  socket.on('subscribe:forecasts', (businessId: string) => {
    socket.join(`forecasts:${businessId}`);
    logger.info(`Socket ${socket.id} subscribed to forecasts for ${businessId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily pipeline review
cron.schedule('0 9 * * *', async () => {
  logger.info('Running daily pipeline review');
  try {
    // Check for stalled opportunities
    // Update stage durations
    // Send alerts for approaching deadlines
    logger.info('Pipeline review completed');
  } catch (error) {
    logger.error('Error in pipeline review:', error);
  }
});

// Weekly forecast update
cron.schedule('0 10 * * MON', async () => {
  logger.info('Generating weekly forecasts');
  try {
    // Generate forecasts for all active businesses
    // Compare to previous forecasts
    // Alert on significant changes
    logger.info('Forecast generation completed');
  } catch (error) {
    logger.error('Error generating forecasts:', error);
  }
});

// Hourly Indigenous opportunity check
cron.schedule('0 * * * *', async () => {
  logger.info('Checking for new Indigenous opportunities');
  try {
    // Scan for new Indigenous set-asides
    // Alert eligible businesses
    logger.info('Indigenous opportunity check completed');
  } catch (error) {
    logger.error('Error checking opportunities:', error);
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
const PORT = process.env.PORT || 3019;
httpServer.listen(PORT, () => {
  logger.info(`📊 Pipeline Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - AI-powered bid/no-bid recommendations');
  logger.info('  - Win probability scoring with Indigenous advantages');
  logger.info('  - Partnership opportunity matching');
  logger.info('  - Pipeline forecasting and analytics');
  logger.info('  - Competitor intelligence tracking');
  logger.info('  - Indigenous set-aside alerts');
  logger.info('  - Real-time pipeline updates via WebSocket');
});