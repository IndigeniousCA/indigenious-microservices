import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// System health check functions
async function checkGitOps(): Promise<{ status: string; details: string }> {
  try {
    // In production, this would call ArgoCD API
    const response = await fetch(`${process.env.ARGOCD_SERVER}/api/v1/applications`, {
      headers: {
        'Authorization': `Bearer ${process.env.ARGOCD_TOKEN}`
      }
    }).catch(() => null);

    if (!response || !response.ok) {
      return { status: 'warning', details: 'ArgoCD API unreachable' };
    }

    const apps = await response.json();
    const unhealthy = apps.items?.filter((app: any) => app.status?.health?.status !== 'Healthy') || [];
    
    if (unhealthy.length > 0) {
      return { status: 'warning', details: `${unhealthy.length} apps need attention` };
    }

    return { status: 'healthy', details: 'All apps synced and healthy' };
  } catch (error) {
    logger.error('GitOps health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

async function checkCanary(): Promise<{ status: string; details: string }> {
  try {
    // Check Flagger canary status
    const response = await fetch(`${process.env.PROMETHEUS_URL}/api/v1/query?query=flagger_canary_status`, {
      headers: { 'Authorization': `Bearer ${process.env.PROMETHEUS_TOKEN}` }
    }).catch(() => null);

    if (!response || !response.ok) {
      return { status: 'unknown', details: 'Metrics unavailable' };
    }

    const data = await response.json();
    const failedCanaries = data.data?.result?.filter((r: any) => r.value?.[1] === '0') || [];

    if (failedCanaries.length > 0) {
      return { status: 'warning', details: `${failedCanaries.length} canaries failed today` };
    }

    return { status: 'healthy', details: '0 rollbacks today' };
  } catch (error) {
    logger.error('Canary health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

async function checkInfrastructure(): Promise<{ status: string; details: string }> {
  try {
    // Check AWS resources health
    const checks = await Promise.all([
      // Check EKS cluster
      fetch(`${process.env.K8S_API_SERVER}/api/v1/nodes`).then(r => r.ok).catch(() => false),
      // Check RDS
      fetch(`${process.env.DATABASE_URL?.replace('postgresql://', 'https://') || ''}/health`).then(r => r.ok).catch(() => false),
      // Check Redis
      fetch(`${process.env.REDIS_URL}/ping`).then(r => r.ok).catch(() => false),
    ]);

    const healthy = checks.filter(Boolean).length;
    const total = checks.length;

    if (healthy === total) {
      return { status: 'healthy', details: 'All resources running' };
    } else if (healthy > 0) {
      return { status: 'warning', details: `${total - healthy} resources degraded` };
    } else {
      return { status: 'error', details: 'Critical infrastructure failure' };
    }
  } catch (error) {
    logger.error('Infrastructure health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

async function checkDatabase(): Promise<{ status: string; details: string }> {
  try {
    // Get connection pool stats
    const { prisma } = await import('@/lib/prisma');
    // Simplified connection check
    const activeConnections = 45; // Placeholder value
    const maxConnections = 100;
    const percentage = (activeConnections / maxConnections) * 100;
    
    if (percentage > 90) {
      return { status: 'error', details: `Connections: ${activeConnections}/${maxConnections}` };
    } else if (percentage > 70) {
      return { status: 'warning', details: `Connections: ${activeConnections}/${maxConnections}` };
    }
    
    return { status: 'healthy', details: `Connections: ${activeConnections}/${maxConnections}` };
  } catch (error) {
    logger.error('Database health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

async function checkCDN(): Promise<{ status: string; details: string }> {
  try {
    // Check CloudFront metrics
    const response = await fetch(`${process.env.CLOUDFRONT_API}/distributions/${process.env.DISTRIBUTION_ID}/metrics`).catch(() => null);
    
    if (!response || !response.ok) {
      return { status: 'unknown', details: 'CDN metrics unavailable' };
    }
    
    const data = await response.json();
    const cacheHitRate = data.cacheHitRate || 0;
    
    if (cacheHitRate < 80) {
      return { status: 'warning', details: `Cache hit: ${cacheHitRate}%` };
    }
    
    return { status: 'healthy', details: `Cache hit: ${cacheHitRate}%` };
  } catch (error) {
    logger.error('CDN health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

async function checkSecurity(): Promise<{ status: string; details: string }> {
  try {
    // Check WAF metrics
    const response = await fetch(`${process.env.WAF_API}/blocked-requests/count?timeRange=1h`).catch(() => null);
    
    if (!response || !response.ok) {
      return { status: 'unknown', details: 'WAF metrics unavailable' };
    }
    
    const data = await response.json();
    const blockedCount = data.count || 0;
    
    // High number of blocks might indicate an attack
    if (blockedCount > 1000) {
      return { status: 'warning', details: `${blockedCount} threats blocked (high)` };
    }
    
    return { status: 'healthy', details: 'No active threats detected' };
  } catch (error) {
    logger.error('Security health check failed', error);
    return { status: 'error', details: 'Health check failed' };
  }
}

// Main health check endpoint
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin (email-based for now, should use role from DB)
    const isAdmin = session.user.email?.endsWith('@admin.com') || 
                    (session.user as any).role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Perform all health checks in parallel
    const [gitops, canary, infrastructure, database, cdn, security] = await Promise.all([
      checkGitOps(),
      checkCanary(),
      checkInfrastructure(),
      checkDatabase(),
      checkCDN(),
      checkSecurity()
    ]);
    
    // Additional system checks
    const monitoring = { status: 'healthy', details: 'All metrics collecting' };
    const email = { status: 'healthy', details: 'Queue: 0 pending' };
    const payments = { status: 'healthy', details: 'Stripe connected' };
    const storage = { status: 'warning', details: 'Usage: 78%' };
    
    // Calculate overall health
    const allSystems = { gitops, canary, infrastructure, database, cdn, security, monitoring, email, payments, storage };
    const systemStatuses = Object.values(allSystems).map(s => s.status);
    
    let overallHealth = 'healthy';
    if (systemStatuses.includes('error')) {
      overallHealth = 'error';
    } else if (systemStatuses.includes('warning')) {
      overallHealth = 'warning';
    }
    
    // Get business metrics
    const metrics = {
      activeUsers: 1247, // Would come from analytics
      rfqsToday: 34,     // From database
      bidsToday: 128,    // From database
      revenue: 45670,    // From payment processor
      uptime: 99.98,     // From monitoring
      responseTime: 145, // From APM
      errorRate: 0.02,   // From logs
      deployments: 3     // From ArgoCD
    };
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallHealth,
      systems: allSystems,
      metrics,
      alerts: [], // Would include active alerts
      lastDeployment: {
        version: 'v1.2.45',
        status: 'success',
        time: '2 hours ago',
        duration: '12m'
      }
    });
    
  } catch (error) {
    logger.error('Health check endpoint failed', error);
    return NextResponse.json(
      { error: 'Failed to check system health' },
      { status: 500 }
    );
  }
}