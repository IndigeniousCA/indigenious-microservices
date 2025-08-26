import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SecureBadgeService } from '@/features/verification-badges/services/SecureBadgeService';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { APIError, ValidationError, RateLimitError } from '@/lib/errors';
import { withTransaction } from '@/lib/database';

const secureBadgeService = new SecureBadgeService();
const rateLimiter = new RateLimiter({
  badgeCreate: { points: 10, duration: 3600 }, // 10 per hour
  badgeList: { points: 100, duration: 60 } // 100 per minute
});
const auditLogger = new AuditLogger();

// POST /api/badges - Generate a new badge
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized badge creation attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'badgeCreate');
    if (!allowed) {
      throw new RateLimitError('Too many badge creation requests. Please try again later.');
    }

    const body = await request.json();

    // Input validation with strict schema
    const schema = z.object({
      businessId: z.string().uuid('Invalid business ID format'),
      metadata: z.object({
        reason: z.string().max(500).optional(),
        notes: z.string().max(1000).optional()
      }).optional()
    });

    const validatedData = schema.parse(body);
    
    // Sanitize string inputs
    const sanitizedData = {
      businessId: validatedData.businessId,
      metadata: validatedData.metadata ? {
        reason: validatedData.metadata.reason ? DOMPurify.sanitize(validatedData.metadata.reason) : undefined,
        notes: validatedData.metadata.notes ? DOMPurify.sanitize(validatedData.metadata.notes) : undefined
      } : undefined
    };

    const { businessId, metadata } = sanitizedData;

    // Use secure badge service for creation
    const result = await secureBadgeService.createBadge(request, {
      businessId,
      metadata
    });

    // Log successful badge creation
    logger.info('Badge created successfully', {
      userId: session.user.id,
      businessId,
      badgeId: result.badge.id
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Badge generation error', { 
      error,
      userId: (await getServerSession(authOptions))?.user?.id
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    // Don't leak internal errors
    return NextResponse.json(
      { error: 'Failed to generate badge', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// GET /api/badges - List badges with filtering
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await rateLimiter.consume(clientId, 'badgeList');
    if (!allowed) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    // Input validation with strict schema
    const querySchema = z.object({
      businessId: z.string().uuid().optional(),
      animalSpirit: z.string().max(50).optional(),
      evolutionStage: z.coerce.number().min(1).max(4).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']).optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20)
    });

    const query = querySchema.parse({
      businessId: searchParams.get('businessId'),
      animalSpirit: searchParams.get('animalSpirit'),
      evolutionStage: searchParams.get('evolutionStage'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    // Build filters with sanitization
    const where: any = {
      status: query.status || 'ACTIVE'
    };

    // If user is authenticated and filtering by businessId, verify access
    if (session?.user && query.businessId) {
      const hasAccess = await prisma.businessMember.findFirst({
        where: {
          businessId: query.businessId,
          userId: session.user.id
        }
      });

      if (hasAccess) {
        where.businessId = query.businessId;
      } else {
        // Don't reveal that the business exists
        return NextResponse.json({
          badges: [],
          pagination: {
            page: query.page,
            limit: query.limit,
            total: 0,
            pages: 0
          }
        });
      }
    }

    if (query.animalSpirit) {
      where.animalSpirit = DOMPurify.sanitize(query.animalSpirit);
    }

    if (query.evolutionStage) {
      where.evolutionStage = query.evolutionStage;
    }

    // Fetch badges with transaction for consistency
    const result = await withTransaction(async (tx) => {
      const [badges, total] = await Promise.all([
        (tx as any).badge.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: {
            business: {
              select: {
                id: true,
                name: true,
                nation: true,
                territory: true,
                indigenousOwnership: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        (tx as any).badge.count({ where })
      ]);

      return { badges, total };
    });

    // Log badge list access
    await auditLogger.log({
      success: true,
      action: 'READ' as any,
      resourceType: 'badge',
      metadata: {
        filters: query,
        resultCount: result.badges.length,
        action: 'list_badges'
      },
      userId: session?.user?.id,
      ip: clientId,
      userAgent: request.headers.get('user-agent') || undefined
    });

    // Sanitize response based on authentication
    const sanitizedBadges = result.badges.map((badge: any) => ({
      id: badge.id,
      businessId: badge.businessId,
      businessName: badge.business.name,
      businessNation: badge.business.nation,
      animalSpirit: badge.animalSpirit,
      evolutionStage: badge.evolutionStage,
      status: badge.status,
      issuedAt: badge.issuedAt,
      lastVerified: badge.lastVerified,
      // Only include sensitive data if user is authenticated
      ...(session?.user ? {
        publicKey: badge.publicKey,
        blockchainAnchor: badge.blockchainAnchor,
        indigenousOwnership: badge.business.indigenousOwnership
      } : {})
    }));

    return NextResponse.json({
      badges: sanitizedBadges,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        pages: Math.ceil(result.total / query.limit)
      }
    });
  } catch (error) {
    logger.error('Badge list error', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch badges', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}