import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // May need to adjust for your app
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.indigenous-procurement.ca wss://ws.indigenous-procurement.ca",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Remove sensitive headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  
  // Add custom security headers
  response.headers.set('X-PR-Automation', 'secured');
  response.headers.set('X-Request-ID', crypto.randomUUID());
  
  return response;
}

// CSRF token generation and validation
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  private static readonly TOKEN_LIFETIME = 3600000; // 1 hour
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + this.TOKEN_LIFETIME;
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) {
      return false;
    }
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(stored.token)
    );
  }
  
  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    
    for (const [sessionId, data] of this.tokens) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

// CSRF middleware
export async function csrfProtection(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }
  
  // Get session ID (from cookie or header)
  const sessionId = request.cookies.get('session-id')?.value || 
                   request.headers.get('x-session-id');
  
  if (!sessionId) {
    return { valid: false, error: 'No session found' };
  }
  
  // Get CSRF token from header
  const token = request.headers.get('x-csrf-token');
  
  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }
  
  // Validate token
  const isValid = CSRFProtection.validateToken(sessionId, token);
  
  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  return { valid: true };
}

// CORS configuration
export function corsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  
  // Define allowed origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://indigenous-procurement.ca',
    'https://app.indigenous-procurement.ca',
    'https://indigenious.ca'
  ].filter(Boolean);
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Session-ID, X-API-Key'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  
  return response;
}

// Complete security middleware
export async function prSecurityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Check CSRF for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfCheck = await csrfProtection(request);
    
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: csrfCheck.error },
        { status: 403 }
      );
    }
  }
  
  return null;
}