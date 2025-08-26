import { prisma } from '@/lib/prisma';
import { AnimalSpirit } from '../types';

interface PartnershipPattern {
  type: 'supplier' | 'buyer' | 'collaborator' | 'mentor' | 'mentee';
  frequency: number;
  successRate: number;
  preferredIndustries: string[];
  preferredSpiritAnimals: AnimalSpirit[];
  averageContractValue: number;
  relationshipStrength: number;
}

interface BadgeMemory {
  businessId: string;
  patterns: PartnershipPattern[];
  insights: PartnershipInsight[];
  recommendations: PartnershipRecommendation[];
  evolutionProgress: EvolutionMemory;
  networkValue: number;
}

interface PartnershipInsight {
  type: 'strength' | 'opportunity' | 'risk' | 'growth';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface PartnershipRecommendation {
  targetBusinessId: string;
  targetBusinessName: string;
  targetSpirit: AnimalSpirit;
  matchScore: number;
  reasoning: string;
  mutualBenefits: string[];
  introductionPath?: string[]; // Chain of connections
}

interface EvolutionMemory {
  currentPath: string[];
  milestonesAchieved: string[];
  nextMilestone: string;
  progressPercentage: number;
  collaborativeAchievements: string[];
}

export class BadgeMemoryService {
  /**
   * Build partnership memory from business interactions
   */
  async buildPartnershipMemory(businessId: string): Promise<BadgeMemory> {
    // Fetch all business interactions
    const [contracts, bids, collaborations] = await Promise.all([
      this.getBusinessContracts(businessId),
      this.getBusinessBids(businessId),
      this.getBusinessCollaborations(businessId)
    ]);

    // Analyze patterns
    const patterns = this.analyzePartnershipPatterns(contracts, bids, collaborations);
    
    // Generate insights
    const insights = this.generateInsights(patterns, contracts);
    
    // Create recommendations
    const recommendations = await this.generateRecommendations(businessId, patterns);
    
    // Track evolution progress
    const evolutionProgress = await this.trackEvolutionProgress(businessId);
    
    // Calculate network value
    const networkValue = this.calculateNetworkValue(patterns, contracts);

    return {
      businessId,
      patterns,
      insights,
      recommendations,
      evolutionProgress,
      networkValue
    };
  }

  /**
   * Learn from successful partnerships
   */
  async learnFromSuccess(
    businessId: string,
    partnerId: string,
    outcome: any
  ): Promise<void> {
    // Update pattern recognition
    const memory = await this.buildPartnershipMemory(businessId);
    
    // Find or create pattern for this partnership type
    const partnerBusiness = await prisma.business.findUnique({
      where: { id: partnerId },
      include: { badge: true }
    });

    if (!partnerBusiness) return;

    // Update patterns based on success
    await this.updatePatterns(businessId, {
      partnerSpirit: partnerBusiness.badge?.animalSpirit,
      partnerIndustry: partnerBusiness.industries[0],
      outcome,
      timestamp: new Date()
    });

    // Generate new insights
    await this.generateNewInsights(businessId, partnerId, outcome);
  }

  /**
   * Find synergistic partnerships
   */
  async findSynergyPartners(businessId: string): Promise<PartnershipRecommendation[]> {
    const memory = await this.buildPartnershipMemory(businessId);
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { badge: true }
    });

    if (!business || !business.badge) return [];

    // Find businesses with complementary spirits
    const complementarySpirits = this.getComplementarySpirits(business.badge.animalSpirit);
    
    const potentialPartners = await prisma.business.findMany({
      where: {
        id: { not: businessId },
        badge: {
          animalSpirit: { in: complementarySpirits },
          status: 'ACTIVE'
        }
      },
      include: {
        badge: true,
        contracts: {
          select: {
            value: true,
            status: true
          }
        }
      },
      take: 20
    });

    // Score each potential partner
    const recommendations = potentialPartners.map(partner => {
      const matchScore = this.calculateMatchScore(business, partner, memory);
      const reasoning = this.generateMatchReasoning(business, partner, matchScore);
      const mutualBenefits = this.identifyMutualBenefits(business, partner);

      return {
        targetBusinessId: partner.id,
        targetBusinessName: partner.name,
        targetSpirit: partner.badge!.animalSpirit as AnimalSpirit,
        matchScore,
        reasoning,
        mutualBenefits,
        introductionPath: this.findIntroductionPath(businessId, partner.id)
      };
    });

    // Sort by match score
    return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  /**
   * Track collaborative evolution progress
   */
  async trackCollaborativeEvolution(
    businessId: string,
    collaboratorIds: string[]
  ): Promise<{
    sharedMilestones: string[];
    collectiveImpact: number;
    evolutionBonus: number;
  }> {
    // Check if businesses are working together
    const collaborations = await prisma.contract.findMany({
      where: {
        OR: [
          { businessId, partnerId: { in: collaboratorIds } },
          { businessId: { in: collaboratorIds }, partnerId: businessId }
        ],
        status: 'COMPLETED'
      }
    });

    const sharedMilestones = [];
    let collectiveImpact = 0;

    // Calculate shared achievements
    if (collaborations.length >= 3) {
      sharedMilestones.push('Trusted Partnership Trio');
      collectiveImpact += 0.1;
    }

    if (collaborations.some(c => c.value > 1000000)) {
      sharedMilestones.push('Million Dollar Partnership');
      collectiveImpact += 0.15;
    }

    const totalValue = collaborations.reduce((sum, c) => sum + (c.value || 0), 0);
    if (totalValue > 5000000) {
      sharedMilestones.push('Prosperity Network');
      collectiveImpact += 0.2;
    }

    // Evolution bonus for working together
    const evolutionBonus = Math.min(collectiveImpact, 0.5); // Cap at 50% bonus

    return {
      sharedMilestones,
      collectiveImpact: totalValue,
      evolutionBonus
    };
  }

  /**
   * Generate network effect insights
   */
  async generateNetworkInsights(businessId: string): Promise<{
    networkSize: number;
    networkQuality: number;
    growthVelocity: number;
    recommendations: string[];
  }> {
    const connections = await this.getBusinessConnections(businessId);
    const recentConnections = connections.filter(c => 
      c.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const networkSize = connections.length;
    const networkQuality = this.calculateNetworkQuality(connections);
    const growthVelocity = recentConnections.length / 30; // Connections per day

    const recommendations = [];

    if (networkSize < 10) {
      recommendations.push('Focus on building more partnerships to unlock network benefits');
    }

    if (networkQuality < 0.5) {
      recommendations.push('Strengthen existing relationships before expanding');
    }

    if (growthVelocity < 0.1) {
      recommendations.push('Accelerate partnership development - aim for 3+ new connections monthly');
    }

    // Check for spirit animal diversity
    const spiritDiversity = this.calculateSpiritDiversity(connections);
    if (spiritDiversity < 0.3) {
      recommendations.push('Diversify partnerships - connect with different spirit animals');
    }

    return {
      networkSize,
      networkQuality,
      growthVelocity,
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private async getBusinessContracts(businessId: string) {
    return prisma.contract.findMany({
      where: {
        OR: [
          { businessId },
          { partnerId: businessId }
        ]
      },
      include: {
        business: { include: { badge: true } },
        partner: { include: { badge: true } }
      }
    });
  }

  private async getBusinessBids(businessId: string) {
    return prisma.bid.findMany({
      where: { businessId },
      include: {
        rfq: true,
        business: { include: { badge: true } }
      }
    });
  }

  private async getBusinessCollaborations(businessId: string) {
    // This would fetch from a collaborations table
    return [];
  }

  private analyzePartnershipPatterns(contracts: any[], bids: any[], collaborations: any[]): PartnershipPattern[] {
    const patterns: Map<string, PartnershipPattern> = new Map();

    // Analyze contracts
    contracts.forEach(contract => {
      const partner = contract.businessId === contract.businessId ? contract.partner : contract.business;
      if (!partner?.badge) return;

      const key = `${partner.badge.animalSpirit}-${partner.industries[0]}`;
      const existing = patterns.get(key) || {
        type: 'buyer',
        frequency: 0,
        successRate: 0,
        preferredIndustries: [],
        preferredSpiritAnimals: [],
        averageContractValue: 0,
        relationshipStrength: 0
      };

      existing.frequency++;
      existing.averageContractValue = (existing.averageContractValue + contract.value) / 2;
      existing.preferredSpiritAnimals = [partner.badge.animalSpirit];
      existing.preferredIndustries = partner.industries;

      patterns.set(key, existing);
    });

    return Array.from(patterns.values());
  }

  private generateInsights(patterns: PartnershipPattern[], contracts: any[]): PartnershipInsight[] {
    const insights: PartnershipInsight[] = [];

    // Strength insights
    const strongestPattern = patterns.sort((a, b) => b.relationshipStrength - a.relationshipStrength)[0];
    if (strongestPattern) {
      insights.push({
        type: 'strength',
        title: 'Partnership Superpower Identified',
        description: `You work exceptionally well with ${strongestPattern.preferredSpiritAnimals[0]} spirits in ${strongestPattern.preferredIndustries[0]}`,
        impact: 'high',
        actionable: true
      });
    }

    // Opportunity insights
    const missingSpirits = this.identifyMissingSpirits(patterns);
    if (missingSpirits.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Untapped Partnership Potential',
        description: `You haven't worked with ${missingSpirits.join(', ')} spirits yet - they could unlock new opportunities`,
        impact: 'medium',
        actionable: true
      });
    }

    // Growth insights
    const recentGrowth = contracts.filter(c => 
      c.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (recentGrowth > 5) {
      insights.push({
        type: 'growth',
        title: 'Partnership Momentum Building',
        description: `${recentGrowth} new partnerships in 90 days - you're accelerating!`,
        impact: 'high',
        actionable: false
      });
    }

    return insights;
  }

  private async generateRecommendations(
    businessId: string,
    patterns: PartnershipPattern[]
  ): Promise<PartnershipRecommendation[]> {
    // This would use AI to generate smart recommendations
    return [];
  }

  private async trackEvolutionProgress(businessId: string): Promise<EvolutionMemory> {
    const badge = await prisma.badge.findUnique({
      where: { businessId },
      include: {
        auditEvents: {
          where: { eventType: 'evolution' }
        }
      }
    });

    return {
      currentPath: badge?.auditEvents.map(e => e.eventData.toSpirit as string) || [],
      milestonesAchieved: [],
      nextMilestone: 'Reach 10% procurement',
      progressPercentage: 0.45,
      collaborativeAchievements: []
    };
  }

  private calculateNetworkValue(patterns: PartnershipPattern[], contracts: any[]): number {
    const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const diversityBonus = patterns.length * 0.1;
    const frequencyBonus = patterns.reduce((sum, p) => sum + (p.frequency * 0.05), 0);
    
    return totalValue * (1 + diversityBonus + frequencyBonus);
  }

  private getComplementarySpirits(spirit: AnimalSpirit): AnimalSpirit[] {
    const complementMap: Record<AnimalSpirit, AnimalSpirit[]> = {
      [AnimalSpirit.BEAVER]: [AnimalSpirit.EAGLE, AnimalSpirit.WOLF, AnimalSpirit.TURTLE],
      [AnimalSpirit.EAGLE]: [AnimalSpirit.BEAVER, AnimalSpirit.WOLF, AnimalSpirit.FOX],
      [AnimalSpirit.FOX]: [AnimalSpirit.EAGLE, AnimalSpirit.OTTER, AnimalSpirit.RAVEN],
      [AnimalSpirit.WOLF]: [AnimalSpirit.EAGLE, AnimalSpirit.BEAR, AnimalSpirit.BEAVER],
      [AnimalSpirit.BEAR]: [AnimalSpirit.WOLF, AnimalSpirit.TURTLE, AnimalSpirit.BEAVER],
      [AnimalSpirit.TURTLE]: [AnimalSpirit.BEAVER, AnimalSpirit.BEAR, AnimalSpirit.RAVEN],
      [AnimalSpirit.OTTER]: [AnimalSpirit.FOX, AnimalSpirit.WOLF, AnimalSpirit.MARTEN],
      [AnimalSpirit.WOLVERINE]: [AnimalSpirit.BEAR, AnimalSpirit.WOLF, AnimalSpirit.EAGLE],
      [AnimalSpirit.MARTEN]: [AnimalSpirit.FOX, AnimalSpirit.OTTER, AnimalSpirit.EAGLE],
      [AnimalSpirit.RAVEN]: [AnimalSpirit.EAGLE, AnimalSpirit.TURTLE, AnimalSpirit.FOX]
    };

    return complementMap[spirit] || [];
  }

  private calculateMatchScore(business: any, partner: any, memory: BadgeMemory): number {
    let score = 0;

    // Spirit compatibility
    const complementarySpirits = this.getComplementarySpirits(business.badge.animalSpirit);
    if (complementarySpirits.includes(partner.badge.animalSpirit)) {
      score += 0.3;
    }

    // Industry alignment
    const sharedIndustries = business.industries.filter((i: string) => 
      partner.industries.includes(i)
    );
    score += sharedIndustries.length * 0.1;

    // Size compatibility
    const sizeDiff = Math.abs(business.employeeCount - partner.employeeCount);
    if (sizeDiff < 50) score += 0.2;

    // Historical success with similar partners
    const similarPatterns = memory.patterns.filter(p => 
      p.preferredSpiritAnimals.includes(partner.badge.animalSpirit)
    );
    if (similarPatterns.length > 0) {
      score += similarPatterns[0].successRate * 0.3;
    }

    return Math.min(score, 1.0);
  }

  private generateMatchReasoning(business: any, partner: any, score: number): string {
    if (score > 0.8) {
      return `Exceptional match! Your ${business.badge.animalSpirit} spirit complements their ${partner.badge.animalSpirit} perfectly.`;
    } else if (score > 0.6) {
      return `Strong potential partnership. Your approaches align well and could create mutual growth.`;
    } else {
      return `Exploratory opportunity. Different perspectives could lead to innovation.`;
    }
  }

  private identifyMutualBenefits(business: any, partner: any): string[] {
    const benefits = [];

    if (business.employeeCount > partner.employeeCount * 2) {
      benefits.push('Mentorship opportunity for smaller partner');
    }

    if (business.industries.some((i: string) => partner.industries.includes(i))) {
      benefits.push('Industry expertise sharing');
    }

    if (business.badge.evolutionStage > partner.badge.evolutionStage) {
      benefits.push('Evolution guidance potential');
    }

    benefits.push('Network expansion for both parties');

    return benefits;
  }

  private findIntroductionPath(fromId: string, toId: string): string[] | undefined {
    // This would implement a graph search to find connection path
    return undefined;
  }

  private async getBusinessConnections(businessId: string) {
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { businessId },
          { partnerId: businessId }
        ]
      },
      include: {
        business: { include: { badge: true } },
        partner: { include: { badge: true } }
      }
    });

    return contracts.map(c => ({
      connectedBusiness: c.businessId === businessId ? c.partner : c.business,
      createdAt: c.createdAt,
      value: c.value
    }));
  }

  private calculateNetworkQuality(connections: any[]): number {
    if (connections.length === 0) return 0;

    const activeConnections = connections.filter(c => 
      c.createdAt > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    );

    const quality = activeConnections.length / connections.length;
    return quality;
  }

  private calculateSpiritDiversity(connections: any[]): number {
    const uniqueSpirits = new Set(
      connections
        .map(c => c.connectedBusiness?.badge?.animalSpirit)
        .filter(Boolean)
    );

    return uniqueSpirits.size / Object.keys(AnimalSpirit).length;
  }

  private identifyMissingSpirits(patterns: PartnershipPattern[]): string[] {
    const connectedSpirits = new Set(
      patterns.flatMap(p => p.preferredSpiritAnimals)
    );

    const allSpirits = Object.values(AnimalSpirit);
    return allSpirits.filter(s => !connectedSpirits.has(s));
  }

  private async updatePatterns(businessId: string, update: any): Promise<void> {
    // This would update the pattern learning system
    console.log(`Updating patterns for ${businessId}:`, update);
  }

  private async generateNewInsights(
    businessId: string,
    partnerId: string,
    outcome: any
  ): Promise<void> {
    // This would generate new insights based on outcomes
    console.log(`Generating insights from partnership ${businessId} <-> ${partnerId}`);
  }
}