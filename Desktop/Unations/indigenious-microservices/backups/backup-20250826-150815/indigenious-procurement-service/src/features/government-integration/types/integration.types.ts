// Government Integration Types
// Type definitions for government system integrations

// Government system identifiers
export type GovernmentSystem = 
  | 'GETS'           // Government Electronic Tendering Service
  | 'SAP_ARIBA'      // SAP Ariba (PSPC)
  | 'BUY_AND_SELL'   // buyandsell.gc.ca
  | 'MERX'           // MERX
  | 'BC_BID'         // BC Bid
  | 'BIDCENTRAL'     // Ontario BidCentral
  | 'PSIB'           // Procurement Strategy for Indigenous Business
  | 'ISC'            // Indigenous Services Canada

// Integration status
export interface IntegrationStatus {
  system: GovernmentSystem
  connected: boolean
  lastSync: string
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused'
  errorMessage?: string
  metrics: {
    rfqsImported: number
    bidsSubmitted: number
    documentsExchanged: number
    lastSuccessfulSync: string
  }
}

// RFQ import from government systems
export interface GovernmentRFQ {
  id: string
  sourceSystem: GovernmentSystem
  sourceId: string
  referenceNumber: string
  title: string
  description: string
  issuingOrganization: {
    name: string
    department: string
    branch?: string
    contactName: string
    contactEmail: string
    contactPhone?: string
  }
  procurement: {
    method: ProcurementMethod
    type: ProcurementType
    estimatedValue?: {
      min: number
      max: number
      currency: string
    }
    setAside?: SetAsideType
    securityClearance?: SecurityLevel
  }
  categories: {
    unspsc?: string[]
    gsin?: string[]
    naics?: string[]
    keywords: string[]
  }
  dates: {
    published: string
    closingDate: string
    questionsDeadline?: string
    siteVisitDate?: string
    contractStartDate?: string
    contractEndDate?: string
  }
  documents: GovernmentDocument[]
  amendments: Amendment[]
  requirements: {
    mandatoryMeetings?: MeetingRequirement[]
    certifications?: string[]
    insurance?: InsuranceRequirement[]
    bonds?: BondRequirement[]
  }
  evaluation: {
    criteria: EvaluationCriterion[]
    scoringMethod: 'lowest_price' | 'highest_score' | 'value_for_money'
  }
  metadata: {
    importedAt: string
    lastUpdated: string
    syncVersion: number
    tags?: string[]
  }
}

export type ProcurementMethod = 
  | 'open_bidding'
  | 'selective_tendering'
  | 'limited_tendering'
  | 'standing_offer'
  | 'supply_arrangement'

export type ProcurementType = 
  | 'goods'
  | 'services'
  | 'construction'
  | 'goods_and_services'
  | 'leasing'

export type SetAsideType = 
  | 'indigenous_business'
  | 'comprehensive_land_claim'
  | 'small_business'
  | 'none'

export type SecurityLevel = 
  | 'none'
  | 'reliability'
  | 'confidential'
  | 'secret'
  | 'top_secret'

// Government document types
export interface GovernmentDocument {
  id: string
  name: string
  type: DocumentType
  url: string
  size: number
  language: 'en' | 'fr' | 'bilingual'
  uploadedDate: string
  isMandatory: boolean
  needsSignature?: boolean
  formFields?: FormField[]
}

export type DocumentType = 
  | 'rfq_document'
  | 'statement_of_work'
  | 'technical_requirements'
  | 'evaluation_criteria'
  | 'terms_and_conditions'
  | 'security_requirements'
  | 'form_template'
  | 'amendment'
  | 'q_and_a'

// Amendment tracking
export interface Amendment {
  number: number
  date: string
  description: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  documents?: GovernmentDocument[]
}

// Meeting requirements
export interface MeetingRequirement {
  type: 'site_visit' | 'bidders_conference' | 'technical_briefing'
  date: string
  time: string
  location: string
  isMandatory: boolean
  registrationRequired: boolean
  registrationDeadline?: string
  virtualOption?: {
    platform: string
    link: string
  }
}

// Insurance requirements
export interface InsuranceRequirement {
  type: string
  amount: number
  currency: string
  validityPeriod: string
}

// Bond requirements
export interface BondRequirement {
  type: 'bid' | 'performance' | 'labor_materials'
  percentage?: number
  amount?: number
  currency: string
  validityPeriod: string
}

// Evaluation criteria
export interface EvaluationCriterion {
  name: string
  description: string
  weight: number
  scoringMethod: string
  subcriteria?: EvaluationCriterion[]
}

// Form fields for fillable documents
export interface FormField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file'
  required: boolean
  options?: string[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
    maxLength?: number
  }
}

// Bid submission to government
export interface GovernmentBidSubmission {
  id: string
  rfqId: string
  targetSystem: GovernmentSystem
  submissionData: {
    vendorInfo: VendorSubmissionInfo
    technicalProposal: Document
    financialProposal: Document
    supportingDocuments: Document[]
    certifications: Certification[]
    subcontractors?: SubcontractorInfo[]
  }
  status: BidSubmissionStatus
  submittedAt?: string
  confirmationNumber?: string
  errors?: SubmissionError[]
  timeline: SubmissionEvent[]
}

export interface VendorSubmissionInfo {
  businessNumber: string
  legalName: string
  operatingName?: string
  supplierNumber?: string
  psibNumber?: string
  contactPerson: {
    name: string
    title: string
    email: string
    phone: string
  }
  address: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
}

export interface Certification {
  type: string
  number: string
  issuedBy: string
  issuedDate: string
  expiryDate: string
  documentUrl?: string
}

export interface SubcontractorInfo {
  name: string
  role: string
  percentage: number
  isIndigenous: boolean
  businessNumber?: string
}

export type BidSubmissionStatus = 
  | 'draft'
  | 'validating'
  | 'submitting'
  | 'submitted'
  | 'acknowledged'
  | 'rejected'
  | 'withdrawn'

export interface SubmissionError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning'
}

export interface SubmissionEvent {
  timestamp: string
  event: string
  description: string
  user?: string
  systemResponse?: any
}

// System credentials and configuration
export interface SystemCredentials {
  system: GovernmentSystem
  credentialType: 'oauth' | 'api_key' | 'certificate' | 'username_password'
  credentials: Record<string, any>
  environment: 'production' | 'staging' | 'test'
  validUntil?: string
  permissions: string[]
}

// Sync configuration
export interface SyncConfiguration {
  system: GovernmentSystem
  enabled: boolean
  schedule: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
    time?: string // For scheduled syncs
    timezone: string
  }
  filters: {
    categories?: string[]
    regions?: string[]
    valueThreshold?: {
      min?: number
      max?: number
    }
    setAsideOnly?: boolean
    excludeKeywords?: string[]
  }
  notifications: {
    email: boolean
    sms: boolean
    inApp: boolean
    webhooks?: string[]
  }
  retryPolicy: {
    maxRetries: number
    backoffMultiplier: number
    maxBackoffSeconds: number
  }
}

// Mapping configuration
export interface SystemMapping {
  sourceSystem: GovernmentSystem
  mappings: {
    categories: CategoryMapping[]
    documentTypes: DocumentTypeMapping[]
    statuses: StatusMapping[]
    customFields: CustomFieldMapping[]
  }
}

export interface CategoryMapping {
  sourceCode: string
  sourceSystem: string
  targetCode: string
  targetSystem: string
  confidence: number
}

export interface DocumentTypeMapping {
  sourceType: string
  targetType: DocumentType
  transformRules?: any
}

export interface StatusMapping {
  sourceStatus: string
  targetStatus: string
  actions?: string[]
}

export interface CustomFieldMapping {
  sourcePath: string
  targetPath: string
  transform?: string // JavaScript expression
  defaultValue?: any
}

// Compliance tracking
export interface ComplianceRecord {
  system: GovernmentSystem
  requirementType: string
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired'
  details: {
    requirement: string
    currentValue: any
    requiredValue: any
    validUntil?: string
  }
  documents: ComplianceDocument[]
  lastVerified: string
  nextReviewDate: string
}

export interface ComplianceDocument {
  type: string
  name: string
  url: string
  uploadedDate: string
  expiryDate?: string
  status: 'active' | 'expired' | 'pending_review'
}

// Analytics and reporting
export interface IntegrationAnalytics {
  system: GovernmentSystem
  period: {
    start: string
    end: string
  }
  metrics: {
    rfqsImported: number
    rfqsMatched: number
    bidsSubmitted: number
    bidsWon: number
    documentsProcessed: number
    errorsEncountered: number
    averageSyncTime: number
    systemUptime: number
  }
  trends: {
    daily: TrendData[]
    weekly: TrendData[]
    monthly: TrendData[]
  }
  issues: IntegrationIssue[]
}

export interface TrendData {
  date: string
  value: number
  change: number
  changePercent: number
}

export interface IntegrationIssue {
  id: string
  system: GovernmentSystem
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  description: string
  occurredAt: string
  resolvedAt?: string
  impact: string
  resolution?: string
}