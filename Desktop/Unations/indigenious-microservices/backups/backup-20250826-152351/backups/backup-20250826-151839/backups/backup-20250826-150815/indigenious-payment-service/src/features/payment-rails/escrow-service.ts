/**
 * Escrow Service - Alternative Bonding Solution
 * Enables Indigenous businesses to compete for contracts without traditional bonding
 * This removes a major barrier and creates dependency on our platform
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

export const EscrowAccountSchema = z.object({
  businessId: z.string(),
  contractId: z.string(),
  amount: z.number().positive(),
  type: z.enum(['performance_bond', 'bid_security', 'retention', 'warranty']),
  releaseConditions: z.object({
    automatic: z.boolean(),
    milestones: z.array(z.object({
      description: z.string(),
      percentage: z.number().min(0).max(100),
      dueDate: z.date().optional(),
    })).optional(),
    finalApproval: z.boolean(),
  }),
  duration: z.number(), // days
});

export interface EscrowAccount {
  id: string;
  businessId: string;
  contractId: string;
  amount: number;
  heldAmount: number;
  releasedAmount: number;
  type: 'performance_bond' | 'bid_security' | 'retention' | 'warranty';
  status: 'pending' | 'active' | 'releasing' | 'completed' | 'disputed';
  createdAt: Date;
  activatedAt?: Date;
  completedAt?: Date;
  releaseSchedule: ReleaseSchedule[];
  transactions: EscrowTransaction[];
}

export interface ReleaseSchedule {
  id: string;
  milestone: string;
  percentage: number;
  amount: number;
  dueDate?: Date;
  status: 'pending' | 'approved' | 'released' | 'disputed';
  approvedBy?: string;
  approvedAt?: Date;
  releasedAt?: Date;
}

export interface EscrowTransaction {
  id: string;
  type: 'deposit' | 'release' | 'refund' | 'fee';
  amount: number;
  balance: number;
  description: string;
  createdAt: Date;
  reference?: string;
}

export class EscrowService {
  private static readonly ESCROW_FEE_RATE = 0.015; // 1.5%
  private static readonly MIN_ESCROW_AMOUNT = 1000; // $1,000
  private static readonly MAX_ESCROW_AMOUNT = 1000000; // $1M
  
  /**
   * Create escrow account as alternative to traditional bonding
   */
  static async createEscrowAccount(data: z.infer<typeof EscrowAccountSchema>): Promise<EscrowAccount> {
    const validated = EscrowAccountSchema.parse(data);
    
    // Verify business eligibility
    const business = await prisma.business.findUnique({
      where: { id: validated.businessId },
      include: {
        escrowHistory: {
          where: {
            status: 'disputed',
          },
        },
      },
    });
    
    if (!business) {
      throw new Error('Business not found');
    }
    
    if (!business.isVerified) {
      throw new Error('Business must be verified to use escrow services');
    }
    
    if (business.escrowHistory.length > 0) {
      throw new Error('Business has disputed escrow accounts');
    }
    
    // Calculate escrow fee
    const escrowFee = validated.amount * this.ESCROW_FEE_RATE;
    const totalRequired = validated.amount + escrowFee;
    
    // Create escrow account
    const escrowAccount = await prisma.escrowAccount.create({
      data: {
        businessId: validated.businessId,
        contractId: validated.contractId,
        amount: validated.amount,
        heldAmount: 0,
        releasedAmount: 0,
        type: validated.type,
        status: 'pending',
        fee: escrowFee,
        totalRequired,
        releaseConditions: validated.releaseConditions,
        expiryDate: new Date(Date.now() + validated.duration * 24 * 60 * 60 * 1000),
      },
    });
    
    // Create release schedule
    if (validated.releaseConditions.milestones) {
      await this.createReleaseSchedule(escrowAccount.id, validated.releaseConditions.milestones);
    }
    
    // Create initial transaction
    await this.recordTransaction(escrowAccount.id, {
      type: 'fee',
      amount: escrowFee,
      description: 'Escrow service fee',
    });
    
    return this.formatEscrowAccount(escrowAccount);
  }
  
  /**
   * Fund escrow account
   */
  static async fundEscrow(escrowId: string, amount: number, paymentReference: string): Promise<EscrowAccount> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
    });
    
    if (!escrow) {
      throw new Error('Escrow account not found');
    }
    
    if (escrow.status !== 'pending') {
      throw new Error('Escrow account is not in pending status');
    }
    
    if (amount < escrow.totalRequired) {
      throw new Error(`Insufficient funding. Required: $${escrow.totalRequired}`);
    }
    
    // Update escrow account
    const updated = await prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        heldAmount: escrow.amount,
        status: 'active',
        activatedAt: new Date(),
      },
    });
    
    // Record deposit transaction
    await this.recordTransaction(escrowId, {
      type: 'deposit',
      amount: escrow.amount,
      description: 'Escrow deposit',
      reference: paymentReference,
    });
    
    // Notify parties
    await this.notifyEscrowActivated(updated);
    
    return this.formatEscrowAccount(updated);
  }
  
  /**
   * Release escrow funds based on milestone
   */
  static async releaseMilestone(
    escrowId: string,
    milestoneId: string,
    approvedBy: string,
    evidence?: string[]
  ): Promise<EscrowAccount> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        releaseSchedule: true,
      },
    });
    
    if (!escrow) {
      throw new Error('Escrow account not found');
    }
    
    if (escrow.status !== 'active') {
      throw new Error('Escrow account is not active');
    }
    
    const milestone = escrow.releaseSchedule.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }
    
    if (milestone.status !== 'pending') {
      throw new Error('Milestone already processed');
    }
    
    // Verify approver authority
    const hasAuthority = await this.verifyApprovalAuthority(approvedBy, escrow.contractId);
    if (!hasAuthority) {
      throw new Error('Approver does not have authority for this contract');
    }
    
    // Calculate release amount
    const releaseAmount = (escrow.amount * milestone.percentage) / 100;
    
    // Update milestone
    await prisma.escrowMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        evidence: evidence || [],
      },
    });
    
    // Process release
    await this.processRelease(escrowId, releaseAmount, `Milestone: ${milestone.description}`);
    
    // Check if all milestones completed
    const pending = await prisma.escrowMilestone.count({
      where: {
        escrowAccountId: escrowId,
        status: 'pending',
      },
    });
    
    if (pending === 0) {
      await this.completeEscrow(escrowId);
    }
    
    return this.getEscrowAccount(escrowId);
  }
  
  /**
   * Process escrow release
   */
  private static async processRelease(
    escrowId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
    });
    
    if (!escrow) return;
    
    // Update escrow balances
    await prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        heldAmount: { decrement: amount },
        releasedAmount: { increment: amount },
        status: 'releasing',
      },
    });
    
    // Record release transaction
    await this.recordTransaction(escrowId, {
      type: 'release',
      amount,
      description,
    });
    
    // Process actual payment through QuickPay
    await this.disburseFunds(escrow.businessId, amount, description);
  }
  
  /**
   * Complete escrow account
   */
  private static async completeEscrow(escrowId: string): Promise<void> {
    await prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
    
    // Update business metrics
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
    });
    
    if (escrow) {
      await prisma.business.update({
        where: { id: escrow.businessId },
        data: {
          completedEscrows: { increment: 1 },
          escrowReputation: { increment: 10 }, // Reputation points
        },
      });
    }
  }
  
  /**
   * Handle escrow disputes
   */
  static async disputeEscrow(
    escrowId: string,
    disputedBy: string,
    reason: string,
    evidence?: string[]
  ): Promise<void> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
    });
    
    if (!escrow || escrow.status === 'completed') {
      throw new Error('Cannot dispute this escrow');
    }
    
    // Create dispute record
    await prisma.escrowDispute.create({
      data: {
        escrowAccountId: escrowId,
        disputedBy,
        reason,
        evidence: evidence || [],
        status: 'open',
      },
    });
    
    // Update escrow status
    await prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'disputed',
        disputedAt: new Date(),
      },
    });
    
    // Freeze remaining funds
    await this.freezeEscrowFunds(escrowId);
    
    // Notify all parties
    await this.notifyDispute(escrow, reason);
  }
  
  /**
   * Create release schedule
   */
  private static async createReleaseSchedule(escrowId: string, milestones: unknown[]): Promise<void> {
    const scheduleData = milestones.map(milestone => ({
      escrowAccountId: escrowId,
      description: milestone.description,
      percentage: milestone.percentage,
      dueDate: milestone.dueDate,
      status: 'pending',
    }));
    
    await prisma.escrowMilestone.createMany({
      data: scheduleData,
    });
  }
  
  /**
   * Record transaction
   */
  private static async recordTransaction(
    escrowId: string,
    data: {
      type: 'deposit' | 'release' | 'refund' | 'fee';
      amount: number;
      description: string;
      reference?: string;
    }
  ): Promise<void> {
    const currentBalance = await this.getEscrowBalance(escrowId);
    
    const newBalance = data.type === 'deposit' 
      ? currentBalance + data.amount
      : currentBalance - data.amount;
    
    await prisma.escrowTransaction.create({
      data: {
        escrowAccountId: escrowId,
        type: data.type,
        amount: data.amount,
        balance: newBalance,
        description: data.description,
        reference: data.reference,
      },
    });
  }
  
  /**
   * Get escrow balance
   */
  private static async getEscrowBalance(escrowId: string): Promise<number> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
    });
    
    return escrow?.heldAmount || 0;
  }
  
  /**
   * Verify approval authority
   */
  private static async verifyApprovalAuthority(userId: string, contractId: string): Promise<boolean> {
    // Check if user has authority to approve releases for this contract
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        rfq: {
          include: {
            issuingOrganization: {
              include: {
                authorizedUsers: true,
              },
            },
          },
        },
      },
    });
    
    if (!contract) return false;
    
    // Check if user is authorized by the issuing organization
    return contract.rfq.issuingOrganization.authorizedUsers.some(
      auth => auth.userId === userId && auth.canApprovePayments
    );
  }
  
  /**
   * Disburse funds through QuickPay
   */
  private static async disburseFunds(businessId: string, amount: number, description: string): Promise<void> {
    // This integrates with QuickPayEngine to process the actual payment
    // Funds are released within 24 hours as promised
    
    // For now, simulate the disbursement
    logger.info(`Disbursing $${amount} to business ${businessId}: ${description}`);
  }
  
  /**
   * Freeze escrow funds during dispute
   */
  private static async freezeEscrowFunds(escrowId: string): Promise<void> {
    await prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        frozen: true,
        frozenAt: new Date(),
      },
    });
  }
  
  /**
   * Notification methods
   */
  private static async notifyEscrowActivated(escrow: unknown): Promise<void> {
    // Send notifications to business and contract issuer
    logger.info(`Escrow ${escrow.id} activated`);
  }
  
  private static async notifyDispute(escrow: any, reason: string): Promise<void> {
    // Send notifications to all parties about the dispute
    logger.info(`Escrow ${escrow.id} disputed: ${reason}`);
  }
  
  /**
   * Get escrow account details
   */
  static async getEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    const escrow = await prisma.escrowAccount.findUnique({
      where: { id: escrowId },
      include: {
        releaseSchedule: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!escrow) {
      throw new Error('Escrow account not found');
    }
    
    return this.formatEscrowAccount(escrow);
  }
  
  /**
   * Get escrow alternatives to traditional bonding
   */
  static async getBondingAlternatives(contractValue: number): Promise<{
    traditional: {
      bondAmount: number;
      cost: number;
      timeToObtain: number;
      requirements: string[];
    };
    escrowOption: {
      escrowAmount: number;
      cost: number;
      timeToSetup: number;
      benefits: string[];
    };
  }> {
    // Traditional bonding typically requires 10% of contract value
    const traditionalBondAmount = contractValue * 0.1;
    const traditionalCost = traditionalBondAmount * 0.03; // 3% premium
    
    // Our escrow alternative
    const escrowAmount = contractValue * 0.05; // Only 5% needed
    const escrowCost = escrowAmount * this.ESCROW_FEE_RATE;
    
    return {
      traditional: {
        bondAmount: traditionalBondAmount,
        cost: traditionalCost,
        timeToObtain: 14, // days
        requirements: [
          'Strong credit history',
          'Financial statements',
          'Personal guarantees',
          'Collateral often required',
        ],
      },
      escrowOption: {
        escrowAmount,
        cost: escrowCost,
        timeToSetup: 0.5, // hours
        benefits: [
          'No credit check required',
          'Instant approval',
          'Lower amount needed (50% less)',
          'Funds released progressively',
          'Builds platform reputation',
        ],
      },
    };
  }
  
  /**
   * Format escrow account for API response
   */
  private static formatEscrowAccount(escrow: unknown): EscrowAccount {
    return {
      id: escrow.id,
      businessId: escrow.businessId,
      contractId: escrow.contractId,
      amount: escrow.amount,
      heldAmount: escrow.heldAmount,
      releasedAmount: escrow.releasedAmount,
      type: escrow.type,
      status: escrow.status,
      createdAt: escrow.createdAt,
      activatedAt: escrow.activatedAt,
      completedAt: escrow.completedAt,
      releaseSchedule: escrow.releaseSchedule || [],
      transactions: escrow.transactions || [],
    };
  }
}

export default EscrowService;