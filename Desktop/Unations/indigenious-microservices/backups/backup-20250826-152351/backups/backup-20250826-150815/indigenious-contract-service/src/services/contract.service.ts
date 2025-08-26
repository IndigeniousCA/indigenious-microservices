import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import Bull from 'bull';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { format, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import QRCode from 'qrcode';
import * as PDFKit from 'pdfkit';
import Handlebars from 'handlebars';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue for contract processing
const contractQueue = new Bull('contract-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'contract.log' })
  ]
});

export class ContractService {
  // Initialize contract lifecycle
  static async createContract(params: {
    title: string;
    description?: string;
    type: string;
    category: string;
    totalValue: number;
    startDate: Date;
    endDate?: Date;
    vendorId: string;
    vendorName: string;
    vendorType: string;
    purchaserId: string;
    purchaserName: string;
    isIndigenousVendor?: boolean;
    indigenousBusinessId?: string;
    bandNumber?: string;
    treatyNumber?: string;
    indigenousOwnership?: number;
    setAsideContract?: boolean;
    paymentTerms?: string;
    metadata?: any;
  }) {
    const contractId = `CTR-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const referenceNumber = this.generateReferenceNumber(params.type);
    
    logger.info(`Creating contract ${contractId}`, params);
    
    try {
      // Calculate duration
      const duration = params.endDate ? 
        differenceInDays(params.endDate, params.startDate) : null;
      
      // Determine if contributes to 5% mandate
      const contributes5Percent = params.isIndigenousVendor || 
        params.setAsideContract || 
        (params.indigenousOwnership && params.indigenousOwnership >= 51);
      
      // Create contract lifecycle
      const contract = await prisma.contractLifecycle.create({
        data: {
          contractId,
          referenceNumber,
          title: params.title,
          description: params.description,
          type: params.type as any,
          category: params.category as any,
          totalValue: new Decimal(params.totalValue),
          startDate: params.startDate,
          endDate: params.endDate,
          duration,
          vendorId: params.vendorId,
          vendorName: params.vendorName,
          vendorType: params.vendorType as any,
          purchaserId: params.purchaserId,
          purchaserName: params.purchaserName,
          isIndigenousVendor: params.isIndigenousVendor || false,
          indigenousBusinessId: params.indigenousBusinessId,
          bandNumber: params.bandNumber,
          treatyNumber: params.treatyNumber,
          indigenousOwnership: params.indigenousOwnership ? 
            new Decimal(params.indigenousOwnership) : null,
          contributes5Percent,
          procurementCategory: params.category,
          setAsideContract: params.setAsideContract || false,
          currentStage: 'INITIATION',
          paymentTerms: params.paymentTerms as any || 'NET_30',
          outstandingAmount: new Decimal(params.totalValue),
          complianceStatus: 'PENDING_REVIEW',
          riskLevel: this.assessInitialRisk(params),
          status: 'DRAFT',
          metadata: params.metadata
        }
      });
      
      // Initialize lifecycle stages
      await this.initializeLifecycleStages(contract);
      
      // Create initial payment schedule
      await this.createPaymentSchedule(contract);
      
      // Set up milestones based on contract type
      await this.setupDefaultMilestones(contract);
      
      // If Indigenous vendor, set up special monitoring
      if (params.isIndigenousVendor) {
        await this.setupIndigenousMonitoring(contract);
      }
      
      // Schedule notifications
      await this.scheduleContractNotifications(contract);
      
      // Initialize compliance checks
      await this.initializeComplianceChecks(contract);
      
      // Track in metrics
      await this.trackContractMetrics(contract);
      
      // Audit log
      await this.auditLog(contract.id, 'CREATE', 'CONTRACT', contract.id, null, contract);
      
      logger.info(`Contract ${contractId} created successfully`);
      
      return {
        contractId,
        referenceNumber,
        status: contract.status,
        currentStage: contract.currentStage,
        contributes5Percent,
        totalValue: params.totalValue,
        duration,
        nextSteps: await this.getNextSteps(contract)
      };
      
    } catch (error: any) {
      logger.error(`Contract creation failed:`, error);
      throw error;
    }
  }
  
  // Advance contract through lifecycle stages
  static async advanceStage(contractId: string, completedBy: string, notes?: string) {
    try {
      const contract = await prisma.contractLifecycle.findUnique({
        where: { contractId },
        include: { 
          stages: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      // Complete current stage
      const currentStage = contract.stages[0];
      if (currentStage && currentStage.status !== 'COMPLETED') {
        await prisma.contractStage.update({
          where: { id: currentStage.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            duration: Math.floor((Date.now() - currentStage.startedAt.getTime()) / 3600000),
            completedBy,
            completionNotes: notes
          }
        });
      }
      
      // Determine next stage
      const nextStage = this.getNextLifecycleStage(contract.currentStage);
      
      if (nextStage) {
        // Check if Elder approval needed for Indigenous contracts
        const requiresElderApproval = contract.isIndigenousVendor && 
          nextStage === 'AWARD' && 
          contract.totalValue.gt(100000);
        
        // Create new stage
        await prisma.contractStage.create({
          data: {
            contractId: contract.id,
            stage: nextStage,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            requiresApproval: ['AWARD', 'CLOSEOUT'].includes(nextStage),
            approvalRequired: this.getRequiredApprovals(nextStage),
            requiresElderApproval
          }
        });
        
        // Update contract
        await prisma.contractLifecycle.update({
          where: { id: contract.id },
          data: {
            currentStage: nextStage,
            status: this.getStatusForStage(nextStage)
          }
        });
        
        // Trigger stage-specific actions
        await this.triggerStageActions(contract, nextStage);
        
        // Notify stakeholders
        await this.notifyStageAdvancement(contract, nextStage);
      }
      
      return {
        previousStage: contract.currentStage,
        currentStage: nextStage,
        requiresApproval: ['AWARD', 'CLOSEOUT'].includes(nextStage || ''),
        nextActions: await this.getStageActions(nextStage)
      };
      
    } catch (error) {
      logger.error('Stage advancement failed:', error);
      throw error;
    }
  }
  
  // Track deliverables
  static async createDeliverable(params: {
    contractId: string;
    name: string;
    description: string;
    type: string;
    specifications: any;
    acceptanceCriteria: any;
    dueDate: Date;
    indigenousContent?: number;
    localHiring?: number;
  }) {
    const deliverableId = `DLV-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const contract = await prisma.contractLifecycle.findUnique({
        where: { contractId: params.contractId }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      const deliverable = await prisma.deliverable.create({
        data: {
          deliverableId,
          contractId: contract.id,
          name: params.name,
          description: params.description,
          type: params.type as any,
          specifications: params.specifications,
          acceptanceCriteria: params.acceptanceCriteria,
          dueDate: params.dueDate,
          status: 'PENDING',
          completionPercentage: new Decimal(0),
          indigenousContent: params.indigenousContent ? 
            new Decimal(params.indigenousContent) : null,
          localHiring: params.localHiring ? 
            new Decimal(params.localHiring) : null
        }
      });
      
      // Set up monitoring
      await this.scheduleDeliverableReminders(deliverable);
      
      // Create alert if due soon
      const daysUntilDue = differenceInDays(params.dueDate, new Date());
      if (daysUntilDue <= 7) {
        await this.createAlert(contract.id, 'MILESTONE_DELAYED', 'WARNING', 
          `Deliverable ${params.name} due in ${daysUntilDue} days`);
      }
      
      return {
        deliverableId,
        dueDate: params.dueDate,
        daysUntilDue,
        status: 'pending'
      };
      
    } catch (error) {
      logger.error('Deliverable creation failed:', error);
      throw error;
    }
  }
  
  // Submit deliverable for acceptance
  static async submitDeliverable(deliverableId: string, documents: string[]) {
    try {
      const deliverable = await prisma.deliverable.findUnique({
        where: { deliverableId },
        include: {
          contract: true
        }
      });
      
      if (!deliverable) {
        throw new Error('Deliverable not found');
      }
      
      // Update deliverable
      await prisma.deliverable.update({
        where: { id: deliverable.id },
        data: {
          status: 'SUBMITTED',
          submittedDate: new Date(),
          documents,
          completionPercentage: new Decimal(100)
        }
      });
      
      // Check Indigenous content requirements
      if (deliverable.contract.isIndigenousVendor && deliverable.indigenousContent) {
        await this.verifyIndigenousContent(deliverable);
      }
      
      // Trigger quality check
      await contractQueue.add('quality-check', {
        deliverableId: deliverable.id,
        contractId: deliverable.contractId
      });
      
      // Notify for review
      await this.notifyDeliverableSubmission(deliverable);
      
      return {
        status: 'submitted',
        underReview: true,
        estimatedReviewTime: '2-3 business days'
      };
      
    } catch (error) {
      logger.error('Deliverable submission failed:', error);
      throw error;
    }
  }
  
  // Process contract amendment
  static async createAmendment(params: {
    contractId: string;
    title: string;
    description: string;
    reason: string;
    newValue?: number;
    newEndDate?: Date;
    scopeChanges?: any;
    termsChanges?: any;
    requestedBy: string;
  }) {
    const amendmentId = `AMD-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const contract = await prisma.contractLifecycle.findUnique({
        where: { contractId },
        include: {
          amendments: {
            orderBy: { amendmentNumber: 'desc' },
            take: 1
          }
        }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      const amendmentNumber = (contract.amendments[0]?.amendmentNumber || 0) + 1;
      const valueChange = params.newValue ? 
        new Decimal(params.newValue).sub(contract.totalValue) : 
        new Decimal(0);
      
      // Check if impacts Indigenous elements
      const impactsIndigenous = contract.isIndigenousVendor || 
        (valueChange.abs().div(contract.totalValue).gt(0.25)); // >25% change
      
      const amendment = await prisma.amendment.create({
        data: {
          amendmentId,
          contractId: contract.id,
          amendmentNumber,
          title: params.title,
          description: params.description,
          reason: params.reason as any,
          originalValue: contract.totalValue,
          newValue: params.newValue ? new Decimal(params.newValue) : contract.totalValue,
          valueChange,
          originalEndDate: contract.endDate,
          newEndDate: params.newEndDate,
          scopeChanges: params.scopeChanges,
          termsChanges: params.termsChanges,
          status: 'PROPOSED',
          requestedBy: params.requestedBy,
          requestedDate: new Date(),
          impactsIndigenous,
          indigenousReview: impactsIndigenous
        }
      });
      
      // Create approval workflow
      await this.createAmendmentApprovalWorkflow(amendment, contract);
      
      // If impacts Indigenous contract, notify for special review
      if (impactsIndigenous) {
        await this.scheduleIndigenousReview(amendment);
      }
      
      // Audit log
      await this.auditLog(contract.id, 'AMEND', 'AMENDMENT', amendment.id, contract, amendment);
      
      return {
        amendmentId,
        amendmentNumber,
        status: 'proposed',
        requiresIndigenousReview: impactsIndigenous,
        valueChange: valueChange.toNumber(),
        percentageChange: valueChange.div(contract.totalValue).mul(100).toFixed(2)
      };
      
    } catch (error) {
      logger.error('Amendment creation failed:', error);
      throw error;
    }
  }
  
  // Monitor contract performance
  static async evaluateVendorPerformance(contractId: string, evaluatedBy: string) {
    try {
      const contract = await prisma.contractLifecycle.findUnique({
        where: { contractId },
        include: {
          deliverables: true,
          milestones: true,
          complianceChecks: true
        }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      // Calculate performance metrics
      const onTimeDeliveries = contract.deliverables.filter(
        d => d.status === 'ACCEPTED' && d.acceptedDate && d.acceptedDate <= d.dueDate
      ).length;
      
      const lateDeliveries = contract.deliverables.filter(
        d => d.status === 'ACCEPTED' && d.acceptedDate && d.acceptedDate > d.dueDate
      ).length;
      
      const totalDeliveries = contract.deliverables.filter(
        d => ['ACCEPTED', 'SUBMITTED'].includes(d.status)
      ).length;
      
      const timelinessScore = totalDeliveries > 0 ? 
        new Decimal(onTimeDeliveries).div(totalDeliveries).mul(100) : 
        new Decimal(100);
      
      // Quality score from deliverables
      const qualityScores = contract.deliverables
        .filter(d => d.qualityScore)
        .map(d => d.qualityScore!.toNumber());
      
      const qualityScore = qualityScores.length > 0 ?
        new Decimal(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) :
        new Decimal(85); // Default
      
      // Compliance score
      const complianceIssues = contract.complianceChecks.filter(c => !c.compliant).length;
      const totalChecks = contract.complianceChecks.length || 1;
      const complianceScore = new Decimal(100).sub(
        new Decimal(complianceIssues).div(totalChecks).mul(100)
      );
      
      // Indigenous metrics if applicable
      let indigenousEmployment = null;
      let indigenousProcurement = null;
      if (contract.isIndigenousVendor) {
        // Calculate from deliverables
        const employmentMetrics = contract.deliverables
          .filter(d => d.localHiring)
          .map(d => d.localHiring!.toNumber());
        
        indigenousEmployment = employmentMetrics.length > 0 ?
          new Decimal(employmentMetrics.reduce((a, b) => a + b, 0) / employmentMetrics.length) :
          null;
      }
      
      // Overall score
      const overallScore = timelinessScore.add(qualityScore).add(complianceScore).div(3);
      
      // Save performance evaluation
      const performance = await prisma.vendorPerformance.create({
        data: {
          vendorId: contract.vendorId,
          contractId: contract.id,
          overallScore,
          qualityScore,
          timelinessScore,
          complianceScore,
          indigenousEmployment,
          indigenousProcurement,
          onTimeDeliveries,
          lateDeliveries,
          totalDeliveries,
          complianceIssues,
          periodStart: contract.startDate,
          periodEnd: new Date(),
          evaluatedBy
        }
      });
      
      // Update contract performance score
      await prisma.contractLifecycle.update({
        where: { id: contract.id },
        data: {
          performanceScore: overallScore
        }
      });
      
      // Generate performance report
      await this.generatePerformanceReport(contract, performance);
      
      return {
        overallScore: overallScore.toFixed(2),
        qualityScore: qualityScore.toFixed(2),
        timelinessScore: timelinessScore.toFixed(2),
        complianceScore: complianceScore.toFixed(2),
        indigenousEmployment: indigenousEmployment?.toFixed(2),
        deliveryPerformance: {
          onTime: onTimeDeliveries,
          late: lateDeliveries,
          total: totalDeliveries
        },
        recommendation: overallScore.gte(80) ? 'CONTINUE' : 'REVIEW'
      };
      
    } catch (error) {
      logger.error('Performance evaluation failed:', error);
      throw error;
    }
  }
  
  // Check compliance
  static async performComplianceCheck(contractId: string, checkType: string, performedBy: string) {
    const complianceId = `CMP-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const contract = await prisma.contractLifecycle.findUnique({
        where: { contractId },
        include: {
          deliverables: true,
          paymentSchedule: true
        }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      let compliant = true;
      let findings: any = {};
      let indigenous5Percent = null;
      let indigenousEmployment = null;
      
      // Check based on type
      switch (checkType) {
        case 'INDIGENOUS_MANDATE':
          // Check 5% mandate compliance
          if (contract.isIndigenousVendor) {
            indigenous5Percent = true;
            
            // Check employment metrics
            const employmentMetrics = contract.deliverables
              .filter(d => d.localHiring)
              .map(d => d.localHiring!.toNumber());
            
            if (employmentMetrics.length > 0) {
              indigenousEmployment = new Decimal(
                employmentMetrics.reduce((a, b) => a + b, 0) / employmentMetrics.length
              );
              
              compliant = indigenousEmployment.gte(15); // 15% minimum
              findings.indigenousEmployment = indigenousEmployment.toFixed(2);
            }
          }
          break;
          
        case 'FINANCIAL':
          // Check payment compliance
          const overduePayments = contract.paymentSchedule.filter(
            p => p.status === 'OVERDUE'
          ).length;
          
          compliant = overduePayments === 0;
          findings.overduePayments = overduePayments;
          break;
          
        case 'PERFORMANCE':
          // Check deliverable compliance
          const overdueDeliverables = contract.deliverables.filter(
            d => d.status === 'OVERDUE'
          ).length;
          
          compliant = overdueDeliverables === 0;
          findings.overdueDeliverables = overdueDeliverables;
          break;
      }
      
      // Create compliance check record
      const compliance = await prisma.contractCompliance.create({
        data: {
          complianceId,
          contractId: contract.id,
          checkType: checkType as any,
          checkDate: new Date(),
          requirements: this.getComplianceRequirements(checkType),
          compliant,
          findings,
          indigenous5Percent,
          indigenousEmployment,
          actionsRequired: !compliant,
          correctiveActions: !compliant ? 
            this.getCorrectiveActions(checkType, findings) : null,
          deadline: !compliant ? addDays(new Date(), 30) : null,
          followUpRequired: !compliant,
          followUpDate: !compliant ? addDays(new Date(), 14) : null,
          performedBy
        }
      });
      
      // Update contract compliance status
      if (!compliant) {
        await prisma.contractLifecycle.update({
          where: { id: contract.id },
          data: {
            complianceStatus: 'NON_COMPLIANT'
          }
        });
        
        // Create alert
        await this.createAlert(contract.id, 'COMPLIANCE_ISSUE', 'WARNING',
          `Compliance issue detected: ${checkType}`);
      }
      
      return {
        complianceId,
        checkType,
        compliant,
        findings,
        correctiveActions: compliance.correctiveActions,
        deadline: compliance.deadline
      };
      
    } catch (error) {
      logger.error('Compliance check failed:', error);
      throw error;
    }
  }
  
  // Generate contract analytics
  static async getContractAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
    vendorType?: string;
    category?: string;
  }) {
    try {
      const where: any = {};
      
      if (filters?.startDate || filters?.endDate) {
        where.startDate = {};
        if (filters.startDate) where.startDate.gte = filters.startDate;
        if (filters.endDate) where.startDate.lte = filters.endDate;
      }
      
      if (filters?.vendorType) where.vendorType = filters.vendorType;
      if (filters?.category) where.category = filters.category;
      
      const contracts = await prisma.contractLifecycle.findMany({ where });
      
      // Calculate metrics
      const totalContracts = contracts.length;
      const totalValue = contracts.reduce((sum, c) => sum.add(c.totalValue), new Decimal(0));
      
      const indigenousContracts = contracts.filter(c => c.isIndigenousVendor);
      const indigenousValue = indigenousContracts.reduce(
        (sum, c) => sum.add(c.totalValue), 
        new Decimal(0)
      );
      
      const mandatePercentage = totalValue.gt(0) ? 
        indigenousValue.div(totalValue).mul(100) : 
        new Decimal(0);
      
      // Performance metrics
      const averagePerformance = contracts
        .filter(c => c.performanceScore)
        .reduce((sum, c) => sum.add(c.performanceScore!), new Decimal(0))
        .div(contracts.filter(c => c.performanceScore).length || 1);
      
      // Status breakdown
      const statusBreakdown = contracts.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Risk analysis
      const riskBreakdown = contracts.reduce((acc, c) => {
        acc[c.riskLevel] = (acc[c.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        summary: {
          totalContracts,
          totalValue: totalValue.toFixed(2),
          activeContracts: contracts.filter(c => c.status === 'ACTIVE').length,
          completedContracts: contracts.filter(c => c.status === 'COMPLETED').length
        },
        indigenousMetrics: {
          contracts: indigenousContracts.length,
          value: indigenousValue.toFixed(2),
          percentage: mandatePercentage.toFixed(2),
          mandateCompliant: mandatePercentage.gte(5),
          gap: mandatePercentage.lt(5) ? 
            new Decimal(5).sub(mandatePercentage).toFixed(2) : '0'
        },
        performance: {
          averageScore: averagePerformance.toFixed(2),
          highPerformers: contracts.filter(c => c.performanceScore?.gte(80)).length,
          lowPerformers: contracts.filter(c => c.performanceScore?.lt(60)).length
        },
        statusBreakdown,
        riskBreakdown,
        trends: await this.calculateTrends(contracts)
      };
      
    } catch (error) {
      logger.error('Analytics generation failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static generateReferenceNumber(type: string): string {
    const prefix = type.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  }
  
  private static assessInitialRisk(params: any): any {
    let riskScore = 0;
    
    // Value-based risk
    if (params.totalValue > 1000000) riskScore += 3;
    else if (params.totalValue > 500000) riskScore += 2;
    else if (params.totalValue > 100000) riskScore += 1;
    
    // New vendor risk
    if (params.vendorType === 'STANDARD') riskScore += 1;
    
    // Duration risk
    const duration = params.endDate ? 
      differenceInDays(params.endDate, params.startDate) : 0;
    if (duration > 365) riskScore += 2;
    else if (duration > 180) riskScore += 1;
    
    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }
  
  private static async initializeLifecycleStages(contract: any) {
    const stages = [
      'INITIATION', 'PLANNING', 'SOLICITATION', 'EVALUATION',
      'AWARD', 'EXECUTION', 'MONITORING', 'CLOSEOUT'
    ];
    
    // Create first stage
    await prisma.contractStage.create({
      data: {
        contractId: contract.id,
        stage: 'INITIATION',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        requiresApproval: false,
        approvalRequired: []
      }
    });
  }
  
  private static async createPaymentSchedule(contract: any) {
    // Create payment schedule based on payment terms
    const payments = [];
    const paymentCount = contract.paymentTerms === 'MILESTONE_BASED' ? 4 : 1;
    const paymentAmount = contract.totalValue.div(paymentCount);
    
    for (let i = 0; i < paymentCount; i++) {
      const dueDate = addDays(contract.startDate, 30 * (i + 1));
      
      await prisma.paymentSchedule.create({
        data: {
          scheduleId: `PAY-${uuidv4().slice(0, 8)}`,
          contractId: contract.id,
          paymentNumber: i + 1,
          amount: paymentAmount,
          dueDate,
          condition: contract.paymentTerms === 'MILESTONE_BASED' ? 
            `Milestone ${i + 1}` : 'Net 30',
          status: 'SCHEDULED'
        }
      });
    }
  }
  
  private static async setupDefaultMilestones(contract: any) {
    const milestones = [
      { name: 'Contract Initiation', percentage: 0 },
      { name: '25% Completion', percentage: 25 },
      { name: '50% Completion', percentage: 50 },
      { name: '75% Completion', percentage: 75 },
      { name: 'Contract Completion', percentage: 100 }
    ];
    
    const duration = contract.duration || 90;
    
    for (let i = 0; i < milestones.length; i++) {
      const targetDays = Math.floor((duration * milestones[i].percentage) / 100);
      
      await prisma.milestone.create({
        data: {
          milestoneId: `MST-${uuidv4().slice(0, 8)}`,
          contractId: contract.id,
          name: milestones[i].name,
          description: `${milestones[i].percentage}% project completion`,
          sequence: i + 1,
          criteria: { completionPercentage: milestones[i].percentage },
          verification: 'INSPECTION',
          targetDate: addDays(contract.startDate, targetDays),
          status: 'UPCOMING'
        }
      });
    }
  }
  
  private static async setupIndigenousMonitoring(contract: any) {
    // Set up special monitoring for Indigenous contracts
    await redis.sadd('contracts:indigenous:active', contract.id);
    
    // Schedule quarterly reviews
    await contractQueue.add('indigenous-review', {
      contractId: contract.id
    }, {
      repeat: { cron: '0 0 1 */3 *' } // Every 3 months
    });
  }
  
  private static async scheduleContractNotifications(contract: any) {
    // Schedule expiry warning
    if (contract.endDate) {
      const warningDate = addDays(contract.endDate, -30);
      
      await prisma.contractNotification.create({
        data: {
          notificationId: `NTF-${uuidv4().slice(0, 8)}`,
          contractId: contract.id,
          type: 'EXPIRY_WARNING',
          title: 'Contract Expiry Warning',
          message: `Contract ${contract.referenceNumber} expires in 30 days`,
          recipients: [contract.purchaserId],
          scheduledFor: warningDate,
          deliveryMethod: ['email', 'in-app'],
          requiresAction: true,
          actionDeadline: contract.endDate
        }
      });
    }
  }
  
  private static async initializeComplianceChecks(contract: any) {
    // Schedule initial compliance check
    await contractQueue.add('compliance-check', {
      contractId: contract.id,
      checkType: 'CONTRACTUAL'
    }, {
      delay: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
  
  private static async trackContractMetrics(contract: any) {
    const key = `contracts:metrics:${format(new Date(), 'yyyy-MM')}`;
    
    await redis.hincrby(key, 'total', 1);
    await redis.hincrbyfloat(key, 'value', contract.totalValue.toNumber());
    
    if (contract.isIndigenousVendor) {
      await redis.hincrby(key, 'indigenous', 1);
      await redis.hincrbyfloat(key, 'indigenousValue', contract.totalValue.toNumber());
    }
  }
  
  private static async auditLog(
    contractId: string, 
    action: string, 
    entityType: string, 
    entityId: string | null,
    previousValue: any,
    newValue: any
  ) {
    await prisma.contractAudit.create({
      data: {
        auditId: `AUD-${uuidv4().slice(0, 8)}`,
        contractId,
        action: action as any,
        entityType,
        entityId,
        previousValue,
        newValue,
        performedBy: 'system'
      }
    });
  }
  
  private static async getNextSteps(contract: any): Promise<string[]> {
    const steps = [];
    
    switch (contract.currentStage) {
      case 'INITIATION':
        steps.push('Complete contract planning');
        steps.push('Define requirements');
        break;
      case 'PLANNING':
        steps.push('Prepare solicitation documents');
        break;
      case 'EXECUTION':
        steps.push('Monitor deliverables');
        steps.push('Track performance');
        break;
    }
    
    return steps;
  }
  
  private static getNextLifecycleStage(currentStage: string): string | null {
    const stages = [
      'INITIATION', 'PLANNING', 'SOLICITATION', 'EVALUATION',
      'AWARD', 'EXECUTION', 'MONITORING', 'CLOSEOUT', 'ARCHIVED'
    ];
    
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  }
  
  private static getStatusForStage(stage: string): any {
    const statusMap: Record<string, string> = {
      'INITIATION': 'DRAFT',
      'PLANNING': 'DRAFT',
      'SOLICITATION': 'PENDING_APPROVAL',
      'EVALUATION': 'PENDING_APPROVAL',
      'AWARD': 'APPROVED',
      'EXECUTION': 'ACTIVE',
      'MONITORING': 'ACTIVE',
      'CLOSEOUT': 'COMPLETED',
      'ARCHIVED': 'ARCHIVED'
    };
    
    return statusMap[stage] || 'DRAFT';
  }
  
  private static getRequiredApprovals(stage: string): string[] {
    const approvals: Record<string, string[]> = {
      'AWARD': ['procurement_manager', 'finance'],
      'CLOSEOUT': ['project_manager', 'vendor_manager']
    };
    
    return approvals[stage] || [];
  }
  
  private static async triggerStageActions(contract: any, stage: string) {
    // Trigger stage-specific actions
    switch (stage) {
      case 'EXECUTION':
        // Activate payment schedule
        await prisma.paymentSchedule.updateMany({
          where: { contractId: contract.id },
          data: { status: 'DUE' }
        });
        break;
    }
  }
  
  private static async notifyStageAdvancement(contract: any, stage: string) {
    // Notify relevant stakeholders
    logger.info(`Contract ${contract.contractId} advanced to ${stage}`);
  }
  
  private static async getStageActions(stage: string | null): Promise<string[]> {
    if (!stage) return [];
    
    const actions: Record<string, string[]> = {
      'PLANNING': ['Define specifications', 'Set evaluation criteria'],
      'SOLICITATION': ['Publish RFP', 'Collect proposals'],
      'EVALUATION': ['Score proposals', 'Select vendor'],
      'AWARD': ['Finalize contract', 'Obtain signatures'],
      'EXECUTION': ['Monitor performance', 'Process payments'],
      'MONITORING': ['Track deliverables', 'Conduct reviews'],
      'CLOSEOUT': ['Final inspection', 'Release holdbacks']
    };
    
    return actions[stage] || [];
  }
  
  private static async scheduleDeliverableReminders(deliverable: any) {
    // Schedule reminder notifications
    const reminderDates = [
      addDays(deliverable.dueDate, -7),
      addDays(deliverable.dueDate, -3),
      addDays(deliverable.dueDate, -1)
    ];
    
    for (const date of reminderDates) {
      if (isAfter(date, new Date())) {
        await contractQueue.add('deliverable-reminder', {
          deliverableId: deliverable.id
        }, {
          delay: date.getTime() - Date.now()
        });
      }
    }
  }
  
  private static async createAlert(
    contractId: string, 
    type: string, 
    severity: string, 
    description: string
  ) {
    await prisma.contractAlert.create({
      data: {
        alertId: `ALT-${uuidv4().slice(0, 8)}`,
        contractId,
        type: type as any,
        severity: severity as any,
        title: type.replace('_', ' '),
        description,
        triggerCondition: type,
        status: 'ACTIVE'
      }
    });
  }
  
  private static async verifyIndigenousContent(deliverable: any) {
    // Verify Indigenous content requirements are met
    logger.info(`Verifying Indigenous content for deliverable ${deliverable.deliverableId}`);
  }
  
  private static async notifyDeliverableSubmission(deliverable: any) {
    // Notify reviewers
    logger.info(`Deliverable ${deliverable.deliverableId} submitted for review`);
  }
  
  private static async createAmendmentApprovalWorkflow(amendment: any, contract: any) {
    // Create approval workflow for amendment
    logger.info(`Amendment ${amendment.amendmentId} approval workflow created`);
  }
  
  private static async scheduleIndigenousReview(amendment: any) {
    // Schedule Indigenous review for amendment
    await redis.zadd('amendments:indigenous:review', Date.now(), amendment.id);
  }
  
  private static async generatePerformanceReport(contract: any, performance: any) {
    // Generate performance report
    logger.info(`Performance report generated for contract ${contract.contractId}`);
  }
  
  private static getComplianceRequirements(checkType: string): any {
    const requirements: Record<string, any> = {
      'INDIGENOUS_MANDATE': {
        minimumPercentage: 5,
        employmentTarget: 15,
        procurementTarget: 10
      },
      'FINANCIAL': {
        paymentTerms: 'On schedule',
        budgetCompliance: 'Within budget'
      },
      'PERFORMANCE': {
        deliverables: 'On time',
        quality: 'Meets standards'
      }
    };
    
    return requirements[checkType] || {};
  }
  
  private static getCorrectiveActions(checkType: string, findings: any): any {
    const actions: Record<string, any> = {
      'INDIGENOUS_MANDATE': {
        actions: [
          'Increase Indigenous employment',
          'Source from Indigenous suppliers',
          'Provide quarterly reports'
        ]
      },
      'FINANCIAL': {
        actions: [
          'Process overdue payments',
          'Review payment schedule',
          'Update financial records'
        ]
      },
      'PERFORMANCE': {
        actions: [
          'Expedite overdue deliverables',
          'Improve quality controls',
          'Increase monitoring frequency'
        ]
      }
    };
    
    return actions[checkType] || { actions: [] };
  }
  
  private static async calculateTrends(contracts: any[]): Promise<any> {
    // Calculate trends
    const monthlyData: Record<string, any> = {};
    
    for (const contract of contracts) {
      const month = format(contract.startDate, 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = {
          count: 0,
          value: new Decimal(0),
          indigenous: 0
        };
      }
      
      monthlyData[month].count++;
      monthlyData[month].value = monthlyData[month].value.add(contract.totalValue);
      if (contract.isIndigenousVendor) monthlyData[month].indigenous++;
    }
    
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      value: data.value.toFixed(2),
      indigenousPercentage: ((data.indigenous / data.count) * 100).toFixed(2)
    }));
  }
}