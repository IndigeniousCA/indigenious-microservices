// Market Intelligence Types
// TypeScript types for market analytics and intelligence

export interface MarketTrend {
  id: string
  period: string
  sector: string
  totalValue: number
  opportunityCount: number
  averageValue: number
  growthRate: number
  competitionLevel: 'low' | 'medium' | 'high'
  seasonality: 'peak' | 'normal' | 'low'
}

export interface SectorAnalysis {
  id: string
  sector: string
  totalMarketSize: number
  indigenousParticipation: number
  participationRate: number
  averageContractSize: number
  competitorCount: number
  barrierLevel: 'low' | 'medium' | 'high'
  growthPotential: number
  keyPlayers: string[]
  emergingTrends: string[]
}

export interface GeographicInsight {
  id: string
  region: string
  province: string
  lat: number
  lng: number
  opportunityCount: number
  totalValue: number
  indigenousBusinessCount: number
  marketPenetration: number
  averageCompetition: number
  topSectors: string[]
}

export interface OpportunityRecommendation {
  id: string
  rfqId: string
  title: string
  sector: string
  value: number
  matchScore: number
  winProbability: number
  competitionLevel: 'low' | 'medium' | 'high'
  reasoning: string[]
  requirements: string[]
  deadline: string
  recommendedActions: string[]
  similarWins: string[]
}

export interface CompetitorAnalysis {
  id: string
  competitorName: string
  businessType: 'indigenous' | 'non_indigenous'
  winRate: number
  averageContractValue: number
  primarySectors: string[]
  strengths: string[]
  weaknesses: string[]
  recentWins: Array<{
    rfqId: string
    title: string
    value: number
    date: string
  }>
  marketShare: number
}

export interface PriceIntelligence {
  id: string
  sector: string
  serviceType: string
  region?: string
  averagePrice: number
  priceRange: {
    min: number
    max: number
    percentile25: number
    percentile75: number
  }
  pricingFactors: Array<{
    factor: string
    impact: 'increase' | 'decrease'
    magnitude: number
  }>
  lastUpdated: string
  sampleSize: number
}

export interface PerformanceMetric {
  id: string
  businessId: string
  period: string
  winRate: number
  bidCount: number
  winCount: number
  totalValue: number
  averageContractValue: number
  responseTime: number // hours
  qualityScore: number
  indigenousContentPercentage: number
  customerSatisfaction: number
  growthRate: number
}

export interface MarketForecast {
  id: string
  sector: string
  region?: string
  timeframe: 'quarter' | 'year' | 'multi_year'
  forecastPeriod: string
  predictedOpportunities: number
  predictedValue: number
  confidenceLevel: number
  trendDirection: 'up' | 'down' | 'stable'
  keyDrivers: string[]
  risks: string[]
  recommendations: string[]
}

export interface OpportunityScore {
  rfqId: string
  businessId: string
  overallScore: number
  factors: {
    capability: number
    experience: number
    capacity: number
    location: number
    pricing: number
    indigenousContent: number
    pastPerformance: number
  }
  reasoning: string[]
  improvementSuggestions: string[]
  calculatedAt: string
}

export interface MarketAlert {
  id: string
  type: 'opportunity' | 'trend' | 'competitor' | 'price'
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  data: unknown
  createdAt: string
  expiresAt?: string
  actionRequired: boolean
  actionUrl?: string
}

export interface BenchmarkData {
  metric: string
  userValue: number
  marketAverage: number
  topPerformers: number
  percentile: number
  trend: 'improving' | 'declining' | 'stable'
  recommendations: string[]
}

export interface MarketCapacity {
  sector: string
  region: string
  totalDemand: number
  currentSupply: number
  utilizationRate: number
  supplyGap: number
  emergingNeeds: string[]
  scalingOpportunities: string[]
}

export interface IndigenousContentMetrics {
  totalContracts: number
  indigenousValue: number
  indigenousPercentage: number
  employmentCreated: number
  communityImpact: number
  supplierDiversity: number
  capacityBuilding: number
  economicMultiplier: number
  regionBreakdown: Array<{
    region: string
    value: number
    percentage: number
  }>
  sectorBreakdown: Array<{
    sector: string
    value: number
    percentage: number
  }>
}

export interface MarketIntelligenceFilters {
  sectors?: string[]
  regions?: string[]
  contractValues?: {
    min: number
    max: number
  }
  timeRange?: {
    start: string
    end: string
  }
  businessTypes?: ('indigenous' | 'non_indigenous')[]
  competitionLevel?: ('low' | 'medium' | 'high')[]
}

export interface MarketDashboardData {
  totalMarketSize: number
  indigenousParticipation: number
  opportunityCount: number
  averageWinRate: number
  marketGrowth: number
  
  trends: MarketTrend[]
  sectors: SectorAnalysis[]
  regions: GeographicInsight[]
  recommendations: OpportunityRecommendation[]
  alerts: MarketAlert[]
  
  userPerformance: PerformanceMetric
  benchmarks: BenchmarkData[]
  forecasts: MarketForecast[]
  
  recentActivity: Array<{
    type: string
    title: string
    date: string
    value?: number
  }>
}

export interface ReportConfig {
  id: string
  name: string
  type: 'market_trends' | 'performance' | 'opportunities' | 'benchmarking'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  filters: MarketIntelligenceFilters
  recipients: string[]
  format: 'pdf' | 'excel' | 'dashboard'
  active: boolean
  nextRun: string
}

export interface AnalyticsEvent {
  id: string
  userId: string
  event: string
  data: Record<string, any>
  timestamp: string
  sessionId: string
}

export interface MLModelConfig {
  modelId: string
  type: 'opportunity_scoring' | 'price_prediction' | 'market_forecasting'
  version: string
  accuracy: number
  lastTrained: string
  features: string[]
  hyperparameters: Record<string, any>
  active: boolean
}