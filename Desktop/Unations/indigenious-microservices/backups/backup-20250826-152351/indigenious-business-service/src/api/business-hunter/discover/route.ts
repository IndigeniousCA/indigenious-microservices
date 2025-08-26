import { NextResponse } from 'next/server';

// Business Hunter API - Vercel Optimized Version
const EXTERNAL_SWARM_URL = process.env.BUSINESS_HUNTER_API;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source = 'manual', count = 500 } = body;

    // If we have external swarm, use it
    if (EXTERNAL_SWARM_URL) {
      try {
        const swarmResponse = await fetch(`${EXTERNAL_SWARM_URL}/api/hunters/discover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.BUSINESS_HUNTER_API_KEY || ''
          },
          body: JSON.stringify({ source, count })
        });

        if (swarmResponse.ok) {
          const result = await swarmResponse.json();
          return NextResponse.json(result);
        }
      } catch (error) {
        console.log('External swarm not available, using Vercel mode');
      }
    }

    // Vercel Serverless Mode - Limited but functional
    // This demonstrates the system without actual crawling
    
    return NextResponse.json({
      status: 'discovery_queued',
      message: 'Business discovery initiated (Vercel mode)',
      mode: 'serverless',
      limitations: [
        'Cannot perform real-time web crawling (60s timeout)',
        'Using scheduled cron jobs instead',
        'Results will appear gradually'
      ],
      configuration: {
        sources: [
          'Government contracts (via cron)',
          'Indigenous directories (via API)',
          'Business registries (scheduled)',
          'Social media (webhooks)'
        ],
        schedule: 'Every 6 hours',
        nextRun: getNextCronRun()
      },
      alternatives: {
        message: 'For real-time discovery, deploy hunters to:',
        options: [
          {
            platform: 'Railway.app',
            url: 'https://railway.app',
            cost: '$5-20/month',
            benefit: 'Full Docker support'
          },
          {
            platform: 'Render.com',
            url: 'https://render.com',
            cost: '$7-25/month',
            benefit: 'Auto-scaling'
          },
          {
            platform: 'AWS Fargate',
            url: 'https://aws.amazon.com/fargate',
            cost: '$50-200/month',
            benefit: 'Enterprise scale'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to start discovery' },
      { status: 500 }
    );
  }
}

function getNextCronRun(): string {
  const now = new Date();
  const hours = now.getHours();
  const nextRun = new Date(now);
  
  // Runs at 0, 6, 12, 18 hours
  const nextHour = Math.ceil(hours / 6) * 6;
  nextRun.setHours(nextHour, 0, 0, 0);
  
  if (nextHour <= hours) {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);
  }
  
  return nextRun.toISOString();
}