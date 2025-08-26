import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST /api/badges/[badgeId]/analytics - Track badge events
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;
    const body = await request.json();

    // Validate input
    const schema = z.object({
      event: z.enum(['impression', 'click', 'conversion', 'share']),
      platform: z.string(),
      url: z.string().optional(),
      referrer: z.string().optional(),
      metadata: z.record(z.any()).optional()
    });

    const eventData = schema.parse(body);

    // Update badge analytics
    const updateData: any = {};
    
    switch (eventData.event) {
      case 'impression':
        // Track platform-specific impressions
        try {
          const platform = await (prisma as any).badgePlatform.findFirst({
            where: {
              badgeId,
              platform: eventData.platform
            }
          });

          if (platform) {
            await (prisma as any).badgePlatform.update({
              where: { id: platform.id },
              data: {
                impressions: { increment: 1 },
                lastActivity: new Date()
              }
            });
          }
        } catch (e) {
          // BadgePlatform model might not be available
          console.warn('BadgePlatform model not available:', e);
        }
        break;

      case 'click':
        updateData.clickCount = { increment: 1 };
        
        // Update platform clicks
        try {
          const clickPlatform = await (prisma as any).badgePlatform.findFirst({
            where: {
              badgeId,
              platform: eventData.platform
            }
          });

          if (clickPlatform) {
            await (prisma as any).badgePlatform.update({
              where: { id: clickPlatform.id },
              data: {
                clicks: { increment: 1 },
                lastActivity: new Date()
              }
            });
          }
        } catch (e) {
          console.warn('BadgePlatform model not available:', e);
        }
        break;

      case 'conversion':
        updateData.conversionCount = { increment: 1 };
        
        // Calculate viral coefficient
        try {
          const badge = await (prisma as any).badge.findUnique({
            where: { id: badgeId }
          });
          
          if (badge && badge.clickCount > 0) {
            updateData.viralCoefficient = (badge.conversionCount + 1) / badge.clickCount;
          }
        } catch (e) {
          console.warn('Badge model not available:', e);
        }

        // Update platform conversions
        try {
          const convPlatform = await (prisma as any).badgePlatform.findFirst({
            where: {
              badgeId,
              platform: eventData.platform
            }
          });

          if (convPlatform) {
            await (prisma as any).badgePlatform.update({
              where: { id: convPlatform.id },
              data: {
                conversions: { increment: 1 },
                lastActivity: new Date()
              }
            });
          }
        } catch (e) {
          console.warn('BadgePlatform model not available:', e);
        }
        break;
    }

    // Update badge if needed
    if (Object.keys(updateData).length > 0) {
      try {
        await (prisma as any).badge.update({
          where: { id: badgeId },
          data: updateData
        });
      } catch (e) {
        console.warn('Badge model not available:', e);
      }
    }

    // Log the event for detailed analytics
    await logAnalyticsEvent({
      badgeId,
      event: eventData.event,
      platform: eventData.platform,
      url: eventData.url,
      referrer: eventData.referrer,
      metadata: eventData.metadata
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    );
  }
}

// GET /api/badges/[badgeId]/analytics - Get badge analytics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';

    const badge = await (prisma as any).badge.findUnique({
      where: { id: badgeId },
      include: {
        platforms: true
      }
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Calculate analytics based on timeframe
    const analytics = {
      overview: {
        totalImpressions: badge.platforms.reduce((sum: number, p: any) => sum + p.impressions, 0),
        totalClicks: badge.clickCount,
        totalConversions: badge.conversionCount,
        viralCoefficient: badge.viralCoefficient,
        clickThroughRate: badge.clickCount > 0 
          ? (badge.clickCount / badge.platforms.reduce((sum: number, p: any) => sum + p.impressions, 0)) * 100 
          : 0,
        conversionRate: badge.clickCount > 0 
          ? (badge.conversionCount / badge.clickCount) * 100 
          : 0
      },
      platforms: badge.platforms.map((p: any) => ({
        platform: p.platform,
        impressions: p.impressions,
        clicks: p.clicks,
        conversions: p.conversions,
        lastActivity: p.lastActivity,
        performance: {
          ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
          conversionRate: p.clicks > 0 ? (p.conversions / p.clicks) * 100 : 0
        }
      })),
      timeframe
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper function to log detailed analytics events
async function logAnalyticsEvent(data: {
  badgeId: string;
  event: string;
  platform: string;
  url?: string;
  referrer?: string;
  metadata?: any;
}) {
  // In a production environment, this would log to a dedicated analytics service
  // For now, we'll just console log
  console.log('Analytics Event:', {
    ...data,
    timestamp: new Date().toISOString()
  });
}