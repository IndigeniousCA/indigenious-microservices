import { NextRequest, NextResponse } from 'next/server';
import { SecureBadgeService } from '@/features/verification-badges/services/SecureBadgeService';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { ValidationError, RateLimitError } from '@/lib/errors';

const secureBadgeService = new SecureBadgeService();
const rateLimiter = new RateLimiter({
  badgeVerify: { points: 100, duration: 60 } // 100 per minute
});

// POST /api/badges/verify - Verify a badge
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (no auth required for verification)
    const clientId = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    
    const allowed = await rateLimiter.consume(clientId, 'badgeVerify');
    if (!allowed) {
      throw new RateLimitError('Too many verification attempts. Please try again later.');
    }

    const body = await request.json();

    // Use secure badge service for verification
    const result = await secureBadgeService.verifyBadge(request, body);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Badge verification error', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid verification data', 
          code: 'VALIDATION_ERROR',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    if (error instanceof Error && 'statusCode' in error) {
      const apiError = error as any;
      return NextResponse.json(
        {
          error: {
            code: apiError.code || 'VERIFICATION_FAILED',
            message: apiError.message
          }
        },
        { status: apiError.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to verify badge',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET /api/badges/verify?publicKey=... - Quick verification by public key
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await rateLimiter.consume(clientId, 'badgeVerify');
    if (!allowed) {
      throw new RateLimitError('Too many verification attempts. Please try again later.');
    }

    // Get public key from query params
    const { searchParams } = new URL(request.url);
    const publicKeyParam = searchParams.get('publicKey');
    
    if (!publicKeyParam) {
      return NextResponse.json(
        { error: 'Public key is required', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Validate public key format
    const publicKeySchema = z.string().regex(
      /^0x[a-fA-F0-9]{64}$/,
      'Invalid public key format'
    );

    const publicKey = publicKeySchema.parse(publicKeyParam);

    // Quick lookup
    const { prisma } = await import('@/lib/prisma');
    const badge = await (prisma as any).badge.findUnique({
      where: { publicKey },
      select: {
        id: true,
        status: true,
        animalSpirit: true,
        evolutionStage: true,
        issuedAt: true,
        lastVerified: true,
        business: {
          select: {
            name: true,
            nation: true,
            territory: true
          }
        }
      }
    });

    if (!badge) {
      return NextResponse.json({
        isValid: false,
        reason: 'Badge not found'
      });
    }

    if (badge.status !== 'ACTIVE') {
      return NextResponse.json({
        isValid: false,
        reason: `Badge is ${badge.status.toLowerCase()}`
      });
    }

    // Update last verified timestamp
    await (prisma as any).badge.update({
      where: { id: badge.id },
      data: { lastVerified: new Date() }
    });

    logger.info('Quick badge verification', {
      badgeId: badge.id,
      clientId
    });

    return NextResponse.json({
      isValid: true,
      badge: {
        animalSpirit: badge.animalSpirit,
        evolutionStage: badge.evolutionStage,
        businessName: badge.business.name,
        nation: badge.business.nation,
        territory: badge.business.territory,
        issuedAt: badge.issuedAt,
        lastVerified: new Date()
      }
    });
  } catch (error) {
    logger.error('Quick verification error', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Invalid public key format'
        },
        { status: 400 }
      );
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Verification failed',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}