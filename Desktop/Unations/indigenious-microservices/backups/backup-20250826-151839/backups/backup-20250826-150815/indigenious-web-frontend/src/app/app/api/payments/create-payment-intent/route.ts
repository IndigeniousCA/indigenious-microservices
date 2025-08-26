/**
 * Create Payment Intent API
 * Payment intent creation endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Enhanced validation schema with business rules
const createPaymentIntentSchema = z.object({
  amount: z.number().min(100).max(99999999), // In cents, min $1, max $999,999.99
  currency: z.enum(['usd', 'cad']).default('cad'),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string()).optional(),
  receiptEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createPaymentIntentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { amount, currency, description, metadata } = validationResult.data;

    // Generate a mock payment intent ID
    const paymentIntentId = `pi_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Payment intent created', {
      paymentIntentId,
      amount,
      currency,
      userEmail: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId,
        clientSecret: `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        currency,
        status: 'requires_payment_method',
      },
    });

  } catch (error) {
    logger.error('Payment intent creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}