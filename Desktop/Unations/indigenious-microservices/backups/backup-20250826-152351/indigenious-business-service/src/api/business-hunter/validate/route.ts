import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get unverified businesses
    const businesses = global.businessHunterBusinesses || [];
    let validated = 0;
    
    // Simulate validation
    businesses.forEach(business => {
      if (!business.verified && Math.random() > 0.3) {
        business.verified = true;
        validated++;
      }
    });
    
    // Update stats
    const stats = global.businessHunterStats;
    stats.verifiedBusinesses += validated;

    return NextResponse.json({
      message: `Validated ${validated} businesses`,
      validated
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate businesses' },
      { status: 500 }
    );
  }
}