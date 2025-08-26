/**
 * Bank Integration Types
 * Core types for multi-bank virtual account management
 */

export interface VirtualAccount {
  id: string;
  communityId: string;
  bankId: BankId;
  parentAccountNumber: string;
  virtualAccountNumber: string;
  name: string;
  status: 'active' | 'pending' | 'closed';
  balance: number;
  currency: 'CAD' | 'USD';
  metadata: {
    section89Compliant: boolean;
    offReserveBranch: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface BankAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createVirtualAccount(params: CreateAccountParams): Promise<VirtualAccount>;
  getBalance(accountId: string): Promise<number>;
  listTransactions(accountId: string, from: Date, to: Date): Promise<Transaction[]>;
  initiatePayment(payment: PaymentRequest): Promise<PaymentResult>;
  closeAccount(accountId: string): Promise<void>;
  getAccountDetails(accountId: string): Promise<VirtualAccount>;
  healthCheck(): Promise<HealthCheckResult>;
}

export type BankId = 'RBC' | 'TD' | 'SCOTIA' | 'BMO' | 'CIBC' | 'DESJARDINS';

export interface CreateAccountParams {
  communityId: string;
  parentAccountNumber: string;
  name: string;
  accountType?: 'ESCROW' | 'OPERATING' | 'TRUST';
  section89Compliant?: boolean;
  offReserveBranch?: string;
  currency?: 'CAD' | 'USD';
  metadata?: Record<string, any>;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: 'CAD' | 'USD';
  description: string;
  referenceNumber: string;
  bankReference?: string;
  counterparty?: {
    name: string;
    accountNumber?: string;
    bankId?: string;
  };
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  processedAt: Date;
  createdAt: Date;
}

export interface PaymentRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency?: 'CAD' | 'USD';
  description: string;
  type: 'INTERNAL_TRANSFER' | 'WIRE' | 'EFT' | 'INTERAC';
  reference?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  fromAccount: string;
  toAccount: string;
  amount: number;
  fees?: number;
  reference: string;
  bankReference?: string;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  errors?: string[];
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastSuccessfulRequest?: Date;
  errors?: string[];
}

export interface BankCredentials {
  scotia?: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
  };
  rbc?: {
    certificatePath: string;
    privateKeyPath: string;
    passphrase?: string;
    environment: 'sandbox' | 'production';
  };
  td?: {
    apiKey: string;
    apiSecret: string;
    environment: 'sandbox' | 'production';
  };
  bmo?: {
    username: string;
    password: string;
    clientId: string;
    environment: 'sandbox' | 'production';
  };
  cibc?: {
    apiKey: string;
    partnerId: string;
    environment: 'sandbox' | 'production';
  };
  desjardins?: {
    clientId: string;
    certificatePath: string;
    environment: 'sandbox' | 'production';
  };
}

export interface ReconciliationResult {
  bankId: BankId;
  accountsReconciled: number;
  discrepancies: Array<{
    accountId: string;
    ourBalance: number;
    bankBalance: number;
    difference: number;
  }>;
  transactionsSynced: number;
  errors: string[];
  completedAt: Date;
}

// Section 89 specific types
export interface Section89Details {
  bandNumber: string;
  reserveName: string;
  treaty?: string;
  category1A: boolean;
  offReserveBranch: {
    address: string;
    transitNumber: string;
    distance: number; // km from reserve
  };
}

// Bill C-5 tracking
export interface BillC5Project {
  id: string;
  name: string;
  totalValue: number;
  indigenousRequirement: number; // percentage
  status: 'proposed' | 'approved' | 'active' | 'completed';
  leadDepartment: string;
  indigenousPartners: Array<{
    communityId: string;
    role: string;
    percentage: number;
  }>;
  virtualAccounts: string[]; // account IDs
  timeline: {
    announced: Date;
    started?: Date;
    expectedCompletion: Date;
  };
}