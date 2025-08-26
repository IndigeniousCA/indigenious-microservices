/**
 * Webhook Statistics API
 * Get webhook delivery statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookManager } from '@/lib/webhooks'

// GET /api/webhooks/[id]/stats - Get webhook statistics
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
    
    // Check ownership
    const webhook = await webhookManager.getWebhook(id)
    if (!webhook || webhook.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()

    // Get statistics
    const stats = await webhookManager.getStats(id, {
      start: startDate,
      end: endDate,
    })

    return NextResponse.json({ stats })
  } catch (error) {
    logger.error('Failed to get webhook statistics:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}