/**
 * Scotia TranXact Adapter
 * Implements Scotia Bank's TranXact API for virtual account management
 * Supports Interac e-Transfer up to $25,000 per transaction
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { BankAdapter, VirtualAccount, CreateAccountParams, Transaction, PaymentRequest, PaymentResult, HealthCheckResult } from '../../types';
import { logger } from '@/lib/monitoring/logger';
import { secureCredentialManager } from '../../services/SecureCredentialManager';
import { certificatePinning } from '../../services/CertificatePinningService';
import { performanceMonitoring } from '../../services/PerformanceMonitoringService';
import { z } from 'zod';

// Scotia-specific response schemas
const ScotiaAccountSchema = z.object({
  accountId: z.string(),
  virtualAccountNumber: z.string(),
  parentAccount: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  status: z.enum(['ACTIVE', 'PENDING', 'CLOSED']),
  balance: z.object({
    available: z.number(),
    current: z.number(),
    hold: z.number()
  }),
  currency: z.string(),
  metadata: z.record(z.any()),
  branchInfo: z.object({
    transitNumber: z.string(),
    address: z.string()
  }),
  createdDate: z.string(),
  lastModified: z.string()
});

const ScotiaTransactionSchema = z.object({
  transactionId: z.string(),
  accountId: z.string(),
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  referenceNumber: z.string(),
  bankReference: z.string().optional(),
  status: z.enum(['POSTED', 'PENDING', 'FAILED']),
  postedDate: z.string(),
  valueDate: z.string()
});

export class ScotiaTranXactAdapter implements BankAdapter {
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private bankId: string = 'scotia';
  private environment: 'sandbox' | 'production';
  private readonly MAX_INTERAC_AMOUNT = 25000; // $25,000 limit for Interac e-Transfer
  private readonly TLS_MIN_VERSION = 'TLSv1.2';
  
  constructor(environment: 'sandbox' | 'production' = 'sandbox') {
    this.environment = environment;
    const baseURL = environment === 'production' 
      ? process.env.SCOTIA_API_BASE_URL || 'https://api-gateway.scotiabank.com'
      : process.env.SCOTIA_SANDBOX_URL || 'https://sandbox-api.scotiabank.com';
    
    // Configure HTTPS agent with certificate pinning
    const hostname = new URL(baseURL).hostname;
    const httpsAgent = certificatePinning.createPinnedHttpsAgent(hostname, {
      minVersion: this.TLS_MIN_VERSION,
      rejectUnauthorized: true, // Enforce certificate validation
      keepAlive: true,
      maxSockets: 10
    });
      
    this.apiClient = axios.create({
      baseURL,
      timeout: 30000,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use(async (config) => {
      if (!this.accessToken || this.isTokenExpired()) {
        await this.refreshToken();
      }
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });
    
    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          await this.refreshToken();
          return this.apiClient.request(error.config);
        }
        throw error;
      }
    );
  }
  
  async connect(): Promise<void> {
    await this.refreshToken();
    logger.info('Scotia TranXact adapter connected successfully');
  }
  
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('Scotia TranXact adapter disconnected');
  }
  
  async createVirtualAccount(params: CreateAccountParams): Promise<VirtualAccount> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_create_account',
      async () => {
        const response = await this.apiClient.post('/api/v1/virtual-accounts', {
        parentAccount: params.parentAccountNumber,
        accountName: params.name,
        accountType: params.accountType || 'ESCROW',
        currency: params.currency || 'CAD',
        metadata: {
          communityId: params.communityId,
          purpose: 'INDIGENOUS_PROCUREMENT',
          section89: params.section89Compliant || false,
          offReserveBranch: params.offReserveBranch,
          ...params.metadata
        }
      });
      
      const scotiaAccount = ScotiaAccountSchema.parse(response.data);
      
      logger.info('Virtual account created successfully', {
        accountId: scotiaAccount.accountId,
        communityId: params.communityId
      });
      
      return this.mapScotiaAccountToVirtualAccount(scotiaAccount);
      },
      { bank: 'scotia', operation: 'createAccount' }
    );
  }
  
  async getBalance(accountId: string): Promise<number> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_get_balance',
      async () => {
        try {
          const response = await this.apiClient.get(`/api/v1/accounts/${accountId}/balance`);
          return response.data.availableBalance;
        } catch (error) {
          logger.error('Failed to get account balance', { error, accountId });
          throw error;
        }
      },
      { bank: 'scotia', operation: 'getBalance', accountId }
    );
  }
  
  async listTransactions(accountId: string, from: Date, to: Date): Promise<Transaction[]> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_list_transactions',
      async () => {
        try {
          const response = await this.apiClient.get(`/api/v1/accounts/${accountId}/transactions`, {
            params: {
              fromDate: from.toISOString().split('T')[0],
              toDate: to.toISOString().split('T')[0],
              limit: 1000
            }
          });
          
          const transactions = z.array(ScotiaTransactionSchema).parse(response.data.transactions);
          
          return transactions.map(this.mapScotiaTransactionToTransaction);
        } catch (error) {
          logger.error('Failed to list transactions', { error, accountId });
          throw error;
        }
      },
      { bank: 'scotia', operation: 'listTransactions', accountId, dateRange: { from, to } }
    );
  }
  
  async initiatePayment(payment: PaymentRequest): Promise<PaymentResult> {
    return performanceMonitoring.trackOperation(
      'payment_processing',
      'scotia_initiate_payment',
      async () => {
        try {
          // Check if we need to split the payment for Interac limits
          if (payment.type === 'INTERAC' && payment.amount > this.MAX_INTERAC_AMOUNT) {
            return await this.processSplitPayment(payment);
          }
          
          const response = await this.apiClient.post('/api/v1/payments', {
            fromAccount: payment.fromAccount,
            toAccount: payment.toAccount,
            amount: payment.amount,
            currency: payment.currency || 'CAD',
            paymentMethod: this.mapPaymentType(payment.type),
            description: payment.description,
            reference: payment.reference,
            scheduledDate: payment.scheduledFor?.toISOString(),
            metadata: payment.metadata
          });
          
          return {
            id: response.data.paymentId,
            status: this.mapPaymentStatus(response.data.status),
            fromAccount: payment.fromAccount,
            toAccount: payment.toAccount,
            amount: payment.amount,
            fees: response.data.fees || 0,
            reference: response.data.referenceNumber,
            bankReference: response.data.bankReference,
            estimatedCompletion: new Date(response.data.estimatedCompletion),
            errors: response.data.errors
          };
        } catch (error) {
          logger.error('Failed to initiate payment', { error, payment });
          throw error;
        }
      },
      { bank: 'scotia', payment_type: payment.type, amount: payment.amount }
    );
  }
  
  async closeAccount(accountId: string): Promise<void> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_close_account',
      async () => {
        try {
          await this.apiClient.post(`/api/v1/accounts/${accountId}/close`, {
            reason: 'CLIENT_REQUEST',
            finalizeDate: new Date().toISOString()
          });
          
          logger.info('Virtual account closed successfully', { accountId });
        } catch (error) {
          logger.error('Failed to close account', { error, accountId });
          throw error;
        }
      },
      { bank: 'scotia', operation: 'closeAccount', accountId }
    );
  }
  
  async getAccountDetails(accountId: string): Promise<VirtualAccount> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_get_account_details',
      async () => {
        try {
          const response = await this.apiClient.get(`/api/v1/accounts/${accountId}`);
          const scotiaAccount = ScotiaAccountSchema.parse(response.data);
          
          return this.mapScotiaAccountToVirtualAccount(scotiaAccount);
        } catch (error) {
          logger.error('Failed to get account details', { error, accountId });
          throw error;
        }
      },
      { bank: 'scotia', operation: 'getAccountDetails', accountId }
    );
  }
  
  async healthCheck(): Promise<HealthCheckResult> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_health_check',
      async () => {
        const startTime = Date.now();
        
        try {
          const response = await this.apiClient.get('/api/v1/health');
          const latency = Date.now() - startTime;
          
          return {
            status: response.data.status === 'OK' ? 'healthy' : 'degraded',
            latency,
            lastSuccessfulRequest: new Date(),
            errors: response.data.errors
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            latency: Date.now() - startTime,
            errors: [error.message]
          };
        }
      },
      { bank: 'scotia', operation: 'healthCheck' }
    );
  }
  
  // Private helper methods
  
  private async refreshToken(): Promise<void> {
    return performanceMonitoring.trackOperation(
      'bank_api_call',
      'scotia_refresh_token',
      async () => {
        try {
          // Retrieve credentials from secure vault
          const credentials = await secureCredentialManager.getBankCredentials(this.bankId);
          if (!credentials || !('clientId' in credentials) || !('clientSecret' in credentials)) {
            throw new Error('Scotia credentials not found in secure storage');
          }
          
          const response = await this.apiClient.post('/oauth/token', {
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            grant_type: 'client_credentials',
            scope: 'accounts payments virtual-accounts real-time-payments'
          }, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          this.accessToken = response.data.access_token;
          this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
          
          logger.info('Scotia access token refreshed successfully');
        } catch (error) {
          logger.error('Failed to refresh Scotia access token', { error });
          throw new Error('Failed to authenticate with Scotia TranXact');
        }
      },
      { bank: 'scotia', operation: 'refreshToken' }
    );
  }
  
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    // Refresh token 5 minutes before expiry
    return new Date(Date.now() + 5 * 60 * 1000) > this.tokenExpiry;
  }
  
  private async processSplitPayment(payment: PaymentRequest): Promise<PaymentResult> {
    const chunks = Math.ceil(payment.amount / this.MAX_INTERAC_AMOUNT);
    const results: PaymentResult[] = [];
    const errors: string[] = [];
    
    logger.info('Processing split payment', {
      totalAmount: payment.amount,
      chunks,
      maxPerChunk: this.MAX_INTERAC_AMOUNT
    });
    
    for (let i = 0; i < chunks; i++) {
      const chunkAmount = i === chunks - 1 
        ? payment.amount % this.MAX_INTERAC_AMOUNT || this.MAX_INTERAC_AMOUNT
        : this.MAX_INTERAC_AMOUNT;
      
      try {
        const chunkPayment = {
          ...payment,
          amount: chunkAmount,
          reference: `${payment.reference}-${i + 1}/${chunks}`,
          metadata: {
            ...payment.metadata,
            splitPayment: true,
            chunkNumber: i + 1,
            totalChunks: chunks,
            originalAmount: payment.amount
          }
        };
        
        const result = await this.initiatePayment(chunkPayment);
        results.push(result);
      } catch (error) {
        errors.push(`Chunk ${i + 1} failed: ${error.message}`);
      }
    }
    
    // Consolidate results
    const allSuccessful = errors.length === 0;
    const totalFees = results.reduce((sum, r) => sum + (r.fees || 0), 0);
    
    return {
      id: `split-${payment.reference}`,
      status: allSuccessful ? 'initiated' : 'failed',
      fromAccount: payment.fromAccount,
      toAccount: payment.toAccount,
      amount: payment.amount,
      fees: totalFees,
      reference: payment.reference || '',
      errors: errors.length > 0 ? errors : undefined,
      estimatedCompletion: results[0]?.estimatedCompletion
    };
  }
  
  private mapScotiaAccountToVirtualAccount(scotiaAccount: any): VirtualAccount {
    return {
      id: scotiaAccount.accountId,
      communityId: scotiaAccount.metadata.communityId,
      bankId: 'SCOTIA',
      parentAccountNumber: scotiaAccount.parentAccount,
      virtualAccountNumber: scotiaAccount.virtualAccountNumber,
      name: scotiaAccount.accountName,
      status: scotiaAccount.status === 'ACTIVE' ? 'active' : scotiaAccount.status === 'PENDING' ? 'pending' : 'closed',
      balance: scotiaAccount.balance.available,
      currency: scotiaAccount.currency as 'CAD' | 'USD',
      metadata: {
        section89Compliant: scotiaAccount.metadata.section89 || false,
        offReserveBranch: scotiaAccount.branchInfo.address,
        createdAt: new Date(scotiaAccount.createdDate),
        updatedAt: new Date(scotiaAccount.lastModified)
      }
    };
  }
  
  private mapScotiaTransactionToTransaction(scotiaTransaction: any): Transaction {
    return {
      id: scotiaTransaction.transactionId,
      accountId: scotiaTransaction.accountId,
      type: scotiaTransaction.type === 'CREDIT' ? 'credit' : 'debit',
      amount: scotiaTransaction.amount,
      currency: scotiaTransaction.currency as 'CAD' | 'USD',
      description: scotiaTransaction.description,
      referenceNumber: scotiaTransaction.referenceNumber,
      bankReference: scotiaTransaction.bankReference,
      status: scotiaTransaction.status === 'POSTED' ? 'completed' : scotiaTransaction.status === 'PENDING' ? 'pending' : 'failed',
      processedAt: new Date(scotiaTransaction.postedDate),
      createdAt: new Date(scotiaTransaction.valueDate)
    };
  }
  
  private mapPaymentType(type: PaymentRequest['type']): string {
    const typeMap = {
      'INTERNAL_TRANSFER': 'BOOK_TRANSFER',
      'WIRE': 'WIRE_TRANSFER',
      'EFT': 'EFT',
      'INTERAC': 'INTERAC_ETRANSFER'
    };
    return typeMap[type] || type;
  }
  
  private mapPaymentStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      'INITIATED': 'initiated',
      'IN_PROGRESS': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'REJECTED': 'failed'
    };
    return statusMap[status] || 'processing';
  }
}

export default ScotiaTranXactAdapter;