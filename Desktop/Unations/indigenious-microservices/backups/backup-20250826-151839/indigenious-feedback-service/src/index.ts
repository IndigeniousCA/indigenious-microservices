import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { FeedbackService } from './services/feedback.service';

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
      service: 'indigenious-feedback-service',
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

// Reviews
app.post('/api/reviews', async (req, res) => {
  try {
    const review = await FeedbackService.createReview(req.body);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create review' });
  }
});

app.get('/api/reviews/:id', async (req, res) => {
  try {
    const review = await FeedbackService.getReview(req.params.id);
    res.json(review);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Review not found' });
  }
});

app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const reviews = await FeedbackService.getProductReviews(req.params.productId, req.query);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get product reviews' });
  }
});

app.get('/api/reviews/vendor/:vendorId', async (req, res) => {
  try {
    const reviews = await FeedbackService.getVendorReviews(req.params.vendorId, req.query);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get vendor reviews' });
  }
});

app.get('/api/reviews/indigenous', async (req, res) => {
  try {
    const reviews = await FeedbackService.getIndigenousReviews(req.query);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous reviews' });
  }
});

app.get('/api/reviews/elder', async (req, res) => {
  try {
    const reviews = await FeedbackService.getElderReviews(req.query);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Elder reviews' });
  }
});

app.put('/api/reviews/:id/helpful', async (req, res) => {
  try {
    const review = await FeedbackService.markHelpful(req.params.id, req.body.helpful);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark review' });
  }
});

// Stories
app.post('/api/reviews/:reviewId/story', async (req, res) => {
  try {
    const story = await FeedbackService.createStory(req.params.reviewId, req.body);
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create story' });
  }
});

app.get('/api/stories', async (req, res) => {
  try {
    const stories = await FeedbackService.getStories(req.query);
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get stories' });
  }
});

app.put('/api/stories/:id/elder-approve', async (req, res) => {
  try {
    const story = await FeedbackService.elderApproveStory(req.params.id, req.body);
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve story' });
  }
});

// Community Impact
app.post('/api/reviews/:reviewId/impact', async (req, res) => {
  try {
    const impact = await FeedbackService.createCommunityImpact(req.params.reviewId, req.body);
    res.status(201).json(impact);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create impact assessment' });
  }
});

app.get('/api/impact/seven-generations', async (req, res) => {
  try {
    const scores = await FeedbackService.getSevenGenerationsScores(req.query);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get seven generations scores' });
  }
});

// Vendor Responses
app.post('/api/reviews/:reviewId/vendor-response', async (req, res) => {
  try {
    const response = await FeedbackService.createVendorResponse(req.params.reviewId, req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create vendor response' });
  }
});

// Talking Circles
app.post('/api/talking-circles', async (req, res) => {
  try {
    const circle = await FeedbackService.createTalkingCircle(req.body);
    res.status(201).json(circle);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create talking circle' });
  }
});

app.post('/api/talking-circles/:id/join', async (req, res) => {
  try {
    const participant = await FeedbackService.joinTalkingCircle(req.params.id, req.body);
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to join circle' });
  }
});

app.put('/api/talking-circles/:id/complete', async (req, res) => {
  try {
    const circle = await FeedbackService.completeTalkingCircle(req.params.id, req.body);
    res.json(circle);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete circle' });
  }
});

app.get('/api/talking-circles/upcoming', async (req, res) => {
  try {
    const circles = await FeedbackService.getUpcomingCircles(req.query);
    res.json(circles);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get upcoming circles' });
  }
});

// Surveys
app.post('/api/surveys', async (req, res) => {
  try {
    const survey = await FeedbackService.createSurvey(req.body);
    res.status(201).json(survey);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create survey' });
  }
});

app.get('/api/surveys/active', async (req, res) => {
  try {
    const surveys = await FeedbackService.getActiveSurveys(req.query);
    res.json(surveys);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get active surveys' });
  }
});

app.post('/api/surveys/:id/respond', async (req, res) => {
  try {
    const response = await FeedbackService.submitSurveyResponse(req.params.id, req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit survey response' });
  }
});

app.get('/api/surveys/:id/results', async (req, res) => {
  try {
    const results = await FeedbackService.getSurveyResults(req.params.id);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get survey results' });
  }
});

// Badges
app.get('/api/badges/user/:userId', async (req, res) => {
  try {
    const badges = await FeedbackService.getUserBadges(req.params.userId);
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user badges' });
  }
});

app.post('/api/badges/award', async (req, res) => {
  try {
    const badge = await FeedbackService.awardBadge(req.body.userId, req.body.badgeType);
    res.status(201).json(badge);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to award badge' });
  }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await FeedbackService.generateAnalytics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate analytics' });
  }
});

app.get('/api/analytics/cultural-impact', async (req, res) => {
  try {
    const impact = await FeedbackService.getCulturalImpactMetrics(req.query);
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get cultural impact metrics' });
  }
});

app.get('/api/analytics/community-voice', async (req, res) => {
  try {
    const voice = await FeedbackService.getCommunityVoiceMetrics(req.query);
    res.json(voice);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get community voice metrics' });
  }
});

// Medicine Wheel Metrics
app.get('/api/medicine-wheel/balance', async (req, res) => {
  try {
    const balance = await FeedbackService.getMedicineWheelBalance(req.query);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get medicine wheel balance' });
  }
});

// WebSocket events for real-time feedback
io.on('connection', (socket) => {
  console.log('Client connected to feedback service');

  socket.on('join:product', (productId: string) => {
    socket.join(`product:${productId}`);
  });

  socket.on('join:vendor', (vendorId: string) => {
    socket.join(`vendor:${vendorId}`);
  });

  socket.on('join:circle', (circleId: string) => {
    socket.join(`circle:${circleId}`);
  });

  socket.on('review:created', (data) => {
    io.to(`product:${data.productId}`).emit('review:new', data);
    io.to(`vendor:${data.vendorId}`).emit('review:new', data);
  });

  socket.on('circle:update', (data) => {
    io.to(`circle:${data.circleId}`).emit('circle:updated', data);
  });

  socket.on('story:shared', (data) => {
    io.emit('story:new', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from feedback service');
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

const PORT = process.env.PORT || 3037;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Feedback Service running on port ${PORT}`);
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