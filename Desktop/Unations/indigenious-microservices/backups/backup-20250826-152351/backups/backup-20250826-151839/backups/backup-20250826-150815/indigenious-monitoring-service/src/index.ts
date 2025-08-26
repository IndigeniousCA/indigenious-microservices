import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { MonitoringService } from './services/monitoring.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const prisma = new PrismaClient();
const monitoringService = new MonitoringService();

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
    const services = await prisma.service.count({
      where: { status: 'HEALTHY' }
    });
    
    const totalServices = await prisma.service.count();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-monitoring-service',
      timestamp: new Date().toISOString(),
      healthyServices: services,
      totalServices
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(monitoringService.getPrometheusMetrics());
});

// API Routes

// Services management
app.post('/api/services', async (req, res) => {
  try {
    const service = await prisma.service.create({
      data: req.body
    });
    
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create service' 
    });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { healthChecks: true, alerts: true }
        }
      }
    });
    
    res.json(services);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get services' 
    });
  }
});

app.get('/api/services/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = await monitoringService.getServiceStatus(serviceName);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get service status' 
    });
  }
});

// Health checks
app.post('/api/services/:serviceName/check', async (req, res) => {
  try {
    const { serviceName } = req.params;
    
    const service = await prisma.service.findUnique({
      where: { serviceName }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const result = await monitoringService.performHealthCheck(service);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Health check failed' 
    });
  }
});

app.get('/api/health-checks', async (req, res) => {
  try {
    const { serviceId, limit = 100 } = req.query;
    
    const checks = await prisma.healthCheck.findMany({
      where: serviceId ? { serviceId: serviceId as string } : undefined,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      include: {
        service: true
      }
    });
    
    res.json(checks);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get health checks' 
    });
  }
});

// Alerts
app.post('/api/alerts', async (req, res) => {
  try {
    await monitoringService.createAlert(req.body);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create alert' 
    });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const { status, severity } = req.query;
    
    const alerts = await prisma.alert.findMany({
      where: {
        status: status as string,
        severity: severity as string
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        service: true
      }
    });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get alerts' 
    });
  }
});

app.put('/api/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { userId } = req.body;
    
    await monitoringService.acknowledgeAlert(alertId, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert' 
    });
  }
});

app.put('/api/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { userId } = req.body;
    
    await monitoringService.resolveAlert(alertId, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to resolve alert' 
    });
  }
});

// Alert rules
app.post('/api/alert-rules', async (req, res) => {
  try {
    const rule = await prisma.alertRule.create({
      data: req.body
    });
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create alert rule' 
    });
  }
});

app.get('/api/alert-rules', async (req, res) => {
  try {
    const rules = await prisma.alertRule.findMany({
      where: { active: true }
    });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get alert rules' 
    });
  }
});

// Incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const { status } = req.query;
    
    const incidents = await prisma.incident.findMany({
      where: status ? { status: status as string } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        alerts: true,
        updates: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get incidents' 
    });
  }
});

app.post('/api/incidents/:incidentId/updates', async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId,
        ...req.body
      }
    });
    
    res.status(201).json(update);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create incident update' 
    });
  }
});

// Metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const { serviceId, resourceType, hours = 24 } = req.query;
    
    const metrics = await prisma.metric.findMany({
      where: {
        serviceId: serviceId as string,
        resourceType: resourceType as string,
        timestamp: {
          gte: new Date(Date.now() - parseInt(hours as string) * 3600000)
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get metrics' 
    });
  }
});

app.post('/api/metrics/collect', async (req, res) => {
  try {
    await monitoringService.collectMetrics();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to collect metrics' 
    });
  }
});

// Dashboards
app.post('/api/dashboards', async (req, res) => {
  try {
    const dashboard = await prisma.dashboard.create({
      data: req.body
    });
    
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create dashboard' 
    });
  }
});

app.get('/api/dashboards', async (req, res) => {
  try {
    const { indigenousDashboard } = req.query;
    
    const dashboards = await prisma.dashboard.findMany({
      where: {
        active: true,
        indigenousDashboard: indigenousDashboard === 'true'
      }
    });
    
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get dashboards' 
    });
  }
});

app.get('/api/dashboards/:dashboardId', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const data = await monitoringService.getDashboardData(dashboardId);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get dashboard data' 
    });
  }
});

// Notification channels
app.post('/api/notification-channels', async (req, res) => {
  try {
    const channel = await prisma.notificationChannel.create({
      data: req.body
    });
    
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create notification channel' 
    });
  }
});

app.get('/api/notification-channels', async (req, res) => {
  try {
    const channels = await prisma.notificationChannel.findMany({
      where: { active: true }
    });
    
    res.json(channels);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get notification channels' 
    });
  }
});

// SLAs
app.post('/api/slas', async (req, res) => {
  try {
    const sla = await prisma.sLA.create({
      data: req.body
    });
    
    res.status(201).json(sla);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create SLA' 
    });
  }
});

app.get('/api/slas', async (req, res) => {
  try {
    const slas = await prisma.sLA.findMany({
      where: { active: true },
      include: {
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    res.json(slas);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get SLAs' 
    });
  }
});

// System resources
app.get('/api/system-resources', async (req, res) => {
  try {
    const { hostname, resourceType } = req.query;
    
    const resources = await prisma.systemResource.findMany({
      where: {
        hostname: hostname as string,
        resourceType: resourceType as string
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get system resources' 
    });
  }
});

// Logs
app.get('/api/logs', async (req, res) => {
  try {
    const { level, source, hours = 1 } = req.query;
    
    const logs = await prisma.logEntry.findMany({
      where: {
        level: level as string,
        source: source as string,
        timestamp: {
          gte: new Date(Date.now() - parseInt(hours as string) * 3600000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get logs' 
    });
  }
});

// Distributed tracing
app.get('/api/traces', async (req, res) => {
  try {
    const { traceId } = req.query;
    
    const spans = await prisma.traceSpan.findMany({
      where: { traceId: traceId as string },
      orderBy: { startTime: 'asc' }
    });
    
    res.json(spans);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get traces' 
    });
  }
});

// WebSocket events for real-time monitoring
io.on('connection', (socket) => {
  console.log('Client connected to monitoring service');

  // Subscribe to service updates
  socket.on('subscribe:service', (serviceName: string) => {
    socket.join(`service:${serviceName}`);
  });

  // Subscribe to alerts
  socket.on('subscribe:alerts', () => {
    socket.join('alerts');
  });

  // Subscribe to incidents
  socket.on('subscribe:incidents', () => {
    socket.join('incidents');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from monitoring service');
  });
});

// Listen for monitoring events
monitoringService.on('alert', (alert) => {
  io.to('alerts').emit('alert:new', alert);
  if (alert.serviceId) {
    io.to(`service:${alert.serviceId}`).emit('service:alert', alert);
  }
});

// Real-time metric streaming
setInterval(async () => {
  const recentMetrics = await prisma.metric.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 5000) // Last 5 seconds
      }
    }
  });

  for (const metric of recentMetrics) {
    if (metric.serviceId) {
      io.to(`service:${metric.serviceId}`).emit('metric:update', metric);
    }
  }
}, 5000);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3042;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Monitoring Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Service health monitoring');
  console.log('- Prometheus metrics collection');
  console.log('- Indigenous priority alerts');
  console.log('- Elder notification system');
  console.log('- Ceremony impact assessment');
  console.log('- Community-wide broadcasting');
  console.log('- Incident management');
  console.log('- SLA tracking');
  console.log('- Distributed tracing');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});