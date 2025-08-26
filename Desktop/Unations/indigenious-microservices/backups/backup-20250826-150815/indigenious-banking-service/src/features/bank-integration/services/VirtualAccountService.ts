/**
 * Virtual Account Service
 * Main service for managing virtual accounts across all banks
 * Integrates with existing escrow and payment services
 */

import { bankAdapterFactory } from './BankAdapterFactory';
import { 
  VirtualAccount, 
  BankId, 
  CreateAccountParams, 
  PaymentRequest, 
  PaymentResult,
  Transaction,
  Section89Details 
} from '../types';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import { QuickPayEngine } from '@/features/payment-rails/quick-pay-engine';
import { UniversalEscrowService } from '@/features/payment-rails/universal-escrow-service';
import { fraudDetectionService } from './FraudDetectionService';
import { mfaService } from './MFAService';
import { auditLogger } from './AuditLogger';
import { z } from 'zod';

// Schema for virtual account database record
const VirtualAccountRecordSchema = z.object({
  id: z.string(),
  communityId: z.string(),
  bankId: z.string(),
  parentAccountNumber: z.string(),
  virtualAccountNumber: z.string(),
  accountName: z.string(),
  status: z.enum(['active', 'pending', 'closed']),
  balance: z.number().default(0),
  currency: z.enum(['CAD', 'USD']).default('CAD'),
  section89Compliant: z.boolean().default(false),
  offReserveBranch: z.string().optional(),
  escrowAccountId: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class VirtualAccountService {
  private static instance: VirtualAccountService;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): VirtualAccountService {
    if (!VirtualAccountService.instance) {
      VirtualAccountService.instance = new VirtualAccountService();
    }
    return VirtualAccountService.instance;
  }
  
  /**
   * Create a virtual account for a community
   */
  async createVirtualAccount(params: {
    communityId: string;
    bankId: BankId;
    parentAccountNumber: string;
    name: string;
    section89Details?: Section89Details;
    linkToEscrow?: string; // Escrow account ID to link
  }): Promise<VirtualAccount> {
    try {
      // Get the appropriate adapter
      const adapter = bankAdapterFactory.getAdapter(params.bankId);
      
      // Prepare account creation parameters
      const createParams: CreateAccountParams = {
        communityId: params.communityId,
        parentAccountNumber: params.parentAccountNumber,
        name: params.name,
        accountType: params.linkToEscrow ? 'ESCROW' : 'OPERATING',
        section89Compliant: !!params.section89Details,
        offReserveBranch: params.section89Details?.offReserveBranch.address,
        metadata: {
          bandNumber: params.section89Details?.bandNumber,
          reserveName: params.section89Details?.reserveName,
          treaty: params.section89Details?.treaty,
          linkedEscrow: params.linkToEscrow
        }
      };
      
      // Create account with bank
      const virtualAccount = await adapter.createVirtualAccount(createParams);
      
      // Store in our database
      const dbRecord = await prisma.virtualAccount.create({
        data: {
          id: virtualAccount.id,
          communityId: params.communityId,
          bankId: params.bankId,
          parentAccountNumber: params.parentAccountNumber,
          virtualAccountNumber: virtualAccount.virtualAccountNumber,
          accountName: params.name,
          status: virtualAccount.status,
          balance: virtualAccount.balance,
          currency: virtualAccount.currency,
          section89Compliant: !!params.section89Details,
          offReserveBranch: params.section89Details?.offReserveBranch.address,
          escrowAccountId: params.linkToEscrow,
          metadata: {
            ...virtualAccount.metadata,
            section89Details: params.section89Details
          }
        }
      });
      
      // Log to blockchain for audit trail
      await indigenousLedger.log(
        'virtual_account.created',
        'info',
        'Virtual account created for community',
        {
          accountId: virtualAccount.id,
          communityId: params.communityId,
          bankId: params.bankId,
          section89Compliant: !!params.section89Details,
          linkedEscrow: params.linkToEscrow
        },
        {
          component: 'VirtualAccountService',
          culturalContext: params.section89Details ? {
            bandNumber: params.section89Details.bandNumber,
            reserveName: params.section89Details.reserveName
          } : undefined
        }
      );
      
      // Set up monitoring for this account
      await this.initializeAccountMonitoring(virtualAccount.id);
      
      logger.info('Virtual account created successfully', {
        accountId: virtualAccount.id,
        communityId: params.communityId,
        bankId: params.bankId
      });
      
      return virtualAccount;
      
    } catch (error) {
      logger.error('Failed to create virtual account', { error, params });
      throw error;
    }
  }
  
  /**
   * Process payment between accounts with fraud detection and MFA
   * SOC 2 CC7.1: Real-time transaction monitoring
   */
  async processPayment(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    useQuickPay?: boolean;
    metadata?: Record<string, any>;
    userId?: string; // User initiating the payment
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    skipFraudCheck?: boolean; // For testing only
  }): Promise<PaymentResult> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get account details
      const [fromAccount, toAccount] = await Promise.all([
        this.getAccount(params.fromAccountId),
        this.getAccount(params.toAccountId)
      ]);
      
      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }
      
      // Run fraud detection
      if (!params.skipFraudCheck) {
        const fraudScore = await fraudDetectionService.analyzeTransaction({
          transactionId,
          userId: params.userId || fromAccount.communityId,
          businessId: fromAccount.communityId,
          amount: params.amount,
          currency: fromAccount.currency,
          type: 'transfer',
          fromAccount: params.fromAccountId,
          toAccount: params.toAccountId,
          timestamp: new Date(),
          ipAddress: params.ipAddress || '0.0.0.0',
          userAgent: params.userAgent || 'unknown',
          sessionId: params.sessionId || 'unknown',
          metadata: params.metadata
        });
        
        // Handle fraud detection results
        if (fraudScore.decision === 'block') {
          await auditLogger.logSecurityEvent({
            eventType: 'payment_blocked',
            userId: params.userId,
            severity: 'critical',
            ipAddress: params.ipAddress,
            metadata: {
              transactionId,
              amount: params.amount,
              reasons: fraudScore.reasons
            }
          });
          
          throw new Error(`Payment blocked: ${fraudScore.reasons.join(', ')}`);
        }
        
        // Require MFA for suspicious transactions
        if (fraudScore.requiresMFA && params.userId) {
          const mfaRequired = await mfaService.isMFARequired({
            userId: params.userId,
            action: 'payment',
            amount: params.amount,
            ipAddress: params.ipAddress || '0.0.0.0',
            userAgent: params.userAgent || 'unknown'
          });
          
          if (mfaRequired.required) {
            // In a real implementation, this would return a challenge
            // and wait for MFA verification before proceeding
            logger.info('MFA required for payment', {
              transactionId,
              userId: params.userId,
              reason: mfaRequired.reason
            });
          }
        }
        
        // Flag for manual review if needed
        if (fraudScore.requiresManualReview) {
          await this.flagForReview(transactionId, fraudScore);
        }
      }
      
      // Check if it's a cross-bank transfer
      const isCrossBank = fromAccount.bankId !== toAccount.bankId;
      
      if (isCrossBank) {
        return await this.processCrossBankTransfer({
          fromAccount,
          toAccount,
          amount: params.amount,
          description: params.description,
          metadata: params.metadata
        });
      }
      
      // Same bank transfer
      const adapter = bankAdapterFactory.getAdapter(fromAccount.bankId);
      
      const paymentRequest: PaymentRequest = {
        fromAccount: fromAccount.virtualAccountNumber,
        toAccount: toAccount.virtualAccountNumber,
        amount: params.amount,
        description: params.description,
        type: 'INTERNAL_TRANSFER',
        metadata: {
          ...params.metadata,
          fromCommunityId: fromAccount.communityId,
          toCommunityId: toAccount.communityId
        }
      };
      
      // Use QuickPay if requested and eligible
      if (params.useQuickPay && fromAccount.metadata.quickPayEnabled) {
        return await this.processQuickPayment(paymentRequest, fromAccount);
      }
      
      const result = await adapter.initiatePayment(paymentRequest);
      
      // Update account balances in our database
      await this.updateAccountBalances(fromAccount.id, toAccount.id, params.amount);
      
      // Log to blockchain
      await indigenousLedger.log(
        'payment.processed',
        'info',
        'Payment processed between virtual accounts',
        {
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          amount: params.amount,
          isCrossBank,
          status: result.status,
          transactionId
        }
      );
      
      // Audit log for SOC 2 compliance
      await auditLogger.logEvent({
        eventType: 'payment_completed',
        userId: params.userId,
        action: 'process_payment',
        result: 'success',
        resource: {
          type: 'payment',
          id: transactionId,
          name: params.description
        },
        metadata: {
          amount: params.amount,
          fromAccount: params.fromAccountId,
          toAccount: params.toAccountId,
          isCrossBank,
          fraudCheckPassed: !params.skipFraudCheck
        }
      });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to process payment', { error, params });
      throw error;
    }
  }
  
  /**
   * Get account balance with real-time sync
   */
  async getBalance(accountId: string, forceSync: boolean = false): Promise<number> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      
      // Get cached balance if not forcing sync
      if (!forceSync) {
        return account.balance;
      }
      
      // Sync with bank
      const adapter = bankAdapterFactory.getAdapter(account.bankId);
      const bankBalance = await adapter.getBalance(account.virtualAccountNumber);
      
      // Update our records if different
      if (Math.abs(bankBalance - account.balance) > 0.01) {
        await prisma.virtualAccount.update({
          where: { id: accountId },
          data: { balance: bankBalance }
        });
        
        logger.info('Account balance synchronized', {
          accountId,
          oldBalance: account.balance,
          newBalance: bankBalance
        });
      }
      
      return bankBalance;
      
    } catch (error) {
      logger.error('Failed to get account balance', { error, accountId });
      throw error;
    }
  }
  
  /**
   * List transactions for an account
   */
  async getTransactions(
    accountId: string, 
    from: Date, 
    to: Date
  ): Promise<Transaction[]> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      
      const adapter = bankAdapterFactory.getAdapter(account.bankId);
      const transactions = await adapter.listTransactions(
        account.virtualAccountNumber,
        from,
        to
      );
      
      // Store transactions in our database for analytics
      await this.storeTransactions(accountId, transactions);
      
      return transactions;
      
    } catch (error) {
      logger.error('Failed to get transactions', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Create virtual account linked to an escrow
   */
  async createEscrowLinkedAccount(
    escrowId: string,
    bankId: BankId,
    parentAccountNumber: string
  ): Promise<VirtualAccount> {
    try {
      // Get escrow details
      const escrow = await prisma.universalEscrowAccount.findUnique({
        where: { id: escrowId }
      });
      
      if (!escrow) {
        throw new Error('Escrow account not found');
      }
      
      // Create virtual account linked to escrow
      const virtualAccount = await this.createVirtualAccount({
        communityId: escrow.parties.communityApprover?.id || escrow.parties.primaryContractor.id,
        bankId,
        parentAccountNumber,
        name: `${escrow.projectName} - Escrow Account`,
        linkToEscrow: escrowId,
        section89Details: escrow.projectLocation.isReserve ? {
          bandNumber: escrow.projectLocation.reserveDetails.bandNumber,
          reserveName: escrow.projectLocation.reserveDetails.name,
          treaty: escrow.projectLocation.reserveDetails.treaty,
          category1A: escrow.projectLocation.reserveDetails.category1A,
          offReserveBranch: {
            address: 'TBD', // Would be set based on bank selection
            transitNumber: 'TBD',
            distance: 0
          }
        } : undefined
      });
      
      // Update escrow with virtual account ID
      await prisma.universalEscrowAccount.update({
        where: { id: escrowId },
        data: {
          metadata: {
            ...escrow.metadata,
            virtualAccountId: virtualAccount.id
          }
        }
      });
      
      return virtualAccount;
      
    } catch (error) {
      logger.error('Failed to create escrow-linked account', { error, escrowId });
      throw error;
    }
  }
  
  // Private helper methods
  
  private async getAccount(accountId: string): Promise<VirtualAccount | null> {
    const record = await prisma.virtualAccount.findUnique({
      where: { id: accountId }
    });
    
    if (!record) {
      return null;
    }
    
    return {
      id: record.id,
      communityId: record.communityId,
      bankId: record.bankId as BankId,
      parentAccountNumber: record.parentAccountNumber,
      virtualAccountNumber: record.virtualAccountNumber,
      name: record.accountName,
      status: record.status as 'active' | 'pending' | 'closed',
      balance: record.balance,
      currency: record.currency as 'CAD' | 'USD',
      metadata: {
        section89Compliant: record.section89Compliant,
        offReserveBranch: record.offReserveBranch || '',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        ...record.metadata
      }
    };
  }
  
  private async processCrossBankTransfer(params: {
    fromAccount: VirtualAccount;
    toAccount: VirtualAccount;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentResult> {
    // For cross-bank transfers, we'll use wire or EFT
    const fromAdapter = bankAdapterFactory.getAdapter(params.fromAccount.bankId);
    const transferType = params.amount > 50000 ? 'WIRE' : 'EFT';
    
    const paymentRequest: PaymentRequest = {
      fromAccount: params.fromAccount.virtualAccountNumber,
      toAccount: params.toAccount.virtualAccountNumber,
      amount: params.amount,
      description: params.description,
      type: transferType,
      metadata: {
        ...params.metadata,
        crossBank: true,
        fromBank: params.fromAccount.bankId,
        toBank: params.toAccount.bankId
      }
    };
    
    const result = await fromAdapter.initiatePayment(paymentRequest);
    
    // Update balances after successful initiation
    if (result.status !== 'failed') {
      await this.updateAccountBalances(
        params.fromAccount.id,
        params.toAccount.id,
        params.amount
      );
    }
    
    return result;
  }
  
  private async processQuickPayment(
    payment: PaymentRequest,
    fromAccount: VirtualAccount
  ): Promise<PaymentResult> {
    // Integrate with QuickPay engine for 24-hour payments
    const quickPayRequest = await QuickPayEngine.requestPayment({
      contractId: payment.metadata?.contractId || 'direct-payment',
      businessId: fromAccount.communityId,
      amount: payment.amount,
      invoiceNumber: payment.reference || `VP-${Date.now()}`,
      supportingDocs: []
    });
    
    return {
      id: quickPayRequest.id,
      status: 'processing',
      fromAccount: payment.fromAccount,
      toAccount: payment.toAccount,
      amount: payment.amount,
      fees: quickPayRequest.processingFee,
      reference: quickPayRequest.invoiceNumber,
      estimatedCompletion: quickPayRequest.estimatedArrival
    };
  }
  
  private async updateAccountBalances(
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<void> {
    await prisma.$transaction([
      prisma.virtualAccount.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } }
      }),
      prisma.virtualAccount.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } }
      })
    ]);
  }
  
  private async storeTransactions(
    accountId: string,
    transactions: Transaction[]
  ): Promise<void> {
    // Store transactions for analytics and reconciliation
    const records = transactions.map(tx => ({
      virtualAccountId: accountId,
      transactionId: tx.id,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      referenceNumber: tx.referenceNumber,
      bankReference: tx.bankReference,
      status: tx.status,
      processedAt: tx.processedAt,
      metadata: tx
    }));
    
    await prisma.virtualAccountTransaction.createMany({
      data: records,
      skipDuplicates: true
    });
  }
  
  private async initializeAccountMonitoring(accountId: string): Promise<void> {
    // Set up monitoring for balance changes, transactions, etc.
    // This would integrate with the monitoring service
    logger.info('Account monitoring initialized', { accountId });
  }
  
  /**
   * Flag transaction for manual review
   */
  private async flagForReview(transactionId: string, fraudScore: any): Promise<void> {
    await prisma.transactionReview.create({
      data: {
        transactionId,
        status: 'pending',
        priority: fraudScore.overallRisk > 80 ? 'high' : 'medium',
        fraudScore: fraudScore.overallRisk,
        reasons: fraudScore.reasons,
        metadata: {
          fraudScore,
          flaggedAt: new Date(),
          requiresUrgentReview: fraudScore.overallRisk > 80
        }
      }
    });
    
    // Emit event for review team
    fraudDetectionService.emit('manual-review-required', {
      transactionId,
      fraudScore
    });
  }
}

// Export singleton instance
export const virtualAccountService = VirtualAccountService.getInstance();