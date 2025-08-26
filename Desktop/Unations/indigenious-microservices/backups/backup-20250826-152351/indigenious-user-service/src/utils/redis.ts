import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis;

export async function initializeRedis(): Promise<void> {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('❌ Redis error:', error);
    });

    // Test the connection
    await redis.ping();
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
}

// Session management helpers
export async function setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
}

export async function getSession(sessionId: string): Promise<any | null> {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

// Rate limiting helpers
export async function incrementRateLimit(key: string, window: number = 60): Promise<number> {
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, window);
  const results = await multi.exec();
  return results?.[0]?.[1] as number || 0;
}

// Cache helpers
export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
}

export async function getCache(key: string): Promise<any | null> {
  const data = await redis.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(`cache:${pattern}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}