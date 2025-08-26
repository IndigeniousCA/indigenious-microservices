/**
 * Session Management Utility
 * Handles login, logout, and session lifecycle operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession, destroyUserSessions } from './auth-middleware';
import { auditLogger, AuditCategory, AuditSeverity, AuditResult } from '@/lib/audit';
import { redisSessionStore } from '@/lib/session/redis-store';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    businessId?: string;
  };
  error?: string;
}

/**
 * Authenticate user and create session
 */
export async function login(
  credentials: LoginCredentials,
  request: NextRequest
): Promise<LoginResult> {
  const { email, password, remember = false } = credentials;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        businesses: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      await auditLogger.log({
        actorId: null,
        actorType: 'system',
        category: AuditCategory.AUTH,
        action: 'login.failed.user_not_found',
        resource: 'auth',
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress,
        metadata: { email },
      });

      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await auditLogger.log({
        actorId: user.id,
        actorType: 'user',
        category: AuditCategory.AUTH,
        action: 'login.failed.invalid_password',
        resource: 'auth',
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress,
        metadata: { email },
      });

      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Check if account is active
    if (!user.isActive) {
      await auditLogger.log({
        actorId: user.id,
        actorType: 'user',
        category: AuditCategory.AUTH,
        action: 'login.failed.account_inactive',
        resource: 'auth',
        severity: AuditSeverity.WARNING,
        result: AuditResult.FAILURE,
        ipAddress,
        metadata: { email },
      });

      return {
        success: false,
        error: 'Account is inactive. Please contact support.',
      };
    }

    // Get primary business
    const primaryBusiness = user.businesses.find(b => b.isPrimary);

    // Create new session
    const sessionId = await createSession(
      user.id,
      user.email,
      user.role,
      {
        businessId: primaryBusiness?.businessId,
        ipAddress,
        userAgent,
        metadata: {
          remember,
          loginTime: new Date().toISOString(),
          loginIP: ipAddress,
        },
      }
    );

    // Update user's last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: ipAddress,
      },
    });

    // Log successful login
    await auditLogger.log({
      actorId: user.id,
      actorType: 'user',
      category: AuditCategory.AUTH,
      action: 'login.success',
      resource: 'auth',
      severity: AuditSeverity.INFO,
      result: AuditResult.SUCCESS,
      ipAddress,
      metadata: {
        email,
        sessionId: sessionId.substring(0, 8) + '...',
        businessId: primaryBusiness?.businessId,
        remember,
      },
    });

    return {
      success: true,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: primaryBusiness?.businessId,
      },
    };

  } catch (error) {
    await auditLogger.log({
      actorId: null,
      actorType: 'system',
      category: AuditCategory.SYSTEM,
      action: 'login.error',
      resource: 'auth',
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
      metadata: { email },
    });

    return {
      success: false,
      error: 'Login system error. Please try again.',
    };
  }
}

/**
 * Logout user and destroy session
 */
export async function logout(
  sessionId: string,
  request: NextRequest
): Promise<{ success: boolean; error?: string }> {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  try {
    // Get session info before destroying it
    const sessionData = await redisSessionStore.getSession(sessionId);
    
    if (sessionData) {
      // Destroy session
      await destroySession(sessionId, 'User logout');

      // Log logout
      await auditLogger.log({
        actorId: sessionData.userId,
        actorType: 'user',
        category: AuditCategory.AUTH,
        action: 'logout.success',
        resource: 'auth',
        severity: AuditSeverity.INFO,
        result: AuditResult.SUCCESS,
        ipAddress,
        metadata: {
          sessionId: sessionId.substring(0, 8) + '...',
          sessionDuration: Date.now() - sessionData.createdAt.getTime(),
        },
      });
    }

    return { success: true };

  } catch (error) {
    await auditLogger.log({
      actorId: null,
      actorType: 'system',
      category: AuditCategory.SYSTEM,
      action: 'logout.error',
      resource: 'auth',
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
      metadata: {
        sessionId: sessionId.substring(0, 8) + '...',
      },
    });

    return {
      success: false,
      error: 'Logout failed. Please try again.',
    };
  }
}

/**
 * Logout from all devices
 */
export async function logoutAllDevices(
  userId: string,
  currentSessionId: string,
  request: NextRequest
): Promise<{ success: boolean; terminatedSessions: number; error?: string }> {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  try {
    // Destroy all sessions except current one
    const terminatedCount = await destroyUserSessions(userId, currentSessionId);

    // Log the action
    await auditLogger.log({
      actorId: userId,
      actorType: 'user',
      category: AuditCategory.AUTH,
      action: 'logout.all_devices',
      resource: 'auth',
      severity: AuditSeverity.INFO,
      result: AuditResult.SUCCESS,
      ipAddress,
      metadata: {
        terminatedSessions: terminatedCount,
        currentSessionId: currentSessionId.substring(0, 8) + '...',
      },
    });

    return {
      success: true,
      terminatedSessions: terminatedCount,
    };

  } catch (error) {
    await auditLogger.log({
      actorId: userId,
      actorType: 'user',
      category: AuditCategory.SYSTEM,
      action: 'logout.all_devices.error',
      resource: 'auth',
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress,
    });

    return {
      success: false,
      terminatedSessions: 0,
      error: 'Failed to logout from all devices.',
    };
  }
}

/**
 * Set session cookie on response
 */
export function setSessionCookie(
  response: NextResponse,
  sessionId: string,
  options?: {
    remember?: boolean;
    domain?: string;
  }
): NextResponse {
  const { remember = false, domain } = options || {};
  
  // Set secure HTTP-only cookie
  response.cookies.set('session-id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
    domain,
    path: '/',
  });

  return response;
}

/**
 * Clear session cookie on response
 */
export function clearSessionCookie(
  response: NextResponse,
  domain?: string
): NextResponse {
  response.cookies.set('session-id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    domain,
    path: '/',
  });

  // Also clear legacy auth-token cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    domain,
    path: '/',
  });

  return response;
}

/**
 * Validate session and refresh if needed
 */
export async function validateAndRefreshSession(
  sessionId: string,
  request: NextRequest
): Promise<{ valid: boolean; user?: any; refreshed?: boolean }> {
  try {
    const sessionData = await redisSessionStore.getSession(sessionId);
    
    if (!sessionData) {
      return { valid: false };
    }

    // Check if session needs refresh (older than 15 minutes)
    const lastActivity = new Date(sessionData.lastActivity);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    let refreshed = false;
    if (lastActivity < fifteenMinutesAgo) {
      await redisSessionStore.updateActivity(sessionId);
      refreshed = true;
    }

    return {
      valid: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        businessId: sessionData.businessId,
        permissions: sessionData.permissions,
      },
      refreshed,
    };

  } catch (error) {
    await auditLogger.log({
      actorId: null,
      actorType: 'system',
      category: AuditCategory.SYSTEM,
      action: 'session.validate.error',
      resource: 'session',
      severity: AuditSeverity.ERROR,
      result: AuditResult.FAILURE,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        sessionId: sessionId.substring(0, 8) + '...',
      },
    });

    return { valid: false };
  }
}