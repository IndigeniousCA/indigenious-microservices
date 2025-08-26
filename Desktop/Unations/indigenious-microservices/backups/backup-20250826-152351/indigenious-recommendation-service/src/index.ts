import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { RecommendationService } from './services/recommendation.service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redis.status === 'ready';
    res.json({
      status: 'healthy',
      service: 'indigenious-recommendation-service',
      timestamp: new Date().toISOString(),
      redis: redisStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Generate Recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.generateRecommendations(
      req.params.userId,
      req.query
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate recommendations' });
  }
});

app.post('/api/recommendations/generate', async (req, res) => {
  try {
    const recommendations = await RecommendationService.generateRecommendations(
      req.body.userId,
      req.body.context
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate recommendations' });
  }
});

// Elder Recommendations
app.get('/api/recommendations/elder/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.getElderRecommendations(
      req.params.userId
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Elder recommendations' });
  }
});

app.post('/api/recommendations/elder', async (req, res) => {
  try {
    const recommendation = await RecommendationService.createElderRecommendation(
      req.body.userId,
      req.body.rule,
      req.body.profile
    );
    res.status(201).json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create Elder recommendation' });
  }
});

// Medicine Wheel Recommendations
app.get('/api/recommendations/medicine-wheel/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.getMedicineWheelRecommendations(
      req.params.userId
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Medicine Wheel recommendations' });
  }
});

// Seasonal Recommendations
app.get('/api/recommendations/seasonal/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.getSeasonalRecommendations(
      req.params.userId
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get seasonal recommendations' });
  }
});

// Ceremony Recommendations
app.get('/api/recommendations/ceremony/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.getCeremonyRecommendations(
      req.params.userId
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get ceremony recommendations' });
  }
});

// Community Recommendations
app.get('/api/recommendations/community/:userId', async (req, res) => {
  try {
    const recommendations = await RecommendationService.getCommunityRecommendations(
      req.params.userId
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get community recommendations' });
  }
});

// Track Interactions
app.post('/api/recommendations/:id/interact', async (req, res) => {
  try {
    await RecommendationService.trackInteraction(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to track interaction' });
  }
});

// Feedback
app.post('/api/recommendations/:id/feedback', async (req, res) => {
  try {
    await RecommendationService.provideFeedback(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to provide feedback' });
  }
});

// User Profile
app.post('/api/profiles', async (req, res) => {
  try {
    const profile = await RecommendationService.createUserProfile(req.body);
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create user profile' });
  }
});

app.put('/api/profiles/:userId', async (req, res) => {
  try {
    const profile = await RecommendationService.updateUserProfile(
      req.params.userId,
      req.body
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update user profile' });
  }
});

app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const profile = await RecommendationService.getUserProfile(req.params.userId);
    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Profile not found' });
  }
});

// Wisdom Rules
app.post('/api/wisdom-rules', async (req, res) => {
  try {
    const rule = await RecommendationService.createWisdomRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create wisdom rule' });
  }
});

app.get('/api/wisdom-rules', async (req, res) => {
  try {
    const rules = await RecommendationService.getWisdomRules(req.query);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get wisdom rules' });
  }
});

app.put('/api/wisdom-rules/:id/validate', async (req, res) => {
  try {
    const rule = await RecommendationService.validateWisdomRule(req.params.id, req.body);
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to validate wisdom rule' });
  }
});

// Ceremony Calendar
app.get('/api/ceremonies/upcoming', async (req, res) => {
  try {
    const ceremonies = await RecommendationService.getUpcomingCeremonies(req.query);
    res.json(ceremonies);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get upcoming ceremonies' });
  }
});

app.post('/api/ceremonies', async (req, res) => {
  try {
    const ceremony = await RecommendationService.addCeremony(req.body);
    res.status(201).json(ceremony);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add ceremony' });
  }
});

// Model Management
app.get('/api/models', async (req, res) => {
  try {
    const models = await RecommendationService.getModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get models' });
  }
});

app.post('/api/models/train', async (req, res) => {
  try {
    const result = await RecommendationService.trainModel(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to train model' });
  }
});

app.put('/api/models/:id/deploy', async (req, res) => {
  try {
    const model = await RecommendationService.deployModel(req.params.id);
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to deploy model' });
  }
});

// Analytics
app.get('/api/analytics/performance', async (req, res) => {
  try {
    const metrics = await RecommendationService.getPerformanceMetrics(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get performance metrics' });
  }
});

app.get('/api/analytics/cultural-alignment', async (req, res) => {
  try {
    const alignment = await RecommendationService.getCulturalAlignmentMetrics(req.query);
    res.json(alignment);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get cultural alignment metrics' });
  }
});

app.get('/api/analytics/seven-generations', async (req, res) => {
  try {
    const impact = await RecommendationService.getSevenGenerationsImpact(req.query);
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get seven generations impact' });
  }
});

// WebSocket events for real-time recommendations
io.on('connection', (socket) => {
  console.log('Client connected to recommendation service');

  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('recommendation:viewed', async (data) => {
    await RecommendationService.trackInteraction(data.recommendationId, {
      type: 'VIEW',
      ...data
    });
    io.to(`user:${data.userId}`).emit('recommendation:tracked', data);
  });

  socket.on('recommendation:clicked', async (data) => {
    await RecommendationService.trackInteraction(data.recommendationId, {
      type: 'CLICK',
      ...data
    });
    io.to(`user:${data.userId}`).emit('recommendation:tracked', data);
  });

  socket.on('recommendation:refresh', async (userId: string) => {
    const recommendations = await RecommendationService.generateRecommendations(userId);
    socket.emit('recommendations:updated', recommendations);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from recommendation service');
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3038;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Recommendation Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});