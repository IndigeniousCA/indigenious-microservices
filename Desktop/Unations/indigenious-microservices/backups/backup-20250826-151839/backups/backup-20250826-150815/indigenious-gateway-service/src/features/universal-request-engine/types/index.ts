// Universal Business Request Engine Types
// The core data structures that power all business requests across the platform

export type RequestType = 
  | 'Partnership' 
  | 'Construction' 
  | 'Professional' 
  | 'Supply' 
  | 'Resource'
  | 'Community';

export type RequestUrgency = 
  | 'Immediate' 
  | 'ThisWeek' 
  | 'ThisMonth' 
  | 'ThisQuarter' 
  | 'Flexible';

export type ServiceCategory = 
  | 'Legal'
  | 'Financial'
  | 'Technical'
  | 'Construction'
  | 'Environmental'
  | 'Cultural'
  | 'Management'
  | 'Consulting';

export type PricingModel = 
  | 'Fixed' 
  | 'Hourly' 
  | 'Milestone' 
  | 'Percentage' 
  | 'Negotiable';

export type Province = 
  | 'BC' | 'AB' | 'SK' | 'MB' | 'ON' | 'QC' 
  | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

// Core Universal Request Structure
export interface UniversalBusinessRequest {
  id: string;
  businessId: string;
  createdAt: Date;
  status: RequestStatus;
  
  // Core Request Information
  request: {
    type: RequestType;
    subType: string;
    title: string;
    description: string;
    urgency: RequestUrgency;
    confidential: boolean;
  };
  
  // Dynamic Requirements based on type
  requirements: RequestRequirements;
  
  // Budget Information
  budget: BudgetInfo;
  
  // Timeline
  timeline: Timeline;
  
  // Location
  location: LocationRequirements;
  
  // Smart Data Package
  dataPackage: BusinessDataPackage;
  
  // Preferences
  preferences: RequestPreferences;
  
  // Tracking
  metrics: RequestMetrics;
}

// Dynamic requirements that change based on request type
export interface RequestRequirements {
  // Partnership Formation
  partnership?: {
    type: 'LP' | 'JV' | 'Consortium' | 'Strategic';
    province: Province;
    partners: number;
    indigenousOwnership: number;
    purpose: string;
  };
  
  // Construction Projects
  construction?: {
    projectType: string;
    squareFootage?: number;
    trades: string[];
    blueprints?: string[]; // Document IDs
    permits?: string[];
    specifications?: string[];
  };
  
  // Professional Services
  professional?: {
    serviceType: ServiceCategory;
    deliverables: string[];
    expertise: string[];
    certifications?: string[];
    experience?: string;
  };
  
  // Resource Development
  resource?: {
    type: 'Mining' | 'Forestry' | 'Energy' | 'Water';
    stage: 'Exploration' | 'Development' | 'Production';
    environmentalRequirements: string[];
    communityConsultation: boolean;
    traditionalLandUse: boolean;
  };
  
  // Community Development
  community?: {
    projectTypes: string[];
    beneficiaries: number;
    culturalConsiderations: string[];
    capacityBuilding: boolean;
    languageRequirements?: string[];
  };
  
  // Universal fields
  indigenousRequirement?: number; // Percentage
  localBenefit?: boolean;
  sustainabilityRequired?: boolean;
  accessibilityRequired?: boolean;
}

export interface BudgetInfo {
  amount?: number;
  range?: {
    min: number;
    max: number;
  };
  type: PricingModel;
  fundingSource?: string;
  paymentTerms?: string;
  includesTaxes: boolean;
}

export interface Timeline {
  startDate?: Date;
  endDate?: Date;
  flexibleDates: boolean;
  milestones?: Milestone[];
  blackoutDates?: DateRange[]; // For ceremony/cultural events
  seasonalConsiderations?: string;
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  deliverables: string[];
  paymentPercentage?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
  reason?: string;
}

export interface LocationRequirements {
  primary: {
    address?: string;
    city?: string;
    province: Province;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  remoteAcceptable: boolean;
  multipleLocations?: Location[];
  travelRequired?: boolean;
  accessibility?: string[];
}

// The Smart Data Package - reusable business information
export interface BusinessDataPackage {
  // Basic Business Info
  businessProfile: {
    legalName: string;
    operatingNames: string[];
    businessNumbers: {
      federal?: string;
      provincial?: string;
      gst?: string;
      indigenous?: string;
    };
    indigenousVerification: {
      verified: boolean;
      verificationDate?: Date;
      bandNumber?: string;
      nation?: string;
    };
  };
  
  // Financial Snapshot
  financials?: {
    annualRevenue?: number;
    creditScore?: number;
    bondingCapacity?: number;
    bankingRelationships?: string[];
    financialStatements?: string[]; // Document IDs
  };
  
  // Capabilities
  capabilities: {
    certifications: Certification[];
    licenses: License[];
    insurance: Insurance[];
    equipment?: string[];
    workforce: {
      total: number;
      indigenous: number;
      specialized: SpecializedWorker[];
    };
  };
  
  // Track Record
  trackRecord: {
    completedProjects: number;
    totalValue: number;
    onTimeCompletion: number; // Percentage
    clientSatisfaction: number; // Rating
    references: Reference[];
  };
  
  // Documents
  documents: {
    incorporation?: string;
    financialStatements?: string[];
    certifications?: string[];
    insurance?: string[];
    portfolio?: string[];
  };
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  number?: string;
  documentId?: string;
}

export interface License {
  type: string;
  number: string;
  province: Province;
  expiryDate?: Date;
}

export interface Insurance {
  type: string;
  coverage: number;
  provider: string;
  expiryDate: Date;
}

export interface SpecializedWorker {
  role: string;
  count: number;
  certifications?: string[];
}

export interface Reference {
  organizationName: string;
  contactName?: string;
  projectValue?: number;
  rating?: number;
  verified: boolean;
}

export interface RequestPreferences {
  indigenousOwned?: 'Required' | 'Preferred' | 'NoPreference';
  localProvider?: boolean;
  languages?: string[];
  culturalCompetency?: boolean;
  previousRelationship?: boolean;
  unionRequirement?: boolean;
  sustainability?: 'Required' | 'Preferred' | 'NoPreference';
}

export interface RequestMetrics {
  viewCount: number;
  bidCount: number;
  averageBidAmount?: number;
  daysOpen: number;
  questionsReceived: number;
  documentsShared: number;
}

export type RequestStatus = 
  | 'Draft'
  | 'Published'
  | 'Accepting'
  | 'Evaluating'
  | 'Awarded'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

// Service Provider Types
export interface UniversalServiceProvider {
  id: string;
  type: 'Individual' | 'Company' | 'Partnership' | 'Consortium';
  
  // Basic Info
  profile: {
    name: string;
    category: ServiceCategory[];
    specializations: string[];
    indigenousOwned: boolean;
    indigenousPercentage?: number;
    yearEstablished?: number;
    size: 'Sole' | 'Small' | 'Medium' | 'Large';
  };
  
  // Service Offerings
  services: ServiceOffering[];
  
  // Coverage
  coverage: {
    provinces: Province[];
    remote: boolean;
    international?: boolean;
  };
  
  // Track Record
  performance: ProviderPerformance;
  
  // Certifications & Compliance
  compliance: ComplianceInfo;
  
  // Pricing
  pricing: PricingInfo;
}

export interface ServiceOffering {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  deliveryTime: {
    min: number;
    max: number;
    unit: 'Days' | 'Weeks' | 'Months';
  };
  pricing: PricingStructure;
  indigenousDiscount?: number;
  volumeDiscount?: boolean;
}

export interface ProviderPerformance {
  completedJobs: number;
  activeJobs: number;
  totalValue: number;
  averageRating: number;
  onTimeDelivery: number; // Percentage
  repeatClients: number; // Percentage
  indigenousClients: number; // Percentage
  disputeRate: number; // Percentage
  responseTime: number; // Hours
}

export interface ComplianceInfo {
  certifications: Certification[];
  licenses: License[];
  insurance: Insurance[];
  bonding?: {
    capacity: number;
    provider: string;
  };
  clearances?: string[];
  indigenousVerification?: {
    ccab?: boolean;
    bandEndorsement?: boolean;
    verificationDate?: Date;
  };
}

export interface PricingInfo {
  model: PricingModel;
  rates?: {
    hourly?: number;
    daily?: number;
    project?: number;
  };
  minimumEngagement?: number;
  travelCosts?: 'Included' | 'Additional' | 'Negotiable';
  expensesHandling?: 'Included' | 'CostPlus' | 'Negotiable';
}

export interface PricingStructure {
  base: number;
  model: PricingModel;
  includes: string[];
  extras?: PricingExtra[];
}

export interface PricingExtra {
  name: string;
  price: number;
  unit?: string;
}

// Bid Types
export interface UniversalBid {
  id: string;
  requestId: string;
  providerId: string;
  submittedAt: Date;
  status: BidStatus;
  
  // Bid Details
  proposal: {
    approach: string;
    timeline: Timeline;
    team?: TeamMember[];
    differentiators: string[];
  };
  
  // Pricing
  pricing: {
    total: number;
    breakdown?: PriceBreakdown[];
    discount?: number;
    validUntil: Date;
  };
  
  // Compliance
  compliance: {
    meetsAllRequirements: boolean;
    exceptions?: string[];
    alternativeSolutions?: string[];
  };
  
  // Value Adds
  valueAdds?: string[];
  
  // Supporting Docs
  documents?: string[];
  
  // Scoring (after evaluation)
  scoring?: BidScoring;
}

export interface TeamMember {
  name: string;
  role: string;
  experience: string;
  indigenous?: boolean;
  certifications?: string[];
}

export interface PriceBreakdown {
  category: string;
  amount: number;
  description?: string;
}

export interface BidScoring {
  total: number;
  breakdown: {
    price: number;
    experience: number;
    approach: number;
    timeline: number;
    indigenousContent: number;
    localBenefit: number;
    sustainability?: number;
  };
  rank: number;
  recommendation?: string;
}

export type BidStatus = 
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Shortlisted'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn';

// Workflow Types
export interface UniversalWorkflow {
  id: string;
  requestId: string;
  type: RequestType;
  status: WorkflowStatus;
  
  // Stages
  stages: WorkflowStage[];
  currentStage: string;
  
  // Participants
  participants: WorkflowParticipant[];
  
  // Timeline
  timeline: {
    started: Date;
    estimatedCompletion: Date;
    actualCompletion?: Date;
  };
  
  // Tracking
  metrics: WorkflowMetrics;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  status: StageStatus;
  
  // Tasks
  tasks: WorkflowTask[];
  
  // Dependencies
  dependencies?: string[]; // Other stage IDs
  
  // Participants
  assignedTo: string[]; // Provider IDs
  
  // Timeline
  timeline: {
    planned: DateRange;
    actual?: DateRange;
  };
}

export interface WorkflowTask {
  id: string;
  name: string;
  assignedTo?: string;
  status: TaskStatus;
  dueDate?: Date;
  completedDate?: Date;
  deliverables?: string[];
  blockers?: string[];
}

export interface WorkflowParticipant {
  id: string;
  type: 'Requester' | 'Provider' | 'Reviewer' | 'Observer';
  role: string;
  permissions: string[];
  notifications: boolean;
}

export interface WorkflowMetrics {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  delayedDays: number;
  costVariance: number; // Percentage
  qualityScore?: number;
}

export type WorkflowStatus = 
  | 'Planning'
  | 'InProgress'
  | 'OnHold'
  | 'Completed'
  | 'Cancelled';

export type StageStatus = 
  | 'Pending'
  | 'Active'
  | 'Completed'
  | 'Blocked';

export type TaskStatus = 
  | 'NotStarted'
  | 'InProgress'
  | 'Review'
  | 'Completed'
  | 'Blocked';