/**
 * Enhanced Business Hunter Types
 * Extended types for contact discovery, outreach, and advanced features
 */

import { z } from 'zod';
import { BusinessType, SourceType } from './index';

// Contact Discovery Types
export interface ContactDiscoveryResult {
  businessId: string;
  contacts: DiscoveredContact[];
  confidence: number;
  discoveredAt: Date;
  sources: string[];
  verificationStatus: ContactVerificationStatus;
}

export interface DiscoveredContact {
  id: string;
  businessId: string;
  type: ContactType;
  firstName?: string;
  lastName?: string;
  fullName: string;
  title?: string;
  department?: string;
  email?: string;
  emailVerified?: boolean;
  emailDeliverability?: EmailDeliverability;
  phone?: string;
  phoneVerified?: boolean;
  phoneType?: 'mobile' | 'landline' | 'voip';
  linkedin?: string;
  twitter?: string;
  isDecisionMaker: boolean;
  isPrimary: boolean;
  confidence: number;
  discoveredFrom: string[];
  lastVerified?: Date;
}

export enum ContactType {
  EXECUTIVE = 'executive',
  OWNER = 'owner',
  MANAGER = 'manager',
  SALES = 'sales',
  PROCUREMENT = 'procurement',
  GENERAL = 'general'
}

export interface ContactVerificationStatus {
  emailsVerified: number;
  phonesVerified: number;
  totalContacts: number;
  verificationRate: number;
  lastVerified: Date;
}

export interface EmailDeliverability {
  deliverable: boolean;
  acceptAll: boolean;
  disposable: boolean;
  role: boolean;
  free: boolean;
  score: number;
  smtpCheck?: boolean;
  mxRecords?: boolean;
  provider?: string;
}

// Outreach Types
export interface OutreachCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  channels: OutreachChannel[];
  targetBusinesses: string[];
  templates: OutreachTemplate[];
  schedule: CampaignSchedule;
  metrics: CampaignMetrics;
  compliance: ComplianceCheck;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface OutreachChannel {
  type: ChannelType;
  enabled: boolean;
  config: ChannelConfig;
  templates: string[];
  rateLimit?: number;
  priority: number;
}

export enum ChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  REDDIT = 'reddit',
  WHATSAPP = 'whatsapp',
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook'
}

export interface ChannelConfig {
  provider?: string;
  apiKey?: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
  webhookUrl?: string;
  customHeaders?: Record<string, string>;
}

export interface OutreachTemplate {
  id: string;
  channelType: ChannelType;
  name: string;
  subject?: string;
  content: string;
  personalizationTokens: string[];
  abTestVariant?: string;
  performanceMetrics?: TemplateMetrics;
}

export interface TemplateMetrics {
  sent: number;
  opened: number;
  clicked: number;
  responded: number;
  converted: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  conversionRate: number;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  sendWindows: SendWindow[];
  followUpDelays: number[]; // in hours
  maxTouchpoints: number;
}

export interface SendWindow {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface CampaignMetrics {
  totalTargets: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  optedOut: number;
  bounced: number;
  converted: number;
  costPerContact: number;
  roi: number;
}

// Deduplication Types
export interface DuplicateCandidate {
  business1: string;
  business2: string;
  similarityScore: number;
  matchingFields: MatchingField[];
  confidence: number;
  suggestedAction: MergeAction;
}

export interface MatchingField {
  field: string;
  value1: any;
  value2: any;
  similarity: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

export enum MergeAction {
  MERGE = 'merge',
  KEEP_BOTH = 'keep_both',
  MARK_DUPLICATE = 'mark_duplicate',
  MANUAL_REVIEW = 'manual_review'
}

export interface MergeStrategy {
  primaryRecord: string;
  fieldsToMerge: FieldMergeRule[];
  preserveHistory: boolean;
  notifyAffectedSystems: boolean;
}

export interface FieldMergeRule {
  field: string;
  source: 'primary' | 'secondary' | 'newest' | 'highest_quality';
  conflictResolution: 'primary_wins' | 'secondary_wins' | 'combine' | 'manual';
}

// Compliance Types
export interface ComplianceCheck {
  caslCompliant: boolean;
  pipedaCompliant: boolean;
  ocapCompliant?: boolean;
  provincialCompliant: boolean;
  robotsTxtRespected: boolean;
  tosCompliant: boolean;
  issues: ComplianceIssue[];
  checkedAt: Date;
  validUntil: Date;
}

export interface ComplianceIssue {
  type: ComplianceType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  field?: string;
  recommendation: string;
}

export enum ComplianceType {
  CASL = 'casl',
  PIPEDA = 'pipeda',
  OCAP = 'ocap',
  QUEBEC_LAW_25 = 'quebec_law_25',
  BC_PIPA = 'bc_pipa',
  ALBERTA_PIPA = 'alberta_pipa',
  ROBOTS_TXT = 'robots_txt',
  TERMS_OF_SERVICE = 'terms_of_service'
}

// Scoring Types
export interface BusinessPriorityScore {
  businessId: string;
  overallScore: number; // 0-100
  components: {
    revenueScore: number;
    procurementScore: number;
    partnershipScore: number;
    dataQualityScore: number;
    geographicScore: number;
    industryScore: number;
  };
  tier: PriorityTier;
  recommendedActions: string[];
  calculatedAt: Date;
}

export enum PriorityTier {
  PLATINUM = 'platinum', // 90-100
  GOLD = 'gold',         // 75-89
  SILVER = 'silver',     // 60-74
  BRONZE = 'bronze',     // 40-59
  STANDARD = 'standard'  // 0-39
}

export interface DataQualityScore {
  businessId: string;
  overallScore: number; // 0-100
  completeness: number;
  accuracy: number;
  freshness: number;
  sourceReliability: number;
  verificationLevel: number;
  missingFields: string[];
  recommendations: DataQualityRecommendation[];
  lastAssessed: Date;
}

export interface DataQualityRecommendation {
  field: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
  estimatedImprovement: number;
}

// Analytics Types
export interface HunterPerformanceMetrics {
  hunterId: string;
  hunterType: string;
  period: AnalyticsPeriod;
  metrics: {
    businessesDiscovered: number;
    contactsFound: number;
    verificationRate: number;
    dataQualityScore: number;
    costPerDiscovery: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
  };
  topSources: SourcePerformance[];
  recommendations: string[];
}

export interface SourcePerformance {
  source: string;
  discovered: number;
  quality: number;
  cost: number;
  reliability: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface OutreachPerformanceMetrics {
  campaignId: string;
  period: AnalyticsPeriod;
  channels: ChannelPerformance[];
  templates: TemplatePerformance[];
  segments: SegmentPerformance[];
  funnel: ConversionFunnel;
  roi: ROIMetrics;
}

export interface ChannelPerformance {
  channel: ChannelType;
  sent: number;
  delivered: number;
  engaged: number;
  converted: number;
  cost: number;
  revenue: number;
  roi: number;
}

export interface ConversionFunnel {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  qualified: number;
  converted: number;
}

export interface ROIMetrics {
  totalCost: number;
  totalRevenue: number;
  roi: number;
  costPerLead: number;
  costPerConversion: number;
  lifetimeValue: number;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

// Integration Types
export interface ClaimPortalLink {
  businessId: string;
  token: string;
  url: string;
  shortUrl?: string;
  qrCode?: string;
  expiresAt: Date;
  prefilledData: Record<string, any>;
  trackingPixel: string;
  customizations?: {
    logo?: string;
    primaryColor?: string;
    welcomeMessage?: string;
  };
}

export interface GeographicIntelligence {
  businessId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  territoryAnalysis: {
    traditionalTerritory?: string;
    nearestIndigenousCommunities: CommunityDistance[];
    procurementZones: string[];
    economicRegion: string;
  };
  partnershipOpportunities: GeographicOpportunity[];
}

export interface CommunityDistance {
  communityName: string;
  nation: string;
  distance: number; // km
  travelTime: number; // minutes
  hasRoadAccess: boolean;
}

export interface GeographicOpportunity {
  type: 'supply_chain' | 'joint_venture' | 'subcontract';
  partner: string;
  distance: number;
  industryMatch: number;
  score: number;
}

export interface BusinessRelationship {
  business1: string;
  business2: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  evidence: RelationshipEvidence[];
  discoveredAt: Date;
  lastValidated: Date;
}

export enum RelationshipType {
  PARENT_SUBSIDIARY = 'parent_subsidiary',
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  PARTNER = 'partner',
  COMPETITOR = 'competitor',
  INVESTOR = 'investor',
  FRANCHISEE = 'franchisee'
}

export interface RelationshipEvidence {
  source: string;
  type: string;
  confidence: number;
  data: any;
  foundAt: Date;
}

// Validation Schemas
export const ContactDiscoveryResultSchema = z.object({
  businessId: z.string(),
  contacts: z.array(z.object({
    fullName: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    isDecisionMaker: z.boolean(),
    confidence: z.number().min(0).max(1)
  })),
  confidence: z.number().min(0).max(1)
});

export const OutreachCampaignSchema = z.object({
  name: z.string().min(1),
  channels: z.array(z.nativeEnum(ChannelType)),
  targetBusinesses: z.array(z.string()).min(1),
  schedule: z.object({
    startDate: z.date(),
    timezone: z.string(),
    maxTouchpoints: z.number().min(1).max(10)
  })
});

export const ComplianceCheckSchema = z.object({
  caslCompliant: z.boolean(),
  pipedaCompliant: z.boolean(),
  issues: z.array(z.object({
    type: z.nativeEnum(ComplianceType),
    severity: z.enum(['critical', 'warning', 'info']),
    message: z.string()
  }))
});

// Export all enhanced schemas
export const enhancedSchemas = {
  contactDiscoveryResult: ContactDiscoveryResultSchema,
  outreachCampaign: OutreachCampaignSchema,
  complianceCheck: ComplianceCheckSchema
};