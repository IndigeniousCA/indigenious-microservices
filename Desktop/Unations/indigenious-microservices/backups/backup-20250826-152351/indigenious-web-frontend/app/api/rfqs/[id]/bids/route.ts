import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-simple'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    const session = token ? verifyToken(token.value) : null
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id }
    })

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      )
    }

    // Only buyer of the RFQ or admin can see all bids
    let where: any = { rfqId: id }
    
    if ((session as any).role === 'SUPPLIER') {
      // Suppliers can only see their own bids
      const business = await prisma.business.findUnique({
        where: { ownerId: (session as any).id }
      })
      
      if (!business) {
        return NextResponse.json({ bids: [] })
      }
      
      where.businessId = business.id
    } else if (rfq.buyerId !== (session as any).id && (session as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const bids = await prisma.bid.findMany({
      where,
      include: {
        business: {
          select: {
            businessName: true,
            indigenousCertified: true,
            verified: true
          }
        },
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ bids })

  } catch (error) {
    console.error('Error fetching bids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    const session = token ? verifyToken(token.value) : null
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if ((session as any).role !== 'SUPPLIER') {
      return NextResponse.json(
        { error: 'Only suppliers can submit bids' },
        { status: 403 }
      )
    }

    // Check if user has a business
    const business = await prisma.business.findUnique({
      where: { ownerId: (session as any).id }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'You must register a business before bidding' },
        { status: 400 }
      )
    }

    // Check if RFQ exists and is open
    const rfq = await prisma.rFQ.findUnique({
      where: { id }
    })

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      )
    }

    if (rfq.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'RFQ is not open for bidding' },
        { status: 400 }
      )
    }

    if (new Date() > rfq.submissionDeadline) {
      return NextResponse.json(
        { error: 'Submission deadline has passed' },
        { status: 400 }
      )
    }

    // Check if business already bid on this RFQ
    const existingBid = await prisma.bid.findFirst({
      where: {
        rfqId: id,
        businessId: business.id
      }
    })

    if (existingBid) {
      return NextResponse.json(
        { error: 'You have already submitted a bid for this RFQ' },
        { status: 409 }
      )
    }

    const data = await request.json()

    const bid = await prisma.bid.create({
      data: {
        rfqId: id,
        businessId: business.id,
        userId: (session as any).id,
        proposal: data.proposal,
        price: data.price,
        deliveryDate: new Date(data.deliveryDate),
        validUntil: new Date(data.validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        status: 'SUBMITTED'
      },
      include: {
        business: {
          select: {
            businessName: true
          }
        }
      }
    })

    // Send notification to buyer
    await prisma.notification.create({
      data: {
        userId: rfq.buyerId,
        title: 'New Bid Received',
        message: `${business.businessName} has submitted a bid for "${rfq.title}"`,
        type: 'BID_RECEIVED'
      }
    })

    return NextResponse.json({
      message: 'Bid submitted successfully',
      bid
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting bid:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}