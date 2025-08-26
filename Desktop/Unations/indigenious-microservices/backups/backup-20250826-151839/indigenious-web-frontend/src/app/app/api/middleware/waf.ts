/**
 * WAF API Middleware
 * Integrates advanced WAF protection for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { waf } from '@/lib/security/waf'

// Convert Next.js request to Express-like format for WAF
function convertRequest(request: NextRequest) {
  return {
    method: request.method,
    url: request.url,
    path: request.nextUrl.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    body: null, // Will be parsed later if needed
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
    user: null, // Will be set by auth middleware
    connection: {
      remoteAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
    },
    socket: {
      remoteAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown',
    },
  }
}

// Convert Express-like response methods to Next.js response
function createResponse() {
  const headers = new Headers()
  let statusCode = 200
  
  return {
    setHeader: (key: string, value: string) => headers.set(key, value),
    status: (code: number) => {
      statusCode = code
      return {
        json: (data: unknown) => {
          headers.set('Content-Type', 'application/json')
          return new NextResponse(JSON.stringify(data), {
            status: statusCode,
            headers,
          })
        },
      }
    },
    headers,
    statusCode,
  }
}

/**
 * WAF middleware for API routes
 */
export async function withWAF(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Convert request format
  const req = convertRequest(request)
  const res = createResponse()
  
  // Apply WAF protection
  return new Promise((resolve) => {
    const middleware = waf.middleware()
    
    middleware(req, res, async () => {
      // WAF passed, continue to handler
      try {
        const response = await handler(request)
        
        // Apply security headers from WAF
        res.headers.forEach((value, key) => {
          response.headers.set(key, value)
        })
        
        resolve(response)
      } catch (error) {
        logger.error('API handler error:', error)
        resolve(
          NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          )
        )
      }
    })
  })
}

/**
 * Create protected API route
 */
export function createProtectedRoute(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return withWAF(request, handler)
  }
}