/**
 * Email Tracking Endpoint
 * Records email opens for analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Validation schema for tracking parameters
const trackingSchema = z.object({
  to: z.string().email().optional(),
  template: z.string().max(100).optional(),
  t: z.string().optional(), // timestamp
});

// 1x1 transparent pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Convert URLSearchParams to object for validation
    const queryParams: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Validate query parameters
    const validationResult = trackingSchema.safeParse(queryParams);
    if (!validationResult.success) {
      // Still return pixel even on validation error to avoid breaking email display
      logger.warn('Invalid email tracking parameters', {
        errors: validationResult.error.errors,
        params: queryParams,
      });
      
      return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
    
    const { to, template, t: timestamp } = validationResult.data
    
    // Log email open event
    if (to && template) {
      // Sanitize user agent and IP for logging
      const userAgent = request.headers.get('user-agent')?.slice(0, 500) || 'unknown';
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      
      // Extract first IP from x-forwarded-for if present
      const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
      
      logger.info('Email opened', {
        to,
        template,
        timestamp,
        openedAt: new Date().toISOString(),
        userAgent,
        ip,
      })
      
      // TODO: Record in analytics database
      // await recordEmailOpen({ to, template, timestamp })
    }
    
    // Return tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    logger.error('Email tracking error:', error)
    
    // Still return pixel on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
      },
    })
  }
}