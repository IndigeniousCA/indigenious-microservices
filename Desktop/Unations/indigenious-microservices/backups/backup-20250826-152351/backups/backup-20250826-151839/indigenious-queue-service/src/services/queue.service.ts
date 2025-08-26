import { PrismaClient, Prisma } from '@prisma/client';
import Bull from 'bull';
import { Queue as BullMQ, Worker as BullMQWorker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import * as amqp from 'amqplib';
import { Kafka, Producer, Consumer } from 'kafkajs';
import * as schedule from 'node-schedule';
import Bottleneck from 'bottleneck';
import { v4 as uuidv4 } from 'uuid';
import { differenceInSeconds, format } from 'date-fns';
import * as msgpack from 'msgpack-lite';
import winston from 'winston';

const prisma = new PrismaClient();

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'queue.log' })
  ]
});

export class QueueService {
  private bullQueues: Map<string, Bull.Queue> = new Map();
  private workers: Map<string, BullMQWorker> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private rabbitConnection: amqp.Connection | null = null;
  private kafkaProducer: Producer | null = null;
  private kafkaConsumer: Consumer | null = null;
  private redis: Redis;
  private rateLimiters: Map<string, Bottleneck> = new Map();
  
  // Indigenous priority weights
  private readonly ELDER_PRIORITY_BOOST = 3;
  private readonly CEREMONY_PRIORITY_BOOST = 2;
  private readonly INDIGENOUS_PRIORITY_BOOST = 1.5;
  
  // Worker configuration
  private readonly workerId = uuidv4();
  private readonly workerName = `worker-${process.env.HOSTNAME || 'local'}-${process.pid}`;
  
  constructor() {
    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3
    });
    
    // Initialize queue systems
    this.initializeQueues();
    this.startWorker();
    this.setupScheduledJobs();
  }
  
  // Initialize all queue systems
  private async initializeQueues() {
    // Get all active queues from database
    const queues = await prisma.queue.findMany({
      where: { active: true }
    });
    
    for (const queue of queues) {
      await this.createQueue(queue);
    }
    
    // Initialize RabbitMQ if configured
    if (process.env.RABBITMQ_URL) {
      await this.initializeRabbitMQ();
    }
    
    // Initialize Kafka if configured
    if (process.env.KAFKA_BROKERS) {
      await this.initializeKafka();
    }
  }
  
  // Create a new queue
  async createQueue(queueConfig: any): Promise<void> {
    const { queueName, queueType, concurrency, rateLimit } = queueConfig;
    
    switch (queueType) {
      case 'BULL':
        await this.createBullQueue(queueConfig);
        break;
      case 'RABBITMQ':
        await this.createRabbitQueue(queueConfig);
        break;
      case 'KAFKA':
        await this.createKafkaTopic(queueConfig);
        break;
      default:
        await this.createBullQueue(queueConfig);
    }
    
    // Setup rate limiter if configured
    if (rateLimit) {
      this.setupRateLimiter(queueName, rateLimit);
    }
  }
  
  // Create Bull queue
  private async createBullQueue(config: any): Promise<void> {
    const queue = new Bull(config.queueName, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: config.retryAttempts || 3,
        backoff: {
          type: 'exponential',
          delay: config.retryDelay || 5000
        }
      }
    });
    
    // Store queue reference
    this.bullQueues.set(config.queueName, queue);
    
    // Setup queue event handlers
    this.setupQueueEvents(queue, config.queueName);
    
    // Create worker for this queue
    await this.createWorker(config);
  }
  
  // Create worker for queue processing
  private async createWorker(config: any): Promise<void> {
    const { queueName, concurrency, timeout } = config;
    
    const worker = new BullMQWorker(
      queueName,
      async (job) => {
        return await this.processJob(job, config);
      },
      {
        connection: this.redis.duplicate(),
        concurrency: concurrency || 5,
        maxStalledCount: 3,
        stalledInterval: timeout || 30000
      }
    );
    
    // Store worker reference
    this.workers.set(queueName, worker);
    
    // Register worker in database
    await this.registerWorker(queueName);
  }
  
  // Process job with Indigenous priority handling
  private async processJob(job: any, queueConfig: any): Promise<any> {
    const startTime = Date.now();
    const jobData = job.data;
    
    try {
      // Update job status
      await this.updateJobStatus(job.id, 'PROCESSING');
      
      // Apply Indigenous priority handling
      if (jobData.elderRequest) {
        await this.handleElderPriority(job);
      }
      
      if (jobData.ceremonyRelated) {
        await this.handleCeremonyJob(job);
      }
      
      // Process based on job type
      const result = await this.executeJob(jobData, queueConfig);
      
      // Update job completion
      await this.updateJobStatus(job.id, 'COMPLETED', result);
      
      // Log processing time
      const duration = Date.now() - startTime;
      await this.logProcessing(job.id, 'SUCCESS', duration);
      
      // Trigger callbacks
      if (jobData.onCompleteCallback) {
        await this.triggerCallback(jobData.onCompleteCallback, result);
      }
      
      return result;
    } catch (error) {
      // Handle job failure
      await this.handleJobFailure(job, error as Error);
      throw error;
    }
  }
  
  // Add job to queue
  async addJob(queueName: string, jobData: any, options: any = {}): Promise<string> {
    const jobId = uuidv4();
    
    // Validate queue exists
    const queueConfig = await prisma.queue.findUnique({
      where: { queueName }
    });
    
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    // Apply rate limiting
    if (this.rateLimiters.has(queueName)) {
      await this.rateLimiters.get(queueName)!.schedule(() => Promise.resolve());
    }
    
    // Calculate priority with Indigenous boosts
    let priority = options.priority || 5;
    
    if (options.elderRequest) {
      priority += this.ELDER_PRIORITY_BOOST;
    }
    
    if (options.ceremonyRelated) {
      priority += this.CEREMONY_PRIORITY_BOOST;
    }
    
    if (options.indigenousJob) {
      priority += this.INDIGENOUS_PRIORITY_BOOST;
    }
    
    // Store job in database
    const job = await prisma.job.create({
      data: {
        jobId,
        queueId: queueConfig.id,
        type: jobData.type || 'DEFAULT',
        name: jobData.name || 'Unnamed Job',
        data: jobData,
        metadata: options.metadata,
        priority: Math.min(priority, 10), // Cap at 10
        scheduledAt: options.scheduledAt,
        delayUntil: options.delay ? new Date(Date.now() + options.delay) : undefined,
        indigenousJob: options.indigenousJob || false,
        elderRequest: options.elderRequest || false,
        ceremonyRelated: options.ceremonyRelated || false,
        nation: options.nation,
        community: options.community,
        culturalImportance: options.culturalImportance,
        generationalImpact: options.generationalImpact || false,
        impactScore: options.impactScore,
        dependsOn: options.dependsOn || [],
        onCompleteCallback: options.onCompleteCallback,
        onFailCallback: options.onFailCallback
      }
    });
    
    // Add to queue system
    const queue = this.bullQueues.get(queueName);
    if (queue) {
      await queue.add(jobId, jobData, {
        priority,
        delay: options.delay,
        attempts: queueConfig.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: queueConfig.retryDelay
        }
      });
    }
    
    // Log job creation
    logger.info(`Job ${jobId} added to queue ${queueName}`, {
      jobId,
      queueName,
      priority,
      indigenousJob: options.indigenousJob
    });
    
    return jobId;
  }
  
  // Bulk add jobs
  async addBulkJobs(queueName: string, jobs: any[]): Promise<string[]> {
    const jobIds: string[] = [];
    
    // Process in batches for efficiency
    const batchSize = 100;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(job => 
        this.addJob(queueName, job.data, job.options)
      );
      
      const batchIds = await Promise.all(batchPromises);
      jobIds.push(...batchIds);
    }
    
    return jobIds;
  }
  
  // Schedule job with Indigenous calendar awareness
  async scheduleJob(scheduleConfig: any): Promise<string> {
    const { name, scheduleType, cronExpression, jobData, queueName } = scheduleConfig;
    
    // Store scheduled job
    const scheduled = await prisma.scheduledJob.create({
      data: scheduleConfig
    });
    
    switch (scheduleType) {
      case 'CRON':
        this.scheduleCronJob(scheduled);
        break;
      case 'CEREMONY':
        await this.scheduleCeremonyJob(scheduled);
        break;
      case 'MOON_PHASE':
        await this.scheduleMoonPhaseJob(scheduled);
        break;
      case 'SEASONAL':
        await this.scheduleSeasonalJob(scheduled);
        break;
      default:
        this.scheduleCronJob(scheduled);
    }
    
    return scheduled.id;
  }
  
  // Schedule cron job
  private scheduleCronJob(scheduled: any): void {
    const job = schedule.scheduleJob(scheduled.name, scheduled.cronExpression, async () => {
      await this.addJob(scheduled.queueName, scheduled.jobData, {
        priority: scheduled.priority,
        indigenousJob: scheduled.indigenousCalendar,
        nation: scheduled.nation,
        territory: scheduled.territory
      });
      
      // Update last run time
      await prisma.scheduledJob.update({
        where: { id: scheduled.id },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 }
        }
      });
    });
  }
  
  // Schedule ceremony-based job
  private async scheduleCeremonyJob(scheduled: any): Promise<void> {
    // Get ceremony calendar
    const ceremonies = await this.getCeremonyDates(scheduled.ceremonyType);
    
    for (const ceremonyDate of ceremonies) {
      schedule.scheduleJob(ceremonyDate, async () => {
        await this.addJob(scheduled.queueName, {
          ...scheduled.jobData,
          ceremonyDate: ceremonyDate.toISOString()
        }, {
          priority: 10, // Highest priority for ceremonies
          ceremonyRelated: true,
          indigenousJob: true
        });
      });
    }
  }
  
  // Get job status
  async getJobStatus(jobId: string): Promise<any> {
    const job = await prisma.job.findUnique({
      where: { jobId },
      include: {
        queue: true,
        processLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    return {
      ...job,
      progress: await this.getJobProgress(jobId),
      estimatedCompletion: await this.estimateCompletion(job)
    };
  }
  
  // Cancel job
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await prisma.job.findUnique({
      where: { jobId },
      include: { queue: true }
    });
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Remove from queue
    const queue = this.bullQueues.get(job.queue.queueName);
    if (queue) {
      const bullJob = await queue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }
    
    // Update job status
    await prisma.job.update({
      where: { jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    });
    
    return true;
  }
  
  // Retry failed job
  async retryJob(jobId: string): Promise<boolean> {
    const job = await prisma.job.findUnique({
      where: { jobId },
      include: { queue: true }
    });
    
    if (!job || job.status !== 'FAILED') {
      throw new Error(`Job ${jobId} not found or not failed`);
    }
    
    // Re-add to queue
    await this.addJob(job.queue.queueName, job.data, {
      priority: job.priority,
      indigenousJob: job.indigenousJob,
      elderRequest: job.elderRequest,
      ceremonyRelated: job.ceremonyRelated
    });
    
    // Update retry count
    await prisma.job.update({
      where: { jobId },
      data: {
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
        status: 'PENDING'
      }
    });
    
    return true;
  }
  
  // Get queue metrics
  async getQueueMetrics(queueName: string): Promise<any> {
    const queue = this.bullQueues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);
    
    const dbMetrics = await prisma.queueMetrics.findFirst({
      where: {
        queue: { queueName },
        periodEnd: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      queueName,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed
      },
      metrics: dbMetrics,
      workers: await this.getQueueWorkers(queueName)
    };
  }
  
  // Dead letter queue handling
  async moveToDeadLetter(jobId: string, error: Error): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { jobId },
      include: { queue: true }
    });
    
    if (!job) return;
    
    // Create DLQ entry
    await prisma.deadLetterJob.create({
      data: {
        originalJobId: jobId,
        queueId: job.queue.id,
        jobData: job.data,
        jobMetadata: job.metadata,
        failureReason: error.message,
        failureCount: job.attempts,
        lastFailureAt: new Date(),
        errorDetails: {
          message: error.message,
          stack: error.stack
        },
        indigenousJob: job.indigenousJob,
        elderNotified: false,
        communityNotified: false
      }
    });
    
    // Notify if Indigenous job
    if (job.indigenousJob || job.elderRequest) {
      await this.notifyIndigenousCommunity(job, error);
    }
  }
  
  // Process dead letter queue
  async processDLQ(queueName: string): Promise<number> {
    const queue = await prisma.queue.findUnique({
      where: { queueName }
    });
    
    if (!queue) return 0;
    
    const dlqJobs = await prisma.deadLetterJob.findMany({
      where: {
        queueId: queue.id,
        canRetry: true,
        retriedAt: null
      },
      take: 100
    });
    
    let processedCount = 0;
    
    for (const dlqJob of dlqJobs) {
      try {
        // Re-add to queue
        await this.addJob(queueName, dlqJob.jobData, {
          priority: 10, // High priority for DLQ recovery
          metadata: {
            ...dlqJob.jobMetadata,
            dlqRecovery: true,
            originalJobId: dlqJob.originalJobId
          }
        });
        
        // Mark as retried
        await prisma.deadLetterJob.update({
          where: { id: dlqJob.id },
          data: {
            retriedAt: new Date(),
            canRetry: false
          }
        });
        
        processedCount++;
      } catch (error) {
        logger.error(`Failed to process DLQ job ${dlqJob.originalJobId}`, error);
      }
    }
    
    return processedCount;
  }
  
  // Helper methods
  private async handleElderPriority(job: any): Promise<void> {
    // Special handling for Elder requests
    logger.info(`Processing Elder priority job ${job.id}`);
    
    // Ensure immediate processing
    job.opts.priority = 10;
    
    // Log Elder request
    await this.logProcessing(job.id, 'ELDER_PRIORITY', 0);
  }
  
  private async handleCeremonyJob(job: any): Promise<void> {
    // Special handling for ceremony-related jobs
    logger.info(`Processing ceremony job ${job.id}`);
    
    // Check ceremony calendar
    const isceremonyTime = await this.checkCeremonyCalendar();
    
    if (!isceremonyTime) {
      // Delay until appropriate time
      throw new Error('Job delayed until ceremony time');
    }
  }
  
  private async executeJob(jobData: any, config: any): Promise<any> {
    // Actual job execution logic
    // This would be customized based on job type
    
    return {
      success: true,
      result: jobData,
      timestamp: new Date()
    };
  }
  
  private async updateJobStatus(jobId: string, status: string, result?: any): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'PROCESSING') {
      updateData.processedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.result = result;
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
    }
    
    await prisma.job.update({
      where: { jobId },
      data: updateData
    });
  }
  
  private async handleJobFailure(job: any, error: Error): Promise<void> {
    await this.updateJobStatus(job.id, 'FAILED');
    
    await prisma.job.update({
      where: { jobId: job.id },
      data: {
        error: error.message,
        errorStack: error.stack,
        attempts: { increment: 1 }
      }
    });
    
    // Move to DLQ if max retries exceeded
    const jobData = await prisma.job.findUnique({
      where: { jobId: job.id },
      include: { queue: true }
    });
    
    if (jobData && jobData.attempts >= jobData.queue.maxRetries) {
      await this.moveToDeadLetter(job.id, error);
    }
    
    // Trigger failure callback
    if (job.data.onFailCallback) {
      await this.triggerCallback(job.data.onFailCallback, error);
    }
  }
  
  private async logProcessing(jobId: string, level: string, duration: number): Promise<void> {
    await prisma.processLog.create({
      data: {
        jobId,
        workerId: this.workerId,
        level,
        message: `Job ${jobId} processed`,
        duration,
        timestamp: new Date()
      }
    });
  }
  
  private async triggerCallback(callback: string, data: any): Promise<void> {
    try {
      // If URL, make HTTP request
      if (callback.startsWith('http')) {
        await fetch(callback, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (error) {
      logger.error(`Failed to trigger callback ${callback}`, error);
    }
  }
  
  private setupRateLimiter(queueName: string, limit: number): void {
    const limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 60000 / limit // Convert to ms per request
    });
    
    this.rateLimiters.set(queueName, limiter);
  }
  
  private setupQueueEvents(queue: Bull.Queue, queueName: string): void {
    queue.on('completed', async (job, result) => {
      await this.recordEvent('JOB_COMPLETED', { jobId: job.id, result });
    });
    
    queue.on('failed', async (job, error) => {
      await this.recordEvent('JOB_FAILED', { jobId: job.id, error: error.message });
    });
    
    queue.on('stalled', async (job) => {
      await this.recordEvent('JOB_STALLED', { jobId: job.id });
    });
  }
  
  private async recordEvent(eventType: string, eventData: any): Promise<void> {
    await prisma.queueEvent.create({
      data: {
        eventType,
        eventData,
        queueName: eventData.queueName,
        jobId: eventData.jobId,
        workerId: this.workerId
      }
    });
  }
  
  private async registerWorker(queueName: string): Promise<void> {
    await prisma.worker.upsert({
      where: { workerId: this.workerId },
      create: {
        workerId: this.workerId,
        workerName: this.workerName,
        hostname: process.env.HOSTNAME || 'localhost',
        pid: process.pid,
        queues: [queueName],
        concurrency: 5,
        status: 'IDLE'
      },
      update: {
        queues: { push: queueName },
        lastHeartbeat: new Date()
      }
    });
  }
  
  private async startWorker(): Promise<void> {
    // Worker heartbeat
    setInterval(async () => {
      await prisma.worker.update({
        where: { workerId: this.workerId },
        data: { lastHeartbeat: new Date() }
      });
    }, 30000); // Every 30 seconds
  }
  
  private async setupScheduledJobs(): Promise<void> {
    const scheduledJobs = await prisma.scheduledJob.findMany({
      where: { enabled: true, paused: false }
    });
    
    for (const job of scheduledJobs) {
      if (job.scheduleType === 'CRON') {
        this.scheduleCronJob(job);
      }
    }
  }
  
  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL!);
      logger.info('RabbitMQ connected');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
    }
  }
  
  private async initializeKafka(): Promise<void> {
    const kafka = new Kafka({
      clientId: 'indigenous-queue-service',
      brokers: process.env.KAFKA_BROKERS!.split(',')
    });
    
    this.kafkaProducer = kafka.producer();
    this.kafkaConsumer = kafka.consumer({ groupId: 'indigenous-queue-group' });
    
    await this.kafkaProducer.connect();
    await this.kafkaConsumer.connect();
    
    logger.info('Kafka connected');
  }
  
  private async createRabbitQueue(config: any): Promise<void> {
    if (!this.rabbitConnection) return;
    
    const channel = await this.rabbitConnection.createChannel();
    await channel.assertQueue(config.queueName, {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-message-ttl': config.retentionPeriod * 24 * 60 * 60 * 1000
      }
    });
  }
  
  private async createKafkaTopic(config: any): Promise<void> {
    // Kafka topic creation would be handled by admin tools
    logger.info(`Kafka topic ${config.queueName} should be created`);
  }
  
  private async getCeremonyDates(ceremonyType: string): Promise<Date[]> {
    // This would integrate with ceremony calendar service
    return [];
  }
  
  private async scheduleMoonPhaseJob(scheduled: any): Promise<void> {
    // Calculate next moon phase dates
    // This would integrate with astronomical calculations
  }
  
  private async scheduleSeasonalJob(scheduled: any): Promise<void> {
    // Schedule based on seasons
    // This would integrate with seasonal calendar
  }
  
  private async checkCeremonyCalendar(): Promise<boolean> {
    // Check if current time is appropriate for ceremony
    return true;
  }
  
  private async notifyIndigenousCommunity(job: any, error: Error): Promise<void> {
    // Send notification to community members about failed Indigenous job
    logger.info(`Notifying community about failed job ${job.jobId}`);
  }
  
  private async getJobProgress(jobId: string): Promise<number> {
    // Get job progress from queue system
    return 0;
  }
  
  private async estimateCompletion(job: any): Promise<Date | null> {
    // Estimate job completion time based on queue metrics
    return null;
  }
  
  private async getQueueWorkers(queueName: string): Promise<any[]> {
    return await prisma.worker.findMany({
      where: {
        queues: { has: queueName },
        active: true
      }
    });
  }
}