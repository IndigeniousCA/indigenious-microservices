import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-simple'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const verified = searchParams.get('verified') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (verified) where.verified = true
    if (category) {
      where.categories = {
        some: {
          category: {
            name: category
          }
        }
      }
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          owner: {
            select: {
              name: true,
              email: true
            }
          },
          ratings: true
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.business.count({ where })
    ])

    return NextResponse.json({
      businesses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching businesses:', error)
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

    const data = await request.json()
    
    // Check if user already has a business
    const existingBusiness = await prisma.business.findUnique({
      where: { ownerId: (session as any).id }
    })

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'User already has a business registered' },
        { status: 409 }
      )
    }

    const business = await prisma.business.create({
      data: {
        ownerId: (session as any).id,
        businessName: data.businessName,
        description: data.description,
        registrationNumber: data.registrationNumber,
        taxNumber: data.taxNumber,
        indigenousCertified: data.indigenousCertified || false,
        certificationNumber: data.certificationNumber,
        certificationExpiry: data.certificationExpiry ? new Date(data.certificationExpiry) : null,
        website: data.website,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: data.country || 'Canada',
        employees: data.employees,
        yearEstablished: data.yearEstablished,
        annualRevenue: data.annualRevenue
      }
    })

    // Add categories if provided
    if (data.categories && data.categories.length > 0) {
      await prisma.businessCategory.createMany({
        data: data.categories.map((categoryId: string) => ({
          businessId: business.id,
          categoryId
        }))
      })
    }

    return NextResponse.json({
      message: 'Business created successfully',
      business
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}