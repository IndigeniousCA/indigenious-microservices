// TypeScript types for bid submission

export interface Bid {
  id: string
  rfqId: string
  rfqTitle: string
  bidderId: string
  bidderName: string
  bidderOrganization: string
  
  // Bid details
  status: BidStatus
  submittedAt?: string
  withdrawnAt?: string
  
  // Pricing
  pricing: {
    totalAmount: number
    currency: string
    breakdown: PriceBreakdown[]
    paymentTerms: string
    validUntil: string
  }
  
  // Technical proposal
  technicalProposal: {
    approach: string
    timeline: Timeline
    team: TeamMember[]
    equipment?: Equipment[]
    subcontractors?: Subcontractor[]
  }
  
  // Indigenous content (for government RFQs)
  indigenousContent?: {
    percentage: number
    breakdown: IndigenousBreakdown[]
    certificationNumber?: string
  }
  
  // Attachments
  attachments: BidAttachment[]
  
  // Compliance
  compliance: {
    mandatoryRequirements: ComplianceItem[]
    certifications: Certification[]
    insurance: Insurance[]
  }
  
  // Q&A
  clarifications?: Clarification[]
  
  // Evaluation (filled by buyer)
  evaluation?: {
    score: number
    breakdown: ScoreBreakdown[]
    rank?: number
    notes?: string
  }
  
  // Metadata
  lastSavedAt: string
  version: number
  isDraft: boolean
}

export type BidStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'awarded'
  | 'rejected'
  | 'withdrawn'

export interface PriceBreakdown {
  id: string
  category: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface Timeline {
  startDate: string
  endDate: string
  milestones: Milestone[]
  criticalPath?: string[]
}

export interface Milestone {
  id: string
  name: string
  date: string
  deliverables: string[]
  dependencies?: string[]
}

export interface TeamMember {
  id: string
  name: string
  role: string
  qualifications: string[]
  yearsExperience: number
  indigenousStatus?: boolean
  resume?: string // URL
}

export interface Equipment {
  id: string
  type: string
  model: string
  quantity: number
  condition: 'new' | 'excellent' | 'good' | 'fair'
  availability: string
}

export interface Subcontractor {
  id: string
  companyName: string
  scope: string
  percentage: number
  indigenousOwned: boolean
  verificationStatus?: 'verified' | 'pending' | 'none'
}

export interface IndigenousBreakdown {
  category: 'ownership' | 'employment' | 'subcontracting' | 'procurement'
  description: string
  percentage: number
  value: number
}

export interface BidAttachment {
  id: string
  name: string
  type: AttachmentType
  url: string
  size: number
  uploadedAt: string
  mandatory: boolean
}

export type AttachmentType = 
  | 'technical_proposal'
  | 'price_schedule'
  | 'company_profile'
  | 'financial_statement'
  | 'insurance_certificate'
  | 'safety_certification'
  | 'reference_letter'
  | 'bid_bond'
  | 'other'

export interface ComplianceItem {
  id: string
  requirement: string
  response: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable'
  explanation?: string
  evidence?: string[] // Attachment IDs
}

export interface Certification {
  id: string
  type: string
  number: string
  issuedBy: string
  issuedDate: string
  expiryDate: string
  documentUrl?: string
}

export interface Insurance {
  id: string
  type: string
  provider: string
  policyNumber: string
  coverage: number
  expiryDate: string
  documentUrl?: string
}

export interface Clarification {
  id: string
  question: string
  askedAt: string
  askedBy: string
  answer?: string
  answeredAt?: string
  answeredBy?: string
  isPublic: boolean
}

export interface ScoreBreakdown {
  criterion: string
  weight: number
  score: number
  weightedScore: number
  notes?: string
}

// Form types for bid creation
export interface BidFormData {
  // Section 1: Executive Summary
  executiveSummary: {
    understanding: string
    keyBenefits: string[]
    uniqueValue: string
  }
  
  // Section 2: Pricing
  pricing: {
    totalAmount: number
    breakdown: PriceBreakdown[]
    assumptions: string[]
    exclusions: string[]
    paymentTerms: string
    validityPeriod: number // days
  }
  
  // Section 3: Technical Approach
  technical: {
    methodology: string
    workPlan: string
    timeline: Timeline
    deliverables: string[]
    qualityAssurance: string
  }
  
  // Section 4: Team & Resources
  resources: {
    teamLead: TeamMember
    keyPersonnel: TeamMember[]
    organizationChart?: string // URL
    equipment?: Equipment[]
    facilities?: string
  }
  
  // Section 5: Indigenous Content (if applicable)
  indigenousContent?: {
    ownershipPercentage: number
    employmentPercentage: number
    subcontractingPercentage: number
    procurementPercentage: number
    totalPercentage: number
    verificationDocs: string[] // URLs
  }
  
  // Section 6: Past Performance
  pastPerformance: {
    relevantProjects: Project[]
    references: Reference[]
    awards?: Award[]
  }
  
  // Section 7: Compliance
  compliance: {
    mandatoryChecks: Record<string, boolean>
    certifications: Certification[]
    insurance: Insurance[]
    safetyRecord?: SafetyRecord
  }
}

export interface Project {
  id: string
  name: string
  client: string
  value: number
  startDate: string
  endDate: string
  description: string
  relevance: string
  contactName?: string
  contactPhone?: string
}

export interface Reference {
  id: string
  name: string
  title: string
  organization: string
  email: string
  phone: string
  relationship: string
}

export interface Award {
  id: string
  name: string
  issuedBy: string
  year: number
  description: string
}

export interface SafetyRecord {
  lostTimeIncidents: number
  reportableIncidents: number
  yearsWithoutIncident: number
  corCertification?: string
  wsibClearance?: string
}