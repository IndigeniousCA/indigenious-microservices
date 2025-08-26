// AI & Machine Learning Types
// Core type definitions for AI/ML features

// Model types
export type ModelType = 
  | 'bid_matcher'
  | 'price_optimizer'
  | 'success_predictor'
  | 'anomaly_detector'
  | 'document_classifier'
  | 'language_detector'
  | 'sentiment_analyzer'
  | 'recommendation_engine'

export type ModelStatus = 'training' | 'ready' | 'updating' | 'error' | 'deprecated'

export interface MLModel {
  id: string
  type: ModelType
  version: string
  status: ModelStatus
  accuracy: number
  lastTrained: string
  trainingDataSize: number
  features: string[]
  performance: {
    latency: number
    throughput: number
    resourceUsage: number
  }
  culturalContext?: {
    indigenousDataUsed: boolean
    communityConsent: boolean
    biasAuditDate?: string
    culturalValidation?: boolean
  }
}

// Prediction types
export interface BidRecommendation {
  id: string
  rfqId: string
  businessId: string
  score: number
  confidence: number
  reasons: string[]
  suggestedPrice?: number
  successProbability: number
  culturalAlignment: number
  competitionLevel: 'low' | 'medium' | 'high'
  recommendations: {
    partnerships?: string[]
    certifications?: string[]
    improvements?: string[]
  }
  metadata: {
    modelVersion: string
    generatedAt: string
    featuresUsed: string[]
  }
}

export interface PriceOptimization {
  rfqId: string
  suggestedPrice: number
  priceRange: {
    min: number
    max: number
    optimal: number
  }
  confidence: number
  factors: {
    marketRate: number
    historicalWins: number
    competitionAnalysis: number
    valueProposition: number
  }
  insights: string[]
  culturalConsiderations?: string[]
}

// NLP types
export interface DocumentAnalysis {
  documentId: string
  type: string
  language: string
  summary: string
  keyRequirements: string[]
  entities: {
    organizations: string[]
    locations: string[]
    dates: string[]
    amounts: number[]
    certifications: string[]
  }
  sentiment: {
    overall: number
    aspects: Record<string, number>
  }
  culturalMarkers?: {
    indigenousReferences: string[]
    traditionalPractices: string[]
    communityMentions: string[]
  }
  confidence: number
}

export interface ConversationContext {
  sessionId: string
  userId: string
  language: string
  intent: string
  entities: Record<string, any>
  sentiment: number
  context: {
    previousIntents: string[]
    userProfile: any
    currentTask?: string
    culturalProtocol?: string
  }
  suggestedResponses: string[]
}

// Anomaly detection types
export interface AnomalyAlert {
  id: string
  type: 'bidding_pattern' | 'pricing_anomaly' | 'behavior_change' | 'compliance_risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: string
  entities: string[]
  description: string
  evidence: {
    dataPoints: unknown[]
    deviation: number
    historicalNorm: any
  }
  suggestedAction: string
  falsePositiveProbability: number
}

// Recommendation types
export interface SmartRecommendation {
  id: string
  type: 'opportunity' | 'partnership' | 'improvement' | 'training' | 'resource'
  targetId: string
  title: string
  description: string
  score: number
  impact: {
    revenue?: number
    efficiency?: number
    growth?: number
    cultural?: string
  }
  actions: Array<{
    label: string
    action: string
    priority: 'low' | 'medium' | 'high'
  }>
  reasoning: string[]
  expiresAt?: string
}

// Knowledge graph types
export interface KnowledgeNode {
  id: string
  type: 'business' | 'skill' | 'project' | 'community' | 'certification'
  label: string
  properties: Record<string, any>
  culturalSignificance?: {
    level: 'low' | 'medium' | 'high'
    context: string
    protocols: string[]
  }
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  properties: Record<string, any>
  temporal?: {
    startDate?: string
    endDate?: string
    seasonal?: boolean
  }
}

export interface NetworkInsight {
  type: 'cluster' | 'bridge' | 'influencer' | 'gap'
  nodes: string[]
  description: string
  opportunity?: string
  culturalContext?: string
}

// Training data types
export interface TrainingDataset {
  id: string
  name: string
  type: string
  size: number
  features: string[]
  labels: string[]
  splits: {
    train: number
    validation: number
    test: number
  }
  quality: {
    completeness: number
    accuracy: number
    balance: number
  }
  privacy: {
    anonymized: boolean
    consented: boolean
    retentionPeriod: string
  }
  culturalMetadata?: {
    indigenousData: boolean
    communities: string[]
    permissions: string[]
    restrictions: string[]
  }
}

// AI Ethics types
export interface BiasAudit {
  modelId: string
  auditDate: string
  auditor: string
  findings: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high'
    affected: string[]
    mitigation: string
  }>
  metrics: {
    fairness: number
    representation: Record<string, number>
    culturalSensitivity: number
  }
  recommendations: string[]
  nextAuditDate: string
}

export interface ExplainableDecision {
  decisionId: string
  modelId: string
  outcome: any
  confidence: number
  factors: Array<{
    feature: string
    value: unknown
    impact: number
    direction: 'positive' | 'negative'
  }>
  alternativeOutcomes: Array<{
    outcome: any
    probability: number
    changes: string[]
  }>
  explanation: string
  culturalConsiderations?: string[]
}

// Performance monitoring
export interface ModelPerformance {
  modelId: string
  period: string
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    auc?: number
  }
  usage: {
    predictions: number
    avgLatency: number
    errors: number
    feedback: {
      positive: number
      negative: number
      corrected: number
    }
  }
  drift: {
    detected: boolean
    magnitude?: number
    features?: string[]
    action?: string
  }
}

// Federated learning types
export interface FederatedModel {
  id: string
  globalModelId: string
  localModelId: string
  community: string
  version: string
  lastSync: string
  updates: number
  performance: {
    localAccuracy: number
    contributionScore: number
  }
  privacy: {
    differentialPrivacy: boolean
    epsilon?: number
    dataRetention: 'local' | 'none'
  }
}

// Cultural AI types
export interface CulturalContext {
  modelId: string
  communities: string[]
  languages: string[]
  protocols: Array<{
    type: string
    description: string
    implementation: string
  }>
  sensitivities: Array<{
    topic: string
    level: 'low' | 'medium' | 'high'
    handling: string
  }>
  validation: {
    validated: boolean
    validators: string[]
    date?: string
    feedback?: string
  }
}