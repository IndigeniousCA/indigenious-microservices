import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { DistributionService } from './services/distribution.service';

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
      service: 'indigenious-distribution-service',
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

// Delivery Routes
app.post('/api/routes', async (req, res) => {
  try {
    const route = await DistributionService.createDeliveryRoute(req.body);
    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create route' });
  }
});

app.get('/api/routes/indigenous', async (req, res) => {
  try {
    const routes = await DistributionService.getIndigenousRoutes();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous routes' });
  }
});

app.get('/api/routes/winter-road-status', async (req, res) => {
  try {
    const status = await DistributionService.getWinterRoadStatus(req.query);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get winter road status' });
  }
});

// Deliveries
app.post('/api/deliveries', async (req, res) => {
  try {
    const delivery = await DistributionService.createDelivery(req.body);
    res.status(201).json(delivery);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create delivery' });
  }
});

app.get('/api/deliveries/track/:trackingNumber', async (req, res) => {
  try {
    const tracking = await DistributionService.trackDelivery(req.params.trackingNumber);
    res.json(tracking);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Delivery not found' });
  }
});

app.put('/api/deliveries/:id/status', async (req, res) => {
  try {
    const delivery = await DistributionService.updateDeliveryStatus(req.params.id, req.body);
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update delivery status' });
  }
});

app.post('/api/deliveries/:id/assign-driver', async (req, res) => {
  try {
    const delivery = await DistributionService.assignDriver(req.params.id, req.body);
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to assign driver' });
  }
});

// Ceremony Deliveries
app.post('/api/deliveries/ceremony', async (req, res) => {
  try {
    const delivery = await DistributionService.scheduleCeremonyDelivery(req.body);
    res.status(201).json(delivery);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule ceremony delivery' });
  }
});

app.get('/api/deliveries/ceremony/moon-phase', async (req, res) => {
  try {
    const moonPhase = await DistributionService.getMoonPhaseForDate(req.query.date);
    res.json({ moonPhase });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get moon phase' });
  }
});

// Remote Deliveries
app.post('/api/deliveries/:id/schedule-remote', async (req, res) => {
  try {
    const delivery = await DistributionService.scheduleRemoteDelivery(req.params.id, req.body);
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule remote delivery' });
  }
});

app.get('/api/deliveries/remote/access-methods', async (req, res) => {
  try {
    const methods = await DistributionService.getAccessMethods(req.query.location, req.query.date);
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get access methods' });
  }
});

// Community Hubs
app.post('/api/community-hubs', async (req, res) => {
  try {
    const hub = await DistributionService.createCommunityHub(req.body);
    res.status(201).json(hub);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create community hub' });
  }
});

app.get('/api/community-hubs/:communityName', async (req, res) => {
  try {
    const hubs = await DistributionService.getCommunityHubs(req.params.communityName);
    res.json(hubs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get community hubs' });
  }
});

app.put('/api/community-hubs/:id', async (req, res) => {
  try {
    const hub = await DistributionService.updateCommunityHub(req.params.id, req.body);
    res.json(hub);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update community hub' });
  }
});

// Drivers
app.post('/api/drivers', async (req, res) => {
  try {
    const driver = await DistributionService.registerDriver(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to register driver' });
  }
});

app.get('/api/drivers/indigenous', async (req, res) => {
  try {
    const drivers = await DistributionService.getIndigenousDrivers();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous drivers' });
  }
});

app.get('/api/drivers/available', async (req, res) => {
  try {
    const drivers = await DistributionService.getAvailableDrivers(req.query);
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get available drivers' });
  }
});

// Vehicles
app.post('/api/vehicles', async (req, res) => {
  try {
    const vehicle = await DistributionService.registerVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to register vehicle' });
  }
});

app.get('/api/vehicles/special', async (req, res) => {
  try {
    const vehicles = await DistributionService.getSpecialVehicles(req.query.type);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get special vehicles' });
  }
});

app.put('/api/vehicles/:id/location', async (req, res) => {
  try {
    const vehicle = await DistributionService.updateVehicleLocation(req.params.id, req.body);
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update vehicle location' });
  }
});

// Route Optimization
app.post('/api/optimize', async (req, res) => {
  try {
    const optimization = await DistributionService.optimizeDeliveryRoutes(req.body);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to optimize routes' });
  }
});

app.post('/api/optimize/apply/:id', async (req, res) => {
  try {
    const result = await DistributionService.applyOptimization(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to apply optimization' });
  }
});

// Customer Feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const feedback = await DistributionService.submitFeedback(req.body);
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit feedback' });
  }
});

app.get('/api/feedback/cultural/:deliveryId', async (req, res) => {
  try {
    const feedback = await DistributionService.getCulturalFeedback(req.params.deliveryId);
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get cultural feedback' });
  }
});

// Performance Metrics
app.get('/api/metrics/delivery-performance', async (req, res) => {
  try {
    const metrics = await DistributionService.getDeliveryPerformance(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get delivery performance' });
  }
});

app.get('/api/metrics/indigenous-deliveries', async (req, res) => {
  try {
    const metrics = await DistributionService.getIndigenousDeliveryMetrics(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous delivery metrics' });
  }
});

app.get('/api/metrics/route-efficiency', async (req, res) => {
  try {
    const metrics = await DistributionService.getRouteEfficiency(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get route efficiency' });
  }
});

// WebSocket events for real-time tracking
io.on('connection', (socket) => {
  console.log('Client connected to distribution service');

  socket.on('track:delivery', (trackingNumber: string) => {
    socket.join(`delivery:${trackingNumber}`);
  });

  socket.on('track:driver', (driverId: string) => {
    socket.join(`driver:${driverId}`);
  });

  socket.on('track:route', (routeId: string) => {
    socket.join(`route:${routeId}`);
  });

  socket.on('location:update', async (data) => {
    // Update driver/vehicle location
    io.to(`delivery:${data.trackingNumber}`).emit('location:changed', data);
    io.to(`driver:${data.driverId}`).emit('location:changed', data);
  });

  socket.on('status:update', async (data) => {
    // Broadcast delivery status updates
    io.to(`delivery:${data.trackingNumber}`).emit('status:changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from distribution service');
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

const PORT = process.env.PORT || 3034;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Distribution Service running on port ${PORT}`);
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