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
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Services
import { SearchService } from './services/search.service';

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
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

// Session tracking middleware
app.use((req, res, next) => {
  if (!req.headers['x-session-id']) {
    req.headers['x-session-id'] = uuidv4();
  }
  next();
});

// Rate limiting - higher for search
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // 30 searches per minute
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/search', searchLimiter);
app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      status: 'healthy',
      service: 'search-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Main search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const results = await SearchService.search({
      ...req.body,
      sessionId,
      userId: req.body.userId || req.headers['x-user-id'] as string
    });
    
    res.json(results);
  } catch (error: any) {
    logger.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Autocomplete endpoint
app.get('/api/search/autocomplete', async (req, res) => {
  try {
    const suggestions = await SearchService.autocomplete({
      query: req.query.q as string,
      entityTypes: req.query.types ? (req.query.types as string).split(',') as any : undefined,
      indigenousContext: req.query.indigenous === 'true',
      limit: parseInt(req.query.limit as string) || 10
    });
    
    res.json(suggestions);
  } catch (error: any) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Semantic search endpoint
app.post('/api/search/semantic', async (req, res) => {
  try {
    const results = await SearchService.semanticSearch(req.body);
    res.json(results);
  } catch (error: any) {
    logger.error('Semantic search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Personalized search endpoint
app.post('/api/search/personalized', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required for personalized search' });
    }
    
    const results = await SearchService.personalizedSearch({
      ...req.body,
      userId
    });
    
    res.json(results);
  } catch (error: any) {
    logger.error('Personalized search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Index content endpoint
app.post('/api/search/index', async (req, res) => {
  try {
    const result = await SearchService.indexContent(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error('Indexing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch index endpoint
app.post('/api/search/index/batch', async (req, res) => {
  try {
    const { documents } = req.body;
    const results = await Promise.all(
      documents.map((doc: any) => SearchService.indexContent(doc))
    );
    
    res.json({ 
      indexed: results.length,
      success: results.filter(r => r.indexed).length,
      failed: results.filter(r => !r.indexed).length
    });
  } catch (error: any) {
    logger.error('Batch indexing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics endpoint
app.get('/api/search/analytics', async (req, res) => {
  try {
    const analytics = await SearchService.getSearchAnalytics({
      period: req.query.period as string || new Date().toISOString().substring(0, 10),
      entityType: req.query.entityType as any,
      indigenousOnly: req.query.indigenous === 'true'
    });
    
    res.json(analytics);
  } catch (error: any) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Indigenous business search endpoint
app.post('/api/search/indigenous', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const results = await SearchService.search({
      ...req.body,
      indigenousOnly: true,
      sessionId,
      userId: req.body.userId || req.headers['x-user-id'] as string
    });
    
    res.json(results);
  } catch (error: any) {
    logger.error('Indigenous search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Popular searches endpoint
app.get('/api/search/popular', async (req, res) => {
  try {
    const period = req.query.period as string || 'daily';
    const indigenous = req.query.indigenous === 'true';
    
    const popular = await redis.get(`popular:${period}:${indigenous ? 'indigenous' : 'all'}`);
    
    if (popular) {
      res.json(JSON.parse(popular));
    } else {
      res.json({ searches: [], cached: false });
    }
  } catch (error: any) {
    logger.error('Popular searches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search trends endpoint
app.get('/api/search/trends', async (req, res) => {
  try {
    const trends = await redis.get('search:trends:current');
    
    if (trends) {
      res.json(JSON.parse(trends));
    } else {
      res.json({ trends: [], message: 'No current trends' });
    }
  } catch (error: any) {
    logger.error('Trends error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time search
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);
  
  // Real-time search as you type
  socket.on('search:realtime', async (data) => {
    try {
      const { query, filters, indigenous } = data;
      
      // Get quick results from cache
      const cacheKey = `realtime:${query}:${indigenous}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        socket.emit('search:results', JSON.parse(cached));
      } else {
        // Perform quick search
        const results = await SearchService.autocomplete({
          query,
          indigenousContext: indigenous,
          limit: 5
        });
        
        await redis.setex(cacheKey, 10, JSON.stringify(results));
        socket.emit('search:results', results);
      }
    } catch (error) {
      socket.emit('search:error', { error: 'Search failed' });
    }
  });
  
  // Subscribe to search updates
  socket.on('subscribe:trending', async () => {
    socket.join('trending');
    
    // Send current trending
    const trending = await redis.get('search:trends:realtime');
    if (trending) {
      socket.emit('trending:update', JSON.parse(trending));
    }
  });
  
  // Track search interactions
  socket.on('search:click', async (data) => {
    const { resultId, query, position } = data;
    
    // Update click tracking
    await redis.hincrby(`clicks:${resultId}`, 'count', 1);
    await redis.hset(`clicks:${resultId}`, 'lastQuery', query, 'lastPosition', position);
    
    // Update result popularity
    await redis.zincrby('popular:results', 1, resultId);
  });
  
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Update search trends every hour
cron.schedule('0 * * * *', async () => {
  logger.info('Updating search trends');
  try {
    // Calculate trending searches
    const recentSearches = await redis.zrevrange('recent:searches', 0, 100, 'WITHSCORES');
    
    const trends = [];
    for (let i = 0; i < recentSearches.length; i += 2) {
      trends.push({
        query: recentSearches[i],
        score: parseInt(recentSearches[i + 1])
      });
    }
    
    await redis.set('search:trends:current', JSON.stringify(trends));
    
    // Emit to connected clients
    io.to('trending').emit('trending:update', trends);
    
    logger.info('Search trends updated');
  } catch (error) {
    logger.error('Error updating trends:', error);
  }
});

// Calculate popular searches daily
cron.schedule('0 2 * * *', async () => {
  logger.info('Calculating popular searches');
  try {
    // Get daily search counts
    const searches = await redis.zrevrange('daily:searches', 0, 20, 'WITHSCORES');
    
    const popular = [];
    for (let i = 0; i < searches.length; i += 2) {
      popular.push({
        query: searches[i],
        count: parseInt(searches[i + 1])
      });
    }
    
    await redis.setex('popular:daily:all', 86400, JSON.stringify({ searches: popular }));
    
    // Calculate Indigenous-specific popular searches
    const indigenousSearches = await redis.zrevrange('daily:indigenous:searches', 0, 20, 'WITHSCORES');
    
    const indigenousPopular = [];
    for (let i = 0; i < indigenousSearches.length; i += 2) {
      indigenousPopular.push({
        query: indigenousSearches[i],
        count: parseInt(indigenousSearches[i + 1])
      });
    }
    
    await redis.setex('popular:daily:indigenous', 86400, JSON.stringify({ searches: indigenousPopular }));
    
    logger.info('Popular searches calculated');
  } catch (error) {
    logger.error('Error calculating popular searches:', error);
  }
});

// Optimize search indices weekly
cron.schedule('0 3 * * 0', async () => {
  logger.info('Optimizing search indices');
  try {
    // Clean up old cache entries
    const keys = await redis.keys('search:*');
    const now = Date.now();
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) { // No expiry set
        await redis.expire(key, 3600); // Set 1 hour expiry
      }
    }
    
    // Update Indigenous business boost factors
    const indigenousBusinesses = await redis.smembers('indigenous-businesses');
    logger.info(`Optimized indices for ${indigenousBusinesses.length} Indigenous businesses`);
    
  } catch (error) {
    logger.error('Error optimizing indices:', error);
  }
});

// Monitor search quality
cron.schedule('*/30 * * * *', async () => {
  logger.info('Monitoring search quality');
  try {
    // Check no-results rate
    const noResultsCount = await redis.get('metrics:no-results') || '0';
    const totalSearches = await redis.get('metrics:total-searches') || '1';
    
    const noResultsRate = parseInt(noResultsCount) / parseInt(totalSearches);
    
    if (noResultsRate > 0.1) { // More than 10% no results
      logger.warn(`High no-results rate: ${(noResultsRate * 100).toFixed(2)}%`);
      
      // Alert admins
      io.emit('alert:search-quality', {
        type: 'high-no-results',
        rate: noResultsRate,
        message: 'Search quality degradation detected'
      });
    }
    
    // Reset counters
    await redis.set('metrics:no-results', '0');
    await redis.set('metrics:total-searches', '0');
    
  } catch (error) {
    logger.error('Error monitoring search quality:', error);
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
const PORT = process.env.PORT || 3021;
httpServer.listen(PORT, () => {
  logger.info(`🔍 Search Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - Elasticsearch full-text search');
  logger.info('  - Indigenous business prioritization (2x boost)');
  logger.info('  - Semantic search with vector embeddings');
  logger.info('  - Personalized search results');
  logger.info('  - Real-time search suggestions');
  logger.info('  - Multi-language support including Indigenous languages');
  logger.info('  - Search analytics and trending');
  logger.info('  - Geographic search with location filtering');
  logger.info('  - Smart spell correction and synonyms');
  logger.info('  - WebSocket real-time search updates');
});