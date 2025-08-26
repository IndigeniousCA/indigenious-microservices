import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { QueueService } from './services/queue.service';
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
const queueService = new QueueService();

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
    const workers = await prisma.worker.findMany({
      where: { active: true }
    });
    
    res.json({
      status: 'healthy',
      service: 'indigenious-queue-service',
      timestamp: new Date().toISOString(),
      workers: workers.length
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Create queue
app.post('/api/queues', async (req, res) => {
  try {
    const queue = await prisma.queue.create({
      data: req.body
    });
    
    await queueService.createQueue(queue);
    
    res.status(201).json(queue);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create queue' 
    });
  }
});

// Get all queues
app.get('/api/queues', async (req, res) => {
  try {
    const queues = await prisma.queue.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });
    
    res.json(queues);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get queues' 
    });
  }
});

// Add job to queue
app.post('/api/queues/:queueName/jobs', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { data, options = {} } = req.body;
    
    const jobId = await queueService.addJob(queueName, data, options);
    
    res.status(201).json({ jobId, queueName });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to add job' 
    });
  }
});

// Add bulk jobs
app.post('/api/queues/:queueName/jobs/bulk', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { jobs } = req.body;
    
    if (!Array.isArray(jobs)) {
      return res.status(400).json({ error: 'Jobs must be an array' });
    }
    
    const jobIds = await queueService.addBulkJobs(queueName, jobs);
    
    res.status(201).json({ 
      jobIds, 
      count: jobIds.length,
      queueName 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to add bulk jobs' 
    });
  }
});

// Indigenous priority job
app.post('/api/queues/:queueName/jobs/indigenous', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { 
      data, 
      nation, 
      community,
      elderRequest = false,
      ceremonyRelated = false,
      culturalImportance,
      generationalImpact = false,
      ...options 
    } = req.body;
    
    const jobId = await queueService.addJob(queueName, data, {
      ...options,
      indigenousJob: true,
      nation,
      community,
      elderRequest,
      ceremonyRelated,
      culturalImportance,
      generationalImpact,
      priority: elderRequest ? 10 : (ceremonyRelated ? 9 : 7)
    });
    
    res.status(201).json({ 
      jobId, 
      queueName,
      indigenousPriority: true 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to add Indigenous job' 
    });
  }
});

// Get job status
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await queueService.getJobStatus(jobId);
    
    res.json(job);
  } catch (error) {
    res.status(404).json({ 
      error: error instanceof Error ? error.message : 'Job not found' 
    });
  }
});

// Cancel job
app.delete('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await queueService.cancelJob(jobId);
    
    res.json({ success: result, jobId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to cancel job' 
    });
  }
});

// Retry failed job
app.post('/api/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await queueService.retryJob(jobId);
    
    res.json({ success: result, jobId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to retry job' 
    });
  }
});

// Get queue metrics
app.get('/api/queues/:queueName/metrics', async (req, res) => {
  try {
    const { queueName } = req.params;
    const metrics = await queueService.getQueueMetrics(queueName);
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get metrics' 
    });
  }
});

// Schedule job
app.post('/api/scheduled-jobs', async (req, res) => {
  try {
    const jobId = await queueService.scheduleJob(req.body);
    
    res.status(201).json({ jobId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to schedule job' 
    });
  }
});

// Get scheduled jobs
app.get('/api/scheduled-jobs', async (req, res) => {
  try {
    const jobs = await prisma.scheduledJob.findMany({
      where: { enabled: true }
    });
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get scheduled jobs' 
    });
  }
});

// Dead letter queue operations
app.get('/api/queues/:queueName/dlq', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    const queue = await prisma.queue.findUnique({
      where: { queueName },
      include: {
        dlqJobs: {
          take: 100,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    res.json(queue?.dlqJobs || []);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get DLQ' 
    });
  }
});

app.post('/api/queues/:queueName/dlq/process', async (req, res) => {
  try {
    const { queueName } = req.params;
    const count = await queueService.processDLQ(queueName);
    
    res.json({ 
      processed: count,
      queueName 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process DLQ' 
    });
  }
});

// Worker management
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await prisma.worker.findMany({
      where: { active: true }
    });
    
    res.json(workers);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get workers' 
    });
  }
});

app.put('/api/workers/:workerId/pause', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    await prisma.worker.update({
      where: { workerId },
      data: { status: 'PAUSED' }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to pause worker' 
    });
  }
});

app.put('/api/workers/:workerId/resume', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    await prisma.worker.update({
      where: { workerId },
      data: { status: 'IDLE' }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to resume worker' 
    });
  }
});

// Message templates
app.post('/api/templates', async (req, res) => {
  try {
    const template = await prisma.messageTemplate.create({
      data: req.body
    });
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: { active: true }
    });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get templates' 
    });
  }
});

// Events
app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.queueEvent.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' }
    });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get events' 
    });
  }
});

// Circuit breaker status
app.get('/api/circuit-breakers', async (req, res) => {
  try {
    const breakers = await prisma.circuitBreaker.findMany();
    
    res.json(breakers);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get circuit breakers' 
    });
  }
});

// WebSocket events for real-time job updates
io.on('connection', (socket) => {
  console.log('Client connected to queue service');

  socket.on('subscribe:queue', (queueName: string) => {
    socket.join(`queue:${queueName}`);
  });

  socket.on('subscribe:job', (jobId: string) => {
    socket.join(`job:${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from queue service');
  });
});

// Emit job status updates
setInterval(async () => {
  const recentJobs = await prisma.job.findMany({
    where: {
      updatedAt: {
        gte: new Date(Date.now() - 5000) // Last 5 seconds
      }
    }
  });

  for (const job of recentJobs) {
    io.to(`job:${job.jobId}`).emit('job:update', job);
    io.to(`queue:${job.queueId}`).emit('queue:job-update', job);
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

const PORT = process.env.PORT || 3041;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Queue Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-queue support (Bull, RabbitMQ, Kafka)');
  console.log('- Indigenous priority handling');
  console.log('- Elder request prioritization');
  console.log('- Ceremony-aware scheduling');
  console.log('- Seven generations impact tracking');
  console.log('- Dead letter queue processing');
  console.log('- Rate limiting and circuit breakers');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});