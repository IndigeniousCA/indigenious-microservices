/**
 * Secure PR Campaigns API
 * Ethical campaign management endpoint with full security controls
 */

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

const rateLimiter = new RateLimiter({
  prCampaignCreate: { points: 10, duration: 3600 }, // 10 per hour
  prCampaignQuery: { points: 100, duration: 60 } // 100 per minute
});
const auditLogger = new AuditLogger();

// Authorized roles for PR campaigns
const AUTHORIZED_ROLES = ['ADMIN', 'MARKETING_MANAGER', 'PR_MANAGER', 'COMMUNITY_MANAGER'] as const;

// Input validation schemas
const CampaignCreationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  type: z.enum(['awareness', 'education', 'community', 'milestone']),
  targetAudience: z.enum(['general', 'businesses', 'government', 'indigenous_communities']),
  content: z.object({
    subject: z.string().max(100),
    message: z.string().max(2000),
    callToAction: z.string().max(200),
    attachments: z.array(z.string().url()).max(5).optional()
  }),
  settings: z.object({
    startDate: z.string().datetime().transform(str => new Date(str)),
    endDate: z.string().datetime().transform(str => new Date(str)),
    budget: z.number().min(0).max(25000), // Max $25k
    channels: z.array(z.enum(['email', 'website', 'social_media', 'newsletter'])).min(1),
    requiresConsent: z.boolean().refine(val => val === true, 'Consent required'),
    autoApproval: z.boolean().default(false)
  }),
  compliance: z.object({
    legalReview: z.boolean(),
    privacyCompliant: z.boolean(),
    accessibilityReviewed: z.boolean(),
    culturallyAppropriate: z.boolean().optional()
  })
});

const CampaignQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled', 'all']).default('all'),
  type: z.enum(['awareness', 'education', 'community', 'milestone', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

// GET /api/pr/campaigns - List PR campaigns
export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!AUTHORIZED_ROLES.includes(session.user.role as any)) {
      throw new UnauthorizedError('Insufficient permissions for PR campaign access');
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'prCampaignQuery');
    if (!allowed) {
      throw new SecurityError('Too many requests');
    }

    const { searchParams } = new URL(request.url);
    const query = CampaignQuerySchema.parse({
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    });

    // Get campaigns with proper filtering
    const campaigns = await getCampaigns(query, session.user);

    // Log access
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'READ' as any,
      resourceType: 'pr_campaign',
      metadata: {
        query,
        resultCount: campaigns.length,
        action: 'view_pr_campaigns'
      }
    });

    return NextResponse.json({
      success: true,
      campaigns,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: campaigns.length === query.limit
      },
      compliance: {
        ethicalStandards: 'All campaigns follow ethical PR standards',
        consentRequired: 'Explicit consent required for all communications',
        transparency: 'Full disclosure of campaign sources and intent'
      }
    });

  } catch (error) {
    logger.error('PR campaign query failed', { error });

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// POST /api/pr/campaigns - Create ethical PR campaign
export async function POST(request: NextRequest) {
  try {
    // Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!AUTHORIZED_ROLES.includes(session.user.role as any)) {
      throw new UnauthorizedError('Insufficient permissions for PR campaign creation');
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'prCampaignCreate');
    if (!allowed) {
      throw new SecurityError('Too many campaign creation attempts');
    }

    const body = await request.json();

    // Input validation
    const validatedData = CampaignCreationSchema.parse(body);
    
    // Sanitize content
    const sanitizedData = {
      ...validatedData,
      name: DOMPurify.sanitize(validatedData.name),
      description: DOMPurify.sanitize(validatedData.description),
      content: {
        ...validatedData.content,
        subject: DOMPurify.sanitize(validatedData.content.subject),
        message: DOMPurify.sanitize(validatedData.content.message),
        callToAction: DOMPurify.sanitize(validatedData.content.callToAction)
      }
    };

    // Compliance validation
    await validateCampaignCompliance(sanitizedData, session.user);

    // Create campaign with audit trail
    const campaign = await withTransaction(async (tx) => {
      const newCampaign = await (tx as any).prCampaign.create({
        data: {
          ...sanitizedData,
          createdBy: session.user.id,
          status: sanitizedData.settings.autoApproval ? 'ACTIVE' : 'PENDING_APPROVAL',
          approvals: {
            legal: sanitizedData.compliance.legalReview,
            privacy: sanitizedData.compliance.privacyCompliant,
            accessibility: sanitizedData.compliance.accessibilityReviewed,
            cultural: sanitizedData.compliance.culturallyAppropriate || false
          },
          metadata: {
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent')
          }
        }
      });

      // Create audit event
      await (tx as any).prCampaignAudit.create({
        data: {
          campaignId: newCampaign.id,
          action: 'CREATED',
          performedBy: session.user.id,
          details: {
            type: sanitizedData.type,
            budget: sanitizedData.settings.budget,
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
      resourceType: 'pr_campaign',
      resourceId: campaign.id,
      metadata: {
        type: sanitizedData.type,
        budget: sanitizedData.settings.budget,
        targetAudience: sanitizedData.targetAudience,
        securityLevel: 'MEDIUM'
      }
    });

    logger.info('Ethical PR campaign created', {
      campaignId: campaign.id,
      createdBy: session.user.email,
      type: sanitizedData.type
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        createdAt: campaign.createdAt
      },
      message: campaign.status === 'PENDING_APPROVAL' 
        ? 'Campaign created and queued for approval'
        : 'Campaign created and activated'
    });

  } catch (error) {
    logger.error('PR campaign creation failed', { 
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

// Helper functions

async function validateCampaignCompliance(
  campaignData: any,
  user: any
): Promise<void> {
  // Check required compliance items
  if (!campaignData.compliance.legalReview) {
    throw new ValidationError('Legal review required for all PR campaigns');
  }

  if (!campaignData.compliance.privacyCompliant) {
    throw new ValidationError('Privacy compliance certification required');
  }

  if (!campaignData.compliance.accessibilityReviewed) {
    throw new ValidationError('Accessibility review required');
  }

  // Check consent requirement
  if (!campaignData.settings.requiresConsent) {
    throw new ValidationError('Explicit consent must be required for all communications');
  }

  // Check date validity
  if (campaignData.settings.endDate <= campaignData.settings.startDate) {
    throw new ValidationError('End date must be after start date');
  }

  // Check campaign duration (max 1 year)
  const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
  const duration = campaignData.settings.endDate.getTime() - campaignData.settings.startDate.getTime();
  
  if (duration > maxDuration) {
    throw new ValidationError('Campaign duration cannot exceed 1 year');
  }

  // Check budget limits based on role
  const maxBudget = user.role === 'ADMIN' ? 25000 : 10000;
  if (campaignData.settings.budget > maxBudget) {
    throw new ValidationError(`Budget exceeds limit for ${user.role} role`);
  }

  // Check for prohibited content
  const prohibitedTerms = [
    'pressure', 'shame', 'force', 'manipulate', 'trick', 
    'deceive', 'attack', 'target', 'viral manipulation'
  ];
  
  const contentText = [
    campaignData.name,
    campaignData.description,
    campaignData.content.subject,
    campaignData.content.message,
    campaignData.content.callToAction
  ].join(' ').toLowerCase();

  const foundProhibited = prohibitedTerms.find(term => 
    contentText.includes(term)
  );

  if (foundProhibited) {
    throw new SecurityError(
      `Prohibited content detected: "${foundProhibited}". Campaigns must be ethical and transparent.`
    );
  }

  // Indigenous content sensitivity check
  if (campaignData.targetAudience === 'indigenous_communities' && 
      !campaignData.compliance.culturallyAppropriate) {
    throw new ValidationError(
      'Cultural appropriateness review required for Indigenous community campaigns'
    );
  }

  logger.info('Campaign compliance validated', {
    userId: user.id,
    type: campaignData.type,
    budget: campaignData.settings.budget
  });
}

async function getCampaigns(query: any, user: any): Promise<any[]> {
  const { prisma } = await import('@/lib/prisma');
  
  // Build filters
  const where: any = {};

  if (query.status !== 'all') {
    where.status = query.status.toUpperCase();
  }

  if (query.type !== 'all') {
    where.type = query.type;
  }

  // Only show user's campaigns unless admin
  if (user.role !== 'ADMIN') {
    where.createdBy = user.id;
  }

  // Get campaigns
  const campaigns = await (prisma as any).prCampaign.findMany({
    where,
    include: {
      _count: {
        select: {
          interactions: true,
          conversions: true
        }
      }
    },
    skip: query.offset,
    take: query.limit,
    orderBy: { createdAt: 'desc' }
  });

  // Return sanitized campaign data
  return campaigns.map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    type: campaign.type,
    status: campaign.status,
    targetAudience: campaign.targetAudience,
    budget: campaign.settings?.budget || 0,
    interactions: campaign._count?.interactions || 0,
    conversions: campaign._count?.conversions || 0,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt
  }));
}