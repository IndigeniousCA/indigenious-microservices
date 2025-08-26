import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate, authorize } from './auth';
import { checkRateLimit, applyRateLimitHeaders, Ratelimit } from './rateLimiter';
import { applySecurityHeaders, prSecurityMiddleware } from './security-headers';
import { prAuditLogger } from '../services/audit-logger';
import { logger } from '@/lib/monitoring/logger';

export interface SecureHandlerOptions {
  // Authentication
  requireAuth?: boolean;
  permissions?: string[];
  
  // Rate limiting
  rateLimit?: Ratelimit;
  rateLimitKey?: (req: NextRequest) => string;
  
  // Validation
  schema?: z.ZodSchema;
  
  // Logging
  auditAction?: string;
  auditResource?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  
  // Security
  allowedMethods?: string[];
  requireCSRF?: boolean;
}

export interface SecureContext {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  validatedData?: any;
  request: NextRequest;
}

type SecureHandler = (
  context: SecureContext
) => Promise<NextResponse> | NextResponse;

export function createSecureHandler(
  handler: SecureHandler,
  options: SecureHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId = 'anonymous';
    
    try {
      // 1. Check allowed methods
      if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { status: 405 }
        );
      }
      
      // 2. Apply security middleware (CSRF, etc.)
      const securityCheck = await prSecurityMiddleware(request);
      if (securityCheck) {
        return securityCheck;
      }
      
      // 3. Authentication
      let user;
      if (options.requireAuth !== false) {
        const auth = await authenticate(request);
        
        if (!auth.authorized) {
          await prAuditLogger.logSecurity({
            event: 'auth_failure',
            severity: 'warning',
            details: {
              path: request.nextUrl.pathname,
              error: auth.error
            },
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          return NextResponse.json(
            { error: auth.error || 'Authentication required' },
            { status: 401 }
          );
        }
        
        user = auth.user;
        userId = user.id;
      }
      
      // 4. Authorization
      if (options.permissions && options.permissions.length > 0) {
        const authz = await authorize(...options.permissions)(request);
        
        if (!authz.authorized) {
          await prAuditLogger.logSecurity({
            event: 'permission_denied',
            severity: 'warning',
            details: {
              path: request.nextUrl.pathname,
              required: options.permissions,
              user: userId
            },
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userId
          });
          
          return NextResponse.json(
            { error: authz.error || 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      // 5. Rate limiting
      if (options.rateLimit) {
        const identifier = options.rateLimitKey?.(request) || userId;
        const rateLimitInfo = await checkRateLimit(request, options.rateLimit, identifier);
        
        if (!rateLimitInfo.success) {
          await prAuditLogger.logSecurity({
            event: 'rate_limit',
            severity: 'warning',
            details: {
              path: request.nextUrl.pathname,
              identifier
            },
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userId
          });
          
          const response = NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
          
          return applyRateLimitHeaders(response, rateLimitInfo);
        }
      }
      
      // 6. Input validation
      let validatedData;
      if (options.schema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          validatedData = await options.schema.parseAsync(body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            await prAuditLogger.logSecurity({
              event: 'suspicious_activity',
              severity: 'info',
              details: {
                type: 'validation_failure',
                errors: error.errors
              },
              ip: request.headers.get('x-forwarded-for') || 'unknown',
              userId
            });
            
            return NextResponse.json(
              { 
                error: 'Invalid request data',
                details: error.errors
              },
              { status: 400 }
            );
          }
          throw error;
        }
      }
      
      // 7. Execute handler
      const context: SecureContext = {
        user,
        validatedData,
        request
      };
      
      const response = await handler(context);
      
      // 8. Audit logging (success)
      if (options.auditAction) {
        await prAuditLogger.log({
          userId,
          action: options.auditAction,
          resource: options.auditResource || 'pr_automation',
          details: {
            method: request.method,
            path: request.nextUrl.pathname,
            duration: Date.now() - startTime
          },
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          result: 'success',
          risk: options.riskLevel
        });
      }
      
      // 9. Apply security headers
      return applySecurityHeaders(response);
      
    } catch (error) {
      // Log error
      logger.error('Secure handler error:', {
        error,
        path: request.nextUrl.pathname,
        userId
      });
      
      // Audit logging (failure)
      if (options.auditAction) {
        await prAuditLogger.log({
          userId,
          action: options.auditAction,
          resource: options.auditResource || 'pr_automation',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            path: request.nextUrl.pathname
          },
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          result: 'error',
          risk: options.riskLevel
        });
      }
      
      // Don't leak error details
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Helper to create API route handlers
export function createPRApiRoute(
  handlers: {
    GET?: SecureHandler;
    POST?: SecureHandler;
    PUT?: SecureHandler;
    DELETE?: SecureHandler;
    PATCH?: SecureHandler;
  },
  defaultOptions?: SecureHandlerOptions
) {
  const routes: Record<string, any> = {};
  
  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      routes[method] = createSecureHandler(handler, {
        ...defaultOptions,
        allowedMethods: [method]
      });
    }
  }
  
  return routes;
}