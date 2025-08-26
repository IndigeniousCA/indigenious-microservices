import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Services
import { NationService } from './services/nation.service';
import { BandService } from './services/band.service';
import { ElderService } from './services/elder.service';

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
      service: 'community-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Nation routes
app.post('/api/nations', async (req, res) => {
  try {
    const nation = await NationService.createNation(req.body);
    res.status(201).json(nation);
  } catch (error: any) {
    logger.error('Error creating nation:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/nations', async (req, res) => {
  try {
    const result = await NationService.listNations(req.query as any);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing nations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nations/:id', async (req, res) => {
  try {
    const nation = await NationService.getNationById(req.params.id);
    if (!nation) {
      return res.status(404).json({ error: 'Nation not found' });
    }
    res.json(nation);
  } catch (error: any) {
    logger.error('Error getting nation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nations/:id/statistics', async (req, res) => {
  try {
    const stats = await NationService.getNationStatistics(req.params.id);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting nation statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nations/:id/treaties', async (req, res) => {
  try {
    const treaties = await NationService.getNationTreaties(req.params.id);
    res.json(treaties);
  } catch (error: any) {
    logger.error('Error getting nation treaties:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nations/:id/protocols', async (req, res) => {
  try {
    const protocols = await NationService.getNationProtocols(req.params.id);
    res.json(protocols);
  } catch (error: any) {
    logger.error('Error getting nation protocols:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nations/location/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius ? parseInt(req.query.radius as string) : 100;
    const nations = await NationService.getNationsByLocation(
      parseFloat(lat),
      parseFloat(lng),
      radius
    );
    res.json(nations);
  } catch (error: any) {
    logger.error('Error getting nations by location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Band routes
app.post('/api/bands', async (req, res) => {
  try {
    const band = await BandService.createBand(req.body);
    res.status(201).json(band);
  } catch (error: any) {
    logger.error('Error creating band:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/bands', async (req, res) => {
  try {
    const result = await BandService.listBands(req.query as any);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing bands:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bands/:id', async (req, res) => {
  try {
    const band = await BandService.getBand(req.params.id);
    if (!band) {
      return res.status(404).json({ error: 'Band not found' });
    }
    res.json(band);
  } catch (error: any) {
    logger.error('Error getting band:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bands/:id/statistics', async (req, res) => {
  try {
    const stats = await BandService.getBandStatistics(req.params.id);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting band statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bands/:id/procurement-preferences', async (req, res) => {
  try {
    const preference = await BandService.setProcurementPreferences({
      ...req.body,
      bandId: req.params.id
    });
    res.status(201).json(preference);
  } catch (error: any) {
    logger.error('Error setting procurement preferences:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/bands/:id/procurement-preferences', async (req, res) => {
  try {
    const preferences = await BandService.getBandProcurementPreferences(req.params.id);
    res.json(preferences);
  } catch (error: any) {
    logger.error('Error getting procurement preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bands/:id/projects', async (req, res) => {
  try {
    const project = await BandService.createCommunityProject(req.params.id, req.body);
    res.status(201).json(project);
  } catch (error: any) {
    logger.error('Error creating project:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/bands/:id/notifications', async (req, res) => {
  try {
    const notifications = await BandService.getBandNotifications(
      req.params.id,
      req.query as any
    );
    res.json(notifications);
  } catch (error: any) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bands/:id/businesses', async (req, res) => {
  try {
    const registration = await BandService.registerBusiness(req.params.id, req.body);
    res.status(201).json(registration);
  } catch (error: any) {
    logger.error('Error registering business:', error);
    res.status(400).json({ error: error.message });
  }
});

// Elder routes
app.post('/api/elders', async (req, res) => {
  try {
    const elder = await ElderService.registerElder(req.body);
    res.status(201).json(elder);
  } catch (error: any) {
    logger.error('Error registering elder:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/elders', async (req, res) => {
  try {
    const result = await ElderService.listElders(req.query as any);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing elders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/elders/:id', async (req, res) => {
  try {
    const elder = await ElderService.getElderById(req.params.id);
    if (!elder) {
      return res.status(404).json({ error: 'Elder not found' });
    }
    res.json(elder);
  } catch (error: any) {
    logger.error('Error getting elder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/elders/approval-request', async (req, res) => {
  try {
    const approval = await ElderService.requestApproval(req.body);
    res.status(201).json(approval);
  } catch (error: any) {
    logger.error('Error requesting approval:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/elders/:elderId/approvals/:approvalId', async (req, res) => {
  try {
    const approval = await ElderService.processApproval(
      req.params.approvalId,
      req.params.elderId,
      req.body
    );
    res.json(approval);
  } catch (error: any) {
    logger.error('Error processing approval:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/elders/:id/pending-approvals', async (req, res) => {
  try {
    const approvals = await ElderService.getPendingApprovals(req.params.id);
    res.json(approvals);
  } catch (error: any) {
    logger.error('Error getting pending approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/elders/:id/teachings', async (req, res) => {
  try {
    const teaching = await ElderService.recordTeaching({
      ...req.body,
      elderId: req.params.id
    });
    res.status(201).json(teaching);
  } catch (error: any) {
    logger.error('Error recording teaching:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/elders/:id/teachings', async (req, res) => {
  try {
    const teachings = await ElderService.getElderTeachings(
      req.params.id,
      req.query as any
    );
    res.json(teachings);
  } catch (error: any) {
    logger.error('Error getting teachings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cultural-knowledge', async (req, res) => {
  try {
    const { topic, ...options } = req.query;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    const knowledge = await ElderService.getCulturalKnowledge(
      topic as string,
      options as any
    );
    res.json(knowledge);
  } catch (error: any) {
    logger.error('Error getting cultural knowledge:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/elder-council', async (req, res) => {
  try {
    const council = await ElderService.getElderCouncil(req.body);
    res.json(council);
  } catch (error: any) {
    logger.error('Error forming elder council:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/elders/:id/statistics', async (req, res) => {
  try {
    const stats = await ElderService.getElderStatistics(req.params.id);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting elder statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('subscribe:nation', (nationId: string) => {
    socket.join(`nation:${nationId}`);
    logger.info(`Socket ${socket.id} subscribed to nation ${nationId}`);
  });

  socket.on('subscribe:band', (bandId: string) => {
    socket.join(`band:${bandId}`);
    logger.info(`Socket ${socket.id} subscribed to band ${bandId}`);
  });

  socket.on('subscribe:elder', (elderId: string) => {
    socket.join(`elder:${elderId}`);
    logger.info(`Socket ${socket.id} subscribed to elder ${elderId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
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
const PORT = process.env.PORT || 3014;
httpServer.listen(PORT, () => {
  logger.info(`🌿 Indigenous Community Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});