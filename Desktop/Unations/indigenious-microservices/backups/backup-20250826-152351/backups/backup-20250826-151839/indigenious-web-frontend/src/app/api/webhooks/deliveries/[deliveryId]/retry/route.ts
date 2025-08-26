/**
 * Webhook Delivery Retry API
 * Retry failed webhook deliveries
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookManager } from '@/lib/webhooks'
import { prisma } from '@/lib/prisma'

// POST /api/webhooks/deliveries/[deliveryId]/retry - Retry delivery
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get params
    const { deliveryId } = await params
    
    // Get delivery and check ownership
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    if (delivery.webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Retry delivery
    await webhookManager.retryDelivery(deliveryId)

    return NextResponse.json({ success: true, message: 'Delivery retry initiated' })
  } catch (error) {
    logger.error('Failed to retry delivery:', error)
    return NextResponse.json(
      { error: 'Failed to retry delivery', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}