/**
 * Enhanced Security Layer for Business Hunter Swarm
 * Provides comprehensive security for all new components
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { createLogger } from '../core/utils/logger';
import * as DOMPurify from 'isomorphic-dompurify';
import * as helmet from 'helmet';

export interface SecurityConfig {
  encryptionKey: string;
  jwtSecret: string;
  apiKeyPrefix: string;
  maxRequestSize: number;
  rateLimits: {
    discovery: number;
    enrichment: number;
    outreach: number;
    analytics: number;
    export: number;
  };
  ipWhitelist?: string[];
  enableWAF: boolean;
  enableDDoSProtection: boolean;
  sensitiveFieldPatterns: RegExp[];
}

export interface SecurityContext {
  userId?: string;
  apiKeyId?: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  requestId: string;
  riskScore: number;
}

export class EnhancedSecurityLayer {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly config: SecurityConfig;
  private readonly rateLimiters: Map<string, RateLimiterRedis>;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly suspiciousPatterns: RegExp[];

  constructor(redis: Redis, config: SecurityConfig) {
    this.logger = createLogger('enhanced-security');
    this.redis = redis;
    this.config = config;
    this.rateLimiters = new Map();
    
    // Initialize suspicious patterns for input validation
    this.suspiciousPatterns = [
      /(<script|<\/script|javascript:|onerror=|onclick=)/gi, // XSS
      /(\$\{|`|\$\()/g, // Template injection
      /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/gi, // SQL injection
      /(\.\.[\/\\]|\/etc\/|\/proc\/)/g, // Path traversal
      /(eval\(|exec\(|system\(|require\()/gi, // Code injection
      /(\x00|\x08|\x1a)/g, // Null bytes and control characters
    ];

    this.initializeRateLimiters();
  }

  /**
   * Core security middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate request ID
        const requestId = this.generateRequestId();
        req.headers['x-request-id'] = requestId;

        // Basic security headers
        this.setSecurityHeaders(res);

        // Size limit check
        if (this.isOversizedRequest(req)) {
          return res.status(413).json({ error: 'Request too large' });
        }

        // IP validation
        if (!this.validateIP(req)) {
          this.logger.warn('Blocked request from unauthorized IP', {
            ip: this.getClientIP(req),
            requestId
          });
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Extract and validate API key
        const apiKey = this.extractApiKey(req);
        if (!apiKey) {
          return res.status(401).json({ error: 'API key required' });
        }

        // Validate API key and get context
        const context = await this.validateApiKey(apiKey, req);
        if (!context) {
          return res.status(401).json({ error: 'Invalid API key' });
        }

        // Check permissions
        const requiredPermission = this.getRequiredPermission(req);
        if (!this.hasPermission(context, requiredPermission)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Rate limiting
        const rateLimitResult = await this.checkRateLimit(context, req);
        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter
          });
        }

        // Input validation and sanitization
        this.sanitizeRequest(req);

        // Attach security context
        (req as any).security = context;

        // Log security event
        await this.logSecurityEvent('api_access', context, {
          path: req.path,
          method: req.method,
          success: true
        });

        next();

      } catch (error) {
        this.logger.error('Security middleware error:', error);
        res.status(500).json({ error: 'Security check failed' });
      }
    };
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.encryptionAlgorithm,
      Buffer.from(this.config.encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.encryptionAlgorithm,
      Buffer.from(this.config.encryptionKey, 'hex'),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Validate and sanitize business data
   */
  validateBusinessData(data: any): { valid: boolean; errors?: string[] } {
    const businessSchema = z.object({
      name: z.string().min(1).max(200),
      businessNumber: z.string().regex(/^[A-Z0-9]{9,15}$/).optional(),
      email: z.string().email().optional(),
      phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
      website: z.string().url().optional(),
      address: z.object({
        street: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        province: z.string().length(2).optional(),
        postalCode: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i).optional()
      }).optional(),
      description: z.string().max(5000).optional(),
      industry: z.array(z.string()).max(10).optional()
    });

    try {
      businessSchema.parse(data);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Validate outreach message content
   */
  validateOutreachContent(content: any): { valid: boolean; sanitized?: any; errors?: string[] } {
    const outreachSchema = z.object({
      channel: z.enum(['email', 'sms', 'linkedin', 'whatsapp', 'twitter']),
      recipient: z.object({
        id: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional()
      }),
      message: z.object({
        subject: z.string().max(200).optional(),
        body: z.string().max(10000),
        attachments: z.array(z.object({
          name: z.string().max(255),
          type: z.string().max(100),
          size: z.number().max(10 * 1024 * 1024) // 10MB max
        })).optional()
      }),
      scheduledAt: z.string().datetime().optional()
    });

    try {
      const validated = outreachSchema.parse(content);
      
      // Sanitize HTML content
      if (validated.message.body) {
        validated.message.body = DOMPurify.sanitize(validated.message.body, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
          ALLOWED_ATTR: ['href', 'target']
        });
      }

      return { valid: true, sanitized: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Secure data export with PII protection
   */
  async secureDataExport(
    data: any[],
    format: 'csv' | 'json' | 'excel',
    context: SecurityContext
  ): Promise<{ data: any; encrypted: boolean }> {
    // Remove or mask PII based on permissions
    const sanitizedData = data.map(item => this.sanitizePII(item, context));

    // Log export event
    await this.logSecurityEvent('data_export', context, {
      format,
      recordCount: data.length,
      containsPII: this.containsPII(data)
    });

    // Encrypt if required
    if (this.requiresEncryption(context, format)) {
      const jsonData = JSON.stringify(sanitizedData);
      const encrypted = this.encrypt(jsonData);
      return {
        data: encrypted,
        encrypted: true
      };
    }

    return {
      data: sanitizedData,
      encrypted: false
    };
  }

  /**
   * Validate campaign configuration
   */
  validateCampaignConfig(config: any): { valid: boolean; errors?: string[] } {
    const campaignSchema = z.object({
      name: z.string().min(1).max(200),
      targetAudience: z.object({
        businessTypes: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        minScore: z.number().min(0).max(1).optional()
      }),
      channels: z.array(z.enum(['email', 'sms', 'linkedin', 'whatsapp'])),
      schedule: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional(),
        timezone: z.string(),
        dailyLimit: z.number().min(1).max(10000).optional()
      }).optional(),
      compliance: z.object({
        requireOptIn: z.boolean(),
        respectOptOut: z.boolean(),
        excludeCompetitors: z.boolean().optional()
      }),
      budget: z.number().min(0).max(1000000).optional()
    });

    try {
      campaignSchema.parse(config);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Generate secure API key
   */
  async generateApiKey(options: {
    name: string;
    permissions: string[];
    expiresAt?: Date;
    ipWhitelist?: string[];
    rateLimit?: number;
  }): Promise<{ apiKey: string; keyId: string }> {
    const keyId = crypto.randomBytes(16).toString('hex');
    const secret = crypto.randomBytes(32).toString('base64url');
    const apiKey = `${this.config.apiKeyPrefix}_${keyId}_${secret}`;

    const keyData = {
      id: keyId,
      name: options.name,
      permissions: options.permissions,
      expiresAt: options.expiresAt?.toISOString(),
      ipWhitelist: options.ipWhitelist,
      rateLimit: options.rateLimit || 1000,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      active: true
    };

    // Store encrypted
    const encrypted = this.encrypt(JSON.stringify(keyData));
    await this.redis.setex(
      `apikey:${keyId}`,
      86400 * 365, // 1 year
      JSON.stringify(encrypted)
    );

    await this.logSecurityEvent('api_key_created', { keyId } as any, keyData);

    return { apiKey, keyId };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, reason: string): Promise<void> {
    const keyData = await this.getApiKeyData(keyId);
    if (keyData) {
      keyData.active = false;
      keyData.revokedAt = new Date().toISOString();
      keyData.revokeReason = reason;

      const encrypted = this.encrypt(JSON.stringify(keyData));
      await this.redis.setex(
        `apikey:${keyId}`,
        86400 * 30, // Keep for 30 days
        JSON.stringify(encrypted)
      );

      await this.logSecurityEvent('api_key_revoked', { keyId } as any, { reason });
    }
  }

  /**
   * Check for suspicious activity
   */
  async detectSuspiciousActivity(
    context: SecurityContext,
    activity: any
  ): Promise<{ suspicious: boolean; reason?: string; action?: string }> {
    // Check for rapid API calls
    const recentCalls = await this.getRecentActivity(context.apiKeyId || context.ipAddress);
    if (recentCalls > 1000) {
      return {
        suspicious: true,
        reason: 'Excessive API calls',
        action: 'rate_limit'
      };
    }

    // Check for data exfiltration attempts
    if (activity.type === 'export' && activity.recordCount > 10000) {
      return {
        suspicious: true,
        reason: 'Large data export attempt',
        action: 'flag_review'
      };
    }

    // Check for pattern-based attacks
    if (activity.type === 'search' && this.containsSuspiciousPatterns(activity.query)) {
      return {
        suspicious: true,
        reason: 'Suspicious search patterns',
        action: 'block'
      };
    }

    // Check for permission escalation attempts
    if (activity.type === 'permission_request' && !context.permissions.includes('admin')) {
      return {
        suspicious: true,
        reason: 'Unauthorized permission request',
        action: 'block'
      };
    }

    return { suspicious: false };
  }

  /**
   * Private helper methods
   */
  private initializeRateLimiters(): void {
    for (const [key, limit] of Object.entries(this.config.rateLimits)) {
      this.rateLimiters.set(key, new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `ratelimit:${key}`,
        points: limit,
        duration: 3600, // 1 hour
        blockDuration: 300 // 5 minutes
      }));
    }
  }

  private setSecurityHeaders(res: Response): void {
    // Use helmet for comprehensive security headers
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })(res as any, res, () => {});

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  private isOversizedRequest(req: Request): boolean {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    return contentLength > this.config.maxRequestSize;
  }

  private validateIP(req: Request): boolean {
    if (!this.config.ipWhitelist || this.config.ipWhitelist.length === 0) {
      return true;
    }

    const clientIP = this.getClientIP(req);
    return this.config.ipWhitelist.some(allowed => {
      if (allowed.includes('/')) {
        return this.isIPInRange(clientIP, allowed);
      }
      return clientIP === allowed;
    });
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.socket.remoteAddress || '';
  }

  private isIPInRange(ip: string, range: string): boolean {
    // Simplified CIDR check
    const [subnet, bits] = range.split('/');
    if (!bits) return ip === subnet;
    
    // Convert IPs to numbers for comparison
    const ipNum = this.ipToNumber(ip);
    const subnetNum = this.ipToNumber(subnet);
    const mask = (0xffffffff << (32 - parseInt(bits))) >>> 0;
    
    return (ipNum & mask) === (subnetNum & mask);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part) => (acc << 8) + parseInt(part), 0) >>> 0;
  }

  private extractApiKey(req: Request): string | null {
    // Check header
    const headerKey = req.headers['x-api-key'] as string;
    if (headerKey) return headerKey;

    // Check query parameter
    const queryKey = req.query.apiKey as string;
    if (queryKey) return queryKey;

    // Check authorization header
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }

    return null;
  }

  private async validateApiKey(apiKey: string, req: Request): Promise<SecurityContext | null> {
    // Parse API key
    const parts = apiKey.split('_');
    if (parts.length !== 3 || parts[0] !== this.config.apiKeyPrefix) {
      return null;
    }

    const keyId = parts[1];
    const keyData = await this.getApiKeyData(keyId);

    if (!keyData || !keyData.active) {
      return null;
    }

    // Check expiration
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return null;
    }

    // Check IP whitelist
    if (keyData.ipWhitelist && keyData.ipWhitelist.length > 0) {
      const clientIP = this.getClientIP(req);
      if (!keyData.ipWhitelist.includes(clientIP)) {
        return null;
      }
    }

    // Update last used
    keyData.lastUsed = new Date().toISOString();
    const encrypted = this.encrypt(JSON.stringify(keyData));
    await this.redis.setex(
      `apikey:${keyId}`,
      86400 * 365,
      JSON.stringify(encrypted)
    );

    return {
      apiKeyId: keyId,
      permissions: keyData.permissions,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
      requestId: req.headers['x-request-id'] as string,
      riskScore: 0
    };
  }

  private async getApiKeyData(keyId: string): Promise<any | null> {
    const encrypted = await this.redis.get(`apikey:${keyId}`);
    if (!encrypted) return null;

    try {
      const { encrypted: enc, iv, tag } = JSON.parse(encrypted);
      const decrypted = this.decrypt(enc, iv, tag);
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt API key data:', error);
      return null;
    }
  }

  private getRequiredPermission(req: Request): string {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Map routes to permissions
    if (path.includes('/discover')) return 'discovery:read';
    if (path.includes('/enrich')) return 'enrichment:write';
    if (path.includes('/outreach')) return 'outreach:write';
    if (path.includes('/export')) return 'export:read';
    if (path.includes('/analytics')) return 'analytics:read';
    if (path.includes('/campaign')) return method === 'GET' ? 'campaign:read' : 'campaign:write';
    
    return 'read';
  }

  private hasPermission(context: SecurityContext, required: string): boolean {
    // Admin has all permissions
    if (context.permissions.includes('admin')) return true;
    
    // Check exact permission
    if (context.permissions.includes(required)) return true;
    
    // Check wildcard permissions
    const [resource, action] = required.split(':');
    return context.permissions.some(perm => 
      perm === `${resource}:*` || perm === '*'
    );
  }

  private async checkRateLimit(
    context: SecurityContext,
    req: Request
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const endpoint = this.getEndpointCategory(req.path);
    const limiter = this.rateLimiters.get(endpoint) || this.rateLimiters.get('discovery');
    
    if (!limiter) {
      return { allowed: true };
    }

    try {
      const key = context.apiKeyId || context.ipAddress;
      await limiter.consume(key);
      return { allowed: true };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60
      };
    }
  }

  private getEndpointCategory(path: string): string {
    if (path.includes('/discover')) return 'discovery';
    if (path.includes('/enrich')) return 'enrichment';
    if (path.includes('/outreach')) return 'outreach';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/export')) return 'export';
    return 'discovery';
  }

  private sanitizeRequest(req: Request): void {
    // Sanitize query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = this.sanitizeInput(value);
      }
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }
  }

  private sanitizeInput(input: string): string {
    // Remove suspicious patterns
    let sanitized = input;
    for (const pattern of this.suspiciousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // HTML encode
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    return sanitized.trim();
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeInput(value);
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  private sanitizePII(data: any, context: SecurityContext): any {
    if (!context.permissions.includes('pii:read')) {
      // Mask sensitive fields
      const masked = { ...data };
      
      if (masked.email) {
        masked.email = this.maskEmail(masked.email);
      }
      
      if (masked.phone) {
        masked.phone = this.maskPhone(masked.phone);
      }
      
      if (masked.contacts) {
        masked.contacts = masked.contacts.map((c: any) => ({
          ...c,
          email: c.email ? this.maskEmail(c.email) : undefined,
          phone: c.phone ? this.maskPhone(c.phone) : undefined
        }));
      }
      
      return masked;
    }
    
    return data;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.substring(0, 3) + '*'.repeat(digits.length - 6) + digits.substring(digits.length - 3);
  }

  private containsPII(data: any[]): boolean {
    return data.some(item => 
      item.email || item.phone || item.contacts?.length > 0
    );
  }

  private requiresEncryption(context: SecurityContext, format: string): boolean {
    // Always encrypt if contains PII and user doesn't have PII permission
    if (!context.permissions.includes('pii:read')) {
      return true;
    }
    
    // Encrypt based on format
    return format === 'json' && context.permissions.includes('export:encrypted');
  }

  private containsSuspiciousPatterns(input: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private async getRecentActivity(key: string): Promise<number> {
    const count = await this.redis.get(`activity:${key}:${Math.floor(Date.now() / 60000)}`);
    return parseInt(count || '0');
  }

  private generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async logSecurityEvent(
    event: string,
    context: SecurityContext,
    details: any
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      context: {
        apiKeyId: context.apiKeyId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId
      },
      details
    };

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security:events', JSON.stringify(logEntry));
    await this.redis.ltrim('security:events', 0, 10000); // Keep last 10k events

    // Log to file
    this.logger.info('Security event', logEntry);
  }
}