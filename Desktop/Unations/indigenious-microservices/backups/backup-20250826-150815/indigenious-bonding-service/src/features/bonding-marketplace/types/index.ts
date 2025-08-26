/**
 * Bonding Marketplace Types
 * The intelligence layer for $1T+ in Canadian projects
 */

export interface BondingOpportunity {
  id: string;
  
  // Project details
  project: {
    name: string;
    description: string;
    value: number;
    location: {
      province: string;
      city?: string;
      isReserve: boolean;
      reserveName?: string;
    };
    category: ProjectCategory;
    stage: ProjectStage;
  };
  
  // Bonding requirements
  bonding: {
    bidBond?: {
      required: boolean;
      amount: number;
      percentage: number;
    };
    performanceBond?: {
      required: boolean;
      amount: number;
      percentage: number;
    };
    laborMaterialBond?: {
      required: boolean;
      amount: number;
      percentage: number;
    };
    totalBondingRequired: number;
  };
  
  // Key dates
  timeline: {
    rfqPosted: Date;
    bidDeadline: Date;
    projectStart: Date;
    projectEnd: Date;
    daysUntilDeadline: number;
  };
  
  // Contractor info
  contractor?: {
    id: string;
    name: string;
    type: 'indigenous' | 'general' | 'international';
    
    // Platform-verified metrics
    metrics: {
      completedProjects: number;
      totalValue: number;
      onTimeRate: number;
      defaultRate: number;
      platformReputation: number;
    };
    
    // Financial health (from our data)
    financial: {
      annualRevenue?: number;
      quickRatio?: number;
      workingCapital?: number;
      creditScore?: number;
    };
  };
  
  // Intelligence insights
  intelligence: {
    riskScore: number; // 0-1
    competitionLevel: 'low' | 'medium' | 'high';
    estimatedBidders: number;
    successProbability: number; // For the contractor
    
    // Why this is a good opportunity
    highlights: string[];
    
    // Potential issues
    warnings?: string[];
  };
  
  // Compliance flags
  compliance: {
    c5Eligible: boolean; // Counts toward 5% Indigenous
    environmentalAssessment: boolean;
    unionRequirements: boolean;
    securityClearance: boolean;
  };
}

export interface SuretyCompanyProfile {
  id: string;
  company: {
    name: string;
    license: string;
    rating: string; // AM Best rating
  };
  
  // What they're looking for
  preferences: {
    minProjectSize: number;
    maxProjectSize: number;
    sectors: ProjectCategory[];
    regions: string[];
    contractorTypes: Array<'indigenous' | 'general' | 'international'>;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  
  // Platform relationship
  platform: {
    joinedDate: Date;
    bondsIssued: number;
    totalPremiums: number;
    commissionTier: CommissionTier;
    exclusiveRegions?: string[];
  };
  
  // Performance metrics
  metrics: {
    responseTime: number; // hours
    approvalRate: number; // percentage
    claimsRate: number; // percentage
    avgPremiumRate: number; // percentage
  };
}

export interface BondApplication {
  id: string;
  opportunityId: string;
  contractorId: string;
  suretyCompanyId?: string;
  
  status: BondApplicationStatus;
  
  // What contractor is requesting
  request: {
    bondTypes: Array<'bid' | 'performance' | 'labor_material'>;
    totalBondAmount: number;
    projectDetails: any; // Simplified project info
  };
  
  // Our platform's assessment
  assessment: {
    riskScore: number;
    recommendedPremium: number;
    strengthFactors: string[];
    weaknessFactors: string[];
    
    // Historical performance
    contractorHistory: {
      previousBonds: number;
      successfulCompletions: number;
      claims: number;
      avgProjectSize: number;
    };
  };
  
  // Surety decision
  decision?: {
    approved: boolean;
    premiumRate: number;
    premiumAmount: number;
    conditions?: string[];
    decisionDate: Date;
  };
  
  // Commission tracking
  commission?: {
    rate: number; // Our percentage
    amount: number;
    status: 'pending' | 'invoiced' | 'paid';
  };
}

export interface MarketIntelligence {
  // Overview metrics
  overview: {
    totalOpportunities: number;
    totalValue: number;
    avgProjectSize: number;
    
    // By category
    byCategory: Record<ProjectCategory, {
      count: number;
      value: number;
      avgBondRate: number;
    }>;
    
    // By region
    byRegion: Record<string, {
      count: number;
      value: number;
      topSectors: ProjectCategory[];
    }>;
  };
  
  // Trends
  trends: {
    volumeTrend: 'increasing' | 'stable' | 'decreasing';
    avgProjectSizeTrend: number; // % change
    bondingRatesTrend: number; // % change
    
    // Hot sectors
    growingSectors: Array<{
      category: ProjectCategory;
      growthRate: number;
      opportunities: number;
    }>;
  };
  
  // Opportunities
  opportunities: {
    underservedMarkets: Array<{
      region: string;
      category: ProjectCategory;
      gap: number; // $ value not covered
      reason: string;
    }>;
    
    // High-value targets
    premiumOpportunities: BondingOpportunity[];
  };
}

// Enums and supporting types
export type ProjectCategory = 
  | 'construction' 
  | 'infrastructure' 
  | 'mining' 
  | 'energy' 
  | 'forestry'
  | 'technology'
  | 'manufacturing'
  | 'environmental'
  | 'transportation'
  | 'utilities';

export type ProjectStage = 
  | 'planning'
  | 'rfq_open'
  | 'bid_evaluation'
  | 'awarded'
  | 'in_progress'
  | 'completed';

export type BondApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_info_required'
  | 'approved'
  | 'rejected'
  | 'issued';

export interface CommissionTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  baseRate: number; // Base commission percentage
  volumeBonus: number; // Additional percentage for volume
  benefits: string[];
}

// Commission structure
export const COMMISSION_TIERS: Record<string, CommissionTier> = {
  bronze: {
    tier: 'bronze',
    baseRate: 0.30, // 30%
    volumeBonus: 0,
    benefits: ['Basic opportunity alerts', 'Standard support']
  },
  silver: {
    tier: 'silver',
    baseRate: 0.32, // 32%
    volumeBonus: 0.03, // +3% for volume
    benefits: ['Priority alerts', 'Dedicated support', 'Monthly analytics']
  },
  gold: {
    tier: 'gold',
    baseRate: 0.35, // 35%
    volumeBonus: 0.05, // +5% for volume
    benefits: ['First access to opportunities', 'White-glove support', 'Real-time analytics', 'API access']
  },
  platinum: {
    tier: 'platinum',
    baseRate: 0.35, // 35%
    volumeBonus: 0.10, // +10% for volume
    benefits: ['Exclusive territories', 'Co-branded solutions', 'Direct integration', 'Strategic partnership']
  }
};