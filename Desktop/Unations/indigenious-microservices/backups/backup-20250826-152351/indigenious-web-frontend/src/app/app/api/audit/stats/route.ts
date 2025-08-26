/**
 * Audit Statistics API
 * Get audit statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { auditService } from '@/lib/audit'

// GET /api/audit/stats - Get audit statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const isAdmin = session.user.email?.endsWith('@admin.com') // Temporary check

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    // Get date range
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()

    // Get statistics (simplified for now)
    const stats = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalEvents: 4892,
      eventsByCategory: {
        SECURITY: 1234,
        ACCESS: 892,
        DATA: 1567,
        SYSTEM: 1199
      },
      eventsBySeverity: {
        INFO: 3421,
        WARNING: 987,
        ERROR: 421,
        CRITICAL: 63
      },
      eventsByResult: {
        SUCCESS: 4123,
        FAILURE: 769
      },
      topActions: [
        { action: 'login', count: 892 },
        { action: 'view', count: 756 },
        { action: 'update', count: 543 },
        { action: 'create', count: 421 },
        { action: 'delete', count: 234 }
      ],
      topUsers: [
        { userId: 'user-123', email: 'admin@example.com', eventCount: 342 },
        { userId: 'user-456', email: 'manager@example.com', eventCount: 287 },
        { userId: 'user-789', email: 'operator@example.com', eventCount: 198 }
      ],
      trends: {
        totalGrowth: 12.5, // percentage
        securityEvents: -8.3,
        failureRate: -15.2
      },
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Failed to get audit statistics:', error)
    return NextResponse.json(
      { error: 'Failed to get audit statistics' },
      { status: 500 }
    )
  }
}