import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { CdnService } from './services/cdn.service';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import serveStatic from 'serve-static';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const prisma = new PrismaClient();
const cdnService = new CdnService(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // CDN needs flexible CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: '*', // CDN should be accessible from anywhere
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Higher limit for CDN
  message: 'Too many requests from this IP'
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many admin requests'
});

app.use('/api/admin', adminLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const edgeLocations = await prisma.cdnEdgeLocation.count({
      where: { active: true, healthy: true }
    });
    
    const totalContent = await prisma.cdnContent.count({
      where: { status: 'ACTIVE' }
    });
    
    res.json({
      status: 'healthy',
      service: 'indigenious-cdn-service',
      timestamp: new Date().toISOString(),
      edgeLocations,
      totalContent
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await cdnService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

// Validation schemas
const publishSchema = z.object({
  url: z.string().url(),
  indigenousContent: z.boolean().optional(),
  elderContent: z.boolean().optional(),
  ceremonyContent: z.boolean().optional(),
  culturalContent: z.boolean().optional(),
  sacredContent: z.boolean().optional(),
  nation: z.string().optional(),
  territory: z.string().optional(),
  language: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  preload: z.boolean().optional(),
  prefetch: z.boolean().optional(),
  cacheControl: z.string().optional(),
  maxAge: z.number().optional(),
  geoRestrictions: z.array(z.string()).optional(),
  signedUrl: z.boolean().optional(),
  tokenAuth: z.boolean().optional(),
  encryptionEnabled: z.boolean().optional()
});

const purgeSchema = z.object({
  purgeType: z.enum(['SINGLE', 'PATTERN', 'TAG', 'ALL']),
  pattern: z.string().optional(),
  tags: z.array(z.string()).optional(),
  edgeLocations: z.array(z.string()).optional(),
  indigenousPurge: z.boolean().optional(),
  ceremonyPurge: z.boolean().optional(),
  elderDirected: z.boolean().optional()
});

// CDN Content serving (main route)
app.get('/cdn/:contentId/*', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const response = await cdnService.serveContent(contentId, req);
    
    // Set appropriate headers
    res.set(response.headers);
    res.send(response.data);
  } catch (error) {
    // Fallback to origin or return error
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Content not found'
    });
  }
});

// API Routes

// Publish content to CDN
app.post('/api/content/publish', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    const data = publishSchema.parse(req.body);
    
    // Check permissions for sacred content
    if (data.sacredContent && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for sacred content' });
    }
    
    const contentId = await cdnService.publishContent(data.url, data);
    
    const content = await prisma.cdnContent.findUnique({
      where: { id: contentId }
    });
    
    res.status(201).json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to publish content'
    });
  }
});

// Get content info
app.get('/api/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const content = await prisma.cdnContent.findUnique({
      where: { id: contentId },
      include: {
        rules: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get content'
    });
  }
});

// Update content
app.put('/api/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'content-manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const content = await prisma.cdnContent.update({
      where: { id: contentId },
      data: req.body
    });
    
    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update content'
    });
  }
});

// Purge content
app.post('/api/content/:contentId/purge', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const data = purgeSchema.parse(req.body);
    
    // Check permissions
    if (data.elderDirected && !['admin', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Elders can direct Elder purges' });
    }
    
    const purgeId = await cdnService.purgeContent(contentId, data);
    
    res.status(202).json({ purgeId, status: 'INITIATED' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to purge content'
    });
  }
});

// Bulk purge
app.post('/api/purge', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'ops'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const data = purgeSchema.parse(req.body);
    
    const purgeId = await cdnService.purgeContent('', data);
    
    res.status(202).json({ purgeId, status: 'INITIATED' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to initiate purge'
    });
  }
});

// Get purge status
app.get('/api/purge/:purgeId', async (req, res) => {
  try {
    const { purgeId } = req.params;
    
    const purge = await prisma.cdnPurge.findUnique({
      where: { id: purgeId }
    });
    
    if (!purge) {
      return res.status(404).json({ error: 'Purge not found' });
    }
    
    res.json(purge);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get purge status'
    });
  }
});

// Edge Locations

// Get edge locations
app.get('/api/edge-locations', async (req, res) => {
  try {
    const { country, indigenousTerritory } = req.query;
    
    const where: any = { active: true };
    if (country) where.country = country;
    if (indigenousTerritory) where.indigenousTerritory = { contains: indigenousTerritory as string };
    
    const locations = await prisma.cdnEdgeLocation.findMany({
      where,
      orderBy: { priority: 'asc' }
    });
    
    res.json(locations);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get edge locations'
    });
  }
});

// Create edge location
app.post('/api/edge-locations', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'infra-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const locationId = await cdnService.createEdgeLocation(req.body);
    
    const location = await prisma.cdnEdgeLocation.findUnique({
      where: { id: locationId }
    });
    
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create edge location'
    });
  }
});

// Origins

// Get origins
app.get('/api/origins', async (req, res) => {
  try {
    const origins = await prisma.cdnOrigin.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    });
    
    res.json(origins);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get origins'
    });
  }
});

// Create origin
app.post('/api/origins', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'infra-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const origin = await prisma.cdnOrigin.create({
      data: {
        ...req.body,
        originId: `origin-${Date.now()}`
      }
    });
    
    res.status(201).json(origin);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create origin'
    });
  }
});

// Rules

// Get rules
app.get('/api/rules', async (req, res) => {
  try {
    const { contentId, ruleType, indigenousRule } = req.query;
    
    const where: any = { active: true };
    if (contentId) where.contentId = contentId;
    if (ruleType) where.ruleType = ruleType;
    if (indigenousRule !== undefined) where.indigenousRule = indigenousRule === 'true';
    
    const rules = await prisma.cdnRule.findMany({
      where,
      orderBy: { priority: 'asc' }
    });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get rules'
    });
  }
});

// Create rule
app.post('/api/rules', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous rules
    if (req.body.indigenousRule && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous rules' });
    }
    
    const rule = await prisma.cdnRule.create({
      data: {
        ...req.body,
        ruleId: `rule-${Date.now()}`
      }
    });
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create rule'
    });
  }
});

// WAF

// Get WAF rules
app.get('/api/waf/rules', async (req, res) => {
  try {
    const { ruleSet, severity, indigenousProtection } = req.query;
    
    const where: any = { active: true };
    if (ruleSet) where.ruleSet = ruleSet;
    if (severity) where.severity = severity;
    if (indigenousProtection !== undefined) where.indigenousProtection = indigenousProtection === 'true';
    
    const rules = await prisma.cdnWafRule.findMany({
      where,
      orderBy: { severity: 'desc' }
    });
    
    res.json(rules);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get WAF rules'
    });
  }
});

// Create WAF rule
app.post('/api/waf/rules', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'security-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const rule = await prisma.cdnWafRule.create({
      data: {
        ...req.body,
        ruleId: `waf-${Date.now()}`
      }
    });
    
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create WAF rule'
    });
  }
});

// Security Events

// Get security events
app.get('/api/security/events', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'security-admin', 'auditor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { eventType, severity, indigenousTarget, limit = 100, offset = 0 } = req.query;
    
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (indigenousTarget !== undefined) where.indigenousTarget = indigenousTarget === 'true';
    
    const events = await prisma.cdnSecurityEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get security events'
    });
  }
});

// Analytics

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'analyst', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date required' });
    }
    
    const analytics = await cdnService.getAnalytics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    });
  }
});

// Indigenous-specific endpoints

// Get Indigenous content
app.get('/api/content/indigenous', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous content' });
    }
    
    const { nation, elderContent, ceremonyContent, limit = 50, offset = 0 } = req.query;
    
    const where: any = {
      indigenousContent: true,
      status: 'ACTIVE'
    };
    
    if (nation) where.nation = nation;
    if (elderContent !== undefined) where.elderContent = elderContent === 'true';
    if (ceremonyContent !== undefined) where.ceremonyContent = ceremonyContent === 'true';
    
    const content = await prisma.cdnContent.findMany({
      where,
      orderBy: { priority: 'asc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get Indigenous content'
    });
  }
});

// Preload content for ceremony
app.post('/api/preload/ceremony', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'ceremony-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for ceremony preload' });
    }
    
    const { urls, ceremonyDate, nation } = req.body;
    
    const preloadJobs = [];
    
    for (const url of urls) {
      const preload = await prisma.cdnPreload.create({
        data: {
          preloadId: `preload-ceremony-${Date.now()}`,
          url,
          edgeLocations: ['ALL'],
          priority: 1,
          indigenousContent: true,
          ceremonyPreload: true,
          scheduledAt: new Date(ceremonyDate)
        }
      });
      
      preloadJobs.push(preload);
    }
    
    res.status(201).json({
      message: 'Ceremony content scheduled for preload',
      preloadJobs
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to schedule ceremony preload'
    });
  }
});

// Bandwidth allocation

// Get bandwidth allocations
app.get('/api/bandwidth/allocations', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'billing-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { nation, customerId } = req.query;
    
    const where: any = { active: true };
    if (nation) where.nation = nation;
    if (customerId) where.customerId = customerId;
    
    const allocations = await prisma.cdnBandwidthAllocation.findMany({
      where,
      orderBy: { billingPeriodStart: 'desc' }
    });
    
    res.json(allocations);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get bandwidth allocations'
    });
  }
});

// Create bandwidth allocation
app.post('/api/bandwidth/allocations', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'billing-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const allocation = await prisma.cdnBandwidthAllocation.create({
      data: {
        ...req.body,
        monthlyLimit: BigInt(req.body.monthlyLimit),
        dailyLimit: req.body.dailyLimit ? BigInt(req.body.dailyLimit) : null,
        burstLimit: req.body.burstLimit ? BigInt(req.body.burstLimit) : null,
        ceremonyReserve: req.body.ceremonyReserve ? BigInt(req.body.ceremonyReserve) : null
      }
    });
    
    res.status(201).json(allocation);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create bandwidth allocation'
    });
  }
});

// Certificates

// Get certificates
app.get('/api/certificates', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'security-admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const certificates = await prisma.cdnCertificate.findMany({
      where: { active: true },
      select: {
        id: true,
        certificateId: true,
        domain: true,
        alternativeNames: true,
        issuer: true,
        validFrom: true,
        validUntil: true,
        status: true,
        indigenousDomain: true,
        nation: true
      }
    });
    
    res.json(certificates);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get certificates'
    });
  }
});

// WebSocket events for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to CDN service');
  
  // Subscribe to CDN events
  socket.on('subscribe:cdn', () => {
    socket.join('cdn-updates');
  });
  
  // Subscribe to edge location updates
  socket.on('subscribe:edges', () => {
    socket.join('edge-updates');
  });
  
  // Subscribe to security events
  socket.on('subscribe:security', () => {
    socket.join('security-updates');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from CDN service');
  });
});

// Listen for CDN events
cdnService.on('contentPublished', (content) => {
  io.to('cdn-updates').emit('content:published', content);
});

cdnService.on('purgeStarted', (purge) => {
  io.to('cdn-updates').emit('purge:started', purge);
});

cdnService.on('purgeCompleted', (data) => {
  io.to('cdn-updates').emit('purge:completed', data);
});

cdnService.on('preloadCompleted', (data) => {
  io.to('cdn-updates').emit('preload:completed', data);
});

cdnService.on('edgeLocationDown', (location) => {
  io.to('edge-updates').emit('edge:down', location);
});

cdnService.on('edgeLocationUp', (location) => {
  io.to('edge-updates').emit('edge:up', location);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3048;

httpServer.listen(PORT, () => {
  console.log(`Indigenous CDN Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-provider CDN support');
  console.log('- Canadian edge location priority');
  console.log('- Indigenous content optimization');
  console.log('- Elder content prioritization');
  console.log('- Ceremony content preloading');
  console.log('- Sacred content protection');
  console.log('- Nation-specific CDN domains');
  console.log('- Traditional territory awareness');
  console.log('- Real-time purge and preload');
  console.log('- Comprehensive WAF protection');
  console.log('- Indigenous-specific caching rules');
  console.log('- Bandwidth allocation management');
  console.log('- SSL certificate management');
  console.log('- Real-time analytics and metrics');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});