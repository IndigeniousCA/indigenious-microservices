/**
 * Individual Webhook API
 * Manage specific webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookService, webhookManager } from '@/lib/webhooks'
import { WebhookEvent } from '@/lib/webhooks/types'
import { z } from 'zod'

// Validation schema
const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
})

// GET /api/webhooks/[id] - Get webhook details
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

    // Get webhook
    const webhook = await webhookManager.getWebhook(id)
    
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Check ownership
    if (webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ webhook })
  } catch (error) {
    logger.error('Failed to get webhook:', error)
    return NextResponse.json(
      { error: 'Failed to get webhook' },
      { status: 500 }
    )
  }
}

// PUT /api/webhooks/[id] - Update webhook
export async function PUT(
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

    // Check ownership
    const existing = await webhookManager.getWebhook(id)
    if (!existing || existing.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request
    const body = await request.json()
    const validationResult = updateWebhookSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Validate events if provided
    if (validationResult.data.events) {
      const validEvents = Object.values(WebhookEvent)
      const invalidEvents = validationResult.data.events.filter(
        e => !validEvents.includes(e as WebhookEvent)
      )
      
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: 'Invalid events', details: { invalidEvents } },
          { status: 400 }
        )
      }
    }

    // Update webhook
    const webhook = await webhookService.updateWebhook(id, {
      ...validationResult.data,
      events: validationResult.data.events as WebhookEvent[] | undefined,
    })

    return NextResponse.json({ webhook })
  } catch (error) {
    logger.error('Failed to update webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
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

    // Check ownership
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook || webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete webhook
    await webhookService.deleteWebhook(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}