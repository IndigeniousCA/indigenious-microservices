import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/badges/[badgeId] - Get badge details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;

    const badge = await (prisma as any).badge.findUnique({
      where: { id: badgeId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            nation: true,
            territory: true,
            indigenousOwnership: true,
            verificationStatus: true
          }
        },
        platforms: true
      }
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Format response with visual data
    const response = {
      id: badge.id,
      businessId: badge.businessId,
      business: badge.business,
      identity: {
        publicKey: badge.publicKey,
        temporalProof: badge.temporalProof,
        indigenousHash: badge.indigenousHash,
        performanceSignature: badge.performanceSignature,
        blockchainAnchor: badge.blockchainAnchor
      },
      visual: {
        animal: badge.animalSpirit,
        stage: badge.evolutionStage,
        metrics: {
          procurementPercentage: badge.procurementPercentage,
          indigenousEmployment: badge.indigenousEmployment,
          communityInvestment: badge.communityInvestment,
          sustainabilityScore: badge.sustainabilityScore,
          yearsActive: badge.yearsActive,
          totalImpactValue: badge.totalImpactValue
        },
        colors: getAnimalColors(badge.animalSpirit, badge.evolutionStage)
      },
      status: badge.status,
      platforms: badge.platforms,
      analytics: {
        clickCount: badge.clickCount,
        conversionCount: badge.conversionCount,
        viralCoefficient: badge.viralCoefficient
      },
      createdAt: badge.createdAt,
      lastVerified: badge.lastVerified
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Badge fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badge' },
      { status: 500 }
    );
  }
}

// PUT /api/badges/[badgeId] - Update badge metrics
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;
    const body = await request.json();

    // Verify ownership/permission would go here

    const updatedBadge = await (prisma as any).badge.update({
      where: { id: badgeId },
      data: {
        procurementPercentage: body.metrics?.procurementPercentage,
        indigenousEmployment: body.metrics?.indigenousEmployment,
        communityInvestment: body.metrics?.communityInvestment,
        sustainabilityScore: body.metrics?.sustainabilityScore,
        yearsActive: body.metrics?.yearsActive,
        totalImpactValue: body.metrics?.totalImpactValue,
        evolutionStage: calculateNewStage(body.metrics),
        lastVerified: new Date()
      }
    });

    // Create audit event
    await (prisma as any).badgeAuditEvent.create({
      data: {
        badgeId,
        eventType: 'updated',
        eventData: {
          previousMetrics: {
            procurementPercentage: updatedBadge.procurementPercentage,
            indigenousEmployment: updatedBadge.indigenousEmployment
          },
          newMetrics: body.metrics
        },
        performedByType: 'system'
      }
    });

    return NextResponse.json({ success: true, badge: updatedBadge });
  } catch (error) {
    console.error('Badge update error:', error);
    return NextResponse.json(
      { error: 'Failed to update badge' },
      { status: 500 }
    );
  }
}

// DELETE /api/badges/[badgeId] - Revoke badge
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ badgeId: string }> }
) {
  try {
    const params = await context.params;
    const { badgeId } = params;

    // Verify admin permission would go here

    const badge = await (prisma as any).badge.update({
      where: { id: badgeId },
      data: { status: 'REVOKED' }
    });

    // Create audit event
    await (prisma as any).badgeAuditEvent.create({
      data: {
        badgeId,
        eventType: 'revoked',
        eventData: {
          reason: 'Admin action',
          timestamp: new Date()
        },
        performedByType: 'admin'
      }
    });

    return NextResponse.json({ success: true, badge });
  } catch (error) {
    console.error('Badge revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke badge' },
      { status: 500 }
    );
  }
}

// Helper functions
function getAnimalColors(animal: string, stage: number) {
  const animalColors: Record<string, { primary: string; secondary: string }> = {
    beaver: { primary: '#8B4513', secondary: '#D2691E' },
    eagle: { primary: '#FFD700', secondary: '#FFA500' },
    fox: { primary: '#FF6347', secondary: '#FF4500' },
    wolf: { primary: '#708090', secondary: '#696969' },
    bear: { primary: '#654321', secondary: '#8B4513' },
    turtle: { primary: '#228B22', secondary: '#32CD32' },
    otter: { primary: '#4682B4', secondary: '#5F9EA0' },
    wolverine: { primary: '#2F4F4F', secondary: '#483D8B' },
    marten: { primary: '#8B7355', secondary: '#A0522D' }
  };

  const stageEffects: Record<number, { accent: string; glow: string }> = {
    1: { accent: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.3)' },
    2: { accent: '#00FF00', glow: 'rgba(0, 255, 0, 0.5)' },
    3: { accent: '#FFD700', glow: 'rgba(255, 215, 0, 0.7)' },
    4: { accent: '#FF00FF', glow: 'rgba(255, 0, 255, 0.9)' }
  };

  return {
    ...animalColors[animal],
    ...stageEffects[stage]
  };
}

function calculateNewStage(metrics: any): number {
  if (
    metrics.procurementPercentage >= 15 &&
    metrics.indigenousEmployment >= 50 &&
    metrics.yearsActive >= 3
  ) {
    return 4; // LEGENDARY
  } else if (
    metrics.procurementPercentage >= 10 &&
    metrics.indigenousEmployment >= 25
  ) {
    return 3; // GOLDEN
  } else if (metrics.procurementPercentage >= 5) {
    return 2; // AURORA
  } else {
    return 1; // ENTRY
  }
}