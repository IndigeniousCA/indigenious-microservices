/**
 * Payment History API
 * Payment history endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Query parameters schema
const paymentHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['succeeded', 'pending', 'failed', 'refunded']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validationResult = paymentHistoryQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit } = validationResult.data;

    // Generate mock payment history
    const payments = Array.from({ length: limit }, (_, i) => ({
      id: `pi_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.floor(Math.random() * 100000) + 1000,
      currency: 'cad',
      status: ['succeeded', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      description: `Payment ${i + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total: 100, // Mock total
          totalPages: Math.ceil(100 / limit),
        },
      },
    });

  } catch (error) {
    logger.error('Failed to fetch payment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}