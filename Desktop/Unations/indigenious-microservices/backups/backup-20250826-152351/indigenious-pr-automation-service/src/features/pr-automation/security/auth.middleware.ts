/**
 * Nuclear-Grade Authentication Middleware
 * Implements multi-layer authentication with zero-trust architecture
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { AuditLogger } from './audit-logger';
import { SecurityMonitor } from './security-monitor';
import { EncryptionService } from './encryption.service';
import speakeasy from 'speakeasy';
import { z } from 'zod';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    sessionId: string;
    mfaVerified: boolean;
    riskScore: number;
    deviceFingerprint: string;
  };
  security?: {
    ip: string;
    userAgent: string;
    geoLocation?: string;
    threatLevel: number;
  };
}

interface TokenPayload {
  userId: string;
  sessionId: string;
  deviceFingerprint: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}

export class NuclearAuthMiddleware {
  private static instance: NuclearAuthMiddleware;
  private auditLogger = new AuditLogger();
  private securityMonitor = new SecurityMonitor();
  private encryption = new EncryptionService();
  
  // Security constants
  private readonly MAX_TOKEN_AGE = 900000; // 15 minutes
  private readonly REFRESH_WINDOW = 300000; // 5 minutes
  private readonly MAX_FAILED_ATTEMPTS = 3;
  private readonly LOCKOUT_DURATION = 3600000; // 1 hour
  private readonly SESSION_TIMEOUT = 1800000; // 30 minutes
  
  private constructor() {}
  
  static getInstance(): NuclearAuthMiddleware {
    if (!this.instance) {
      this.instance = new NuclearAuthMiddleware();
    }
    return this.instance;
  }

  /**
   * Main authentication middleware with multiple security layers
   */
  async authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Layer 1: Extract and validate token
      const token = this.extractToken(req);
      if (!token) {
        return this.handleAuthFailure(req, res, 'No token provided', requestId);
      }

      // Layer 2: Verify token signature and structure
      const payload = await this.verifyToken(token);
      if (!payload) {
        return this.handleAuthFailure(req, res, 'Invalid token', requestId);
      }

      // Layer 3: Check token revocation
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        return this.handleAuthFailure(req, res, 'Token revoked', requestId);
      }

      // Layer 4: Validate session
      const session = await this.validateSession(payload.sessionId);
      if (!session) {
        return this.handleAuthFailure(req, res, 'Invalid session', requestId);
      }

      // Layer 5: Device fingerprint verification
      const deviceValid = await this.verifyDeviceFingerprint(req, payload.deviceFingerprint);
      if (!deviceValid) {
        await this.handleSuspiciousActivity(req, 'Device fingerprint mismatch');
        return this.handleAuthFailure(req, res, 'Device verification failed', requestId);
      }

      // Layer 6: Rate limiting check
      const rateLimitOk = await this.checkRateLimit(payload.userId, req.ip);
      if (!rateLimitOk) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
      }

      // Layer 7: Load user with permissions
      const user = await this.loadUserWithPermissions(payload.userId);
      if (!user || !user.isActive) {
        return this.handleAuthFailure(req, res, 'User inactive', requestId);
      }

      // Layer 8: Check account lockout
      const isLocked = await this.isAccountLocked(user.id);
      if (isLocked) {
        return res.status(423).json({ error: 'Account temporarily locked' });
      }

      // Layer 9: Perform risk assessment
      const riskScore = await this.assessRisk(req, user);
      if (riskScore > 0.7) {
        await this.handleHighRiskRequest(req, user, riskScore);
        return res.status(403).json({ error: 'Request blocked due to high risk' });
      }

      // Layer 10: Check MFA requirement
      const mfaRequired = this.isMfaRequired(user, riskScore);
      if (mfaRequired && !session.mfaVerified) {
        return res.status(403).json({ 
          error: 'MFA verification required',
          mfaToken: await this.generateMfaChallenge(user.id)
        });
      }

      // Attach user to request
      req.user = {
        id: user.id,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.name),
        sessionId: payload.sessionId,
        mfaVerified: session.mfaVerified || false,
        riskScore,
        deviceFingerprint: payload.deviceFingerprint
      };

      // Attach security context
      req.security = {
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
        geoLocation: await this.getGeoLocation(req.ip),
        threatLevel: riskScore
      };

      // Audit successful authentication
      await this.auditLogger.logAuth({
        userId: user.id,
        action: 'authenticate_success',
        requestId,
        duration: Date.now() - startTime,
        riskScore,
        ip: req.ip
      });

      // Update session activity
      await this.updateSessionActivity(payload.sessionId);

      // Token refresh if needed
      if (this.shouldRefreshToken(payload)) {
        const newToken = await this.refreshToken(payload);
        res.setHeader('X-New-Token', newToken);
      }

      next();
    } catch (error) {
      await this.handleAuthError(req, res, error, requestId);
    }
  }

  /**
   * Authorization middleware with granular permission checks
   */
  authorize(...requiredPermissions: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check each required permission
      const missingPermissions = requiredPermissions.filter(
        permission => !req.user!.permissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        await this.auditLogger.logAuth({
          userId: req.user.id,
          action: 'authorize_failure',
          permissions: missingPermissions,
          ip: req.ip
        });

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: missingPermissions
        });
      }

      // Additional checks for sensitive operations
      if (requiredPermissions.includes('pr.operations.create')) {
        const canPerformSensitive = await this.checkSensitiveOperation(req);
        if (!canPerformSensitive) {
          return res.status(403).json({ 
            error: 'Additional verification required for sensitive operations' 
          });
        }
      }

      next();
    };
  }

  /**
   * MFA verification endpoint
   */
  async verifyMfa(req: AuthRequest, res: Response) {
    const { token, code } = req.body;
    
    if (!token || !code) {
      return res.status(400).json({ error: 'Token and code required' });
    }

    try {
      // Decrypt MFA challenge token
      const challenge = await this.decryptMfaChallenge(token);
      if (!challenge || challenge.expires < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired MFA token' });
      }

      // Load user's MFA secret
      const user = await prisma.user.findUnique({
        where: { id: challenge.userId },
        select: { mfaSecret: true }
      });

      if (!user?.mfaSecret) {
        return res.status(400).json({ error: 'MFA not configured' });
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        await this.handleFailedMfa(challenge.userId);
        return res.status(400).json({ error: 'Invalid MFA code' });
      }

      // Update session with MFA verification
      await this.updateSessionMfa(challenge.sessionId);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'MFA verification failed' });
    }
  }

  /**
   * Private helper methods
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Use RS256 for enhanced security
      const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
        algorithms: ['RS256'],
        maxAge: this.MAX_TOKEN_AGE
      }) as TokenPayload;

      // Additional payload validation
      const schema = z.object({
        userId: z.string().uuid(),
        sessionId: z.string().uuid(),
        deviceFingerprint: z.string(),
        iat: z.number(),
        exp: z.number(),
        jti: z.string().uuid()
      });

      return schema.parse(payload);
    } catch (error) {
      return null;
    }
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await redis.get(`revoked:${jti}`);
    return revoked !== null;
  }

  private async validateSession(sessionId: string): Promise<unknown> {
    const session = await redis.get(`session:${sessionId}`);
    if (!session) return null;

    const sessionData = JSON.parse(session);
    
    // Check session timeout
    if (Date.now() - sessionData.lastActivity > this.SESSION_TIMEOUT) {
      await redis.del(`session:${sessionId}`);
      return null;
    }

    return sessionData;
  }

  private async verifyDeviceFingerprint(req: Request, expectedFingerprint: string): Promise<boolean> {
    const currentFingerprint = await this.generateDeviceFingerprint(req);
    return crypto.timingSafeEqual(
      Buffer.from(expectedFingerprint),
      Buffer.from(currentFingerprint)
    );
  }

  private async generateDeviceFingerprint(req: Request): Promise<string> {
    const components = [
      req.get('user-agent') || '',
      req.get('accept-language') || '',
      req.get('accept-encoding') || '',
      req.ip
    ];
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  private async checkRateLimit(userId: string, ip: string): Promise<boolean> {
    const key = `ratelimit:${userId}:${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 300); // 5 minute window
    }
    
    return count <= 100; // 100 requests per 5 minutes
  }

  private async loadUserWithPermissions(userId: string): Promise<unknown> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
  }

  private async isAccountLocked(userId: string): Promise<boolean> {
    const lockKey = `locked:${userId}`;
    const locked = await redis.get(lockKey);
    return locked !== null;
  }

  private async assessRisk(req: Request, user: Record<string, unknown>): Promise<number> {
    let riskScore = 0;

    // Check IP reputation
    const ipRisk = await this.securityMonitor.checkIpReputation(req.ip);
    riskScore += ipRisk * 0.3;

    // Check unusual location
    const locationRisk = await this.checkLocationAnomaly(req.ip, user.id);
    riskScore += locationRisk * 0.2;

    // Check unusual time
    const timeRisk = this.checkTimeAnomaly(user.id);
    riskScore += timeRisk * 0.1;

    // Check device anomaly
    const deviceRisk = await this.checkDeviceAnomaly(req, user.id);
    riskScore += deviceRisk * 0.2;

    // Check behavior patterns
    const behaviorRisk = await this.checkBehaviorAnomaly(user.id);
    riskScore += behaviorRisk * 0.2;

    return Math.min(riskScore, 1);
  }

  private isMfaRequired(user: Record<string, unknown>, riskScore: number): boolean {
    // Always require MFA for sensitive roles
    if (['admin', 'pr_operator'].includes(user.role.name)) {
      return true;
    }
    
    // Require MFA for elevated risk
    return riskScore > 0.5;
  }

  private async generateMfaChallenge(userId: string): Promise<string> {
    const challenge = {
      userId,
      sessionId: crypto.randomUUID(),
      expires: Date.now() + 300000, // 5 minutes
      nonce: crypto.randomBytes(32).toString('hex')
    };
    
    return this.encryption.encrypt(JSON.stringify(challenge));
  }

  private async decryptMfaChallenge(token: string): Promise<unknown> {
    try {
      const decrypted = await this.encryption.decrypt(token);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await redis.get(`session:${sessionId}`);
    if (session) {
      const sessionData = JSON.parse(session);
      sessionData.lastActivity = Date.now();
      await redis.setex(
        `session:${sessionId}`, 
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(sessionData)
      );
    }
  }

  private shouldRefreshToken(payload: TokenPayload): boolean {
    const timeLeft = payload.exp * 1000 - Date.now();
    return timeLeft < this.REFRESH_WINDOW;
  }

  private async refreshToken(oldPayload: TokenPayload): Promise<string> {
    const newPayload: TokenPayload = {
      ...oldPayload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.MAX_TOKEN_AGE) / 1000),
      jti: crypto.randomUUID()
    };
    
    // Revoke old token
    await redis.setex(`revoked:${oldPayload.jti}`, 86400, '1');
    
    // Sign with RS256
    return jwt.sign(newPayload, process.env.JWT_PRIVATE_KEY!, {
      algorithm: 'RS256'
    });
  }

  private async handleAuthFailure(
    req: Request, 
    res: Response, 
    reason: string,
    requestId: string
  ): Promise<Response> {
    // Log failure
    await this.auditLogger.logAuth({
      action: 'authenticate_failure',
      reason,
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Track failed attempts
    const attempts = await this.trackFailedAttempt(req.ip);
    
    // Auto-lock after threshold
    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.lockAccount(req.ip);
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      attempts: attempts,
      maxAttempts: this.MAX_FAILED_ATTEMPTS
    });
  }

  private async trackFailedAttempt(ip: string): Promise<number> {
    const key = `failed:${ip}`;
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      await redis.expire(key, 3600); // 1 hour
    }
    
    return attempts;
  }

  private async lockAccount(ip: string): Promise<void> {
    await redis.setex(`locked:${ip}`, this.LOCKOUT_DURATION / 1000, '1');
    await this.securityMonitor.alertSecurityTeam({
      type: 'account_lockout',
      ip,
      reason: 'Too many failed attempts'
    });
  }

  private async handleSuspiciousActivity(req: Request, reason: string): Promise<void> {
    await this.securityMonitor.reportSuspiciousActivity({
      ip: req.ip,
      userAgent: req.get('user-agent'),
      reason,
      timestamp: new Date()
    });
  }

  private async handleHighRiskRequest(req: Request, user: Record<string, unknown>, riskScore: number): Promise<void> {
    await this.auditLogger.logSecurity({
      event: 'high_risk_blocked',
      userId: user.id,
      riskScore,
      ip: req.ip,
      details: req.security
    });
  }

  private async getGeoLocation(ip: string): Promise<string | undefined> {
    // Implement IP geolocation
    return undefined;
  }

  private async checkLocationAnomaly(ip: string, userId: string): Promise<number> {
    // Check if login from unusual location
    return 0;
  }

  private checkTimeAnomaly(userId: string): number {
    // Check if login at unusual time
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      return 0.5; // Higher risk for 2-5 AM logins
    }
    return 0;
  }

  private async checkDeviceAnomaly(req: Request, userId: string): Promise<number> {
    // Check if new device
    return 0;
  }

  private async checkBehaviorAnomaly(userId: string): Promise<number> {
    // Check unusual behavior patterns
    return 0;
  }

  private async checkSensitiveOperation(req: AuthRequest): Promise<boolean> {
    // Additional checks for sensitive operations
    return req.user!.mfaVerified && req.user!.riskScore < 0.3;
  }

  private async updateSessionMfa(sessionId: string): Promise<void> {
    const session = await redis.get(`session:${sessionId}`);
    if (session) {
      const sessionData = JSON.parse(session);
      sessionData.mfaVerified = true;
      await redis.setex(
        `session:${sessionId}`,
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(sessionData)
      );
    }
  }

  private async handleFailedMfa(userId: string): Promise<void> {
    const key = `mfa_failed:${userId}`;
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      await redis.expire(key, 3600);
    }
    
    if (attempts >= 5) {
      await this.lockAccount(userId);
      await this.securityMonitor.alertSecurityTeam({
        type: 'mfa_brute_force',
        userId,
        attempts
      });
    }
  }

  private async handleAuthError(
    req: Request,
    res: Response,
    error: Error | unknown,
    requestId: string
  ): Promise<void> {
    await this.auditLogger.logError({
      action: 'auth_error',
      error: error.message,
      requestId,
      ip: req.ip
    });

    res.status(500).json({ error: 'Authentication error' });
  }
}

export const nuclearAuth = NuclearAuthMiddleware.getInstance();