import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { ReturnsService } from './services/returns.service';

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
      service: 'indigenious-returns-service',
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

// Initiate Return
app.post('/api/returns', async (req, res) => {
  try {
    const returnRecord = await ReturnsService.initiateReturn(req.body);
    res.status(201).json(returnRecord);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initiate return' });
  }
});

// Track Return
app.get('/api/returns/track/:rmaNumber', async (req, res) => {
  try {
    const tracking = await ReturnsService.trackReturn(req.params.rmaNumber);
    res.json(tracking);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Return not found' });
  }
});

// Elder Approval
app.post('/api/returns/:id/elder-approval', async (req, res) => {
  try {
    const result = await ReturnsService.processElderApproval(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process Elder approval' });
  }
});

// Generate Return Label
app.post('/api/returns/:id/label', async (req, res) => {
  try {
    const label = await ReturnsService.generateReturnLabel(req.params.id);
    res.json(label);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate return label' });
  }
});

// Process Received Return
app.put('/api/returns/:rmaNumber/receive', async (req, res) => {
  try {
    const result = await ReturnsService.processReceivedReturn(req.params.rmaNumber, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process received return' });
  }
});

// Perform Inspection
app.post('/api/returns/:id/inspect', async (req, res) => {
  try {
    const result = await ReturnsService.performInspection(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to perform inspection' });
  }
});

// Process Refund
app.post('/api/returns/:id/refund', async (req, res) => {
  try {
    const result = await ReturnsService.processRefund(req.params.id, req.body.refundAmount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process refund' });
  }
});

// Return Centers
app.post('/api/return-centers', async (req, res) => {
  try {
    const center = await ReturnsService.createReturnCenter(req.body);
    res.status(201).json(center);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create return center' });
  }
});

app.get('/api/return-centers/indigenous', async (req, res) => {
  try {
    const centers = await ReturnsService.getIndigenousReturnCenters();
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous return centers' });
  }
});

app.get('/api/return-centers/:region', async (req, res) => {
  try {
    const centers = await ReturnsService.getReturnCentersByRegion(req.params.region);
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get return centers' });
  }
});

// Return Policies
app.post('/api/return-policies', async (req, res) => {
  try {
    const policy = await ReturnsService.createReturnPolicy(req.body);
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create return policy' });
  }
});

app.get('/api/return-policies/active', async (req, res) => {
  try {
    const policies = await ReturnsService.getActivePolicies(req.query);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get return policies' });
  }
});

app.get('/api/return-policies/check-eligibility', async (req, res) => {
  try {
    const eligibility = await ReturnsService.checkReturnEligibility(req.query);
    res.json(eligibility);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check eligibility' });
  }
});

// Recycling
app.post('/api/returns/items/:id/recycle', async (req, res) => {
  try {
    const result = await ReturnsService.processRecycling(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process recycling' });
  }
});

app.get('/api/recycling/records', async (req, res) => {
  try {
    const records = await ReturnsService.getRecyclingRecords(req.query);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get recycling records' });
  }
});

// Analytics
app.get('/api/returns/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await ReturnsService.generateReturnAnalytics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate analytics' });
  }
});

app.get('/api/returns/analytics/indigenous', async (req, res) => {
  try {
    const analytics = await ReturnsService.getIndigenousReturnMetrics(req.query);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous return metrics' });
  }
});

app.get('/api/returns/analytics/environmental', async (req, res) => {
  try {
    const metrics = await ReturnsService.getEnvironmentalMetrics(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get environmental metrics' });
  }
});

// Ceremony Returns
app.post('/api/returns/ceremony', async (req, res) => {
  try {
    const returnRecord = await ReturnsService.processCeremonyReturn(req.body);
    res.json(returnRecord);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process ceremony return' });
  }
});

app.get('/api/returns/ceremony/moon-phase', async (req, res) => {
  try {
    const phase = await ReturnsService.getMoonPhaseForReturn(req.query.date);
    res.json({ moonPhase: phase });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get moon phase' });
  }
});

// Remote Returns
app.post('/api/returns/remote/schedule', async (req, res) => {
  try {
    const schedule = await ReturnsService.scheduleRemoteReturn(req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule remote return' });
  }
});

app.get('/api/returns/remote/winter-road-status', async (req, res) => {
  try {
    const status = await ReturnsService.getWinterRoadReturnStatus(req.query);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get winter road status' });
  }
});

// Notifications
app.get('/api/returns/:id/notifications', async (req, res) => {
  try {
    const notifications = await ReturnsService.getReturnNotifications(req.params.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get notifications' });
  }
});

app.post('/api/returns/:id/notify', async (req, res) => {
  try {
    const result = await ReturnsService.sendReturnNotification(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send notification' });
  }
});

// WebSocket events for real-time tracking
io.on('connection', (socket) => {
  console.log('Client connected to returns service');

  socket.on('track:return', (rmaNumber: string) => {
    socket.join(`return:${rmaNumber}`);
  });

  socket.on('subscribe:center', (centerId: string) => {
    socket.join(`center:${centerId}`);
  });

  socket.on('return:status', async (data) => {
    io.to(`return:${data.rmaNumber}`).emit('status:updated', data);
  });

  socket.on('inspection:complete', async (data) => {
    io.to(`return:${data.rmaNumber}`).emit('inspection:result', data);
  });

  socket.on('refund:processed', async (data) => {
    io.to(`return:${data.rmaNumber}`).emit('refund:complete', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from returns service');
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

const PORT = process.env.PORT || 3035;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Returns Service running on port ${PORT}`);
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