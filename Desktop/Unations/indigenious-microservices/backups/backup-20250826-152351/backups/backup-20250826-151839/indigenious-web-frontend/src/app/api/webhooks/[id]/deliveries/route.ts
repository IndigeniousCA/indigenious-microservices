/**
 * Webhook Deliveries API
 * Get webhook delivery history
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookManager } from '@/lib/webhooks'
import { DeliveryStatus, WebhookEvent } from '@/lib/webhooks/types'

// GET /api/webhooks/[id]/deliveries - Get delivery history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get params
    const { id } = await params
    
    // Check ownership (using email for now)
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook || webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const status = searchParams.get('status') as DeliveryStatus | undefined
    const event = searchParams.get('event') as WebhookEvent | undefined

    // Get deliveries
    const result = await webhookManager.getDeliveries(id, {
      page,
      pageSize,
      status,
      event,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Failed to get webhook deliveries:', error)
    return NextResponse.json(
      { error: 'Failed to get deliveries' },
      { status: 500 }
    )
  }
}