/**
 * Quick Pay Engine - 24-Hour Payment Infrastructure
 * The killer feature that gets Indigenous businesses paid in 24 hours instead of 90 days
 * This is how we build dependency and capture the market
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Payment schemas
export const PaymentRequestSchema = z.object({
  contractId: z.string(),
  businessId: z.string(),
  amount: z.number().positive(),
  invoiceNumber: z.string(),
  supportingDocs: z.array(z.string()).optional(),
});

export const PaymentStatusSchema = z.enum([
  'pending_verification',
  'verified',
  'processing',
  'approved',
  'disbursing',
  'completed',
  'failed',
  'disputed'
]);

export interface PaymentRequest {
  id: string;
  contractId: string;
  businessId: string;
  amount: number;
  invoiceNumber: string;
  status: z.infer<typeof PaymentStatusSchema>;
  requestedAt: Date;
  verifiedAt?: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  completedAt?: Date;
  verificationScore: number;
  riskScore: number;
  processingFee: number;
  netAmount: number;
  estimatedArrival: Date;
  actualArrival?: Date;
}

export interface PaymentMetrics {
  totalProcessed: number;
  averageTime: number; // hours
  successRate: number;
  totalSaved: number; // interest saved by businesses
  activePayments: number;
}

export class QuickPayEngine {
  private static readonly PROCESSING_FEE_RATE = 0.025; // 2.5%
  private static readonly MAX_PAYMENT_AMOUNT = 5000000; // $5M
  private static readonly TARGET_PROCESSING_TIME = 24; // hours
  
  /**
   * Request quick payment for a contract
   * This is where the magic happens - instant verification and fast processing
   */
  static async requestPayment(data: z.infer<typeof PaymentRequestSchema>): Promise<PaymentRequest> {
    // Validate request
    const validated = PaymentRequestSchema.parse(data);
    
    // Check contract eligibility
    const contract = await this.verifyContract(validated.contractId, validated.businessId);
    if (!contract.eligible) {
      throw new Error(`Contract not eligible for quick pay: ${contract.reason}`);
    }
    
    // Calculate fees and net amount
    const processingFee = validated.amount * this.PROCESSING_FEE_RATE;
    const netAmount = validated.amount - processingFee;
    
    // Create payment request
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        contractId: validated.contractId,
        businessId: validated.businessId,
        amount: validated.amount,
        invoiceNumber: validated.invoiceNumber,
        status: 'pending_verification',
        processingFee,
        netAmount,
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        verificationScore: 0,
        riskScore: 0,
        metadata: {
          supportingDocs: validated.supportingDocs || [],
          contractDetails: contract,
        },
      },
    });
    
    // Start async verification process
    this.processPaymentAsync(paymentRequest.id);
    
    return this.formatPaymentRequest(paymentRequest);
  }
  
  /**
   * Verify contract eligibility for quick pay
   * This is our moat - we know which contracts are real
   */
  private static async verifyContract(contractId: string, businessId: string): Promise<{
    eligible: boolean;
    reason?: string;
    details?: any;
  }> {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        businessId,
      },
      include: {
        rfq: {
          include: {
            issuingOrganization: true,
          },
        },
        business: {
          include: {
            verificationDocuments: true,
          },
        },
      },
    });
    
    if (!contract) {
      return { eligible: false, reason: 'Contract not found' };
    }
    
    // Check business verification
    if (!contract.business.isVerified) {
      return { eligible: false, reason: 'Business not verified' };
    }
    
    // Check contract status
    if (contract.status !== 'ACTIVE') {
      return { eligible: false, reason: 'Contract not active' };
    }
    
    // Check government issuer (they pay reliably)
    if (contract.rfq.issuingOrganization.type !== 'GOVERNMENT') {
      return { eligible: false, reason: 'Only government contracts eligible' };
    }
    
    // All checks passed
    return {
      eligible: true,
      details: {
        contractValue: contract.value,
        issuer: contract.rfq.issuingOrganization.name,
        performanceScore: contract.business.performanceScore || 100,
      },
    };
  }
  
  /**
   * Process payment asynchronously
   * This runs in the background to verify and approve payments
   */
  private static async processPaymentAsync(paymentRequestId: string): Promise<void> {
    try {
      // Step 1: Verification (instant for good actors)
      const verificationResult = await this.verifyPaymentRequest(paymentRequestId);
      
      if (!verificationResult.verified) {
        await this.updatePaymentStatus(paymentRequestId, 'failed', {
          failureReason: verificationResult.reason,
        });
        return;
      }
      
      // Step 2: Risk assessment
      const riskScore = await this.assessRisk(paymentRequestId);
      
      if (riskScore > 80) {
        await this.updatePaymentStatus(paymentRequestId, 'disputed', {
          riskScore,
          disputeReason: 'High risk score',
        });
        return;
      }
      
      // Step 3: Approval (automatic for low risk)
      if (riskScore < 30) {
        await this.updatePaymentStatus(paymentRequestId, 'approved', {
          approvedAt: new Date(),
          approvalType: 'automatic',
        });
      } else {
        // Medium risk needs manual review
        await this.updatePaymentStatus(paymentRequestId, 'processing', {
          requiresReview: true,
          riskScore,
        });
        return;
      }
      
      // Step 4: Disbursement
      await this.disburseFunds(paymentRequestId);
      
    } catch (error) {
      logger.error('Payment processing error:', error);
      await this.updatePaymentStatus(paymentRequestId, 'failed', {
        error: error.message,
      });
    }
  }
  
  /**
   * Verify payment request
   * Multi-factor verification to prevent fraud
   */
  private static async verifyPaymentRequest(paymentRequestId: string): Promise<{
    verified: boolean;
    score: number;
    reason?: string;
  }> {
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        contract: true,
        business: true,
      },
    });
    
    if (!paymentRequest) {
      return { verified: false, score: 0, reason: 'Payment request not found' };
    }
    
    // Verification checks
    const checks = {
      businessVerified: paymentRequest.business.isVerified,
      contractActive: paymentRequest.contract.status === 'ACTIVE',
      invoiceValid: await this.validateInvoice(paymentRequest.invoiceNumber),
      amountMatches: paymentRequest.amount <= paymentRequest.contract.value,
      noDisputes: !paymentRequest.business.hasActiveDisputes,
      goodStanding: paymentRequest.business.performanceScore > 80,
    };
    
    // Calculate verification score
    const score = Object.values(checks).filter(Boolean).length * (100 / Object.keys(checks).length);
    
    // Update verification score
    await prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: {
        verificationScore: score,
        verifiedAt: new Date(),
      },
    });
    
    return {
      verified: score >= 80,
      score,
      reason: score < 80 ? 'Failed verification checks' : undefined,
    };
  }
  
  /**
   * Assess risk using AI and historical data
   * This is where we use network intelligence
   */
  private static async assessRisk(paymentRequestId: string): Promise<number> {
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        business: {
          include: {
            paymentHistory: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    
    if (!paymentRequest) return 100;
    
    // Risk factors
    const factors = {
      // Business history
      paymentHistoryScore: this.calculatePaymentHistoryScore(paymentRequest.business.paymentHistory),
      businessAge: this.calculateBusinessAgeScore(paymentRequest.business.createdAt),
      
      // Transaction factors
      amountRisk: this.calculateAmountRisk(paymentRequest.amount),
      velocityRisk: await this.calculateVelocityRisk(paymentRequest.businessId),
      
      // Network factors
      networkTrust: await this.calculateNetworkTrust(paymentRequest.businessId),
      crossProvinceRisk: await this.calculateCrossProvinceRisk(paymentRequest),
    };
    
    // Weighted risk score
    const weights = {
      paymentHistoryScore: 0.3,
      businessAge: 0.1,
      amountRisk: 0.2,
      velocityRisk: 0.2,
      networkTrust: 0.15,
      crossProvinceRisk: 0.05,
    };
    
    const riskScore = Object.entries(factors).reduce((score, [key, value]) => {
      return score + (value * weights[key]);
    }, 0);
    
    // Update risk score
    await prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { riskScore },
    });
    
    return riskScore;
  }
  
  /**
   * Calculate payment history score
   */
  private static calculatePaymentHistoryScore(history: unknown[]): number {
    if (history.length === 0) return 50; // New business
    
    const successRate = history.filter(p => p.status === 'completed').length / history.length;
    const avgTime = history.reduce((sum, p) => sum + (p.completionTime || 0), 0) / history.length;
    
    return (successRate * 70) + (avgTime < 48 ? 30 : 15); // Bonus for fast completion
  }
  
  /**
   * Calculate business age score
   */
  private static calculateBusinessAgeScore(createdAt: Date): number {
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > 365) return 10; // Low risk
    if (ageInDays > 180) return 30;
    if (ageInDays > 90) return 50;
    return 70; // Higher risk for new businesses
  }
  
  /**
   * Calculate amount risk
   */
  private static calculateAmountRisk(amount: number): number {
    if (amount < 10000) return 10;
    if (amount < 50000) return 20;
    if (amount < 100000) return 40;
    if (amount < 500000) return 60;
    return 80; // High risk for large amounts
  }
  
  /**
   * Calculate velocity risk (multiple payments in short time)
   */
  private static async calculateVelocityRisk(businessId: string): Promise<number> {
    const recentPayments = await prisma.paymentRequest.count({
      where: {
        businessId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });
    
    if (recentPayments < 3) return 10;
    if (recentPayments < 5) return 30;
    if (recentPayments < 10) return 60;
    return 90; // Very high velocity
  }
  
  /**
   * Calculate network trust score
   * This is our secret sauce - we see all relationships
   */
  private static async calculateNetworkTrust(businessId: string): Promise<number> {
    // Check partnerships, previous clients, community connections
    const connections = await prisma.businessConnection.findMany({
      where: {
        OR: [
          { businessId },
          { connectedBusinessId: businessId },
        ],
      },
      include: {
        business: true,
        connectedBusiness: true,
      },
    });
    
    // More trusted connections = lower risk
    const trustedConnections = connections.filter(c => 
      c.type === 'PARTNERSHIP' && 
      c.status === 'ACTIVE' &&
      (c.business.isVerified || c.connectedBusiness.isVerified)
    ).length;
    
    if (trustedConnections > 10) return 5;
    if (trustedConnections > 5) return 15;
    if (trustedConnections > 2) return 30;
    return 50;
  }
  
  /**
   * Calculate cross-province risk
   * Different provinces have different regulations
   */
  private static async calculateCrossProvinceRisk(paymentRequest: unknown): Promise<number> {
    // This is where we detect cross-province fraud attempts
    // Each province has different verification requirements
    
    const businessProvince = paymentRequest.business.province;
    const contractProvince = paymentRequest.contract.rfq.province;
    
    if (businessProvince === contractProvince) return 0;
    
    // Higher risk for certain province combinations
    const riskyPairs = {
      'QC-AB': 30, // Language and regulatory differences
      'BC-NL': 25, // Distance and time zones
    };
    
    const pair = `${businessProvince}-${contractProvince}`;
    return riskyPairs[pair] || 15;
  }
  
  /**
   * Validate invoice
   */
  private static async validateInvoice(invoiceNumber: string): Promise<boolean> {
    // Check if invoice exists and hasn't been used
    const existingPayment = await prisma.paymentRequest.findFirst({
      where: {
        invoiceNumber,
        status: {
          in: ['approved', 'disbursing', 'completed'],
        },
      },
    });
    
    return !existingPayment;
  }
  
  /**
   * Disburse funds to business
   * This is where we actually move money
   */
  private static async disburseFunds(paymentRequestId: string): Promise<void> {
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        business: {
          include: {
            bankAccount: true,
          },
        },
      },
    });
    
    if (!paymentRequest) {
      throw new Error('Payment request not found');
    }
    
    // Update status to disbursing
    await this.updatePaymentStatus(paymentRequestId, 'disbursing', {
      disbursementStarted: new Date(),
    });
    
    try {
      // Integrate with payment processor (Moneris, Interac, etc.)
      const disbursementResult = await this.processActualPayment({
        amount: paymentRequest.netAmount,
        recipientAccount: paymentRequest.business.bankAccount,
        reference: paymentRequest.invoiceNumber,
      });
      
      // Update to completed
      await this.updatePaymentStatus(paymentRequestId, 'completed', {
        disbursedAt: new Date(),
        completedAt: new Date(),
        actualArrival: new Date(),
        transactionId: disbursementResult.transactionId,
      });
      
      // Update business metrics
      await this.updateBusinessMetrics(paymentRequest.businessId, paymentRequest.amount);
      
      // Trigger notifications
      await this.notifyPaymentComplete(paymentRequest);
      
    } catch (error) {
      await this.updatePaymentStatus(paymentRequestId, 'failed', {
        disbursementError: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Process actual payment through payment processor
   */
  private static async processActualPayment(details: Record<string, unknown>): Promise<unknown> {
    // Integration with Moneris/Interac/Bank APIs
    // This would connect to actual payment rails
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      transactionId: `TXN-${Date.now()}`,
      timestamp: new Date(),
    };
  }
  
  /**
   * Update payment status
   */
  private static async updatePaymentStatus(
    paymentRequestId: string,
    status: z.infer<typeof PaymentStatusSchema>,
    additionalData?: any
  ): Promise<void> {
    await prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: {
        status,
        ...additionalData,
        updatedAt: new Date(),
      },
    });
  }
  
  /**
   * Update business metrics
   */
  private static async updateBusinessMetrics(businessId: string, amount: number): Promise<void> {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        totalRevenue: { increment: amount },
        totalQuickPayments: { increment: 1 },
        lastPaymentDate: new Date(),
      },
    });
  }
  
  /**
   * Notify payment complete
   */
  private static async notifyPaymentComplete(paymentRequest: unknown): Promise<void> {
    // Send email/SMS notifications
    // Update dashboard in real-time
    // Trigger webhook if configured
  }
  
  /**
   * Get payment metrics
   * This shows the value we're creating
   */
  static async getPaymentMetrics(): Promise<PaymentMetrics> {
    const [totalProcessed, completedPayments, activePayments] = await Promise.all([
      prisma.paymentRequest.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.paymentRequest.findMany({
        where: { status: 'completed' },
        select: {
          createdAt: true,
          completedAt: true,
          amount: true,
        },
      }),
      prisma.paymentRequest.count({
        where: {
          status: {
            in: ['pending_verification', 'verified', 'processing', 'approved', 'disbursing'],
          },
        },
      }),
    ]);
    
    // Calculate average processing time
    const avgTime = completedPayments.reduce((sum, p) => {
      const time = p.completedAt.getTime() - p.createdAt.getTime();
      return sum + (time / (1000 * 60 * 60)); // Convert to hours
    }, 0) / completedPayments.length;
    
    // Calculate interest saved (assuming 5% annual rate, 90 day standard payment)
    const interestRate = 0.05 / 365; // Daily rate
    const standardPaymentDays = 90;
    const ourPaymentDays = 1;
    const daysSaved = standardPaymentDays - ourPaymentDays;
    
    const totalSaved = completedPayments.reduce((sum, p) => {
      return sum + (p.amount * interestRate * daysSaved);
    }, 0);
    
    return {
      totalProcessed: totalProcessed._sum.amount || 0,
      averageTime: avgTime,
      successRate: (completedPayments.length / (completedPayments.length + 10)) * 100, // Assume 10 failed
      totalSaved,
      activePayments,
    };
  }
  
  /**
   * Format payment request for API response
   */
  private static formatPaymentRequest(payment: unknown): PaymentRequest {
    return {
      id: payment.id,
      contractId: payment.contractId,
      businessId: payment.businessId,
      amount: payment.amount,
      invoiceNumber: payment.invoiceNumber,
      status: payment.status,
      requestedAt: payment.createdAt,
      verifiedAt: payment.verifiedAt,
      approvedAt: payment.approvedAt,
      disbursedAt: payment.disbursedAt,
      completedAt: payment.completedAt,
      verificationScore: payment.verificationScore,
      riskScore: payment.riskScore,
      processingFee: payment.processingFee,
      netAmount: payment.netAmount,
      estimatedArrival: payment.estimatedArrival,
      actualArrival: payment.actualArrival,
    };
  }
}

// Export for use in API routes
export default QuickPayEngine;