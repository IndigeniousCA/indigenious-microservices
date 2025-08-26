/**
 * Tax Debt Validation Schemas
 * 
 * @module TaxDebtSchemas
 * @description Enterprise-grade Zod validation schemas with custom validators and transformers
 */

import { z } from 'zod';
import {
  TaxDebtItemSchema,
  PaymentArrangementSchema,
  CollectionsStatusSchema,
  FilingComplianceSchema,
  FederalTaxDebtSchema,
  ProvincialTaxDebtSchema,
  TaxDebtDetailsSchema,
  TaxDebtVerificationRequestSchema,
  TaxDebtVerificationResponseSchema,
  TaxDebtRiskFactorsSchema,
  TaxDebtRiskAssessmentSchema
} from '../types/tax-debt';

// ==========================================
// CUSTOM VALIDATORS
// ==========================================

/**
 * Validate Canadian business number format
 */
const businessNumberValidator = z.string().regex(
  /^\d{9}[A-Z]{2}\d{4}$/,
  'Invalid business number format. Expected: 123456789RC0001'
);

/**
 * Validate SIN (encrypted format)
 */
const encryptedSINValidator = z.string().regex(
  /^enc:[a-f0-9]{64}$/,
  'Invalid encrypted SIN format'
);

/**
 * Validate monetary amount (CAD)
 */
const moneyValidator = z.number()
  .min(0)
  .max(999999999999.99)
  .transform(val => Math.round(val * 100) / 100); // Round to 2 decimals

/**
 * Validate tax year
 */
const taxYearValidator = z.number()
  .int()
  .min(1867) // Confederation
  .max(new Date().getFullYear() + 1); // Allow next year for estimates

/**
 * Validate percentage
 */
const percentageValidator = z.number()
  .min(0)
  .max(100)
  .transform(val => Math.round(val * 100) / 100);

// ==========================================
// ENHANCED SCHEMAS WITH VALIDATORS
// ==========================================

/**
 * Enhanced tax debt item schema with validation
 */
export const EnhancedTaxDebtItemSchema = TaxDebtItemSchema.extend({
  amountOwing: moneyValidator,
  originalAmount: moneyValidator,
  penaltiesInterest: moneyValidator,
  taxType: z.string().min(2).max(100),
  assessmentNumber: z.string().regex(/^[A-Z0-9-]+$/).optional()
}).refine(
  data => data.amountOwing >= data.originalAmount,
  {
    message: "Amount owing cannot be less than original amount",
    path: ["amountOwing"]
  }
).refine(
  data => data.periodEnd >= data.periodStart,
  {
    message: "Period end date must be after start date",
    path: ["periodEnd"]
  }
);

/**
 * Enhanced payment arrangement schema
 */
export const EnhancedPaymentArrangementSchema = PaymentArrangementSchema.extend({
  monthlyPayment: moneyValidator,
  totalAgreedAmount: moneyValidator,
  remainingBalance: moneyValidator,
  complianceRate: percentageValidator,
  arrangementId: z.string().regex(/^PA-\d{4}-\d{6}$/, 'Invalid arrangement ID format')
}).refine(
  data => data.remainingBalance <= data.totalAgreedAmount,
  {
    message: "Remaining balance cannot exceed total agreed amount",
    path: ["remainingBalance"]
  }
);

/**
 * Enhanced collections status schema
 */
export const EnhancedCollectionsStatusSchema = CollectionsStatusSchema.extend({
  totalUnderCollections: moneyValidator,
  actions: z.array(z.object({
    actionType: z.enum(['notice', 'demand', 'lien', 'garnishment', 'seizure', 'legal_action']),
    actionDate: z.date(),
    actionNumber: z.string().regex(/^CA-\d{4}-\d{6}$/),
    amount: moneyValidator,
    status: z.enum(['active', 'satisfied', 'withdrawn', 'disputed']),
    details: z.string().max(1000).optional()
  }))
});

/**
 * Enhanced filing compliance schema
 */
export const EnhancedFilingComplianceSchema = FilingComplianceSchema.extend({
  currentYear: taxYearValidator,
  filedYears: z.array(taxYearValidator),
  unfiledYears: z.array(taxYearValidator),
  complianceRate: percentageValidator
}).refine(
  data => {
    const allYears = [...data.filedYears, ...data.unfiledYears];
    return new Set(allYears).size === allYears.length;
  },
  {
    message: "Years cannot appear in both filed and unfiled lists",
    path: ["filedYears"]
  }
);

// ==========================================
// API REQUEST/RESPONSE VALIDATORS
// ==========================================

/**
 * CRA tax debt API request validator
 */
export const CRATaxDebtRequestSchema = z.object({
  businessNumber: businessNumberValidator,
  taxTypes: z.array(z.enum([
    'corporate_income_tax',
    'gst_hst',
    'payroll_deductions',
    'import_export',
    'excise_tax'
  ])).min(1),
  yearsToCheck: z.number().int().min(1).max(10).default(5),
  includeDetails: z.boolean().default(true),
  consent: z.object({
    token: z.string().min(32),
    expiresAt: z.date().refine(date => date > new Date(), {
      message: "Consent token has expired"
    })
  })
});

/**
 * Provincial tax debt API request validator
 */
export const ProvincialTaxDebtRequestSchema = z.object({
  businessNumber: businessNumberValidator,
  businessName: z.string().min(2).max(200),
  province: z.enum(['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']),
  provincialRegistrationNumber: z.string().optional(),
  taxTypes: z.array(z.string()).optional(),
  yearsToCheck: z.number().int().min(1).max(10).default(5),
  language: z.enum(['en', 'fr']).default('en'),
  consent: z.object({
    obtained: z.boolean(),
    referenceNumber: z.string(),
    validUntil: z.date()
  })
});

// ==========================================
// SECURITY VALIDATORS
// ==========================================

/**
 * Tax debt access request validator
 */
export const TaxDebtAccessRequestSchema = z.object({
  requestorId: z.string().uuid(),
  requestorRole: z.enum(['government', 'authorized_agent', 'business_owner']),
  purpose: z.enum([
    'procurement_verification',
    'grant_eligibility',
    'security_clearance',
    'audit',
    'self_service'
  ]),
  businessNumber: businessNumberValidator,
  ipAddress: z.string().ip(),
  sessionId: z.string().uuid(),
  mfaToken: z.string().length(6).regex(/^\d+$/),
  timestamp: z.date()
});

/**
 * Audit log entry validator
 */
export const TaxDebtAuditLogSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum([
    'access_request',
    'data_retrieved',
    'consent_verified',
    'access_denied',
    'data_exported',
    'anomaly_detected'
  ]),
  userId: z.string().uuid(),
  businessNumber: businessNumberValidator,
  timestamp: z.date(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  outcome: z.enum(['success', 'failure', 'partial']),
  dataAccessed: z.array(z.string()).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// ==========================================
// TRANSFORMATION FUNCTIONS
// ==========================================

/**
 * Transform raw CRA response to standardized format
 */
export const transformCRAResponse = (rawData: any): z.infer<typeof FederalTaxDebtSchema> => {
  return FederalTaxDebtSchema.parse({
    corporateTax: rawData.T2 ? {
      items: rawData.T2.assessments.map(transformAssessment),
      totalOwing: rawData.T2.totalBalance,
      oldestDebt: rawData.T2.oldestAssessmentDate,
      filingCompliance: transformFilingCompliance(rawData.T2.filingHistory)
    } : undefined,
    gstHst: rawData.RT ? {
      items: rawData.RT.assessments.map(transformAssessment),
      totalOwing: rawData.RT.totalBalance,
      registrationNumber: rawData.RT.registrationNumber,
      filingFrequency: rawData.RT.filingFrequency,
      filingCompliance: transformFilingCompliance(rawData.RT.filingHistory)
    } : undefined,
    payrollDeductions: rawData.RP ? {
      items: rawData.RP.assessments.map(transformAssessment),
      totalOwing: rawData.RP.totalBalance,
      accountNumber: rawData.RP.accountNumber,
      employeeCount: rawData.RP.employeeCount,
      filingCompliance: transformFilingCompliance(rawData.RP.filingHistory)
    } : undefined,
    totalFederalOwing: calculateTotalOwing(rawData),
    paymentArrangement: rawData.paymentArrangement ? 
      transformPaymentArrangement(rawData.paymentArrangement) : undefined,
    collectionsStatus: rawData.collections ? 
      transformCollectionsStatus(rawData.collections) : undefined,
    lastAssessmentDate: rawData.lastAssessmentDate,
    riskScore: calculateFederalRiskScore(rawData)
  });
};

/**
 * Transform assessment data
 */
const transformAssessment = (assessment: any): z.infer<typeof TaxDebtItemSchema> => {
  return {
    taxType: assessment.type,
    amountOwing: assessment.balance,
    originalAmount: assessment.originalAmount,
    penaltiesInterest: assessment.penaltiesInterest || 0,
    periodStart: new Date(assessment.periodStart),
    periodEnd: new Date(assessment.periodEnd),
    dueDate: new Date(assessment.dueDate),
    lastPaymentDate: assessment.lastPaymentDate ? new Date(assessment.lastPaymentDate) : undefined,
    filingStatus: assessment.filingStatus || 'filed',
    assessmentNumber: assessment.noticeNumber,
    yearsOverdue: calculateYearsOverdue(assessment.dueDate)
  };
};

/**
 * Transform filing compliance data
 */
const transformFilingCompliance = (filingHistory: any): z.infer<typeof FilingComplianceSchema> => {
  const currentYear = new Date().getFullYear();
  const filedYears = filingHistory.filed || [];
  const unfiledYears = filingHistory.unfiled || [];
  
  return {
    taxType: filingHistory.type,
    currentYear,
    filedYears,
    unfiledYears,
    complianceRate: calculateComplianceRate(filedYears.length, unfiledYears.length),
    lastFilingDate: filingHistory.lastFilingDate ? new Date(filingHistory.lastFilingDate) : undefined,
    outstandingReturns: unfiledYears.length
  };
};

/**
 * Transform payment arrangement data
 */
const transformPaymentArrangement = (arrangement: any): z.infer<typeof PaymentArrangementSchema> => {
  return {
    arrangementId: arrangement.id,
    startDate: new Date(arrangement.startDate),
    endDate: arrangement.endDate ? new Date(arrangement.endDate) : undefined,
    monthlyPayment: arrangement.paymentAmount,
    paymentFrequency: arrangement.frequency || 'monthly',
    totalAgreedAmount: arrangement.totalAmount,
    remainingBalance: arrangement.remainingBalance,
    paymentsCompleted: arrangement.paymentsCompleted || 0,
    paymentsMissed: arrangement.paymentsMissed || 0,
    status: arrangement.status,
    nextPaymentDue: arrangement.nextPaymentDue ? new Date(arrangement.nextPaymentDue) : undefined,
    complianceRate: arrangement.complianceRate || 0
  };
};

/**
 * Transform collections status data
 */
const transformCollectionsStatus = (collections: any): z.infer<typeof CollectionsStatusSchema> => {
  return {
    stage: collections.currentStage,
    assignedOfficer: collections.officer,
    assignedDate: collections.assignedDate ? new Date(collections.assignedDate) : undefined,
    lastContactDate: collections.lastContact ? new Date(collections.lastContact) : undefined,
    actions: (collections.actions || []).map((action: any) => ({
      actionType: action.type,
      actionDate: new Date(action.date),
      actionNumber: action.referenceNumber,
      amount: action.amount,
      status: action.status,
      details: action.notes
    })),
    totalUnderCollections: collections.totalAmount,
    priorityLevel: collections.priority || 'medium'
  };
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate total owing from raw data
 */
const calculateTotalOwing = (data: any): number => {
  let total = 0;
  if (data.T2?.totalBalance) total += data.T2.totalBalance;
  if (data.RT?.totalBalance) total += data.RT.totalBalance;
  if (data.RP?.totalBalance) total += data.RP.totalBalance;
  if (data.RZ?.totalBalance) total += data.RZ.totalBalance;
  if (data.RD?.totalBalance) total += data.RD.totalBalance;
  return total;
};

/**
 * Calculate years overdue
 */
const calculateYearsOverdue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const now = new Date();
  const years = (now.getTime() - due.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(years));
};

/**
 * Calculate compliance rate
 */
const calculateComplianceRate = (filed: number, unfiled: number): number => {
  const total = filed + unfiled;
  if (total === 0) return 100;
  return Math.round((filed / total) * 100);
};

/**
 * Calculate federal risk score
 */
const calculateFederalRiskScore = (data: any): number => {
  let score = 0;
  
  // Amount factor (0-40 points)
  const totalOwing = calculateTotalOwing(data);
  if (totalOwing === 0) score += 40;
  else if (totalOwing < 10000) score += 30;
  else if (totalOwing < 50000) score += 20;
  else if (totalOwing < 100000) score += 10;
  
  // Compliance factor (0-30 points)
  const hasUnfiledReturns = data.T2?.filingHistory?.unfiled?.length > 0 ||
                           data.RT?.filingHistory?.unfiled?.length > 0 ||
                           data.RP?.filingHistory?.unfiled?.length > 0;
  if (!hasUnfiledReturns) score += 30;
  else score += 10;
  
  // Collections factor (0-20 points)
  if (!data.collections) score += 20;
  else if (data.collections.currentStage === 'notice') score += 15;
  else if (data.collections.currentStage === 'demand') score += 10;
  else if (data.collections.currentStage === 'collections') score += 5;
  
  // Payment arrangement factor (0-10 points)
  if (data.paymentArrangement?.status === 'active' && 
      data.paymentArrangement?.complianceRate > 90) score += 10;
  else if (data.paymentArrangement?.status === 'active') score += 5;
  
  return 100 - score; // Invert so higher score = higher risk
};

// ==========================================
// EXPORT VALIDATORS
// ==========================================

export const validators = {
  businessNumber: businessNumberValidator,
  encryptedSIN: encryptedSINValidator,
  money: moneyValidator,
  taxYear: taxYearValidator,
  percentage: percentageValidator
};

export const transformers = {
  craResponse: transformCRAResponse,
  assessment: transformAssessment,
  filingCompliance: transformFilingCompliance,
  paymentArrangement: transformPaymentArrangement,
  collectionsStatus: transformCollectionsStatus
};

export const calculators = {
  totalOwing: calculateTotalOwing,
  yearsOverdue: calculateYearsOverdue,
  complianceRate: calculateComplianceRate,
  federalRiskScore: calculateFederalRiskScore
};