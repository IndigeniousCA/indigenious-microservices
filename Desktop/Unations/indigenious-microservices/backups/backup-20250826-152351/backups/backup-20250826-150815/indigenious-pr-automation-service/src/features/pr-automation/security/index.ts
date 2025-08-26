/**
 * Nuclear-Grade Security Module
 * Central export for all security components
 */

// Authentication & Authorization
export { nuclearAuth, NuclearAuthMiddleware } from './auth.middleware';

// Encryption & Cryptography
export { encryption, EncryptionService } from './encryption.service';

// Audit & Logging
export { auditLogger, AuditLogger } from './audit-logger';

// Security Monitoring
export { securityMonitor, SecurityMonitor } from './security-monitor';

// Input Validation
export { validation, ValidationService, prValidationSchemas } from './validation.service';

// Rate Limiting
export { rateLimiter, RateLimiterMiddleware } from './rate-limiter.middleware';

// Security Headers
export { 
  securityHeaders, 
  SecurityHeadersMiddleware,
  nuclearSecurityHeaders,
  apiSecurityHeaders
} from './security-headers.middleware';

// Composite Security Middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/lib/monitoring/logger';
import { nuclearAuth } from './auth.middleware';
import { rateLimiter } from './rate-limiter.middleware';
import { securityHeaders, apiSecurityHeaders } from './security-headers.middleware';
import { validation } from './validation.service';
import { securityMonitor } from './security-monitor';

/**
 * Complete security middleware stack for PR operations
 */
export const prSecurityStack = [
  // Security headers
  ...apiSecurityHeaders,
  
  // Rate limiting
  rateLimiter.global(),
  
  // Authentication
  nuclearAuth.authenticate.bind(nuclearAuth),
  
  // Attack detection
  async (req: Request, res: Response, next: NextFunction) => {
    const attack = await securityMonitor.detectAttack({
      method: req.method,
      path: req.path,
      headers: req.headers as unknown,
      body: req.body,
      ip: req.ip
    });
    
    if (attack.action === 'block') {
      return res.status(403).json({ error: 'Request blocked' });
    }
    
    if (attack.action === 'challenge') {
      res.setHeader('X-Challenge-Required', 'true');
    }
    
    next();
  }
];

/**
 * Security middleware for sensitive PR operations
 */
export const sensitivePROperations = [
  ...prSecurityStack,
  rateLimiter.prOperations('create'),
  nuclearAuth.authorize('pr.operations.create')
];

/**
 * Security configuration
 */
export const securityConfig = {
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const,
      maxAge: 1800000 // 30 minutes
    }
  },
  
  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'https://indigenious.ca',
    credentials: true,
    optionsSuccessStatus: 200
  },
  
  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
  }
};

/**
 * Security utility functions
 */
export const securityUtils = {
  /**
   * Validate request against schema
   */
  async validateRequest<T>(
    req: Request,
    schema: any
  ): Promise<T> {
    const result = await validation.validate(req.body, schema);
    
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`);
    }
    
    return result.data!;
  },
  
  /**
   * Check if user has permission
   */
  hasPermission(
    req: Request,
    permission: string
  ): boolean {
    const user = (req as unknown).user;
    return user && user.permissions.includes(permission);
  },
  
  /**
   * Get request security context
   */
  getSecurityContext(req: Request): any {
    return {
      user: (req as unknown).user,
      security: (req as unknown).security,
      requestId: (req as unknown).requestId,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
  }
};

/**
 * Initialize security module
 */
export async function initializeSecurity(): Promise<void> {
  logger.info('🔒 Initializing nuclear-grade security...');
  
  // Verify encryption keys
  if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
    throw new Error('JWT keys not configured');
  }
  
  if (!process.env.MASTER_ENCRYPTION_KEY) {
    throw new Error('Master encryption key not configured');
  }
  
  if (!process.env.AUDIT_SIGNING_KEY) {
    throw new Error('Audit signing key not configured');
  }
  
  // Initialize security monitoring
  await securityMonitor.detectAnomalies({
    action: 'system_startup',
    metadata: { timestamp: new Date() }
  });
  
  logger.info('✅ Security initialized successfully');
}