// Bill of Quantities (BOQ) Management Types for Construction Projects

// Core BOQ structure
export interface BOQ {
  id: string
  projectId: string
  projectName: string
  version: number
  revision: string // e.g., "A", "B", "C"
  status: BOQStatus
  discipline: BOQDiscipline
  
  // Metadata
  metadata: BOQMetadata
  
  // Hierarchical items
  sections: BOQSection[]
  
  // Totals
  summary: BOQSummary
  
  // Collaboration
  collaboration: BOQCollaboration
  
  // Audit trail
  history: BOQHistoryEntry[]
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  lockedAt?: Date
}

export type BOQStatus = 
  | 'draft'
  | 'review'
  | 'pending_approval'
  | 'approved'
  | 'locked'
  | 'superseded'

export type BOQDiscipline = 
  | 'architectural'
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'civil'
  | 'landscape'
  | 'all_trades'

export interface BOQMetadata {
  createdBy: string
  createdByRole: UserRole
  organization: string
  
  // Project details
  project: {
    type: ProjectType
    location: string
    indigenousCommunity?: string
    indigenousContentTarget: number // percentage
  }
  
  // Reference documents
  references: {
    drawings: string[]
    specifications: string[]
    standards: string[]
  }
  
  // Custom fields
  customFields?: Record<string, any>
}

// Hierarchical BOQ structure
export interface BOQSection {
  id: string
  code: string // e.g., "A", "B", "C"
  name: string // e.g., "Substructure", "Superstructure"
  description?: string
  order: number
  
  // Child sections or items
  subsections?: BOQSection[]
  items?: BOQItem[]
  
  // Section totals
  totals: {
    items: number
    quantity: number
    amount: number
    indigenousAmount: number
  }
}

export interface BOQItem {
  id: string
  code: string // e.g., "A.1.1", "B.2.3"
  description: string
  longDescription?: string
  
  // Quantities
  quantity: number
  unit: MeasurementUnit
  wasteFactor?: number // percentage
  totalQuantity?: number // quantity + waste
  
  // Pricing
  rate?: number
  amount?: number // quantity * rate
  currency: string
  
  // Supplier/Contractor info
  supplier?: SupplierInfo
  
  // Specifications
  specifications: {
    material?: string
    standard?: string
    grade?: string
    finish?: string
    customSpecs?: Record<string, string>
  }
  
  // Tracking
  status: ItemStatus
  notes?: string
  attachments?: Attachment[]
  
  // Indigenous tracking
  indigenousContent: {
    percentage: number
    supplier?: IndigenousSupplier
    communityBenefit?: string
  }
  
  // Revision tracking
  addedInRevision: string
  modifiedInRevision?: string
  deletedInRevision?: string
}

export type MeasurementUnit = 
  | 'm' | 'm²' | 'm³' // Metric
  | 'ft' | 'ft²' | 'ft³' // Imperial
  | 'ea' | 'no' // Count
  | 'kg' | 'lb' // Weight
  | 'l' | 'gal' // Volume
  | 'hr' | 'day' // Time
  | 'ls' // Lump sum
  | string // Custom unit

export type ItemStatus = 
  | 'active'
  | 'provisional'
  | 'deleted'
  | 'substituted'
  | 'on_hold'

export interface SupplierInfo {
  id: string
  name: string
  contact?: string
  email?: string
  phone?: string
  isPreferred: boolean
  isIndigenous: boolean
  certifications?: string[]
}

export interface IndigenousSupplier extends SupplierInfo {
  communityAffiliation: string
  indigenousCertification: {
    type: 'CCAB' | 'Band-Owned' | 'Indigenous-Owned'
    certNumber: string
    validUntil: Date
  }
  localEmployment: number // percentage
  communityBenefits: string[]
}

// BOQ Summary and totals
export interface BOQSummary {
  totalItems: number
  totalAmount: number
  
  // By section
  sectionTotals: Array<{
    sectionCode: string
    sectionName: string
    amount: number
    percentage: number
  }>
  
  // By trade
  tradeTotals: Array<{
    trade: string
    amount: number
    percentage: number
  }>
  
  // Indigenous content
  indigenousContent: {
    totalAmount: number
    percentage: number
    byCategory: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  
  // Status summary
  itemsByStatus: Record<ItemStatus, number>
}

// Collaboration features
export interface BOQCollaboration {
  // Access control
  access: Array<{
    userId: string
    userRole: UserRole
    permissions: BOQPermission[]
    grantedAt: Date
    grantedBy: string
  }>
  
  // Comments
  comments: Comment[]
  
  // Approvals
  approvals: ApprovalRecord[]
  
  // Change tracking
  changeRequests: ChangeRequest[]
  
  // Sharing
  sharedLinks?: Array<{
    id: string
    url: string
    validUntil?: Date
    accessLevel: 'view' | 'comment' | 'edit'
    createdAt: Date
  }>
}

export type UserRole = 
  | 'architect'
  | 'engineer'
  | 'quantity_surveyor'
  | 'project_manager'
  | 'contractor'
  | 'subcontractor'
  | 'client'
  | 'consultant'
  | 'indigenous_liaison'

export type BOQPermission = 
  | 'view'
  | 'comment'
  | 'edit_quantities'
  | 'edit_rates'
  | 'add_items'
  | 'delete_items'
  | 'approve'
  | 'lock'
  | 'export'
  | 'share'

export interface Comment {
  id: string
  itemId?: string // If commenting on specific item
  sectionId?: string // If commenting on section
  text: string
  author: string
  authorRole: UserRole
  timestamp: Date
  resolved: boolean
  replies?: Comment[]
  attachments?: Attachment[]
}

export interface ApprovalRecord {
  id: string
  approver: string
  approverRole: UserRole
  status: 'pending' | 'approved' | 'rejected' | 'conditional'
  comments?: string
  conditions?: string[]
  timestamp: Date
  signature?: string // Digital signature
}

export interface ChangeRequest {
  id: string
  requestedBy: string
  requestedAt: Date
  type: 'addition' | 'deletion' | 'modification' | 'substitution'
  itemIds: string[]
  description: string
  justification: string
  impact: {
    cost: number
    schedule: string
    indigenousContent: number
  }
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: Date
}

// History tracking
export interface BOQHistoryEntry {
  id: string
  version: number
  revision: string
  action: HistoryAction
  userId: string
  userName: string
  timestamp: Date
  details: {
    itemsAdded?: number
    itemsModified?: number
    itemsDeleted?: number
    previousTotal?: number
    newTotal?: number
    changes?: Array<{
      itemId: string
      field: string
      oldValue: any
      newValue: any
    }>
  }
  comment?: string
}

export type HistoryAction = 
  | 'created'
  | 'edited'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'unlocked'
  | 'shared'
  | 'exported'
  | 'revision_created'

// Import/Export formats
export interface BOQImportFormat {
  format: 'excel' | 'csv' | 'json' | 'xml'
  mapping: {
    code: string
    description: string
    quantity: string
    unit: string
    rate?: string
    amount?: string
    [key: string]: string | undefined
  }
  options: {
    hasHeaders: boolean
    startRow?: number
    sheetName?: string
    delimiter?: string
    encoding?: string
  }
}

export interface BOQExportFormat {
  format: 'excel' | 'csv' | 'pdf' | 'json'
  template?: string
  options: {
    includeRates: boolean
    includeAmounts: boolean
    includeSuppliers: boolean
    includeSpecifications: boolean
    includeComments: boolean
    groupBy?: 'section' | 'trade' | 'supplier'
    indigenousContentReport: boolean
  }
}

// Templates
export interface BOQTemplate {
  id: string
  name: string
  description: string
  discipline: BOQDiscipline
  projectType: ProjectType
  
  // Pre-defined structure
  sections: Array<{
    code: string
    name: string
    items: Array<{
      code: string
      description: string
      unit: MeasurementUnit
      specifications?: any
    }>
  }>
  
  // Template metadata
  createdBy: string
  organization: string
  isPublic: boolean
  isIndigenousOptimized: boolean
  tags: string[]
  usageCount: number
  rating: number
  
  createdAt: Date
  updatedAt: Date
}

export type ProjectType = 
  | 'residential'
  | 'commercial'
  | 'institutional'
  | 'infrastructure'
  | 'industrial'
  | 'renovation'
  | 'indigenous_housing'
  | 'community_center'
  | 'health_facility'
  | 'education_facility'

// Attachments
export interface Attachment {
  id: string
  filename: string
  fileType: string
  fileSize: number
  url: string
  uploadedBy: string
  uploadedAt: Date
  description?: string
}

// Real-time collaboration
export interface BOQCollaborationEvent {
  type: 'user_joined' | 'user_left' | 'item_locked' | 'item_unlocked' | 'changes_made'
  userId: string
  userName: string
  itemId?: string
  timestamp: Date
  details?: any
}

export interface BOQLock {
  itemId: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
}

// Workflow types
export interface BOQWorkflow {
  id: string
  name: string
  steps: WorkflowStep[]
  currentStep: number
  status: 'active' | 'completed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'review' | 'approval' | 'notification'
  assignees: string[]
  dueDate?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  completedBy?: string
  completedAt?: Date
  comments?: string
}

// Analytics
export interface BOQAnalytics {
  projectId: string
  
  // Cost analysis
  costBreakdown: {
    bySection: Array<{ section: string; amount: number; percentage: number }>
    byTrade: Array<{ trade: string; amount: number; percentage: number }>
    bySupplier: Array<{ supplier: string; amount: number; percentage: number }>
  }
  
  // Indigenous content analysis
  indigenousAnalysis: {
    totalPercentage: number
    bySection: Array<{ section: string; percentage: number }>
    bySupplier: Array<{ supplier: string; amount: number }>
    communityBenefits: string[]
    localEmployment: number
  }
  
  // Revision analysis
  revisionMetrics: {
    totalRevisions: number
    averageChangesPerRevision: number
    costVariance: number
    mostChangedItems: Array<{ itemId: string; changeCount: number }>
  }
  
  // Collaboration metrics
  collaborationMetrics: {
    totalUsers: number
    totalComments: number
    averageApprovalTime: number
    activeUsers: number
  }
}