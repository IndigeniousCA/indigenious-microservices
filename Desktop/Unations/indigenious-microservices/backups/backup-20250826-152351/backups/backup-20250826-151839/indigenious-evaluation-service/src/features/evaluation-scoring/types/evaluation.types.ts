// TypeScript types for bid evaluation and scoring

export interface Evaluation {
  id: string
  rfqId: string
  rfqTitle: string
  evaluatorId: string
  evaluatorName: string
  createdAt: string
  completedAt?: string
  status: EvaluationStatus
  
  // Evaluation settings
  settings: {
    evaluationType: 'individual' | 'consensus' | 'committee'
    blindEvaluation: boolean
    showBidderNames: boolean
    scoringMethod: 'points' | 'ranking' | 'pass-fail'
    evaluationDeadline?: string
  }
  
  // Bids being evaluated
  bids: EvaluatedBid[]
  
  // Evaluation criteria from RFQ
  criteria: EvaluationCriterion[]
  
  // Final results
  results?: {
    rankedBids: RankedBid[]
    recommendedBidId?: string
    justification?: string
    consensusReached?: boolean
    minorityReport?: string
  }
  
  // Audit trail
  auditLog: AuditEntry[]
}

export type EvaluationStatus = 
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'consensus_pending'
  | 'approved'
  | 'revision_requested'

export interface EvaluatedBid {
  bidId: string
  bidderName: string // May be hidden in blind evaluation
  bidderOrganization?: string
  submittedAt: string
  
  // Scores
  scores: BidScore[]
  totalScore: number
  normalizedScore: number // 0-100
  rank?: number
  
  // Compliance
  mandatoryCompliance: ComplianceCheck[]
  isCompliant: boolean
  disqualificationReason?: string
  
  // Evaluator notes
  strengths: string[]
  weaknesses: string[]
  risks: string[]
  generalNotes?: string
  
  // Recommendation
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended'
  
  // Attachments review
  documentsReviewed: DocumentReview[]
}

export interface EvaluationCriterion {
  id: string
  name: string
  description?: string
  category: CriterionCategory
  weight: number // Percentage
  maxPoints: number
  
  // Scoring guidance
  scoringGuide?: ScoringGuide[]
  
  // Sub-criteria
  subCriteria?: SubCriterion[]
}

export type CriterionCategory = 
  | 'price'
  | 'technical'
  | 'experience'
  | 'indigenous_content'
  | 'sustainability'
  | 'local_benefit'
  | 'innovation'
  | 'other'

export interface SubCriterion {
  id: string
  name: string
  maxPoints: number
  description?: string
}

export interface ScoringGuide {
  score: number
  description: string
  examples?: string[]
}

export interface BidScore {
  criterionId: string
  criterionName: string
  score: number
  maxScore: number
  weightedScore: number
  justification?: string
  
  // Sub-scores
  subScores?: {
    subCriterionId: string
    score: number
    maxScore: number
  }[]
}

export interface ComplianceCheck {
  requirementId: string
  requirement: string
  status: 'pass' | 'fail' | 'conditional'
  evidence?: string
  notes?: string
  reviewedBy: string
  reviewedAt: string
}

export interface RankedBid {
  rank: number
  bidId: string
  bidderName: string
  totalScore: number
  priceScore: number
  technicalScore: number
  
  // Score breakdown
  scoreBreakdown: {
    criterion: string
    score: number
    weightedScore: number
  }[]
  
  // Summary
  strengths: string[]
  concerns: string[]
  recommendation: string
}

export interface DocumentReview {
  documentId: string
  documentName: string
  reviewed: boolean
  satisfactory: boolean
  comments?: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: AuditAction
  details: string
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
}

export type AuditAction = 
  | 'evaluation_started'
  | 'score_added'
  | 'score_updated'
  | 'bid_disqualified'
  | 'evaluation_completed'
  | 'consensus_reached'
  | 'recommendation_made'

// Consensus evaluation types
export interface ConsensusEvaluation {
  id: string
  rfqId: string
  evaluations: IndividualEvaluation[]
  consensusScores: ConsensusScore[]
  discussionNotes: DiscussionNote[]
  consensusReached: boolean
  finalRanking?: RankedBid[]
}

export interface IndividualEvaluation {
  evaluatorId: string
  evaluatorName: string
  evaluation: Evaluation
  weight?: number // For weighted consensus
}

export interface ConsensusScore {
  bidId: string
  criterionId: string
  individualScores: {
    evaluatorId: string
    score: number
  }[]
  consensusScore?: number
  variance: number
  requiresDiscussion: boolean
}

export interface DiscussionNote {
  id: string
  bidId: string
  criterionId?: string
  note: string
  addedBy: string
  addedAt: string
  resolved: boolean
}

// Evaluation templates
export interface EvaluationTemplate {
  id: string
  name: string
  description?: string
  industry?: string
  criteria: EvaluationCriterion[]
  scoringMethod: string
  createdBy: string
  isPublic: boolean
  usageCount: number
}

// Conflict of interest
export interface ConflictOfInterest {
  evaluatorId: string
  bidId: string
  type: 'financial' | 'personal' | 'professional' | 'other'
  description: string
  declaredAt: string
  mitigationAction?: 'recuse' | 'disclose' | 'none'
}

// Evaluation matrix for comparison
export interface EvaluationMatrix {
  criteria: string[]
  bids: {
    bidId: string
    bidderName: string
    scores: number[] // Aligned with criteria array
    totalScore: number
    rank: number
  }[]
  averageScores: number[] // Average per criterion
  weights: number[] // Criterion weights
}