import { NextRequest, NextResponse } from 'next/server';
import { metricsRegistry } from '@/lib/monitoring/prometheus';
import { logger } from '@/lib/monitoring/logger';

// Prometheus metrics endpoint
export async function GET(request: NextRequest) {
  try {
    // Check if metrics are enabled
    if (process.env.ENABLE_METRICS !== 'true' && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Metrics endpoint is disabled' },
        { status: 403 }
      );
    }

    // Optional: Add basic authentication for production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const expectedAuth = `Bearer ${process.env.METRICS_API_KEY}`;
      
      if (!authHeader || authHeader !== expectedAuth) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { 
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="Metrics"'
            }
          }
        );
      }
    }

    // Get metrics from registry
    const metrics = await metricsRegistry.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': metricsRegistry.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Robots-Tag': 'noindex'
      }
    });
    
  } catch (error) {
    logger.error('Failed to generate metrics', error);
    
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}