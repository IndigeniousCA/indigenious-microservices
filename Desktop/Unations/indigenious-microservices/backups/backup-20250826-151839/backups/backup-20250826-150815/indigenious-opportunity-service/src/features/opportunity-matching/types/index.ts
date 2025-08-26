// Automatic Opportunity Matching Types

export interface OpportunityMatcher {
  // Core matching engine
  engine: {
    // Match RFQs to businesses
    matchOpportunities: (rfq: RFQ, businesses: Business[]) => OpportunityMatch[]
    
    // Create optimal teams
    buildWinningTeam: (rfq: RFQ, leadBusiness: Business) => ProposedTeam
    
    // Real-time monitoring
    monitorNewOpportunities: () => OpportunityStream
    
    // Success prediction
    predictWinProbability: (match: OpportunityMatch) => WinPrediction
  }
  
  // Notification system
  notifications: {
    // Alert businesses of matches
    sendMatchAlert: (match: OpportunityMatch) => NotificationResult
    
    // Partner invitations
    invitePartners: (team: ProposedTeam) => InvitationResult[]
    
    // Deadline reminders
    scheduleReminders: (opportunity: Opportunity) => ReminderSchedule
  }
  
  // Analytics
  analytics: {
    // Track match performance
    trackMatchSuccess: (matchId: string) => MatchPerformance
    
    // Improve algorithms
    learnFromOutcomes: (outcomes: MatchOutcome[]) => ModelUpdate
    
    // Generate insights
    generateInsights: (businessId: string) => MatchInsights
  }
}

export interface RFQ {
  id: string
  title: string
  description: string
  client: {
    name: string
    type: 'Government' | 'Indigenous' | 'Private'
    department?: string
  }
  
  // Project details
  project: {
    type: string
    industry: string[]
    location: Location
    startDate: Date
    duration: number // months
    remote: boolean
  }
  
  // Financial
  value: {
    min: number
    max: number
    currency: string
    budgetConfirmed: boolean
  }
  
  // Requirements
  requirements: {
    mandatory: Requirement[]
    desirable: Requirement[]
    technical: TechnicalRequirement[]
    certifications: string[]
    experience: ExperienceRequirement[]
  }
  
  // Indigenous content
  indigenousRequirements: {
    minimumPercentage: number
    specificNations?: string[]
    employmentTargets?: EmploymentTarget[]
    subcontracting?: SubcontractingRequirement[]
    benefitSharing?: boolean
  }
  
  // Deadlines
  deadlines: {
    questions: Date
    submission: Date
    award: Date
  }
  
  // Evaluation criteria
  evaluation: {
    technical: number // weight %
    price: number
    indigenous: number
    experience: number
    innovation?: number
  }
}

export interface OpportunityMatch {
  id: string
  rfq: RFQ
  business: Business
  
  // Match scoring
  score: {
    overall: number // 0-100
    breakdown: {
      capabilities: number
      experience: number
      certifications: number
      indigenous: number
      geographic: number
      financial: number
      team: number
    }
  }
  
  // Match details
  analysis: {
    strengths: MatchStrength[]
    gaps: MatchGap[]
    risks: MatchRisk[]
    opportunities: string[]
  }
  
  // Recommended actions
  recommendations: {
    immediateActions: Action[]
    partnersNeeded: PartnerRequirement[]
    preparationTime: number // hours
    successProbability: number
  }
  
  // Team suggestions
  suggestedTeam?: ProposedTeam
  
  // Timing
  matchedAt: Date
  deadlineIn: number // days
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface ProposedTeam {
  lead: Business
  partners: TeamPartner[]
  
  // Team composition
  composition: {
    totalEmployees: number
    indigenousEmployees: number
    indigenousPercentage: number
    nations: string[]
    locations: Location[]
  }
  
  // Capabilities coverage
  capabilities: {
    required: string[]
    covered: string[]
    gaps: string[]
    coverage: number // percentage
  }
  
  // Financial strength
  financial: {
    combinedRevenue: number
    bondingCapacity: number
    insuranceCoverage: number
    meetRequirements: boolean
  }
  
  // Win probability
  winProbability: number
  
  // Partnership structure
  structure: {
    type: 'Joint Venture' | 'Prime-Sub' | 'Consortium'
    leadShare: number
    partnerShares: Record<string, number>
    indigenousContent: number
  }
}

export interface TeamPartner {
  business: Business
  role: 'Prime' | 'Sub' | 'Specialist' | 'Indigenous Partner'
  
  contribution: {
    capabilities: string[]
    resources: string[]
    percentage: number
    critical: boolean
  }
  
  // Partnership terms
  terms: {
    share: number
    responsibilities: string[]
    deliverables: string[]
  }
  
  // Compatibility
  compatibility: {
    withLead: number
    withTeam: number
    cultural: number
    operational: number
  }
}

export interface MatchStrength {
  factor: string
  description: string
  impact: 'low' | 'medium' | 'high'
  evidence: string[]
}

export interface MatchGap {
  requirement: string
  current: string
  needed: string
  solution: GapSolution[]
  critical: boolean
}

export interface GapSolution {
  type: 'Partner' | 'Hire' | 'Subcontract' | 'Obtain Certification'
  description: string
  timeRequired: number // days
  cost: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface MatchRisk {
  type: string
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string[]
}

export interface WinPrediction {
  probability: number
  
  factors: {
    positive: PredictionFactor[]
    negative: PredictionFactor[]
    neutral: PredictionFactor[]
  }
  
  competitiveAnalysis: {
    estimatedCompetitors: number
    strongerCompetitors: number
    competitiveAdvantages: string[]
    competitiveWeaknesses: string[]
  }
  
  recommendations: {
    mustDo: string[]
    shouldDo: string[]
    couldDo: string[]
    avoidDoing: string[]
  }
  
  historicalContext: {
    similarRFQs: number
    winRate: number
    avgScore: number
    clientHistory: ClientHistory
  }
}

export interface PredictionFactor {
  name: string
  impact: number // -100 to +100
  confidence: number // 0-100
  explanation: string
}

export interface ClientHistory {
  previousContracts: number
  totalValue: number
  satisfaction: number
  preferences: string[]
  incumbentAdvantage: boolean
}

// Real-time opportunity streaming
export interface OpportunityStream {
  subscribe: (filters: StreamFilters) => StreamSubscription
  
  sources: {
    merx: SourceStatus
    buyAndSell: SourceStatus
    sam: SourceStatus
    provincial: Record<string, SourceStatus>
    indigenous: Record<string, SourceStatus>
  }
  
  stats: {
    opportunitiesPerDay: number
    matchRate: number
    responseTime: number
    accuracy: number
  }
}

export interface StreamFilters {
  industries?: string[]
  locations?: Location[]
  valueRange?: ValueRange
  indigenousContent?: number
  certifications?: string[]
  keywords?: string[]
  excludeKeywords?: string[]
}

export interface StreamSubscription {
  id: string
  filters: StreamFilters
  
  onOpportunity: (opportunity: RFQ) => void
  onMatch: (match: OpportunityMatch) => void
  onError: (error: Error) => void
  
  pause: () => void
  resume: () => void
  unsubscribe: () => void
}

// Notification system
export interface MatchNotification {
  type: 'new-match' | 'team-invitation' | 'deadline-reminder' | 'status-update'
  
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  channels: {
    email: boolean
    sms: boolean
    app: boolean
    teams: boolean
    slack: boolean
  }
  
  content: {
    subject: string
    preview: string
    body: string
    cta: CallToAction
  }
  
  timing: {
    sendAt: Date
    expiresAt: Date
    reminderSchedule?: Date[]
  }
}

export interface CallToAction {
  text: string
  url: string
  type: 'primary' | 'secondary'
  trackingId: string
}

// Analytics and learning
export interface MatchOutcome {
  matchId: string
  rfqId: string
  businessId: string
  
  result: {
    submitted: boolean
    won: boolean
    score?: number
    rank?: number
    feedback?: string
  }
  
  performance: {
    matchAccuracy: number
    teamEffectiveness: number
    timeToSubmit: number
    profitability?: number
  }
  
  lessons: {
    whatWorked: string[]
    whatDidntWork: string[]
    improvements: string[]
  }
}

export interface MatchInsights {
  businessId: string
  period: DateRange
  
  summary: {
    totalMatches: number
    submissionRate: number
    winRate: number
    avgMatchScore: number
  }
  
  trends: {
    matchQuality: TrendData
    winRate: TrendData
    responseTime: TrendData
  }
  
  strengths: {
    topCapabilities: string[]
    bestPartners: Business[]
    winningCombinations: TeamComposition[]
  }
  
  opportunities: {
    missingCapabilities: string[]
    potentialPartners: Business[]
    emergingMarkets: string[]
  }
  
  recommendations: {
    immediate: string[]
    strategic: string[]
    partnerships: string[]
  }
}

// Supporting types
export interface Business {
  id: string
  name: string
  type: 'Indigenous' | 'Canadian' | 'Joint Venture'
  
  profile: {
    established: Date
    employees: number
    revenue: number
    locations: Location[]
  }
  
  capabilities: {
    primary: string[]
    secondary: string[]
    certifications: Certification[]
    equipment: string[]
  }
  
  indigenous?: {
    nation: string
    ownershipPercentage: number
    communityConnections: string[]
    agreements: string[]
  }
  
  performance: {
    completedProjects: number
    winRate: number
    clientSatisfaction: number
    onTimeDelivery: number
  }
}

export interface Location {
  city: string
  province: string
  region: string
  remote: boolean
  accessibleBy: ('road' | 'air' | 'water' | 'winter road')[]
}

export interface Requirement {
  id: string
  description: string
  category: string
  mandatory: boolean
  verificationNeeded: boolean
}

export interface TechnicalRequirement extends Requirement {
  specifications: string[]
  standards: string[]
  experience: string
}

export interface ExperienceRequirement {
  type: string
  years: number
  projectCount: number
  minimumValue: number
}

export interface EmploymentTarget {
  category: string
  percentage: number
  count?: number
}

export interface SubcontractingRequirement {
  category: string
  percentage: number
  indigenousRequired: boolean
}

export interface Certification {
  type: string
  issuer: string
  expiry: Date
  status: 'active' | 'expired' | 'pending'
}

export interface PartnerRequirement {
  capability: string
  reason: string
  suggested: Business[]
  alternativeOptions: string[]
}

export interface Action {
  task: string
  deadline: Date
  responsible: string
  status: 'pending' | 'in-progress' | 'completed'
}

export interface ValueRange {
  min: number
  max: number
}

export interface DateRange {
  start: Date
  end: Date
}

export interface TrendData {
  current: number
  previous: number
  change: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface TeamComposition {
  industries: string[]
  size: string
  indigenousPercentage: number
  successRate: number
}

export interface SourceStatus {
  active: boolean
  lastChecked: Date
  opportunitiesFound: number
  errors: number
  health: 'healthy' | 'degraded' | 'down'
}