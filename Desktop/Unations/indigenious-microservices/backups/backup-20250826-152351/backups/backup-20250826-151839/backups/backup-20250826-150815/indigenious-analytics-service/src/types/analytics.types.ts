export interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  businessId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AggregatedMetric {
  metric: string;
  period: string;
  value: number;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  percentiles?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface IndigenousAnalytics {
  totalIndigenousBusinesses: number;
  totalRFQsToIndigenous: number;
  totalValueToIndigenous: number;
  growthRate: number;
  byRegion: Record<string, RegionMetrics>;
  byBand: Record<string, BandMetrics>;
  byIndustry: Record<string, IndustryMetrics>;
  certificationStats: CertificationStats;
  procurementTrends: ProcurementTrend[];
}

export interface RegionMetrics {
  businessCount: number;
  rfqCount: number;
  totalValue: number;
  averageResponseTime: number;
  winRate: number;
}

export interface BandMetrics {
  bandName: string;
  bandNumber: string;
  businessCount: number;
  activeRFQs: number;
  completedProjects: number;
  totalRevenue: number;
}

export interface IndustryMetrics {
  industry: string;
  businessCount: number;
  rfqCount: number;
  averageContractValue: number;
  growthRate: number;
}

export interface CertificationStats {
  totalCertified: number;
  pendingCertifications: number;
  expiringCertifications: number;
  certificationTypes: Record<string, number>;
  averageProcessingTime: number;
}

export interface ProcurementTrend {
  period: string;
  rfqCount: number;
  totalValue: number;
  indigenousParticipation: number;
  averageBidCount: number;
  successRate: number;
}

export interface RFQAnalytics {
  rfqId: string;
  title: string;
  status: string;
  createdAt: Date;
  responseCount: number;
  indigenousResponseCount: number;
  averageResponseTime: number;
  estimatedValue: number;
  actualValue?: number;
  winnerBusinessId?: string;
  isIndigenousWinner?: boolean;
  competitionLevel: 'low' | 'medium' | 'high';
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  category: string;
  responseCount: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface BusinessAnalytics {
  businessId: string;
  businessName: string;
  isIndigenous: boolean;
  metrics: {
    totalRFQsParticipated: number;
    totalRFQsWon: number;
    winRate: number;
    averageResponseTime: number;
    totalRevenue: number;
    averageContractValue: number;
    customerSatisfaction: number;
    growthRate: number;
  };
  performance: PerformanceMetrics;
  competitivePosition: CompetitivePosition;
  predictions: BusinessPredictions;
}

export interface PerformanceMetrics {
  onTimeDelivery: number;
  qualityScore: number;
  communicationScore: number;
  overallRating: number;
  trends: {
    revenue: TrendData;
    winRate: TrendData;
    satisfaction: TrendData;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  forecast?: number[];
}

export interface CompetitivePosition {
  marketShare: number;
  ranking: number;
  totalCompetitors: number;
  strengths: string[];
  opportunities: string[];
}

export interface BusinessPredictions {
  nextMonthRevenue: number;
  nextQuarterGrowth: number;
  rfqWinProbability: number;
  churnRisk: 'low' | 'medium' | 'high';
  expansionOpportunities: string[];
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  data: any;
  config: WidgetConfig;
  refreshInterval?: number;
  lastUpdated: Date;
}

export enum WidgetType {
  CHART = 'CHART',
  METRIC = 'METRIC',
  TABLE = 'TABLE',
  MAP = 'MAP',
  HEATMAP = 'HEATMAP',
  TIMELINE = 'TIMELINE',
  FUNNEL = 'FUNNEL',
  GAUGE = 'GAUGE',
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  dimensions?: string[];
  metrics?: string[];
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  colors?: string[];
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: ReportSchedule;
  recipients?: string[];
  filters: Record<string, any>;
  sections: ReportSection[];
  generatedAt?: Date;
  fileUrl?: string;
  status: ReportStatus;
}

export enum ReportType {
  PROCUREMENT = 'PROCUREMENT',
  INDIGENOUS = 'INDIGENOUS',
  FINANCIAL = 'FINANCIAL',
  COMPLIANCE = 'COMPLIANCE',
  PERFORMANCE = 'PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  HTML = 'HTML',
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  timezone?: string;
  enabled: boolean;
}

export interface ReportSection {
  title: string;
  type: 'text' | 'chart' | 'table' | 'metric';
  content: any;
  order: number;
}

export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SCHEDULED = 'SCHEDULED',
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: FilterCondition[];
  dateRange?: DateRange;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
  offset?: number;
  orderBy?: OrderBy[];
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';
  value: any;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: ModelType;
  target: string;
  features: string[];
  accuracy: number;
  trainedAt: Date;
  version: string;
  status: ModelStatus;
}

export enum ModelType {
  REGRESSION = 'REGRESSION',
  CLASSIFICATION = 'CLASSIFICATION',
  CLUSTERING = 'CLUSTERING',
  TIME_SERIES = 'TIME_SERIES',
  RECOMMENDATION = 'RECOMMENDATION',
}

export enum ModelStatus {
  TRAINING = 'TRAINING',
  READY = 'READY',
  FAILED = 'FAILED',
  DEPRECATED = 'DEPRECATED',
}