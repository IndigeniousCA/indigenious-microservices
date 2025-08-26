/**
 * Webhook Test API
 * Test webhook delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookManager } from '@/lib/webhooks'
import { WebhookEvent } from '@/lib/webhooks/types'

// POST /api/webhooks/[id]/test - Test webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { id } = await params
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook || webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const event = body.event as WebhookEvent | undefined

    // Test webhook
    const result = await webhookManager.testWebhook(id, event)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Failed to test webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}