import { PrismaClient, PipelineStage, OpportunityStatus, OpportunityPriority, AlertType, AlertPriority } from '@prisma/client';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, addDays, startOfQuarter, endOfQuarter } from 'date-fns';
import * as tf from '@tensorflow/tfjs-node';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

export class PipelineService {
  private static winProbabilityModel: tf.LayersModel | null = null;
  
  /**
   * Track new opportunity in pipeline
   */
  static async createOpportunity(data: {
    title: string;
    description: string;
    category: string;
    source: string;
    businessId: string;
    businessName: string;
    isIndigenousBusiness: boolean;
    indigenousOwnership?: number;
    value: number;
    expectedCloseDate: Date;
    clientName: string;
    clientType: string;
    location: string;
    indigenousPreference?: boolean;
    indigenousSetAside?: boolean;
    setAsidePercentage?: number;
    requiresBonding?: boolean;
    bondingAmount?: number;
  }) {
    const opportunityNumber = `OPP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Calculate initial win probability
    const probability = await this.calculateWinProbability({
      ...data,
      stage: 'LEAD',
      competitorCount: 0
    });
    
    // Create opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        opportunityNumber,
        title: data.title,
        description: data.description,
        category: data.category as any,
        stage: 'LEAD',
        source: data.source as any,
        businessId: data.businessId,
        businessName: data.businessName,
        isIndigenousBusiness: data.isIndigenousBusiness,
        indigenousOwnership: data.indigenousOwnership,
        value: data.value,
        probability,
        weightedValue: data.value * (probability / 100),
        expectedCloseDate: data.expectedCloseDate,
        clientName: data.clientName,
        clientType: data.clientType as any,
        clientIndustry: this.deriveIndustry(data.clientType),
        location: data.location,
        region: this.deriveRegion(data.location),
        indigenousTerritory: await this.identifyTerritory(data.location),
        indigenousPreference: data.indigenousPreference || false,
        indigenousSetAside: data.indigenousSetAside || false,
        setAsidePercentage: data.setAsidePercentage,
        requiresBonding: data.requiresBonding || false,
        bondingAmount: data.bondingAmount,
        priority: this.determinePriority(data.value, data.indigenousSetAside),
        status: 'ACTIVE'
      }
    });
    
    // Log activity
    await this.logActivity({
      opportunityId: opportunity.id,
      activityType: 'INITIAL_REVIEW',
      description: 'Opportunity created and added to pipeline',
      performedBy: 'system',
      performedByName: 'System'
    });
    
    // Check for Indigenous-specific alerts
    if (data.indigenousSetAside || data.indigenousPreference) {
      await this.createOpportunityAlert({
        alertType: 'INDIGENOUS_SET_ASIDE',
        priority: 'HIGH',
        title: `Indigenous ${data.indigenousSetAside ? 'Set-Aside' : 'Preference'} Opportunity`,
        description: `New opportunity with Indigenous ${data.indigenousSetAside ? `set-aside (${data.setAsidePercentage}%)` : 'preference'}`,
        opportunityId: opportunity.id,
        businessId: data.businessId,
        isIndigenousSpecific: true,
        indigenousSetAside: data.indigenousSetAside || false,
        value: data.value,
        deadline: data.expectedCloseDate
      });
    }
    
    // Trigger partnership matching if needed
    if (data.requiresBonding && data.bondingAmount && data.bondingAmount > 500000) {
      await this.suggestPartnerships(opportunity.id);
    }
    
    return {
      opportunityId: opportunity.id,
      opportunityNumber: opportunity.opportunityNumber,
      stage: opportunity.stage,
      probability,
      weightedValue: opportunity.weightedValue,
      priority: opportunity.priority,
      alerts: data.indigenousSetAside || data.indigenousPreference ? 1 : 0
    };
  }
  
  /**
   * Move opportunity through pipeline stages
   */
  static async updateOpportunityStage(opportunityId: string, newStage: PipelineStage, notes?: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });
    
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }
    
    const previousStage = opportunity.stage;
    const stageDuration = opportunity.daysInStage;
    
    // Recalculate probability based on new stage
    const newProbability = await this.calculateWinProbability({
      ...opportunity,
      stage: newStage
    });
    
    // Update opportunity
    const updated = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        stage: newStage,
        probability: newProbability,
        weightedValue: opportunity.value * (newProbability / 100),
        daysInStage: 0,
        totalCycleDays: opportunity.totalCycleDays + stageDuration,
        ...(newStage === 'CLOSED_WON' && { actualCloseDate: new Date() }),
        ...(newStage === 'CLOSED_LOST' && { actualCloseDate: new Date() })
      }
    });
    
    // Log stage change
    await this.logActivity({
      opportunityId,
      activityType: 'INTERNAL_REVIEW',
      description: `Stage changed from ${previousStage} to ${newStage}`,
      performedBy: 'user',
      performedByName: 'User',
      stageChanged: true,
      previousStage,
      newStage,
      probabilityChanged: true,
      previousProbability: opportunity.probability,
      newProbability,
      notes
    });
    
    // Handle win/loss
    if (newStage === 'CLOSED_WON' || newStage === 'CLOSED_LOST') {
      await this.recordWinLoss(opportunityId, newStage === 'CLOSED_WON' ? 'WON' : 'LOST');
    }
    
    // Alert if opportunity is stalling
    if (stageDuration > 30 && newStage !== 'CLOSED_WON' && newStage !== 'CLOSED_LOST') {
      await this.createOpportunityAlert({
        alertType: 'STAGE_STALLED',
        priority: 'MEDIUM',
        title: 'Opportunity Stalled',
        description: `Opportunity has been in ${previousStage} stage for ${stageDuration} days`,
        opportunityId,
        businessId: opportunity.businessId
      });
    }
    
    return updated;
  }
  
  /**
   * AI-powered bid/no-bid recommendation
   */
  static async generateBidRecommendation(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { qualifications: true }
    });
    
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }
    
    // Analyze opportunity factors
    const analysis = await this.analyzeOpportunity(opportunity);
    
    // Calculate go/no-go score
    const goNoGoScore = this.calculateGoNoGoScore(analysis);
    
    // Determine recommendation
    let decision: any = 'NO_BID';
    if (goNoGoScore >= 80) decision = 'STRONG_BID';
    else if (goNoGoScore >= 65) decision = 'BID';
    else if (goNoGoScore >= 50) decision = 'CONDITIONAL_BID';
    else if (opportunity.partnershipDesired) decision = 'PARTNER_ONLY';
    
    // Generate pricing strategy
    const pricingStrategy = await this.generatePricingStrategy(opportunity, analysis);
    
    // Identify risks and mitigations
    const riskAnalysis = this.assessRisks(opportunity, analysis);
    
    // Create recommendation
    const recommendation = await prisma.bidRecommendation.create({
      data: {
        opportunityId,
        recommendationType: 'BID_NO_BID',
        decision,
        confidence: analysis.confidence,
        reasoning: analysis,
        factors: {
          marketPosition: analysis.marketPosition,
          capabilities: analysis.capabilities,
          competition: analysis.competition,
          profitability: analysis.profitability
        },
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        risks: riskAnalysis.risks,
        mitigations: riskAnalysis.mitigations,
        competitivePosition: analysis.competitivePosition,
        pricingStrategy: pricingStrategy.strategy,
        suggestedMargin: pricingStrategy.margin,
        suggestedPrice: pricingStrategy.price,
        partnershipAdvised: analysis.needsPartnership,
        goNoGoScore,
        minimumAcceptablePrice: pricingStrategy.minimum,
        walkAwayPoint: pricingStrategy.walkAway,
        winStrategyElements: this.generateWinStrategy(opportunity, analysis),
        generatedBy: 'ML-v1.0',
        generatedAt: new Date()
      }
    });
    
    return {
      recommendationId: recommendation.id,
      decision,
      confidence: analysis.confidence,
      goNoGoScore,
      keyFactors: {
        indigenous: opportunity.indigenousPreference ? 'Advantage' : 'Neutral',
        competition: analysis.competition.level,
        capabilities: analysis.capabilities.match,
        profitability: pricingStrategy.margin
      },
      suggestedPrice: pricingStrategy.price,
      risks: riskAnalysis.risks.slice(0, 3),
      recommendation: decision === 'STRONG_BID' ? 'Strongly recommend bidding' :
                     decision === 'BID' ? 'Recommend bidding' :
                     decision === 'CONDITIONAL_BID' ? 'Bid with conditions' :
                     decision === 'PARTNER_ONLY' ? 'Only bid with partner' :
                     'Recommend not bidding'
    };
  }
  
  /**
   * Match opportunities with potential partners
   */
  static async suggestPartnerships(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });
    
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }
    
    // Identify capability gaps
    const gaps = await this.identifyCapabilityGaps(opportunity);
    
    // Find potential partners
    const partners = await this.findPotentialPartners({
      capabilities: gaps.required,
      location: opportunity.location,
      indigenousPreferred: opportunity.indigenousPreference,
      category: opportunity.category
    });
    
    // Score and rank partners
    const scoredPartners = partners.map(partner => ({
      ...partner,
      score: this.scorePartnerMatch(partner, opportunity, gaps),
      benefits: this.assessPartnershipBenefits(partner, opportunity)
    })).sort((a, b) => b.score - a.score);
    
    // Create partnership opportunities
    for (const gap of gaps.gaps) {
      await prisma.partnershipOpportunity.create({
        data: {
          opportunityId,
          partnershipType: gap.suggestedType as any,
          roleNeeded: gap.role,
          scopeDescription: gap.description,
          valueShare: gap.estimatedShare,
          idealPartnerProfile: {
            capabilities: gap.capabilities,
            experience: gap.experience,
            certifications: gap.certifications
          },
          indigenousPreferred: opportunity.indigenousPreference,
          requiredCapabilities: gap.capabilities,
          requiredCertifications: gap.certifications || [],
          potentialPartners: scoredPartners.slice(0, 5),
          status: 'SEARCHING'
        }
      });
    }
    
    // Alert about partnership needs
    if (gaps.critical) {
      await this.createOpportunityAlert({
        alertType: 'PARTNERSHIP_NEEDED',
        priority: 'HIGH',
        title: 'Critical Partnership Required',
        description: `Opportunity requires partnership for: ${gaps.gaps.map(g => g.role).join(', ')}`,
        opportunityId,
        businessId: opportunity.businessId
      });
    }
    
    return {
      gapsIdentified: gaps.gaps.length,
      partnersFound: scoredPartners.length,
      topPartners: scoredPartners.slice(0, 3).map(p => ({
        name: p.name,
        score: p.score,
        isIndigenous: p.isIndigenous,
        benefits: p.benefits
      })),
      critical: gaps.critical
    };
  }
  
  /**
   * Calculate win probability using ML
   */
  static async calculateWinProbability(factors: any): Promise<number> {
    // Base probability by stage
    const stageProbabilities = {
      LEAD: 10,
      QUALIFYING: 20,
      QUALIFIED: 40,
      PROPOSAL: 60,
      NEGOTIATION: 80,
      CLOSED_WON: 100,
      CLOSED_LOST: 0,
      ABANDONED: 0
    };
    
    let probability = stageProbabilities[factors.stage as keyof typeof stageProbabilities] || 10;
    
    // Indigenous business advantages
    if (factors.isIndigenousBusiness) {
      if (factors.indigenousSetAside) {
        probability += 30; // Major advantage
      } else if (factors.indigenousPreference) {
        probability += 15; // Moderate advantage
      }
      
      if (factors.indigenousOwnership >= 51) {
        probability += 5; // Additional for majority ownership
      }
    }
    
    // Competition factors
    if (factors.competitorCount > 0) {
      probability -= Math.min(factors.competitorCount * 5, 25);
    }
    
    if (factors.indigenousCompetitors > 0 && factors.indigenousPreference) {
      probability -= factors.indigenousCompetitors * 3;
    }
    
    // Client relationship
    if (factors.source === 'EXISTING_CLIENT') {
      probability += 10;
    }
    
    // Value factors
    if (factors.value > 1000000) {
      probability -= 5; // Larger deals are harder
    } else if (factors.value < 100000) {
      probability += 5; // Smaller deals easier to win
    }
    
    // Capability match (would be from qualifications)
    if (factors.qualificationsMet) {
      probability += 10;
    }
    
    // Ensure within bounds
    probability = Math.max(0, Math.min(100, probability));
    
    return probability;
  }
  
  /**
   * Generate pipeline forecast
   */
  static async generateForecast(businessId: string, period: string) {
    const startDate = startOfQuarter(new Date());
    const endDate = endOfQuarter(new Date());
    
    // Get all active opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: {
        businessId,
        status: 'ACTIVE',
        expectedCloseDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Calculate forecast metrics
    const metrics = {
      totalOpportunities: opportunities.length,
      totalValue: opportunities.reduce((sum, o) => sum + o.value, 0),
      weightedValue: opportunities.reduce((sum, o) => sum + o.weightedValue, 0),
      expectedWins: opportunities.filter(o => o.probability >= 60).length,
      expectedRevenue: opportunities.reduce((sum, o) => sum + (o.value * o.probability / 100), 0)
    };
    
    // Stage breakdown
    const byStage = this.groupByStage(opportunities);
    
    // Category breakdown
    const byCategory = this.groupByCategory(opportunities);
    
    // Indigenous-specific metrics
    const indigenousMetrics = {
      setAsideValue: opportunities
        .filter(o => o.indigenousSetAside)
        .reduce((sum, o) => sum + o.value, 0),
      preferenceValue: opportunities
        .filter(o => o.indigenousPreference)
        .reduce((sum, o) => sum + o.value, 0),
      partnershipValue: opportunities
        .filter(o => o.partnershipDesired)
        .reduce((sum, o) => sum + o.value, 0)
    };
    
    // Calculate scenarios
    const scenarios = {
      bestCase: metrics.totalValue * 0.8,
      worstCase: metrics.weightedValue * 0.5,
      mostLikely: metrics.expectedRevenue
    };
    
    // Win rate calculations
    const historicalWinRate = await this.calculateHistoricalWinRate(businessId);
    
    // Create forecast
    const forecast = await prisma.pipelineForecast.create({
      data: {
        forecastPeriod: period,
        startDate,
        endDate,
        businessId,
        businessName: opportunities[0]?.businessName || 'Unknown',
        isIndigenousBusiness: opportunities[0]?.isIndigenousBusiness || false,
        ...metrics,
        ...scenarios,
        confidenceLevel: this.calculateForecastConfidence(opportunities),
        byStage,
        byCategory,
        byRegion: this.groupByRegion(opportunities),
        indigenousSetAsides: indigenousMetrics.setAsideValue,
        partnershipValue: indigenousMetrics.partnershipValue,
        averageDealSize: metrics.totalValue / metrics.totalOpportunities || 0,
        averageCycleTime: opportunities.reduce((sum, o) => sum + o.totalCycleDays, 0) / opportunities.length || 0,
        winRate: historicalWinRate.overall,
        indigenousWinRate: historicalWinRate.indigenous,
        topOpportunities: opportunities
          .sort((a, b) => b.weightedValue - a.weightedValue)
          .slice(0, 10)
          .map(o => ({ id: o.id, title: o.title, value: o.value, probability: o.probability })),
        riskFactors: this.identifyForecastRisks(opportunities),
        assumptions: [
          'Historical win rates remain consistent',
          'No major market disruptions',
          'Current team capacity maintained'
        ],
        createdBy: 'system'
      }
    });
    
    // Create forecast entries
    for (const opp of opportunities) {
      await prisma.forecastEntry.create({
        data: {
          forecastId: forecast.id,
          opportunityId: opp.id,
          forecastCategory: this.categorizeForecastEntry(opp),
          originalValue: opp.value,
          adjustedValue: opp.value,
          probability: opp.probability,
          weightedValue: opp.weightedValue,
          expectedCloseDate: opp.expectedCloseDate,
          confidenceLevel: opp.probability
        }
      });
    }
    
    return {
      forecastId: forecast.id,
      period,
      summary: {
        expectedRevenue: scenarios.mostLikely,
        bestCase: scenarios.bestCase,
        worstCase: scenarios.worstCase,
        opportunities: metrics.totalOpportunities,
        winRate: historicalWinRate.overall
      },
      indigenous: {
        setAsideValue: indigenousMetrics.setAsideValue,
        preferenceValue: indigenousMetrics.preferenceValue,
        winRate: historicalWinRate.indigenous
      },
      topOpportunities: forecast.topOpportunities
    };
  }
  
  /**
   * Track competitor intelligence
   */
  static async updateCompetitorIntelligence(data: {
    competitorName: string;
    isIndigenousBusiness: boolean;
    indigenousOwnership?: number;
    recentWin?: any;
    recentLoss?: any;
    strengths?: string[];
    weaknesses?: string[];
  }) {
    const existing = await prisma.competitorIntelligence.findFirst({
      where: { competitorName: data.competitorName }
    });
    
    if (existing) {
      // Update existing
      return prisma.competitorIntelligence.update({
        where: { id: existing.id },
        data: {
          ...data,
          recentWins: data.recentWin ? [...(existing.recentWins as any[] || []), data.recentWin] : existing.recentWins,
          recentLosses: data.recentLoss ? [...(existing.recentLosses as any[] || []), data.recentLoss] : existing.recentLosses,
          lastUpdated: new Date()
        }
      });
    } else {
      // Create new
      return prisma.competitorIntelligence.create({
        data: {
          competitorName: data.competitorName,
          competitorType: 'UNKNOWN',
          isIndigenousBusiness: data.isIndigenousBusiness,
          indigenousOwnership: data.indigenousOwnership,
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          recentWins: data.recentWin ? [data.recentWin] : [],
          recentLosses: data.recentLoss ? [data.recentLoss] : [],
          lastUpdated: new Date(),
          dataSource: 'User Input',
          reliability: 'MEDIUM'
        }
      });
    }
  }
  
  // Helper methods
  private static deriveIndustry(clientType: string): string {
    const industryMap: any = {
      GOVERNMENT_FEDERAL: 'Government',
      GOVERNMENT_PROVINCIAL: 'Government',
      GOVERNMENT_MUNICIPAL: 'Government',
      CROWN_CORPORATION: 'Public Sector',
      PRIVATE_LARGE: 'Private Sector',
      PRIVATE_MEDIUM: 'Private Sector',
      PRIVATE_SMALL: 'Private Sector',
      NON_PROFIT: 'Non-Profit',
      INDIGENOUS_GOVERNMENT: 'Indigenous Government',
      INDIGENOUS_BUSINESS: 'Indigenous Business'
    };
    return industryMap[clientType] || 'Other';
  }
  
  private static deriveRegion(location: string): string {
    // Simple region mapping - would be more sophisticated in production
    const provinces = {
      'British Columbia': 'West',
      'Alberta': 'West',
      'Saskatchewan': 'Prairies',
      'Manitoba': 'Prairies',
      'Ontario': 'Central',
      'Quebec': 'Quebec',
      'New Brunswick': 'Atlantic',
      'Nova Scotia': 'Atlantic',
      'Prince Edward Island': 'Atlantic',
      'Newfoundland': 'Atlantic',
      'Yukon': 'North',
      'Northwest Territories': 'North',
      'Nunavut': 'North'
    };
    
    for (const [province, region] of Object.entries(provinces)) {
      if (location.includes(province)) {
        return region;
      }
    }
    return 'National';
  }
  
  private static async identifyTerritory(location: string): Promise<string | null> {
    // Would integrate with territory mapping service
    return null;
  }
  
  private static determinePriority(value: number, isSetAside?: boolean): OpportunityPriority {
    if (isSetAside) return 'CRITICAL';
    if (value > 1000000) return 'HIGH';
    if (value > 250000) return 'MEDIUM';
    return 'LOW';
  }
  
  private static async logActivity(data: any) {
    return prisma.opportunityActivity.create({
      data: {
        ...data,
        activityDate: new Date()
      }
    });
  }
  
  private static async createOpportunityAlert(data: any) {
    return prisma.opportunityAlert.create({
      data: {
        ...data,
        status: 'PENDING',
        createdAt: new Date()
      }
    });
  }
  
  private static async recordWinLoss(opportunityId: string, outcome: 'WON' | 'LOST') {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });
    
    if (!opportunity) return;
    
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { outcome: outcome as any }
    });
    
    // Trigger win/loss analysis
    eventEmitter.emit('opportunity:closed', {
      opportunityId,
      outcome,
      value: opportunity.value,
      isIndigenous: opportunity.isIndigenousBusiness
    });
  }
  
  private static async analyzeOpportunity(opportunity: any): Promise<any> {
    const qualificationsMet = opportunity.qualifications?.filter((q: any) => q.currentStatus === 'MET').length || 0;
    const totalQualifications = opportunity.qualifications?.length || 1;
    
    return {
      confidence: 75,
      marketPosition: 'STRONG',
      capabilities: {
        match: qualificationsMet / totalQualifications,
        gaps: []
      },
      competition: {
        level: opportunity.competitorCount > 5 ? 'HIGH' : opportunity.competitorCount > 2 ? 'MEDIUM' : 'LOW',
        indigenous: opportunity.indigenousCompetitors
      },
      profitability: {
        estimated: 0.15,
        risk: 'MEDIUM'
      },
      strengths: [
        opportunity.isIndigenousBusiness && opportunity.indigenousPreference ? 'Indigenous preference advantage' : null,
        opportunity.source === 'EXISTING_CLIENT' ? 'Existing client relationship' : null,
        opportunity.competitorCount < 3 ? 'Limited competition' : null
      ].filter(Boolean),
      weaknesses: [
        opportunity.requiresBonding && opportunity.bondingAmount > 500000 ? 'High bonding requirement' : null,
        opportunity.competitorCount > 5 ? 'High competition' : null
      ].filter(Boolean),
      competitivePosition: 'FAVORABLE',
      needsPartnership: opportunity.requiresBonding && opportunity.bondingAmount > 1000000
    };
  }
  
  private static calculateGoNoGoScore(analysis: any): number {
    let score = 50; // Base score
    
    // Positive factors
    if (analysis.marketPosition === 'STRONG') score += 20;
    if (analysis.capabilities.match > 0.8) score += 15;
    if (analysis.competition.level === 'LOW') score += 15;
    if (analysis.profitability.estimated > 0.15) score += 10;
    
    // Negative factors
    if (analysis.competition.level === 'HIGH') score -= 15;
    if (analysis.capabilities.match < 0.5) score -= 20;
    if (analysis.profitability.risk === 'HIGH') score -= 10;
    
    // Indigenous advantages
    if (analysis.strengths.includes('Indigenous preference advantage')) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private static async generatePricingStrategy(opportunity: any, analysis: any) {
    const baseMargin = 0.15;
    let adjustedMargin = baseMargin;
    
    // Adjust for competition
    if (analysis.competition.level === 'HIGH') {
      adjustedMargin -= 0.03;
    } else if (analysis.competition.level === 'LOW') {
      adjustedMargin += 0.05;
    }
    
    // Indigenous advantage allows for better margin
    if (opportunity.indigenousPreference && opportunity.isIndigenousBusiness) {
      adjustedMargin += 0.02;
    }
    
    const price = opportunity.value * (1 + adjustedMargin);
    const minimum = opportunity.value * 1.05; // 5% minimum margin
    const walkAway = opportunity.value * 1.02; // 2% absolute minimum
    
    return {
      strategy: analysis.competition.level === 'HIGH' ? 'COMPETITIVE' : 'VALUE',
      margin: adjustedMargin,
      price,
      minimum,
      walkAway
    };
  }
  
  private static assessRisks(opportunity: any, analysis: any) {
    const risks = [];
    const mitigations = [];
    
    if (opportunity.requiresBonding) {
      risks.push('Bonding requirement');
      mitigations.push('Secure bonding pre-approval');
    }
    
    if (analysis.competition.level === 'HIGH') {
      risks.push('High competition');
      mitigations.push('Emphasize differentiators');
    }
    
    if (opportunity.contractDuration > 365) {
      risks.push('Long project duration');
      mitigations.push('Include escalation clauses');
    }
    
    return { risks, mitigations };
  }
  
  private static generateWinStrategy(opportunity: any, analysis: any): string[] {
    const strategies = [];
    
    if (opportunity.indigenousPreference && opportunity.isIndigenousBusiness) {
      strategies.push('Leverage Indigenous business status');
    }
    
    if (opportunity.source === 'EXISTING_CLIENT') {
      strategies.push('Emphasize past performance');
    }
    
    if (analysis.competition.level === 'HIGH') {
      strategies.push('Differentiate on value not price');
    }
    
    strategies.push('Submit early to show commitment');
    strategies.push('Include strong references');
    
    return strategies;
  }
  
  private static async identifyCapabilityGaps(opportunity: any) {
    const gaps = [];
    let critical = false;
    
    if (opportunity.requiresBonding && opportunity.bondingAmount > 1000000) {
      gaps.push({
        role: 'Bonding Partner',
        description: 'Partner with bonding capacity',
        suggestedType: 'JOINT_VENTURE',
        capabilities: ['Financial strength', 'Bonding capacity'],
        estimatedShare: 20,
        experience: '5+ years',
        certifications: []
      });
      critical = true;
    }
    
    if (opportunity.requiresCertification?.length > 0) {
      gaps.push({
        role: 'Technical Partner',
        description: 'Partner with required certifications',
        suggestedType: 'PRIME_SUB',
        capabilities: opportunity.requiresCertification,
        estimatedShare: 30,
        experience: '3+ years',
        certifications: opportunity.requiresCertification
      });
    }
    
    return {
      gaps,
      required: gaps.flatMap(g => g.capabilities),
      critical
    };
  }
  
  private static async findPotentialPartners(criteria: any) {
    // Would query partner database
    return [
      {
        id: 'partner1',
        name: 'Indigenous Construction Partners',
        isIndigenous: true,
        capabilities: criteria.capabilities,
        location: criteria.location,
        experience: '10+ years'
      }
    ];
  }
  
  private static scorePartnerMatch(partner: any, opportunity: any, gaps: any): number {
    let score = 50;
    
    if (partner.isIndigenous && opportunity.indigenousPreference) {
      score += 20;
    }
    
    if (partner.location === opportunity.location) {
      score += 10;
    }
    
    // Capability match
    const matchedCapabilities = gaps.required.filter((cap: string) => 
      partner.capabilities?.includes(cap)
    ).length;
    score += (matchedCapabilities / gaps.required.length) * 20;
    
    return score;
  }
  
  private static assessPartnershipBenefits(partner: any, opportunity: any): string[] {
    const benefits = [];
    
    if (partner.isIndigenous && opportunity.indigenousPreference) {
      benefits.push('Strengthens Indigenous participation');
    }
    
    benefits.push('Increases capacity');
    benefits.push('Shares risk');
    
    return benefits;
  }
  
  private static groupByStage(opportunities: any[]) {
    const grouped: any = {};
    for (const stage of ['LEAD', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION']) {
      const stageOpps = opportunities.filter(o => o.stage === stage);
      grouped[stage] = {
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + o.value, 0),
        weightedValue: stageOpps.reduce((sum, o) => sum + o.weightedValue, 0)
      };
    }
    return grouped;
  }
  
  private static groupByCategory(opportunities: any[]) {
    const grouped: any = {};
    for (const opp of opportunities) {
      if (!grouped[opp.category]) {
        grouped[opp.category] = { count: 0, value: 0 };
      }
      grouped[opp.category].count++;
      grouped[opp.category].value += opp.value;
    }
    return grouped;
  }
  
  private static groupByRegion(opportunities: any[]) {
    const grouped: any = {};
    for (const opp of opportunities) {
      if (!grouped[opp.region]) {
        grouped[opp.region] = { count: 0, value: 0 };
      }
      grouped[opp.region].count++;
      grouped[opp.region].value += opp.value;
    }
    return grouped;
  }
  
  private static calculateForecastConfidence(opportunities: any[]): number {
    const avgProbability = opportunities.reduce((sum, o) => sum + o.probability, 0) / opportunities.length;
    const dataQuality = opportunities.filter(o => o.qualifications?.length > 0).length / opportunities.length;
    return (avgProbability + dataQuality * 100) / 2;
  }
  
  private static async calculateHistoricalWinRate(businessId: string) {
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);
    
    const closed = await prisma.opportunity.findMany({
      where: {
        businessId,
        actualCloseDate: { gte: last90Days },
        outcome: { in: ['WON', 'LOST'] }
      }
    });
    
    const won = closed.filter(o => o.outcome === 'WON');
    const indigenousWon = won.filter(o => o.indigenousPreference || o.indigenousSetAside);
    
    return {
      overall: closed.length > 0 ? (won.length / closed.length) * 100 : 25,
      indigenous: indigenousWon.length > 0 ? (indigenousWon.length / won.length) * 100 : 40
    };
  }
  
  private static identifyForecastRisks(opportunities: any[]): string[] {
    const risks = [];
    
    const avgProbability = opportunities.reduce((sum, o) => sum + o.probability, 0) / opportunities.length;
    if (avgProbability < 40) {
      risks.push('Low average win probability');
    }
    
    const stalledCount = opportunities.filter(o => o.daysInStage > 30).length;
    if (stalledCount > opportunities.length * 0.3) {
      risks.push('Many opportunities stalled');
    }
    
    const highValueCount = opportunities.filter(o => o.value > 1000000).length;
    if (highValueCount > opportunities.length * 0.5) {
      risks.push('Concentration in high-value deals');
    }
    
    return risks;
  }
  
  private static categorizeForecastEntry(opportunity: any): any {
    if (opportunity.probability >= 75) return 'COMMITTED';
    if (opportunity.probability >= 50) return 'BEST_CASE';
    if (opportunity.probability >= 25) return 'PIPELINE';
    return 'UPSIDE';
  }
}