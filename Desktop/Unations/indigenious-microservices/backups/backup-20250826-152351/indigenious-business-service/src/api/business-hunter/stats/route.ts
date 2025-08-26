import { NextResponse } from 'next/server';

// Connect to the REAL Business Hunter Swarm backend
const SWARM_API_URL = process.env.BUSINESS_HUNTER_API || 'http://localhost:3000';

export async function GET() {
  try {
    // Get real stats from the swarm orchestrator
    const swarmResponse = await fetch(`${SWARM_API_URL}/api/stats`, {
      headers: {
        'X-API-Key': process.env.BUSINESS_HUNTER_API_KEY || 'bh_prod_default'
      }
    });

    if (!swarmResponse.ok) {
      // If swarm is not running, return zero stats with helpful message
      if (swarmResponse.status === 404 || swarmResponse.status === 502) {
        return NextResponse.json({
          stats: {
            totalDiscovered: 0,
            indigenousIdentified: 0,
            billC5Participants: 0,
            verifiedBusinesses: 0,
            discoveredLast24h: 0,
            activeHunters: 0,
            targetBusinesses: 150000,
            billC5Target: 100000,
            swarmStatus: 'NOT_RUNNING'
          },
          recentBusinesses: [],
          message: 'Business Hunter Swarm is not running',
          deployment: {
            status: 'OFFLINE',
            solution: 'Run ./deploy-business-hunter-swarm.sh to start the swarm',
            features: [
              'Real web crawling across government sites',
              'Indigenous organization directory scanning',
              'Social media business discovery',
              'Business registry integration',
              'ML-based classification',
              'Automatic validation and enrichment'
            ]
          }
        });
      }
    }

    const swarmData = await swarmResponse.json();
    
    // Transform swarm data to match frontend expectations
    return NextResponse.json({
      stats: {
        totalDiscovered: swarmData.discovered || 0,
        indigenousIdentified: swarmData.indigenousCount || 0,
        billC5Participants: swarmData.billC5Count || 0,
        verifiedBusinesses: swarmData.verifiedCount || 0,
        discoveredLast24h: swarmData.last24Hours || 0,
        activeHunters: swarmData.activeHunters || 0,
        targetBusinesses: 150000,
        billC5Target: 100000,
        swarmStatus: 'RUNNING',
        discoveryRate: swarmData.rate || 0
      },
      recentBusinesses: swarmData.recentBusinesses || [],
      swarmMetrics: swarmData.metrics || {},
      message: 'Connected to live Business Hunter Swarm'
    });

  } catch (error) {
    console.error('Stats error:', error);
    
    // Connection error - swarm not accessible
    return NextResponse.json({
      stats: {
        totalDiscovered: 0,
        indigenousIdentified: 0,
        billC5Participants: 0,
        verifiedBusinesses: 0,
        discoveredLast24h: 0,
        activeHunters: 0,
        targetBusinesses: 150000,
        billC5Target: 100000,
        swarmStatus: 'CONNECTION_ERROR'
      },
      recentBusinesses: [],
      error: 'Cannot connect to Business Hunter Swarm',
      swarm_url: SWARM_API_URL,
      instructions: [
        '1. Deploy the swarm: ./deploy-business-hunter-swarm.sh',
        '2. The swarm will start with:',
        '   - 5 Government hunters',
        '   - 3 Indigenous Organization hunters',
        '   - 2 Social Media hunters',
        '   - 2 Business Registry hunters',
        '3. Monitor at http://localhost:8080'
      ]
    });
  }
}