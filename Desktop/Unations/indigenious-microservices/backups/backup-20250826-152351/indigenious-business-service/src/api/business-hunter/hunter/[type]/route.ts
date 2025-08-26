import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  try {
    const hunterType = params.type;
    const count = hunterType === 'government' ? 250 : (hunterType === 'industry' ? 300 : 150);
    
    // Hunter-specific configurations
    const hunterConfigs = {
      government: {
        sources: ['SAM.gov', 'CanadaBuys', 'Provincial Registry'],
        industryBias: ['construction', 'engineering', 'consulting', 'energy'],
        billC5Probability: 0.7
      },
      indigenous: {
        sources: ['CCAB Directory', 'First Nations Business Directory', 'Indigenous Works'],
        industryBias: ['construction', 'forestry', 'consulting', 'mining'],
        billC5Probability: 0
      },
      industry: {
        sources: ['Mining Association', 'Construction Canada', 'Engineering Canada'],
        industryBias: ['mining', 'construction', 'engineering', 'energy'],
        billC5Probability: 0.8
      }
    };

    const config = hunterConfigs[hunterType as keyof typeof hunterConfigs] || hunterConfigs.industry;
    
    // Business name templates by hunter type
    const nameTemplates = {
      government: ['Certified', 'Registered', 'Licensed', 'Approved'],
      indigenous: ['First Nations', 'Indigenous', 'Tribal', 'Native'],
      industry: ['Professional', 'Industrial', 'Commercial', 'Enterprise']
    };

    const industries = config.industryBias;
    const templates = nameTemplates[hunterType as keyof typeof nameTemplates] || nameTemplates.industry;
    
    // Simulate hunter discovery
    const newBusinesses = [];
    for (let i = 0; i < count; i++) {
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const rand = Math.random();
      
      let businessType;
      if (hunterType === 'indigenous') {
        businessType = 'indigenous_owned';
      } else if (rand < config.billC5Probability) {
        businessType = 'bill_c5_ready';
      } else {
        businessType = 'canadian_general';
      }
      
      const business = {
        id: `${Date.now()}-${hunterType}-${i}`,
        name: `${template} ${industry.charAt(0).toUpperCase() + industry.slice(1)} Solutions ${Date.now().toString().slice(-4)}`,
        type: businessType,
        industry,
        email: `contact@${template.toLowerCase()}${industry}${i}.ca`,
        website: `https://${template.toLowerCase()}${industry}${i}.ca`,
        province: ['ON', 'BC', 'AB', 'QC', 'MB', 'SK'][Math.floor(Math.random() * 6)],
        verified: hunterType === 'government',
        source: config.sources[Math.floor(Math.random() * config.sources.length)],
        discoveredAt: new Date().toISOString()
      };
      
      newBusinesses.push(business);
    }

    // Update global stats
    const stats = (global as any).businessHunterStats || {
      totalDiscovered: 12543,
      indigenousIdentified: 3847,
      billC5Participants: 7234,
      verifiedBusinesses: 8234,
      discoveredLast24h: 523,
      activeHunters: 12,
      targetBusinesses: 150000,
      billC5Target: 100000
    };
    
    stats.totalDiscovered += count;
    stats.indigenousIdentified += newBusinesses.filter(b => b.type === 'indigenous_owned').length;
    stats.billC5Participants += newBusinesses.filter(b => b.type === 'bill_c5_ready').length;
    stats.discoveredLast24h += count;
    stats.verifiedBusinesses += newBusinesses.filter(b => b.verified).length;
    
    (global as any).businessHunterStats = stats;
    
    // Add to businesses list (keep up to 10,000 in memory for viewing)
    const businesses = (global as any).businessHunterBusinesses || [];
    (global as any).businessHunterBusinesses = [...newBusinesses, ...businesses].slice(0, 10000);

    return NextResponse.json({
      message: `${hunterType} hunter discovered ${count} businesses`,
      count,
      businesses: newBusinesses
    });
  } catch (error) {
    console.error('Hunter error:', error);
    return NextResponse.json(
      { error: 'Failed to run hunter' },
      { status: 500 }
    );
  }
}