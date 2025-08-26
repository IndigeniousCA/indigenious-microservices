/**
 * Business Prioritization System
 * Scores and ranks businesses based on multiple factors for optimal targeting
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { OpenAI } from 'openai';
import { createLogger } from '../core/utils/logger';
import {
  DiscoveredBusiness,
  EnrichedBusiness,
  BusinessType,
  ProcurementReadiness,
  FinancialInfo,
  IndigenousDetails
} from '../types';
import {
  BusinessPriorityScore,
  PriorityTier,
  DataQualityScore,
  DataQualityRecommendation,
  GeographicIntelligence,
  BusinessRelationship,
  RelationshipType
} from '../types/enhanced-types';

export interface PrioritizationCriteria {
  revenueWeight: number;
  procurementWeight: number;
  partnershipWeight: number;
  dataQualityWeight: number;
  geographicWeight: number;
  industryWeight: number;
  indigenousWeight: number;
  relationshipWeight: number;
}

export interface IndustryPriorities {
  highPriority: string[];
  mediumPriority: string[];
  lowPriority: string[];
  excluded: string[];
}

export interface GeographicPriorities {
  primaryMarkets: string[]; // provinces/territories
  secondaryMarkets: string[];
  urbanCenters: string[];
  remoteBonus: boolean;
}

export class PrioritizationEngine extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly openai: OpenAI;
  private readonly criteria: PrioritizationCriteria;
  private readonly industryPriorities: IndustryPriorities;
  private readonly geographicPriorities: GeographicPriorities;
  
  // Scoring thresholds
  private readonly tierThresholds = {
    platinum: 90,
    gold: 75,
    silver: 60,
    bronze: 40
  };

  constructor(redis: Redis, criteria?: Partial<PrioritizationCriteria>) {
    super();
    this.logger = createLogger('prioritization-engine');
    this.redis = redis;
    
    // Initialize OpenAI for advanced scoring
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Default criteria weights (must sum to 1.0)
    this.criteria = {
      revenueWeight: 0.25,
      procurementWeight: 0.20,
      partnershipWeight: 0.15,
      dataQualityWeight: 0.10,
      geographicWeight: 0.10,
      industryWeight: 0.10,
      indigenousWeight: 0.05,
      relationshipWeight: 0.05,
      ...criteria
    };

    // Industry priorities for government procurement
    this.industryPriorities = {
      highPriority: [
        'construction',
        'professional services',
        'it services',
        'consulting',
        'engineering',
        'architecture',
        'environmental services',
        'security services',
        'facilities management',
        'transportation'
      ],
      mediumPriority: [
        'manufacturing',
        'wholesale trade',
        'equipment rental',
        'training services',
        'marketing',
        'communications',
        'legal services',
        'financial services'
      ],
      lowPriority: [
        'retail',
        'hospitality',
        'food services',
        'personal services',
        'entertainment'
      ],
      excluded: [
        'gambling',
        'adult entertainment',
        'tobacco',
        'cannabis' // unless specifically for government cannabis contracts
      ]
    };

    // Geographic priorities
    this.geographicPriorities = {
      primaryMarkets: ['ON', 'QC', 'BC', 'AB'], // Major procurement markets
      secondaryMarkets: ['MB', 'SK', 'NS', 'NB'],
      urbanCenters: [
        'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton',
        'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax'
      ],
      remoteBonus: true // Bonus for businesses in remote/northern communities
    };

    this.validateWeights();
  }

  /**
   * Calculate priority score for a single business
   */
  async calculatePriorityScore(
    business: DiscoveredBusiness | EnrichedBusiness
  ): Promise<BusinessPriorityScore> {
    const startTime = Date.now();
    
    this.logger.debug(`Calculating priority score for ${business.name}`);

    // Calculate component scores
    const revenueScore = await this.calculateRevenueScore(business);
    const procurementScore = await this.calculateProcurementScore(business);
    const partnershipScore = await this.calculatePartnershipScore(business);
    const dataQualityScore = await this.calculateDataQualityScore(business);
    const geographicScore = await this.calculateGeographicScore(business);
    const industryScore = await this.calculateIndustryScore(business);
    const indigenousScore = await this.calculateIndigenousScore(business);
    const relationshipScore = await this.calculateRelationshipScore(business);

    // Calculate weighted overall score
    const overallScore = 
      (revenueScore * this.criteria.revenueWeight) +
      (procurementScore * this.criteria.procurementWeight) +
      (partnershipScore * this.criteria.partnershipWeight) +
      (dataQualityScore.overallScore * this.criteria.dataQualityWeight) +
      (geographicScore * this.criteria.geographicWeight) +
      (industryScore * this.criteria.industryWeight) +
      (indigenousScore * this.criteria.indigenousWeight) +
      (relationshipScore * this.criteria.relationshipWeight);

    // Determine tier
    const tier = this.determineTier(overallScore);

    // Generate recommendations
    const recommendedActions = await this.generateRecommendations(
      business,
      {
        revenueScore,
        procurementScore,
        partnershipScore,
        dataQualityScore: dataQualityScore.overallScore,
        geographicScore,
        industryScore,
        indigenousScore,
        relationshipScore
      },
      tier
    );

    const priorityScore: BusinessPriorityScore = {
      businessId: business.id,
      overallScore: Math.round(overallScore),
      components: {
        revenueScore,
        procurementScore,
        partnershipScore,
        dataQualityScore: dataQualityScore.overallScore,
        geographicScore,
        industryScore,
        indigenousScore,
        relationshipScore
      },
      tier,
      recommendedActions,
      calculatedAt: new Date()
    };

    // Cache the score
    await this.cacheScore(business.id, priorityScore);

    this.logger.info(`Priority score calculated for ${business.name}`, {
      score: overallScore,
      tier,
      duration: Date.now() - startTime
    });

    this.emit('score:calculated', priorityScore);

    return priorityScore;
  }

  /**
   * Batch calculate priority scores
   */
  async calculateBatchPriorityScores(
    businesses: (DiscoveredBusiness | EnrichedBusiness)[]
  ): Promise<BusinessPriorityScore[]> {
    const scores: BusinessPriorityScore[] = [];
    const batchSize = 50;

    this.logger.info(`Calculating priority scores for ${businesses.length} businesses`);

    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      
      const batchScores = await Promise.all(
        batch.map(business => this.calculatePriorityScore(business))
      );
      
      scores.push(...batchScores);

      this.emit('batch:progress', {
        processed: Math.min(i + batchSize, businesses.length),
        total: businesses.length
      });
    }

    // Sort by score
    scores.sort((a, b) => b.overallScore - a.overallScore);

    return scores;
  }

  /**
   * Calculate revenue score (0-100)
   */
  private async calculateRevenueScore(business: any): Promise<number> {
    const enriched = business as EnrichedBusiness;
    
    if (!enriched.financialInfo) {
      return 20; // Base score for unknown revenue
    }

    const revenue = enriched.financialInfo.estimatedRevenue || 0;
    const employees = enriched.financialInfo.employeeCount || 0;

    let score = 0;

    // Revenue scoring (0-70 points)
    if (revenue >= 50000000) score += 70;      // $50M+
    else if (revenue >= 25000000) score += 60; // $25M-50M
    else if (revenue >= 10000000) score += 50; // $10M-25M
    else if (revenue >= 5000000) score += 40;  // $5M-10M
    else if (revenue >= 1000000) score += 30;  // $1M-5M
    else if (revenue >= 500000) score += 20;   // $500K-1M
    else if (revenue >= 100000) score += 10;   // $100K-500K
    else score += 5;                           // <$100K

    // Employee count bonus (0-20 points)
    if (employees >= 500) score += 20;
    else if (employees >= 100) score += 15;
    else if (employees >= 50) score += 10;
    else if (employees >= 10) score += 5;

    // Government contract history bonus (0-10 points)
    if (enriched.financialInfo.hasGovernmentContracts) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate procurement readiness score (0-100)
   */
  private async calculateProcurementScore(business: any): Promise<number> {
    const enriched = business as EnrichedBusiness;
    
    if (!enriched.procurementReadiness) {
      return 10; // Base score
    }

    const readiness = enriched.procurementReadiness;
    let score = readiness.score || 0; // Use existing score if available

    // Additional scoring factors
    if (readiness.hasInsurance) score += 10;
    if (readiness.hasBonding) score += 10;
    if (readiness.hasHealthSafety) score += 10;

    // Past performance bonus
    if (readiness.pastPerformance && readiness.pastPerformance >= 4) {
      score += 15;
    }

    // Capability diversity
    const capabilityCount = readiness.capabilities?.length || 0;
    if (capabilityCount >= 10) score += 10;
    else if (capabilityCount >= 5) score += 5;

    // Certification bonus
    if (enriched.certifications && enriched.certifications.length > 0) {
      const activeCerts = enriched.certifications.filter(c => c.status === 'active');
      score += Math.min(activeCerts.length * 5, 20);
    }

    // NAICS/UNSPSC codes
    if (readiness.naicsCodes && readiness.naicsCodes.length > 0) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate partnership potential score (0-100)
   */
  private async calculatePartnershipScore(business: any): Promise<number> {
    const enriched = business as EnrichedBusiness;
    let score = 50; // Base score

    // Business type factors
    switch (business.type) {
      case BusinessType.INDIGENOUS_OWNED:
        score += 20;
        break;
      case BusinessType.INDIGENOUS_PARTNERSHIP:
        score += 15;
        break;
      case BusinessType.INDIGENOUS_AFFILIATED:
        score += 10;
        break;
      case BusinessType.POTENTIAL_PARTNER:
        score += 25;
        break;
    }

    // Existing partnerships
    const relationships = await this.getBusinessRelationships(business.id);
    const partnershipCount = relationships.filter(r => 
      r.relationshipType === RelationshipType.PARTNER
    ).length;
    
    if (partnershipCount > 0) {
      score += Math.min(partnershipCount * 5, 15);
    }

    // Industry alignment
    const industryScore = await this.calculateIndustryScore(business);
    if (industryScore >= 80) {
      score += 10;
    }

    // Geographic proximity to other businesses
    if (enriched.address) {
      const nearbyPartners = await this.findNearbyBusinesses(enriched.address);
      if (nearbyPartners > 10) score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate data quality score
   */
  private async calculateDataQualityScore(business: any): Promise<DataQualityScore> {
    const enriched = business as EnrichedBusiness;
    const missingFields: string[] = [];
    const recommendations: DataQualityRecommendation[] = [];

    // Completeness scoring
    let completeness = 0;
    let totalFields = 0;

    // Critical fields
    const criticalFields = [
      { field: 'name', value: business.name, weight: 2 },
      { field: 'businessNumber', value: business.businessNumber, weight: 3 },
      { field: 'phone', value: business.phone, weight: 2 },
      { field: 'email', value: business.email, weight: 2 },
      { field: 'website', value: business.website, weight: 1 },
      { field: 'address', value: business.address?.street, weight: 2 },
      { field: 'description', value: business.description, weight: 1 }
    ];

    for (const fieldInfo of criticalFields) {
      totalFields += fieldInfo.weight;
      if (fieldInfo.value) {
        completeness += fieldInfo.weight;
      } else {
        missingFields.push(fieldInfo.field);
        recommendations.push({
          field: fieldInfo.field,
          issue: `Missing ${fieldInfo.field}`,
          impact: fieldInfo.weight >= 2 ? 'high' : 'medium',
          suggestion: `Add ${fieldInfo.field} to improve data quality`,
          estimatedImprovement: fieldInfo.weight * 5
        });
      }
    }

    // Enriched data bonus
    if (enriched.verified) completeness += 5;
    if (enriched.contacts && enriched.contacts.length > 0) completeness += 3;
    if (enriched.certifications && enriched.certifications.length > 0) completeness += 2;
    if (enriched.financialInfo) completeness += 2;
    if (enriched.procurementReadiness) completeness += 2;
    totalFields += 14;

    const completenessScore = (completeness / totalFields) * 100;

    // Accuracy scoring (based on verification)
    let accuracy = 50; // Base accuracy
    if (enriched.verified) accuracy = 90;
    else if (enriched.verificationDetails) {
      accuracy = enriched.verificationDetails.confidence * 100;
    }

    // Freshness scoring
    const ageInDays = this.getDataAge(enriched.enrichedAt || business.discoveredAt);
    let freshness = 100;
    if (ageInDays > 365) freshness = 20;
    else if (ageInDays > 180) freshness = 40;
    else if (ageInDays > 90) freshness = 60;
    else if (ageInDays > 30) freshness = 80;

    // Source reliability
    const sourceReliability = (business.source?.reliability || 0.5) * 100;

    // Verification level
    let verificationLevel = 0;
    if (enriched.verified) verificationLevel = 100;
    else if (enriched.taxDebtStatus) verificationLevel = 80;
    else if (enriched.verificationDetails) verificationLevel = 60;
    else if (business.businessNumber) verificationLevel = 40;
    else verificationLevel = 20;

    // Calculate overall score
    const overallScore = (
      completenessScore * 0.3 +
      accuracy * 0.25 +
      freshness * 0.2 +
      sourceReliability * 0.15 +
      verificationLevel * 0.1
    );

    const dataQualityScore: DataQualityScore = {
      businessId: business.id,
      overallScore: Math.round(overallScore),
      completeness: Math.round(completenessScore),
      accuracy: Math.round(accuracy),
      freshness: Math.round(freshness),
      sourceReliability: Math.round(sourceReliability),
      verificationLevel: Math.round(verificationLevel),
      missingFields,
      recommendations,
      lastAssessed: new Date()
    };

    return dataQualityScore;
  }

  /**
   * Calculate geographic score (0-100)
   */
  private async calculateGeographicScore(business: any): Promise<number> {
    if (!business.address) return 30; // Base score for unknown location

    let score = 50; // Base score
    const province = business.address.province;
    const city = business.address.city;

    // Province scoring
    if (this.geographicPriorities.primaryMarkets.includes(province)) {
      score += 30;
    } else if (this.geographicPriorities.secondaryMarkets.includes(province)) {
      score += 20;
    } else {
      score += 10; // Other provinces/territories
    }

    // Urban center bonus
    if (city && this.geographicPriorities.urbanCenters.includes(city)) {
      score += 15;
    }

    // Remote/Northern bonus
    if (this.geographicPriorities.remoteBonus && business.address.isOnReserve) {
      score += 10;
    }

    // Northern territories bonus
    if (['NT', 'YT', 'NU'].includes(province)) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate industry score (0-100)
   */
  private async calculateIndustryScore(business: any): Promise<number> {
    if (!business.industry || business.industry.length === 0) {
      return 30; // Base score for unknown industry
    }

    let maxScore = 0;

    for (const industry of business.industry) {
      const normalizedIndustry = industry.toLowerCase();
      let score = 0;

      // Check priority levels
      if (this.industryPriorities.highPriority.some(i => 
        normalizedIndustry.includes(i.toLowerCase())
      )) {
        score = 90;
      } else if (this.industryPriorities.mediumPriority.some(i => 
        normalizedIndustry.includes(i.toLowerCase())
      )) {
        score = 60;
      } else if (this.industryPriorities.lowPriority.some(i => 
        normalizedIndustry.includes(i.toLowerCase())
      )) {
        score = 30;
      } else if (this.industryPriorities.excluded.some(i => 
        normalizedIndustry.includes(i.toLowerCase())
      )) {
        score = 0;
      } else {
        score = 50; // Default for unclassified industries
      }

      maxScore = Math.max(maxScore, score);
    }

    // Bonus for multiple relevant industries
    const relevantCount = business.industry.filter((i: string) => 
      !this.industryPriorities.excluded.some(e => 
        i.toLowerCase().includes(e.toLowerCase())
      )
    ).length;

    if (relevantCount > 3) maxScore += 10;

    return Math.min(maxScore, 100);
  }

  /**
   * Calculate Indigenous business score (0-100)
   */
  private async calculateIndigenousScore(business: any): Promise<number> {
    const enriched = business as EnrichedBusiness;
    let score = 0;

    // Base scoring by type
    switch (business.type) {
      case BusinessType.INDIGENOUS_OWNED:
        score = 80;
        break;
      case BusinessType.INDIGENOUS_PARTNERSHIP:
        score = 60;
        break;
      case BusinessType.INDIGENOUS_AFFILIATED:
        score = 40;
        break;
      default:
        score = 0;
    }

    // Indigenous details bonus
    if (enriched.indigenousDetails) {
      const details = enriched.indigenousDetails;
      
      // Ownership percentage
      if (details.ownershipPercentage) {
        if (details.ownershipPercentage >= 51) score += 10;
        else if (details.ownershipPercentage >= 33) score += 5;
      }

      // Indigenous employment
      if (details.indigenousEmployeePercentage) {
        if (details.indigenousEmployeePercentage >= 50) score += 5;
        else if (details.indigenousEmployeePercentage >= 25) score += 3;
      }

      // Community benefits
      if (details.communityBenefitAgreements) score += 3;
      if (details.traditionalTerritoryWork) score += 2;
    }

    // Certification bonus
    if (enriched.certifications) {
      const indigenousCerts = enriched.certifications.filter(c => 
        c.type === 'CCAB' || c.type === 'PAR' || c.type === 'INDIGENOUS_BUSINESS'
      );
      if (indigenousCerts.length > 0) score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate relationship score (0-100)
   */
  private async calculateRelationshipScore(business: any): Promise<number> {
    const relationships = await this.getBusinessRelationships(business.id);
    
    if (relationships.length === 0) return 20; // Base score

    let score = 40; // Has relationships base

    // Score by relationship types
    const relationshipScores = {
      [RelationshipType.CUSTOMER]: 15,
      [RelationshipType.SUPPLIER]: 10,
      [RelationshipType.PARTNER]: 20,
      [RelationshipType.PARENT_SUBSIDIARY]: 5,
      [RelationshipType.INVESTOR]: 10,
      [RelationshipType.FRANCHISEE]: 5,
      [RelationshipType.COMPETITOR]: -5
    };

    for (const relationship of relationships) {
      const typeScore = relationshipScores[relationship.relationshipType] || 0;
      score += typeScore * relationship.strength;
    }

    // Network effect bonus
    if (relationships.length >= 10) score += 15;
    else if (relationships.length >= 5) score += 10;
    else if (relationships.length >= 3) score += 5;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Determine priority tier based on score
   */
  private determineTier(score: number): PriorityTier {
    if (score >= this.tierThresholds.platinum) return PriorityTier.PLATINUM;
    if (score >= this.tierThresholds.gold) return PriorityTier.GOLD;
    if (score >= this.tierThresholds.silver) return PriorityTier.SILVER;
    if (score >= this.tierThresholds.bronze) return PriorityTier.BRONZE;
    return PriorityTier.STANDARD;
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    business: any,
    scores: any,
    tier: PriorityTier
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Data quality recommendations
    if (scores.dataQualityScore < 70) {
      recommendations.push('Improve data quality by completing missing fields and verifying information');
    }

    // Revenue recommendations
    if (scores.revenueScore < 50) {
      recommendations.push('Consider targeting for growth programs or smaller contracts initially');
    }

    // Procurement recommendations
    if (scores.procurementScore < 60) {
      recommendations.push('Assist with procurement readiness: certifications, bonding, and insurance');
    }

    // Industry recommendations
    if (scores.industryScore >= 80) {
      recommendations.push('High-priority industry - prioritize for government contract opportunities');
    }

    // Geographic recommendations
    if (scores.geographicScore >= 80) {
      recommendations.push('Strategic location - leverage for regional procurement opportunities');
    }

    // Partnership recommendations
    if (scores.partnershipScore >= 70) {
      recommendations.push('Strong partnership potential - facilitate B2B connections');
    }

    // Tier-specific recommendations
    switch (tier) {
      case PriorityTier.PLATINUM:
        recommendations.push('Platinum tier - assign dedicated account manager');
        recommendations.push('Fast-track for major procurement opportunities');
        break;
      case PriorityTier.GOLD:
        recommendations.push('Gold tier - include in premium opportunity notifications');
        recommendations.push('Provide enhanced support services');
        break;
      case PriorityTier.SILVER:
        recommendations.push('Silver tier - regular engagement and opportunity matching');
        break;
      case PriorityTier.BRONZE:
        recommendations.push('Bronze tier - include in general outreach campaigns');
        break;
      default:
        recommendations.push('Standard tier - monitor for improvement opportunities');
    }

    // Use AI for personalized recommendations if available
    if (process.env.OPENAI_API_KEY && tier >= PriorityTier.SILVER) {
      try {
        const aiRecommendations = await this.generateAIRecommendations(business, scores);
        recommendations.push(...aiRecommendations);
      } catch (error) {
        this.logger.error('AI recommendation generation failed:', error);
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateAIRecommendations(
    business: any,
    scores: any
  ): Promise<string[]> {
    try {
      const prompt = `
        Analyze this business profile and scores to generate 2-3 specific, actionable recommendations:
        
        Business: ${business.name}
        Type: ${business.type}
        Industry: ${business.industry?.join(', ') || 'Unknown'}
        Location: ${business.address?.city}, ${business.address?.province}
        
        Scores:
        - Revenue: ${scores.revenueScore}/100
        - Procurement Readiness: ${scores.procurementScore}/100
        - Partnership Potential: ${scores.partnershipScore}/100
        - Data Quality: ${scores.dataQualityScore}/100
        
        Generate specific recommendations for business development and procurement success.
        Keep each recommendation under 100 characters.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are a business development expert focused on government procurement and Indigenous business growth.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content || '';
      const recommendations = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .slice(0, 3);

      return recommendations;

    } catch (error) {
      this.logger.error('OpenAI recommendation generation failed:', error);
      return [];
    }
  }

  /**
   * Get business relationships from graph
   */
  private async getBusinessRelationships(businessId: string): Promise<BusinessRelationship[]> {
    const relationships: BusinessRelationship[] = [];
    
    // Get from Redis
    const pattern = `relationship:${businessId}:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        relationships.push(JSON.parse(data));
      }
    }
    
    return relationships;
  }

  /**
   * Find nearby businesses
   */
  private async findNearbyBusinesses(address: any): Promise<number> {
    if (!address.postalCode) return 0;
    
    // Check cache for nearby businesses
    const postalPrefix = address.postalCode.substring(0, 3);
    const cached = await this.redis.get(`nearby:${postalPrefix}`);
    
    return cached ? parseInt(cached) : 0;
  }

  /**
   * Calculate data age in days
   */
  private getDataAge(date: Date | string): number {
    const dataDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dataDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Cache priority score
   */
  private async cacheScore(businessId: string, score: BusinessPriorityScore): Promise<void> {
    const key = `priority:score:${businessId}`;
    await this.redis.setex(
      key,
      86400 * 7, // 7 days
      JSON.stringify(score)
    );
  }

  /**
   * Validate weights sum to 1.0
   */
  private validateWeights(): void {
    const sum = Object.values(this.criteria).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      this.logger.warn(`Criteria weights sum to ${sum}, normalizing to 1.0`);
      
      // Normalize weights
      for (const key in this.criteria) {
        (this.criteria as any)[key] = (this.criteria as any)[key] / sum;
      }
    }
  }

  /**
   * Get top businesses by tier
   */
  async getTopBusinessesByTier(tier: PriorityTier, limit: number = 100): Promise<string[]> {
    const pattern = 'priority:score:*';
    const keys = await this.redis.keys(pattern);
    const scores: BusinessPriorityScore[] = [];
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const score = JSON.parse(data) as BusinessPriorityScore;
        if (score.tier === tier) {
          scores.push(score);
        }
      }
    }
    
    // Sort by score and return IDs
    return scores
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
      .map(s => s.businessId);
  }

  /**
   * Update scoring criteria
   */
  async updateCriteria(newCriteria: Partial<PrioritizationCriteria>): Promise<void> {
    Object.assign(this.criteria, newCriteria);
    this.validateWeights();
    
    // Clear cache to force recalculation
    const keys = await this.redis.keys('priority:score:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    this.emit('criteria:updated', this.criteria);
  }

  /**
   * Get scoring statistics
   */
  async getScoringStatistics(): Promise<any> {
    const pattern = 'priority:score:*';
    const keys = await this.redis.keys(pattern);
    
    const tierCounts: Record<PriorityTier, number> = {
      [PriorityTier.PLATINUM]: 0,
      [PriorityTier.GOLD]: 0,
      [PriorityTier.SILVER]: 0,
      [PriorityTier.BRONZE]: 0,
      [PriorityTier.STANDARD]: 0
    };
    
    let totalScore = 0;
    let count = 0;
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const score = JSON.parse(data) as BusinessPriorityScore;
        tierCounts[score.tier]++;
        totalScore += score.overallScore;
        count++;
      }
    }
    
    return {
      totalScored: count,
      averageScore: count > 0 ? totalScore / count : 0,
      tierDistribution: tierCounts,
      lastUpdated: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
  }
}