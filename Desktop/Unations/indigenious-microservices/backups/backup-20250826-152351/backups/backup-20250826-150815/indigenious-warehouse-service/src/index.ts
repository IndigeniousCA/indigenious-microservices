import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { WarehouseService } from './services/warehouse.service';

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
      service: 'indigenious-warehouse-service',
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

// Warehouse Management
app.post('/api/warehouses', async (req, res) => {
  try {
    const warehouse = await WarehouseService.createWarehouse(req.body);
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create warehouse' });
  }
});

app.get('/api/warehouses/:id', async (req, res) => {
  try {
    const warehouse = await WarehouseService.getWarehouse(req.params.id);
    res.json(warehouse);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Warehouse not found' });
  }
});

app.put('/api/warehouses/:id', async (req, res) => {
  try {
    const warehouse = await WarehouseService.updateWarehouse(req.params.id, req.body);
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update warehouse' });
  }
});

app.get('/api/warehouses/indigenous/list', async (req, res) => {
  try {
    const warehouses = await WarehouseService.getIndigenousWarehouses();
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous warehouses' });
  }
});

// Zone Management
app.post('/api/warehouses/:id/zones', async (req, res) => {
  try {
    const zone = await WarehouseService.createWarehouseZone(req.params.id, req.body);
    res.status(201).json(zone);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create zone' });
  }
});

app.put('/api/zones/:id', async (req, res) => {
  try {
    const zone = await WarehouseService.updateZone(req.params.id, req.body);
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update zone' });
  }
});

// Location Management
app.post('/api/locations', async (req, res) => {
  try {
    const location = await WarehouseService.createLocation(req.body);
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create location' });
  }
});

app.get('/api/locations/available/:warehouseId', async (req, res) => {
  try {
    const locations = await WarehouseService.getAvailableLocations(req.params.warehouseId);
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get available locations' });
  }
});

// Inbound Shipments
app.post('/api/shipments/inbound', async (req, res) => {
  try {
    const shipment = await WarehouseService.processInboundShipment(req.body);
    res.status(201).json(shipment);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process inbound shipment' });
  }
});

app.put('/api/shipments/inbound/:id/receive', async (req, res) => {
  try {
    const shipment = await WarehouseService.receiveShipment(req.params.id, req.body);
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to receive shipment' });
  }
});

app.put('/api/shipments/inbound/:id/putaway', async (req, res) => {
  try {
    const tasks = await WarehouseService.createPutawayTasks(req.params.id, req.body);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create putaway tasks' });
  }
});

// Outbound Shipments
app.post('/api/shipments/outbound', async (req, res) => {
  try {
    const shipment = await WarehouseService.createOutboundShipment(req.body);
    res.status(201).json(shipment);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create outbound shipment' });
  }
});

app.post('/api/shipments/outbound/:id/pick-wave', async (req, res) => {
  try {
    const wave = await WarehouseService.createPickWave(req.params.id, req.body);
    res.json(wave);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create pick wave' });
  }
});

app.put('/api/shipments/outbound/:id/ship', async (req, res) => {
  try {
    const shipment = await WarehouseService.shipOrder(req.params.id, req.body);
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to ship order' });
  }
});

// Pick Tasks
app.post('/api/pick-tasks', async (req, res) => {
  try {
    const task = await WarehouseService.createPickTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create pick task' });
  }
});

app.put('/api/pick-tasks/:id/complete', async (req, res) => {
  try {
    const task = await WarehouseService.completePickTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete pick task' });
  }
});

app.get('/api/pick-tasks/assigned/:userId', async (req, res) => {
  try {
    const tasks = await WarehouseService.getAssignedPickTasks(req.params.userId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get assigned tasks' });
  }
});

// Warehouse Transfers
app.post('/api/transfers', async (req, res) => {
  try {
    const transfer = await WarehouseService.createWarehouseTransfer(req.body);
    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create transfer' });
  }
});

app.put('/api/transfers/:id/approve', async (req, res) => {
  try {
    const transfer = await WarehouseService.approveTransfer(req.params.id, req.body);
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve transfer' });
  }
});

// Cycle Counting
app.post('/api/cycle-counts', async (req, res) => {
  try {
    const plan = await WarehouseService.createCycleCountPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create cycle count plan' });
  }
});

app.post('/api/cycle-counts/:id/perform', async (req, res) => {
  try {
    const result = await WarehouseService.performCycleCount(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to perform cycle count' });
  }
});

// Performance Reporting
app.get('/api/warehouses/:id/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await WarehouseService.generatePerformanceReport(
      req.params.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate performance report' });
  }
});

app.get('/api/warehouses/:id/utilization', async (req, res) => {
  try {
    const utilization = await WarehouseService.getWarehouseUtilization(req.params.id);
    res.json(utilization);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get warehouse utilization' });
  }
});

// Remote Logistics
app.get('/api/warehouses/:id/winter-road-status', async (req, res) => {
  try {
    const status = await WarehouseService.getWinterRoadStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get winter road status' });
  }
});

app.post('/api/warehouses/:id/schedule-remote-delivery', async (req, res) => {
  try {
    const schedule = await WarehouseService.scheduleRemoteDelivery(req.params.id, req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule remote delivery' });
  }
});

// Indigenous Features
app.post('/api/warehouses/:id/cultural-protocols', async (req, res) => {
  try {
    const protocols = await WarehouseService.setCulturalProtocols(req.params.id, req.body);
    res.json(protocols);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to set cultural protocols' });
  }
});

app.post('/api/shipments/:id/elder-inspection', async (req, res) => {
  try {
    const inspection = await WarehouseService.requestElderInspection(req.params.id, req.body);
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to request Elder inspection' });
  }
});

app.get('/api/warehouses/:id/ceremony-items', async (req, res) => {
  try {
    const items = await WarehouseService.getCeremonyItems(req.params.id);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get ceremony items' });
  }
});

// Real-time tracking
app.get('/api/shipments/:id/track', async (req, res) => {
  try {
    const tracking = await WarehouseService.trackShipment(req.params.id);
    res.json(tracking);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to track shipment' });
  }
});

// WebSocket events for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to warehouse service');

  socket.on('subscribe:warehouse', (warehouseId: string) => {
    socket.join(`warehouse:${warehouseId}`);
  });

  socket.on('subscribe:shipment', (shipmentId: string) => {
    socket.join(`shipment:${shipmentId}`);
  });

  socket.on('location:update', async (data) => {
    io.to(`warehouse:${data.warehouseId}`).emit('location:changed', data);
  });

  socket.on('task:complete', async (data) => {
    io.to(`warehouse:${data.warehouseId}`).emit('task:updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from warehouse service');
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

const PORT = process.env.PORT || 3033;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Warehouse Service running on port ${PORT}`);
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