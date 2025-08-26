/**
 * NextAuth Rate Limiting Wrapper
 * Protects authentication endpoints from brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/security/rate-limiter';
import { auditLogger, AuditCategory, AuditSeverity, AuditResult } from '@/lib/audit';
import { logger } from '@/lib/monitoring/logger';

export async function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async function rateLimitedHandler(req: NextRequest) {
    const startTime = Date.now();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    try {
      // Extract identifier for rate limiting
      // For auth endpoints, we use IP address as primary identifier
      const identifier = ipAddress;
      
      // For login attempts, also check email-based rate limiting
      let emailIdentifier: string | null = null;
      if (req.method === 'POST') {
        try {
          const body = await req.clone().json();
          if (body?.email) {
            emailIdentifier = `email:${body.email.toLowerCase()}`;
          }
        } catch {
          // Ignore body parsing errors
        }
      }
      
      // Check IP-based rate limit (stricter for auth endpoints)
      const ipRateLimit = await rateLimiter.checkLimit(
        identifier,
        'auth',
        req
      );
      
      if (!ipRateLimit.success) {
        await auditLogger.log({
          actorId: null,
          actorType: 'system',
          category: AuditCategory.SECURITY,
          action: 'auth.rate_limited.ip',
          resource: 'auth',
          severity: AuditSeverity.WARNING,
          result: AuditResult.FAILURE,
          ipAddress,
          metadata: {
            limit: ipRateLimit.limit,
            windowMs: 15 * 60 * 1000, // 15 minutes
            retryAfter: ipRateLimit.retryAfter,
          },
        });
        
        // Record violation for progressive rate limiting
        await rateLimiter.recordViolation(identifier);
        
        return NextResponse.json(
          { 
            error: 'Too many authentication attempts. Please try again later.',
            retryAfter: ipRateLimit.retryAfter 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(ipRateLimit.retryAfter || 900),
              'X-RateLimit-Limit': String(ipRateLimit.limit),
              'X-RateLimit-Remaining': String(ipRateLimit.remaining),
              'X-RateLimit-Reset': ipRateLimit.reset.toISOString(),
            }
          }
        );
      }
      
      // Check email-based rate limit if applicable
      if (emailIdentifier) {
        const emailRateLimit = await rateLimiter.checkLimit(
          emailIdentifier,
          'auth-email',
          req
        );
        
        if (!emailRateLimit.success) {
          await auditLogger.log({
            actorId: null,
            actorType: 'system',
            category: AuditCategory.SECURITY,
            action: 'auth.rate_limited.email',
            resource: 'auth',
            severity: AuditSeverity.WARNING,
            result: AuditResult.FAILURE,
            ipAddress,
            metadata: {
              email: emailIdentifier.replace('email:', ''),
              limit: emailRateLimit.limit,
              windowMs: 15 * 60 * 1000,
              retryAfter: emailRateLimit.retryAfter,
            },
          });
          
          // Record violation for email
          await rateLimiter.recordViolation(emailIdentifier);
          
          return NextResponse.json(
            { 
              error: 'Too many login attempts for this email. Please try again later.',
              retryAfter: emailRateLimit.retryAfter 
            },
            { 
              status: 429,
              headers: {
                'Retry-After': String(emailRateLimit.retryAfter || 900),
                'X-RateLimit-Limit': String(emailRateLimit.limit),
                'X-RateLimit-Remaining': String(emailRateLimit.remaining),
                'X-RateLimit-Reset': emailRateLimit.reset.toISOString(),
              }
            }
          );
        }
      }
      
      // Add rate limit headers to successful responses
      const response = await handler(req);
      
      // Clone response to add headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-RateLimit-Limit', String(ipRateLimit.limit));
      newResponse.headers.set('X-RateLimit-Remaining', String(ipRateLimit.remaining));
      newResponse.headers.set('X-RateLimit-Reset', ipRateLimit.reset.toISOString());
      
      // Log successful auth attempt
      const processingTime = Date.now() - startTime;
      if (req.method === 'POST') {
        await auditLogger.log({
          actorId: null,
          actorType: 'system',
          category: AuditCategory.AUTH,
          action: 'auth.attempt',
          resource: 'auth',
          severity: AuditSeverity.INFO,
          result: response.status < 400 ? AuditResult.SUCCESS : AuditResult.FAILURE,
          ipAddress,
          metadata: {
            method: req.method,
            status: response.status,
            processingTimeMs: processingTime,
          },
        });
      }
      
      return newResponse;
      
    } catch (error) {
      logger.error('Rate limiting error in auth handler:', error);
      
      await auditLogger.log({
        actorId: null,
        actorType: 'system',
        category: AuditCategory.SYSTEM,
        action: 'auth.rate_limit.error',
        resource: 'auth',
        severity: AuditSeverity.ERROR,
        result: AuditResult.FAILURE,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      });
      
      // On rate limiter error, allow the request through but log it
      return handler(req);
    }
  };
}

// Initialize auth-specific rate limit configurations
export async function initializeAuthRateLimits() {
  try {
    // Configure auth-email rate limit if not already configured
    if (!rateLimiter.configs.get('auth-email')) {
      rateLimiter.configs.set('auth-email', {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 3, // 3 attempts per email per 15 minutes
        skipSuccessfulRequests: true,
        message: 'Too many login attempts for this email'
      });
    }
    
    logger.info('Auth rate limits initialized');
  } catch (error) {
    logger.error('Failed to initialize auth rate limits:', error);
  }
}

// Initialize on module load
initializeAuthRateLimits();