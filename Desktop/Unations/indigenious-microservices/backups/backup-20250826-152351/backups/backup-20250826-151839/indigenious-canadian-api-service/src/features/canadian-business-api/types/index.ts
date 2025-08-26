// Canadian Business Directory API Types

export interface CanadianBusiness {
  id: string
  businessName: string
  legalName: string
  businessNumber: string // CRA Business Number
  description: string
  logo?: string
  website?: string
  email: string
  phone: string
  
  // Industry Classification
  industry: {
    primary: IndustryType
    secondary: IndustryType[]
    naicsCode: string[]
    services: string[]
    specializations: string[]
  }
  
  // Business Information
  businessInfo: {
    established: Date
    employeeCount: number
    revenue: RevenueRange
    headquarters: Address
    locations: BusinessLocation[]
    ownership: OwnershipStructure
    publiclyTraded: boolean
    stockSymbol?: string
  }
  
  // Certifications & Qualifications
  certifications: {
    iso: ISOCertification[]
    professional: ProfessionalCertification[]
    safety: SafetyCertification[]
    environmental: EnvironmentalCertification[]
    quality: QualityCertification[]
    indigenous: IndigenousCertification[]
  }
  
  // Indigenous Partnership Information
  indigenousPartnerships: {
    hasPartnerships: boolean
    partnershipType: PartnershipType[]
    partners: IndigenousPartner[]
    benefitAgreements: BenefitAgreement[]
    communityInvestment: number
    indigenousEmployment: {
      count: number
      percentage: number
      positions: string[]
    }
  }
  
  // Capabilities & Experience
  capabilities: {
    coreCompetencies: string[]
    projectTypes: string[]
    equipmentOwned: Equipment[]
    maxProjectSize: string
    geographicReach: GeographicReach
    remoteCapability: boolean
    winterRoadExperience: boolean
  }
  
  // Past Performance
  performance: {
    completedProjects: number
    totalContractValue: number
    governmentContracts: number
    indigenousContracts: number
    avgProjectSize: number
    onTimeDelivery: number
    safetyRecord: SafetyRecord
    clientReferences: ClientReference[]
  }
  
  // Compliance & Risk
  compliance: {
    wsib: boolean
    liabilityInsurance: InsuranceCoverage
    bondingCapacity: number
    securityClearance?: SecurityClearance
    indigenousContentRequirements: boolean
    environmentalCompliance: string[]
  }
  
  // API Access & Integration
  apiAccess: {
    tier: 'verified' | 'partner' | 'premium'
    verificationStatus: VerificationStatus
    apiUsage: APIUsageStats
    dataQuality: DataQualityScore
  }
}

export type IndustryType = 
  // Primary Industries
  | 'Mining'
  | 'Oil & Gas'
  | 'Forestry'
  | 'Energy'
  | 'Infrastructure'
  | 'Construction'
  | 'Manufacturing'
  | 'Technology'
  
  // Professional Services
  | 'Legal Services'
  | 'Engineering'
  | 'Architecture'
  | 'Accounting'
  | 'Consulting'
  | 'Environmental Services'
  | 'Project Management'
  | 'Financial Services'
  
  // Support Services
  | 'Transportation'
  | 'Logistics'
  | 'Equipment Rental'
  | 'Staffing'
  | 'Training'
  | 'Catering'
  | 'Security'
  | 'Telecommunications'

export interface IndustrySpecificData {
  // Mining Specific
  mining?: {
    commodities: string[]
    miningTypes: ('Open Pit' | 'Underground' | 'Placer' | 'Quarry')[]
    equipmentFleet: MiningEquipment[]
    certifications: string[]
    indigenousMiningAgreements: number
  }
  
  // Oil & Gas Specific
  oilGas?: {
    segments: ('Upstream' | 'Midstream' | 'Downstream' | 'Services')[]
    services: string[]
    pipelineExperience: boolean
    arcticExperience: boolean
    lngExperience: boolean
    indigenousEnergyPartnerships: number
  }
  
  // Forestry Specific
  forestry?: {
    forestryTypes: ('Harvesting' | 'Silviculture' | 'Mill Operations' | 'Value-Added')[]
    certifications: ('FSC' | 'PEFC' | 'SFI')[]
    annualCapacity: number
    sustainablePractices: string[]
    indigenousForestryAgreements: number
  }
  
  // Infrastructure Specific
  infrastructure?: {
    projectTypes: string[]
    specializations: string[]
    publicPrivatePartnership: boolean
    designBuildCapability: boolean
    indigenousInfrastructure: number
  }
  
  // Professional Services Specific
  professionalServices?: {
    practiceAreas: string[]
    industryFocus: string[]
    indigenousLawExperience?: boolean
    resourceSectorExperience: string[]
    languages: string[]
  }
}

export interface PartnershipType {
  type: 'Joint Venture' | 'Subcontractor' | 'Supplier' | 'Equity Partner' | 'Impact Benefit Agreement'
  percentage?: number
  description: string
}

export interface IndigenousPartner {
  name: string
  nation: string
  partnershipType: string
  since: Date
  activeProjects: number
}

export interface BenefitAgreement {
  community: string
  type: string
  value: number
  duration: string
  benefits: string[]
}

export interface Equipment {
  type: string
  make: string
  model: string
  year: number
  quantity: number
  condition: 'Excellent' | 'Good' | 'Fair'
}

export interface SafetyRecord {
  lastIncident: Date | null
  lostTimeInjuries: number
  totalRecordableIncidentRate: number
  certifications: string[]
}

export interface ClientReference {
  organization: string
  contactName: string
  projectType: string
  value: number
  rating: number
  wouldRehire: boolean
}

export interface VerificationStatus {
  verified: boolean
  verifiedDate: Date
  verifiedBy: string
  documents: VerificationDocument[]
  nextReview: Date
}

export interface VerificationDocument {
  type: string
  fileName: string
  uploadDate: Date
  expiryDate?: Date
  status: 'Valid' | 'Expired' | 'Under Review'
}

// API Structures
export interface CanadianBusinessSearchParams {
  // Basic Search
  query?: string
  industries?: IndustryType[]
  
  // Location
  location?: {
    province?: string
    city?: string
    radius?: number
    remoteCapable?: boolean
  }
  
  // Indigenous Partnerships
  indigenousPartnerships?: {
    required: boolean
    minPartnershipLevel?: number
    specificNations?: string[]
  }
  
  // Capabilities
  capabilities?: {
    services?: string[]
    certifications?: string[]
    minEmployees?: number
    maxEmployees?: number
    minRevenue?: string
    bondingCapacity?: number
  }
  
  // Experience
  experience?: {
    minYears?: number
    governmentExperience?: boolean
    indigenousExperience?: boolean
    specificSectors?: string[]
  }
  
  // Compliance
  compliance?: {
    wsib?: boolean
    securityClearance?: string
    environmentalCertifications?: string[]
  }
  
  // Advanced
  sort?: 'relevance' | 'rating' | 'size' | 'experience' | 'indigenous_partnerships'
  verified?: boolean
  page?: number
  limit?: number
}

export interface IndustryMarketplace {
  id: string
  name: string
  description: string
  
  // Market Statistics
  stats: {
    totalBusinesses: number
    verifiedBusinesses: number
    indigenousPartnerships: number
    totalContractValue: number
    activeOpportunities: number
  }
  
  // Featured Opportunities
  opportunities: {
    government: number
    indigenous: number
    private: number
    upcoming: MarketOpportunity[]
  }
  
  // Key Players
  topBusinesses: {
    bySize: CanadianBusiness[]
    byPartnerships: CanadianBusiness[]
    byExperience: CanadianBusiness[]
  }
  
  // Indigenous Integration
  indigenousMetrics: {
    totalPartnerships: number
    employmentCreated: number
    revenueShared: number
    communitiesImpacted: number
  }
}

export interface MarketOpportunity {
  id: string
  title: string
  client: string
  value: string
  deadline: Date
  indigenousRequirement: boolean
  requiredCapabilities: string[]
}

// Specialized API Endpoints
export interface PartnershipMatchingParams {
  businessId: string
  seekingType: 'Indigenous Partner' | 'Technical Partner' | 'Financial Partner'
  projectType: string
  location: string
  requiredCapabilities: string[]
  indigenousContentTarget: number
}

export interface PartnershipMatch {
  partner: CanadianBusiness
  matchScore: number
  matchReasons: string[]
  complementaryCapabilities: string[]
  pastCollaborations: number
  successRate: number
}

// Subscription Tiers for Canadian Businesses
export interface CanadianBusinessSubscription {
  tier: 'verified' | 'partner' | 'premium'
  
  verified: {
    price: 99 // per month
    features: [
      'Basic directory listing',
      'Verification badge',
      'RFQ notifications',
      '5 partnership connections/month'
    ]
  }
  
  partner: {
    price: 499 // per month
    features: [
      'Enhanced profile',
      'Indigenous partnership matching',
      'Unlimited connections',
      'Analytics dashboard',
      'Priority in search results'
    ]
  }
  
  premium: {
    price: 1999 // per month
    features: [
      'Full API access',
      'White-label integration',
      'Dedicated account manager',
      'Custom partnership algorithms',
      'Market intelligence reports',
      'Compliance automation'
    ]
  }
}

export interface RevenueRange {
  min: number
  max: number
  currency: 'CAD'
  verified: boolean
}

export interface Address {
  street: string
  city: string
  province: string
  postalCode: string
  country: 'Canada'
}

export interface BusinessLocation extends Address {
  type: 'Headquarters' | 'Office' | 'Facility' | 'Site'
  employees: number
}

export interface OwnershipStructure {
  type: 'Private' | 'Public' | 'Crown Corporation' | 'Partnership' | 'Cooperative'
  indigenousOwnership?: number
  womenOwnership?: number
  minorityOwnership?: number
}

export interface GeographicReach {
  national: boolean
  provinces: string[]
  international: string[]
  remoteAccess: boolean
  flyInCapability: boolean
}

export interface ISOCertification {
  standard: string
  scope: string
  issuer: string
  issueDate: Date
  expiryDate: Date
}

export interface ProfessionalCertification {
  name: string
  issuer: string
  holders: number
  types: string[]
}

export interface SafetyCertification {
  type: string
  standard: string
  rating?: string
  validUntil: Date
}

export interface EnvironmentalCertification {
  type: string
  level?: string
  scope: string
  validUntil: Date
}

export interface QualityCertification {
  standard: string
  scope: string
  rating?: number
  lastAudit: Date
}

export interface IndigenousCertification {
  type: 'CCAB' | 'Provincial' | 'Federal' | 'Industry'
  level?: string
  verifiedDate: Date
  expiryDate: Date
}

export interface InsuranceCoverage {
  general: number
  professional?: number
  environmental?: number
  cyber?: number
}

export interface SecurityClearance {
  level: 'Reliability' | 'Secret' | 'Top Secret'
  issuedDate: Date
  expiryDate: Date
  employees: number
}

export interface APIUsageStats {
  tier: string
  monthlyRequests: number
  dataAccessed: number
  partnershipRequests: number
  lastActive: Date
}

export interface DataQualityScore {
  completeness: number
  accuracy: number
  recency: number
  overall: number
}