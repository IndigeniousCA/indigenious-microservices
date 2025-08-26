/**
 * Webhooks API
 * Manage webhook subscriptions
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookService, webhookManager } from '@/lib/webhooks'
import { WebhookEvent } from '@/lib/webhooks/types'
import { z } from 'zod'

// Validation schema
const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
})

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const event = searchParams.get('event') as WebhookEvent | undefined
    const active = searchParams.get('active') === 'true' ? true : 
                   searchParams.get('active') === 'false' ? false : undefined

    // Get webhooks for user
    const webhooks = await webhookManager.getWebhooks(session.user.email || '', {
      status,
      event,
      active,
    })

    return NextResponse.json({ webhooks })
  } catch (error) {
    logger.error('Failed to list webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    )
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validationResult = createWebhookSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Validate events
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

    // Create webhook
    const webhook = await webhookService.createWebhook({
      url: validationResult.data.url,
      events: validationResult.data.events as WebhookEvent[],
      description: validationResult.data.description,
      headers: validationResult.data.headers,
      ownerId: session.user.email || '',
      ownerType: 'user',
    })

    return NextResponse.json({ webhook })
  } catch (error) {
    logger.error('Failed to create webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/webhooks/events - Get available events
// Note: This should be moved to /api/webhooks/events/route.ts
// export async function getEvents(request: NextRequest) {
//   try {
//     // Check authentication
//     const session = await getServerSession(authOptions)
//     if (!session?.user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
// 
//     const events = webhookManager.getAvailableEvents()
// 
//     return NextResponse.json({ events })
//   } catch (error) {
//     logger.error('Failed to get webhook events:', error)
//     return NextResponse.json(
//       { error: 'Failed to get events' },
//       { status: 500 }
//     )
//   }
// }