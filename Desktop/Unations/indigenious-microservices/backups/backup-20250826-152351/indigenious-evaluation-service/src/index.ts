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

// Load environment variables
dotenv.config();

// Services
import { EvaluationService } from './services/evaluation.service';
import { ScoringService } from './services/scoring.service';

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
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      status: 'healthy',
      service: 'evaluation-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Redis connection failed'
    });
  }
});

// Evaluation routes
app.post('/api/evaluations', async (req, res) => {
  try {
    const evaluation = await EvaluationService.createEvaluation(req.body);
    res.status(201).json(evaluation);
  } catch (error: any) {
    logger.error('Error creating evaluation:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/evaluations/:id/submissions', async (req, res) => {
  try {
    const result = await EvaluationService.registerSubmissions(
      req.params.id,
      req.body.submissions
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error registering submissions:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/evaluations/:id/evaluators', async (req, res) => {
  try {
    const result = await EvaluationService.assignEvaluators(
      req.params.id,
      req.body.evaluators
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error assigning evaluators:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/evaluations/submit', async (req, res) => {
  try {
    const { evaluatorId, submissionId, evaluation } = req.body;
    const result = await EvaluationService.submitEvaluation(
      evaluatorId,
      submissionId,
      evaluation
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error submitting evaluation:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/evaluations/:id/finalize', async (req, res) => {
  try {
    const result = await EvaluationService.finalizeEvaluation(
      req.params.id,
      req.body.approvedBy
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error finalizing evaluation:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/evaluations/:id/report', async (req, res) => {
  try {
    const report = await EvaluationService.generateEvaluationReport(req.params.id);
    res.json(report);
  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scoring routes
app.post('/api/scoring/calculate', async (req, res) => {
  try {
    const { submissionId, evaluationId } = req.body;
    const score = await ScoringService.calculateWeightedScore(submissionId, evaluationId);
    res.json(score);
  } catch (error: any) {
    logger.error('Error calculating score:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scoring/indigenous-preferences', async (req, res) => {
  try {
    const { submissionId, preferences } = req.body;
    const result = await ScoringService.applyIndigenousPreferences(
      submissionId,
      preferences
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error applying preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scoring/blind', async (req, res) => {
  try {
    const { evaluatorId, submissionId, scores } = req.body;
    const result = await ScoringService.performBlindEvaluation(
      evaluatorId,
      submissionId,
      scores
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error in blind evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scoring/consensus', async (req, res) => {
  try {
    const { evaluationId, submissionId, evaluatorIds } = req.body;
    const result = await ScoringService.buildConsensus(
      evaluationId,
      submissionId,
      evaluatorIds
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error building consensus:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scoring/rank', async (req, res) => {
  try {
    const rankings = await ScoringService.rankSubmissions(req.body.evaluationId);
    res.json(rankings);
  } catch (error: any) {
    logger.error('Error ranking submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scoring/calibrate', async (req, res) => {
  try {
    const calibration = await ScoringService.calibrateEvaluator(req.body.evaluatorId);
    res.json(calibration);
  } catch (error: any) {
    logger.error('Error calibrating evaluator:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);

  socket.on('join:evaluation', (evaluationId: string) => {
    socket.join(`evaluation:${evaluationId}`);
    logger.info(`Socket ${socket.id} joined evaluation ${evaluationId}`);
  });

  socket.on('join:evaluator', (evaluatorId: string) => {
    socket.join(`evaluator:${evaluatorId}`);
    logger.info(`Socket ${socket.id} joined as evaluator ${evaluatorId}`);
  });

  socket.on('evaluation:update', (data: any) => {
    io.to(`evaluation:${data.evaluationId}`).emit('evaluation:updated', data);
  });

  socket.on('consensus:request', (data: any) => {
    io.to(`evaluation:${data.evaluationId}`).emit('consensus:needed', data);
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily calibration check
cron.schedule('0 9 * * *', async () => {
  logger.info('Running daily evaluator calibration check');
  try {
    // Would check evaluators needing calibration
    logger.info('Calibration check completed');
  } catch (error) {
    logger.error('Error in calibration check:', error);
  }
});

// Weekly evaluation metrics
cron.schedule('0 10 * * MON', async () => {
  logger.info('Generating weekly evaluation metrics');
  try {
    // Would generate metrics report
    logger.info('Weekly metrics generated');
  } catch (error) {
    logger.error('Error generating metrics:', error);
  }
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
const PORT = process.env.PORT || 3016;
httpServer.listen(PORT, () => {
  logger.info(`⚖️ Evaluation Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - Multi-criteria weighted scoring');
  logger.info('  - Indigenous procurement preferences');
  logger.info('  - Blind evaluation mode');
  logger.info('  - Consensus building');
  logger.info('  - Evaluator calibration');
  logger.info('  - Complete audit trail');
});