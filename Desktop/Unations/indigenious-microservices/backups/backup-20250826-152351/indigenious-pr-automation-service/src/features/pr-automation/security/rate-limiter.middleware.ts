/**
 * Nuclear-Grade Rate Limiting Middleware
 * Advanced rate limiting with multiple strategies and DDoS protection
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '@/lib/redis';
import { SecurityMonitor } from './security-monitor';
import { AuditLogger } from './audit-logger';
import crypto from 'crypto';

interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds
  execEvenly?: boolean; // Spread requests evenly
  keyPrefix?: string;
  customKey?: (req: Request) => string;
}

interface DynamicRateLimit {
  basePoints: number;
  riskMultiplier: number;
  burstAllowance: number;
  adaptiveThreshold: boolean;
}

export class RateLimiterMiddleware {
  private static instance: RateLimiterMiddleware;
  private securityMonitor = SecurityMonitor.getInstance();
  private auditLogger = AuditLogger.getInstance();
  
  // Rate limiters for different endpoints
  private limiters: Map<string, RateLimiterRedis> = new Map();
  
  // DDoS protection
  private ddosProtection: RateLimiterRedis;
  private connectionLimiter: RateLimiterRedis;
  
  // Configuration
  private readonly configs: Record<string, RateLimitConfig> = {
    // General API
    'api:general': {
      points: 100,
      duration: 60, // 100 requests per minute
      blockDuration: 300 // 5 minute block
    },
    
    // Authentication
    'auth:login': {
      points: 5,
      duration: 900, // 5 attempts per 15 minutes
      blockDuration: 3600, // 1 hour block
      execEvenly: true
    },
    
    'auth:register': {
      points: 3,
      duration: 3600, // 3 registrations per hour
      blockDuration: 86400 // 24 hour block
    },
    
    'auth:password_reset': {
      points: 3,
      duration: 3600, // 3 resets per hour
      blockDuration: 3600
    },
    
    // PR Operations (strict)
    'pr:create_operation': {
      points: 5,
      duration: 3600, // 5 operations per hour
      blockDuration: 86400 // 24 hour block
    },
    
    'pr:execute_operation': {
      points: 10,
      duration: 86400, // 10 executions per day
      blockDuration: 86400
    },
    
    // Content generation
    'content:generate': {
      points: 50,
      duration: 3600, // 50 per hour
      blockDuration: 3600
    },
    
    'content:bulk': {
      points: 10,
      duration: 86400, // 10 bulk operations per day
      blockDuration: 86400
    },
    
    // Search and monitoring
    'search:query': {
      points: 100,
      duration: 60, // 100 searches per minute
      blockDuration: 300
    },
    
    'monitor:news': {
      points: 30,
      duration: 60, // 30 checks per minute
      blockDuration: 600
    }
  };
  
  private constructor() {
    this.initializeRateLimiters();
    this.initializeDDoSProtection();
  }
  
  static getInstance(): RateLimiterMiddleware {
    if (!this.instance) {
      this.instance = new RateLimiterMiddleware();
    }
    return this.instance;
  }

  /**
   * Create rate limiter for specific endpoint
   */
  createLimiter(
    name: string,
    config: RateLimitConfig
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    // Create limiter if not exists
    if (!this.limiters.has(name)) {
      this.limiters.set(name, new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: config.keyPrefix || `rl:${name}:`,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || 0,
        execEvenly: config.execEvenly || false,
        insuranceLimiter: new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: `rl:insurance:${name}:`,
          points: config.points * 2,
          duration: config.duration * 2
        })
      }));
    }
    
    const limiter = this.limiters.get(name)!;
    
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate key
        const key = config.customKey ? config.customKey(req) : this.getKey(req);
        
        // Check DDoS protection first
        const ddosCheck = await this.checkDDoSProtection(req);
        if (!ddosCheck.allowed) {
          return this.handleDDoSBlock(req, res);
        }
        
        // Dynamic rate adjustment based on risk
        const riskScore = await this.calculateRiskScore(req);
        const adjustedPoints = Math.max(1, Math.floor(config.points * (1 - riskScore)));
        
        // Consume points
        const rateLimiterRes = await limiter.consume(key, 1, {
          customDuration: riskScore > 0.7 ? config.duration * 2 : undefined
        });
        
        // Set rate limit headers
        this.setRateLimitHeaders(res, rateLimiterRes, config);
        
        // Log if approaching limit
        if (rateLimiterRes.remainingPoints < config.points * 0.2) {
          await this.logApproachingLimit(name, key, rateLimiterRes);
        }
        
        next();
      } catch (rateLimiterRes) {
        if (rateLimiterRes instanceof RateLimiterRes) {
          await this.handleRateLimitExceeded(req, res, name, rateLimiterRes);
        } else {
          // Redis error - fail open but log
          await this.handleRateLimiterError(name, rateLimiterRes);
          next();
        }
      }
    };
  }

  /**
   * Global rate limiter
   */
  global(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return this.createLimiter('api:general', this.configs['api:general']);
  }

  /**
   * Authentication rate limiter
   */
  auth(
    type: 'login' | 'register' | 'password_reset' = 'login'
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return this.createLimiter(`auth:${type}`, this.configs[`auth:${type}`]);
  }

  /**
   * PR operations rate limiter
   */
  prOperations(
    type: 'create' | 'execute' = 'create'
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const configKey = type === 'create' ? 'pr:create_operation' : 'pr:execute_operation';
    
    // Custom key including user ID for PR operations
    const config = {
      ...this.configs[configKey],
      customKey: (req: Request) => {
        const userId = (req as unknown).user?.id || 'anonymous';
        return `${userId}:${req.ip}`;
      }
    };
    
    return this.createLimiter(configKey, config);
  }

  /**
   * Content generation rate limiter
   */
  content(
    bulk: boolean = false
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const configKey = bulk ? 'content:bulk' : 'content:generate';
    return this.createLimiter(configKey, this.configs[configKey]);
  }

  /**
   * Dynamic rate limiter based on user behavior
   */
  dynamic(
    baseConfig: DynamicRateLimit
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKey(req);
        const riskScore = await this.calculateRiskScore(req);
        
        // Adjust limits based on risk
        const points = Math.floor(
          baseConfig.basePoints * (1 - riskScore * baseConfig.riskMultiplier)
        );
        
        // Create dynamic limiter
        const dynamicConfig: RateLimitConfig = {
          points: Math.max(1, points),
          duration: 60,
          blockDuration: riskScore > 0.8 ? 3600 : 300
        };
        
        const limiter = this.createLimiter(
          `dynamic:${crypto.randomBytes(4).toString('hex')}`,
          dynamicConfig
        );
        
        await limiter(req, res, next);
      } catch (error) {
        await this.handleRateLimiterError('dynamic', error);
        next();
      }
    };
  }

  /**
   * Distributed rate limiting for microservices
   */
  distributed(
    service: string,
    config: RateLimitConfig
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const distributedConfig = {
      ...config,
      keyPrefix: `rl:dist:${service}:`,
      customKey: (req: Request) => {
        // Include service identifier in key
        const userId = (req as unknown).user?.id || 'anonymous';
        return `${service}:${userId}:${req.ip}`;
      }
    };
    
    return this.createLimiter(`dist:${service}`, distributedConfig);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(
    limiterName: string,
    key: string
  ): Promise<{
    remainingPoints: number;
    msBeforeNext: number;
    consumedPoints: number;
    isBlocked: boolean;
  }> {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      throw new Error(`Limiter ${limiterName} not found`);
    }
    
    const res = await limiter.get(key);
    
    return {
      remainingPoints: res ? res.remainingPoints : limiter.points,
      msBeforeNext: res ? res.msBeforeNext : 0,
      consumedPoints: res ? res.consumedPoints : 0,
      isBlocked: res ? res.remainingPoints <= 0 : false
    };
  }

  /**
   * Reset rate limit for specific key
   */
  async reset(limiterName: string, key: string): Promise<void> {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      throw new Error(`Limiter ${limiterName} not found`);
    }
    
    await limiter.delete(key);
    
    await this.auditLogger.logSecurity({
      event: 'rate_limit_reset',
      details: { limiter: limiterName, key }
    });
  }

  /**
   * Private helper methods
   */
  private initializeRateLimiters(): void {
    // Pre-create common limiters
    Object.entries(this.configs).forEach(([name, config]) => {
      this.createLimiter(name, config);
    });
  }

  private initializeDDoSProtection(): void {
    // DDoS protection - very strict
    this.ddosProtection = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:ddos:',
      points: 1000, // 1000 requests
      duration: 60, // per minute
      blockDuration: 3600 // 1 hour block
    });
    
    // Connection limiter
    this.connectionLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:conn:',
      points: 10, // 10 connections
      duration: 1, // per second
      blockDuration: 60 // 1 minute block
    });
  }

  private getKey(req: Request): string {
    // Multi-factor key generation
    const factors = [
      req.ip,
      (req as unknown).user?.id || 'anonymous',
      req.get('user-agent')?.substring(0, 50) || 'unknown'
    ];
    
    return crypto
      .createHash('sha256')
      .update(factors.join(':'))
      .digest('hex')
      .substring(0, 32);
  }

  private async calculateRiskScore(req: Request): Promise<number> {
    let score = 0;
    
    // Check IP reputation
    const ipRisk = await this.securityMonitor.checkIpReputation(req.ip);
    score += ipRisk * 0.4;
    
    // Check if authenticated
    if (!(req as unknown).user) {
      score += 0.2;
    }
    
    // Check user agent
    const ua = req.get('user-agent') || '';
    if (!ua || ua.length < 10) {
      score += 0.1;
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
    const headerCount = suspiciousHeaders.filter(h => req.get(h)).length;
    if (headerCount > 1) {
      score += 0.1;
    }
    
    // Check request patterns
    const recentRequests = await this.getRecentRequestCount(req.ip);
    if (recentRequests > 500) {
      score += 0.2;
    }
    
    return Math.min(score, 1);
  }

  private async checkDDoSProtection(req: Request): Promise<{ allowed: boolean }> {
    try {
      await this.ddosProtection.consume(req.ip);
      await this.connectionLimiter.consume(req.ip);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  }

  private setRateLimitHeaders(
    res: Response,
    rateLimiterRes: RateLimiterRes,
    config: RateLimitConfig
  ): void {
    res.setHeader('X-RateLimit-Limit', config.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    if (rateLimiterRes.remainingPoints < config.points * 0.2) {
      res.setHeader('X-RateLimit-Warning', 'Approaching rate limit');
    }
  }

  private async handleRateLimitExceeded(
    req: Request,
    res: Response,
    limiterName: string,
    rateLimiterRes: RateLimiterRes
  ): Promise<void> {
    // Log rate limit exceeded
    await this.auditLogger.logSecurity({
      event: 'rate_limit_exceeded',
      details: {
        limiter: limiterName,
        ip: req.ip,
        userId: (req as unknown).user?.id,
        path: req.path
      }
    });
    
    // Alert if suspicious pattern
    const recentExceeds = await this.getRecentExceedCount(req.ip);
    if (recentExceeds > 5) {
      await this.securityMonitor.alertSecurityTeam({
        type: 'rate_limit_abuse',
        details: {
          ip: req.ip,
          limiter: limiterName,
          exceeds: recentExceeds
        }
      });
    }
    
    // Set retry after header
    res.setHeader('Retry-After', Math.round(rateLimiterRes.msBeforeNext / 1000));
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: rateLimiterRes.msBeforeNext
    });
  }

  private async handleDDoSBlock(req: Request, res: Response): Promise<void> {
    await this.securityMonitor.alertSecurityTeam({
      type: 'ddos_attack',
      severity: 'critical',
      details: {
        ip: req.ip,
        path: req.path,
        headers: req.headers
      }
    });
    
    res.status(503).json({
      error: 'Service temporarily unavailable'
    });
  }

  private async logApproachingLimit(
    limiterName: string,
    key: string,
    rateLimiterRes: RateLimiterRes
  ): Promise<void> {
    await this.auditLogger.logSecurity({
      event: 'rate_limit_warning',
      details: {
        limiter: limiterName,
        key: key.substring(0, 8) + '...',
        remaining: rateLimiterRes.remainingPoints,
        consumed: rateLimiterRes.consumedPoints
      }
    });
  }

  private async handleRateLimiterError(limiterName: string, error: Error | unknown): Promise<void> {
    await this.auditLogger.logError({
      action: 'rate_limiter_error',
      error: error.message || 'Unknown error',
      stack: error.stack
    });
  }

  private async getRecentRequestCount(ip: string): Promise<number> {
    const key = `recent:${ip}`;
    const count = await redis.get(key);
    return count ? parseInt(count) : 0;
  }

  private async getRecentExceedCount(ip: string): Promise<number> {
    const key = `exceed:${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 3600); // 1 hour
    }
    
    return count;
  }
}

export const rateLimiter = RateLimiterMiddleware.getInstance();