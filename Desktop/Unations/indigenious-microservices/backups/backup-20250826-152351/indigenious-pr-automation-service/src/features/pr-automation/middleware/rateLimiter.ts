import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/monitoring/logger';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// General rate limiter - 100 requests per 15 minutes
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),
  analytics: true,
  prefix: 'pr:general',
});

// Strict limiter for sensitive operations - 10 requests per hour
export const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true,
  prefix: 'pr:strict',
});

// Content generation limiter - 50 requests per hour
export const contentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 h'),
  analytics: true,
  prefix: 'pr:content',
});

// Crisis response limiter - 20 requests per hour
export const crisisLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'pr:crisis',
});

// Per-user rate limiting
export function userRateLimiter(maxRequests: number = 50, window: string = '15 m') {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    analytics: true,
    prefix: 'pr:user',
  });
}

// Rate limit middleware
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  identifier?: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  try {
    // Get identifier (user ID or IP)
    const id = identifier || 
      request.headers.get('x-user-id') || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'anonymous';
    
    const { success, limit, reset, remaining } = await limiter.limit(id);
    
    if (!success) {
      logger.warn('Rate limit exceeded:', {
        identifier: id,
        limit,
        reset,
        path: request.nextUrl.pathname
      });
    }
    
    return { success, limit, remaining, reset };
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    // Allow request on error to prevent service disruption
    return { success: true };
  }
}

// Apply rate limit to response
export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimitInfo: { limit?: number; remaining?: number; reset?: number }
): NextResponse {
  if (rateLimitInfo.limit) {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  }
  if (rateLimitInfo.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  }
  if (rateLimitInfo.reset) {
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
  }
  
  return response;
}

// Middleware wrapper for rate limiting
export function withRateLimit(
  limiter: Ratelimit,
  options?: { 
    identifier?: (req: NextRequest) => string;
    skipAuth?: boolean;
    customMessage?: string;
  }
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = options?.identifier?.(request);
    const rateLimitInfo = await checkRateLimit(request, limiter, identifier);
    
    if (!rateLimitInfo.success) {
      const response = NextResponse.json(
        { 
          error: options?.customMessage || 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitInfo.reset 
        },
        { status: 429 }
      );
      
      return applyRateLimitHeaders(response, rateLimitInfo);
    }
    
    return null;
  };
}

// Distributed rate limiting for operations
export class DistributedRateLimiter {
  private limiters: Map<string, Ratelimit> = new Map();
  
  constructor() {
    // Initialize operation-specific limiters
    this.limiters.set('false_flag', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '24 h'), // 1 per day
      analytics: true,
      prefix: 'pr:op:falseflag',
    }));
    
    this.limiters.set('crisis_exploit', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 per hour
      analytics: true,
      prefix: 'pr:op:crisis',
    }));
    
    this.limiters.set('narrative_campaign', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '6 h'), // 3 per 6 hours
      analytics: true,
      prefix: 'pr:op:narrative',
    }));
  }
  
  async checkOperationLimit(
    operation: string,
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limiter = this.limiters.get(operation);
    
    if (!limiter) {
      return { allowed: true };
    }
    
    const { success, reset } = await limiter.limit(userId);
    
    if (!success) {
      const resetDate = new Date(reset);
      return { 
        allowed: false, 
        reason: `Operation limit reached. Try again after ${resetDate.toLocaleString()}`
      };
    }
    
    return { allowed: true };
  }
}

export const distributedLimiter = new DistributedRateLimiter();