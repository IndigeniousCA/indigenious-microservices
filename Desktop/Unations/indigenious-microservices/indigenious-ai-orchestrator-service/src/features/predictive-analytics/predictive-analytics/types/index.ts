// Predictive Success Analytics Types

export interface BidPrediction {
  id: string
  rfqId: string
  businessId: string
  predictionDate: Date
  successProbability: number // 0-100
  confidenceLevel: 'high' | 'medium' | 'low'
  factors: PredictionFactor[]
  recommendations: Recommendation[]
  competitorAnalysis: CompetitorInsight[]
  historicalComparison: HistoricalPattern[]
  timelineAnalysis: TimelineInsight
  priceAnalysis: PriceInsight
  riskAssessment: RiskFactor[]
}

export interface PredictionFactor {
  category: 'experience' | 'price' | 'team' | 'timeline' | 'compliance' | 'indigenous-benefit' | 'past-performance' | 'location'
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  score: number // -100 to 100
  weight: number // importance in calculation
  explanation: string
  improvable: boolean
  improvementSuggestions?: string[]
}

export interface Recommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  expectedImpact: number // percentage points increase in success probability
  effort: 'low' | 'medium' | 'high'
  timeRequired: string
  actionItems: string[]
  relatedFactors: string[]
}

export interface CompetitorInsight {
  competitorId?: string
  competitorName?: string
  isAnonymized: boolean
  estimatedStrength: number // 0-100
  advantages: string[]
  yourAdvantages: string[]
  winRate?: number
  typicalBidRange?: {
    min: number
    max: number
  }
  pastCollaborations?: number
}

export interface HistoricalPattern {
  pattern: string
  frequency: number
  relevance: number // 0-100
  examples: HistoricalExample[]
  insight: string
}

export interface HistoricalExample {
  rfqId: string
  rfqTitle: string
  date: Date
  outcome: 'won' | 'lost' | 'withdrawn'
  similarity: number // 0-100
  keyFactors: string[]
}

export interface TimelineInsight {
  recommendedSubmissionTime: Date
  criticalMilestones: Milestone[]
  preparationTimeNeeded: number // hours
  rushPenalty: number // success probability reduction if rushed
  optimalStartDate: Date
}

export interface Milestone {
  name: string
  suggestedDate: Date
  importance: 'critical' | 'important' | 'helpful'
  dependencies: string[]
}

export interface PriceInsight {
  recommendedRange: {
    min: number
    max: number
    optimal: number
  }
  marketAverage: number
  priceCompetitiveness: number // 0-100
  marginAnalysis: {
    atOptimal: number
    atMin: number
    atMax: number
  }
  historicalWinningPrices: PriceDataPoint[]
}

export interface PriceDataPoint {
  date: Date
  amount: number
  wonBid: boolean
  projectSize: 'small' | 'medium' | 'large'
  similarity: number
}

export interface RiskFactor {
  id: string
  category: 'financial' | 'technical' | 'timeline' | 'compliance' | 'team' | 'external'
  risk: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigationStrategies: string[]
  monitoringRequired: boolean
}

export interface AnalyticsSnapshot {
  businessId: string
  period: 'week' | 'month' | 'quarter' | 'year' | 'all-time'
  startDate: Date
  endDate: Date
  metrics: {
    totalBids: number
    wonBids: number
    lostBids: number
    withdrawnBids: number
    winRate: number
    averageScore: number
    totalValue: number
    wonValue: number
    averageMargin: number
    medianBidSize: number
  }
  trends: {
    winRateTrend: 'improving' | 'stable' | 'declining'
    bidSizeTrend: 'increasing' | 'stable' | 'decreasing'
    marginTrend: 'improving' | 'stable' | 'declining'
  }
  strengths: StrengthWeakness[]
  weaknesses: StrengthWeakness[]
  opportunities: Opportunity[]
}

export interface StrengthWeakness {
  area: string
  description: string
  impact: string
  examples: string[]
  improvementPlan?: string
}

export interface Opportunity {
  id: string
  type: 'market' | 'capability' | 'partnership' | 'certification' | 'geographic'
  title: string
  description: string
  potentialValue: number
  effort: 'low' | 'medium' | 'high'
  timeframe: string
  requirements: string[]
  successProbability: number
}

export interface MLModel {
  id: string
  version: string
  type: 'success-prediction' | 'price-optimization' | 'timeline-estimation'
  accuracy: number
  lastTrained: Date
  trainingDataSize: number
  features: string[]
  performance: ModelPerformance
}

export interface ModelPerformance {
  precision: number
  recall: number
  f1Score: number
  confusionMatrix: number[][]
  featureImportance: { feature: string, importance: number }[]
}

export interface PredictiveInsight {
  id: string
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation'
  title: string
  description: string
  confidence: number
  relevantTo: string[] // business IDs
  validUntil: Date
  actionable: boolean
  actions?: InsightAction[]
}

export interface InsightAction {
  id: string
  action: string
  expectedOutcome: string
  effort: 'low' | 'medium' | 'high'
  deadline?: Date
}

export interface BenchmarkData {
  category: string
  yourScore: number
  industryAverage: number
  topPerformers: number
  indigenousAverage: number
  percentile: number
  improvementTarget: number
}

export interface SuccessPattern {
  id: string
  name: string
  description: string
  applicability: number // 0-100 how well it fits this business
  successRate: number
  requirements: string[]
  examples: string[]
  implementationGuide: string[]
}

export interface SeasonalTrend {
  period: 'monthly' | 'quarterly'
  data: SeasonalDataPoint[]
  insights: string[]
  recommendations: string[]
}

export interface SeasonalDataPoint {
  period: string
  bidsAvailable: number
  competitionLevel: number
  averageSuccessRate: number
  recommendedFocus: string[]
}