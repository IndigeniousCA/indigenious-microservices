// Security & Compliance Types
// TypeScript types for enterprise security and compliance systems

export type SecurityLevel = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
export type ComplianceFramework = 'fedramp' | 'pipeda' | 'cccs' | 'treasury_board' | 'indigenous_sovereignty'
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical' | 'emergency'
export type IncidentStatus = 'detected' | 'investigating' | 'containing' | 'mitigating' | 'resolved' | 'closed'
export type AccessType = 'read' | 'write' | 'delete' | 'admin' | 'emergency' | 'cultural_access'

export interface SecurityPolicy {
  id: string
  name: string
  version: string
  framework: ComplianceFramework
  description: string
  requirements: PolicyRequirement[]
  exceptions: PolicyException[]
  effectiveDate: string
  expiryDate?: string
  approvedBy: string
  lastReviewed: string
  nextReview: string
  mandatory: boolean
  scope: 'global' | 'department' | 'project' | 'community'
}

export interface PolicyRequirement {
  id: string
  category: string
  requirement: string
  implementation: string
  validation: string
  automation: boolean
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface PolicyException {
  id: string
  requirement: string
  justification: string
  approvedBy: string
  approvalDate: string
  expiryDate: string
  riskAcceptance: string
  compensatingControls: string[]
}

export interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: ThreatLevel
  status: IncidentStatus
  category: string
  detectedAt: string
  reportedAt: string
  reportedBy: string
  assignedTo: string
  affectedSystems: string[]
  affectedUsers: number
  dataImpact: boolean
  estimatedImpact: string
  timeline: IncidentEvent[]
  evidence: IncidentEvidence[]
  response: IncidentResponse
  lessons: string[]
  resolved: boolean
  resolvedAt?: string
  closeReason?: string
}

export interface IncidentEvent {
  timestamp: string
  event: string
  actor: string
  details: string
  automated: boolean
}

export interface IncidentEvidence {
  id: string
  type: 'log' | 'screenshot' | 'file' | 'network' | 'memory' | 'disk'
  description: string
  fileUrl?: string
  hash: string
  collectedAt: string
  collectedBy: string
  chainOfCustody: string[]
}

export interface IncidentResponse {
  containmentActions: string[]
  mitigationSteps: string[]
  communicationPlan: string[]
  recoveryProcedures: string[]
  preventiveMeasures: string[]
  estimatedCost?: number
  businessImpact: string
}

export interface ThreatDetection {
  id: string
  name: string
  description: string
  type: 'signature' | 'behavioral' | 'anomaly' | 'intelligence' | 'heuristic'
  severity: ThreatLevel
  confidence: number
  indicators: ThreatIndicator[]
  mitre: {
    tactic: string
    technique: string
    procedure: string
  }
  enabled: boolean
  lastTriggered?: string
  falsePositives: number
  truePositives: number
}

export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'user' | 'process' | 'file'
  value: string
  description: string
  source: string
  confidence: number
  lastSeen: string
}

export interface VulnerabilityAssessment {
  id: string
  title: string
  description: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  cvss: {
    score: number
    vector: string
    version: string
  }
  cve?: string
  affected: {
    systems: string[]
    components: string[]
    versions: string[]
  }
  impact: string
  exploitability: string
  remediation: {
    recommendation: string
    effort: 'low' | 'medium' | 'high'
    timeline: string
    priority: number
  }
  discovered: string
  discoveredBy: string
  verified: boolean
  patched: boolean
  patchedAt?: string
  acceptedRisk: boolean
  riskJustification?: string
}

export interface DataClassification {
  level: SecurityLevel
  label: string
  description: string
  handlingRequirements: string[]
  storageRequirements: string[]
  transmissionRequirements: string[]
  accessRequirements: string[]
  retentionRequirements: string
  disposalRequirements: string
  markingRequirements: string
  culturalConsiderations?: CulturalDataRequirements
}

export interface CulturalDataRequirements {
  traditionalGovernance: boolean
  elderApproval: boolean
  communityConsent: boolean
  seasonalRestrictions: string[]
  ceremonyRestrictions: string[]
  genderRestrictions?: string
  ageRestrictions?: string
  clanRestrictions?: string[]
  benefitSharing: boolean
  repatriationRights: boolean
}

export interface AccessControlPolicy {
  id: string
  resource: string
  permissions: Permission[]
  conditions: AccessCondition[]
  culturalProtocols?: CulturalAccessProtocol[]
  emergency: EmergencyAccess
  audit: boolean
  temporary: boolean
  duration?: number
  justification?: string
}

export interface Permission {
  role: string
  actions: AccessType[]
  constraints: string[]
  delegation: boolean
  inheritance: boolean
}

export interface AccessCondition {
  type: 'time' | 'location' | 'device' | 'network' | 'risk' | 'cultural'
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater' | 'less'
  value: string | string[] | number
  description: string
}

export interface CulturalAccessProtocol {
  type: 'elder_approval' | 'community_consent' | 'seasonal_restriction' | 'ceremony_restriction'
  description: string
  approvers: string[]
  restrictions: string[]
  override: boolean
  overrideJustification?: string
}

export interface EmergencyAccess {
  enabled: boolean
  conditions: string[]
  approvers: string[]
  duration: number
  audit: boolean
  notification: boolean
}

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceType: string
  outcome: 'success' | 'failure' | 'error'
  risk: ThreatLevel
  ip: string
  userAgent: string
  location?: string
  details: Record<string, any>
  sensitive: boolean
  dataAccessed?: string[]
  changes?: AuditChange[]
  compliance: string[]
}

export interface AuditChange {
  field: string
  oldValue: any
  newValue: any
  classification: SecurityLevel
}

export interface ComplianceStatus {
  framework: ComplianceFramework
  version: string
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown'
  score: number
  maxScore: number
  percentage: number
  lastAssessment: string
  nextAssessment: string
  controls: ControlStatus[]
  gaps: ComplianceGap[]
  exceptions: PolicyException[]
  recommendations: string[]
}

export interface ControlStatus {
  id: string
  name: string
  category: string
  implemented: boolean
  effective: boolean
  tested: boolean
  lastTest: string
  evidence: string[]
  gaps: string[]
  remediation?: string
}

export interface ComplianceGap {
  control: string
  requirement: string
  current: string
  gap: string
  risk: ThreatLevel
  remediation: string
  timeline: string
  owner: string
  status: 'open' | 'in_progress' | 'closed'
}

export interface EncryptionKey {
  id: string
  name: string
  type: 'symmetric' | 'asymmetric' | 'signing'
  algorithm: string
  keySize: number
  purpose: string[]
  created: string
  expires?: string
  status: 'active' | 'inactive' | 'compromised' | 'expired'
  owner: string
  escrow: boolean
  hardware: boolean
  rotation: {
    frequency: number
    lastRotation: string
    nextRotation: string
    automated: boolean
  }
}

export interface CryptographicOperation {
  id: string
  operation: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'hash'
  keyId: string
  algorithm: string
  timestamp: string
  userId: string
  dataSize: number
  success: boolean
  error?: string
  audit: boolean
}

export interface SecuritySession {
  id: string
  userId: string
  deviceId: string
  ipAddress: string
  userAgent: string
  location?: string
  startTime: string
  lastActivity: string
  endTime?: string
  mfaVerified: boolean
  riskScore: number
  anomalies: string[]
  active: boolean
  terminated: boolean
  terminationReason?: string
}

export interface DeviceTrust {
  deviceId: string
  userId: string
  deviceName: string
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'server'
  os: string
  browser?: string
  trusted: boolean
  registered: string
  lastSeen: string
  trustScore: number
  attributes: DeviceAttribute[]
  certificates: string[]
  compliance: boolean
  managed: boolean
}

export interface DeviceAttribute {
  name: string
  value: string
  verified: boolean
  lastUpdate: string
}

export interface RiskAssessment {
  id: string
  asset: string
  assetType: string
  assetValue: number
  threats: RiskThreat[]
  vulnerabilities: string[]
  controls: string[]
  inherentRisk: number
  residualRisk: number
  acceptableRisk: number
  treatment: 'accept' | 'mitigate' | 'transfer' | 'avoid'
  justification: string
  owner: string
  lastAssessment: string
  nextAssessment: string
}

export interface RiskThreat {
  threat: string
  likelihood: number
  impact: number
  risk: number
  mitigation: string[]
}

export interface IndigenousDataGovernance {
  communityId: string
  communityName: string
  traditionalTerritory: string
  dataTypes: string[]
  governance: {
    authority: string[]
    decisionMakers: string[]
    protocols: string[]
    restrictions: string[]
  }
  consent: {
    type: 'individual' | 'collective' | 'both'
    required: boolean
    ongoing: boolean
    withdrawal: boolean
    documentation: string[]
  }
  access: {
    community: boolean
    researchers: boolean
    government: boolean
    commercial: boolean
    conditions: string[]
  }
  benefits: {
    sharing: boolean
    types: string[]
    distribution: string
    accountability: string[]
  }
  repatriation: {
    rights: boolean
    process: string
    timeline: string
    format: string[]
  }
}

export interface SecurityAlert {
  id: string
  title: string
  description: string
  severity: ThreatLevel
  category: string
  source: string
  triggered: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  falsePositive: boolean
  escalated: boolean
  escalatedTo?: string
  notifications: string[]
  evidence: string[]
  indicators: ThreatIndicator[]
}

export interface PenetrationTest {
  id: string
  name: string
  type: 'black_box' | 'white_box' | 'gray_box'
  scope: string[]
  methodology: string[]
  startDate: string
  endDate: string
  tester: string
  findings: PenTestFinding[]
  summary: string
  recommendations: string[]
  retestRequired: boolean
  retestDate?: string
  approved: boolean
  approvedBy?: string
}

export interface PenTestFinding {
  id: string
  title: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  cvss: number
  description: string
  impact: string
  evidence: string[]
  reproduction: string[]
  remediation: string
  remediated: boolean
  remediatedAt?: string
  verified: boolean
  verifiedAt?: string
}

export interface BusinessContinuity {
  planId: string
  name: string
  version: string
  scope: string[]
  objectives: {
    rto: number // Recovery Time Objective (minutes)
    rpo: number // Recovery Point Objective (minutes)
    availability: number // Target availability percentage
  }
  procedures: BCProcedure[]
  contacts: BCContact[]
  resources: BCResource[]
  dependencies: string[]
  testing: {
    frequency: string
    lastTest: string
    nextTest: string
    results: string[]
  }
  activation: {
    triggers: string[]
    authority: string[]
    communication: string[]
  }
}

export interface BCProcedure {
  id: string
  name: string
  description: string
  steps: string[]
  owner: string
  dependencies: string[]
  estimated: number // minutes
  priority: number
}

export interface BCContact {
  role: string
  name: string
  primary: string
  secondary: string
  escalation: string
  availability: string
}

export interface BCResource {
  type: string
  name: string
  location: string
  capacity: string
  contact: string
  backup: boolean
}