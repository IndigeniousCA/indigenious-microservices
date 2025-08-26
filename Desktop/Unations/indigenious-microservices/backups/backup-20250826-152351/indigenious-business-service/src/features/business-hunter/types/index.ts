/**
 * Business Hunter Types
 * Core type definitions for the hunter swarm system
 */

import { z } from 'zod';

// Business discovery types
export interface DiscoveredBusiness {
  id: string;
  name: string;
  legalName?: string;
  businessNumber?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: BusinessAddress;
  type: BusinessType;
  industry?: string[];
  source: DiscoverySource;
  discoveredAt: Date;
  confidence: number;
  rawData?: Record<string, any>;
}

export interface BusinessAddress {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  isOnReserve?: boolean;
  territoryName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export enum BusinessType {
  INDIGENOUS_OWNED = 'indigenous_owned',
  INDIGENOUS_PARTNERSHIP = 'indigenous_partnership',
  INDIGENOUS_AFFILIATED = 'indigenous_affiliated',
  BILL_C5_READY = 'bill_c5_ready', // Canadian businesses ready for Indigenous partnerships
  CANADIAN_GENERAL = 'canadian_general',
  POTENTIAL_PARTNER = 'potential_partner',
  UNKNOWN = 'unknown'
}

export enum IndustryCategory {
  // Primary Industries
  MINING = 'mining',
  CONSTRUCTION = 'construction',
  FORESTRY = 'forestry',
  ENERGY = 'energy',
  INFRASTRUCTURE = 'infrastructure',
  
  // Professional Services
  LEGAL = 'legal',
  ACCOUNTING = 'accounting',
  CONSULTING = 'consulting',
  ENGINEERING = 'engineering',
  ARCHITECTURE = 'architecture',
  
  // Support Services
  LOGISTICS = 'logistics',
  MANUFACTURING = 'manufacturing',
  EQUIPMENT = 'equipment',
  TRAINING = 'training',
  SECURITY = 'security',
  
  // Specialized
  ENVIRONMENTAL = 'environmental',
  IT_SERVICES = 'it_services',
  HEALTHCARE = 'healthcare',
  FOOD_SERVICES = 'food_services',
  
  OTHER = 'other'
}

export interface DiscoverySource {
  type: SourceType;
  name: string;
  url?: string;
  lastCrawled?: Date;
  reliability: number; // 0-1
}

export enum SourceType {
  GOVERNMENT = 'government',
  INDIGENOUS_ORG = 'indigenous_org',
  SOCIAL_MEDIA = 'social_media',
  BUSINESS_REGISTRY = 'business_registry',
  SUPPLY_CHAIN = 'supply_chain',
  REFERRAL = 'referral',
  WEB_CRAWL = 'web_crawl'
}

// Enriched business types
export interface EnrichedBusiness extends DiscoveredBusiness {
  verified: boolean;
  verificationDetails?: VerificationResult;
  taxDebtStatus?: TaxDebtStatus;
  certifications?: Certification[];
  contacts?: Contact[];
  financialInfo?: FinancialInfo;
  indigenousDetails?: IndigenousDetails;
  procurementReadiness?: ProcurementReadiness;
  socialProfiles?: SocialProfile[];
  riskScore?: number;
  partnershipScore?: number;
  enrichedAt: Date;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  province?: string;
  federalStatus?: string;
  provincialStatus?: string;
  lastVerified: Date;
  issues?: string[];
}

export interface TaxDebtStatus {
  hasDebt: boolean;
  totalDebt?: number;
  riskScore: number;
  procurementEligible: boolean;
  lastChecked: Date;
}

export interface Certification {
  type: CertificationType;
  issuer: string;
  number?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'pending';
}

export enum CertificationType {
  CCAB = 'ccab',
  PAR = 'par',
  ISO = 'iso',
  INDIGENOUS_BUSINESS = 'indigenous_business',
  SUPPLIER_DIVERSITY = 'supplier_diversity',
  INDUSTRY_SPECIFIC = 'industry_specific'
}

export interface Contact {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isPrimary: boolean;
  department?: string;
}

export interface FinancialInfo {
  estimatedRevenue?: number;
  revenueRange?: string;
  employeeCount?: number;
  employeeRange?: string;
  yearEstablished?: number;
  creditScore?: number;
  hasGovernmentContracts?: boolean;
}

export interface IndigenousDetails {
  ownershipPercentage?: number;
  nation?: string;
  community?: string;
  indigenousEmployeePercentage?: number;
  communityBenefitAgreements?: boolean;
  traditionalTerritoryWork?: boolean;
}

export interface ProcurementReadiness {
  score: number; // 0-100
  hasInsurance: boolean;
  hasBonding: boolean;
  hasHealthSafety: boolean;
  pastPerformance?: number;
  capabilities: string[];
  naicsCodes?: string[];
  unspscCodes?: string[];
}

export interface SocialProfile {
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram';
  url: string;
  followers?: number;
  verified?: boolean;
  lastActive?: Date;
}

// Hunter types
export interface HunterConfig {
  id: string;
  type: HunterType;
  sources: string[];
  rateLimit: number;
  proxy?: ProxyConfig;
  priority: number;
  enabled: boolean;
}

export enum HunterType {
  GOVERNMENT = 'government',
  INDIGENOUS_ORG = 'indigenous_org',
  SOCIAL_MEDIA = 'social_media',
  REGISTRY = 'registry',
  SUPPLY_CHAIN = 'supply_chain'
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'socks5';
}

// Task types
export interface HuntingTask {
  id: string;
  hunterId: string;
  source: string;
  type: TaskType;
  priority: number;
  payload: any;
  attempts: number;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export enum TaskType {
  DISCOVER = 'discover',
  VALIDATE = 'validate',
  ENRICH = 'enrich',
  EXPORT = 'export'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// Results types
export interface HuntingResult {
  taskId: string;
  hunterId: string;
  businesses: DiscoveredBusiness[];
  stats: HuntingStats;
  errors: HuntingError[];
}

export interface HuntingStats {
  discovered: number;
  validated: number;
  enriched: number;
  duplicates: number;
  errors: number;
  duration: number;
  source: string;
}

export interface HuntingError {
  code: string;
  message: string;
  source?: string;
  timestamp: Date;
  context?: any;
}

// ML types
export interface ClassificationResult {
  businessId: string;
  isIndigenous: boolean;
  confidence: number;
  ownershipType?: 'first_nations' | 'metis' | 'inuit' | 'mixed';
  signals: ClassificationSignal[];
  requiresManualReview: boolean;
}

export interface ClassificationSignal {
  type: string;
  value: any;
  weight: number;
  source: string;
}

// Monitoring types
export interface SwarmMetrics {
  hunters: {
    active: number;
    idle: number;
    failed: number;
  };
  discovery: {
    total: number;
    lastHour: number;
    lastDay: number;
    rate: number;
  };
  quality: {
    verificationRate: number;
    indigenousRate: number;
    enrichmentRate: number;
    errorRate: number;
  };
  performance: {
    avgTaskDuration: number;
    tasksPerHour: number;
    queueDepth: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

// Validation schemas
export const DiscoveredBusinessSchema = z.object({
  name: z.string().min(1),
  businessNumber: z.string().optional(),
  type: z.nativeEnum(BusinessType),
  source: z.object({
    type: z.nativeEnum(SourceType),
    name: z.string(),
    reliability: z.number().min(0).max(1)
  }),
  confidence: z.number().min(0).max(1)
});

export const HuntingTaskSchema = z.object({
  hunterId: z.string(),
  source: z.string().url(),
  type: z.nativeEnum(TaskType),
  priority: z.number().min(0).max(10)
});

// Export all schemas
export const schemas = {
  discoveredBusiness: DiscoveredBusinessSchema,
  huntingTask: HuntingTaskSchema
};