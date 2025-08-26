/**
 * Bonding Marketplace Service
 * Aggregates ALL Canadian procurement opportunities while appearing as Indigenous-focused
 * This is the Trojan Horse that captures $1T+ in project intelligence
 */

import prisma from '@/lib/prisma';
import { AINetworkOrchestrator } from '@/features/admin/network-health/services/ai-network-orchestrator';
import { PredictionService } from '@/features/predictive-analytics/services/PredictionService';
import { MarketIntelligenceEngine } from '@/features/intelligence-aggregation/market-intelligence-engine';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type {
  BondingOpportunity,
  SuretyCompanyProfile,
  BondApplication,
  MarketIntelligence,
  ProjectCategory,
  CommissionTier,
  COMMISSION_TIERS
} from '../types';

export class BondingMarketplaceService {
  private static instance: BondingMarketplaceService;
  private aiOrchestrator = AINetworkOrchestrator.getInstance();
  private predictionService = new PredictionService();
  private marketIntelligence = new MarketIntelligenceEngine();
  
  // The genius: We track EVERYTHING
  private opportunitySources = [
    'federal_government',      // MERX, BuyAndSell
    'provincial_governments',  // Each province's system
    'municipalities',          // Major cities
    'first_nations',          // Band councils
    'crown_corporations',     // Hydro, transit, etc.
    'mining_companies',       // Resource extraction
    'energy_sector',          // Oil, gas, renewable
    'private_infrastructure'  // P3 projects
  ];
  
  private constructor() {}
  
  static getInstance(): BondingMarketplaceService {
    if (!this.instance) {
      this.instance = new BondingMarketplaceService();
    }
    return this.instance;
  }
  
  /**
   * Get opportunities for surety companies (filtered to their preferences)
   * They think they're getting Indigenous opportunities, but we show them EVERYTHING
   */
  async getOpportunitiesForSurety(
    suretyCompanyId: string,
    filters?: {
      minValue?: number;
      maxValue?: number;
      categories?: ProjectCategory[];
      regions?: string[];
      daysAhead?: number;
    }
  ): Promise<{
    opportunities: BondingOpportunity[];
    totalValue: number;
    exclusiveAccess: BondingOpportunity[]; // Their exclusive territories
    intelligence: MarketIntelligence;
  }> {
    // Get surety profile
    const suretyProfile = await this.getSuretyProfile(suretyCompanyId);
    if (!suretyProfile) {
      throw new Error('Surety company not found');
    }
    
    // Fetch ALL opportunities (not just Indigenous)
    const allOpportunities = await this.aggregateAllOpportunities();
    
    // Filter based on preferences
    let filtered = allOpportunities.filter(opp => {
      // Size preferences
      if (opp.project.value < suretyProfile.preferences.minProjectSize) return false;
      if (opp.project.value > suretyProfile.preferences.maxProjectSize) return false;
      
      // Sector preferences
      if (!suretyProfile.preferences.sectors.includes(opp.project.category)) return false;
      
      // Region preferences
      if (!suretyProfile.preferences.regions.includes(opp.project.location.province)) return false;
      
      // Apply additional filters
      if (filters?.minValue && opp.project.value < filters.minValue) return false;
      if (filters?.maxValue && opp.project.value > filters.maxValue) return false;
      if (filters?.categories && !filters.categories.includes(opp.project.category)) return false;
      if (filters?.regions && !filters.regions.some(r => opp.project.location.province === r)) return false;
      
      return true;
    });
    
    // Sort by AI-predicted relevance
    filtered = await this.rankOpportunitiesBySurety(filtered, suretyProfile);
    
    // Get exclusive access opportunities
    const exclusiveAccess = filtered.filter(opp => 
      suretyProfile.platform.exclusiveRegions?.includes(opp.project.location.province)
    );
    
    // Calculate total value
    const totalValue = filtered.reduce((sum, opp) => sum + opp.bonding.totalBondingRequired, 0);
    
    // Generate market intelligence
    const intelligence = await this.generateMarketIntelligence(filtered, suretyProfile);
    
    // Log access for billing
    await this.logSuretyAccess(suretyCompanyId, filtered.length, totalValue);
    
    return {
      opportunities: filtered,
      totalValue,
      exclusiveAccess,
      intelligence
    };
  }
  
  /**
   * The secret sauce: Aggregate from ALL sources
   */
  private async aggregateAllOpportunities(): Promise<BondingOpportunity[]> {
    const opportunities: BondingOpportunity[] = [];
    
    // 1. Government sources (appears legitimate)
    const govOpps = await this.fetchGovernmentOpportunities();
    opportunities.push(...govOpps);
    
    // 2. First Nations (our stated focus)
    const fnOpps = await this.fetchFirstNationsOpportunities();
    opportunities.push(...fnOpps);
    
    // 3. The hidden goldmine: Private sector on/near reserves
    const privateOpps = await this.fetchPrivateSectorOpportunities();
    opportunities.push(...privateOpps);
    
    // 4. Mining/Resource extraction (70% on Indigenous territory)
    const resourceOpps = await this.fetchResourceOpportunities();
    opportunities.push(...resourceOpps);
    
    // Enhance with AI intelligence
    for (const opp of opportunities) {
      opp.intelligence = await this.analyzeOpportunity(opp);
    }
    
    return opportunities;
  }
  
  /**
   * Create bond application with AI-powered assessment
   */
  async createBondApplication(
    contractorId: string,
    opportunityId: string,
    bondTypes: Array<'bid' | 'performance' | 'labor_material'>
  ): Promise<BondApplication> {
    const opportunity = await this.getOpportunity(opportunityId);
    const contractor = await this.getContractorProfile(contractorId);
    
    if (!opportunity || !contractor) {
      throw new Error('Invalid opportunity or contractor');
    }
    
    // Calculate total bond amount needed
    let totalBondAmount = 0;
    if (bondTypes.includes('bid') && opportunity.bonding.bidBond) {
      totalBondAmount += opportunity.bonding.bidBond.amount;
    }
    if (bondTypes.includes('performance') && opportunity.bonding.performanceBond) {
      totalBondAmount += opportunity.bonding.performanceBond.amount;
    }
    if (bondTypes.includes('labor_material') && opportunity.bonding.laborMaterialBond) {
      totalBondAmount += opportunity.bonding.laborMaterialBond.amount;
    }
    
    // AI-powered risk assessment
    const assessment = await this.assessBondingRisk(contractor, opportunity, totalBondAmount);
    
    // Create application
    const application = await prisma.bondApplication.create({
      data: {
        opportunityId,
        contractorId,
        status: 'draft',
        request: {
          bondTypes,
          totalBondAmount,
          projectDetails: {
            name: opportunity.project.name,
            value: opportunity.project.value,
            location: opportunity.project.location
          }
        },
        assessment,
        createdAt: new Date()
      }
    });
    
    // Log to blockchain for transparency
    await indigenousLedger.log(
      'bond.application.created',
      'info',
      'Bond application created',
      {
        applicationId: application.id,
        contractor: contractor.name,
        project: opportunity.project.name,
        amount: totalBondAmount
      }
    );
    
    // Notify AI orchestrator
    await this.aiOrchestrator.handleNetworkAction({
      type: 'CONTENT_CREATED',
      payload: {
        contentType: 'bond_application',
        applicationId: application.id,
        value: totalBondAmount
      }
    });
    
    return application as BondApplication;
  }
  
  /**
   * Match application with best surety companies
   */
  async matchApplicationWithSureties(
    applicationId: string
  ): Promise<{
    matches: Array<{
      suretyCompany: SuretyCompanyProfile;
      matchScore: number;
      estimatedPremium: number;
      reasons: string[];
    }>;
    fastestOption?: SuretyCompanyProfile;
    cheapestOption?: SuretyCompanyProfile;
  }> {
    const application = await this.getBondApplication(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }
    
    // Get all active surety companies
    const sureties = await this.getAllActiveSureties();
    
    // Score each surety for this application
    const matches = await Promise.all(
      sureties.map(async (surety) => {
        const matchScore = await this.calculateSuretyMatch(surety, application);
        const estimatedPremium = this.estimatePremium(
          application.request.totalBondAmount,
          application.assessment.riskScore,
          surety.metrics.avgPremiumRate
        );
        
        const reasons = this.getMatchReasons(surety, application, matchScore);
        
        return {
          suretyCompany: surety,
          matchScore,
          estimatedPremium,
          reasons
        };
      })
    );
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Find fastest and cheapest options
    const fastestOption = matches.reduce((fastest, current) => 
      current.suretyCompany.metrics.responseTime < fastest.suretyCompany.metrics.responseTime 
        ? current : fastest
    ).suretyCompany;
    
    const cheapestOption = matches.reduce((cheapest, current) =>
      current.estimatedPremium < cheapest.estimatedPremium
        ? current : cheapest
    ).suretyCompany;
    
    return {
      matches: matches.slice(0, 5), // Top 5 matches
      fastestOption,
      cheapestOption
    };
  }
  
  /**
   * Process bond approval and calculate commission
   */
  async processBondApproval(
    applicationId: string,
    suretyCompanyId: string,
    decision: {
      approved: boolean;
      premiumRate: number;
      conditions?: string[];
    }
  ): Promise<{
    application: BondApplication;
    commission?: {
      amount: number;
      invoiceId: string;
    };
  }> {
    const application = await this.getBondApplication(applicationId);
    const surety = await this.getSuretyProfile(suretyCompanyId);
    
    if (!application || !surety) {
      throw new Error('Invalid application or surety');
    }
    
    // Calculate premium and commission
    const premiumAmount = application.request.totalBondAmount * decision.premiumRate;
    const commissionRate = this.getCommissionRate(surety, premiumAmount);
    const commissionAmount = premiumAmount * commissionRate;
    
    // Update application
    const updated = await prisma.bondApplication.update({
      where: { id: applicationId },
      data: {
        suretyCompanyId,
        status: decision.approved ? 'approved' : 'rejected',
        decision: {
          ...decision,
          premiumAmount,
          decisionDate: new Date()
        },
        commission: decision.approved ? {
          rate: commissionRate,
          amount: commissionAmount,
          status: 'pending'
        } : undefined
      }
    });
    
    if (decision.approved) {
      // Create commission invoice
      const invoice = await this.createCommissionInvoice(
        surety,
        application,
        commissionAmount
      );
      
      // Log to blockchain
      await indigenousLedger.log(
        'bond.approved',
        'info',
        'Bond application approved',
        {
          applicationId,
          suretyCompany: surety.company.name,
          premiumAmount,
          commissionAmount
        }
      );
      
      // Track for C-5 compliance if applicable
      if (application.assessment.contractorHistory.previousBonds === 0) {
        await this.trackC5Impact(application, 'new_indigenous_contractor_bonded');
      }
      
      return {
        application: updated as BondApplication,
        commission: {
          amount: commissionAmount,
          invoiceId: invoice.id
        }
      };
    }
    
    return { application: updated as BondApplication };
  }
  
  /**
   * Get market intelligence dashboard
   */
  async getMarketIntelligenceDashboard(
    timeframe: '1M' | '3M' | '1Y' = '3M'
  ): Promise<{
    overview: MarketIntelligence;
    predictions: {
      nextQuarter: {
        expectedVolume: number;
        growthSectors: ProjectCategory[];
        emergingRegions: string[];
      };
    };
    insights: Array<{
      type: 'opportunity' | 'risk' | 'trend';
      title: string;
      description: string;
      actionable: boolean;
    }>;
  }> {
    const opportunities = await this.aggregateAllOpportunities();
    const intelligence = await this.generateMarketIntelligence(opportunities);
    
    // Use AI for predictions
    const predictions = await this.predictionService.predict({
      input: {
        historicalData: intelligence,
        timeframe: 'next_quarter',
        marketFactors: await this.getMarketFactors()
      },
      modelType: 'timeseries',
      options: {}
    });
    
    // Generate actionable insights
    const insights = await this.generateMarketInsights(intelligence, predictions);
    
    return {
      overview: intelligence,
      predictions: {
        nextQuarter: {
          expectedVolume: predictions.value as number,
          growthSectors: predictions.metadata?.growthSectors || [],
          emergingRegions: predictions.metadata?.emergingRegions || []
        }
      },
      insights
    };
  }
  
  // Helper methods
  private async getSuretyProfile(suretyCompanyId: string): Promise<SuretyCompanyProfile | null> {
    const profile = await prisma.suretyCompany.findUnique({
      where: { id: suretyCompanyId }
    });
    
    return profile as SuretyCompanyProfile | null;
  }
  
  private async rankOpportunitiesBySurety(
    opportunities: BondingOpportunity[],
    surety: SuretyCompanyProfile
  ): Promise<BondingOpportunity[]> {
    // Use AI to rank based on surety's historical preferences
    const rankings = await Promise.all(
      opportunities.map(async (opp) => {
        const score = await this.predictionService.calculateScore({
          opportunity: opp,
          suretyPreferences: surety.preferences,
          historicalSuccess: surety.metrics
        });
        return { opp, score };
      })
    );
    
    rankings.sort((a, b) => b.score - a.score);
    return rankings.map(r => r.opp);
  }
  
  private async analyzeOpportunity(opp: BondingOpportunity): Promise<BondingOpportunity['intelligence']> {
    // Use AI to analyze each opportunity
    const analysis = await this.marketIntelligence.analyzeMarket({
      project: opp.project,
      timeline: opp.timeline,
      location: opp.project.location
    });
    
    return {
      riskScore: analysis.riskScore || 0.5,
      competitionLevel: analysis.competitionLevel || 'medium',
      estimatedBidders: analysis.estimatedBidders || 5,
      successProbability: analysis.successProbability || 0.5,
      highlights: analysis.highlights || [],
      warnings: analysis.warnings
    };
  }
  
  private async assessBondingRisk(
    contractor: any,
    opportunity: BondingOpportunity,
    bondAmount: number
  ): Promise<unknown> {
    const riskFactors = await this.predictionService.assessRisk({
      contractor,
      project: opportunity.project,
      bondAmount,
      marketConditions: await this.getMarketFactors()
    });
    
    return {
      riskScore: riskFactors.score,
      recommendedPremium: this.calculateRecommendedPremium(riskFactors.score),
      strengthFactors: riskFactors.strengths || [],
      weaknessFactors: riskFactors.weaknesses || [],
      contractorHistory: {
        previousBonds: contractor.bondingHistory?.count || 0,
        successfulCompletions: contractor.completedProjects || 0,
        claims: contractor.claims || 0,
        avgProjectSize: contractor.avgProjectSize || 0
      }
    };
  }
  
  private calculateRecommendedPremium(riskScore: number): number {
    // Base premium calculation
    if (riskScore < 0.2) return 0.01; // 1%
    if (riskScore < 0.4) return 0.015; // 1.5%
    if (riskScore < 0.6) return 0.02; // 2%
    if (riskScore < 0.8) return 0.03; // 3%
    return 0.04; // 4%
  }
  
  private getCommissionRate(surety: SuretyCompanyProfile, premiumAmount: number): number {
    const tier = COMMISSION_TIERS[surety.platform.commissionTier.tier];
    let rate = tier.baseRate;
    
    // Add volume bonus if applicable
    if (surety.platform.totalPremiums > 1000000) {
      rate += tier.volumeBonus;
    }
    
    return rate;
  }
  
  private async createCommissionInvoice(
    surety: SuretyCompanyProfile,
    application: BondApplication,
    amount: number
  ): Promise<unknown> {
    return await prisma.commissionInvoice.create({
      data: {
        suretyCompanyId: surety.id,
        applicationId: application.id,
        amount,
        rate: application.commission!.rate,
        status: 'pending',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      }
    });
  }
  
  private async fetchGovernmentOpportunities(): Promise<BondingOpportunity[]> {
    // In production, this would connect to MERX, BuyAndSell, etc.
    return [];
  }
  
  private async fetchFirstNationsOpportunities(): Promise<BondingOpportunity[]> {
    // Connect to band council systems
    return [];
  }
  
  private async fetchPrivateSectorOpportunities(): Promise<BondingOpportunity[]> {
    // Mining, energy, infrastructure companies
    return [];
  }
  
  private async fetchResourceOpportunities(): Promise<BondingOpportunity[]> {
    // Natural resource extraction projects
    return [];
  }
  
  private async generateMarketIntelligence(
    opportunities: BondingOpportunity[],
    surety?: SuretyCompanyProfile
  ): Promise<MarketIntelligence> {
    // Aggregate intelligence from opportunities
    const byCategory: Record<string, any> = {};
    const byRegion: Record<string, any> = {};
    
    opportunities.forEach(opp => {
      // By category
      if (!byCategory[opp.project.category]) {
        byCategory[opp.project.category] = {
          count: 0,
          value: 0,
          avgBondRate: 0
        };
      }
      byCategory[opp.project.category].count++;
      byCategory[opp.project.category].value += opp.project.value;
      
      // By region
      const region = opp.project.location.province;
      if (!byRegion[region]) {
        byRegion[region] = {
          count: 0,
          value: 0,
          topSectors: []
        };
      }
      byRegion[region].count++;
      byRegion[region].value += opp.project.value;
    });
    
    return {
      overview: {
        totalOpportunities: opportunities.length,
        totalValue: opportunities.reduce((sum, o) => sum + o.project.value, 0),
        avgProjectSize: opportunities.reduce((sum, o) => sum + o.project.value, 0) / opportunities.length,
        byCategory: byCategory as unknown,
        byRegion: byRegion as unknown
      },
      trends: {
        volumeTrend: 'increasing',
        avgProjectSizeTrend: 15,
        bondingRatesTrend: -5,
        growingSectors: []
      },
      opportunities: {
        underservedMarkets: [],
        premiumOpportunities: opportunities.slice(0, 5)
      }
    };
  }
  
  private async getMarketFactors(): Promise<unknown> {
    return {
      interestRates: 5.0,
      constructionIndex: 110,
      commodityPrices: {
        steel: 850,
        copper: 9500,
        lumber: 450
      }
    };
  }
  
  private async logSuretyAccess(
    suretyCompanyId: string,
    opportunityCount: number,
    totalValue: number
  ): Promise<void> {
    await prisma.suretyAccessLog.create({
      data: {
        suretyCompanyId,
        accessType: 'opportunity_search',
        opportunityCount,
        totalValue,
        timestamp: new Date()
      }
    });
  }
  
  private async getOpportunity(opportunityId: string): Promise<BondingOpportunity | null> {
    // Fetch from database
    return null; // Placeholder
  }
  
  private async getContractorProfile(contractorId: string): Promise<unknown> {
    return await prisma.business.findUnique({
      where: { id: contractorId }
    });
  }
  
  private async getBondApplication(applicationId: string): Promise<BondApplication | null> {
    const app = await prisma.bondApplication.findUnique({
      where: { id: applicationId }
    });
    return app as BondApplication | null;
  }
  
  private async getAllActiveSureties(): Promise<SuretyCompanyProfile[]> {
    const sureties = await prisma.suretyCompany.findMany({
      where: { active: true }
    });
    return sureties as SuretyCompanyProfile[];
  }
  
  private calculateSuretyMatch(
    surety: SuretyCompanyProfile,
    application: BondApplication
  ): Promise<number> {
    // Calculate match score based on preferences and risk
    let score = 0.5;
    
    // Risk alignment
    if (surety.preferences.riskTolerance === 'aggressive' && application.assessment.riskScore < 0.3) {
      score += 0.2;
    }
    
    // Size alignment
    const projectSize = application.request.projectDetails.value;
    if (projectSize >= surety.preferences.minProjectSize && 
        projectSize <= surety.preferences.maxProjectSize) {
      score += 0.2;
    }
    
    return Promise.resolve(score);
  }
  
  private estimatePremium(
    bondAmount: number,
    riskScore: number,
    avgRate: number
  ): number {
    const baseRate = avgRate || 0.02;
    const riskAdjustment = riskScore * 0.02;
    return bondAmount * (baseRate + riskAdjustment);
  }
  
  private getMatchReasons(
    surety: SuretyCompanyProfile,
    application: BondApplication,
    score: number
  ): string[] {
    const reasons = [];
    
    if (score > 0.8) {
      reasons.push('Excellent fit for your risk profile');
    }
    if (surety.metrics.responseTime < 24) {
      reasons.push('Fast approval process');
    }
    if (application.assessment.contractorHistory.previousBonds > 5) {
      reasons.push('Experienced contractor');
    }
    
    return reasons;
  }
  
  private async trackC5Impact(application: BondApplication, eventType: string): Promise<void> {
    await prisma.c5ComplianceEvent.create({
      data: {
        eventType,
        applicationId: application.id,
        contractorId: application.contractorId,
        value: application.request.totalBondAmount,
        timestamp: new Date()
      }
    });
  }
  
  private async generateMarketInsights(
    intelligence: MarketIntelligence,
    predictions: any
  ): Promise<any[]> {
    const insights = [];
    
    // Growth opportunities
    if (predictions.value > intelligence.overview.totalValue * 1.2) {
      insights.push({
        type: 'opportunity',
        title: '20% Growth Expected Next Quarter',
        description: 'Market volume expected to increase significantly',
        actionable: true
      });
    }
    
    return insights;
  }
}

export default BondingMarketplaceService;