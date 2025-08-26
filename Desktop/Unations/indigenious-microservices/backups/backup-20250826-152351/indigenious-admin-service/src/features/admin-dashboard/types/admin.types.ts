// Admin Dashboard Types
// TypeScript types for administrative functions and system management

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'compliance_officer' | 'community_liaison' | 'support_specialist'
export type UserStatus = 'active' | 'pending' | 'suspended' | 'deactivated' | 'banned'
export type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_documentation'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type IncidentSeverity = 'info' | 'warning' | 'critical' | 'emergency'
export type ComplianceStatus = 'compliant' | 'warning' | 'non_compliant' | 'under_review'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  permissions: AdminPermissions
  lastLogin: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  department?: string
  phone?: string
  emergencyContact?: string
}

export interface AdminPermissions {
  canManageUsers: boolean
  canVerifyBusinesses: boolean
  canModerateContent: boolean
  canAccessFinancials: boolean
  canViewAnalytics: boolean
  canManageSystem: boolean
  canHandleSupport: boolean
  canManageCompliance: boolean
  canAccessAuditLogs: boolean
  canManageIntegrations: boolean
  canPerformBackups: boolean
  canManageRoles: boolean
  canAccessEmergencyMode: boolean
}

export interface PlatformUser {
  id: string
  email: string
  name: string
  type: 'business' | 'government' | 'individual'
  status: UserStatus
  verificationStatus: VerificationStatus
  createdAt: string
  lastLogin?: string
  loginCount: number
  
  // Business-specific
  businessName?: string
  businessType?: string
  indigenousOwnership?: number
  nation?: string
  territory?: string
  
  // Government-specific
  department?: string
  position?: string
  authority?: string
  
  // Profile data
  phone?: string
  address?: Address
  website?: string
  socialMedia?: Record<string, string>
  
  // Platform activity
  contractsWon?: number
  totalContractValue?: number
  bidCount?: number
  messageCount?: number
  documentsUploaded?: number
  
  // Moderation
  warnings?: number
  suspensions?: number
  reports?: number
  
  // Verification documents
  documents?: VerificationDocument[]
  verificationNotes?: string
  verifiedBy?: string
  verifiedAt?: string
}

export interface Address {
  street: string
  city: string
  province: string
  country: string
  postalCode: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface VerificationDocument {
  id: string
  userId: string
  type: 'certificate_of_incorporation' | 'business_license' | 'indigenous_certification' | 'financial_statement' | 'other'
  fileName: string
  fileUrl: string
  uploadedAt: string
  reviewedAt?: string
  reviewedBy?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
}

export interface SupportTicket {
  id: string
  ticketNumber: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  description: string
  category: 'technical' | 'account' | 'billing' | 'verification' | 'general'
  priority: TicketPriority
  status: TicketStatus
  assignedTo?: string
  assignedToName?: string
  tags: string[]
  
  // Resolution
  resolution?: string
  resolvedAt?: string
  resolvedBy?: string
  satisfactionRating?: number
  
  // Communication
  messages: TicketMessage[]
  internalNotes: TicketNote[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  escalatedAt?: string
  slaBreachAt?: string
  
  // Attachments
  attachments: TicketAttachment[]
}

export interface TicketMessage {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  senderType: 'user' | 'admin'
  content: string
  isInternal: boolean
  createdAt: string
  attachments?: TicketAttachment[]
}

export interface TicketNote {
  id: string
  ticketId: string
  adminId: string
  adminName: string
  content: string
  createdAt: string
}

export interface TicketAttachment {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  downloadUrl: string
  uploadedAt: string
  uploadedBy: string
}

export interface SystemHealthMetric {
  id: string
  metric: string
  value: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  threshold: {
    warning: number
    critical: number
  }
  timestamp: string
  trend: 'up' | 'down' | 'stable'
  description: string
}

export interface SecurityIncident {
  id: string
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'phishing' | 'ddos' | 'other'
  severity: IncidentSeverity
  title: string
  description: string
  
  // Detection
  detectedAt: string
  detectedBy: 'automated' | 'user_report' | 'admin'
  detectionMethod?: string
  
  // Impact
  affectedUsers?: string[]
  affectedSystems?: string[]
  dataInvolved?: string[]
  
  // Response
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed'
  assignedTo?: string
  responseActions: IncidentAction[]
  
  // Resolution
  rootCause?: string
  resolution?: string
  resolvedAt?: string
  
  // Compliance
  reportedToAuthorities?: boolean
  reportedAt?: string
  complianceOfficer?: string
  
  createdAt: string
  updatedAt: string
}

export interface IncidentAction {
  id: string
  incidentId: string
  action: string
  takenBy: string
  takenAt: string
  result?: string
  notes?: string
}

export interface AuditLogEntry {
  id: string
  userId?: string
  userName?: string
  userRole?: string
  action: string
  resource: string
  resourceId?: string
  
  // Action details
  method: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  endpoint?: string
  ipAddress: string
  userAgent: string
  
  // Changes
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  
  // Context
  sessionId: string
  requestId: string
  
  // Metadata
  timestamp: string
  success: boolean
  errorMessage?: string
  
  // Compliance
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
  retentionPeriod: number
  
  // Indigenous-specific
  involvesIndigenousData?: boolean
  communityConsent?: boolean
  traditionalKnowledge?: boolean
}

export interface ComplianceCheck {
  id: string
  regulation: string
  description: string
  category: 'privacy' | 'security' | 'accessibility' | 'indigenous_rights' | 'procurement'
  status: ComplianceStatus
  
  // Assessment
  lastChecked: string
  checkedBy: string
  score: number
  maxScore: number
  
  // Findings
  findings: ComplianceFinding[]
  recommendations: string[]
  
  // Remediation
  actionPlan?: string
  dueDate?: string
  assignedTo?: string
  
  // Evidence
  evidence: ComplianceEvidence[]
  
  createdAt: string
  updatedAt: string
  nextReview: string
}

export interface ComplianceFinding {
  id: string
  checkId: string
  requirement: string
  status: 'pass' | 'fail' | 'partial' | 'not_applicable'
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  evidence?: string
  recommendations?: string[]
}

export interface ComplianceEvidence {
  id: string
  checkId: string
  type: 'document' | 'screenshot' | 'log' | 'certificate' | 'other'
  fileName: string
  fileUrl: string
  description: string
  uploadedAt: string
  uploadedBy: string
}

export interface PlatformAnalytics {
  // User metrics
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  userGrowthRate: number
  
  // Business metrics
  totalBusinesses: number
  verifiedBusinesses: number
  indigenousBusinesses: number
  governmentUsers: number
  
  // Activity metrics
  totalRFQs: number
  activeRFQs: number
  completedContracts: number
  totalContractValue: number
  
  // Platform usage
  dailyActiveUsers: number
  weeklyActiveUsers: number
  monthlyActiveUsers: number
  avgSessionDuration: number
  
  // Performance metrics
  systemUptime: number
  avgResponseTime: number
  errorRate: number
  
  // Indigenous impact
  indigenousContractValue: number
  indigenousParticipationRate: number
  communitiesServed: number
  
  // Support metrics
  openTickets: number
  avgResolutionTime: number
  customerSatisfaction: number
  
  // Time series data
  userRegistrations: TimeSeriesData[]
  contractVolume: TimeSeriesData[]
  systemPerformance: TimeSeriesData[]
  
  // Geographic distribution
  usersByProvince: Record<string, number>
  contractsByRegion: Record<string, number>
  
  // Top performers
  topBusinesses: BusinessSummary[]
  topDepartments: DepartmentSummary[]
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

export interface BusinessSummary {
  id: string
  name: string
  contractsWon: number
  totalValue: number
  winRate: number
  indigenousContent: number
}

export interface DepartmentSummary {
  id: string
  name: string
  rfqsPosted: number
  contractsAwarded: number
  indigenousParticipation: number
  budget: number
}

export interface ContentModerationItem {
  id: string
  type: 'message' | 'document' | 'profile' | 'rfq' | 'bid'
  contentId: string
  content: string
  authorId: string
  authorName: string
  
  // Moderation
  reportedBy?: string
  reportReason?: string
  reportedAt?: string
  
  // Auto-detection
  flaggedBy?: 'user_report' | 'automated' | 'admin_review'
  flaggedReason?: string[]
  confidenceScore?: number
  
  // Review
  status: 'pending' | 'approved' | 'rejected' | 'requires_edit'
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  
  // Actions
  action?: 'none' | 'warning' | 'edit_required' | 'content_removed' | 'user_suspended'
  actionReason?: string
  
  // Cultural considerations
  culturallySensitive?: boolean
  traditionalKnowledge?: boolean
  requiresElderReview?: boolean
  
  createdAt: string
  updatedAt: string
}

export interface SystemConfiguration {
  id: string
  category: string
  key: string
  value: unknown
  type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  description: string
  isPublic: boolean
  requiresRestart: boolean
  validationRule?: string
  defaultValue: any
  lastModified: string
  modifiedBy: string
}

export interface BackupJob {
  id: string
  type: 'full' | 'incremental' | 'differential'
  status: 'scheduled' | 'running' | 'completed' | 'failed'
  
  // Scheduling
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  
  // Content
  databases: string[]
  fileStorages: string[]
  configurations: boolean
  
  // Results
  sizeBytes?: number
  duration?: number
  location?: string
  errorMessage?: string
  
  // Retention
  retentionDays: number
  autoDelete: boolean
  
  createdAt: string
  createdBy: string
}

export interface IntegrationConnection {
  id: string
  name: string
  type: 'payment_processor' | 'document_storage' | 'email_service' | 'sms_provider' | 'analytics' | 'crm' | 'other'
  provider: string
  status: 'active' | 'inactive' | 'error' | 'maintenance'
  
  // Configuration
  baseUrl?: string
  apiKey?: string
  webhookUrl?: string
  settings: Record<string, any>
  
  // Monitoring
  lastHealthCheck: string
  healthStatus: 'healthy' | 'degraded' | 'down'
  errorCount: number
  lastError?: string
  
  // Usage
  requestCount: number
  lastUsed?: string
  rateLimit?: number
  rateLimitRemaining?: number
  
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface AdminAction {
  id: string
  adminId: string
  adminName: string
  action: string
  targetType: 'user' | 'business' | 'rfq' | 'ticket' | 'system'
  targetId: string
  targetName?: string
  
  // Action details
  reason: string
  details?: Record<string, any>
  duration?: number // for temporary actions like suspensions
  
  // Impact
  affectedUsers?: string[]
  notificationsSent?: boolean
  
  // Approval
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: string
  
  createdAt: string
  expiresAt?: string
  reversedAt?: string
  reversedBy?: string
}