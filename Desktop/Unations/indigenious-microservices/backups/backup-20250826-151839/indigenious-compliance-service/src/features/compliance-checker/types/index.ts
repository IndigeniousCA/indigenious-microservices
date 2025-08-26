// Automated Compliance Checker Types

export interface ComplianceCheck {
  id: string
  rfqId: string
  businessId: string
  bidId?: string
  checkDate: Date
  overallStatus: 'pass' | 'fail' | 'warning'
  score: number // 0-100
  requirements: RequirementCheck[]
  documents: DocumentCheck[]
  certifications: CertificationCheck[]
  eligibility: EligibilityCheck[]
  formatting: FormattingCheck[]
  completeness: CompletenessCheck[]
  recommendations: ComplianceRecommendation[]
  autoFixAvailable: boolean
  autoFixesApplied: AutoFix[]
}

export interface RequirementCheck {
  id: string
  requirement: string
  category: 'mandatory' | 'rated' | 'optional'
  status: 'met' | 'not-met' | 'partial' | 'unclear'
  evidence?: string
  location?: { section: string, page?: number, line?: number }
  score?: number
  maxScore?: number
  notes?: string
  suggestion?: string
  autoFixable: boolean
}

export interface DocumentCheck {
  id: string
  documentType: string
  required: boolean
  status: 'provided' | 'missing' | 'invalid' | 'expired'
  fileName?: string
  issues: DocumentIssue[]
  validUntil?: Date
  autoFixable: boolean
}

export interface DocumentIssue {
  type: 'format' | 'size' | 'quality' | 'content' | 'signature' | 'date'
  severity: 'critical' | 'major' | 'minor'
  description: string
  suggestion: string
}

export interface CertificationCheck {
  id: string
  certificationType: string
  required: boolean
  status: 'valid' | 'expired' | 'missing' | 'pending'
  certificationNumber?: string
  issuer?: string
  issueDate?: Date
  expiryDate?: Date
  daysUntilExpiry?: number
  renewalLink?: string
  alternativeAccepted?: boolean
}

export interface EligibilityCheck {
  id: string
  criteria: string
  category: 'business-size' | 'indigenous-status' | 'location' | 'experience' | 'financial' | 'security'
  status: 'eligible' | 'not-eligible' | 'conditional'
  evidence?: string
  reason?: string
  waiverable: boolean
  waiverProcess?: string
}

export interface FormattingCheck {
  id: string
  element: string
  requirement: string
  status: 'correct' | 'incorrect' | 'missing'
  location?: string
  example?: string
  autoFixed?: boolean
}

export interface CompletenessCheck {
  section: string
  required: boolean
  status: 'complete' | 'incomplete' | 'missing'
  completionPercentage: number
  missingElements: string[]
  wordCount?: { current: number, minimum?: number, maximum?: number }
  suggestions: string[]
}

export interface ComplianceRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  issue: string
  impact: string
  recommendation: string
  effort: 'low' | 'medium' | 'high'
  timeEstimate?: string
  resources?: string[]
  automatable: boolean
}

export interface AutoFix {
  id: string
  type: 'formatting' | 'structure' | 'content' | 'document'
  description: string
  status: 'applied' | 'failed' | 'pending'
  before?: string
  after?: string
  timestamp: Date
  reversible: boolean
}

export interface ComplianceTemplate {
  id: string
  name: string
  category: string
  rfqType: string
  version: string
  lastUpdated: Date
  rules: ComplianceRule[]
  documentRequirements: DocumentRequirement[]
  certificationRequirements: CertificationRequirement[]
  scoringCriteria: ScoringCriterion[]
}

export interface ComplianceRule {
  id: string
  name: string
  description: string
  category: string
  mandatory: boolean
  checkType: 'keyword' | 'pattern' | 'structure' | 'calculation' | 'external'
  checkLogic: string | RegExp | CheckFunction
  errorMessage: string
  suggestion: string
  weight: number
  tags: string[]
}

export interface DocumentRequirement {
  type: string
  name: string
  mandatory: boolean
  format: string[]
  maxSize?: number
  minPages?: number
  maxPages?: number
  requiresSignature: boolean
  requiresDate: boolean
  expiryRules?: ExpiryRule
  alternativeDocuments?: string[]
}

export interface CertificationRequirement {
  type: string
  name: string
  mandatory: boolean
  issuers: string[]
  minValidityDays: number
  alternativeCertifications?: string[]
  industrySpecific: boolean
  renewalProcess?: string
}

export interface ScoringCriterion {
  id: string
  name: string
  category: string
  weight: number
  maxPoints: number
  evaluationMethod: 'manual' | 'automatic' | 'hybrid'
  scoringRubric: ScoringLevel[]
  keywords?: string[]
  examples?: string[]
}

export interface ScoringLevel {
  level: number
  minScore: number
  maxScore: number
  description: string
  requirements: string[]
}

export interface CheckFunction {
  (content: string, context?: any): CheckResult
}

export interface CheckResult {
  passed: boolean
  score?: number
  evidence?: string
  issues?: string[]
  suggestions?: string[]
}

export interface ExpiryRule {
  type: 'fixed' | 'relative' | 'rolling'
  duration?: number // days
  gracePerion?: number // days
  renewalReminder?: number // days before expiry
}

export interface ComplianceReport {
  id: string
  checkId: string
  generatedDate: Date
  format: 'pdf' | 'html' | 'json' | 'excel'
  sections: ReportSection[]
  summary: ReportSummary
  detailedFindings: Finding[]
  actionPlan: ActionItem[]
  signoff?: SignoffRecord
}

export interface ReportSection {
  title: string
  status: 'pass' | 'fail' | 'warning'
  findings: number
  criticalIssues: number
  content: string
}

export interface ReportSummary {
  overallScore: number
  totalRequirements: number
  metRequirements: number
  partialRequirements: number
  failedRequirements: number
  mandatoryFailures: number
  estimatedFixTime: string
  readyToSubmit: boolean
}

export interface Finding {
  id: string
  category: string
  severity: 'critical' | 'major' | 'minor' | 'informational'
  requirement: string
  finding: string
  impact: string
  recommendation: string
  evidence?: string
  references?: string[]
}

export interface ActionItem {
  id: string
  finding: string
  action: string
  responsible: string
  dueDate?: Date
  priority: 'immediate' | 'high' | 'medium' | 'low'
  status: 'pending' | 'in-progress' | 'completed'
  notes?: string
}

export interface SignoffRecord {
  signedBy: string
  role: string
  date: Date
  comments?: string
  digitalSignature?: string
}

export interface ComplianceHistory {
  businessId: string
  checks: ComplianceCheckSummary[]
  trends: ComplianceTrend[]
  commonIssues: CommonIssue[]
  improvementRate: number
}

export interface ComplianceCheckSummary {
  checkId: string
  rfqId: string
  date: Date
  score: number
  status: 'pass' | 'fail' | 'warning'
  criticalIssues: number
  fixTime?: string
}

export interface ComplianceTrend {
  metric: string
  period: string
  values: { date: Date, value: number }[]
  trend: 'improving' | 'stable' | 'declining'
}

export interface CommonIssue {
  issue: string
  frequency: number
  lastOccurrence: Date
  category: string
  fixApplied: boolean
  preventionTip: string
}