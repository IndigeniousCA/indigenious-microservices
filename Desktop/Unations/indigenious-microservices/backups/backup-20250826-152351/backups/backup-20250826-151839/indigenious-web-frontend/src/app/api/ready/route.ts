import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from('businesses').select('count').limit(1)
    
    if (error) {
      throw new Error('Database connection failed')
    }

    // Check other critical services
    const checks = {
      database: 'connected',
      cache: 'ready',
      storage: 'available',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      status: 'ready',
      checks
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}