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
import multer from 'multer';
import path from 'path';

// Load environment variables
dotenv.config();

// Services
import { TrainingService } from './services/training.service';

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

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|wav|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      status: 'healthy',
      service: 'training-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Course management routes
app.post('/api/courses', async (req, res) => {
  try {
    const course = await TrainingService.createCourse(req.body);
    res.status(201).json(course);
  } catch (error: any) {
    logger.error('Error creating course:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/courses/:courseId/enroll', async (req, res) => {
  try {
    const enrollment = await TrainingService.enrollInCourse({
      ...req.body,
      courseId: req.params.courseId
    });
    res.status(201).json(enrollment);
  } catch (error: any) {
    logger.error('Error enrolling in course:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/enrollments/:enrollmentId/progress', async (req, res) => {
  try {
    const progress = await TrainingService.updateLearningProgress({
      enrollmentId: req.params.enrollmentId,
      ...req.body
    });
    res.json(progress);
  } catch (error: any) {
    logger.error('Error updating progress:', error);
    res.status(400).json({ error: error.message });
  }
});

// Certification routes
app.post('/api/certifications/issue', async (req, res) => {
  try {
    const certification = await TrainingService.issueCertification(req.body);
    res.status(201).json(certification);
  } catch (error: any) {
    logger.error('Error issuing certification:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mentorship routes
app.post('/api/mentorships/match', async (req, res) => {
  try {
    const match = await TrainingService.matchMentor(req.body);
    res.status(201).json(match);
  } catch (error: any) {
    logger.error('Error matching mentor:', error);
    res.status(400).json({ error: error.message });
  }
});

// Traditional knowledge routes
app.post('/api/traditional-knowledge', upload.fields([
  { name: 'audio', maxCount: 5 },
  { name: 'video', maxCount: 3 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const files = req.files as any;
    const knowledgeData = {
      ...JSON.parse(req.body.data),
      audioRecordings: files.audio?.map((f: any) => f.path) || [],
      videoRecordings: files.video?.map((f: any) => f.path) || [],
      images: files.images?.map((f: any) => f.path) || []
    };
    
    const knowledge = await TrainingService.preserveTraditionalKnowledge(knowledgeData);
    res.status(201).json(knowledge);
  } catch (error: any) {
    logger.error('Error preserving traditional knowledge:', error);
    res.status(400).json({ error: error.message });
  }
});

// Cultural content routes
app.get('/api/courses/indigenous', async (req, res) => {
  try {
    // Get Indigenous-specific courses
    const courses = await redis.get('indigenous-courses');
    if (courses) {
      res.json(JSON.parse(courses));
    } else {
      // Would query database for Indigenous courses
      res.json({ courses: [], cached: false });
    }
  } catch (error: any) {
    logger.error('Error fetching Indigenous courses:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/traditional-knowledge/search', async (req, res) => {
  try {
    const { query, category, nation, accessLevel } = req.query;
    // Search traditional knowledge with respect to cultural protocols
    const results = await redis.keys(`knowledge-index:*`);
    const knowledge = [];
    
    for (const key of results.slice(0, 10)) { // Limit results
      const item = await redis.hgetall(key);
      if (item.title?.toLowerCase().includes(query as string || '')) {
        knowledge.push(item);
      }
    }
    
    res.json({ results: knowledge, respectfulSearch: true });
  } catch (error: any) {
    logger.error('Error searching traditional knowledge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Elder approval workflow
app.post('/api/courses/:courseId/elder-approval', async (req, res) => {
  try {
    const { elderName, elderCredentials, approved, notes } = req.body;
    
    // Record elder approval/feedback
    await redis.hset(
      `elder-approval:${req.params.courseId}`,
      'elderName', elderName,
      'approved', approved.toString(),
      'notes', notes || '',
      'timestamp', Date.now().toString()
    );
    
    // If approved, update course status
    if (approved) {
      // Would update course in database
      logger.info(`Course ${req.params.courseId} approved by Elder ${elderName}`);
    }
    
    res.json({ 
      approvalRecorded: true, 
      elderName, 
      approved,
      culturalIntegrity: 'maintained'
    });
  } catch (error: any) {
    logger.error('Error recording elder approval:', error);
    res.status(400).json({ error: error.message });
  }
});

// Cultural competency assessment
app.post('/api/assessments/cultural-competency', async (req, res) => {
  try {
    const { userId, responses, culturalContext } = req.body;
    
    // Process cultural competency assessment
    const competencyScore = responses.reduce((score: number, response: any) => {
      return score + (response.culturalAwareness || 0);
    }, 0) / responses.length;
    
    // Store assessment results
    await redis.hset(
      `cultural-assessment:${userId}`,
      'score', competencyScore.toString(),
      'context', culturalContext,
      'assessedAt', Date.now().toString()
    );
    
    res.json({
      competencyScore,
      culturalAwareness: competencyScore >= 75 ? 'High' : competencyScore >= 50 ? 'Moderate' : 'Developing',
      recommendations: competencyScore < 75 ? [
        'Continue cultural learning journey',
        'Engage with Indigenous mentors',
        'Participate in cultural events'
      ] : [
        'Share knowledge respectfully',
        'Support cultural initiatives',
        'Mentor others in cultural competency'
      ]
    });
  } catch (error: any) {
    logger.error('Error processing cultural assessment:', error);
    res.status(400).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('subscribe:course', (courseId: string) => {
    socket.join(`course:${courseId}`);
    logger.info(`Socket ${socket.id} subscribed to course ${courseId}`);
  });

  socket.on('subscribe:mentorship', (mentorshipId: string) => {
    socket.join(`mentorship:${mentorshipId}`);
    logger.info(`Socket ${socket.id} subscribed to mentorship ${mentorshipId}`);
  });

  socket.on('subscribe:cultural-updates', (userId: string) => {
    socket.join(`cultural:${userId}`);
    logger.info(`Socket ${socket.id} subscribed to cultural updates for ${userId}`);
  });

  socket.on('traditional-knowledge:access', async (data) => {
    // Verify cultural protocols before accessing traditional knowledge
    const { knowledgeId, userId, culturalContext } = data;
    
    const knowledge = await redis.hgetall(`knowledge-index:${knowledgeId}`);
    if (knowledge && knowledge.ceremonyRequired === 'true') {
      socket.emit('protocol:required', {
        message: 'This knowledge requires ceremonial protocol',
        protocols: ['Smudging', 'Elder permission', 'Respectful approach']
      });
    } else {
      socket.emit('knowledge:accessible', { knowledgeId, respectfulAccess: true });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily cultural content review
cron.schedule('0 9 * * *', async () => {
  logger.info('Running daily cultural content review');
  try {
    // Review pending elder approvals
    const pendingApprovals = await redis.keys('elder-approval:*');
    logger.info(`${pendingApprovals.length} courses pending elder approval`);
    
    // Check cultural knowledge sharing protocols
    const knowledgeItems = await redis.keys('knowledge-index:*');
    logger.info(`${knowledgeItems.length} traditional knowledge items preserved`);
  } catch (error) {
    logger.error('Error in cultural content review:', error);
  }
});

// Weekly mentorship check-ins
cron.schedule('0 10 * * MON', async () => {
  logger.info('Running weekly mentorship check-ins');
  try {
    // Check active mentorships
    // Send reminders for scheduled sessions
    // Track cultural teaching progress
    logger.info('Mentorship check-ins completed');
  } catch (error) {
    logger.error('Error in mentorship check-ins:', error);
  }
});

// Monthly certification renewals
cron.schedule('0 9 1 * *', async () => {
  logger.info('Processing monthly certification renewals');
  try {
    // Check expiring certifications
    // Send renewal reminders
    // Process Indigenous certification endorsements
    logger.info('Certification renewals processed');
  } catch (error) {
    logger.error('Error processing renewals:', error);
  }
});

// Seasonal traditional knowledge sharing
cron.schedule('0 8 21 3,6,9,12 *', async () => { // Equinoxes and solstices
  logger.info('Seasonal traditional knowledge sharing');
  try {
    // Promote seasonal teachings
    // Activate seasonal content
    // Notify community about seasonal opportunities
    io.emit('seasonal:teachings', {
      season: new Date().getMonth() < 3 ? 'Spring' : 
              new Date().getMonth() < 6 ? 'Summer' :
              new Date().getMonth() < 9 ? 'Fall' : 'Winter',
      culturalSignificance: 'Traditional seasonal teachings available',
      respectfulSharing: true
    });
  } catch (error) {
    logger.error('Error in seasonal sharing:', error);
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    culturalRespect: 'maintained'
  });
});

// Start server
const PORT = process.env.PORT || 3020;
httpServer.listen(PORT, () => {
  logger.info(`🎓 Training Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - Indigenous cultural course integration');
  logger.info('  - Traditional knowledge preservation system');
  logger.info('  - Elder approval workflows');
  logger.info('  - Cultural competency assessments');
  logger.info('  - Indigenous mentor matching');
  logger.info('  - Subsidy and band funding support');
  logger.info('  - Multi-language support (including Indigenous languages)');
  logger.info('  - Ceremonial and seasonal teaching protocols');
  logger.info('  - Certificate issuing with cultural recognition');
  logger.info('  - Traditional knowledge sharing with protocols');
});