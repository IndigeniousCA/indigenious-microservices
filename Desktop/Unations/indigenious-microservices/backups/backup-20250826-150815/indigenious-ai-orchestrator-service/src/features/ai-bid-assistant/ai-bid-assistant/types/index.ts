// AI Bid Assistant Types

export interface BidTemplate {
  id: string
  name: string
  category: 'construction' | 'it-services' | 'professional-services' | 'supplies' | 'other'
  description: string
  sections: BidSection[]
  successRate: number
  usageCount: number
  avgScore: number
  tags: string[]
  language: 'en' | 'fr' | 'cr' // English, French, Cree
}

export interface BidSection {
  id: string
  title: string
  description: string
  required: boolean
  order: number
  contentType: 'text' | 'table' | 'list' | 'file'
  prompts: string[]
  examples: string[]
  scoringWeight?: number
  wordLimit?: number
}

export interface BidAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: BidSuggestion[]
  missingRequirements: string[]
  complianceIssues: string[]
  readabilityScore: number
  technicalAccuracy: number
  culturalAlignment: number
}

export interface BidSuggestion {
  section: string
  issue: string
  suggestion: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  example?: string
}

export interface BidContext {
  businessId: string
  businessProfile: {
    name: string
    capabilities: string[]
    certifications: string[]
    pastPerformance: PastPerformance[]
    teamSize: number
    indigenousPercentage: number
    locations: string[]
  }
  rfqDetails: {
    id: string
    title: string
    category: string
    budget: string
    deadline: Date
    evaluationCriteria: EvaluationCriteria[]
    mandatoryRequirements: string[]
    scopeOfWork: string
  }
}

export interface PastPerformance {
  projectName: string
  client: string
  value: number
  completionDate: Date
  rating: number
  reference?: string
}

export interface EvaluationCriteria {
  name: string
  weight: number
  description: string
  scoringGuide: string[]
}

export interface BidDraft {
  id: string
  rfqId: string
  businessId: string
  title: string
  sections: BidSectionContent[]
  lastUpdated: Date
  status: 'draft' | 'review' | 'final' | 'submitted'
  aiScore?: number
  collaborators: string[]
  version: number
  language: 'en' | 'fr' | 'cr'
}

export interface BidSectionContent {
  sectionId: string
  content: string
  attachments?: string[]
  aiGenerated: boolean
  humanEdited: boolean
  confidence: number
}

export interface AIBidRequest {
  context: BidContext
  template?: string
  sections: string[]
  tone: 'formal' | 'professional' | 'conversational'
  length: 'concise' | 'standard' | 'detailed'
  language: 'en' | 'fr' | 'cr'
  focusAreas?: string[]
  includeIndigenousContent: boolean
}

export interface WinningBidPattern {
  category: string
  patterns: {
    openingStyle: string[]
    keyPhrases: string[]
    structureElements: string[]
    closingStyle: string[]
    differentiators: string[]
  }
  avgScore: number
  winRate: number
}

export interface ComplianceCheck {
  requirement: string
  status: 'met' | 'not-met' | 'partial' | 'unclear'
  evidence?: string
  suggestion?: string
  mandatory: boolean
}

export interface BidImprovement {
  original: string
  improved: string
  reason: string
  impact: 'high' | 'medium' | 'low'
  category: 'clarity' | 'compliance' | 'persuasion' | 'technical' | 'cultural'
}