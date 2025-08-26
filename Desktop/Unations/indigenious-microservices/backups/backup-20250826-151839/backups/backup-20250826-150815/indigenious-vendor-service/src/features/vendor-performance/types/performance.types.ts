// TypeScript types for vendor performance tracking

export interface VendorPerformance {
  vendorId: string
  vendorName: string
  vendorType: 'indigenous_sme' | 'indigenous_large' | 'canadian_business'
  communityAffiliation?: {
    nation: string
    territory: string
    bandNumber?: string
  }
  
  // Overall ratings
  overallRating: number // 0-5
  totalReviews: number
  totalProjects: number
  totalContractValue: number
  
  // Performance metrics
  metrics: {
    onTimeDelivery: PerformanceMetric
    qualityOfWork: PerformanceMetric
    communication: PerformanceMetric
    budgetAdherence: PerformanceMetric
    safetyCompliance: PerformanceMetric
    indigenousEmployment: PerformanceMetric
  }
  
  // Project history
  projects: CompletedProject[]
  
  // Reviews
  reviews: VendorReview[]
  
  // Certifications & Awards
  certifications: Certification[]
  awards: Award[]
  
  // Risk indicators
  riskProfile: {
    level: 'low' | 'medium' | 'high'
    factors: RiskFactor[]
  }
  
  // Performance trend
  performanceTrend: 'improving' | 'stable' | 'declining'
  lastUpdated: string
}

export interface PerformanceMetric {
  score: number // 0-5
  trend: 'up' | 'down' | 'stable'
  percentile: number // Compared to similar vendors
  dataPoints: number // Number of projects assessed
}

export interface CompletedProject {
  id: string
  projectName: string
  projectType: string
  clientName: string
  clientType: 'government' | 'band_council' | 'private'
  contractValue: number
  startDate: string
  completionDate: string
  
  // Performance scores
  performance: {
    onTimeDelivery: boolean
    withinBudget: boolean
    qualityScore: number // 0-5
    clientSatisfaction: number // 0-5
  }
  
  // Indigenous content
  indigenousContent: {
    percentage: number
    employmentHours: number
    subcontractingValue: number
  }
  
  // Issues & achievements
  issues: ProjectIssue[]
  achievements: string[]
  
  // Evidence
  photos?: string[]
  testimonial?: string
}

export interface VendorReview {
  id: string
  projectId: string
  projectName: string
  reviewerId: string
  reviewerName: string
  reviewerOrganization: string
  reviewerRole: string
  reviewDate: string
  
  // Ratings
  ratings: {
    overall: number
    onTimeDelivery: number
    qualityOfWork: number
    communication: number
    valueForMoney: number
    wouldRecommend: boolean
  }
  
  // Written feedback
  headline: string
  positives: string
  improvements: string
  detailedReview: string
  
  // Verification
  verified: boolean
  verificationMethod?: 'contract' | 'invoice' | 'site_visit'
  
  // Response
  vendorResponse?: {
    date: string
    message: string
  }
  
  // Helpful votes
  helpfulCount: number
  notHelpfulCount: number
}

export interface Certification {
  id: string
  name: string
  issuingBody: string
  issueDate: string
  expiryDate?: string
  status: 'active' | 'expired' | 'suspended'
  category: CertificationCategory
  documentUrl?: string
  verified: boolean
}

export type CertificationCategory = 
  | 'indigenous_business'
  | 'quality' // ISO 9001, etc.
  | 'safety' // COR, etc.
  | 'environmental' // ISO 14001, etc.
  | 'trade' // Red Seal, etc.
  | 'professional' // Engineering, Architecture, etc.
  | 'other'

export interface Award {
  id: string
  name: string
  issuingOrganization: string
  year: number
  category: string
  description: string
  significance: 'local' | 'regional' | 'national' | 'international'
}

export interface RiskFactor {
  type: RiskType
  severity: 'low' | 'medium' | 'high'
  description: string
  mitigationStatus?: 'addressed' | 'pending' | 'unresolved'
}

export type RiskType = 
  | 'late_deliveries'
  | 'budget_overruns'
  | 'quality_issues'
  | 'safety_incidents'
  | 'contract_disputes'
  | 'financial_instability'
  | 'compliance_violations'
  | 'negative_reviews'

export interface ProjectIssue {
  type: 'delay' | 'quality' | 'safety' | 'budget' | 'communication' | 'other'
  description: string
  severity: 'minor' | 'moderate' | 'major'
  resolved: boolean
  resolutionDate?: string
  impactOnProject: string
}

// Performance comparison
export interface PerformanceComparison {
  vendorId: string
  industryAverage: PerformanceMetrics
  topPerformers: PerformanceMetrics
  vendorMetrics: PerformanceMetrics
  rank: {
    overall: number
    totalVendors: number
    percentile: number
  }
}

export interface PerformanceMetrics {
  onTimeDelivery: number
  qualityScore: number
  budgetAdherence: number
  clientSatisfaction: number
  indigenousEmployment: number
}

// Filters and search
export interface PerformanceFilters {
  minRating?: number
  projectTypes?: string[]
  certifications?: CertificationCategory[]
  communityAffiliation?: string
  riskLevel?: ('low' | 'medium' | 'high')[]
  performanceTrend?: ('improving' | 'stable' | 'declining')[]
  dateRange?: {
    start: string
    end: string
  }
}

// Reports
export interface PerformanceReport {
  vendorId: string
  reportType: 'summary' | 'detailed' | 'comparative'
  generatedAt: string
  period: {
    start: string
    end: string
  }
  sections: ReportSection[]
}

export interface ReportSection {
  title: string
  type: 'metrics' | 'projects' | 'reviews' | 'certifications' | 'risks'
  content: any // Varies by section type
  visualizations?: {
    type: 'chart' | 'graph' | 'table'
    data: unknown
  }[]
}

// Improvement tracking
export interface ImprovementPlan {
  vendorId: string
  createdAt: string
  targetDate: string
  status: 'active' | 'completed' | 'cancelled'
  
  areas: ImprovementArea[]
  
  progress: {
    overall: number // 0-100
    lastUpdated: string
    milestones: ImprovementMilestone[]
  }
}

export interface ImprovementArea {
  metric: keyof VendorPerformance['metrics']
  currentScore: number
  targetScore: number
  actions: string[]
  resources: string[]
}

export interface ImprovementMilestone {
  date: string
  description: string
  achieved: boolean
  evidence?: string
}