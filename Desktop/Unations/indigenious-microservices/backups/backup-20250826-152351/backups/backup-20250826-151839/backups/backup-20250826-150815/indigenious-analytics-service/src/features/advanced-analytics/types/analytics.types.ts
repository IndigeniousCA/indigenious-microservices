// Advanced Analytics Types
// Comprehensive type definitions for analytics and reporting

export interface AnalyticsMetric {
  id: string
  name: string
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  trend: 'up' | 'down' | 'stable'
  unit?: 'currency' | 'percentage' | 'count' | 'days'
  target?: number
  status?: 'on-track' | 'at-risk' | 'off-track'
}

export interface ComplianceMetrics {
  overallCompliance: number
  targetCompliance: number
  totalProcurement: number
  indigenousProcurement: number
  contractCount: number
  indigenousContracts: number
  departments: DepartmentCompliance[]
  historicalTrend: ComplianceTrend[]
  projectedCompliance: number
  complianceGap?: number
}

export interface DepartmentCompliance {
  departmentId: string
  departmentName: string
  totalSpend: number
  indigenousSpend: number
  complianceRate: number
  contractCount: number
  indigenousContractCount: number
  status: 'compliant' | 'approaching' | 'non-compliant'
  trend: 'improving' | 'declining' | 'stable'
  topSuppliers: string[]
}

export interface ComplianceTrend {
  date: string
  complianceRate: number
  totalSpend: number
  indigenousSpend: number
  target: number
}

export interface BusinessAnalytics {
  businessId: string
  businessName: string
  winRate: number
  totalBids: number
  wonBids: number
  totalRevenue: number
  averageContractValue: number
  growthRate: number
  performanceScore: number
  strengths: string[]
  opportunities: string[]
  competitivePosition: number
  marketShare?: number
}

export interface CommunityImpact {
  communityId: string
  communityName: string
  nation: string
  totalRevenue: number
  businessCount: number
  employmentCreated: number
  employmentSustained: number
  capacityBuildingHours: number
  infrastructureInvestment: number
  socialImpactScore: number
  economicMultiplier: number
  beneficiaries: number
}

export interface Report {
  id: string
  name: string
  type: ReportType
  description?: string
  createdAt: string
  createdBy: string
  schedule?: ReportSchedule
  recipients?: string[]
  format: ReportFormat[]
  parameters: ReportParameters
  lastRun?: string
  nextRun?: string
  status: 'active' | 'paused' | 'draft'
}

export type ReportType = 
  | 'compliance'
  | 'executive'
  | 'performance'
  | 'impact'
  | 'financial'
  | 'operational'
  | 'custom'

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  dayOfWeek?: number
  dayOfMonth?: number
  time?: string
  timezone: string
  customCron?: string
}

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'powerpoint'

export interface ReportParameters {
  dateRange?: DateRange
  departments?: string[]
  regions?: string[]
  businessTypes?: string[]
  categories?: string[]
  metrics?: string[]
  filters?: Record<string, any>
  groupBy?: string[]
  sortBy?: string
  includeCharts?: boolean
  includeRawData?: boolean
}

export interface DateRange {
  start: string
  end: string
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'lastMonth' | 'lastQuarter' | 'lastYear' | 'custom'
}

export interface Insight {
  id: string
  type: InsightType
  severity: 'info' | 'warning' | 'critical' | 'positive'
  title: string
  description: string
  metric?: string
  value?: number
  change?: number
  recommendation?: string
  actions?: InsightAction[]
  createdAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

export type InsightType = 
  | 'anomaly'
  | 'trend'
  | 'prediction'
  | 'opportunity'
  | 'risk'
  | 'achievement'
  | 'recommendation'

export interface InsightAction {
  label: string
  action: string
  params?: Record<string, any>
}

export interface AnalyticsDashboard {
  id: string
  name: string
  description?: string
  type: 'executive' | 'operational' | 'compliance' | 'custom'
  layout: DashboardLayout[]
  filters: DashboardFilter[]
  refreshInterval?: number
  createdBy: string
  createdAt: string
  updatedAt: string
  shared: boolean
  permissions: string[]
}

export interface DashboardLayout {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: WidgetConfig
}

export type WidgetType = 
  | 'metric'
  | 'chart'
  | 'table'
  | 'map'
  | 'list'
  | 'timeline'
  | 'heatmap'
  | 'gauge'
  | 'funnel'

export interface WidgetConfig {
  dataSource: string
  metrics?: string[]
  dimensions?: string[]
  filters?: Record<string, any>
  visualization?: VisualizationConfig
  refreshInterval?: number
}

export interface VisualizationConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'bubble' | 'radar' | 'sankey'
  colors?: string[]
  legend?: boolean
  gridLines?: boolean
  animations?: boolean
  tooltips?: boolean
  xAxis?: AxisConfig
  yAxis?: AxisConfig
}

export interface AxisConfig {
  label?: string
  type?: 'linear' | 'logarithmic' | 'category' | 'time'
  min?: number
  max?: number
  tickInterval?: number
  format?: string
}

export interface DashboardFilter {
  id: string
  type: 'date' | 'select' | 'multiselect' | 'range' | 'search'
  label: string
  field: string
  options?: FilterOption[]
  defaultValue?: any
  required?: boolean
}

export interface FilterOption {
  label: string
  value: unknown
}

export interface Forecast {
  metric: string
  currentValue: number
  predictions: ForecastPoint[]
  confidence: number
  methodology: string
  factors: string[]
  lastUpdated: string
}

export interface ForecastPoint {
  date: string
  value: number
  upperBound: number
  lowerBound: number
  probability: number
}

export interface AnalyticsQuery {
  metrics: string[]
  dimensions?: string[]
  filters?: QueryFilter[]
  dateRange?: DateRange
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

export interface QueryFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between'
  value: unknown
}

export interface OrderBy {
  field: string
  direction: 'asc' | 'desc'
}

export interface AnalyticsResult {
  query: AnalyticsQuery
  data: unknown[]
  totals?: Record<string, number>
  metadata: {
    executionTime: number
    rowCount: number
    fromCache: boolean
    lastUpdated: string
  }
}

export interface BenchmarkData {
  metric: string
  yourValue: number
  industryAverage: number
  topPerformers: number
  percentile: number
  trend: 'improving' | 'declining' | 'stable'
  recommendations: string[]
}

export interface AlertRule {
  id: string
  name: string
  description?: string
  metric: string
  condition: AlertCondition
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  recipients: string[]
  channels: ('email' | 'sms' | 'push' | 'webhook')[]
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  enabled: boolean
  lastTriggered?: string
  triggerCount: number
}

export interface AlertCondition {
  type: 'threshold' | 'change' | 'anomaly' | 'trend'
  operator: 'above' | 'below' | 'equals' | 'between'
  timeWindow?: string
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count'
}

export interface DataExport {
  id: string
  name: string
  type: 'analytics' | 'report' | 'raw'
  format: ReportFormat
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  expiresAt?: string
  createdAt: string
  createdBy: string
  size?: number
  rowCount?: number
}