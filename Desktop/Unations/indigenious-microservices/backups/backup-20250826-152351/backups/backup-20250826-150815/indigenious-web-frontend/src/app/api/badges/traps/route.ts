import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SecureTrapBusinessService } from '@/features/verification-badges/services/SecureTrapBusinessService';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { 
  APIError, 
  UnauthorizedError, 
  ValidationError,
  SecurityError 
} from '@/lib/errors';

const secureTrapService = new SecureTrapBusinessService();
const rateLimiter = new RateLimiter({
  trapCreate: { points: 2, duration: 3600 }, // 2 per hour - very restrictive
  trapQuery: { points: 50, duration: 60 } // 50 per minute
});
const auditLogger = new AuditLogger();

// Strict authorization - only legal team and admins
const AUTHORIZED_ROLES = ['ADMIN', 'LEGAL_TEAM', 'SECURITY_OFFICER'] as const;

// Input validation schemas
const TrapCreationSchema = z.object({
  trapType: z.enum(['honeypot', 'timebomb', 'tracker']),
  targetIndustry: z.string().min(1).max(100),
  metadata: z.object({
    purpose: z.string().min(10).max(500),
    authorizedBy: z.string().email(),
    legalReviewId: z.string().min(1).max(50),
    expiresAt: z.string().datetime().transform(str => new Date(str))
  })
});

const TrapQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'expired', 'all']).default('active'),
  type: z.enum(['honeypot', 'timebomb', 'tracker', 'all']).default('all'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20)
});

// POST /api/badges/traps - Create new trap business (Legal compliance required)
export async function POST(request: NextRequest) {
  try {
    // Authentication & Strict Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!AUTHORIZED_ROLES.includes(session.user.role as any)) {
      logger.warn('Unauthorized trap creation attempt', {
        userId: session.user.id,
        role: session.user.role,
        ip: request.headers.get('x-forwarded-for')
      });
      throw new UnauthorizedError('Insufficient permissions for trap business operations');
    }

    // Aggressive rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'trapCreate');
    if (!allowed) {
      throw new SecurityError('Too many trap creation attempts. Contact legal team.');
    }

    const body = await request.json();

    // Strict input validation
    const validatedData = TrapCreationSchema.parse(body);
    
    // Sanitize string inputs
    const sanitizedData = {
      ...validatedData,
      targetIndustry: DOMPurify.sanitize(validatedData.targetIndustry),
      metadata: {
        ...validatedData.metadata,
        purpose: DOMPurify.sanitize(validatedData.metadata.purpose),
        authorizedBy: DOMPurify.sanitize(validatedData.metadata.authorizedBy)
      }
    };

    // Legal compliance validation
    await validateLegalCompliance(sanitizedData, session.user);

    // Create trap with full audit trail
    const result = await secureTrapService.createTrapBusiness(
      session.user.id,
      sanitizedData,
      session.user.role
    );

    // Critical security logging
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'CREATE' as any,
      resourceType: 'trap_business',
      resourceId: result.trapBusiness.id,
      metadata: {
        trapType: sanitizedData.trapType,
        targetIndustry: sanitizedData.targetIndustry,
        authorizedBy: sanitizedData.metadata.authorizedBy,
        legalReviewId: sanitizedData.metadata.legalReviewId,
        securityLevel: 'CRITICAL'
      }
    });

    logger.info('Trap business created with legal compliance', {
      trapId: result.trapBusiness.id,
      userId: session.user.id,
      trapType: sanitizedData.trapType
    });

    return NextResponse.json({
      success: result.success,
      trapBusiness: result.trapBusiness,
      warnings: result.warnings,
      compliance: {
        legalReview: sanitizedData.metadata.legalReviewId,
        createdBy: session.user.email,
        expiresAt: sanitizedData.metadata.expiresAt
      }
    });

  } catch (error) {
    logger.error('Trap business creation failed', { 
      error,
      userId: (await getServerSession(authOptions))?.user?.id
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid trap business data', 
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
        error: 'Failed to create trap business',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET /api/badges/traps - List trap businesses (Restricted access)
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!AUTHORIZED_ROLES.includes(session.user.role as any)) {
      throw new UnauthorizedError('Insufficient permissions to view trap businesses');
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'trapQuery');
    if (!allowed) {
      throw new SecurityError('Too many requests');
    }

    const { searchParams } = new URL(request.url);
    const query = TrapQuerySchema.parse({
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    // Get trap businesses with privacy protection
    const traps = await secureTrapService.queryDetections(
      session.user.id,
      session.user.role,
      query
    );

    // Log access
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'READ' as any,
      resourceType: 'trap_business_list',
      metadata: {
        query,
        resultCount: traps.length,
        action: 'view_trap_businesses',
        securityLevel: 'HIGH'
      }
    });

    return NextResponse.json({
      success: true,
      traps,
      pagination: {
        page: query.page,
        limit: query.limit,
        hasMore: traps.length === query.limit
      },
      compliance: {
        accessLevel: session.user.role,
        dataRetention: '90 days for trap data, 7 years for evidence',
        privacyNotice: 'Personal data is hashed for privacy protection'
      }
    });

  } catch (error) {
    logger.error('Trap business query failed', { error });

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch trap businesses',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function validateLegalCompliance(
  trapData: any,
  user: any
): Promise<void> {
  // Require legal review ID
  if (!trapData.metadata.legalReviewId) {
    throw new ValidationError('Legal review ID required for all trap operations');
  }

  // Validate expiration (must be within compliance limits)
  const maxDays = 90; // Maximum 90 days
  const daysDiff = Math.floor(
    (trapData.metadata.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  if (daysDiff > maxDays) {
    throw new ValidationError(`Trap expiration cannot exceed ${maxDays} days`);
  }

  if (daysDiff < 1) {
    throw new ValidationError('Trap expiration must be at least 1 day in the future');
  }

  // Validate purpose
  const prohibitedPurposes = [
    'harassment', 'intimidation', 'personal', 'revenge', 'discrimination'
  ];
  
  const purposeText = trapData.metadata.purpose.toLowerCase();
  const foundProhibited = prohibitedPurposes.find(term => 
    purposeText.includes(term)
  );

  if (foundProhibited) {
    throw new SecurityError(
      `Prohibited purpose detected: "${foundProhibited}". Traps must be for legitimate fraud prevention only.`
    );
  }

  // Validate authorized by email matches session
  if (trapData.metadata.authorizedBy !== user.email) {
    throw new ValidationError('Authorized by email must match session user');
  }

  logger.info('Trap legal compliance validated', {
    userId: user.id,
    legalReviewId: trapData.metadata.legalReviewId,
    expiresAt: trapData.metadata.expiresAt
  });
}