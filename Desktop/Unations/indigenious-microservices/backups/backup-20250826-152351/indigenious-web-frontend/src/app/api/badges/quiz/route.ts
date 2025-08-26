import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SpiritAnimalQuizService } from '@/features/verification-badges/services/SpiritAnimalQuizService';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { APIError, ValidationError, RateLimitError } from '@/lib/errors';

const quizService = new SpiritAnimalQuizService();
const rateLimiter = new RateLimiter({
  quizSubmit: { points: 20, duration: 3600 }, // 20 per hour
  quizFetch: { points: 100, duration: 60 } // 100 per minute
});
const auditLogger = new AuditLogger();

// POST /api/badges/quiz - Submit quiz and get results
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await rateLimiter.consume(clientId, 'quizSubmit');
    if (!allowed) {
      throw new RateLimitError('Too many quiz submissions. Please try again later.');
    }

    const body = await request.json();

    // Input validation schema
    const schema = z.object({
      answers: z.record(z.string().max(50)),
      email: z.string().email().optional(),
      businessId: z.string().uuid().optional()
    });

    const validatedData = schema.parse(body);
    
    // Sanitize string inputs
    const sanitizedData = {
      answers: Object.entries(validatedData.answers).reduce((acc, [key, value]) => ({
        ...acc,
        [DOMPurify.sanitize(key)]: DOMPurify.sanitize(value)
      }), {}),
      email: validatedData.email ? DOMPurify.sanitize(validatedData.email) : undefined,
      businessId: validatedData.businessId
    };

    const { answers, email, businessId } = sanitizedData;

    // If businessId provided, verify user has access
    if (businessId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new APIError(401, 'AUTH_REQUIRED', 'Authentication required to link quiz to business');
      }

      // Verify user belongs to business
      const businessMember = await prisma.businessMember.findFirst({
        where: {
          businessId,
          userId: session.user.id
        }
      });

      if (!businessMember) {
        throw new APIError(403, 'ACCESS_DENIED', 'You do not have access to this business');
      }
    }

    // Calculate results
    const result = quizService.calculateResults(answers);

    // Save results if email provided
    let quizId: string | undefined;
    if (email || businessId) {
      quizId = await quizService.saveQuizResults(result, email, businessId);
      
      // Log audit event
      await auditLogger.log({
        success: true,
        action: 'CREATE' as any,
        resourceType: 'quiz',
        resourceId: quizId,
        metadata: {
          spirit: result.primarySpirit,
          hasEmail: !!email,
          hasBusinessId: !!businessId,
          quizType: 'spirit_animal'
        },
        ip: clientId,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      // Track conversion funnel
      await trackQuizConversion('completed', { email, businessId, spirit: result.primarySpirit });
    }

    // Generate shareable content
    const shareData = quizService.generateShareableResult(result);

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        quizId,
        shareData
      }
    });
  } catch (error) {
    logger.error('Quiz submission error', { error });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
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
        { error: error.message },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process quiz' },
      { status: 500 }
    );
  }
}

// GET /api/badges/quiz/questions - Get quiz questions
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await rateLimiter.consume(clientId, 'quizFetch');
    if (!allowed) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    const questions = quizService.getQuestions();
    
    // Log audit event
    await auditLogger.log({
      success: true,
      action: 'READ' as any,
      resourceType: 'quiz',
      metadata: {
        action: 'quiz_started'
      },
      ip: clientId,
      userAgent: request.headers.get('user-agent') || undefined
    });
    
    // Track quiz start
    await trackQuizConversion('started');

    return NextResponse.json({
      questions,
      totalQuestions: questions.length
    });
  } catch (error) {
    logger.error('Quiz questions error', { error });
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// Helper function to track conversion funnel
async function trackQuizConversion(
  stage: 'started' | 'completed' | 'converted',
  data?: any
): Promise<void> {
  try {
    // Log to analytics service with sanitized data
    const sanitizedData = data ? {
      ...data,
      email: data.email ? 'provided' : 'not_provided' // Don't log actual email
    } : undefined;
    
    logger.info('Quiz conversion event', {
      stage,
      data: sanitizedData
    });
    
    if (stage === 'completed' && data?.email) {
      // Send follow-up email through secure queue
      await sendQuizFollowUp(data.email, data.spirit);
    }
  } catch (error) {
    logger.error('Failed to track quiz conversion', { error, stage });
  }
}

// Send follow-up email
async function sendQuizFollowUp(email: string, spirit: string): Promise<void> {
  try {
    // Validate email format again before sending
    const emailSchema = z.string().email();
    const validEmail = emailSchema.parse(email);
    
    logger.info('Queueing quiz follow-up email', {
      spirit,
      emailHash: Buffer.from(validEmail).toString('base64').substring(0, 8) // Log partial hash only
    });
    
    // TODO: Integrate with secure email service
  } catch (error) {
    logger.error('Failed to send quiz follow-up', { error });
  }
}