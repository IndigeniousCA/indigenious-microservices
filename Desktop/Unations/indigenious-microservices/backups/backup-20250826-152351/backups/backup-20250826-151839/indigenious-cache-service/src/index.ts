import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import Redis from 'ioredis';
import { CacheService } from './services/cache.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const cacheService = new CacheService();

// Redis client for pub/sub
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const stats = await cacheService.getStatistics();
    res.json({
      status: 'healthy',
      service: 'indigenious-cache-service',
      timestamp: new Date().toISOString(),
      statistics: stats
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Get cached value
app.get('/api/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const namespace = req.query.namespace as string || 'default';
    
    const value = await cacheService.get(key, { namespace });
    
    if (value === null) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.json({ key, value, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get cache' 
    });
  }
});

// Set cached value
app.post('/api/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl, namespace = 'default', ...options } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const result = await cacheService.set(key, value, {
      ttl,
      namespace,
      ...options
    });
    
    res.json({ success: result, key, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to set cache' 
    });
  }
});

// Delete cached value
app.delete('/api/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const namespace = req.query.namespace as string || 'default';
    
    const result = await cacheService.delete(key, namespace);
    
    res.json({ success: result, key, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete cache' 
    });
  }
});

// Batch get
app.post('/api/cache/mget', async (req, res) => {
  try {
    const { keys, namespace = 'default' } = req.body;
    
    if (!Array.isArray(keys)) {
      return res.status(400).json({ error: 'Keys must be an array' });
    }
    
    const results = await cacheService.mget(keys, namespace);
    
    res.json({ 
      results: Object.fromEntries(results),
      namespace 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get multiple keys' 
    });
  }
});

// Batch set
app.post('/api/cache/mset', async (req, res) => {
  try {
    const { entries, ttl, namespace = 'default', ...options } = req.body;
    
    if (!entries || typeof entries !== 'object') {
      return res.status(400).json({ error: 'Entries object is required' });
    }
    
    const entriesMap = new Map(Object.entries(entries));
    const result = await cacheService.mset(entriesMap, {
      ttl,
      namespace,
      ...options
    });
    
    res.json({ success: result, count: entriesMap.size, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to set multiple keys' 
    });
  }
});

// Delete pattern
app.delete('/api/cache/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const namespace = req.query.namespace as string || 'default';
    
    const count = await cacheService.deletePattern(pattern, namespace);
    
    res.json({ success: true, deletedCount: count, pattern, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete pattern' 
    });
  }
});

// Get TTL
app.get('/api/cache/:key/ttl', async (req, res) => {
  try {
    const { key } = req.params;
    const namespace = req.query.namespace as string || 'default';
    
    const ttl = await cacheService.ttl(key, namespace);
    
    res.json({ key, ttl, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get TTL' 
    });
  }
});

// Set expiry
app.put('/api/cache/:key/expire', async (req, res) => {
  try {
    const { key } = req.params;
    const { seconds } = req.body;
    const namespace = req.query.namespace as string || 'default';
    
    if (!seconds || seconds <= 0) {
      return res.status(400).json({ error: 'Valid seconds value required' });
    }
    
    const result = await cacheService.expire(key, seconds, namespace);
    
    res.json({ success: result, key, seconds, namespace });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to set expiry' 
    });
  }
});

// Indigenous data cache
app.post('/api/cache/indigenous/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { 
      value, 
      nation, 
      territory, 
      communityId,
      elderApproved = false,
      culturalSensitive = false,
      ceremonyData = false,
      ttl,
      ...options 
    } = req.body;
    
    if (!nation || !territory) {
      return res.status(400).json({ 
        error: 'Nation and territory are required for Indigenous data' 
      });
    }
    
    const result = await cacheService.set(key, value, {
      namespace: 'indigenous',
      indigenousData: true,
      nation,
      territory,
      communityId,
      elderApproved,
      culturalSensitive,
      ceremonyData,
      ttl,
      ...options
    });
    
    res.json({ 
      success: result, 
      key, 
      nation, 
      territory,
      dataLocation: 'CANADA' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to cache Indigenous data' 
    });
  }
});

// Cache warming
app.post('/api/cache/warm/:warmupId', async (req, res) => {
  try {
    const { warmupId } = req.params;
    
    // Run warmup asynchronously
    cacheService.warmCache(warmupId).catch(console.error);
    
    res.json({ 
      success: true, 
      message: 'Cache warming started',
      warmupId 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start cache warming' 
    });
  }
});

// Create warmup configuration
app.post('/api/warmup', async (req, res) => {
  try {
    const warmup = await prisma.cacheWarmup.create({
      data: req.body
    });
    
    res.status(201).json(warmup);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create warmup configuration' 
    });
  }
});

// Get warmup configurations
app.get('/api/warmup', async (req, res) => {
  try {
    const warmups = await prisma.cacheWarmup.findMany({
      where: { active: true }
    });
    
    res.json(warmups);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get warmup configurations' 
    });
  }
});

// Cache policies
app.post('/api/policies', async (req, res) => {
  try {
    const policy = await prisma.cachePolicy.create({
      data: req.body
    });
    
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create cache policy' 
    });
  }
});

app.get('/api/policies', async (req, res) => {
  try {
    const policies = await prisma.cachePolicy.findMany({
      where: { active: true }
    });
    
    res.json(policies);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get cache policies' 
    });
  }
});

// Data sovereignty rules
app.post('/api/sovereignty', async (req, res) => {
  try {
    const rule = await prisma.dataSovereigntyRule.create({
      data: req.body
    });
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create sovereignty rule' 
    });
  }
});

app.get('/api/sovereignty', async (req, res) => {
  try {
    const rules = await prisma.dataSovereigntyRule.findMany({
      where: { active: true }
    });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get sovereignty rules' 
    });
  }
});

// Cache statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const namespace = req.query.namespace as string;
    const stats = await cacheService.getStatistics(namespace);
    
    const dbStats = await prisma.cacheStatistics.findFirst({
      where: {
        periodEnd: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      live: stats,
      historical: dbStats
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get statistics' 
    });
  }
});

// Cleanup expired entries
app.post('/api/cleanup', async (req, res) => {
  try {
    const count = await cacheService.cleanup();
    
    res.json({ 
      success: true, 
      cleanedCount: count 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to cleanup' 
    });
  }
});

// Cluster status
app.get('/api/cluster/status', async (req, res) => {
  try {
    const clusters = await prisma.cacheCluster.findMany({
      where: { active: true },
      include: {
        nodes: {
          where: { status: 'HEALTHY' }
        }
      }
    });
    
    res.json(clusters);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get cluster status' 
    });
  }
});

// Circuit breaker status
app.get('/api/circuit-breaker', async (req, res) => {
  try {
    const breakers = await prisma.circuitBreaker.findMany();
    
    res.json(breakers);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get circuit breaker status' 
    });
  }
});

// Pub/Sub for cache invalidation
subClient.subscribe('cache:invalidate');
subClient.on('message', async (channel, message) => {
  if (channel === 'cache:invalidate') {
    const { key, namespace } = JSON.parse(message);
    await cacheService.delete(key, namespace);
  }
});

// Publish cache invalidation
app.post('/api/invalidate', async (req, res) => {
  try {
    const { key, namespace = 'default' } = req.body;
    
    await pubClient.publish('cache:invalidate', JSON.stringify({
      key,
      namespace
    }));
    
    res.json({ 
      success: true, 
      message: 'Invalidation published' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to publish invalidation' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3040;

app.listen(PORT, () => {
  console.log(`Indigenous Cache Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-tier caching (Memory, Node-Cache, Redis)');
  console.log('- Indigenous data sovereignty');
  console.log('- Compression (Snappy)');
  console.log('- Circuit breaker pattern');
  console.log('- Cache warming');
  console.log('- Cluster support');
  console.log('- Data location: CANADA');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await pubClient.quit();
  await subClient.quit();
  await prisma.$disconnect();
  
  process.exit(0);
});