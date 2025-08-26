import { Router } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';
import { checkProvidersHealth } from '../config/providers';
import { getQueueMetrics } from '../config/queue';

const router = Router();

// Basic health check
router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const [database, redis, providers, queues] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkProvidersHealth(),
      getQueueMetrics(),
    ]);

    const healthy = database && redis;
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      checks: {
        database,
        redis,
        providers,
        queues: {
          email: queues.email.active > -1,
          sms: queues.sms.active > -1,
          push: queues.push.active > -1,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    const database = await checkDatabaseHealth();
    const redis = await checkRedisHealth();
    
    if (database && redis) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

export default router;