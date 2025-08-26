# PR Automation Security Implementation Guide

## Overview
This guide provides step-by-step instructions to fix all security vulnerabilities identified in the PR automation system.

## 1. Authentication & Authorization

### Create Auth Middleware
```typescript
// src/features/pr-automation/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: { include: { permissions: true } } }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    req.user = {
      id: user.id,
      role: user.role.name,
      permissions: user.role.permissions.map(p => p.name)
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasPermission = requiredPermissions.every(permission =>
      req.user!.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

### Secure Service Methods
```typescript
// src/features/pr-automation/services/StrategicPROperations.ts
export class StrategicPROperations {
  async createFalseFlagOperation(
    userId: string, // Add user context
    objective: string,
    type: FalseFlagOperation['type']
  ): Promise<{
    operation: FalseFlagOperation;
    launchCode: string;
    warning: string;
  }> {
    // Verify user permissions
    const user = await this.verifyUserPermissions(userId, 'pr.operations.create');
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // Audit log
    await this.auditLog(userId, 'create_operation', { objective, type });
    
    // Continue with operation...
  }
}
```

## 2. Input Validation

### Create Validation Schemas
```typescript
// src/features/pr-automation/validation/schemas.ts
import { z } from 'zod';

export const createOperationSchema = z.object({
  objective: z.string()
    .min(10, 'Objective too short')
    .max(500, 'Objective too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Invalid characters in objective'),
  type: z.enum(['grassroots', 'competitor_discredit', 'market_manipulation', 'perception_shift'])
});

export const createResponseRuleSchema = z.object({
  name: z.string().min(3).max(100),
  enabled: z.boolean(),
  triggers: z.object({
    keywords: z.array(z.string().max(50)).max(20),
    sources: z.array(z.string()).optional(),
    politicians: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    sentiment: z.object({
      min: z.number().min(-1).max(1),
      max: z.number().min(-1).max(1)
    }).optional(),
    location: z.array(z.string()).optional()
  }),
  conditions: z.object({
    requireAll: z.boolean().optional(),
    timeWindow: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    dayOfWeek: z.array(z.number().min(0).max(6)).optional(),
    minRelevance: z.number().min(0).max(1).optional(),
    maxResponsesPerDay: z.number().min(1).max(100).optional()
  }),
  response: z.object({
    template: z.string().max(1000),
    tone: z.enum(['supportive', 'neutral', 'corrective', 'defensive', 'offensive']),
    channels: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'press', 'email'])),
    speed: z.enum(['instant', 'fast', 'standard']),
    requiresApproval: z.boolean(),
    approvalTimeout: z.number().min(60000).max(3600000).optional()
  })
});
```

### Sanitization Utilities
```typescript
// src/features/pr-automation/utils/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';
import { escape } from 'lodash';

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

export function sanitizeForLog(data: any): any {
  if (typeof data === 'string') {
    return escape(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForLog);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields
      if (['password', 'token', 'apiKey', 'secret'].includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLog(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

export function sanitizeSqlInput(input: string): string {
  // Remove common SQL injection patterns
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '');
}
```

## 3. Rate Limiting

### Implement Rate Limiter
```typescript
// src/features/pr-automation/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '@/lib/redis';

// General rate limiter
export const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for sensitive operations
export const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:strict:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Rate limit exceeded for sensitive operations',
  skipSuccessfulRequests: false
});

// Per-user rate limiting
export function userRateLimiter(maxRequests: number = 50) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:user:'
    }),
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req: any) => req.user?.id || req.ip,
    handler: (req, res) => {
      res.status(429).json({
        error: 'User rate limit exceeded',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
}
```

## 4. Secure Data Storage

### Encryption Service
```typescript
// src/features/pr-automation/services/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');
  }
  
  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## 5. Secure Logging

### Audit Logger
```typescript
// src/features/pr-automation/services/auditLogger.ts
import { prisma } from '@/lib/prisma';
import { sanitizeForLog } from '../utils/sanitization';

export class AuditLogger {
  async log(
    userId: string,
    action: string,
    resource: string,
    details: any,
    ip?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          details: sanitizeForLog(details),
          ip,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      // Don't throw - audit failures shouldn't break operations
    }
  }
  
  async logSecurityEvent(
    event: 'auth_failure' | 'permission_denied' | 'rate_limit' | 'suspicious_activity',
    details: any,
    ip?: string
  ): Promise<void> {
    await prisma.securityLog.create({
      data: {
        event,
        details: sanitizeForLog(details),
        ip,
        timestamp: new Date()
      }
    });
  }
}
```

## 6. API Security Headers

### Security Headers Middleware
```typescript
// src/features/pr-automation/middleware/security.ts
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
});

// CSRF Protection
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;
    
    if (!token || token !== sessionToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  
  next();
}
```

## 7. Environment Configuration

### Secure Environment Variables
```bash
# .env.production
NODE_ENV=production
JWT_SECRET=[32-byte-random-string]
ENCRYPTION_KEY=[32-byte-base64-encoded-key]
DATABASE_URL=[connection-string-with-ssl]
REDIS_URL=[redis-connection-with-auth]
SESSION_SECRET=[32-byte-random-string]

# API Keys (use secret management service in production)
TWITTER_API_KEY=[encrypted]
LINKEDIN_API_KEY=[encrypted]
OPENAI_API_KEY=[encrypted]

# Security Settings
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
```

## 8. Secure API Routes

### Example Secured Route
```typescript
// src/features/pr-automation/routes/operations.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { strictLimiter, userRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';
import { createOperationSchema } from '../validation/schemas';
import { StrategicPROperations } from '../services/StrategicPROperations';

const router = Router();
const operations = StrategicPROperations.getInstance();

// All routes require authentication
router.use(authenticate);

// Create operation - requires special permission
router.post('/operations',
  authorize('pr.operations.create'),
  strictLimiter,
  userRateLimiter(5),
  validateRequest(createOperationSchema),
  async (req: any, res) => {
    try {
      const result = await operations.createFalseFlagOperation(
        req.user.id,
        req.body.objective,
        req.body.type
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
```

## 9. Security Testing

### Security Test Suite
```typescript
// src/features/pr-automation/__tests__/security.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('Security Tests', () => {
  describe('Authentication', () => {
    test('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/pr/operations')
        .send({ objective: 'test', type: 'grassroots' });
      
      expect(response.status).toBe(401);
    });
    
    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .post('/api/pr/operations')
        .set('Authorization', 'Bearer invalid-token')
        .send({ objective: 'test', type: 'grassroots' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Input Validation', () => {
    test('should reject invalid input', async () => {
      const response = await request(app)
        .post('/api/pr/operations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ objective: 'x', type: 'invalid-type' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
    
    test('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/api/pr/operations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          objective: '<script>alert("xss")</script>',
          type: 'grassroots'
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/pr/operations')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ objective: 'test operation', type: 'grassroots' });
      }
      
      // Next request should be rate limited
      const response = await request(app)
        .post('/api/pr/operations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ objective: 'test operation', type: 'grassroots' });
      
      expect(response.status).toBe(429);
    });
  });
});
```

## 10. Deployment Security Checklist

- [ ] All environment variables are set securely
- [ ] SSL/TLS is configured properly
- [ ] Database connections use SSL
- [ ] Redis has authentication enabled
- [ ] All API keys are encrypted
- [ ] Security headers are enabled
- [ ] CORS is configured restrictively
- [ ] File uploads are restricted and scanned
- [ ] Logs don't contain sensitive data
- [ ] Monitoring and alerting is configured
- [ ] Backup encryption is enabled
- [ ] Incident response plan is in place
- [ ] Security training completed
- [ ] Penetration testing scheduled
- [ ] Compliance review completed

## Monitoring & Alerting

### Security Monitoring
```typescript
// src/features/pr-automation/monitoring/security.ts
export class SecurityMonitor {
  async detectAnomalies(): Promise<void> {
    // Monitor for:
    // - Unusual API usage patterns
    // - Failed authentication attempts
    // - Permission denied events
    // - Rate limit violations
    // - Input validation failures
    // - Suspicious payloads
  }
  
  async alertSecurityTeam(event: any): Promise<void> {
    // Send alerts for critical security events
  }
}
```

## Conclusion
Implementing these security measures is **mandatory** before deploying the PR automation system. Each component must be thoroughly tested and reviewed by security professionals.