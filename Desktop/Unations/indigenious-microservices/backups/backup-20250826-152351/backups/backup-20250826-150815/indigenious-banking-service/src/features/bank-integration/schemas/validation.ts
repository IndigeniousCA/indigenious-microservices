/**
 * Input Validation Schemas for Bank Integration
 * Enterprise-grade validation with security sanitization
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Constants for validation
const ACCOUNT_NUMBER_REGEX = /^[0-9]{10,20}$/;
const REFERENCE_NUMBER_REGEX = /^[A-Za-z0-9\-_]{1,50}$/;
const AMOUNT_MAX = 10000000; // $10M max per transaction
const AMOUNT_MIN = 0.01; // 1 cent minimum
const DESCRIPTION_MAX_LENGTH = 500;
const NAME_MAX_LENGTH = 255;

// Custom sanitization functions
const sanitizeString = (str: string): string => {
  return DOMPurify.sanitize(str, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  }).trim();
};

const sanitizeMetadata = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Ignore functions, symbols, and other types
  }
  return sanitized;
};

// Virtual Account Creation Schema
export const CreateVirtualAccountSchema = z.object({
  communityId: z.string().uuid('Invalid community ID format'),
  bankId: z.enum(['RBC', 'TD', 'SCOTIA', 'BMO', 'CIBC', 'DESJARDINS']),
  parentAccountNumber: z.string()
    .regex(ACCOUNT_NUMBER_REGEX, 'Invalid account number format')
    .transform(sanitizeString),
  name: z.string()
    .min(1, 'Account name is required')
    .max(NAME_MAX_LENGTH)
    .transform(sanitizeString),
  accountType: z.enum(['ESCROW', 'OPERATING', 'TRUST']).optional(),
  section89Compliant: z.boolean().optional(),
  offReserveBranch: z.string()
    .max(500)
    .transform(sanitizeString)
    .optional(),
  currency: z.enum(['CAD', 'USD']).default('CAD'),
  metadata: z.record(z.any())
    .transform(sanitizeMetadata)
    .optional()
});

// Payment Request Schema
export const PaymentRequestSchema = z.object({
  fromAccountId: z.string().uuid('Invalid from account ID'),
  toAccountId: z.string().uuid('Invalid to account ID'),
  amount: z.number()
    .min(AMOUNT_MIN, `Amount must be at least $${AMOUNT_MIN}`)
    .max(AMOUNT_MAX, `Amount cannot exceed $${AMOUNT_MAX}`)
    .refine(val => Number(val.toFixed(2)) === val, 'Amount must have maximum 2 decimal places'),
  currency: z.enum(['CAD', 'USD']).default('CAD'),
  description: z.string()
    .min(1, 'Description is required')
    .max(DESCRIPTION_MAX_LENGTH)
    .transform(sanitizeString),
  type: z.enum(['INTERNAL_TRANSFER', 'WIRE', 'EFT', 'INTERAC']),
  reference: z.string()
    .regex(REFERENCE_NUMBER_REGEX, 'Invalid reference number format')
    .optional(),
  scheduledFor: z.string()
    .datetime()
    .optional()
    .refine(val => !val || new Date(val) > new Date(), 'Scheduled date must be in the future'),
  useQuickPay: z.boolean().optional(),
  metadata: z.record(z.any())
    .transform(sanitizeMetadata)
    .optional()
});

// Section 89 Details Schema
export const Section89DetailsSchema = z.object({
  bandNumber: z.string()
    .regex(/^[0-9]{1,6}$/, 'Invalid band number format')
    .transform(sanitizeString),
  reserveName: z.string()
    .min(1)
    .max(NAME_MAX_LENGTH)
    .transform(sanitizeString),
  treaty: z.string()
    .max(100)
    .transform(sanitizeString)
    .optional(),
  category1A: z.boolean(),
  offReserveBranch: z.object({
    address: z.string()
      .max(500)
      .transform(sanitizeString),
    transitNumber: z.string()
      .regex(/^[0-9]{5}$/, 'Transit number must be 5 digits'),
    distance: z.number()
      .min(0)
      .max(5000, 'Distance cannot exceed 5000km')
  })
});

// Bank Credentials Schema (for secure storage)
export const BankCredentialsSchema = z.object({
  scotia: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    environment: z.enum(['sandbox', 'production'])
  }).optional(),
  rbc: z.object({
    certificatePath: z.string().min(1),
    privateKeyPath: z.string().min(1),
    passphrase: z.string().optional(),
    environment: z.enum(['sandbox', 'production'])
  }).optional(),
  td: z.object({
    apiKey: z.string().min(1),
    apiSecret: z.string().min(1),
    environment: z.enum(['sandbox', 'production'])
  }).optional(),
  bmo: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    clientId: z.string().min(1),
    environment: z.enum(['sandbox', 'production'])
  }).optional(),
  cibc: z.object({
    apiKey: z.string().min(1),
    partnerId: z.string().min(1),
    environment: z.enum(['sandbox', 'production'])
  }).optional(),
  desjardins: z.object({
    clientId: z.string().min(1),
    certificatePath: z.string().min(1),
    environment: z.enum(['sandbox', 'production'])
  }).optional()
});

// Transaction Query Schema
export const TransactionQuerySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  from: z.string().datetime('Invalid from date'),
  to: z.string().datetime('Invalid to date'),
  limit: z.number()
    .int()
    .min(1)
    .max(1000)
    .default(100),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
}).refine(data => new Date(data.from) < new Date(data.to), {
  message: 'From date must be before to date'
});

// Webhook Configuration Schema
export const WebhookConfigSchema = z.object({
  url: z.string()
    .url('Invalid webhook URL')
    .refine(url => url.startsWith('https://'), 'Webhook URL must use HTTPS'),
  secret: z.string()
    .min(32, 'Webhook secret must be at least 32 characters'),
  events: z.array(z.string()).min(1, 'At least one event type required'),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(5).default(2),
    maxBackoffSeconds: z.number().int().min(60).max(3600).default(300)
  }).optional()
});

// Bulk Verification Schema
export const BulkVerificationSchema = z.object({
  businessIds: z.array(z.string().uuid())
    .min(1, 'At least one business ID required')
    .max(100, 'Maximum 100 businesses per batch'),
  webhookUrl: z.string()
    .url('Invalid webhook URL')
    .refine(url => url.startsWith('https://'), 'Webhook URL must use HTTPS')
    .optional(),
  includeNetworkAnalysis: z.boolean().default(false)
});

// Bill C-5 Project Schema
export const BillC5ProjectSchema = z.object({
  name: z.string()
    .min(1)
    .max(NAME_MAX_LENGTH)
    .transform(sanitizeString),
  totalValue: z.number()
    .positive()
    .max(1000000000, 'Project value cannot exceed $1B'),
  indigenousRequirement: z.number()
    .min(0)
    .max(100, 'Percentage must be between 0 and 100'),
  status: z.enum(['proposed', 'approved', 'active', 'completed']),
  leadDepartment: z.string()
    .max(NAME_MAX_LENGTH)
    .transform(sanitizeString),
  indigenousPartners: z.array(z.object({
    communityId: z.string().uuid(),
    role: z.string().max(100).transform(sanitizeString),
    percentage: z.number().min(0).max(100)
  })),
  timeline: z.object({
    announced: z.string().datetime(),
    started: z.string().datetime().optional(),
    expectedCompletion: z.string().datetime()
  })
});

// Risk Score Query Schema
export const RiskScoreQuerySchema = z.object({
  businessId: z.string().uuid('Invalid business ID'),
  forceRefresh: z.boolean().default(false),
  includeNetworkAnalysis: z.boolean().default(false),
  contractValue: z.number()
    .positive()
    .max(AMOUNT_MAX)
    .optional()
});

// Reconciliation Request Schema
export const ReconciliationRequestSchema = z.object({
  bankId: z.enum(['RBC', 'TD', 'SCOTIA', 'BMO', 'CIBC', 'DESJARDINS']).optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  reconciliationType: z.enum(['balance', 'transactions', 'full']).default('full'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

// Export validation helpers
export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed: Unknown error']
    };
  }
};

// Idempotency key validation
export const IdempotencyKeySchema = z.string()
  .regex(/^[a-zA-Z0-9\-_]{16,64}$/, 'Invalid idempotency key format')
  .transform(sanitizeString);

// API Key validation
export const APIKeySchema = z.string()
  .regex(/^indi_[a-zA-Z0-9]{32,64}$/, 'Invalid API key format');

// Export all schemas
export const ValidationSchemas = {
  CreateVirtualAccount: CreateVirtualAccountSchema,
  PaymentRequest: PaymentRequestSchema,
  Section89Details: Section89DetailsSchema,
  BankCredentials: BankCredentialsSchema,
  TransactionQuery: TransactionQuerySchema,
  WebhookConfig: WebhookConfigSchema,
  BulkVerification: BulkVerificationSchema,
  BillC5Project: BillC5ProjectSchema,
  RiskScoreQuery: RiskScoreQuerySchema,
  ReconciliationRequest: ReconciliationRequestSchema,
  IdempotencyKey: IdempotencyKeySchema,
  APIKey: APIKeySchema
};