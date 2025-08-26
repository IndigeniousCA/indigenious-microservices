import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RateLimiter } from 'limiter';
import { logger } from '../core/utils/logger';

interface ApiKeyMetadata {
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  lastUsed: Date;
  expiresAt?: Date;
  rateLimit: number;
  ipWhitelist?: string[];
}

interface SecurityConfig {
  encryptionKey: string;
  jwtSecret: string;
  apiKeyPrefix: string;
  maxRequestSize: number;
  rateLimitWindow: number;
  suspiciousActivityThreshold: number;
}

/**
 * Enterprise-grade security layer for Business Hunter Swarm
 * Implements OWASP best practices and FAANG-level security standards
 */
export class SecurityLayer {
  private readonly encryptionKey: Buffer;
  private readonly jwtSecret: string;
  private readonly apiKeyStore = new Map<string, ApiKeyMetadata>();
  private readonly rateLimiters = new Map<string, RateLimiter>();
  private readonly blockedIPs = new Set<string>();
  private readonly suspiciousActivity = new Map<string, number>();
  private readonly config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
    this.jwtSecret = config.jwtSecret;
    
    // Initialize security monitoring
    this.startSecurityMonitoring();
  }

  /**
   * Validate and sanitize incoming API requests
   */
  async validateRequest(req: any): Promise<{ valid: boolean; error?: string }> {
    try {
      // 1. Check IP blocking
      const clientIP = this.extractClientIP(req);
      if (this.blockedIPs.has(clientIP)) {
        logger.warn(`Blocked IP attempted access: ${clientIP}`);
        return { valid: false, error: 'Access denied' };
      }

      // 2. Validate API key
      const apiKey = this.extractApiKey(req);
      if (!apiKey) {
        return { valid: false, error: 'Missing API key' };
      }

      const keyMetadata = await this.validateApiKey(apiKey);
      if (!keyMetadata) {
        this.recordSuspiciousActivity(clientIP);
        return { valid: false, error: 'Invalid API key' };
      }

      // 3. Check IP whitelist if configured
      if (keyMetadata.ipWhitelist && !keyMetadata.ipWhitelist.includes(clientIP)) {
        logger.warn(`IP not in whitelist: ${clientIP} for key ${keyMetadata.id}`);
        return { valid: false, error: 'IP not authorized' };
      }

      // 4. Rate limiting
      const rateLimitKey = `${keyMetadata.id}:${clientIP}`;
      if (!this.checkRateLimit(rateLimitKey, keyMetadata.rateLimit)) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      // 5. Validate request size
      if (req.headers['content-length'] > this.config.maxRequestSize) {
        return { valid: false, error: 'Request too large' };
      }

      // 6. Input validation
      const validationResult = this.validateInput(req.body);
      if (!validationResult.valid) {
        return { valid: false, error: validationResult.error };
      }

      // Update last used
      keyMetadata.lastUsed = new Date();
      
      return { valid: true };
    } catch (error) {
      logger.error('Security validation error:', error);
      return { valid: false, error: 'Security validation failed' };
    }
  }

  /**
   * Generate secure API key
   */
  generateApiKey(metadata: Omit<ApiKeyMetadata, 'id' | 'createdAt' | 'lastUsed'>): string {
    const keyId = randomBytes(16).toString('hex');
    const keySecret = randomBytes(32).toString('hex');
    const apiKey = `${this.config.apiKeyPrefix}_${keyId}_${keySecret}`;

    const fullMetadata: ApiKeyMetadata = {
      ...metadata,
      id: keyId,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    // Store hashed version
    const hashedKey = this.hashApiKey(apiKey);
    this.apiKeyStore.set(hashedKey, fullMetadata);

    return apiKey;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, iv: string): string {
    const [encrypted, authTag] = encryptedData.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm', 
      this.encryptionKey, 
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate JWT token for internal service communication
   */
  generateServiceToken(service: string, permissions: string[]): string {
    return jwt.sign(
      {
        service,
        permissions,
        iat: Date.now(),
        exp: Date.now() + 3600000 // 1 hour
      },
      this.jwtSecret,
      { algorithm: 'HS256' }
    );
  }

  /**
   * Verify JWT token
   */
  verifyServiceToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
    } catch (error) {
      logger.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential XSS vectors
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: any): { valid: boolean; error?: string } {
    // Define strict input schemas
    const schemas = {
      search: z.object({
        query: z.string().max(500),
        filters: z.object({
          province: z.string().optional(),
          industry: z.string().optional(),
          indigenous: z.boolean().optional()
        }).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional()
      }),
      
      hunter: z.object({
        type: z.enum(['government', 'indigenous_org', 'social_media', 'registry']),
        action: z.enum(['start', 'stop', 'pause', 'resume', 'scale']),
        count: z.number().min(1).max(100).optional()
      })
    };

    // Detect input type and validate
    try {
      if (input.query !== undefined) {
        schemas.search.parse(input);
      } else if (input.type && input.action) {
        schemas.hunter.parse(input);
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid input'
      };
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(key: string, limit: number): boolean {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiter({
        tokensPerInterval: limit,
        interval: this.config.rateLimitWindow,
        fireImmediately: true
      }));
    }

    const limiter = this.rateLimiters.get(key)!;
    return limiter.tryRemoveTokens(1);
  }

  /**
   * Extract client IP from request
   */
  private extractClientIP(req: any): string {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           'unknown';
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(req: any): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    return req.headers['x-api-key'] || null;
  }

  /**
   * Validate API key
   */
  private async validateApiKey(apiKey: string): Promise<ApiKeyMetadata | null> {
    const hashedKey = this.hashApiKey(apiKey);
    const metadata = this.apiKeyStore.get(hashedKey);

    if (!metadata) {
      return null;
    }

    // Check expiration
    if (metadata.expiresAt && metadata.expiresAt < new Date()) {
      this.apiKeyStore.delete(hashedKey);
      return null;
    }

    return metadata;
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Record suspicious activity
   */
  private recordSuspiciousActivity(identifier: string): void {
    const count = (this.suspiciousActivity.get(identifier) || 0) + 1;
    this.suspiciousActivity.set(identifier, count);

    if (count >= this.config.suspiciousActivityThreshold) {
      this.blockedIPs.add(identifier);
      logger.warn(`Blocked IP due to suspicious activity: ${identifier}`);
    }
  }

  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    // Clear suspicious activity counts periodically
    setInterval(() => {
      this.suspiciousActivity.clear();
    }, 3600000); // Every hour

    // Log security metrics
    setInterval(() => {
      logger.info('Security metrics', {
        blockedIPs: this.blockedIPs.size,
        activeApiKeys: this.apiKeyStore.size,
        rateLimiters: this.rateLimiters.size
      });
    }, 300000); // Every 5 minutes
  }

  /**
   * Export security audit log
   */
  async exportAuditLog(startDate: Date, endDate: Date): Promise<any[]> {
    // In production, this would query from a persistent audit log
    return [];
  }
}