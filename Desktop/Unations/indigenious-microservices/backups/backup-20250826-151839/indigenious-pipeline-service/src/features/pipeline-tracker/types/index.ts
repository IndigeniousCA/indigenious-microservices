// Visual Pipeline Tracker Types

export interface Pipeline {
  id: string
  businessId: string
  name: string
  description?: string
  createdDate: Date
  lastUpdated: Date
  stages: PipelineStage[]
  opportunities: Opportunity[]
  metrics: PipelineMetrics
  settings: PipelineSettings
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  icon?: string
  description?: string
  automations?: StageAutomation[]
  averageDuration?: number // days
  conversionRate?: number // percentage to next stage
}

export interface Opportunity {
  id: string
  rfqId?: string
  title: string
  client: string
  value: number
  probability: number
  stage: string
  status: 'active' | 'won' | 'lost' | 'stalled' | 'abandoned'
  priority: 'critical' | 'high' | 'medium' | 'low'
  assignedTo: string[]
  tags: string[]
  dates: {
    created: Date
    deadline?: Date
    lastActivity: Date
    stageEntered: Date
    expectedClose?: Date
  }
  activities: Activity[]
  notes: string
  score?: number
  nextAction?: NextAction
  blockers?: Blocker[]
  competitors?: string[]
  documents?: Document[]
  customFields?: Record<string, any>
}

export interface Activity {
  id: string
  type: 'note' | 'email' | 'call' | 'meeting' | 'document' | 'status-change' | 'assignment'
  title: string
  description?: string
  timestamp: Date
  userId: string
  userName: string
  metadata?: Record<string, any>
}

export interface NextAction {
  action: string
  dueDate?: Date
  assignedTo?: string
  priority: 'urgent' | 'normal' | 'low'
  completed: boolean
}

export interface Blocker {
  id: string
  issue: string
  severity: 'critical' | 'major' | 'minor'
  dateIdentified: Date
  resolvedDate?: Date
  assignedTo?: string
  resolution?: string
}

export interface Document {
  id: string
  name: string
  type: string
  url: string
  uploadDate: Date
  uploadedBy: string
  size: number
  version?: number
}

export interface PipelineMetrics {
  totalOpportunities: number
  totalValue: number
  weightedValue: number
  averageValue: number
  winRate: number
  averageCycleTime: number // days
  stageConversion: Record<string, number>
  velocityTrend: 'increasing' | 'stable' | 'decreasing'
  healthScore: number
}

export interface PipelineSettings {
  defaultStages: string[]
  probabilityCalculation: 'manual' | 'automatic' | 'hybrid'
  staleOpportunityDays: number
  warningThresholds: {
    daysInStage: number
    daysToDeadline: number
    inactivityDays: number
  }
  automationEnabled: boolean
  collaborationEnabled: boolean
}

export interface StageAutomation {
  trigger: 'enter' | 'exit' | 'duration' | 'condition'
  condition?: string
  actions: AutomationAction[]
}

export interface AutomationAction {
  type: 'notify' | 'assign' | 'update-field' | 'create-task' | 'send-email'
  config: Record<string, any>
}

export interface PipelineView {
  id: string
  name: string
  type: 'kanban' | 'list' | 'calendar' | 'forecast' | 'analytics'
  filters: ViewFilter[]
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  visibleFields: string[]
  layout?: ViewLayout
}

export interface ViewFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in'
  value: unknown
}

export interface ViewLayout {
  columns?: string[]
  swimlanes?: string
  cardSize?: 'compact' | 'standard' | 'detailed'
  showMetrics?: boolean
  colorCoding?: 'stage' | 'value' | 'probability' | 'priority'
}

export interface ForecastData {
  period: string
  projected: number
  committed: number
  bestCase: number
  worstCase: number
  closed: number
  target?: number
}

export interface VelocityMetric {
  period: string
  created: number
  progressed: number
  won: number
  lost: number
  cycleTime: number
}

export interface StageMetrics {
  stageName: string
  count: number
  value: number
  averageTime: number
  conversionRate: number
  bottlenecks: string[]
}

export interface TeamPerformance {
  userId: string
  userName: string
  metrics: {
    opportunities: number
    value: number
    winRate: number
    averageDealSize: number
    activitiesPerWeek: number
    responseTime: number // hours
  }
  trends: {
    winRate: 'improving' | 'stable' | 'declining'
    activity: 'increasing' | 'stable' | 'decreasing'
  }
}

export interface PipelineAlert {
  id: string
  type: 'deadline' | 'stalled' | 'at-risk' | 'milestone' | 'anomaly'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  opportunityId?: string
  timestamp: Date
  acknowledged: boolean
  actionRequired?: string
}

export interface OpportunityTemplate {
  id: string
  name: string
  category: string
  stages: string[]
  defaultValues: Partial<Opportunity>
  requiredFields: string[]
  customFields: CustomField[]
}

export interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'
  options?: string[]
  required: boolean
  defaultValue?: any
  validation?: string
}

export interface BulkAction {
  action: 'update-stage' | 'assign' | 'tag' | 'delete' | 'export'
  opportunityIds: string[]
  parameters: Record<string, any>
}

export interface PipelineSnapshot {
  id: string
  date: Date
  metrics: PipelineMetrics
  stageDistribution: Record<string, number>
  topOpportunities: Opportunity[]
  comparison?: {
    previousPeriod: PipelineMetrics
    change: Record<string, number>
  }
}

export interface CollaborationUpdate {
  userId: string
  userName: string
  action: string
  timestamp: Date
  details?: string
  opportunityId?: string
}