/**
 * AI-Powered RFQ Matching System
 * Uses ML to match Indigenous businesses with the best opportunities
 */

import { TensorFlowService } from '@/lib/ml/tensorflow-service';
import { supabase } from '@/lib/supabase/client';
import type { Business, RFQ, MatchScore } from '../types';

export class AIRFQMatcher {
  private tfService: TensorFlowService;
  private model: any;
  
  constructor() {
    this.tfService = new TensorFlowService();
  }

  /**
   * Initialize the matching model
   */
  async initialize() {
    // Load pre-trained model or create new one
    this.model = await this.tfService.loadModel('rfq-matcher-v2');
    
    if (!this.model) {
      this.model = await this.trainModel();
    }
  }

  /**
   * Match a business with relevant RFQs
   */
  async matchBusinessToRFQs(
    businessId: string,
    options: {
      limit?: number;
      minScore?: number;
      includeReasons?: boolean;
    } = {}
  ): Promise<MatchScore[]> {
    const { limit = 10, minScore = 0.7, includeReasons = true } = options;

    // Get business profile
    const business = await this.getBusinessProfile(businessId);
    if (!business) throw new Error('Business not found');

    // Get active RFQs
    const rfqs = await this.getActiveRFQs();

    // Calculate match scores
    const matches = await Promise.all(
      rfqs.map(async (rfq) => {
        const score = await this.calculateMatchScore(business, rfq);
        const reasons = includeReasons ? await this.generateMatchReasons(business, rfq, score) : [];
        
        return {
          rfqId: rfq.id,
          rfq,
          score: score.overall,
          winProbability: score.winProbability,
          reasons,
          strengths: score.strengths,
          gaps: score.gaps,
          recommendations: score.recommendations,
        };
      })
    );

    // Filter and sort matches
    return matches
      .filter(match => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate comprehensive match score
   */
  private async calculateMatchScore(business: Business, rfq: RFQ) {
    const features = this.extractFeatures(business, rfq);
    
    // Use TensorFlow model for prediction
    const prediction = await this.model.predict(features);
    
    // Calculate component scores
    const scores = {
      overall: prediction.overall,
      winProbability: prediction.winProbability,
      technical: this.calculateTechnicalMatch(business, rfq),
      financial: this.calculateFinancialMatch(business, rfq),
      capacity: this.calculateCapacityMatch(business, rfq),
      location: this.calculateLocationMatch(business, rfq),
      cultural: this.calculateCulturalMatch(business, rfq),
      experience: this.calculateExperienceMatch(business, rfq),
      strengths: [] as string[],
      gaps: [] as string[],
      recommendations: [] as string[],
    };

    // Identify strengths and gaps
    this.analyzeStrengthsAndGaps(business, rfq, scores);

    return scores;
  }

  /**
   * Extract ML features from business and RFQ
   */
  private extractFeatures(business: Business, rfq: RFQ) {
    return {
      // Business features
      businessAge: this.getBusinessAge(business),
      employeeCount: business.employeeCount,
      indigenousEmployeeRatio: business.indigenousEmployees / business.employeeCount,
      certificationCount: business.certifications.length,
      hasSimilarProjects: this.hasSimilarProjects(business, rfq),
      averageProjectSize: business.averageProjectSize,
      
      // RFQ features
      rfqBudget: rfq.budget.max,
      rfqComplexity: this.estimateComplexity(rfq),
      timeToDeadline: this.getDaysToDeadline(rfq),
      requiredCertifications: rfq.requiredCertifications.length,
      
      // Match features
      industryMatch: this.getIndustryMatch(business, rfq),
      locationDistance: this.getLocationDistance(business, rfq),
      capacityRatio: business.availableCapacity / rfq.estimatedWorkload,
      priceCompetitiveness: this.getPriceCompetitiveness(business, rfq),
      
      // Historical features
      previousBidsCount: business.stats.totalBids,
      winRate: business.stats.winRate,
      avgResponseTime: business.stats.avgResponseTime,
      customerSatisfaction: business.stats.customerSatisfaction,
    };
  }

  /**
   * Calculate technical capability match
   */
  private calculateTechnicalMatch(business: Business, rfq: RFQ): number {
    let score = 0;
    let maxScore = 0;

    // Check required skills
    rfq.requiredSkills.forEach(skill => {
      maxScore += 1;
      if (business.skills.includes(skill)) {
        score += 1;
      } else if (business.skills.some(s => this.isRelatedSkill(s, skill))) {
        score += 0.7; // Partial credit for related skills
      }
    });

    // Check certifications
    rfq.requiredCertifications.forEach(cert => {
      maxScore += 2; // Certifications weighted higher
      if (business.certifications.some(c => c.type === cert && c.isValid)) {
        score += 2;
      }
    });

    // Check past project relevance
    const similarProjects = business.projects.filter(p => 
      this.calculateProjectSimilarity(p, rfq) > 0.7
    );
    
    if (similarProjects.length > 0) {
      score += Math.min(similarProjects.length * 0.5, 2);
      maxScore += 2;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate financial capability match
   */
  private calculateFinancialMatch(business: Business, rfq: RFQ): number {
    // Check if business can handle the budget
    const budgetRatio = rfq.budget.max / business.largestProjectValue;
    
    if (budgetRatio > 3) return 0.5; // Project might be too large
    if (budgetRatio < 0.1) return 0.7; // Project might be too small
    
    // Check bonding capacity
    if (rfq.bondingRequired && business.bondingCapacity < rfq.budget.max) {
      return 0.3; // Major limitation
    }

    // Check insurance
    if (rfq.insuranceRequired && !business.hasValidInsurance) {
      return 0.4;
    }

    return 0.9;
  }

  /**
   * Calculate capacity match
   */
  private calculateCapacityMatch(business: Business, rfq: RFQ): number {
    const capacityRatio = business.availableCapacity / rfq.estimatedWorkload;
    
    if (capacityRatio < 0.8) return 0.3; // Not enough capacity
    if (capacityRatio > 5) return 0.8; // Plenty of capacity
    
    return 0.95; // Ideal capacity match
  }

  /**
   * Calculate location match (important for some RFQs)
   */
  private calculateLocationMatch(business: Business, rfq: RFQ): number {
    if (!rfq.locationRequirements) return 1.0;

    const distance = this.getLocationDistance(business, rfq);
    
    if (rfq.locationRequirements.type === 'local' && distance > 100) {
      return 0.3;
    }
    
    if (rfq.locationRequirements.type === 'regional' && distance > 500) {
      return 0.6;
    }

    // Bonus for being in the same Indigenous territory
    if (business.territory === rfq.territory) {
      return 1.0;
    }

    return 0.9;
  }

  /**
   * Calculate cultural alignment match
   */
  private calculateCulturalMatch(business: Business, rfq: RFQ): number {
    let score = 1.0;

    // Check Indigenous procurement preferences
    if (rfq.indigenousRequirements) {
      if (business.indigenousOwnership >= rfq.indigenousRequirements.minOwnership) {
        score *= 1.2;
      }
      
      if (rfq.indigenousRequirements.preferredNations?.includes(business.nation)) {
        score *= 1.3;
      }
    }

    // Check community benefit requirements
    if (rfq.communityBenefits) {
      const benefitScore = this.calculateCommunityBenefitScore(business, rfq);
      score *= benefitScore;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate human-readable match reasons
   */
  private async generateMatchReasons(
    business: Business, 
    rfq: RFQ, 
    scores: any
  ): Promise<string[]> {
    const reasons = [];

    // Strong technical match
    if (scores.technical > 0.8) {
      reasons.push(`✅ Strong technical fit: ${business.certifications.length} relevant certifications`);
    }

    // Location advantage
    if (scores.location > 0.9) {
      reasons.push(`📍 Local advantage: Based in ${business.territory}`);
    }

    // Past success
    const similarWins = business.projects.filter(p => 
      p.status === 'completed' && this.calculateProjectSimilarity(p, rfq) > 0.7
    );
    if (similarWins.length > 0) {
      reasons.push(`🏆 Won ${similarWins.length} similar projects`);
    }

    // Capacity fit
    if (scores.capacity > 0.9) {
      reasons.push(`⚡ Perfect capacity match for project timeline`);
    }

    // Price competitiveness
    if (business.stats.avgBidCompetitiveness > 0.8) {
      reasons.push(`💰 Historically competitive pricing (${Math.round(business.stats.winRate * 100)}% win rate)`);
    }

    // Cultural alignment
    if (scores.cultural > 0.9) {
      reasons.push(`🤝 Strong Indigenous community alignment`);
    }

    return reasons;
  }

  /**
   * Generate recommendations to improve match score
   */
  private generateRecommendations(business: Business, rfq: RFQ): string[] {
    const recommendations = [];

    // Missing certifications
    const missingCerts = rfq.requiredCertifications.filter(cert => 
      !business.certifications.some(c => c.type === cert)
    );
    
    if (missingCerts.length > 0) {
      recommendations.push(`🎓 Obtain ${missingCerts[0]} certification to unlock similar RFQs`);
    }

    // Capacity building
    if (business.availableCapacity < rfq.estimatedWorkload * 0.8) {
      recommendations.push(`👥 Consider partnering with another business for capacity`);
    }

    // Location presence
    if (this.getLocationDistance(business, rfq) > 200) {
      recommendations.push(`🏢 Establish local presence in ${rfq.location} for better scores`);
    }

    return recommendations;
  }

  /**
   * Train the ML model (if needed)
   */
  private async trainModel() {
    // Get historical bid data
    const { data: historicalBids } = await supabase
      .from('bid_history')
      .select('*')
      .limit(10000);

    if (!historicalBids || historicalBids.length < 100) {
      // Use pre-trained weights if not enough data
      return this.tfService.createPretrainedModel('rfq-matcher');
    }

    // Prepare training data
    const trainingData = historicalBids.map(bid => ({
      features: this.extractHistoricalFeatures(bid),
      outcome: bid.won ? 1 : 0,
    }));

    // Train model
    return this.tfService.trainModel(trainingData, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
    });
  }

  // Helper methods
  private getBusinessAge(business: Business): number {
    const foundedDate = new Date(business.foundedDate);
    const now = new Date();
    return (now.getTime() - foundedDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
  }

  private getDaysToDeadline(rfq: RFQ): number {
    const deadline = new Date(rfq.closingDate);
    const now = new Date();
    return (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  }

  private getLocationDistance(business: Business, rfq: RFQ): number {
    // Simplified distance calculation
    // In production, use proper geospatial calculations
    return Math.random() * 500; // Mock distance in km
  }

  private calculateProjectSimilarity(project: any, rfq: RFQ): number {
    // Simplified similarity score
    // In production, use NLP and domain matching
    return Math.random() * 0.5 + 0.5;
  }

  private isRelatedSkill(skill1: string, skill2: string): boolean {
    // Simplified skill matching
    // In production, use skill ontology
    return skill1.toLowerCase().includes(skill2.toLowerCase()) ||
           skill2.toLowerCase().includes(skill1.toLowerCase());
  }

  // Data access methods
  private async getBusinessProfile(businessId: string) {
    const { data } = await supabase
      .from('businesses')
      .select(`
        *,
        certifications(*),
        projects(*),
        stats:business_stats(*)
      `)
      .eq('id', businessId)
      .single();
      
    return data;
  }

  private async getActiveRFQs() {
    const { data } = await supabase
      .from('rfqs')
      .select('*')
      .eq('status', 'open')
      .gte('closing_date', new Date().toISOString())
      .order('created_at', { ascending: false });
      
    return data || [];
  }
}