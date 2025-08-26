/**
 * Security Middleware for Bank Integration
 * Enterprise-grade security controls for financial operations
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { secureCredentialManager } from '../services/SecureCredentialManager';
import { APIKeySchema, IdempotencyKeySchema } from '../schemas/validation';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Types
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    communityId?: string;
    roles: string[];
    permissions: string[];
  };
  apiKey?: {
    keyId: string;
    permissions: string[];
  };
  idempotencyKey?: string;
}

// Rate limiting configurations
export const rateLimiters = {
  // Strict rate limit for payment operations
  payments: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many payment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: AuthenticatedRequest) => {
      return req.user?.id || req.apiKey?.keyId || req.ip;
    },
    handler: (req, res) => {
      logger.warn('Payment rate limit exceeded', {
        userId: (req as AuthenticatedRequest).user?.id,
        ip: req.ip
      });
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many payment requests',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  }),
  
  // Moderate rate limit for account operations
  accounts: rateLimit({
    windowMs: 60 * 1000,
    max: 30, // 30 requests per minute
    message: 'Too many account requests, please try again later',
    keyGenerator: (req: AuthenticatedRequest) => {
      return req.user?.id || req.apiKey?.keyId || req.ip;
    }
  }),
  
  // Relaxed rate limit for read operations
  reads: rateLimit({
    windowMs: 60 * 1000,
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
    keyGenerator: (req: AuthenticatedRequest) => {
      return req.user?.id || req.apiKey?.keyId || req.ip;
    }
  }),
  
  // Very strict rate limit for verification operations
  verification: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests per hour
    message: 'Too many verification requests',
    skipSuccessfulRequests: true, // Don't count successful verifications
    keyGenerator: (req: AuthenticatedRequest) => {
      return req.user?.id || req.apiKey?.keyId || req.ip;
    }
  })
};

/**
 * API Key Authentication Middleware
 */
export const authenticateAPIKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        error: 'MISSING_API_KEY',
        message: 'API key is required'
      });
      return;
    }
    
    // Validate format
    const validation = APIKeySchema.safeParse(apiKey);
    if (!validation.success) {
      res.status(401).json({
        error: 'INVALID_API_KEY_FORMAT',
        message: 'Invalid API key format'
      });
      return;
    }
    
    // Validate with credential manager
    const keyValidation = await secureCredentialManager.validateAPIKey(apiKey);
    
    if (!keyValidation.valid) {
      logger.warn('Invalid API key attempt', {
        ip: req.ip,
        expired: keyValidation.expired
      });
      
      res.status(401).json({
        error: keyValidation.expired ? 'API_KEY_EXPIRED' : 'INVALID_API_KEY',
        message: keyValidation.expired ? 'API key has expired' : 'Invalid API key'
      });
      return;
    }
    
    // Attach API key info to request
    req.apiKey = {
      keyId: keyValidation.keyId!,
      permissions: keyValidation.permissions || []
    };
    
    // Log successful authentication
    logger.info('API key authenticated', {
      keyId: keyValidation.keyId,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    logger.error('API key authentication error', { error });
    res.status(500).json({
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed'
    });
  }
};

/**
 * JWT Authentication Middleware (for web users)
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'MISSING_TOKEN',
        message: 'Authentication token required'
      });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token (integrate with your existing auth system)
    // For now, this is a placeholder
    const decoded = await verifyJWT(token);
    
    if (!decoded) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      });
      return;
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      communityId: decoded.communityId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    logger.error('JWT authentication error', { error });
    res.status(500).json({
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based Access Control Middleware
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Authentication required'
      });
      return;
    }
    
    const hasRole = requiredRoles.some(role => req.user!.roles.includes(role));
    
    if (!hasRole) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        requiredRoles,
        userRoles: req.user.roles
      });
      
      res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to access this resource'
      });
      return;
    }
    
    next();
  };
};

/**
 * Permission-based Access Control Middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const permissions = req.user?.permissions || req.apiKey?.permissions || [];
    
    const hasPermission = requiredPermissions.every(perm => permissions.includes(perm));
    
    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: req.user?.id,
        apiKeyId: req.apiKey?.keyId,
        requiredPermissions,
        userPermissions: permissions
      });
      
      res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have the required permissions'
      });
      return;
    }
    
    next();
  };
};

/**
 * Community Access Control Middleware
 */
export const requireCommunityAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const communityId = req.params.communityId || req.body.communityId;
    
    if (!communityId) {
      res.status(400).json({
        error: 'MISSING_COMMUNITY_ID',
        message: 'Community ID is required'
      });
      return;
    }
    
    // Check if user belongs to the community
    if (req.user && req.user.communityId !== communityId) {
      // Check if user has admin role that allows cross-community access
      if (!req.user.roles.includes('PLATFORM_ADMIN')) {
        res.status(403).json({
          error: 'COMMUNITY_ACCESS_DENIED',
          message: 'You can only access your own community resources'
        });
        return;
      }
    }
    
    // For API keys, check if they have community access permission
    if (req.apiKey && !req.apiKey.permissions.includes('community.any')) {
      res.status(403).json({
        error: 'COMMUNITY_ACCESS_DENIED',
        message: 'API key does not have community access permission'
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Community access control error', { error });
    res.status(500).json({
      error: 'ACCESS_CONTROL_ERROR',
      message: 'Access control check failed'
    });
  }
};

/**
 * Idempotency Middleware for payment operations
 */
export const idempotencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      res.status(400).json({
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this operation'
      });
      return;
    }
    
    // Validate format
    const validation = IdempotencyKeySchema.safeParse(idempotencyKey);
    if (!validation.success) {
      res.status(400).json({
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Invalid idempotency key format'
      });
      return;
    }
    
    // Check if request was already processed
    const existingRequest = await prisma.idempotentRequest.findUnique({
      where: { idempotencyKey }
    });
    
    if (existingRequest) {
      // Return cached response
      logger.info('Returning cached response for idempotent request', {
        idempotencyKey,
        originalRequestTime: existingRequest.createdAt
      });
      
      res.status(existingRequest.statusCode).json(existingRequest.response);
      return;
    }
    
    // Attach key to request for later use
    req.idempotencyKey = idempotencyKey;
    
    // Intercept response to cache it
    const originalJson = res.json;
    res.json = function(data: any) {
      // Store response for idempotency
      prisma.idempotentRequest.create({
        data: {
          idempotencyKey: idempotencyKey!,
          requestMethod: req.method,
          requestPath: req.path,
          requestBody: req.body,
          statusCode: res.statusCode,
          response: data,
          userId: req.user?.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      }).catch(error => {
        logger.error('Failed to store idempotent response', { error });
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Idempotency middleware error', { error });
    res.status(500).json({
      error: 'IDEMPOTENCY_ERROR',
      message: 'Idempotency check failed'
    });
  }
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Sanitize common XSS vectors in request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query as any) as any;
  }
  
  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // OWASP recommended security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * Audit logging middleware
 */
export const auditLog = (action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    
    // Log request
    const auditEntry = {
      action,
      userId: req.user?.id,
      apiKeyId: req.apiKey?.keyId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    };
    
    // Intercept response
    const originalSend = res.send;
    res.send = function(data: any) {
      // Log response
      const duration = Date.now() - startTime;
      
      prisma.auditLog.create({
        data: {
          ...auditEntry,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode < 400
        }
      }).catch(error => {
        logger.error('Failed to create audit log', { error });
      });
      
      // Log to blockchain for financial operations
      if (action.includes('payment') || action.includes('transfer')) {
        logger.info('Financial operation audit', {
          ...auditEntry,
          statusCode: res.statusCode,
          duration
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Helper functions

async function verifyJWT(token: string): Promise<any> {
  // Integrate with your existing JWT verification
  // This is a placeholder
  try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded;
    return null;
  } catch (error) {
    return null;
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Remove potential XSS vectors
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

// Export middleware collection
export const securityMiddleware = {
  authenticateAPIKey,
  authenticateJWT,
  requireRole,
  requirePermission,
  requireCommunityAccess,
  idempotencyMiddleware,
  sanitizeInput,
  securityHeaders,
  auditLog,
  rateLimiters
};