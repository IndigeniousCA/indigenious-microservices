/**
 * Strategic Investment Types
 * Defines the structure for intelligence-driven investment opportunities
 */

export interface InvestmentOpportunity {
  id: string;
  
  // Intelligence source
  intelligenceSource: {
    type: 'escrow' | 'bonding' | 'rfq' | 'permit' | 'community';
    projectId: string;
    confidenceLevel: number; // 0-1
    timeHorizon: number; // months until public
  };
  
  // Target details
  target: {
    type: 'equity' | 'land' | 'jv' | 'debt' | 'commodity';
    name: string;
    currentValuation: number;
    projectedValuation: number;
    returnMultiple: number; // e.g., 10x
  };
  
  // Investment thesis
  thesis: {
    primaryDriver: string; // "Will win $500M contract"
    keyRisks: string[];
    catalysts: Array<{
      event: string;
      expectedDate: Date;
      impactMultiple: number;
    }>;
    exitStrategy: string;
  };
  
  // Timing
  timing: {
    windowOpen: Date;
    windowClose: Date; // When it becomes public
    optimalEntry: Date;
    holdPeriod: number; // months
  };
  
  // Financial model
  financials: {
    minimumInvestment: number;
    maximumInvestment: number;
    expectedIRR: number;
    cashflowProfile: 'immediate' | 'j-curve' | 'linear';
    breakeven: number; // months
  };
  
  // Risk assessment
  risk: {
    score: number; // 0-1
    factors: Array<{
      type: 'regulatory' | 'execution' | 'market' | 'political';
      description: string;
      mitigation: string;
      probability: number;
      impact: number;
    }>;
  };
  
  // Legal structure
  structure: {
    vehicle: 'direct' | 'spv' | 'fund' | 'syndicate';
    jurisdiction: string;
    taxEfficiency: number; // 0-1
    indigenousParticipation?: number; // percentage
  };
}

export interface InvestmentPortfolio {
  totalDeployed: number;
  totalValue: number;
  unrealizedGains: number;
  realizedGains: number;
  
  positions: Array<{
    opportunity: InvestmentOpportunity;
    entryDate: Date;
    entryPrice: number;
    currentValue: number;
    status: 'active' | 'exited' | 'written_off';
    performance: {
      multiple: number;
      irr: number;
      daysHeld: number;
    };
  }>;
  
  allocation: {
    byType: Record<string, number>;
    byRisk: Record<string, number>;
    byTimeHorizon: Record<string, number>;
    byGeography: Record<string, number>;
  };
  
  pipeline: {
    identified: number; // count
    inDueDiligence: number;
    approved: number;
    totalPotential: number; // dollar value
  };
}

export interface InvestmentDecision {
  opportunityId: string;
  decision: 'approve' | 'reject' | 'defer';
  amount: number;
  
  committee: {
    members: Array<{
      name: string;
      vote: 'approve' | 'reject' | 'abstain';
      comments?: string;
    }>;
    quorum: boolean;
    unanimous: boolean;
  };
  
  conditions?: Array<{
    type: 'pre-closing' | 'post-closing';
    description: string;
    deadline: Date;
    responsible: string;
  }>;
  
  rationale: {
    strengths: string[];
    concerns: string[];
    mitigations: string[];
  };
  
  // Automated scoring
  aiScore: {
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
    confidence: number;
    factors: Record<string, number>;
  };
}

export interface CashflowStrategy {
  // Reinvestment rules
  rules: {
    minCashReserve: number; // Always keep X months runway
    maxPortfolioConcentration: number; // No single investment > X%
    targetDeploymentRate: number; // Deploy X% of new cashflow
    rebalanceFrequency: 'weekly' | 'monthly' | 'quarterly';
  };
  
  // Allocation targets
  allocation: {
    highRisk: number; // 10-100x opportunities
    mediumRisk: number; // 5-10x opportunities  
    lowRisk: number; // 2-5x opportunities
    reserve: number; // Cash/equivalents
  };
  
  // Performance triggers
  triggers: {
    takeProfit: number; // Exit when position hits Xx
    stopLoss: number; // Exit if down X%
    rebalance: number; // Rebalance if allocation off by X%
  };
  
  // Fee recycling
  feeRecycling: {
    escrowFees: {
      percentage: number; // % to reinvest
      targetInvestments: string[];
    };
    bondingCommissions: {
      percentage: number;
      targetInvestments: string[];
    };
  };
}

export interface InvestmentIntelligence {
  // What we know that others don't
  projectPipeline: Array<{
    projectId: string;
    value: number;
    timeline: Date;
    contractors: string[]; // Who will bid
    winner?: string; // Our prediction
    confidence: number;
  }>;
  
  // Market movements
  marketSignals: Array<{
    type: 'expansion' | 'contraction' | 'pivot' | 'acquisition';
    entity: string;
    signal: string;
    impact: string;
    actionable: boolean;
  }>;
  
  // Relationship mapping
  networkEffects: Array<{
    entity1: string;
    entity2: string;
    relationship: string;
    strength: number;
    opportunities: string[];
  }>;
}

// Commission tiers for investment fund
export const INVESTMENT_FUND_TIERS = {
  seed: {
    minInvestment: 100000,
    carryPercentage: 20,
    managementFee: 2
  },
  growth: {
    minInvestment: 1000000,
    carryPercentage: 25,
    managementFee: 2.5
  },
  strategic: {
    minInvestment: 10000000,
    carryPercentage: 30,
    managementFee: 3
  }
} as const;