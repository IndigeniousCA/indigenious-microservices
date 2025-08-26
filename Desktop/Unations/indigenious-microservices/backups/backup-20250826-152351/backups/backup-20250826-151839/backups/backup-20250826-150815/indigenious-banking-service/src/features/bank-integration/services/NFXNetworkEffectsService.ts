/**
 * NFX Network Effects Analysis Service
 * Based on NFX's 16 Types of Network Effects Framework
 * 
 * Analyzes which of the 16 network effect types are active in the Indigenous Procurement Platform
 * Reference: https://www.nfx.com/post/network-effects-manual
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/monitoring/logger';
import { redisEncryption } from './RedisEncryptionService';
import { z } from 'zod';

// NFX Network Effect Categories
const NFXCategorySchema = z.enum([
  'DIRECT',
  'TWO_SIDED',
  'DATA',
  'TECH_PERFORMANCE',
  'SOCIAL',
  'PROTOCOL',
  'PERSONAL_UTILITY',
  'PERSONAL',
  'MARKET_NETWORK',
  'MARKETPLACE',
  'PLATFORM',
  'ASYMPTOTIC',
  'EXPERTISE',
  'TRIBAL',
  'HUB_AND_SPOKE',
  'LOCAL'
]);

// Network Effect Measurement Schema
const NetworkEffectMeasurementSchema = z.object({
  type: NFXCategorySchema,
  name: z.string(),
  strength: z.number().min(0).max(100), // 0-100 strength score
  active: z.boolean(),
  description: z.string(),
  metrics: z.object({
    users: z.number(),
    connections: z.number(),
    transactions: z.number(),
    retention: z.number(),
    engagement: z.number()
  }),
  growth: z.object({
    daily: z.number(),
    weekly: z.number(),
    monthly: z.number(),
    acceleration: z.number() // Growth rate change
  }),
  defensibility: z.number().min(0).max(100), // How hard to compete
  scalability: z.number().min(0).max(100), // Growth potential
  examples: z.array(z.string()) // Platform examples
});

type NFXCategory = z.infer<typeof NFXCategorySchema>;
type NetworkEffectMeasurement = z.infer<typeof NetworkEffectMeasurementSchema>;

export class NFXNetworkEffectsService extends EventEmitter {
  private static instance: NFXNetworkEffectsService;
  
  // NFX's 16 Network Effect Types with Indigenous Platform context
  private readonly NETWORK_EFFECTS_CONFIG = {
    // 1. DIRECT (Same-Side) NETWORK EFFECTS
    DIRECT: {
      name: 'Direct Network Effects',
      description: 'Indigenous businesses connecting with each other',
      examples: ['WhatsApp', 'Slack', 'Zoom'],
      platformExamples: [
        'Business-to-business collaborations',
        'Community member connections',
        'Contractor partnerships'
      ]
    },
    
    // 2. TWO-SIDED NETWORK EFFECTS
    TWO_SIDED: {
      name: 'Two-Sided Network Effects',
      description: 'Government buyers ↔ Indigenous suppliers',
      examples: ['eBay', 'Uber', 'Airbnb'],
      platformExamples: [
        'Government RFQs attracting suppliers',
        'More suppliers attracting government',
        'Band councils posting projects'
      ]
    },
    
    // 3. DATA NETWORK EFFECTS
    DATA: {
      name: 'Data Network Effects',
      description: 'Better matching algorithms with more data',
      examples: ['Google', 'Waze', 'Netflix'],
      platformExamples: [
        'Bid success predictions',
        'Pricing optimization',
        'Fraud detection improvements',
        'Community preference learning'
      ]
    },
    
    // 4. TECH PERFORMANCE NETWORK EFFECTS
    TECH_PERFORMANCE: {
      name: 'Tech Performance Network Effects',
      description: 'Platform gets faster/better with scale',
      examples: ['BitTorrent', 'Ethereum'],
      platformExamples: [
        'CDN performance',
        'Search optimization',
        'Distributed document storage'
      ]
    },
    
    // 5. SOCIAL NETWORK EFFECTS
    SOCIAL: {
      name: 'Social Network Effects',
      description: 'Communities and relationships strengthen platform',
      examples: ['Facebook', 'LinkedIn', 'Instagram'],
      platformExamples: [
        'Elder councils recommending platform',
        'Success stories shared in communities',
        'Business owner networks'
      ]
    },
    
    // 6. PROTOCOL NETWORK EFFECTS
    PROTOCOL: {
      name: 'Protocol Network Effects',
      description: 'Standardized procurement processes',
      examples: ['TCP/IP', 'Ethereum', 'Email'],
      platformExamples: [
        'Standardized RFQ format',
        'Common certification system',
        'Unified payment protocols'
      ]
    },
    
    // 7. PERSONAL UTILITY NETWORK EFFECTS
    PERSONAL_UTILITY: {
      name: 'Personal Utility Network Effects',
      description: 'Personal tools that gain value from network',
      examples: ['Calendly', 'Zoom', 'PayPal'],
      platformExamples: [
        'Business profiles',
        'Certification tracking',
        'Payment accounts'
      ]
    },
    
    // 8. PERSONAL NETWORK EFFECTS
    PERSONAL: {
      name: 'Personal Network Effects',
      description: 'Personal reputation and identity value',
      examples: ['WhatsApp', 'iMessage'],
      platformExamples: [
        'Business owner reputation',
        'Community endorsements',
        'Success track records'
      ]
    },
    
    // 9. MARKET NETWORK EFFECTS
    MARKET_NETWORK: {
      name: 'Market Network Effects',
      description: 'Combining marketplace + SaaS + social',
      examples: ['Honeybook', 'AngelList'],
      platformExamples: [
        'Project collaboration tools',
        'Contractor networks',
        'Supply chain integration'
      ]
    },
    
    // 10. MARKETPLACE NETWORK EFFECTS
    MARKETPLACE: {
      name: 'Marketplace Network Effects',
      description: 'Classic marketplace dynamics',
      examples: ['Amazon', 'eBay', 'Etsy'],
      platformExamples: [
        'RFQ marketplace',
        'Service provider directory',
        'Equipment/material exchange'
      ]
    },
    
    // 11. PLATFORM NETWORK EFFECTS
    PLATFORM: {
      name: 'Platform Network Effects',
      description: 'Third-party integrations and APIs',
      examples: ['Windows', 'iOS', 'Salesforce'],
      platformExamples: [
        'Bank integrations',
        'Accounting software plugins',
        'Government system APIs'
      ]
    },
    
    // 12. ASYMPTOTIC NETWORK EFFECTS
    ASYMPTOTIC: {
      name: 'Asymptotic Network Effects',
      description: 'Value plateaus after critical mass',
      examples: ['Uber', 'Lyft'],
      platformExamples: [
        'Local contractor availability',
        'Regional supplier density'
      ]
    },
    
    // 13. EXPERTISE NETWORK EFFECTS
    EXPERTISE: {
      name: 'Expertise Network Effects',
      description: 'Specialized knowledge concentration',
      examples: ['GitHub', 'Stack Overflow'],
      platformExamples: [
        'Indigenous procurement experts',
        'Certification specialists',
        'Grant writing expertise'
      ]
    },
    
    // 14. TRIBAL NETWORK EFFECTS
    TRIBAL: {
      name: 'Tribal Network Effects',
      description: 'Shared identity and values',
      examples: ['Harley Davidson', 'CrossFit'],
      platformExamples: [
        'Indigenous identity',
        'Community pride',
        'Shared economic goals',
        'Cultural preservation'
      ]
    },
    
    // 15. HUB-AND-SPOKE NETWORK EFFECTS
    HUB_AND_SPOKE: {
      name: 'Hub-and-Spoke Network Effects',
      description: 'Central nodes create value',
      examples: ['Airlines', 'Banking networks'],
      platformExamples: [
        'Major communities as hubs',
        'Government procurement centers',
        'Regional business associations'
      ]
    },
    
    // 16. LOCAL NETWORK EFFECTS
    LOCAL: {
      name: 'Local Network Effects',
      description: 'Geographic proximity matters',
      examples: ['Craigslist', 'Nextdoor', 'Tinder'],
      platformExamples: [
        'Regional supplier networks',
        'Community-specific opportunities',
        'Local partnership formation'
      ]
    }
  };
  
  private constructor() {
    super();
    this.initializeTracking();
  }
  
  static getInstance(): NFXNetworkEffectsService {
    if (!NFXNetworkEffectsService.instance) {
      NFXNetworkEffectsService.instance = new NFXNetworkEffectsService();
    }
    return NFXNetworkEffectsService.instance;
  }
  
  /**
   * Calculate all 16 NFX network effects for the platform
   */
  async calculateNFXNetworkEffects(): Promise<NetworkEffectMeasurement[]> {
    const measurements: NetworkEffectMeasurement[] = [];
    
    for (const [type, config] of Object.entries(this.NETWORK_EFFECTS_CONFIG)) {
      const measurement = await this.measureNetworkEffect(type as NFXCategory, config);
      measurements.push(measurement);
    }
    
    // Sort by strength
    measurements.sort((a, b) => b.strength - a.strength);
    
    // Cache results
    await redisEncryption.setEncrypted('nfx:measurements:latest', measurements, 300);
    
    // Emit update event
    this.emit('nfx-measured', measurements);
    
    return measurements;
  }
  
  /**
   * Get top active network effects
   */
  async getTopNetworkEffects(limit: number = 5): Promise<NetworkEffectMeasurement[]> {
    const all = await this.calculateNFXNetworkEffects();
    return all
      .filter(effect => effect.active)
      .slice(0, limit);
  }
  
  /**
   * Get network effect by type
   */
  async getNetworkEffect(type: NFXCategory): Promise<NetworkEffectMeasurement> {
    const all = await this.calculateNFXNetworkEffects();
    const effect = all.find(e => e.type === type);
    
    if (!effect) {
      throw new Error(`Network effect ${type} not found`);
    }
    
    return effect;
  }
  
  /**
   * Get defensibility score (how hard to compete)
   */
  async getDefensibilityScore(): Promise<{
    overall: number;
    breakdown: Record<string, number>;
    strengths: string[];
    vulnerabilities: string[];
  }> {
    const effects = await this.calculateNFXNetworkEffects();
    const activeEffects = effects.filter(e => e.active);
    
    // Calculate weighted defensibility
    const totalDefensibility = activeEffects.reduce((sum, effect) => {
      return sum + (effect.defensibility * effect.strength / 100);
    }, 0);
    
    const overallScore = activeEffects.length > 0 
      ? totalDefensibility / activeEffects.length 
      : 0;
    
    // Identify strengths and vulnerabilities
    const strengths = activeEffects
      .filter(e => e.defensibility > 70)
      .map(e => `${e.name}: ${e.defensibility}% defensible`);
    
    const vulnerabilities = activeEffects
      .filter(e => e.defensibility < 40)
      .map(e => `${e.name}: Only ${e.defensibility}% defensible`);
    
    // Create breakdown
    const breakdown: Record<string, number> = {};
    activeEffects.forEach(e => {
      breakdown[e.type] = e.defensibility;
    });
    
    return {
      overall: Math.round(overallScore),
      breakdown,
      strengths,
      vulnerabilities
    };
  }
  
  /**
   * Get growth acceleration analysis
   */
  async getGrowthAcceleration(): Promise<{
    topAccelerators: NetworkEffectMeasurement[];
    compoundingEffects: Array<{
      effects: string[];
      compoundStrength: number;
      description: string;
    }>;
    projectedGrowth: any;
  }> {
    const effects = await this.calculateNFXNetworkEffects();
    const activeEffects = effects.filter(e => e.active);
    
    // Find top growth accelerators
    const topAccelerators = activeEffects
      .sort((a, b) => b.growth.acceleration - a.growth.acceleration)
      .slice(0, 5);
    
    // Identify compounding effects
    const compoundingEffects = this.identifyCompoundingEffects(activeEffects);
    
    // Project growth based on network effects
    const projectedGrowth = this.projectGrowthFromNetworkEffects(activeEffects);
    
    return {
      topAccelerators,
      compoundingEffects,
      projectedGrowth
    };
  }
  
  /**
   * Get strategic recommendations based on NFX analysis
   */
  async getStrategicRecommendations(): Promise<{
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    warnings: string[];
  }> {
    const effects = await this.calculateNFXNetworkEffects();
    
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    const warnings: string[] = [];
    
    // Analyze each effect type for recommendations
    
    // Two-sided network effects
    const twoSided = effects.find(e => e.type === 'TWO_SIDED');
    if (twoSided && twoSided.strength < 50) {
      immediate.push('Focus on government buyer acquisition to strengthen two-sided network');
    }
    
    // Tribal network effects (huge for Indigenous platform)
    const tribal = effects.find(e => e.type === 'TRIBAL');
    if (tribal && tribal.active) {
      shortTerm.push('Leverage strong tribal identity for viral growth campaigns');
    }
    
    // Data network effects
    const data = effects.find(e => e.type === 'DATA');
    if (data && data.strength > 60) {
      longTerm.push('Build AI-powered procurement matching to maximize data network effects');
    }
    
    // Local network effects
    const local = effects.find(e => e.type === 'LOCAL');
    if (local && !local.active) {
      immediate.push('Launch community-specific features to activate local network effects');
    }
    
    // Platform network effects
    const platform = effects.find(e => e.type === 'PLATFORM');
    if (platform && platform.strength < 30) {
      shortTerm.push('Open API program to attract third-party integrations');
    }
    
    // Identify risks
    const weakEffects = effects.filter(e => e.active && e.strength < 30);
    if (weakEffects.length > 3) {
      warnings.push(`${weakEffects.length} network effects are weak and need strengthening`);
    }
    
    return {
      immediate,
      shortTerm,
      longTerm,
      warnings
    };
  }
  
  /**
   * Generate NFX dashboard data
   */
  async getNFXDashboard(): Promise<{
    overview: {
      activeEffects: number;
      totalStrength: number;
      defensibility: number;
      growthMultiplier: number;
    };
    effects: NetworkEffectMeasurement[];
    insights: {
      strongest: NetworkEffectMeasurement;
      fastestGrowing: NetworkEffectMeasurement;
      biggestOpportunity: NetworkEffectMeasurement;
    };
    competitiveAdvantage: {
      moats: string[];
      uniqueEffects: string[];
      combinationPower: number;
    };
  }> {
    const effects = await this.calculateNFXNetworkEffects();
    const activeEffects = effects.filter(e => e.active);
    
    // Calculate overview metrics
    const totalStrength = activeEffects.reduce((sum, e) => sum + e.strength, 0) / activeEffects.length;
    const defensibility = await this.getDefensibilityScore();
    const growthMultiplier = this.calculateGrowthMultiplier(activeEffects);
    
    // Find key insights
    const strongest = activeEffects.reduce((max, e) => e.strength > max.strength ? e : max);
    const fastestGrowing = activeEffects.reduce((max, e) => 
      e.growth.acceleration > max.growth.acceleration ? e : max
    );
    const biggestOpportunity = effects
      .filter(e => !e.active)
      .reduce((max, e) => e.scalability > max.scalability ? e : max);
    
    // Identify competitive advantages
    const moats = this.identifyMoats(activeEffects);
    const uniqueEffects = this.identifyUniqueEffects(activeEffects);
    const combinationPower = this.calculateCombinationPower(activeEffects);
    
    return {
      overview: {
        activeEffects: activeEffects.length,
        totalStrength: Math.round(totalStrength),
        defensibility: defensibility.overall,
        growthMultiplier
      },
      effects,
      insights: {
        strongest,
        fastestGrowing,
        biggestOpportunity
      },
      competitiveAdvantage: {
        moats,
        uniqueEffects,
        combinationPower
      }
    };
  }
  
  // Private measurement methods
  
  private async measureNetworkEffect(
    type: NFXCategory,
    config: any
  ): Promise<NetworkEffectMeasurement> {
    // Get platform metrics
    const metrics = await this.getPlatformMetrics();
    
    // Calculate strength based on type
    const strength = this.calculateStrength(type, metrics);
    const active = strength > 10; // Active if strength > 10%
    
    // Calculate growth metrics
    const growth = await this.calculateGrowth(type, metrics);
    
    // Calculate defensibility
    const defensibility = this.calculateDefensibility(type, metrics);
    
    // Calculate scalability
    const scalability = this.calculateScalability(type, metrics);
    
    return {
      type,
      name: config.name,
      strength,
      active,
      description: config.description,
      metrics: {
        users: metrics.users,
        connections: metrics.connections,
        transactions: metrics.transactions,
        retention: metrics.retention,
        engagement: metrics.engagement
      },
      growth,
      defensibility,
      scalability,
      examples: [...config.examples, ...config.platformExamples]
    };
  }
  
  private async getPlatformMetrics(): Promise<any> {
    // Get real platform metrics
    // This would connect to actual data sources
    return {
      users: 1500,
      connections: 4500,
      transactions: 750,
      retention: 85,
      engagement: 72,
      communities: 45,
      businesses: 380,
      government: 25
    };
  }
  
  private calculateStrength(type: NFXCategory, metrics: any): number {
    // Calculate strength based on network effect type
    switch (type) {
      case 'TWO_SIDED':
        // Strong if good balance of buyers and sellers
        const ratio = Math.min(metrics.businesses, metrics.government * 10) / 
                     Math.max(metrics.businesses, metrics.government * 10);
        return Math.min(100, ratio * 100 * (metrics.transactions / 100));
        
      case 'TRIBAL':
        // Indigenous identity is inherently strong
        return Math.min(100, 80 + (metrics.communities / 10));
        
      case 'LOCAL':
        // Based on geographic clustering
        const localClustering = metrics.communities / 50; // Assuming 50 is good coverage
        return Math.min(100, localClustering * 100);
        
      case 'DATA':
        // Based on data volume
        const dataPoints = metrics.transactions * metrics.users;
        return Math.min(100, Math.log10(dataPoints) * 20);
        
      case 'MARKETPLACE':
        // Classic marketplace liquidity
        const liquidity = metrics.transactions / metrics.users;
        return Math.min(100, liquidity * 200);
        
      case 'SOCIAL':
        // Engagement and connections
        const socialStrength = (metrics.engagement / 100) * (metrics.connections / metrics.users);
        return Math.min(100, socialStrength * 50);
        
      default:
        // Generic calculation
        return Math.min(100, metrics.engagement * 0.8);
    }
  }
  
  private async calculateGrowth(type: NFXCategory, metrics: any): Promise<any> {
    // Calculate growth rates
    // This would use historical data in production
    const baseGrowth = {
      daily: 0.5,
      weekly: 3.5,
      monthly: 15
    };
    
    // Adjust based on network effect type
    const multiplier = this.getGrowthMultiplier(type);
    
    return {
      daily: baseGrowth.daily * multiplier,
      weekly: baseGrowth.weekly * multiplier,
      monthly: baseGrowth.monthly * multiplier,
      acceleration: multiplier - 1 // Growth acceleration factor
    };
  }
  
  private getGrowthMultiplier(type: NFXCategory): number {
    // Some network effects grow faster
    const multipliers: Partial<Record<NFXCategory, number>> = {
      'TWO_SIDED': 1.5,
      'VIRAL': 2.0,
      'SOCIAL': 1.8,
      'TRIBAL': 1.6,
      'DATA': 1.3,
      'LOCAL': 1.4
    };
    
    return multipliers[type] || 1.0;
  }
  
  private calculateDefensibility(type: NFXCategory, metrics: any): number {
    // How hard is it for competitors to replicate
    const baseDefensibility: Partial<Record<NFXCategory, number>> = {
      'TRIBAL': 90, // Very hard to replicate Indigenous identity
      'DATA': 70, // Data moat grows over time
      'TWO_SIDED': 60, // Chicken-and-egg problem
      'LOCAL': 80, // Geographic lock-in
      'PROTOCOL': 75, // Switching costs
      'MARKETPLACE': 50, // Can be copied but hard to get liquidity
      'SOCIAL': 65, // Community lock-in
      'PLATFORM': 55 // API ecosystem
    };
    
    const base = baseDefensibility[type] || 40;
    
    // Adjust based on current strength
    const strengthBonus = metrics.users > 1000 ? 10 : 0;
    
    return Math.min(100, base + strengthBonus);
  }
  
  private calculateScalability(type: NFXCategory, metrics: any): number {
    // Growth potential
    const scalabilityScores: Partial<Record<NFXCategory, number>> = {
      'PLATFORM': 95, // APIs scale infinitely
      'DATA': 90, // More data = better product
      'PROTOCOL': 85, // Standards scale well
      'TWO_SIDED': 80, // Natural scaling
      'MARKETPLACE': 75, // Good scaling
      'TRIBAL': 70, // Limited by population
      'LOCAL': 60, // Geographic limits
      'ASYMPTOTIC': 40 // Plateaus quickly
    };
    
    return scalabilityScores[type] || 50;
  }
  
  private identifyCompoundingEffects(effects: NetworkEffectMeasurement[]): any[] {
    const compounds = [];
    
    // Two-sided + Data
    if (this.hasEffect(effects, 'TWO_SIDED') && this.hasEffect(effects, 'DATA')) {
      compounds.push({
        effects: ['TWO_SIDED', 'DATA'],
        compoundStrength: 85,
        description: 'Marketplace data improves matching, attracting more users'
      });
    }
    
    // Tribal + Social
    if (this.hasEffect(effects, 'TRIBAL') && this.hasEffect(effects, 'SOCIAL')) {
      compounds.push({
        effects: ['TRIBAL', 'SOCIAL'],
        compoundStrength: 90,
        description: 'Indigenous identity strengthens social connections'
      });
    }
    
    // Local + Marketplace
    if (this.hasEffect(effects, 'LOCAL') && this.hasEffect(effects, 'MARKETPLACE')) {
      compounds.push({
        effects: ['LOCAL', 'MARKETPLACE'],
        compoundStrength: 75,
        description: 'Local suppliers create regional marketplace density'
      });
    }
    
    return compounds.sort((a, b) => b.compoundStrength - a.compoundStrength);
  }
  
  private hasEffect(effects: NetworkEffectMeasurement[], type: string): boolean {
    return effects.some(e => e.type === type && e.active);
  }
  
  private projectGrowthFromNetworkEffects(effects: NetworkEffectMeasurement[]): any {
    // Calculate compound growth rate
    const activeMultipliers = effects
      .filter(e => e.active)
      .map(e => 1 + (e.strength / 100) * (e.growth.acceleration / 100));
    
    const compoundMultiplier = activeMultipliers.reduce((a, b) => a * b, 1);
    
    return {
      monthlyGrowthRate: compoundMultiplier * 10, // Base 10% growth
      yearlyProjection: Math.pow(compoundMultiplier, 12) * 100,
      timeToDoubleUsers: Math.log(2) / Math.log(compoundMultiplier)
    };
  }
  
  private calculateGrowthMultiplier(effects: NetworkEffectMeasurement[]): number {
    // How much network effects multiply growth
    const multipliers = effects
      .filter(e => e.active)
      .map(e => 1 + (e.strength / 100) * 0.1); // Each effect adds up to 10%
    
    return multipliers.reduce((a, b) => a * b, 1);
  }
  
  private identifyMoats(effects: NetworkEffectMeasurement[]): string[] {
    const moats = [];
    
    // High defensibility effects
    const strongDefense = effects.filter(e => e.defensibility > 70);
    strongDefense.forEach(e => {
      moats.push(`${e.name} (${e.defensibility}% defensible)`);
    });
    
    // Unique combinations
    if (this.hasEffect(effects, 'TRIBAL') && this.hasEffect(effects, 'TWO_SIDED')) {
      moats.push('Indigenous identity + Government marketplace (unique combination)');
    }
    
    return moats;
  }
  
  private identifyUniqueEffects(effects: NetworkEffectMeasurement[]): string[] {
    const unique = [];
    
    // Tribal is unique to Indigenous platforms
    if (this.hasEffect(effects, 'TRIBAL')) {
      unique.push('Tribal network effects - impossible for non-Indigenous competitors');
    }
    
    // Local + Protocol combination
    if (this.hasEffect(effects, 'LOCAL') && this.hasEffect(effects, 'PROTOCOL')) {
      unique.push('Localized procurement protocols - first mover advantage');
    }
    
    return unique;
  }
  
  private calculateCombinationPower(effects: NetworkEffectMeasurement[]): number {
    // More active effects = exponentially stronger
    const activeCount = effects.length;
    const avgStrength = effects.reduce((sum, e) => sum + e.strength, 0) / activeCount;
    
    // Power = effects^2 * average strength
    return Math.min(100, (activeCount * activeCount * avgStrength) / 100);
  }
  
  private initializeTracking(): void {
    // Set up periodic analysis
    setInterval(() => {
      this.calculateNFXNetworkEffects().catch(err =>
        logger.error('Failed to calculate NFX effects', { error: err })
      );
    }, 3600000); // Every hour
    
    logger.info('NFX Network Effects tracking initialized');
  }
}

// Export singleton instance
export const nfxNetworkEffects = NFXNetworkEffectsService.getInstance();