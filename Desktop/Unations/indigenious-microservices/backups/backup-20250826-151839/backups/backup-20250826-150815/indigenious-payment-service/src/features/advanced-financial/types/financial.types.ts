// Advanced Financial Types
// Type definitions for financial features

// Currency types
export type CurrencyCode = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH' | 'ITU' // ITU = Indigenous Trade Units

export interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
  decimals: number
  isDigital: boolean
  exchangeRate?: number // Rate to CAD
}

// Account types
export interface BankAccount {
  id: string
  institutionName: string
  institutionNumber: string
  transitNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings' | 'business' | 'trust'
  currency: CurrencyCode
  balance: number
  availableBalance: number
  isIndigenousBank: boolean
  lastSync: string
  status: 'active' | 'inactive' | 'frozen'
}

// Transaction types
export interface Transaction {
  id: string
  accountId: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  currency: CurrencyCode
  description: string
  date: string
  status: TransactionStatus
  reference?: string
  merchantName?: string
  projectId?: string
  tags?: string[]
  attachments?: Attachment[]
  reconciled: boolean
  taxDetails?: TaxDetails
  indigenousImpact?: IndigenousImpact
}

export type TransactionType = 
  | 'income'
  | 'expense'
  | 'transfer'
  | 'refund'
  | 'adjustment'

export type TransactionCategory = 
  | 'revenue'
  | 'materials'
  | 'labor'
  | 'equipment'
  | 'travel'
  | 'professional_fees'
  | 'utilities'
  | 'rent'
  | 'insurance'
  | 'taxes'
  | 'cultural_activities'
  | 'community_investment'
  | 'elder_compensation'
  | 'other'

export type TransactionStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'disputed'

// Invoice types
export interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  projectId?: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  terms: PaymentTerms
  currency: CurrencyCode
  lineItems: LineItem[]
  subtotal: number
  taxDetails: TaxDetails
  total: number
  amountPaid: number
  balance: number
  notes?: string
  attachments?: Attachment[]
  reminders: InvoiceReminder[]
  payments: Payment[]
  indigenousBusiness: boolean
  governmentContract: boolean
}

export type InvoiceStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type PaymentTerms = 
  | 'immediate'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'net_90'
  | 'custom'

export interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
  taxable: boolean
  category?: string
}

export interface TaxDetails {
  gst?: TaxItem
  pst?: TaxItem
  hst?: TaxItem
  exemptions?: TaxExemption[]
  totalTax: number
}

export interface TaxItem {
  rate: number
  amount: number
  number?: string // Tax registration number
}

export interface TaxExemption {
  type: 'status_indian' | 'band_property' | 'cultural_services' | 'other'
  reason: string
  documentId?: string
}

export interface InvoiceReminder {
  id: string
  sentDate: string
  type: 'friendly' | 'overdue' | 'final'
  method: 'email' | 'sms' | 'mail'
  response?: string
}

// Payment types
export interface Payment {
  id: string
  invoiceId?: string
  amount: number
  currency: CurrencyCode
  method: PaymentMethod
  status: PaymentStatus
  processedDate?: string
  reference: string
  processorResponse?: any
  fees?: number
  netAmount?: number
}

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'e_transfer'
  | 'cheque'
  | 'cash'
  | 'cryptocurrency'
  | 'barter'
  | 'other'

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'

// Budget types
export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual' | 'project'

export interface Budget {
  id: string
  name: string
  type: 'project' | 'department' | 'annual' | 'event'
  entityId: string // Project ID, Department ID, etc.
  period: {
    start: string
    end: string
  }
  currency: CurrencyCode
  categories: BudgetCategory[]
  totalBudget: number
  totalSpent: number
  totalCommitted: number
  status: 'draft' | 'approved' | 'active' | 'closed'
  approvals: BudgetApproval[]
  alerts: BudgetAlert[]
}

export interface BudgetCategory {
  id: string
  name: string
  category: TransactionCategory
  budgeted: number
  spent: number
  committed: number
  variance: number
  subcategories?: BudgetCategory[]
}

export interface BudgetApproval {
  userId: string
  userName: string
  role: string
  approvedAt: string
  comments?: string
}

export interface BudgetAlert {
  id: string
  type: 'overspend' | 'threshold' | 'unusual_activity'
  severity: 'info' | 'warning' | 'critical'
  message: string
  triggeredAt: string
  acknowledged: boolean
}

// Financial report types
export interface FinancialReport {
  id: string
  type: ReportType
  name: string
  period: {
    start: string
    end: string
  }
  generatedAt: string
  generatedBy: string
  data: unknown // Report-specific data structure
  format: 'pdf' | 'excel' | 'csv' | 'json'
  url?: string
  scheduled: boolean
  recipients?: string[]
}

export type ReportType = 
  | 'profit_loss'
  | 'balance_sheet'
  | 'cash_flow'
  | 'aged_receivables'
  | 'aged_payables'
  | 'tax_summary'
  | 'indigenous_impact'
  | 'project_profitability'
  | 'budget_variance'
  | 'custom'

// Indigenous economic features
export interface IndigenousImpact {
  communityInvestment: number
  elderCompensation: number
  youthTraining: number
  culturalActivities: number
  languagePrograms: number
  localSuppliers: number
  employmentHours: number
  environmentalBenefit?: string
}

export interface TraditionalExchange {
  id: string
  type: 'barter' | 'knowledge' | 'service' | 'resource'
  description: string
  parties: {
    provider: string
    receiver: string
  }
  value?: {
    estimated: number
    currency: CurrencyCode
    basis: string
  }
  date: string
  culturalProtocol?: string
  communityBenefit?: string
}

export interface CommunityFund {
  id: string
  name: string
  type: 'trust' | 'development' | 'emergency' | 'cultural' | 'education'
  balance: number
  currency: CurrencyCode
  restrictions?: string[]
  trustees: string[]
  disbursements: Disbursement[]
  contributions: Contribution[]
}

export interface Disbursement {
  id: string
  amount: number
  recipient: string
  purpose: string
  approvedBy: string[]
  date: string
  impact?: string
}

export interface Contribution {
  id: string
  amount: number
  contributor: string
  source: string
  date: string
  anonymous: boolean
}

// Payment processor types
export interface PaymentProcessor {
  name: 'stripe' | 'moneris' | 'interac' | 'fnbc' // First Nations Bank of Canada
  enabled: boolean
  credentials: Record<string, string>
  supportedMethods: PaymentMethod[]
  supportedCurrencies: CurrencyCode[]
  fees: ProcessorFees
}

export interface ProcessorFees {
  percentage: number
  fixed: number
  currency: CurrencyCode
  indigenousRate?: {
    percentage: number
    fixed: number
  }
}

// Financial settings
export interface FinancialSettings {
  defaultCurrency: CurrencyCode
  fiscalYearStart: string
  taxSettings: {
    gstNumber?: string
    pstNumbers?: Record<string, string> // Province -> Number
    indigenousExemptions: TaxExemption[]
  }
  invoiceSettings: {
    prefix: string
    nextNumber: number
    defaultTerms: PaymentTerms
    logo?: string
    footer?: string
  }
  approvalLimits: ApprovalLimit[]
  integrations: {
    accounting?: 'quickbooks' | 'sage' | 'simply'
    banking: BankingIntegration[]
    payroll?: 'ceridian' | 'adp' | 'paychex'
  }
}

export interface ApprovalLimit {
  role: string
  singleTransaction: number
  dailyLimit: number
  requiresDualApproval: boolean
}

export interface BankingIntegration {
  bankId: string
  type: 'oauth' | 'direct' | 'file_import'
  lastSync: string
  autoSync: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily'
}

// Attachment type
export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
  uploadedBy: string
}

// Financial analytics types
export interface FinancialMetrics {
  period: string
  revenue: {
    total: number
    growth: number
    byCategory: Record<string, number>
    forecast: number
  }
  expenses: {
    total: number
    byCategory: Record<TransactionCategory, number>
    burnRate: number
  }
  profitability: {
    grossMargin: number
    netMargin: number
    ebitda: number
  }
  cashFlow: {
    operating: number
    investing: number
    financing: number
    net: number
  }
  indigenousImpact: {
    communitySpend: number
    percentOfTotal: number
    jobsCreated: number
    youthTrained: number
  }
  kpis: {
    dso: number // Days Sales Outstanding
    currentRatio: number
    quickRatio: number
    debtToEquity: number
  }
}