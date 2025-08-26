import Bull from 'bull';
import { logger } from '../utils/logger';
import { redis } from './redis';
import EmailService from '../services/email.service';
import SMSService from '../services/sms.service';
import PushService from '../services/push.service';
import PreferenceService from '../services/preference.service';

// Queue configuration
const queueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues
const emailQueue = new Bull('email-notifications', queueOptions);
const smsQueue = new Bull('sms-notifications', queueOptions);
const pushQueue = new Bull('push-notifications', queueOptions);
const digestQueue = new Bull('digest-notifications', queueOptions);

// Process email notifications
emailQueue.process(async (job) => {
  const { data } = job;
  logger.info('Processing email job', { jobId: job.id });

  try {
    // Check user preferences
    if (data.userId) {
      const shouldSend = await PreferenceService.shouldNotify(
        data.userId,
        'email',
        data.category || 'general'
      );

      if (!shouldSend) {
        logger.info('Email skipped due to preferences', { userId: data.userId });
        return { skipped: true, reason: 'user_preferences' };
      }
    }

    // Send email
    const result = await EmailService.sendEmail(data);
    
    logger.info('Email job completed', { jobId: job.id, result });
    return result;
  } catch (error) {
    logger.error('Email job failed', { jobId: job.id, error });
    throw error;
  }
});

// Process SMS notifications
smsQueue.process(async (job) => {
  const { data } = job;
  logger.info('Processing SMS job', { jobId: job.id });

  try {
    // Check user preferences
    if (data.userId) {
      const shouldSend = await PreferenceService.shouldNotify(
        data.userId,
        'sms',
        data.category || 'general'
      );

      if (!shouldSend) {
        logger.info('SMS skipped due to preferences', { userId: data.userId });
        return { skipped: true, reason: 'user_preferences' };
      }
    }

    // Send SMS
    const result = await SMSService.sendSMS(data);
    
    logger.info('SMS job completed', { jobId: job.id, result });
    return result;
  } catch (error) {
    logger.error('SMS job failed', { jobId: job.id, error });
    throw error;
  }
});

// Process push notifications
pushQueue.process(async (job) => {
  const { data } = job;
  logger.info('Processing push job', { jobId: job.id });

  try {
    // Check user preferences
    if (data.userId) {
      const shouldSend = await PreferenceService.shouldNotify(
        data.userId,
        'push',
        data.category || 'general'
      );

      if (!shouldSend) {
        logger.info('Push skipped due to preferences', { userId: data.userId });
        return { skipped: true, reason: 'user_preferences' };
      }
    }

    // Send push notification
    const result = await PushService.sendPushNotification(data);
    
    logger.info('Push job completed', { jobId: job.id, result });
    return result;
  } catch (error) {
    logger.error('Push job failed', { jobId: job.id, error });
    throw error;
  }
});

// Process digest notifications
digestQueue.process(async (job) => {
  const { data } = job;
  logger.info('Processing digest job', { jobId: job.id });

  try {
    const { userId, period } = data;
    
    // Create digest
    const digest = await PreferenceService.createDigest(userId, period);
    
    if (!digest) {
      logger.info('No notifications for digest', { userId, period });
      return { skipped: true, reason: 'no_notifications' };
    }

    // Get user preferences
    const preferences = await PreferenceService.getUserPreferences(userId);
    if (!preferences) {
      logger.warn('No preferences found for digest', { userId });
      return { skipped: true, reason: 'no_preferences' };
    }

    // Send digest email
    const result = await EmailService.sendEmail({
      to: data.email,
      subject: `Your ${period} notification digest`,
      template: `digest_${period}`,
      templateData: {
        digest,
        language: preferences.language,
      },
      metadata: {
        type: 'digest',
        period,
        userId,
      },
    });

    logger.info('Digest job completed', { jobId: job.id, userId, period });
    return result;
  } catch (error) {
    logger.error('Digest job failed', { jobId: job.id, error });
    throw error;
  }
});

// Error handlers
emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

smsQueue.on('failed', (job, err) => {
  logger.error('SMS job failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

pushQueue.on('failed', (job, err) => {
  logger.error('Push job failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

// Stalled job handlers
emailQueue.on('stalled', (job) => {
  logger.warn('Email job stalled', { jobId: job.id });
});

smsQueue.on('stalled', (job) => {
  logger.warn('SMS job stalled', { jobId: job.id });
});

pushQueue.on('stalled', (job) => {
  logger.warn('Push job stalled', { jobId: job.id });
});

/**
 * Add job to queue
 */
export async function addJob(
  queue: 'sendEmail' | 'sendSMS' | 'sendPush' | 'sendDigest',
  data: any,
  options?: Bull.JobOptions
): Promise<Bull.Job> {
  const queueMap = {
    sendEmail: emailQueue,
    sendSMS: smsQueue,
    sendPush: pushQueue,
    sendDigest: digestQueue,
  };

  const selectedQueue = queueMap[queue];
  if (!selectedQueue) {
    throw new Error(`Unknown queue: ${queue}`);
  }

  const job = await selectedQueue.add(data, {
    ...queueOptions.defaultJobOptions,
    ...options,
  });

  logger.info('Job added to queue', { queue, jobId: job.id });
  return job;
}

/**
 * Bulk add jobs
 */
export async function bulkAddJobs(
  queue: 'sendEmail' | 'sendSMS' | 'sendPush',
  jobs: Array<{ data: any; opts?: Bull.JobOptions }>
): Promise<Bull.Job[]> {
  const queueMap = {
    sendEmail: emailQueue,
    sendSMS: smsQueue,
    sendPush: pushQueue,
  };

  const selectedQueue = queueMap[queue];
  if (!selectedQueue) {
    throw new Error(`Unknown queue: ${queue}`);
  }

  const bulkJobs = jobs.map(job => ({
    data: job.data,
    opts: {
      ...queueOptions.defaultJobOptions,
      ...job.opts,
    },
  }));

  const addedJobs = await selectedQueue.addBulk(bulkJobs);
  
  logger.info('Bulk jobs added to queue', {
    queue,
    count: addedJobs.length,
  });

  return addedJobs;
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics(): Promise<{
  email: any;
  sms: any;
  push: any;
  digest: any;
}> {
  const [
    emailCounts,
    smsCounts,
    pushCounts,
    digestCounts,
  ] = await Promise.all([
    emailQueue.getJobCounts(),
    smsQueue.getJobCounts(),
    pushQueue.getJobCounts(),
    digestQueue.getJobCounts(),
  ]);

  return {
    email: {
      ...emailCounts,
      name: 'email-notifications',
    },
    sms: {
      ...smsCounts,
      name: 'sms-notifications',
    },
    push: {
      ...pushCounts,
      name: 'push-notifications',
    },
    digest: {
      ...digestCounts,
      name: 'digest-notifications',
    },
  };
}

/**
 * Clean old jobs
 */
export async function cleanOldJobs(
  olderThan: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<void> {
  const queues = [emailQueue, smsQueue, pushQueue, digestQueue];
  
  for (const queue of queues) {
    try {
      await queue.clean(olderThan, 'completed');
      await queue.clean(olderThan, 'failed');
      logger.info(`Cleaned old jobs from ${queue.name}`);
    } catch (error) {
      logger.error(`Failed to clean ${queue.name}`, error);
    }
  }
}

/**
 * Pause queue
 */
export async function pauseQueue(
  queue: 'email' | 'sms' | 'push' | 'digest'
): Promise<void> {
  const queueMap = {
    email: emailQueue,
    sms: smsQueue,
    push: pushQueue,
    digest: digestQueue,
  };

  const selectedQueue = queueMap[queue];
  if (!selectedQueue) {
    throw new Error(`Unknown queue: ${queue}`);
  }

  await selectedQueue.pause();
  logger.info(`Queue paused: ${queue}`);
}

/**
 * Resume queue
 */
export async function resumeQueue(
  queue: 'email' | 'sms' | 'push' | 'digest'
): Promise<void> {
  const queueMap = {
    email: emailQueue,
    sms: smsQueue,
    push: pushQueue,
    digest: digestQueue,
  };

  const selectedQueue = queueMap[queue];
  if (!selectedQueue) {
    throw new Error(`Unknown queue: ${queue}`);
  }

  await selectedQueue.resume();
  logger.info(`Queue resumed: ${queue}`);
}

/**
 * Schedule recurring digest jobs
 */
export async function scheduleDigests(): Promise<void> {
  try {
    // Schedule daily digests at 9 AM
    await digestQueue.add(
      'daily-digest',
      { period: 'daily' },
      {
        repeat: {
          cron: '0 9 * * *', // Every day at 9 AM
        },
      }
    );

    // Schedule weekly digests on Monday at 9 AM
    await digestQueue.add(
      'weekly-digest',
      { period: 'weekly' },
      {
        repeat: {
          cron: '0 9 * * 1', // Every Monday at 9 AM
        },
      }
    );

    logger.info('Digest jobs scheduled');
  } catch (error) {
    logger.error('Failed to schedule digest jobs', error);
  }
}

/**
 * Initialize queue system
 */
export async function initializeQueue(): Promise<void> {
  try {
    // Test Redis connection
    await emailQueue.isReady();
    await smsQueue.isReady();
    await pushQueue.isReady();
    await digestQueue.isReady();

    // Schedule recurring jobs
    await scheduleDigests();

    // Clean old jobs periodically
    setInterval(() => {
      cleanOldJobs();
    }, 24 * 60 * 60 * 1000); // Daily

    logger.info('Queue system initialized');
  } catch (error) {
    logger.error('Failed to initialize queue system', error);
    throw error;
  }
}

/**
 * Gracefully shutdown queues
 */
export async function shutdownQueues(): Promise<void> {
  try {
    await Promise.all([
      emailQueue.close(),
      smsQueue.close(),
      pushQueue.close(),
      digestQueue.close(),
    ]);
    
    logger.info('Queues shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down queues', error);
  }
}

// Export queue instances for advanced usage
export {
  emailQueue,
  smsQueue,
  pushQueue,
  digestQueue,
};

export default {
  addJob,
  bulkAddJobs,
  getQueueMetrics,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
  scheduleDigests,
  initializeQueue,
  shutdownQueues,
};