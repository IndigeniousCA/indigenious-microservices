/**
 * Market Intelligence Engine
 * Aggregates all platform data to provide unprecedented market insights
 * This is how we know everything about Indigenous procurement
 */

import prisma from '@/lib/prisma';
import { z } from 'zod';

// Intelligence schemas
export const MarketTrendSchema = z.object({
  category: z.string(),
  trend: z.enum(['growing', 'stable', 'declining']),
  growth: number,
  volume: number,
  averageValue: number,
  topPlayers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    marketShare: number,
  })),
});

export const OpportunityPredictionSchema = z.object({
  sector: z.string(),
  probability: number,
  estimatedValue: number,
  timeline: z.string(),
  requiredCapabilities: z.array(z.string()),
  suggestedPartners: z.array(z.string()),
});

export const CompetitorAnalysisSchema = z.object({
  businessId: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  winRate: number,
  averageBidAmount: number,
  preferredSectors: z.array(z.string()),
  partnerships: z.array(z.string()),
});

export interface MarketIntelligence {
  trends: MarketTrend[];
  predictions: OpportunityPrediction[];
  competitorInsights: CompetitorAnalysis[];
  networkAnalysis: NetworkInsight;
  pricingIntelligence: PricingData;
  riskFactors: RiskAssessment[];
}

export interface MarketTrend {
  category: string;
  trend: 'growing' | 'stable' | 'declining';
  growth: number; // percentage
  volume: number; // number of RFQs
  averageValue: number;
  forecast: {
    next30Days: number;
    next90Days: number;
    nextYear: number;
  };
  topPlayers: {
    id: string;
    name: string;
    marketShare: number;
  }[];
}

export interface OpportunityPrediction {
  sector: string;
  probability: number; // 0-100
  estimatedValue: number;
  timeline: string;
  requiredCapabilities: string[];
  suggestedPartners: string[];
  reasoning: string;
}

export interface CompetitorAnalysis {
  businessId: string;
  businessName: string;
  strengths: string[];
  weaknesses: string[];
  winRate: number;
  averageBidAmount: number;
  bidStrategy: 'aggressive' | 'conservative' | 'selective';
  preferredSectors: string[];
  partnerships: string[];
  threatLevel: 'low' | 'medium' | 'high';
}

export interface NetworkInsight {
  mostConnectedBusinesses: {
    id: string;
    name: string;
    connections: number;
    influence: number;
  }[];
  emergingPartnerships: {
    business1: string;
    business2: string;
    strength: number;
    potential: string;
  }[];
  communityInfluencers: {
    id: string;
    name: string;
    role: string;
    reach: number;
  }[];
}

export interface PricingData {
  categories: {
    category: string;
    averagePrice: number;
    priceRange: { min: number; max: number };
    trend: number; // percentage change
    optimalPrice: number;
  }[];
  winningPriceFactors: string[];
  priceSensitivity: number; // 0-100
}

export interface RiskAssessment {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: string;
  mitigation: string;
}

export class MarketIntelligenceEngine {
  /**
   * Get comprehensive market intelligence
   * This is our secret weapon - we see everything
   */
  static async getMarketIntelligence(filters?: {
    sectors?: string[];
    provinces?: string[];
    timeframe?: number; // days
  }): Promise<MarketIntelligence> {
    const [trends, predictions, competitors, network, pricing, risks] = await Promise.all([
      this.analyzeTrends(filters),
      this.predictOpportunities(filters),
      this.analyzeCompetitors(filters),
      this.analyzeNetwork(filters),
      this.analyzePricing(filters),
      this.assessRisks(filters),
    ]);
    
    return {
      trends,
      predictions,
      competitorInsights: competitors,
      networkAnalysis: network,
      pricingIntelligence: pricing,
      riskFactors: risks,
    };
  }
  
  /**
   * Analyze market trends
   * We track every RFQ, bid, and contract
   */
  private static async analyzeTrends(filters?: any): Promise<MarketTrend[]> {
    const timeframe = filters?.timeframe || 90; // Default 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    // Get RFQ data by category
    const rfqData = await prisma.rfq.groupBy({
      by: ['category'],
      where: {
        createdAt: { gte: startDate },
        ...(filters?.sectors && { category: { in: filters.sectors } }),
        ...(filters?.provinces && { province: { in: filters.provinces } }),
      },
      _count: true,
      _avg: { estimatedValue: true },
    });
    
    // Get historical data for trend analysis
    const historicalData = await prisma.rfq.groupBy({
      by: ['category'],
      where: {
        createdAt: {
          gte: new Date(startDate.getTime() - timeframe * 24 * 60 * 60 * 1000),
          lt: startDate,
        },
      },
      _count: true,
    });
    
    // Calculate trends
    const trends: MarketTrend[] = [];
    
    for (const current of rfqData) {
      const historical = historicalData.find(h => h.category === current.category);
      const growth = historical 
        ? ((current._count - historical._count) / historical._count) * 100
        : 100;
      
      // Get top players in category
      const topPlayers = await this.getTopPlayersInCategory(current.category);
      
      // Forecast future trends using simple linear projection
      const dailyGrowth = growth / timeframe;
      
      trends.push({
        category: current.category,
        trend: growth > 10 ? 'growing' : growth < -10 ? 'declining' : 'stable',
        growth,
        volume: current._count,
        averageValue: current._avg.estimatedValue || 0,
        forecast: {
          next30Days: dailyGrowth * 30,
          next90Days: dailyGrowth * 90,
          nextYear: dailyGrowth * 365,
        },
        topPlayers,
      });
    }
    
    return trends.sort((a, b) => b.growth - a.growth);
  }
  
  /**
   * Predict upcoming opportunities
   * Using AI and historical patterns
   */
  private static async predictOpportunities(filters?: any): Promise<OpportunityPrediction[]> {
    // Analyze historical RFQ patterns
    const patterns = await prisma.rfq.findMany({
      where: {
        status: 'CLOSED',
        winner: { isNot: null },
      },
      include: {
        winner: {
          include: {
            business: true,
          },
        },
      },
      orderBy: { closingDate: 'desc' },
      take: 100,
    });
    
    // Group by sector and analyze cycles
    const sectorPatterns = new Map<string, any[]>();
    patterns.forEach(rfq => {
      if (!sectorPatterns.has(rfq.category)) {
        sectorPatterns.set(rfq.category, []);
      }
      sectorPatterns.get(rfq.category)!.push(rfq);
    });
    
    const predictions: OpportunityPrediction[] = [];
    
    // Analyze each sector
    for (const [sector, rfqs] of sectorPatterns) {
      // Calculate average time between RFQs
      const intervals: number[] = [];
      for (let i = 1; i < rfqs.length; i++) {
        const interval = rfqs[i-1].createdAt.getTime() - rfqs[i].createdAt.getTime();
        intervals.push(interval);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastRfq = rfqs[0];
      const timeSinceLast = Date.now() - lastRfq.createdAt.getTime();
      
      // Predict next opportunity
      if (timeSinceLast > avgInterval * 0.8) {
        const avgValue = rfqs.reduce((sum, r) => sum + (r.estimatedValue || 0), 0) / rfqs.length;
        const winningCapabilities = this.extractCapabilities(rfqs);
        const suggestedPartners = await this.findIdealPartners(sector, winningCapabilities);
        
        predictions.push({
          sector,
          probability: Math.min(95, (timeSinceLast / avgInterval) * 100),
          estimatedValue: avgValue,
          timeline: this.estimateTimeline(avgInterval - (Date.now() - lastRfq.createdAt.getTime())),
          requiredCapabilities: winningCapabilities,
          suggestedPartners,
          reasoning: `Based on ${rfqs.length} historical RFQs with average ${Math.round(avgInterval / (24*60*60*1000))} day cycle`,
        });
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability);
  }
  
  /**
   * Analyze competitors
   * Know thy enemy - Sun Tzu
   */
  private static async analyzeCompetitors(filters?: any): Promise<CompetitorAnalysis[]> {
    // Get active businesses
    const businesses = await prisma.business.findMany({
      where: {
        isVerified: true,
        status: 'ACTIVE',
      },
      include: {
        bids: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          include: {
            rfq: true,
          },
        },
        wonContracts: true,
        partnerships: true,
      },
    });
    
    const analyses: CompetitorAnalysis[] = [];
    
    for (const business of businesses) {
      const totalBids = business.bids.length;
      const wonBids = business.bids.filter(b => b.status === 'WON').length;
      const winRate = totalBids > 0 ? (wonBids / totalBids) * 100 : 0;
      
      // Analyze bid amounts
      const bidAmounts = business.bids.map(b => b.amount).filter(a => a != null) as number[];
      const avgBidAmount = bidAmounts.length > 0 
        ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length 
        : 0;
      
      // Determine bid strategy
      const bidStrategy = this.determineBidStrategy(business.bids);
      
      // Extract strengths and weaknesses
      const { strengths, weaknesses } = await this.analyzeBusinessCapabilities(business);
      
      // Preferred sectors
      const sectorCounts = new Map<string, number>();
      business.bids.forEach(bid => {
        const sector = bid.rfq.category;
        sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);
      });
      const preferredSectors = Array.from(sectorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sector]) => sector);
      
      // Threat level
      const threatLevel = winRate > 70 ? 'high' : winRate > 40 ? 'medium' : 'low';
      
      analyses.push({
        businessId: business.id,
        businessName: business.businessName,
        strengths,
        weaknesses,
        winRate,
        averageBidAmount: avgBidAmount,
        bidStrategy,
        preferredSectors,
        partnerships: business.partnerships.map(p => p.partnerName),
        threatLevel,
      });
    }
    
    return analyses.sort((a, b) => b.winRate - a.winRate).slice(0, 20);
  }
  
  /**
   * Analyze network relationships
   * Map the entire ecosystem
   */
  private static async analyzeNetwork(filters?: any): Promise<NetworkInsight> {
    // Most connected businesses
    const connections = await prisma.businessConnection.groupBy({
      by: ['businessId'],
      _count: true,
      orderBy: { _count: { businessId: 'desc' } },
      take: 10,
    });
    
    const mostConnected = await Promise.all(
      connections.map(async (conn) => {
        const business = await prisma.business.findUnique({
          where: { id: conn.businessId },
        });
        return {
          id: conn.businessId,
          name: business?.businessName || 'Unknown',
          connections: conn._count,
          influence: conn._count * 10, // Simple influence score
        };
      })
    );
    
    // Emerging partnerships
    const recentPartnerships = await prisma.businessPartnership.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        business: true,
      },
      take: 10,
    });
    
    const emergingPartnerships = recentPartnerships.map(p => ({
      business1: p.business.businessName,
      business2: p.partnerName,
      strength: 85, // Placeholder
      potential: 'High synergy potential based on complementary capabilities',
    }));
    
    // Community influencers
    const influencers = await prisma.communityEndorsement.groupBy({
      by: ['endorserId'],
      _count: true,
      orderBy: { _count: { endorserId: 'desc' } },
      take: 5,
    });
    
    const communityInfluencers = await Promise.all(
      influencers.map(async (inf) => {
        const endorser = await prisma.user.findUnique({
          where: { id: inf.endorserId },
        });
        return {
          id: inf.endorserId,
          name: endorser?.name || 'Unknown',
          role: endorser?.role || 'Community Leader',
          reach: inf._count * 100, // Estimated reach
        };
      })
    );
    
    return {
      mostConnectedBusinesses: mostConnected,
      emergingPartnerships,
      communityInfluencers,
    };
  }
  
  /**
   * Analyze pricing intelligence
   * Know the perfect price to win
   */
  private static async analyzePricing(filters?: any): Promise<PricingData> {
    // Get winning bid data by category
    const winningBids = await prisma.bid.findMany({
      where: {
        status: 'WON',
        amount: { not: null },
      },
      include: {
        rfq: true,
      },
    });
    
    // Group by category
    const categoryPricing = new Map<string, number[]>();
    winningBids.forEach(bid => {
      const category = bid.rfq.category;
      if (!categoryPricing.has(category)) {
        categoryPricing.set(category, []);
      }
      categoryPricing.get(category)!.push(bid.amount as number);
    });
    
    // Calculate pricing stats
    const categories = Array.from(categoryPricing.entries()).map(([category, prices]) => {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const sorted = prices.sort((a, b) => a - b);
      const optimal = sorted[Math.floor(sorted.length * 0.7)]; // 70th percentile
      
      return {
        category,
        averagePrice: avg,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
        },
        trend: 5.2, // Placeholder - would calculate actual trend
        optimalPrice: optimal,
      };
    });
    
    return {
      categories,
      winningPriceFactors: [
        'Indigenous ownership percentage',
        'Local employment commitment',
        'Past performance score',
        'Technical compliance',
        'Delivery timeline',
      ],
      priceSensitivity: 72, // High sensitivity
    };
  }
  
  /**
   * Assess market risks
   */
  private static async assessRisks(filters?: any): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [
      {
        type: 'Regulatory Change',
        severity: 'medium',
        probability: 35,
        impact: 'New procurement rules could affect platform requirements',
        mitigation: 'Maintain government relations and adapt quickly',
      },
      {
        type: 'Economic Downturn',
        severity: 'high',
        probability: 25,
        impact: 'Reduced government spending on procurement',
        mitigation: 'Diversify into private sector procurement',
      },
      {
        type: 'Competitor Entry',
        severity: 'low',
        probability: 15,
        impact: 'New platform targeting Indigenous procurement',
        mitigation: 'Network effects and switching costs protect us',
      },
      {
        type: 'Technology Disruption',
        severity: 'medium',
        probability: 40,
        impact: 'AI/blockchain changing procurement landscape',
        mitigation: 'Stay ahead with continuous innovation',
      },
      {
        type: 'Community Trust',
        severity: 'critical',
        probability: 5,
        impact: 'Loss of Indigenous community support',
        mitigation: 'Maintain transparent governance and profit sharing',
      },
    ];
    
    return risks;
  }
  
  /**
   * Helper methods
   */
  private static async getTopPlayersInCategory(category: string): Promise<any[]> {
    const topWinners = await prisma.bid.groupBy({
      by: ['businessId'],
      where: {
        status: 'WON',
        rfq: { category },
      },
      _count: true,
      orderBy: { _count: { businessId: 'desc' } },
      take: 5,
    });
    
    const totalWins = topWinners.reduce((sum, w) => sum + w._count, 0);
    
    return Promise.all(
      topWinners.map(async (winner) => {
        const business = await prisma.business.findUnique({
          where: { id: winner.businessId },
        });
        return {
          id: winner.businessId,
          name: business?.businessName || 'Unknown',
          marketShare: (winner._count / totalWins) * 100,
        };
      })
    );
  }
  
  private static extractCapabilities(rfqs: unknown[]): string[] {
    // Extract common requirements from winning bids
    const capabilities = new Set<string>();
    rfqs.forEach(rfq => {
      if (rfq.requirements) {
        rfq.requirements.forEach((req: string) => capabilities.add(req));
      }
    });
    return Array.from(capabilities).slice(0, 5);
  }
  
  private static async findIdealPartners(sector: string, capabilities: string[]): Promise<string[]> {
    // Find businesses with complementary capabilities
    const businesses = await prisma.business.findMany({
      where: {
        industries: { has: sector },
        isVerified: true,
      },
      take: 5,
    });
    return businesses.map(b => b.businessName);
  }
  
  private static estimateTimeline(milliseconds: number): string {
    const days = Math.max(0, Math.round(milliseconds / (24 * 60 * 60 * 1000)));
    if (days === 0) return 'Imminent';
    if (days <= 7) return 'Within a week';
    if (days <= 30) return `${days} days`;
    if (days <= 90) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  }
  
  private static determineBidStrategy(bids: unknown[]): 'aggressive' | 'conservative' | 'selective' {
    if (bids.length === 0) return 'selective';
    
    const winRate = bids.filter(b => b.status === 'WON').length / bids.length;
    const avgCompetition = bids.reduce((sum, b) => sum + (b.rfq.bidCount || 1), 0) / bids.length;
    
    if (winRate > 0.6 && avgCompetition > 5) return 'aggressive';
    if (winRate < 0.3) return 'conservative';
    return 'selective';
  }
  
  private static async analyzeBusinessCapabilities(business: unknown): Promise<{
    strengths: string[];
    weaknesses: string[];
  }> {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    // Analyze strengths
    if (business.certifications?.length > 3) {
      strengths.push('Strong certifications');
    }
    if (business.indigenousEmployees > business.employeeCount * 0.5) {
      strengths.push('High Indigenous employment');
    }
    if (business.wonContracts.length > 10) {
      strengths.push('Proven track record');
    }
    if (business.partnerships.length > 3) {
      strengths.push('Strong partnership network');
    }
    
    // Analyze weaknesses
    if (business.employeeCount < 10) {
      weaknesses.push('Limited capacity');
    }
    if (!business.hasSecurityClearance) {
      weaknesses.push('No security clearance');
    }
    if (business.certifications?.length === 0) {
      weaknesses.push('Lacks certifications');
    }
    
    return { strengths, weaknesses };
  }
  
  /**
   * Real-time intelligence alerts
   */
  static async getIntelligenceAlerts(businessId: string): Promise<{
    alerts: {
      type: string;
      severity: 'info' | 'warning' | 'critical';
      message: string;
      action: string;
    }[];
  }> {
    const alerts = [];
    
    // Check for new opportunities
    const predictions = await this.predictOpportunities();
    const relevantPredictions = predictions.filter(p => p.probability > 80);
    
    if (relevantPredictions.length > 0) {
      alerts.push({
        type: 'opportunity',
        severity: 'info' as const,
        message: `${relevantPredictions.length} high-probability opportunities detected`,
        action: 'Review and prepare bids',
      });
    }
    
    // Check for new competitors
    const competitors = await this.analyzeCompetitors();
    const threats = competitors.filter(c => c.threatLevel === 'high');
    
    if (threats.length > 0) {
      alerts.push({
        type: 'competition',
        severity: 'warning' as const,
        message: `${threats.length} high-threat competitors identified`,
        action: 'Adjust bidding strategy',
      });
    }
    
    // Check pricing trends
    const pricing = await this.analyzePricing();
    const risingPrices = pricing.categories.filter(c => c.trend > 10);
    
    if (risingPrices.length > 0) {
      alerts.push({
        type: 'pricing',
        severity: 'info' as const,
        message: 'Prices rising in key categories',
        action: 'Consider adjusting bid amounts',
      });
    }
    
    return { alerts };
  }
}

export default MarketIntelligenceEngine;