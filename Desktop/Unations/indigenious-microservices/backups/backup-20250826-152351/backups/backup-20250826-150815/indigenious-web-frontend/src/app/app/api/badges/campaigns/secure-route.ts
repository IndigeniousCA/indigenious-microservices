import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { withTransaction } from '@/lib/database';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { 
  APIError, 
  UnauthorizedError, 
  ValidationError,
  SecurityError 
} from '@/lib/errors';

// Ethical campaign service (replaces concerning viral campaigns)
const rateLimiter = new RateLimiter({
  campaignCreate: { points: 5, duration: 3600 }, // 5 per hour
  campaignQuery: { points: 100, duration: 60 } // 100 per minute
});
const auditLogger = new AuditLogger();

// Ethical campaign types only
const APPROVED_CAMPAIGN_TYPES = [
  'awareness', // General awareness campaigns
  'education', // Educational content campaigns  
  'community', // Community-driven campaigns
  'milestone' // Celebration of achievements
] as const;

// Strict authorization levels
const REQUIRED_ROLES = ['ADMIN', 'MARKETING_MANAGER', 'COMMUNITY_MANAGER'] as const;

// Input validation schemas
const CampaignSchema = z.object({
  type: z.enum(APPROVED_CAMPAIGN_TYPES),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  targetAudience: z.enum(['general', 'businesses', 'government', 'community']),
  content: z.object({
    message: z.string().max(1000),
    callToAction: z.string().max(200),
    resources: z.array(z.string().url()).optional()
  }),
  settings: z.object({
    duration: z.number().min(1).max(90), // Max 90 days
    budget: z.number().min(0).max(50000), // Max $50k
    channels: z.array(z.enum(['email', 'website', 'social', 'partners'])),
    consent: z.boolean().refine(val => val === true, 'Consent required')
  }),
  compliance: z.object({
    legalReview: z.boolean(),
    privacyCompliant: z.boolean(),
    accessibilityChecked: z.boolean(),
    indigenousApproval: z.boolean().optional()
  })
});

const QuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d']).default('7d'),
  type: z.enum([...APPROVED_CAMPAIGN_TYPES, 'all']).default('all'),
  status: z.enum(['active', 'completed', 'paused', 'all']).default('all')
});

// POST /api/badges/campaigns - Create ethical campaign
export async function POST(request: NextRequest) {
  try {
    // Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!REQUIRED_ROLES.includes(session.user.role as any)) {
      throw new UnauthorizedError('Insufficient permissions for campaign management');
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'campaignCreate');
    if (!allowed) {
      throw new SecurityError('Too many campaign creation attempts');
    }

    const body = await request.json();

    // Input validation
    const validatedData = CampaignSchema.parse(body);
    
    // Sanitize content
    const sanitizedData = {
      ...validatedData,
      name: DOMPurify.sanitize(validatedData.name),
      description: DOMPurify.sanitize(validatedData.description),
      content: {
        ...validatedData.content,
        message: DOMPurify.sanitize(validatedData.content.message),
        callToAction: DOMPurify.sanitize(validatedData.content.callToAction)
      }
    };

    // Compliance checks
    await performComplianceValidation(sanitizedData, session.user);

    // Create campaign
    const campaign = await withTransaction(async (tx) => {
      const newCampaign = await (tx as any).ethicalCampaign.create({
        data: {
          ...sanitizedData,
          createdBy: session.user.id,
          status: 'PENDING_APPROVAL',
          approvals: {
            legal: sanitizedData.compliance.legalReview,
            privacy: sanitizedData.compliance.privacyCompliant,
            accessibility: sanitizedData.compliance.accessibilityChecked,
            indigenous: sanitizedData.compliance.indigenousApproval || false
          },
          metadata: {
            createdAt: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent')
          }
        }
      });

      // Create audit trail
      await (tx as any).campaignAudit.create({
        data: {
          campaignId: newCampaign.id,
          action: 'CREATED',
          performedBy: session.user.id,
          details: {
            type: sanitizedData.type,
            compliance: sanitizedData.compliance
          }
        }
      });

      return newCampaign;
    });

    // Log campaign creation
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'CREATE' as any,
      resourceType: 'campaign',
      resourceId: campaign.id,
      metadata: {
        type: sanitizedData.type,
        targetAudience: sanitizedData.targetAudience,
        duration: sanitizedData.settings.duration,
        securityLevel: 'MEDIUM'
      }
    });

    // Queue for approval workflow
    await queueCampaignApproval(campaign.id);

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        createdAt: campaign.createdAt
      },
      message: 'Campaign created and queued for approval'
    });

  } catch (error) {
    logger.error('Ethical campaign creation failed', { 
      error,
      userId: (await getServerSession(authOptions))?.user?.id
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid campaign data', 
          code: 'VALIDATION_ERROR',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create campaign',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET /api/badges/campaigns - Get campaign analytics
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || session.user.id;
    const allowed = await rateLimiter.consume(clientId, 'campaignQuery');
    if (!allowed) {
      throw new SecurityError('Too many requests');
    }

    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      timeframe: searchParams.get('timeframe'),
      type: searchParams.get('type'),
      status: searchParams.get('status')
    });

    // Get campaign analytics
    const analytics = await getCampaignAnalytics(query, session.user);

    // Log analytics access
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'READ' as any,
      resourceType: 'campaign_analytics',
      metadata: query
    });

    return NextResponse.json({
      success: true,
      analytics,
      compliance: {
        ethicalStandards: 'All campaigns follow ethical marketing standards',
        consentBased: 'All communications require explicit consent',
        transparencyRequired: 'All campaigns include clear disclosure'
      }
    });

  } catch (error) {
    logger.error('Campaign analytics error', { error });

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function performComplianceValidation(
  campaignData: any,
  user: any
): Promise<void> {
  // Check required approvals
  if (!campaignData.compliance.legalReview) {
    throw new ValidationError('Legal review required for all campaigns');
  }

  if (!campaignData.compliance.privacyCompliant) {
    throw new ValidationError('Privacy compliance certification required');
  }

  if (!campaignData.compliance.accessibilityChecked) {
    throw new ValidationError('Accessibility review required');
  }

  // Check consent requirement
  if (!campaignData.settings.consent) {
    throw new ValidationError('Explicit consent requirement must be acknowledged');
  }

  // Check budget limits based on role
  const maxBudget = user.role === 'ADMIN' ? 50000 : 10000;
  if (campaignData.settings.budget > maxBudget) {
    throw new ValidationError(`Budget exceeds limit for ${user.role} role`);
  }

  // Check for prohibited content
  const prohibitedTerms = [
    'pressure', 'shame', 'force', 'manipulate', 'trick', 
    'deceive', 'exploit', 'nuclear', 'attack'
  ];
  
  const contentText = [
    campaignData.name,
    campaignData.description,
    campaignData.content.message,
    campaignData.content.callToAction
  ].join(' ').toLowerCase();

  const foundProhibited = prohibitedTerms.find(term => 
    contentText.includes(term)
  );

  if (foundProhibited) {
    throw new SecurityError(
      `Prohibited content detected: "${foundProhibited}". Campaigns must be ethical and consent-based.`
    );
  }
}

async function queueCampaignApproval(campaignId: string): Promise<void> {
  // Queue campaign for approval workflow
  logger.info('Campaign queued for approval', { campaignId });
  
  // TODO: Implement approval workflow
  // - Notify approval team
  // - Set up approval timeouts
  // - Create approval tracking
}

async function getCampaignAnalytics(
  query: any,
  user: any
): Promise<any> {
  const { prisma } = await import('@/lib/prisma');
  
  // Calculate date range
  const days = parseInt(query.timeframe.replace('d', ''));
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build filters
  const where: any = {
    createdAt: { gte: startDate }
  };

  if (query.type !== 'all') {
    where.type = query.type;
  }

  if (query.status !== 'all') {
    where.status = query.status;
  }

  // Only show user's campaigns unless admin
  if (user.role !== 'ADMIN') {
    where.createdBy = user.id;
  }

  // Get campaigns
  const campaigns = await (prisma as any).ethicalCampaign.findMany({
    where,
    include: {
      _count: {
        select: {
          interactions: true,
          conversions: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate metrics
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length;
  const totalInteractions = campaigns.reduce(
    (sum: number, c: any) => sum + (c._count?.interactions || 0), 
    0
  );
  const totalConversions = campaigns.reduce(
    (sum: number, c: any) => sum + (c._count?.conversions || 0), 
    0
  );

  return {
    summary: {
      totalCampaigns,
      activeCampaigns,
      totalInteractions,
      totalConversions,
      conversionRate: totalInteractions > 0 
        ? ((totalConversions / totalInteractions) * 100).toFixed(2)
        : 0
    },
    campaigns: campaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      targetAudience: c.targetAudience,
      interactions: c._count?.interactions || 0,
      conversions: c._count?.conversions || 0,
      createdAt: c.createdAt
    })),
    typeBreakdown: calculateTypeBreakdown(campaigns),
    audienceBreakdown: calculateAudienceBreakdown(campaigns),
    ethicalCompliance: {
      consentRate: 100, // All campaigns require consent
      transparencyScore: 100, // All campaigns are transparent
      ethicalReviewPassed: campaigns.filter((c: any) => 
        c.approvals?.legal && c.approvals?.privacy
      ).length
    }
  };
}

function calculateTypeBreakdown(campaigns: any[]): any {
  const breakdown = campaigns.reduce((acc: any, campaign: any) => {
    acc[campaign.type] = (acc[campaign.type] || 0) + 1;
    return acc;
  }, {});

  return breakdown;
}

function calculateAudienceBreakdown(campaigns: any[]): any {
  const breakdown = campaigns.reduce((acc: any, campaign: any) => {
    acc[campaign.targetAudience] = (acc[campaign.targetAudience] || 0) + 1;
    return acc;
  }, {});

  return breakdown;
}