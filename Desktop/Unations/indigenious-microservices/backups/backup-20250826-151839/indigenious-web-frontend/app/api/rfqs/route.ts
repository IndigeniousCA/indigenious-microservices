import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-simple'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'OPEN'
    const category = searchParams.get('category')
    const minBudget = searchParams.get('minBudget')
    const maxBudget = searchParams.get('maxBudget')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {
      status: status as any
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            name: category
          }
        }
      }
    }

    if (minBudget) {
      where.budgetMax = {
        gte: parseFloat(minBudget)
      }
    }

    if (maxBudget) {
      where.budgetMin = {
        lte: parseFloat(maxBudget)
      }
    }

    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        include: {
          buyer: {
            select: {
              name: true,
              email: true
            }
          },
          categories: {
            include: {
              category: true
            }
          },
          _count: {
            select: {
              bids: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.rFQ.count({ where })
    ])

    return NextResponse.json({
      rfqs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching RFQs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    const session = token ? verifyToken(token.value) : null
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if ((session as any).role !== 'BUYER' && (session as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only buyers can create RFQs' },
        { status: 403 }
      )
    }

    const data = await request.json()
    
    const rfq = await prisma.rFQ.create({
      data: {
        buyerId: (session as any).id,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        deadline: new Date(data.deadline),
        submissionDeadline: new Date(data.submissionDeadline),
        indigenousPreference: data.indigenousPreference || false,
        status: 'OPEN'
      }
    })

    // Add categories if provided
    if (data.categories && data.categories.length > 0) {
      await prisma.rFQCategory.createMany({
        data: data.categories.map((categoryId: string) => ({
          rfqId: rfq.id,
          categoryId
        }))
      })
    }

    // Send notifications to relevant suppliers
    // This would be handled by a notification service in production
    
    return NextResponse.json({
      message: 'RFQ created successfully',
      rfq
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating RFQ:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}