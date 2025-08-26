/**
 * Canadian Universal Verification System - Type Definitions
 * 
 * @module CanadianVerificationTypes
 * @description Enterprise-grade type definitions for cross-provincial verification
 */

import { z } from 'zod';

// ==========================================
// CORE TYPES
// ==========================================

/**
 * Canadian provinces and territories
 */
export type Province = 'BC' | 'AB' | 'SK' | 'MB' | 'ON' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

/**
 * Verification confidence levels
 */
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

/**
 * Verification status
 */
export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'expired' | 'error';

/**
 * Business location information
 */
export interface Location {
  province: Province;
  city?: string;
  postalCode?: string;
  street?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Worker certification information
 */
export interface Certification {
  type: string;
  number: string;
  province: Province;
  expiry: Date;
  redSeal?: boolean;
  issuer?: string;
  scope?: string;
  restrictions?: string[];
}

/**
 * Worker information for verification
 */
export interface Worker {
  name: string;
  sin?: string; // Encrypted - Social Insurance Number
  trades: string[];
  provinces: Province[];
  certifications: Certification[];
  yearsExperience?: number;
  indigenousStatus?: boolean;
}

/**
 * Indigenous partnership details
 */
export interface IndigenousPartnership {
  partnerName: string;
  nation: string;
  agreementDate?: Date;
  agreementType?: 'Joint Venture' | 'Partnership' | 'Subcontract' | 'Employment' | 'Other';
  ownershipPercentage?: number;
  benefitAgreement?: {
    type: string;
    value?: number;
    duration?: string;
  };
}

/**
 * Project details for context-specific verification
 */
export interface ProjectDetails {
  name: string;
  location: string;
  value: number;
  requiredCertifications: string[];
  startDate?: Date;
  endDate?: Date;
  indigenousRequirement?: boolean;
  governmentContract?: boolean;
  securityClearanceRequired?: string;
}

// ==========================================
// REQUEST TYPES
// ==========================================

/**
 * Main verification request structure
 */
export interface VerificationRequest {
  // Business Information
  businessName: string;
  businessNumber?: string; // 9 digits + 2 letters + 4 digits (e.g., 123456789RC0001)
  legalName?: string;
  operatingName?: string;
  
  // Location
  location: Location;
  additionalLocations?: Location[];
  
  // Indigenous Partnership (if applicable)
  indigenousPartnership?: IndigenousPartnership;
  
  // Workers (for trade verification)
  workers?: Worker[];
  
  // Trade Qualifications
  tradeQualifications?: string[];
  
  // Project Context (optional)
  projectDetails?: ProjectDetails;
  
  // Additional Context
  urgency?: 'normal' | 'high' | 'critical';
  purpose?: string;
  requestedBy?: {
    organizationId: string;
    organizationType: 'government' | 'corporation' | 'indigenous_org' | 'other';
    contactEmail?: string;
  };
}

// ==========================================
// RESPONSE TYPES
// ==========================================

/**
 * Base verification result
 */
export interface BaseVerificationResult {
  type: string;
  verified: boolean;
  confidence: number; // 0-1
  timestamp: Date;
  errors?: string[];
  warnings?: string[];
}

/**
 * Business verification details
 */
export interface BusinessVerification extends BaseVerificationResult {
  type: 'business';
  businessId?: string;
  registrationNumber?: string;
  registrationDate?: Date;
  status?: 'active' | 'inactive' | 'dissolved' | 'suspended';
  goodStanding?: boolean;
  registeredAddress?: Location;
  directors?: string[];
  shareholders?: {
    name: string;
    percentage: number;
  }[];
}

/**
 * Worker verification details
 */
export interface WorkerVerification extends BaseVerificationResult {
  type: 'worker';
  workerName: string;
  verifiedTrades: {
    trade: string;
    province: Province;
    certificateNumber?: string;
    valid: boolean;
    expiry?: Date;
  }[];
  redSealStatus?: boolean;
  safetyTraining?: string[];
}

/**
 * Indigenous verification details
 */
export interface IndigenousVerification extends BaseVerificationResult {
  type: 'indigenous';
  indigenousOwnership: number; // Percentage
  verifiedPartnership: boolean;
  nation?: string;
  communityEndorsement?: boolean;
  benefitAgreementValid?: boolean;
  registryListing?: {
    source: string;
    listingDate: Date;
    status: string;
  };
}

/**
 * Trade verification details
 */
export interface TradeVerification extends BaseVerificationResult {
  type: 'trade';
  harmonizedTrades: {
    originalTrade: string;
    provincialMappings: {
      province: Province;
      localName: string;
      recognized: boolean;
    }[];
    redSealAvailable: boolean;
  }[];
  crossProvincialMobility: boolean;
}

/**
 * Safety compliance details
 */
export interface SafetyCompliance extends BaseVerificationResult {
  type: 'safety';
  compliantProvinces: {
    province: Province;
    safetyBody: string;
    status: 'compliant' | 'non_compliant' | 'pending';
    clearanceNumber?: string;
    expiryDate?: Date;
  }[];
  wsibStatus?: boolean;
  corCertified?: boolean;
  totalRecordableIncidentRate?: number;
}

/**
 * Cross-provincial compliance (Bill C-5)
 */
export interface CrossProvincialCompliance extends BaseVerificationResult {
  type: 'billC5';
  interprovincialMobility: boolean;
  languageCompliance: {
    english: boolean;
    french: boolean;
  };
  registeredProvinces: Province[];
  mobilityAgreements: string[];
}

/**
 * Fraud assessment details
 */
export interface FraudAssessment extends BaseVerificationResult {
  type: 'fraud';
  riskScore: number; // 0-1 (0 = low risk, 1 = high risk)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    indicator: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  recommendations: string[];
  requiresManualReview: boolean;
}

/**
 * Complete verification result
 */
export interface VerificationResult {
  // Metadata
  verificationId: string;
  verified: boolean;
  confidence: number; // 0-1
  confidenceLevel: ConfidenceLevel;
  
  // Detailed results
  details: {
    businessVerification?: BusinessVerification;
    workerVerifications?: WorkerVerification[];
    indigenousVerification?: IndigenousVerification;
    tradeVerifications?: TradeVerification[];
    safetyCompliance?: SafetyCompliance;
    crossProvincialCompliance?: CrossProvincialCompliance;
    fraudAssessment?: FraudAssessment;
  };
  
  // Execution details
  timeElapsed: number; // milliseconds
  systemsChecked: string[];
  timestamp: Date;
  expiresAt: Date;
  
  // Certificate (if verified)
  certificate?: string;
  certificateUrl?: string;
  
  // Additional information
  notes?: string[];
  nextSteps?: string[];
  contactForQuestions?: string;
}

// ==========================================
// AGENT TYPES
// ==========================================

/**
 * Base agent interface
 */
export interface BaseAgent {
  verify(request: VerificationRequest): Promise<any>;
  healthCheck?(): Promise<{ healthy: boolean; latency?: number; lastSuccess?: Date }>;
}

/**
 * Provincial agent result
 */
export interface ProvincialVerificationResult {
  type: 'provincial';
  province: Province;
  verificationId: string;
  timestamp: Date;
  results: {
    business: any;
    safety: any;
    trades: any;
  };
  confidence: number;
  errors?: string[];
}

/**
 * Federal agent result
 */
export interface FederalVerificationResult {
  type: 'federal';
  agency: string;
  verified: boolean;
  confidence: number;
  details: any;
}

/**
 * Specialized agent result
 */
export interface SpecializedVerificationResult {
  type: string;
  verified: boolean;
  confidence: number;
  details: any;
}

// ==========================================
// ERROR TYPES
// ==========================================

/**
 * Verification error codes
 */
export type VerificationErrorCode = 
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTHENTICATION_FAILED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'TIMEOUT'
  | 'AGENT_FAILURE'
  | 'NETWORK_ERROR'
  | 'INVALID_PROVINCE'
  | 'VERIFICATION_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Custom verification error
 */
export class VerificationError extends Error {
  constructor(
    message: string,
    public code: VerificationErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

// ==========================================
// API TYPES
// ==========================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * Batch verification request
 */
export interface BatchVerificationRequest {
  requests: VerificationRequest[];
  options?: {
    parallel?: boolean;
    stopOnError?: boolean;
    priority?: 'normal' | 'high';
  };
}

/**
 * Batch verification result
 */
export interface BatchVerificationResult {
  batchId: string;
  totalRequests: number;
  successfulVerifications: number;
  failedVerifications: number;
  results: {
    request: VerificationRequest;
    result?: VerificationResult;
    error?: VerificationError;
  }[];
  timeElapsed: number;
}

// ==========================================
// CONFIGURATION TYPES
// ==========================================

/**
 * Verification service configuration
 */
export interface VerificationConfig {
  cache: {
    enabled: boolean;
    ttl: number;
    highRiskTtl: number;
  };
  timeout: {
    agent: number;
    total: number;
  };
  retries: {
    attempts: number;
    backoff: 'exponential' | 'linear';
  };
  security: {
    encryptSensitiveData: boolean;
    requireApiKey: boolean;
    rateLimiting: boolean;
  };
}

// ==========================================
// METRICS TYPES
// ==========================================

/**
 * Verification metrics
 */
export interface VerificationMetrics {
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  averageConfidence: number;
  averageResponseTime: number;
  systemAvailability: {
    system: string;
    availability: number; // percentage
    lastDowntime?: Date;
  }[];
  topErrors: {
    error: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

// ==========================================
// WEBHOOK TYPES
// ==========================================

/**
 * Verification webhook event
 */
export interface VerificationWebhookEvent {
  id: string;
  type: 'verification.completed' | 'verification.failed' | 'verification.expired';
  timestamp: Date;
  data: {
    verificationId: string;
    businessName: string;
    result?: VerificationResult;
    error?: VerificationError;
  };
  signature: string; // HMAC signature for security
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

/**
 * Zod schema for request validation
 */
export const VerificationRequestSchema = z.object({
  businessName: z.string().min(1).max(255),
  businessNumber: z.string().regex(/^\d{9}[A-Z]{2}\d{4}$/).optional(),
  location: z.object({
    province: z.enum(['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']),
    city: z.string().optional()
  }),
  indigenousPartnership: z.object({
    partnerName: z.string(),
    nation: z.string(),
    agreementDate: z.date().optional()
  }).optional(),
  workers: z.array(z.object({
    name: z.string(),
    trades: z.array(z.string()),
    provinces: z.array(z.string()),
    certifications: z.array(z.object({
      type: z.string(),
      number: z.string(),
      province: z.string(),
      expiry: z.date()
    }))
  })).optional()
});

/**
 * Type guard for verification result
 */
export function isVerificationResult(obj: any): obj is VerificationResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'verificationId' in obj &&
    'verified' in obj &&
    'confidence' in obj &&
    'details' in obj
  );
}

/**
 * Type guard for verification error
 */
export function isVerificationError(error: any): error is VerificationError {
  return (
    error instanceof Error &&
    'code' in error &&
    error.name === 'VerificationError'
  );
}

// ==========================================
// CONSTANTS
// ==========================================

/**
 * Province names mapping
 */
export const PROVINCE_NAMES: Record<Province, string> = {
  'BC': 'British Columbia',
  'AB': 'Alberta',
  'SK': 'Saskatchewan',
  'MB': 'Manitoba',
  'ON': 'Ontario',
  'QC': 'Quebec',
  'NB': 'New Brunswick',
  'NS': 'Nova Scotia',
  'PE': 'Prince Edward Island',
  'NL': 'Newfoundland and Labrador',
  'YT': 'Yukon',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut'
};

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  VERY_HIGH: 0.95,
  HIGH: 0.80,
  MEDIUM: 0.60,
  LOW: 0.40
};

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.VERY_HIGH) return 'very_high';
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'low';
  return 'very_low';
}