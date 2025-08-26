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

// Cache helpers
export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  await redis.setex(`rfq:cache:${key}`, ttl, JSON.stringify(value));
}

export async function getCache(key: string): Promise<any | null> {
  const data = await redis.get(`rfq:cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(`rfq:cache:${pattern}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// RFQ-specific cache helpers
export async function cacheRFQ(rfqId: string, data: any, ttl: number = 600): Promise<void> {
  await setCache(`rfq:${rfqId}`, data, ttl);
}

export async function getCachedRFQ(rfqId: string): Promise<any | null> {
  return await getCache(`rfq:${rfqId}`);
}

export async function invalidateRFQCache(rfqId: string): Promise<void> {
  await redis.del(`rfq:cache:rfq:${rfqId}`);
}

// Bid caching
export async function cacheBid(bidId: string, data: any, ttl: number = 300): Promise<void> {
  await setCache(`bid:${bidId}`, data, ttl);
}

export async function getCachedBid(bidId: string): Promise<any | null> {
  return await getCache(`bid:${bidId}`);
}

// RFQ matching cache
export async function cacheRFQMatches(businessId: string, matches: any[], ttl: number = 300): Promise<void> {
  await setCache(`matches:${businessId}`, matches, ttl);
}

export async function getCachedRFQMatches(businessId: string): Promise<any[] | null> {
  return await getCache(`matches:${businessId}`);
}

// Real-time bid tracking
export async function trackBidSubmission(rfqId: string, bidId: string): Promise<void> {
  await redis.sadd(`rfq:${rfqId}:bids`, bidId);
  await redis.expire(`rfq:${rfqId}:bids`, 86400); // 24 hours
}

export async function getBidCount(rfqId: string): Promise<number> {
  return await redis.scard(`rfq:${rfqId}:bids`);
}

// Rate limiting for bid submissions
export async function checkBidRateLimit(businessId: string, window: number = 3600): Promise<boolean> {
  const key = `bid:rate:${businessId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, window);
  }
  return count <= 10; // Max 10 bids per hour
}