/**
 * Network Effects Types with AI Integration
 * Comprehensive typing for all 16 network effects from NFX framework
 * Combined with Donella Meadows' systems thinking principles
 * Enhanced with ambient AI intelligence
 */

// The 16 Network Effects Types
export enum NetworkEffectType {
  // Core Network Effects
  DIRECT = 'direct',                           // Same-side effects (businesses benefit from more businesses)
  TWO_SIDED = 'two_sided',                    // Cross-side effects (buyers ↔ sellers)
  DATA = 'data',                              // More data improves product for all
  SOCIAL = 'social',                          // Value from social connections
  
  // Communication & Standards
  PROTOCOL = 'protocol',                      // Standardized communication
  PERSONAL_UTILITY = 'personal_utility',      // Personal tool gains network value
  PERSONAL = 'personal',                      // Value from personal contacts
  MARKET_NETWORK = 'market_network',          // Marketplace + professional network
  
  // Growth Patterns
  ASYMPTOTIC = 'asymptotic',                  // Value plateaus after point
  EXPERTISE = 'expertise',                    // Expert network adds value
  INSTANT_MESSAGING = 'instant_messaging',    // Real-time communication
  PLATFORM = 'platform',                      // Developer/integrator ecosystem
  
  // Unique Effects
  LANGUAGE = 'language',                      // Each language creates sub-network
  BELIEF = 'belief',                         // Shared mission creates value
  BANDWAGON = 'bandwagon',                   // Momentum perception
  PHYSICAL = 'physical'                      // Geographic/location based
}

// AI-Enhanced Network Effect Metrics
export interface NetworkEffectMetrics {
  type: NetworkEffectType;
  strength: number;                          // 0-100 AI-calculated score
  growth: number;                           // ML-predicted growth rate
  density: number;                          // AI-analyzed connection density
  engagement: number;                       // Behavioral AI participation rate
  retention: number;                        // Predictive stickiness factor
  viralCoefficient: number;                 // AI-optimized growth multiplier
  timeToValue: number;                      // ML-measured benefit realization
  switchingCost: number;                    // AI-calculated platform lock-in
  aiOptimizationScore: number;              // How well AI is enhancing this effect
  predictedPotential: number;               // AI forecast of maximum strength
}

// AI Agent Configuration for Network Monitoring
export interface NetworkAIAgent {
  id: string;
  name: string;
  type: 'monitor' | 'optimizer' | 'predictor' | 'intervener';
  networkEffects: NetworkEffectType[];      // Which effects this agent manages
  mlModels: string[];                       // Active ML models
  updateFrequency: number;                  // How often agent runs (ms)
  autonomyLevel: 'full' | 'supervised' | 'advisory';
}

// Specific AI-Enhanced Metrics for Each Network Effect
export interface DirectNetworkMetrics extends NetworkEffectMetrics {
  activeUsers: number;
  avgConnectionsPerUser: number;
  interactionFrequency: number;
  valuePerConnection: number;
  aiSuggestions: {
    optimalConnections: number;
    recommendedActions: string[];
    growthOpportunities: Opportunity[];
  };
}

// Type definitions for AI balancing
export interface Forecast {
  period: string;
  supply: number;
  demand: number;
  confidence: number;
}

export interface Action {
  type: string;
  description: string;
  automated: boolean;
}

export interface TwoSidedNetworkMetrics extends NetworkEffectMetrics {
  supplyCount: number;
  demandCount: number;
  liquidityRatio: number;
  matchRate: number;
  transactionVolume: number;
  crossSideAttractionScore: number;
  aiBalancing: {
    supplyDemandForecast: Forecast;
    recommendedInterventions: Intervention[];
    automatedActions: Action[];
  };
}

export interface DataNetworkMetrics extends NetworkEffectMetrics {
  dataPoints: number;
  modelAccuracy: number;
  predictionSuccess: number;
  insightGeneration: number;
  dataCompoundingRate: number;
  mlPerformance: {
    activeModels: number;
    averageAccuracy: number;
    insightsGenerated: number;
    valueCreated: number;
  };
}

// AI Opportunity Detection
export interface Opportunity {
  id: string;
  type: string;
  description: string;
  confidenceScore: number;                  // AI confidence in this opportunity
  potentialValue: number;
  requiredActions: string[];
  estimatedTimeframe: string;
  mlModelSource: string;                    // Which AI model identified this
}

// AI Intervention Suggestions
export interface Intervention {
  id: string;
  urgency: 'immediate' | 'soon' | 'planned';
  leveragePoint: number;                    // Meadows' leverage point
  description: string;
  expectedImpact: number;
  riskScore: number;
  automationPossible: boolean;
  requiresHumanApproval: boolean;
}

// Ambient AI Integration
export interface AmbientIntelligence {
  userExperienceEnhancements: {
    predictiveUI: boolean;                  // UI adapts before user acts
    contextualSuggestions: boolean;         // Right suggestion at right time
    invisibleOptimization: boolean;         // Background improvements
    naturalLanguageInterface: boolean;      // Conversational interaction
  };
  learningCapabilities: {
    userBehaviorModeling: boolean;
    communityPatternRecognition: boolean;
    culturalAdaptation: boolean;
    continuousImprovement: boolean;
  };
  privacyProtections: {
    federatedLearning: boolean;
    differentialPrivacy: boolean;
    localProcessing: boolean;
    userControlled: boolean;
  };
}

// Additional type definitions
export interface BoundaryHealth {
  integrity: number;
  permeability: number;
  adaptability: number;
}

export interface AIResilienceMetrics {
  robustness: number;
  redundancy: number;
  resourcefulness: number;
  rapidity: number;
}

export interface Outcome {
  scenario: string;
  probability: number;
  impact: number;
}

export interface Connection {
  from: string;
  to: string;
  strength: number;
  type: string;
}

export interface Behavior {
  id: string;
  pattern: string;
  frequency: number;
  impact: string;
}

export interface Risk {
  id: string;
  type: string;
  severity: number;
  likelihood: number;
  mitigation: string;
}

// Systems Thinking + AI Integration
export interface SystemsHealthMetrics {
  leveragePoints: AILeveragePointHealth[];
  feedbackLoops: AIFeedbackLoopMetrics[];
  systemBoundaries: BoundaryHealth;
  emergence: AIEmergenceIndicators;
  resilience: AIResilienceMetrics;
  aiSystemOptimization: {
    selfHealingActive: boolean;
    predictiveMaintenanceScore: number;
    adaptabilityIndex: number;
    antifragileScore: number;
  };
}

export interface AILeveragePointHealth {
  level: number;                            // 1-12 (1 being most powerful)
  name: string;
  currentState: number;                     // 0-100 AI-monitored health
  interventionOpportunity: number;          // AI-calculated potential
  aiRecommendations: string[];
  predictedOutcomes: Outcome[];
  automatedOptimization: boolean;
}

export interface AIFeedbackLoopMetrics {
  id: string;
  name: string;
  type: 'reinforcing' | 'balancing';
  strength: number;                         // AI-measured strength
  delayTime: number;                        // AI-optimized loop closure
  impact: number;
  health: number;
  aiEnhancements: {
    accelerationPossible: boolean;
    strengthIncreaseAvailable: number;
    predictedEvolution: string;
  };
}

// AI Pattern Recognition
export interface AIEmergenceIndicators {
  unexpectedPatterns: AIPattern[];
  selfOrganization: number;
  innovationRate: number;
  adaptationSpeed: number;
  aiDiscoveries: {
    hiddenConnections: Connection[];
    emergentBehaviors: Behavior[];
    futureOpportunities: Opportunity[];
  };
}

export interface AIPattern {
  id: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  firstDetected: Date;
  aiConfidence: number;
  predictedEvolution: string;
  suggestedExploitation: string[];
}

// Conversational AI Interface
export interface ConversationalAI {
  capabilities: {
    naturalLanguageQueries: boolean;
    contextualUnderstanding: boolean;
    proactiveAssistance: boolean;
    multiModalInteraction: boolean;
  };
  personalAssistant: {
    dailyBriefing: boolean;
    opportunityAlerts: boolean;
    relationshipManagement: boolean;
    taskAutomation: boolean;
  };
  communityIntelligence: {
    collectiveInsights: boolean;
    peerLearning: boolean;
    bestPracticeSharing: boolean;
    culturalRespect: boolean;
  };
}

// Comprehensive AI-Powered Network Health
export interface AINetworkHealth {
  timestamp: Date;
  overallHealth: number;                    // 0-100 AI-calculated
  networkEffects: NetworkEffectMetrics[];
  systemsHealth: SystemsHealthMetrics;
  prosperityIndex: number;                  // AI-weighted community impact
  sustainabilityScore: number;              // ML-predicted long-term viability
  interventionAlerts: AIInterventionAlert[];
  aiAgentStatus: NetworkAIAgent[];
  ambientIntelligence: AmbientIntelligence;
  predictions: {
    thirtyDayForecast: Forecast;
    growthOpportunities: Opportunity[];
    riskFactors: Risk[];
  };
}

export interface AIInterventionAlert {
  id: string;
  leveragePoint: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  networkEffect: NetworkEffectType;
  description: string;
  aiAnalysis: string;
  suggestedActions: {
    automated: string[];                    // AI can do these
    humanRequired: string[];                // Need human decision
  };
  potentialImpact: {
    bestCase: number;
    likelyCase: number;
    worstCase: number;
  };
  mlConfidence: number;
}

// Multi-Agent Orchestration
export interface AIOrchestration {
  agents: {
    networkMonitor: NetworkAIAgent;
    opportunityScout: NetworkAIAgent;
    relationshipBuilder: NetworkAIAgent;
    culturalAdvisor: NetworkAIAgent;
    systemOptimizer: NetworkAIAgent;
    prosperityMaximizer: NetworkAIAgent;
  };
  coordinationProtocol: {
    communicationMethod: 'event-driven' | 'scheduled' | 'continuous';
    consensusModel: 'voting' | 'weighted' | 'hierarchical';
    conflictResolution: 'priority' | 'compromise' | 'human-override';
  };
  collectiveIntelligence: {
    sharedMemory: boolean;
    crossLearning: boolean;
    emergentStrategies: boolean;
  };
}

// Cultural adaptation types
export interface StyleAdaptation {
  culture: string;
  formalityLevel: number;
  directness: number;
  contextImportance: number;
}

export interface SeasonalAdaptation {
  season: string;
  culturalSignificance: string;
  activityModifications: string[];
}

export interface CulturalMapping {
  concept: string;
  translations: Map<string, string>;
  culturalContext: string;
}

// Cultural AI Integration
export interface CulturalIntelligence {
  respectProtocols: {
    ceremonyCalendar: boolean;
    languagePreservation: boolean;
    elderWisdomIntegration: boolean;
    sacredKnowledgeProtection: boolean;
  };
  adaptations: {
    communicationStyle: Map<string, StyleAdaptation>;
    timingFlexibility: SeasonalAdaptation[];
    conceptTranslation: CulturalMapping[];
  };
  communityAlignment: {
    sevenGenerationsThinking: boolean;
    collectiveDecisionRespect: boolean;
    reciprocityPrinciples: boolean;
  };
}