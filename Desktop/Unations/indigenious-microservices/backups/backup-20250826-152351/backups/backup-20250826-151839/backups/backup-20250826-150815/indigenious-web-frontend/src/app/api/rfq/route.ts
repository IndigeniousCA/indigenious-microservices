/**
 * RFQ Management API
 * RFQ listing and search endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Enhanced query validation schema
const rfqListQuerySchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
  minBudget: z.coerce.number().min(0).max(1000000000).optional(),
  maxBudget: z.coerce.number().min(0).max(1000000000).optional(),
  indigenousOnly: z.coerce.boolean().default(false),
  search: z.string().max(200).trim().optional(),
  status: z.enum(['open', 'closed', 'awarded', 'cancelled']).default('open'),
  sortBy: z.enum(['closing_date', 'budget_max', 'created_at']).default('closing_date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).refine(data => {
  // Validate budget range
  if (data.minBudget && data.maxBudget && data.minBudget > data.maxBudget) {
    return false;
  }
  return true;
}, {
  message: "Minimum budget cannot be greater than maximum budget"
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      category: searchParams.get('category'),
      minBudget: searchParams.get('minBudget'),
      maxBudget: searchParams.get('maxBudget'),
      indigenousOnly: searchParams.get('indigenousOnly'),
      search: searchParams.get('search'),
      status: searchParams.get('status') || 'open',
      sortBy: searchParams.get('sortBy') || 'closing_date',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    };

    const validationResult = rfqListQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, status, sortBy, sortOrder } = validationResult.data;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: status.toUpperCase(),
    };

    // Get RFQs
    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: {
          [sortBy === 'closing_date' ? 'closingDate' : sortBy === 'budget_max' ? 'budgetMax' : 'createdAt']: sortOrder,
        },
        include: {
          _count: {
            select: {
              bids: true,
            },
          },
        },
      }),
      prisma.rFQ.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rfqs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('Failed to fetch RFQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFQs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Create mock RFQ for now
    const rfq = {
      id: `rfq-${Date.now()}`,
      ...body,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
    };

    logger.info('RFQ created', {
      rfqId: rfq.id,
      createdBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: rfq,
    });

  } catch (error) {
    logger.error('Failed to create RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to create RFQ' },
      { status: 500 }
    );
  }
}