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
  trapDetect: { points: 100, duration: 60 }, // 100 per minute
  trapCheck: { points: 20, duration: 60 } // 20 per minute for admin checks
});
const auditLogger = new AuditLogger();

// Detection input validation
const DetectionSchema = z.object({
  businessData: z.object({
    name: z.string().max(200).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    businessNumber: z.string().max(50).optional(),
    indigenousClaim: z.boolean().optional()
  }),
  source: z.string().max(100),
  metadata: z.object({
    timestamp: z.string().datetime().optional(),
    detectionType: z.enum(['registration', 'claim', 'copy', 'inquiry']).optional()
  }).optional()
});

const AdminCheckSchema = z.object({
  businessId: z.string().uuid().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  businessNumber: z.string().max(50).optional()
});

// POST /api/badges/traps/detect - Record potential detection (Public endpoint)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (no auth required - this is a detection endpoint)
    const clientId = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    
    const allowed = await rateLimiter.consume(clientId, 'trapDetect');
    if (!allowed) {
      // Return normal response to avoid revealing rate limiting
      return NextResponse.json({
        status: 'processed',
        message: 'Business data received'
      });
    }

    const body = await request.json();

    // Input validation
    const validatedData = DetectionSchema.parse(body);
    
    // Sanitize business data
    const sanitizedData = {
      businessData: {
        name: validatedData.businessData.name ? 
          DOMPurify.sanitize(validatedData.businessData.name) : undefined,
        phone: validatedData.businessData.phone ? 
          DOMPurify.sanitize(validatedData.businessData.phone) : undefined,
        email: validatedData.businessData.email ? 
          DOMPurify.sanitize(validatedData.businessData.email) : undefined,
        website: validatedData.businessData.website ? 
          DOMPurify.sanitize(validatedData.businessData.website) : undefined,
        businessNumber: validatedData.businessData.businessNumber ? 
          DOMPurify.sanitize(validatedData.businessData.businessNumber) : undefined,
        indigenousClaim: validatedData.businessData.indigenousClaim
      },
      source: DOMPurify.sanitize(validatedData.source),
      metadata: validatedData.metadata
    };

    // Record detection event with privacy protection
    try {
      const detectionResult = await secureTrapService.recordDetection(
        {
          trapBusinessId: 'unknown', // Will be determined by service
          detectedBusinessId: 'unknown', // External business
          detectionType: sanitizedData.metadata?.detectionType || 'inquiry',
          evidence: {
            ipAddress: clientId, // Already hashed by service
            timestamp: new Date(),
            details: {
              source: sanitizedData.source,
              businessData: sanitizedData.businessData
            }
          }
        },
        request
      );

      // Log successful detection recording
      logger.info('Trap detection recorded', {
        detectionId: detectionResult.detectionId,
        source: sanitizedData.source
      });

    } catch (error) {
      // Don't expose detection errors to prevent reverse engineering
      logger.error('Detection recording failed', { 
        error, 
        source: sanitizedData.source 
      });
    }

    // Always return the same generic response
    return NextResponse.json({
      status: 'processed',
      message: 'Business data received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Trap detection endpoint error', { error });

    // Return generic response even on errors to avoid revealing system details
    return NextResponse.json({
      status: 'processed',
      message: 'Business data received'
    });
  }
}

// GET /api/badges/traps/detect - Admin check for trap status
export async function GET(request: NextRequest) {
  try {
    // Strict authentication required
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Only specific roles can check trap status
    const authorizedRoles = ['ADMIN', 'LEGAL_TEAM', 'SECURITY_OFFICER'];
    if (!authorizedRoles.includes(session.user.role as any)) {
      throw new UnauthorizedError('Insufficient permissions for trap checking');
    }

    // Rate limiting
    const allowed = await rateLimiter.consume(session.user.id, 'trapCheck');
    if (!allowed) {
      throw new SecurityError('Too many trap check requests');
    }

    const { searchParams } = new URL(request.url);
    const query = AdminCheckSchema.parse({
      businessId: searchParams.get('businessId'),
      phone: searchParams.get('phone'),
      email: searchParams.get('email'),
      website: searchParams.get('website'),
      businessNumber: searchParams.get('businessNumber')
    });

    // Validate at least one identifier provided
    const hasIdentifier = Object.values(query).some(value => value !== undefined);
    if (!hasIdentifier) {
      throw new ValidationError('At least one business identifier required');
    }

    // Check for trap matches (this would be implemented in the service)
    // For now, return a secure response format
    const isTrap = false; // Service would determine this
    const confidence = 0; // Service would calculate this

    // Log admin check
    await auditLogger.log({
      success: true,
      userId: session.user.id,
      action: 'READ' as any,
      resourceType: 'trap_business',
      metadata: {
        query: Object.fromEntries(
          Object.entries(query).filter(([_, value]) => value !== undefined)
        ),
        result: { isTrap, confidence },
        action: 'check_trap_status',
        securityLevel: 'HIGH'
      }
    });

    return NextResponse.json({
      success: true,
      result: {
        isTrap,
        confidence,
        checkType: 'administrative',
        checkedBy: session.user.role,
        timestamp: new Date().toISOString()
      },
      compliance: {
        accessLevel: session.user.role,
        dataProtection: 'Business identifiers are processed securely',
        auditTrail: 'All checks are logged for compliance'
      }
    });

  } catch (error) {
    logger.error('Trap admin check failed', { 
      error,
      userId: (await getServerSession(authOptions))?.user?.id
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid check parameters', 
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
        error: 'Failed to check trap status',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}