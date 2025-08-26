// Authentication Types
// TypeScript types for user authentication and profile management

export type UserRole = 'business_owner' | 'government_user' | 'individual' | 'admin' | 'moderator'
export type UserType = 'indigenous_business' | 'non_indigenous_business' | 'government' | 'individual'
export type AuthProvider = 'email' | 'google' | 'microsoft' | 'gc_key' | 'linkedin'
export type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired'
export type AccountStatus = 'active' | 'pending' | 'suspended' | 'deactivated' | 'banned'

export interface User {
  id: string
  email: string
  emailVerified: boolean
  phone?: string
  phoneVerified: boolean
  
  // Authentication
  passwordHash?: string
  lastLogin?: string
  loginCount: number
  mfaEnabled: boolean
  mfaSecret?: string
  
  // Profile
  profile: UserProfile
  
  // Account management
  role: UserRole
  type: UserType
  status: AccountStatus
  verificationStatus: VerificationStatus
  
  // Preferences
  preferences: UserPreferences
  privacySettings: PrivacySettings
  notificationSettings: NotificationSettings
  
  // Metadata
  createdAt: string
  updatedAt: string
  lastActiveAt?: string
  
  // Indigenous-specific
  indigenousIdentity?: IndigenousIdentity
  
  // Government-specific
  governmentDetails?: GovernmentDetails
  
  // Sessions and security
  sessions: UserSession[]
  loginHistory: LoginAttempt[]
  
  // Verification
  verificationDocuments: VerificationDocument[]
  verificationNotes?: string
  verifiedBy?: string
  verifiedAt?: string
}

export interface UserProfile {
  // Basic information
  firstName: string
  lastName: string
  displayName?: string
  traditionalName?: string
  preferredName?: string
  
  // Contact information
  email: string
  phone?: string
  address?: Address
  website?: string
  
  // Professional information
  title?: string
  organization?: string
  bio?: string
  
  // Visual identity
  avatar?: string
  coverImage?: string
  
  // Business profile (if applicable)
  businessProfile?: BusinessProfile
  
  // Individual profile (if applicable)
  individualProfile?: IndividualProfile
  
  // Languages and accessibility
  languages: string[]
  primaryLanguage: string
  accessibilityNeeds?: string[]
  
  // Cultural context
  culturalInformation?: CulturalInformation
}

export interface BusinessProfile {
  // Company information
  legalName: string
  tradeName?: string
  businessNumber?: string
  incorporationNumber?: string
  incorporationDate?: string
  
  // Business structure
  businessType: 'sole_proprietorship' | 'partnership' | 'corporation' | 'cooperative' | 'non_profit'
  industryClassification: string[]
  naicsCode?: string
  
  // Indigenous business details
  indigenousOwnership?: number // percentage
  indigenousEmployees?: number
  totalEmployees?: number
  
  // Capabilities and services
  serviceCategories: string[]
  capabilities: string[]
  experience: ExperienceEntry[]
  certifications: Certification[]
  
  // Geographic information
  serviceAreas: string[]
  headquarters: Address
  locations: Address[]
  
  // Financial information
  annualRevenue?: number
  bondingCapacity?: number
  insuranceCoverage?: InsuranceCoverage[]
  
  // Marketing and description
  description: string
  keyPersonnel: KeyPersonnel[]
  portfolio: PortfolioItem[]
  
  // Compliance and certifications
  licenses: License[]
  qualifications: Qualification[]
  
  // References and past performance
  references: Reference[]
  pastPerformance: PerformanceRecord[]
}

export interface IndividualProfile {
  // Professional background
  currentPosition?: string
  employer?: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  certifications: Certification[]
  
  // Skills and expertise
  skills: string[]
  specializations: string[]
  interests: string[]
  
  // Professional goals
  seekingOpportunities: boolean
  availableForConsulting: boolean
  openToPartnerships: boolean
  
  // Portfolio and achievements
  portfolio: PortfolioItem[]
  achievements: Achievement[]
  publications: Publication[]
}

export interface IndigenousIdentity {
  // Nation and community
  firstNation?: string
  tribe?: string
  nation?: string
  traditionalTerritory?: string
  
  // Registration and status
  statusCardNumber?: string
  bandMembershipNumber?: string
  inuitBeneficiaryNumber?: string
  metisNumber?: string
  
  // Cultural information
  traditionalLanguage?: string
  clanOrFamily?: string
  ceremonialRole?: string
  
  // Business ownership
  indigenousOwnershipPercentage?: number
  ownershipDocumentation?: string[]
  
  // Community connections
  communityLeadership?: string[]
  culturalPractices?: string[]
  traditionalKnowledge?: string[]
  
  // Verification status
  verificationStatus: VerificationStatus
  verificationDocuments: string[]
  verifiedBy?: string
  verifiedAt?: string
}

export interface GovernmentDetails {
  // Department information
  department: string
  agency?: string
  branch?: string
  division?: string
  
  // Position and authority
  position: string
  level: string
  procurementAuthority?: number
  delegatedAuthority?: string[]
  
  // Contact information
  officeAddress: Address
  directPhone?: string
  officePhone?: string
  
  // Manager and approval chain
  managerName?: string
  managerEmail?: string
  approvalRequired: boolean
  
  // Security and access
  securityClearance?: string
  systemAccess: string[]
  
  // Verification
  verificationMethod: 'email_domain' | 'manager_approval' | 'hr_verification'
  verifiedByManager?: boolean
  managerApprovalDate?: string
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
  isOnReserve?: boolean
  traditionalTerritory?: string
}

export interface ExperienceEntry {
  id: string
  title: string
  organization: string
  description: string
  startDate: string
  endDate?: string
  location?: string
  achievements?: string[]
  skills?: string[]
  relevantToIndigenousProcurement?: boolean
}

export interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  graduationDate?: string
  gpa?: number
  honors?: string[]
  relevantCourses?: string[]
}

export interface Certification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  verificationUrl?: string
  level?: string
  status: 'active' | 'expired' | 'pending' | 'revoked'
}

export interface License {
  id: string
  type: string
  number: string
  issuingAuthority: string
  issueDate: string
  expiryDate?: string
  status: 'active' | 'expired' | 'suspended' | 'revoked'
  restrictions?: string[]
}

export interface Qualification {
  id: string
  name: string
  description: string
  issuingBody: string
  achievedDate: string
  level?: string
  prerequisites?: string[]
}

export interface KeyPersonnel {
  id: string
  name: string
  title: string
  role: string
  email?: string
  phone?: string
  experience: string
  certifications?: string[]
  isIndigenous?: boolean
}

export interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  client?: string
  completionDate?: string
  value?: number
  images?: string[]
  documents?: string[]
  testimonial?: string
  awards?: string[]
  indigenousContent?: number
}

export interface Reference {
  id: string
  name: string
  title: string
  organization: string
  email?: string
  phone?: string
  relationship: string
  projectDescription?: string
  workPeriod?: {
    start: string
    end: string
  }
  canContact: boolean
  lastContactDate?: string
}

export interface PerformanceRecord {
  id: string
  contractNumber: string
  clientName: string
  projectTitle: string
  contractValue: number
  completionDate: string
  performanceRating?: number
  onTime: boolean
  onBudget: boolean
  qualityScore?: number
  clientSatisfaction?: number
  lessonsLearned?: string[]
  challenges?: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  date: string
  category: string
  issuingOrganization?: string
  recognition?: string
  media?: string[]
}

export interface Publication {
  id: string
  title: string
  type: 'article' | 'book' | 'report' | 'presentation' | 'other'
  publisher?: string
  publicationDate: string
  url?: string
  description?: string
  coAuthors?: string[]
}

export interface InsuranceCoverage {
  type: string
  provider: string
  coverageAmount: number
  expiryDate: string
  policyNumber: string
  certificate?: string
}

export interface CulturalInformation {
  // Traditional knowledge and practices
  traditionalPractices?: string[]
  culturalSkills?: string[]
  languageSkills?: LanguageSkill[]
  
  // Cultural protocols and preferences
  culturalProtocols?: string[]
  ceremonyParticipation?: string[]
  traditionalRoles?: string[]
  
  // Community involvement
  communityRoles?: string[]
  elderStatus?: boolean
  knowledgeKeeperStatus?: boolean
  
  // Consent and sharing preferences
  canShareTraditionalKnowledge?: boolean
  culturalKnowledgeRestrictions?: string[]
  appropriateUseGuidelines?: string[]
}

export interface LanguageSkill {
  language: string
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'native'
  canSpeak: boolean
  canRead: boolean
  canWrite: boolean
  traditionalOrthography?: boolean
}

export interface UserPreferences {
  // Interface preferences
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  dateFormat: string
  
  // Content preferences
  showCulturalContent: boolean
  showTraditionalNames: boolean
  useTraditionalCalendar: boolean
  
  // Communication preferences
  preferredContactMethod: 'email' | 'phone' | 'message'
  businessHours?: {
    start: string
    end: string
    timezone: string
    days: string[]
  }
  
  // Platform behavior
  autoSaveEnabled: boolean
  showTooltips: boolean
  emailDigest: 'daily' | 'weekly' | 'monthly' | 'none'
  
  // Accessibility
  highContrast: boolean
  largeText: boolean
  screenReader: boolean
  keyboardNavigation: boolean
}

export interface PrivacySettings {
  // Profile visibility
  profileVisibility: 'public' | 'members_only' | 'private'
  showEmail: boolean
  showPhone: boolean
  showAddress: boolean
  
  // Business information visibility
  showFinancialInfo: boolean
  showEmployeeCount: boolean
  showRevenue: boolean
  
  // Cultural information sharing
  shareCulturalInformation: boolean
  shareTraditionalKnowledge: boolean
  allowCulturalConsultation: boolean
  
  // Data sharing and analytics
  allowAnalytics: boolean
  allowMarketingCommunications: boolean
  allowThirdPartySharing: boolean
  
  // Indigenous data sovereignty
  indigenousDataConsent?: {
    communityConsent: boolean
    traditionalGovernanceApproval: boolean
    benefitSharingAgreement: boolean
    dataRepatriationRights: boolean
  }
}

export interface NotificationSettings {
  // Email notifications
  emailNotifications: boolean
  emailTypes: {
    newOpportunities: boolean
    applicationUpdates: boolean
    messages: boolean
    systemUpdates: boolean
    newsletters: boolean
  }
  
  // SMS notifications
  smsNotifications: boolean
  smsTypes: {
    urgentMessages: boolean
    deadlineReminders: boolean
    verificationCodes: boolean
  }
  
  // Push notifications
  pushNotifications: boolean
  pushTypes: {
    newMessages: boolean
    opportunities: boolean
    deadlines: boolean
    systemAlerts: boolean
  }
  
  // Frequency settings
  digestFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
  quietHours?: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
}

export interface UserSession {
  id: string
  userId: string
  deviceId: string
  deviceName?: string
  ipAddress: string
  userAgent: string
  location?: string
  isActive: boolean
  lastActivity: string
  createdAt: string
  expiresAt: string
}

export interface LoginAttempt {
  id: string
  userId?: string
  email: string
  ipAddress: string
  userAgent: string
  success: boolean
  method: AuthProvider
  mfaUsed: boolean
  failureReason?: string
  timestamp: string
  location?: string
}

export interface VerificationDocument {
  id: string
  userId: string
  type: 'status_card' | 'incorporation_docs' | 'business_license' | 'financial_statement' | 'insurance_certificate' | 'other'
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  expiryDate?: string
  isRequired: boolean
  category: 'identity' | 'business' | 'financial' | 'certification' | 'other'
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  expiresAt: string
  scope: string[]
}

export interface RegistrationStep {
  id: string
  title: string
  description: string
  component: string
  required: boolean
  completed: boolean
  order: number
  dependencies?: string[]
  estimatedTime: number
  helpText?: string
}

export interface RegistrationProgress {
  userId: string
  currentStep: string
  completedSteps: string[]
  skippedSteps: string[]
  startedAt: string
  lastActiveAt: string
  estimatedCompletion?: string
  totalSteps: number
  completionPercentage: number
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  preventReuse: number
  maxAge: number
  complexityScore: number
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy
  mfaRequired: boolean
  allowedMfaMethods: string[]
  sessionTimeout: number
  maxConcurrentSessions: number
  ipWhitelist?: string[]
  allowedCountries?: string[]
  requireDeviceVerification: boolean
  loginNotifications: boolean
}