/**
 * Audit Trail API
 * Get audit trail for specific resources
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { auditService } from '@/lib/audit'

// GET /api/audit/trail/[resource]/[id] - Get audit trail for a resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { resource, id } = await params

    // Check if user has access to this resource
    // For now, allow all authenticated users
    
    // Get audit trail (simplified for now)
    const trail = {
      resource,
      resourceId: id,
      events: [
        {
          id: `evt-1`,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          action: 'created',
          actorId: 'user-123',
          actorEmail: 'creator@example.com',
          changes: {
            status: { from: null, to: 'active' }
          },
          metadata: { source: 'api' }
        },
        {
          id: `evt-2`,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          action: 'updated',
          actorId: 'user-456',
          actorEmail: 'editor@example.com',
          changes: {
            name: { from: 'Old Name', to: 'New Name' },
            description: { from: 'Old description', to: 'Updated description' }
          },
          metadata: { source: 'web' }
        },
        {
          id: `evt-3`,
          timestamp: new Date(Date.now() - 900000).toISOString(),
          action: 'viewed',
          actorId: 'user-789',
          actorEmail: 'viewer@example.com',
          changes: {},
          metadata: { source: 'mobile' }
        }
      ],
      summary: {
        totalEvents: 3,
        firstEvent: new Date(Date.now() - 3600000).toISOString(),
        lastEvent: new Date(Date.now() - 900000).toISOString(),
        uniqueActors: 3
      }
    }

    return NextResponse.json(trail)
  } catch (error) {
    logger.error('Failed to get audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to get audit trail' },
      { status: 500 }
    )
  }
}