// TypeScript types for financial integration

export interface PaymentAccount {
  id: string
  vendorId: string
  accountType: 'business_checking' | 'business_savings' | 'trust'
  accountName: string
  institutionName: string
  transitNumber: string
  institutionNumber: string
  accountNumber: string // Encrypted
  isDefault: boolean
  isVerified: boolean
  verifiedAt?: string
  createdAt: string
  lastUsed?: string
  
  // Compliance
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired'
  amlStatus: 'clear' | 'review' | 'flagged'
  
  // Limits
  dailyLimit: number
  monthlyLimit: number
  remainingDailyLimit: number
  remainingMonthlyLimit: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  vendorId: string
  vendorName: string
  clientId: string
  clientName: string
  projectId?: string
  projectName?: string
  
  // Status
  status: InvoiceStatus
  
  // Dates
  issueDate: string
  dueDate: string
  paidDate?: string
  
  // Amounts
  subtotal: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  currency: 'CAD' | 'USD'
  
  // Payment terms
  paymentTerms: PaymentTerms
  lateFeePercentage?: number
  
  // Line items
  lineItems: InvoiceLineItem[]
  
  // Indigenous content
  indigenousContentPercentage?: number
  indigenousContentValue?: number
  
  // Attachments
  attachments: InvoiceAttachment[]
  
  // Payment info
  paymentInstructions?: string
  paymentReference?: string
  
  // Audit
  createdBy: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
}

export type InvoiceStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'approved'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type PaymentTerms = 
  | 'due_on_receipt'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'net_90'
  | '2_10_net_30' // 2% discount if paid within 10 days
  | 'milestone'
  | 'custom'

export interface InvoiceLineItem {
  id: string
  description: string
  category: 'labor' | 'materials' | 'equipment' | 'subcontractor' | 'other'
  quantity: number
  unitPrice: number
  amount: number
  taxRate: number
  taxAmount: number
  total: number
  
  // Indigenous tracking
  isIndigenous?: boolean
  indigenousSupplier?: string
}

export interface InvoiceAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  category: 'receipt' | 'timesheet' | 'delivery' | 'other'
}

export interface Payment {
  id: string
  transactionId: string
  invoiceId?: string
  vendorId: string
  payerId: string
  payerName: string
  
  // Amount
  amount: number
  currency: 'CAD' | 'USD'
  
  // Method
  paymentMethod: PaymentMethod
  paymentDetails?: PaymentDetails
  
  // Status
  status: PaymentStatus
  statusReason?: string
  
  // Dates
  initiatedAt: string
  processedAt?: string
  settledAt?: string
  
  // Fees
  processingFee: number
  netAmount: number
  
  // References
  referenceNumber: string
  description?: string
  
  // Compliance
  amlChecked: boolean
  fraudScore?: number
  
  // Metadata
  metadata?: Record<string, any>
}

export type PaymentMethod = 
  | 'eft' // Electronic Funds Transfer
  | 'wire'
  | 'ach'
  | 'credit_card'
  | 'interac'
  | 'cheque'
  | 'crypto'

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'reversed'

export interface PaymentDetails {
  // For card payments
  cardLast4?: string
  cardBrand?: string
  
  // For bank transfers
  bankName?: string
  accountLast4?: string
  
  // For crypto
  cryptoAddress?: string
  cryptoTxHash?: string
  cryptoNetwork?: string
}

export interface PaymentSchedule {
  id: string
  projectId: string
  vendorId: string
  clientId: string
  
  // Schedule type
  scheduleType: 'milestone' | 'percentage' | 'fixed_dates'
  
  // Total contract
  totalAmount: number
  currency: 'CAD' | 'USD'
  
  // Milestones
  milestones: PaymentMilestone[]
  
  // Status
  status: 'active' | 'completed' | 'suspended' | 'cancelled'
  
  // Progress
  totalPaid: number
  totalDue: number
  nextPaymentDate?: string
  nextPaymentAmount?: number
}

export interface PaymentMilestone {
  id: string
  name: string
  description?: string
  dueDate?: string
  percentage?: number
  amount: number
  
  // Status
  status: 'pending' | 'due' | 'invoiced' | 'paid' | 'overdue'
  
  // Completion
  completionCriteria?: string
  completedAt?: string
  approvedBy?: string
  
  // Invoice
  invoiceId?: string
  invoicedAt?: string
  paidAt?: string
}

export interface FinancialReport {
  id: string
  vendorId: string
  reportType: 'income' | 'expense' | 'cash_flow' | 'tax' | 'indigenous_content'
  period: {
    start: string
    end: string
  }
  
  // Summary
  summary: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    outstandingInvoices: number
    overdueAmount: number
  }
  
  // Breakdown
  revenueByClient: RevenueBreakdown[]
  revenueByProject: RevenueBreakdown[]
  expensesByCategory: ExpenseBreakdown[]
  
  // Indigenous content
  indigenousContent?: {
    totalValue: number
    percentage: number
    byCategory: {
      employment: number
      subcontracting: number
      procurement: number
    }
  }
  
  // Tax
  taxSummary?: {
    gstCollected: number
    pstCollected: number
    inputTaxCredits: number
    netTaxOwing: number
  }
  
  generatedAt: string
  generatedBy: string
}

export interface RevenueBreakdown {
  id: string
  name: string
  amount: number
  percentage: number
  invoiceCount: number
  isPaid: boolean
}

export interface ExpenseBreakdown {
  category: string
  amount: number
  percentage: number
  transactionCount: number
}

export interface TaxDocument {
  id: string
  vendorId: string
  documentType: 'T4A' | 'T5018' | 'GST_RETURN' | 'PST_RETURN' | 'T2' | 'OTHER'
  taxYear: number
  fileName: string
  fileUrl: string
  uploadedAt: string
  
  // For T5018 (Construction subcontractor payments)
  contractPayments?: number
  reportingPeriod?: string
  
  // Status
  status: 'draft' | 'submitted' | 'accepted' | 'amended'
  submittedAt?: string
  caseNumber?: string
}

export interface BankingIntegration {
  id: string
  vendorId: string
  provider: 'plaid' | 'yodlee' | 'flinks' | 'manual'
  
  // Connection
  connectionStatus: 'connected' | 'error' | 'expired' | 'pending'
  lastSync?: string
  
  // Accounts
  accounts: ConnectedBankAccount[]
  
  // Permissions
  permissions: {
    viewBalance: boolean
    viewTransactions: boolean
    initiatePayments: boolean
  }
  
  // Metadata
  institutionName?: string
  institutionLogo?: string
}

export interface ConnectedBankAccount {
  id: string
  accountId: string // Provider's account ID
  accountName: string
  accountType: string
  currentBalance?: number
  availableBalance?: number
  currency: string
  lastUpdated?: string
}

export interface Transaction {
  id: string
  accountId: string
  vendorId: string
  
  // Transaction details
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  
  // Categorization
  category?: TransactionCategory
  subCategory?: string
  
  // Reconciliation
  reconciled: boolean
  invoiceId?: string
  expenseId?: string
  
  // Indigenous tracking
  isIndigenousVendor?: boolean
  indigenousBusinessName?: string
  
  // Metadata
  merchant?: string
  location?: string
  notes?: string
  tags?: string[]
}

export type TransactionCategory = 
  | 'revenue'
  | 'materials'
  | 'labor'
  | 'equipment'
  | 'subcontractor'
  | 'utilities'
  | 'insurance'
  | 'professional_fees'
  | 'travel'
  | 'office'
  | 'other'

export interface PaymentGatewayConfig {
  provider: 'stripe' | 'moneris' | 'square' | 'paypal'
  
  // Credentials (encrypted)
  publicKey?: string
  secretKey?: string
  merchantId?: string
  
  // Settings
  acceptedMethods: PaymentMethod[]
  acceptedCurrencies: string[]
  
  // Fees
  transactionFeePercentage: number
  transactionFeeFixed: number
  monthlyFee?: number
  
  // Features
  features: {
    instantPayouts: boolean
    recurringPayments: boolean
    internationalPayments: boolean
    cryptoPayments: boolean
  }
  
  // Status
  isActive: boolean
  isVerified: boolean
  verifiedAt?: string
}

export interface FinancialSettings {
  vendorId: string
  
  // Invoice settings
  invoicePrefix: string
  nextInvoiceNumber: number
  defaultPaymentTerms: PaymentTerms
  defaultLateFeePercentage: number
  invoiceNotes?: string
  
  // Tax settings
  gstNumber?: string
  pstNumber?: string
  taxExempt: boolean
  defaultTaxRate: number
  
  // Banking
  defaultPaymentAccount?: string
  allowPartialPayments: boolean
  minimumPaymentAmount: number
  
  // Notifications
  notifications: {
    invoicePaid: boolean
    paymentReceived: boolean
    overdueReminder: boolean
    lowBalance: boolean
  }
  
  // Automation
  automation: {
    autoGenerateInvoices: boolean
    autoSendReminders: boolean
    autoReconcile: boolean
  }
}