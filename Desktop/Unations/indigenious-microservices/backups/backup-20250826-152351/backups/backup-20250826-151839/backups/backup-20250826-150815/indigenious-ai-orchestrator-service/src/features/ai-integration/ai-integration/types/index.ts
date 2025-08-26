/**
 * Shared type definitions for AI Integration services
 * 
 * @author Indigenous Platform Team
 * @since 2025-01-12
 */

// Cross-system types
export interface SystemState {
  systemId: string;
  status: 'healthy' | 'degraded' | 'offline';
  lastUpdate: Date;
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  requestsPerMinute: number;
  averageLatency: number;
  errorRate: number;
  successRate: number;
}

export interface LearningEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  businessIds: string[];
  eventData: Record<string, unknown>;
  culturalContext?: CulturalContext;
  securityClassification: 'public' | 'business_sensitive' | 'cultural_sacred';
}

export interface Pattern {
  patternId: string;
  patternType: string;
  confidence: number;
  occurrences: number;
  businessCombinations: string[][];
  culturalFactors: CulturalFactor[];
  predictiveValue: number;
  lastUpdated: Date;
}

export interface CulturalContext {
  nation: string;
  ceremonies?: string[];
  protocols?: string[];
  seasonalFactors?: string[];
  elderApproval?: boolean;
}

export interface CulturalFactor {
  factorType: string;
  description: string;
  significance: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  corrections: ValidationCorrection[];
  validationLayers: ValidationLayer[];
  humanReviewRequired: boolean;
  culturalReviewRequired: boolean;
  validationId: string;
}

export interface ValidationIssue {
  issueType: 'hallucination' | 'impossible_value' | 'contradiction' | 'bias' | 'cultural_violation' | 'data_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedField?: string;
}

export interface ValidationCorrection {
  correctionType: 'value_adjustment' | 'confidence_reduction' | 'scope_limitation' | 'complete_rejection';
  originalValue: any;
  correctedValue: any;
  reason: string;
}

export interface ValidationLayer {
  layerName: string;
  status: 'passed' | 'warning' | 'failed';
  confidence: number;
  issues: string[];
}

export interface HyperIntelligence {
  unifiedPredictions: Prediction[];
  synergies: SystemSynergy[];
  amplifiedPatterns: AmplifiedPattern[];
  metaInsights: MetaInsight[];
  compoundNetworkEffects: CompoundNetworkEffect;
  culturalWisdom: CulturalWisdom;
  emergentPredictions: EmergentPrediction[];
}

export interface Prediction {
  predictionId: string;
  type: string;
  value: any;
  confidence: number;
  probability: number;
  factors?: Factor[];
  timeline?: string;
  validationId?: string;
  validationConfidence?: number;
  humanReviewRequired?: boolean;
  culturalReviewRequired?: boolean;
}

export interface Factor {
  name: string;
  weight: number;
  description: string;
}

export interface SystemSynergy {
  synergyId: string;
  systems: string[];
  type: string;
  amplificationFactor: number;
  description: string;
}

export interface AmplifiedPattern {
  patternId: string;
  originalPattern: Pattern;
  amplificationSources: string[];
  amplifiedConfidence: number;
  networkEffect: number;
}

export interface MetaInsight {
  insightId: string;
  type: string;
  description: string;
  confidence: number;
  contributingSystems: string[];
}

export interface CompoundNetworkEffect {
  totalAmplification: number;
  breakdown: {
    base: number;
    systemConnections: number;
    patternSynergies: number;
    culturalAlignment: number;
  };
  description: string;
  economicImpact: number;
}

export interface CulturalWisdom {
  alignmentScore: number;
  protocols: string[];
  recommendations: string[];
}

export interface EmergentPrediction {
  predictionId: string;
  type: string;
  description: string;
  confidence: number;
  systemCount: number;
  predictedOutcome: string;
  timeframe: string;
}

// User activity types
export interface UserActivity {
  userId: string;
  businessId: string;
  currentAction?: string;
  recentActions: string[];
  sessionDuration: number;
  lastActivity: Date;
}

// Market conditions
export interface MarketCondition {
  conditionId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  affectedSectors: string[];
  description: string;
  timestamp: Date;
}

// Network position
export interface NetworkPosition {
  businessId: string;
  centrality: number;
  influence: number;
  connections: number;
  growthRate: number;
}