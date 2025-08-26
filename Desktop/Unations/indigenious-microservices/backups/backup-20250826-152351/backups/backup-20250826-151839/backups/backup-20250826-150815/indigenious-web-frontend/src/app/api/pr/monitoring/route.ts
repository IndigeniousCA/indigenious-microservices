/**
 * PR Monitoring API
 * PR monitoring status endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return mock monitoring status
    const status = {
      newsMonitoring: {
        active: true,
        lastCheck: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        articlesProcessed: 1247,
        alertsGenerated: 23,
        sources: 142,
      },
      socialMonitoring: {
        active: true,
        lastCheck: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        postsAnalyzed: 3892,
        engagementRate: 4.7,
        sentiment: {
          positive: 67,
          neutral: 28,
          negative: 5,
        },
      },
      competitorTracking: {
        active: true,
        competitors: 8,
        lastUpdate: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        alerts: 3,
      },
    };

    return NextResponse.json(status);

  } catch (error) {
    logger.error('Failed to fetch monitoring status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, service } = body;

    // Log the action
    logger.info('PR monitoring action', {
      action,
      service,
      user: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: `${service} monitoring ${action}d successfully`,
    });

  } catch (error) {
    logger.error('Failed to update monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring' },
      { status: 500 }
    );
  }
}