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
import { TrendAnalysisService } from './services/trend-analysis.service';
import { CompetitiveIntelligenceService } from './services/competitive-intelligence.service';

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      status: 'healthy',
      service: 'market-intelligence-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Trend Analysis routes
app.post('/api/trends/analyze', async (req, res) => {
  try {
    const { category, timeframe, region, indigenousOnly } = req.body;
    const analysis = await TrendAnalysisService.analyzeCategoryTrends(category, {
      timeframe,
      region,
      indigenousOnly
    });
    res.json(analysis);
  } catch (error: any) {
    logger.error('Error analyzing trends:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trends/seasonal/:category', async (req, res) => {
  try {
    const patterns = await TrendAnalysisService.analyzeSeasonalPatterns(req.params.category);
    res.json(patterns);
  } catch (error: any) {
    logger.error('Error analyzing seasonal patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/opportunities/emerging', async (req, res) => {
  try {
    const opportunities = await TrendAnalysisService.detectEmergingOpportunities();
    res.json(opportunities);
  } catch (error: any) {
    logger.error('Error detecting opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/predictions/success', async (req, res) => {
  try {
    const prediction = await TrendAnalysisService.predictSuccessProbability(req.body);
    res.json(prediction);
  } catch (error: any) {
    logger.error('Error predicting success:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/generate', async (req, res) => {
  try {
    const report = await TrendAnalysisService.generateMarketReport(req.body);
    res.json(report);
  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/opportunities/match', async (req, res) => {
  try {
    const matches = await TrendAnalysisService.matchOpportunities(req.body);
    res.json(matches);
  } catch (error: any) {
    logger.error('Error matching opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Competitive Intelligence routes
app.get('/api/competitors/:businessId', async (req, res) => {
  try {
    const { businessName } = req.query;
    const intelligence = await CompetitiveIntelligenceService.analyzeCompetitor(
      req.params.businessId,
      businessName as string || 'Unknown'
    );
    res.json(intelligence);
  } catch (error: any) {
    logger.error('Error analyzing competitor:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/competitors/benchmark', async (req, res) => {
  try {
    const { businessId, category } = req.body;
    const benchmark = await CompetitiveIntelligenceService.benchmarkPerformance(
      businessId,
      category
    );
    res.json(benchmark);
  } catch (error: any) {
    logger.error('Error benchmarking:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/competitors/monitor', async (req, res) => {
  try {
    const { competitorIds } = req.body;
    const activities = await CompetitiveIntelligenceService.monitorCompetitorActivity(
      competitorIds
    );
    res.json(activities);
  } catch (error: any) {
    logger.error('Error monitoring competitors:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/competitors/:businessId/patterns', async (req, res) => {
  try {
    const patterns = await CompetitiveIntelligenceService.analyzeBiddingPatterns(
      req.params.businessId
    );
    res.json(patterns);
  } catch (error: any) {
    logger.error('Error analyzing patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/competitors/predict-bidding', async (req, res) => {
  try {
    const { rfqId, competitorId } = req.body;
    const prediction = await CompetitiveIntelligenceService.predictCompetitorBidding(
      rfqId,
      competitorId
    );
    res.json(prediction);
  } catch (error: any) {
    logger.error('Error predicting bidding:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/network/:businessId', async (req, res) => {
  try {
    const network = await CompetitiveIntelligenceService.analyzeBusinessNetwork(
      req.params.businessId
    );
    res.json(network);
  } catch (error: any) {
    logger.error('Error analyzing network:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market/positioning/:category', async (req, res) => {
  try {
    const positioning = await CompetitiveIntelligenceService.analyzeMarketPositioning(
      req.params.category
    );
    res.json(positioning);
  } catch (error: any) {
    logger.error('Error analyzing positioning:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('subscribe:trends', (categories: string[]) => {
    categories.forEach(cat => {
      socket.join(`trend:${cat}`);
    });
    logger.info(`Socket ${socket.id} subscribed to trend updates`);
  });

  socket.on('subscribe:competitor', (competitorId: string) => {
    socket.join(`competitor:${competitorId}`);
    logger.info(`Socket ${socket.id} subscribed to competitor ${competitorId}`);
  });

  socket.on('subscribe:opportunities', (businessId: string) => {
    socket.join(`opportunities:${businessId}`);
    logger.info(`Socket ${socket.id} subscribed to opportunities for ${businessId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily trend analysis
cron.schedule('0 2 * * *', async () => {
  logger.info('Running daily trend analysis');
  try {
    const categories = ['IT Services', 'Construction', 'Consulting', 'Supplies'];
    for (const category of categories) {
      await TrendAnalysisService.analyzeCategoryTrends(category);
    }
  } catch (error) {
    logger.error('Error in daily trend analysis:', error);
  }
});

// Weekly opportunity detection
cron.schedule('0 9 * * MON', async () => {
  logger.info('Running weekly opportunity detection');
  try {
    const opportunities = await TrendAnalysisService.detectEmergingOpportunities();
    
    // Notify subscribers
    io.emit('opportunities:new', opportunities);
  } catch (error) {
    logger.error('Error in opportunity detection:', error);
  }
});

// Monthly market report
cron.schedule('0 0 1 * *', async () => {
  logger.info('Generating monthly market report');
  try {
    await TrendAnalysisService.generateMarketReport({
      type: 'monthly'
    });
  } catch (error) {
    logger.error('Error generating monthly report:', error);
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3015;
httpServer.listen(PORT, () => {
  logger.info(`📊 Market Intelligence Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Scheduled tasks initialized:');
  logger.info('  - Daily trend analysis at 2:00 AM');
  logger.info('  - Weekly opportunity detection on Mondays at 9:00 AM');
  logger.info('  - Monthly reports on 1st of each month');
});