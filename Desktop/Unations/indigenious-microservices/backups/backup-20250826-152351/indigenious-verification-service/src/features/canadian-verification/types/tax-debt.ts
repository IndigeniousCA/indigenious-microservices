/**
 * Tax Debt Verification Type Definitions
 * 
 * @module TaxDebtTypes
 * @description Enterprise-grade type definitions for federal and provincial tax debt verification
 */

import { z } from 'zod';
import { Province } from './index';

// ==========================================
// BASE TAX DEBT SCHEMAS
// ==========================================

/**
 * Individual tax debt item schema
 */
export const TaxDebtItemSchema = z.object({
  taxType: z.string().describe('Type of tax (e.g., Corporate Income Tax, GST/HST, PST)'),
  amountOwing: z.number().min(0).describe('Current amount owing including penalties and interest'),
  originalAmount: z.number().min(0).describe('Original tax assessment amount'),
  penaltiesInterest: z.number().min(0).describe('Accumulated penalties and interest'),
  periodStart: z.date().describe('Tax period start date'),
  periodEnd: z.date().describe('Tax period end date'),
  dueDate: z.date().describe('Original payment due date'),
  lastPaymentDate: z.date().optional().describe('Date of last payment received'),
  filingStatus: z.enum(['filed', 'unfiled', 'disputed', 'under_appeal']).describe('Tax return filing status'),
  assessmentNumber: z.string().optional().describe('Tax assessment or notice number'),
  yearsOverdue: z.number().min(0).optional().describe('Number of years overdue')
});

export type TaxDebtItem = z.infer<typeof TaxDebtItemSchema>;

/**
 * Payment arrangement details schema
 */
export const PaymentArrangementSchema = z.object({
  arrangementId: z.string().describe('Unique payment arrangement identifier'),
  startDate: z.date().describe('Arrangement start date'),
  endDate: z.date().optional().describe('Projected completion date'),
  monthlyPayment: z.number().min(0).describe('Monthly payment amount'),
  paymentFrequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'quarterly']).describe('Payment frequency'),
  totalAgreedAmount: z.number().min(0).describe('Total amount covered by arrangement'),
  remainingBalance: z.number().min(0).describe('Outstanding balance under arrangement'),
  paymentsCompleted: z.number().min(0).describe('Number of payments completed'),
  paymentsMissed: z.number().min(0).describe('Number of missed payments'),
  status: z.enum(['active', 'defaulted', 'completed', 'cancelled']).describe('Arrangement status'),
  nextPaymentDue: z.date().optional().describe('Next payment due date'),
  complianceRate: z.number().min(0).max(100).describe('Percentage of payments made on time')
});

export type PaymentArrangement = z.infer<typeof PaymentArrangementSchema>;

/**
 * Collections action schema
 */
export const CollectionsActionSchema = z.object({
  actionType: z.enum(['notice', 'demand', 'lien', 'garnishment', 'seizure', 'legal_action']),
  actionDate: z.date().describe('Date action was taken'),
  actionNumber: z.string().describe('Reference number for the action'),
  amount: z.number().min(0).describe('Amount subject to collections action'),
  status: z.enum(['active', 'satisfied', 'withdrawn', 'disputed']),
  details: z.string().optional().describe('Additional details about the action')
});

export type CollectionsAction = z.infer<typeof CollectionsActionSchema>;

/**
 * Collections status schema
 */
export const CollectionsStatusSchema = z.object({
  stage: z.enum(['notice', 'demand', 'collections', 'legal_action', 'bankruptcy']).describe('Current collections stage'),
  assignedOfficer: z.string().optional().describe('Collections officer assigned'),
  assignedDate: z.date().optional().describe('Date assigned to collections'),
  lastContactDate: z.date().optional().describe('Last contact with taxpayer'),
  actions: z.array(CollectionsActionSchema).describe('Collections actions taken'),
  totalUnderCollections: z.number().min(0).describe('Total amount under collections'),
  priorityLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Collections priority')
});

export type CollectionsStatus = z.infer<typeof CollectionsStatusSchema>;

/**
 * Tax filing compliance schema
 */
export const FilingComplianceSchema = z.object({
  taxType: z.string().describe('Type of tax return'),
  currentYear: z.number().describe('Current tax year'),
  filedYears: z.array(z.number()).describe('Years with filed returns'),
  unfiledYears: z.array(z.number()).describe('Years with unfiled returns'),
  complianceRate: z.number().min(0).max(100).describe('Filing compliance percentage'),
  lastFilingDate: z.date().optional().describe('Date of last filing'),
  outstandingReturns: z.number().min(0).describe('Number of outstanding returns')
});

export type FilingCompliance = z.infer<typeof FilingComplianceSchema>;

// ==========================================
// FEDERAL TAX DEBT SCHEMAS
// ==========================================

/**
 * Federal tax debt details schema
 */
export const FederalTaxDebtSchema = z.object({
  // Corporate Income Tax
  corporateTax: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    oldestDebt: z.date().optional(),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // GST/HST
  gstHst: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    registrationNumber: z.string().optional(),
    filingFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // Payroll Deductions
  payrollDeductions: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    accountNumber: z.string().optional(),
    employeeCount: z.number().optional(),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // Import/Export Duties
  importExport: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    importerNumber: z.string().optional()
  }).optional(),
  
  // Excise Tax
  exciseTax: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    licenseNumber: z.string().optional()
  }).optional(),
  
  // Aggregate Information
  totalFederalOwing: z.number().min(0).describe('Total federal tax debt'),
  paymentArrangement: PaymentArrangementSchema.optional(),
  collectionsStatus: CollectionsStatusSchema.optional(),
  lastAssessmentDate: z.date().optional(),
  riskScore: z.number().min(0).max(100).optional().describe('Federal tax debt risk score')
});

export type FederalTaxDebt = z.infer<typeof FederalTaxDebtSchema>;

// ==========================================
// PROVINCIAL TAX DEBT SCHEMAS
// ==========================================

/**
 * Provincial tax types
 */
export const ProvincialTaxTypeSchema = z.enum([
  'provincial_corporate_tax',
  'pst', // Provincial Sales Tax
  'qst', // Quebec Sales Tax
  'retail_sales_tax',
  'employer_health_tax',
  'payroll_tax',
  'carbon_tax',
  'fuel_tax',
  'tobacco_tax',
  'insurance_premium_tax',
  'mining_tax',
  'logging_tax',
  'property_transfer_tax',
  'motor_fuel_tax',
  'health_services_fund', // Quebec
  'capital_tax'
]);

/**
 * Provincial tax debt details schema
 */
export const ProvincialTaxDebtSchema = z.object({
  province: z.string().describe('Province code'),
  
  // Provincial Corporate Tax
  provincialCorporateTax: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // Sales Tax (PST/QST/RST)
  salesTax: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    registrationNumber: z.string().optional(),
    taxType: z.enum(['PST', 'QST', 'RST', 'HST']).optional(),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // Payroll/Employer Taxes
  payrollTax: z.object({
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    taxTypes: z.array(z.string()).describe('Types of payroll taxes'),
    filingCompliance: FilingComplianceSchema.optional()
  }).optional(),
  
  // Other Provincial Taxes
  otherTaxes: z.array(z.object({
    taxType: ProvincialTaxTypeSchema,
    items: z.array(TaxDebtItemSchema),
    totalOwing: z.number().min(0),
    accountNumber: z.string().optional()
  })).optional(),
  
  // Aggregate Information
  totalProvincialOwing: z.number().min(0).describe('Total provincial tax debt'),
  paymentArrangement: PaymentArrangementSchema.optional(),
  collectionsStatus: CollectionsStatusSchema.optional(),
  lastAssessmentDate: z.date().optional(),
  riskScore: z.number().min(0).max(100).optional().describe('Provincial tax debt risk score')
});

export type ProvincialTaxDebt = z.infer<typeof ProvincialTaxDebtSchema>;

// ==========================================
// COMPREHENSIVE TAX DEBT SCHEMAS
// ==========================================

/**
 * Complete tax debt details schema
 */
export const TaxDebtDetailsSchema = z.object({
  // Federal tax debt
  federal: FederalTaxDebtSchema,
  
  // Provincial tax debt by province
  provincial: z.record(z.string(), ProvincialTaxDebtSchema).describe('Provincial tax debt keyed by province code'),
  
  // Aggregate Information
  totalOwingAllJurisdictions: z.number().min(0).describe('Total tax debt across all jurisdictions'),
  jurisdictionsWithDebt: z.array(z.string()).describe('List of jurisdictions with outstanding debt'),
  oldestDebt: z.date().optional().describe('Date of oldest outstanding debt'),
  
  // Risk Assessment
  overallRiskScore: z.number().min(0).max(100).describe('Overall tax debt risk score'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Risk level classification'),
  riskFactors: z.array(z.string()).optional().describe('Identified risk factors'),
  
  // Compliance Status
  overallCompliance: z.boolean().describe('Overall tax compliance status'),
  complianceIssues: z.array(z.string()).optional().describe('List of compliance issues'),
  
  // Verification Metadata
  verificationId: z.string().describe('Unique verification identifier'),
  verificationDate: z.date().describe('Date of verification'),
  dataFreshness: z.record(z.string(), z.date()).describe('Last update date by source'),
  confidenceScore: z.number().min(0).max(100).describe('Data confidence score')
});

export type TaxDebtDetails = z.infer<typeof TaxDebtDetailsSchema>;

/**
 * Tax debt verification request schema
 */
export const TaxDebtVerificationRequestSchema = z.object({
  businessNumber: z.string().describe('Federal business number'),
  businessName: z.string().describe('Legal business name'),
  provinces: z.array(z.string()).describe('Provinces to verify'),
  includePaymentArrangements: z.boolean().default(true),
  includeCollectionsStatus: z.boolean().default(true),
  includeFilingCompliance: z.boolean().default(true),
  yearsToCheck: z.number().min(1).max(10).default(5).describe('Number of years to check'),
  consent: z.object({
    obtained: z.boolean(),
    consentDate: z.date(),
    consentNumber: z.string(),
    expiryDate: z.date()
  }).describe('Tax information disclosure consent')
});

export type TaxDebtVerificationRequest = z.infer<typeof TaxDebtVerificationRequestSchema>;

/**
 * Tax debt verification response schema
 */
export const TaxDebtVerificationResponseSchema = z.object({
  request: TaxDebtVerificationRequestSchema,
  taxDebtDetails: TaxDebtDetailsSchema,
  recommendations: z.array(z.string()).optional().describe('Risk mitigation recommendations'),
  procurementEligibility: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional()
  }),
  timestamp: z.date(),
  expiresAt: z.date().describe('When this verification expires')
});

export type TaxDebtVerificationResponse = z.infer<typeof TaxDebtVerificationResponseSchema>;

// ==========================================
// RISK SCORING SCHEMAS
// ==========================================

/**
 * Tax debt risk factors schema
 */
export const TaxDebtRiskFactorsSchema = z.object({
  totalDebtAmount: z.number().min(0),
  debtToRevenueRatio: z.number().optional(),
  yearsOfDebt: z.number().min(0),
  unfiledReturns: z.number().min(0),
  collectionsActions: z.number().min(0),
  paymentArrangementDefault: z.boolean(),
  multipleJurisdictions: z.boolean(),
  criticalTaxTypes: z.array(z.string()).describe('Critical tax types with debt (e.g., payroll)'),
  recentFilingCompliance: z.number().min(0).max(100),
  industryRiskFactor: z.number().min(1).max(5).optional()
});

export type TaxDebtRiskFactors = z.infer<typeof TaxDebtRiskFactorsSchema>;

/**
 * Tax debt risk assessment schema
 */
export const TaxDebtRiskAssessmentSchema = z.object({
  factors: TaxDebtRiskFactorsSchema,
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  recommendations: z.array(z.string()),
  mitigationOptions: z.array(z.string()).optional(),
  reviewRequired: z.boolean(),
  assessmentDate: z.date()
});

export type TaxDebtRiskAssessment = z.infer<typeof TaxDebtRiskAssessmentSchema>;