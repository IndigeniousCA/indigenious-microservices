/**
 * Enterprise-grade authentication middleware
 * Provides comprehensive authentication and authorization for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { CognitoIdentityProviderClient, GetUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { auditLogger, AuditCategory, AuditSeverity, AuditResult } from '@/lib/audit';
import { rateLimiter } from '@/lib/security/rate-limiter';
import { redisSessionStore } from '@/lib/session/redis-store';
import prisma from '@/lib/prisma';

// Types
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  businessId?: string;
  indigenousVerified?: boolean;
  metadata?: Record<string, any>;
}

export interface AuthRequest extends NextRequest {
  user?: AuthenticatedUser;
}

// Environment validation
const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  AWS_REGION: z.string().default('us-west-2'),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse({
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_REGION: process.env.AWS_REGION,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  });
} catch (error) {
  logger.error('Missing required environment variables for auth:', error);
  // Use defaults for development
  env = {
    JWT_SECRET: 'development-secret-key-do-not-use-in-production',
    AWS_REGION: 'us-west-2',
    COGNITO_USER_POOL_ID: undefined,
    COGNITO_CLIENT_ID: undefined,
  };
}

// Initialize AWS Cognito client
const cognitoClient = env.COGNITO_USER_POOL_ID ? new CognitoIdentityProviderClient({
  region: env.AWS_REGION,
}) : null;

// Permission definitions
export const Permissions = {
  // Admin permissions
  ADMIN_FULL_ACCESS: 'admin.full_access',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_BUSINESS_VERIFY: 'admin.business.verify',
  ADMIN_CONTENT_MODERATE: 'admin.content.moderate',
  ADMIN_METRICS_ACCESS: 'admin.metrics.access',
  ADMIN_METRICS_WRITE: 'admin.metrics.write',
  
  // Business permissions
  BUSINESS_CREATE: 'business.create',
  BUSINESS_UPDATE: 'business.update',
  BUSINESS_DELETE: 'business.delete',
  BUSINESS_VIEW_PRIVATE: 'business.view_private',
  BUSINESS_VERIFY: 'business.verify',
  
  // RFQ permissions
  RFQ_CREATE: 'rfq.create',
  RFQ_UPDATE: 'rfq.update',
  RFQ_DELETE: 'rfq.delete',
  RFQ_VIEW_ALL: 'rfq.view_all',
  RFQ_BID: 'rfq.bid',
  
  // Bid permissions
  BID_CREATE: 'bid.create',
  BID_UPDATE: 'bid.update',
  BID_DELETE: 'bid.delete',
  BID_VIEW_PRIVATE: 'bid.view_private',
  
  // Payment permissions
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_VIEW_ALL: 'payment.view_all',
  
  // Community permissions
  COMMUNITY_ACCESS: 'community.access',
  COMMUNITY_MODERATE: 'community.moderate',
  COMMUNITY_ELDER_COUNCIL: 'community.elder_council',
  
  // PR permissions (when re-enabled with proper security)
  PR_OPERATIONS_VIEW: 'pr.operations.view',
  PR_OPERATIONS_CREATE: 'pr.operations.create',
  PR_OPERATIONS_APPROVE: 'pr.operations.approve',
} as const;

// Role-based permission mapping
const rolePermissions: Record<string, string[]> = {
  USER: [
    Permissions.BUSINESS_VIEW_PRIVATE,
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
  ],
  BUSINESS_OWNER: [
    Permissions.BUSINESS_VIEW_PRIVATE,
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
    Permissions.BUSINESS_CREATE,
    Permissions.BUSINESS_UPDATE,
    Permissions.PAYMENT_CREATE,
  ],
  GOVERNMENT_OFFICER: [
    Permissions.RFQ_CREATE,
    Permissions.RFQ_UPDATE,
    Permissions.RFQ_VIEW_ALL,
    Permissions.BID_VIEW_PRIVATE,
    Permissions.PAYMENT_PROCESS,
  ],
  BAND_ADMIN: [
    Permissions.BUSINESS_VIEW_PRIVATE,
    Permissions.RFQ_BID,
    Permissions.BID_CREATE,
    Permissions.BID_UPDATE,
    Permissions.BUSINESS_CREATE,
    Permissions.BUSINESS_UPDATE,
    Permissions.PAYMENT_CREATE,
    Permissions.COMMUNITY_ACCESS,
    Permissions.COMMUNITY_MODERATE,
  ],
  ELDER: [
    Permissions.COMMUNITY_ACCESS,
    Permissions.COMMUNITY_ELDER_COUNCIL,
  ],
  ADMIN: [
    ...Object.values(Permissions).filter(p => !p.startsWith('admin.full')),
    Permissions.ADMIN_USERS_MANAGE,
    Permissions.ADMIN_BUSINESS_VERIFY,
    Permissions.ADMIN_CONTENT_MODERATE,
  ],
  SUPER_ADMIN: Object.values(Permissions),
};

/**
 * Verify session using Redis session store
 */
async function verifySession(sessionId: string, ipAddress?: string): Promise<AuthenticatedUser | null> {
  try {
    // Get session from Redis
    const sessionData = await redisSessionStore.getSession(sessionId);
    
    if (!sessionData) {
      return null;
    }
    
    // Verify IP address for security (optional, configurable)
    if (ipAddress && sessionData.ipAddress && sessionData.ipAddress !== ipAddress) {
      await auditLogger.log({
        actorId: sessionData.userId,
        actorType: 'user',
        category: AuditCategory.SECURITY,
        action: 'session.ip_mismatch',
        resource: 'session',
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        metadata: {
          sessionId: sessionId.substring(0, 8) + '...',
          expectedIP: sessionData.ipAddress,
          actualIP: ipAddress,
        },
      });
      
      // Invalidate session on IP mismatch
      await redisSessionStore.deleteSession(sessionId, 'IP address mismatch');
      return null;
    }
    
    // Update session activity
    await redisSessionStore.updateActivity(sessionId);
    
    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      include: {
        businesses: {
          include: {
            business: {
              select: {
                id: true,
                verificationStatus: true,
                indigenousOwned: true,
                businessType: true,
              },
            },
          },
        },
      },
    });
    
    if (!user) {
      // User no longer exists, invalidate session
      await redisSessionStore.deleteSession(sessionId, 'User not found');
      return null;
    }
    
    const primaryBusiness = user.businesses.find(b => b.isPrimary);
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: rolePermissions[user.role] || [],
      businessId: primaryBusiness?.businessId,
      indigenousVerified: primaryBusiness?.business.verificationStatus === 'VERIFIED',
      metadata: sessionData.metadata || {},
    };
  } catch (error) {
    await auditLogger.log({
      actorId: null,
      actorType: 'system',
      category: AuditCategory.SYSTEM,
      action: 'session.verify.error',
      resource: 'session',
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        sessionId: sessionId.substring(0, 8) + '...',
      },
    });
    return null;
  }
}

/**
 * Extract session ID from request
 */
function extractSessionId(request: NextRequest): string | null {
  // Check Authorization header for session ID
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Session ')) {
    return authHeader.substring(8);
  }
  
  // Check Bearer token (for backward compatibility during migration)
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check secure HTTP-only cookie (preferred method)
  const sessionCookie = request.cookies.get('session-id')?.value;
  if (sessionCookie) {
    return sessionCookie;
  }
  
  // Check legacy auth-token cookie (for backward compatibility)
  const legacyToken = request.cookies.get('auth-token')?.value;
  if (legacyToken) {
    return legacyToken;
  }
  
  // Check X-Session-ID header
  const sessionHeader = request.headers.get('x-session-id');
  if (sessionHeader) {
    return sessionHeader;
  }
  
  // Check X-API-Key header for API access
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return apiKey;
  }
  
  return null;
}

/**
 * Main authentication middleware
 */
export async function authenticate(
  request: AuthRequest,
  options?: {
    required?: boolean;
    permissions?: string[];
    roles?: string[];
  }
): Promise<NextResponse | null> {
  const { required = true, permissions = [], roles = [] } = options || {};
  
  try {
    // Extract session ID
    const sessionId = extractSessionId(request);
    
    if (!sessionId && !required) {
      // Optional auth - continue without user
      return null;
    }
    
    if (!sessionId && required) {
      await auditLogger.log({
        actorId: 'anonymous',
        actorType: 'system',
        category: AuditCategory.AUTH,
        action: 'auth.failed.no_session',
        resource: request.nextUrl.pathname,
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify session
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const user = await verifySession(sessionId, ipAddress);
    
    if (!user && required) {
      await auditLogger.log({
        actorId: 'anonymous',
        actorType: 'system',
        category: AuditCategory.AUTH,
        action: 'auth.failed.invalid_session',
        resource: request.nextUrl.pathname,
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress,
        metadata: {
          sessionId: sessionId.substring(0, 8) + '...',
        },
      });
      
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    if (user) {
      // Check role requirements
      if (roles.length > 0 && !roles.includes(user.role)) {
        await auditLogger.log({
          actorId: user.id,
          actorType: 'user',
          category: AuditCategory.AUTH,
          action: 'auth.failed.insufficient_role',
          resource: request.nextUrl.pathname,
          severity: AuditSeverity.WARNING,
          result: AuditResult.FAILURE,
          metadata: {
            userRole: user.role,
            requiredRoles: roles,
          },
        });
        
        return NextResponse.json(
          { error: 'Insufficient role permissions' },
          { status: 403 }
        );
      }
      
      // Check permission requirements
      if (permissions.length > 0) {
        const hasPermission = permissions.some(permission => 
          user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
          await auditLogger.log({
            actorId: user.id,
            actorType: 'user',
            category: AuditCategory.AUTH,
            action: 'auth.failed.insufficient_permissions',
            resource: request.nextUrl.pathname,
            severity: AuditSeverity.WARNING,
            result: AuditResult.FAILURE,
            metadata: {
              userPermissions: user.permissions,
              requiredPermissions: permissions,
            },
          });
          
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      // Attach user to request
      request.user = user;
      
      // Check for suspicious session activity
      const concurrentSessions = await redisSessionStore.checkConcurrentSessions(user.id);
      if (concurrentSessions.suspicious) {
        await auditLogger.log({
          actorId: user.id,
          actorType: 'user',
          category: AuditCategory.SECURITY,
          action: 'auth.suspicious_concurrent_sessions',
          resource: 'session',
          severity: AuditSeverity.WARNING,
          result: AuditResult.SUCCESS,
          metadata: {
            sessionCount: concurrentSessions.count,
            details: concurrentSessions.details,
          },
        });
      }
    }
    
    return null; // Continue to next middleware
    
  } catch (error) {
    await auditLogger.log({
      actorId: 'unknown',
      actorType: 'system',
      category: AuditCategory.SYSTEM,
      action: 'auth.middleware.error',
      resource: request.nextUrl.pathname,
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { error: 'Authentication system error' },
      { status: 500 }
    );
  }
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  email: string,
  role: string,
  options?: {
    businessId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  const sessionId = generateSecureSessionId();
  const permissions = rolePermissions[role] || [];
  
  await redisSessionStore.createSession(sessionId, {
    userId,
    email,
    role,
    businessId: options?.businessId,
    permissions,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    metadata: options?.metadata,
  });
  
  return sessionId;
}

/**
 * Destroy a session
 */
export async function destroySession(sessionId: string, reason?: string): Promise<void> {
  await redisSessionStore.deleteSession(sessionId, reason);
}

/**
 * Destroy all sessions for a user except current
 */
export async function destroyUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  return await redisSessionStore.deleteUserSessions(userId, exceptSessionId);
}

/**
 * Generate secure session ID
 */
function generateSecureSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = require('crypto').randomBytes(32).toString('hex');
  return `sess_${timestamp}_${randomBytes}`;
}

/**
 * Refresh session expiration
 */
export async function refreshSession(sessionId: string): Promise<boolean> {
  try {
    await redisSessionStore.updateActivity(sessionId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get session info
 */
export async function getSessionInfo(sessionId: string) {
  return await redisSessionStore.getSession(sessionId);
}

/**
 * Get user sessions
 */
export async function getUserSessions(userId: string) {
  return await redisSessionStore.getUserSessions(userId);
}

/**
 * Check session health
 */
export async function checkSessionHealth(): Promise<boolean> {
  return await redisSessionStore.healthCheck();
}

/**
 * Middleware factory for specific permission requirements
 */
export function requireAuth(options?: {
  permissions?: string[];
  roles?: string[];
}) {
  return async (request: AuthRequest) => {
    return authenticate(request, { ...options, required: true });
  };
}

/**
 * Middleware factory for optional authentication
 */
export function optionalAuth() {
  return async (request: AuthRequest) => {
    return authenticate(request, { required: false });
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission) || 
         user.permissions.includes(Permissions.ADMIN_FULL_ACCESS);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user: AuthenticatedUser, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

// Export for use in API routes
export default {
  authenticate,
  requireAuth,
  optionalAuth,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  Permissions,
};