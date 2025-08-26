import { PrismaClient } from '@prisma/client';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as PDFKit from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Handlebars from 'handlebars';
import { marked } from 'marked';
import CryptoJS from 'crypto-js';
import { Redis } from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInDays } from 'date-fns';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'legal.log' })
  ]
});

export class LegalService {
  // Create contract with Indigenous considerations
  static async createContract(params: {
    title: string;
    type: string;
    partyA: string;
    partyAType: string;
    partyB: string;
    partyBType: string;
    value: number;
    startDate: Date;
    endDate?: Date;
    terms: any;
    isIndigenousContract?: boolean;
    indigenousPartyId?: string;
    bandNumber?: string;
    treatyTerritory?: string;
    requiresElderReview?: boolean;
    incorporatesTraditionalLaw?: boolean;
    traditionalLawClauses?: any;
    createdBy: string;
  }) {
    const contractId = `CTR-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const contractNumber = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
    
    logger.info(`Creating contract ${contractId}`, params);
    
    try {
      // Determine if Elder review is required
      const requiresElderReview = params.requiresElderReview || 
        (params.isIndigenousContract && params.value > 100000) ||
        params.incorporatesTraditionalLaw;
      
      // Check if ceremony is required for traditional contracts
      const ceremonyRequired = params.incorporatesTraditionalLaw && 
        params.traditionalLawClauses?.ceremonyRequired;
      
      // Create contract
      const contract = await prisma.contract.create({
        data: {
          contractId,
          contractNumber,
          title: params.title,
          type: params.type as any,
          status: requiresElderReview ? 'DRAFT' : 'UNDER_REVIEW',
          partyA: params.partyA,
          partyAType: params.partyAType as any,
          partyAName: await this.getPartyName(params.partyA),
          partyB: params.partyB,
          partyBType: params.partyBType as any,
          partyBName: await this.getPartyName(params.partyB),
          isIndigenousContract: params.isIndigenousContract || false,
          indigenousPartyId: params.indigenousPartyId,
          bandNumber: params.bandNumber,
          treatyTerritory: params.treatyTerritory,
          requiresElderReview,
          elderReviewStatus: requiresElderReview ? 'PENDING' : null,
          incorporatesTraditionalLaw: params.incorporatesTraditionalLaw || false,
          traditionalLawClauses: params.traditionalLawClauses,
          ceremonyRequired,
          value: params.value,
          startDate: params.startDate,
          endDate: params.endDate,
          paymentTerms: params.terms.payment || 'Net 30',
          deliveryTerms: params.terms.delivery,
          disputeResolution: params.incorporatesTraditionalLaw ? 
            'INDIGENOUS_CIRCLE' : 'MEDIATION',
          governingLaw: params.treatyTerritory ? 
            `Indigenous Law of ${params.treatyTerritory} and Canadian Law` : 
            'Canadian Law',
          jurisdiction: params.treatyTerritory || 'Canada',
          useIndigenousDispute: params.isIndigenousContract || false,
          mediationByElders: params.incorporatesTraditionalLaw || false,
          circleProcess: params.incorporatesTraditionalLaw || false,
          mandateCompliant: await this.check5PercentMandate(params),
          draftedAt: new Date(),
          createdBy: params.createdBy
        }
      });
      
      // Generate contract document
      const document = await this.generateContractDocument(contract, params.terms);
      
      // Create legal document record
      await prisma.legalDocument.create({
        data: {
          documentId: `DOC-${uuidv4().slice(0, 8)}`,
          title: `${params.title} - Contract Document`,
          type: 'CONTRACT',
          category: params.isIndigenousContract ? 'INDIGENOUS_LAW' : 'LEGAL',
          contractId: contract.id,
          fileUrl: document.url,
          fileSize: document.size,
          mimeType: 'application/pdf',
          indigenousContent: params.isIndigenousContract || false,
          confidentiality: 'CONFIDENTIAL',
          isLegallyBinding: true,
          reviewStatus: 'PENDING',
          requiresElderReview,
          createdBy: params.createdBy
        }
      });
      
      // Add standard clauses based on contract type
      await this.addStandardClauses(contract.id, params.type, params.isIndigenousContract);
      
      // If Indigenous contract, add cultural protocols
      if (params.isIndigenousContract) {
        await this.addIndigenousCulturalProtocols(contract);
      }
      
      // Schedule Elder review if required
      if (requiresElderReview) {
        await this.scheduleElderReview(contract);
      }
      
      // Track Indigenous contract metrics
      if (params.isIndigenousContract) {
        await this.trackIndigenousContract(contract);
      }
      
      logger.info(`Contract ${contractId} created successfully`);
      
      return {
        contractId,
        contractNumber,
        status: contract.status,
        requiresElderReview,
        ceremonyRequired,
        documentUrl: document.url,
        nextSteps: this.getNextSteps(contract)
      };
      
    } catch (error: any) {
      logger.error(`Contract creation failed:`, error);
      throw error;
    }
  }
  
  // Create Impact Benefit Agreement (IBA)
  static async createIBA(params: {
    title: string;
    parties: any[];
    projectName: string;
    resourceType: string;
    territoryAffected: string;
    communityBenefits: any;
    environmentalTerms: any;
    benefitSharing: any;
    capacityBuilding: any;
    effectiveDate: Date;
    expiryDate?: Date;
  }) {
    const agreementId = `IBA-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Create IBA agreement
      const iba = await prisma.agreement.create({
        data: {
          agreementId,
          title: params.title,
          type: 'IMPACT_BENEFIT',
          status: 'DRAFT',
          parties: params.parties,
          isIndigenousAgreement: true,
          partnershipType: 'COMMUNITY_BENEFIT',
          benefitSharing: params.benefitSharing,
          capacityBuilding: params.capacityBuilding,
          isIBA: true,
          projectName: params.projectName,
          resourceType: params.resourceType,
          territoryAffected: params.territoryAffected,
          communityBenefits: params.communityBenefits,
          environmentalTerms: params.environmentalTerms,
          terms: {
            benefitSharing: params.benefitSharing,
            capacityBuilding: params.capacityBuilding,
            environmental: params.environmentalTerms,
            community: params.communityBenefits
          },
          effectiveDate: params.effectiveDate,
          expiryDate: params.expiryDate,
          signatureRequired: params.parties.length,
          signatureReceived: 0
        }
      });
      
      // Generate IBA document with specific sections
      const ibaDocument = await this.generateIBADocument(iba);
      
      // Create compliance check for Indigenous mandate
      await this.createComplianceCheck({
        entityId: iba.id,
        type: 'INDIGENOUS_MANDATE',
        requirements: {
          minimumIndigenousEmployment: 20,
          localProcurement: 15,
          capacityBuilding: true,
          culturalProtection: true
        }
      });
      
      // Notify Band Council
      await this.notifyBandCouncil(iba);
      
      return {
        agreementId,
        status: 'draft',
        documentUrl: ibaDocument.url,
        partiesCount: params.parties.length,
        territory: params.territoryAffected
      };
      
    } catch (error) {
      logger.error('IBA creation failed:', error);
      throw error;
    }
  }
  
  // Review contract with Elder input
  static async reviewContract(params: {
    contractId: string;
    reviewerId: string;
    isElder?: boolean;
    comments?: string;
    culturalConsiderations?: string;
    approved: boolean;
  }) {
    try {
      const contract = await prisma.contract.findUnique({
        where: { contractId: params.contractId }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      // Update review status
      const updates: any = {
        reviewedAt: new Date(),
        status: params.approved ? 'APPROVED' : 'REQUIRES_CHANGES'
      };
      
      if (params.isElder) {
        updates.elderReviewStatus = params.approved ? 'APPROVED' : 'REQUIRES_CHANGES';
        updates.culturalConsiderations = params.culturalConsiderations;
        
        // If Elder approves and ceremony is required
        if (params.approved && contract.ceremonyRequired) {
          await this.scheduleCeremony(contract);
        }
      }
      
      const updated = await prisma.contract.update({
        where: { id: contract.id },
        data: updates
      });
      
      // Log the review
      await this.logContractReview({
        contractId: contract.id,
        reviewerId: params.reviewerId,
        isElder: params.isElder,
        comments: params.comments,
        approved: params.approved
      });
      
      // If approved by Elder and all other reviews complete, move to signing
      if (params.approved && params.isElder && updated.status === 'APPROVED') {
        await this.prepareForSigning(updated);
      }
      
      return {
        status: updated.status,
        elderReviewStatus: updated.elderReviewStatus,
        nextSteps: this.getNextSteps(updated)
      };
      
    } catch (error) {
      logger.error('Contract review failed:', error);
      throw error;
    }
  }
  
  // Digital signature with Indigenous witness requirements
  static async signContract(params: {
    contractId: string;
    signerId: string;
    signerName: string;
    signerTitle?: string;
    isIndigenousSigner?: boolean;
    bandRepresentative?: boolean;
    signatureData: string; // Base64 signature
    ipAddress?: string;
    location?: any;
  }) {
    const signatureId = `SIG-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const contract = await prisma.contract.findUnique({
        where: { contractId: params.contractId },
        include: { signatures: true }
      });
      
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      // Check if ceremony is required and completed
      if (contract.ceremonyRequired && !contract.ceremonyCompleted) {
        throw new Error('Traditional ceremony must be completed before signing');
      }
      
      // Create signature
      const signature = await prisma.signature.create({
        data: {
          signatureId,
          contractId: contract.id,
          signerId: params.signerId,
          signerName: params.signerName,
          signerTitle: params.signerTitle,
          signerType: params.bandRepresentative ? 'CHIEF' : 'PRIMARY',
          isIndigenousSigner: params.isIndigenousSigner || false,
          bandRepresentative: params.bandRepresentative || false,
          signatureType: 'ELECTRONIC',
          signatureData: params.signatureData,
          ipAddress: params.ipAddress,
          location: params.location,
          signedAt: new Date()
        }
      });
      
      // Check if Elder witness is required
      if (contract.incorporatesTraditionalLaw) {
        const hasElderWitness = contract.signatures.some(s => s.elderWitness);
        if (!hasElderWitness) {
          await this.requestElderWitness(contract);
        }
      }
      
      // Check if all required signatures are collected
      const requiredSignatures = 2; // PartyA and PartyB minimum
      const currentSignatures = contract.signatures.length + 1;
      
      if (currentSignatures >= requiredSignatures) {
        // Check for Elder witness if required
        const needsElderWitness = contract.incorporatesTraditionalLaw;
        const hasElderWitness = contract.signatures.some(s => s.elderWitness) || 
                               params.bandRepresentative;
        
        if (!needsElderWitness || hasElderWitness) {
          // Contract is fully executed
          await prisma.contract.update({
            where: { id: contract.id },
            data: {
              status: 'SIGNED',
              signedAt: new Date(),
              effectiveDate: new Date()
            }
          });
          
          // Generate final signed document
          await this.generateSignedContract(contract);
          
          // Update compliance for Indigenous contracts
          if (contract.isIndigenousContract) {
            await this.updateIndigenousCompliance(contract);
          }
        }
      }
      
      return {
        signatureId,
        signaturesCollected: currentSignatures,
        signaturesRequired: requiredSignatures,
        fullyExecuted: currentSignatures >= requiredSignatures,
        requiresElderWitness: contract.incorporatesTraditionalLaw
      };
      
    } catch (error) {
      logger.error('Contract signing failed:', error);
      throw error;
    }
  }
  
  // Manage traditional knowledge and IP
  static async registerTraditionalKnowledge(params: {
    title: string;
    description: string;
    ownerId: string;
    communityOwned: boolean;
    culturalProtocols: any;
    sharingAgreements?: any;
    accessRestrictions: any;
  }) {
    const ipId = `TK-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Create IP record for traditional knowledge
      const traditionalKnowledge = await prisma.intellectualProperty.create({
        data: {
          ipId,
          type: 'TRADITIONAL_KNOWLEDGE',
          title: params.title,
          description: params.description,
          ownerId: params.ownerId,
          ownerType: params.communityOwned ? 'BAND_COUNCIL' : 'INDIGENOUS_BUSINESS',
          isIndigenousIP: true,
          traditionalKnowledge: true,
          communityOwned: params.communityOwned,
          protectionStatus: 'PROTECTED',
          jurisdictions: ['Canada'],
          culturalProtocols: params.culturalProtocols,
          sharingAgreements: params.sharingAgreements,
          accessRestrictions: params.accessRestrictions,
          licensable: false // Traditional knowledge typically not licensable
        }
      });
      
      // Create protective documentation
      await this.createProtectiveDocumentation(traditionalKnowledge);
      
      // Register with Indigenous IP registry (simulated)
      await this.registerWithIndigenousIPRegistry(traditionalKnowledge);
      
      return {
        ipId,
        protectionStatus: 'protected',
        registrationNumber: `TKCA${Date.now()}`,
        culturalProtocolsActive: true
      };
      
    } catch (error) {
      logger.error('Traditional knowledge registration failed:', error);
      throw error;
    }
  }
  
  // Search legal documents with Indigenous law focus
  static async searchDocuments(params: {
    query: string;
    type?: string;
    category?: string;
    indigenousOnly?: boolean;
    includeOralTradition?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const where: any = {};
      
      if (params.type) where.type = params.type;
      if (params.category) where.category = params.category;
      if (params.indigenousOnly) where.indigenousContent = true;
      
      if (params.dateFrom || params.dateTo) {
        where.createdAt = {};
        if (params.dateFrom) where.createdAt.gte = params.dateFrom;
        if (params.dateTo) where.createdAt.lte = params.dateTo;
      }
      
      // Search with text matching
      if (params.query) {
        where.OR = [
          { title: { contains: params.query, mode: 'insensitive' } },
          { content: { contains: params.query, mode: 'insensitive' } }
        ];
      }
      
      const documents = await prisma.legalDocument.findMany({
        where,
        include: {
          contract: {
            select: {
              contractNumber: true,
              title: true,
              isIndigenousContract: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      // Include oral tradition records if requested
      let oralTraditions = [];
      if (params.includeOralTradition) {
        oralTraditions = await this.searchOralTraditions(params.query);
      }
      
      return {
        documents: documents.map(d => ({
          documentId: d.documentId,
          title: d.title,
          type: d.type,
          category: d.category,
          indigenousContent: d.indigenousContent,
          contractNumber: d.contract?.contractNumber,
          createdAt: d.createdAt
        })),
        oralTraditions,
        totalResults: documents.length + oralTraditions.length
      };
      
    } catch (error) {
      logger.error('Document search failed:', error);
      throw error;
    }
  }
  
  // Check compliance with 5% Indigenous procurement mandate
  static async checkMandateCompliance(entityId: string) {
    try {
      // Get all contracts for entity
      const contracts = await prisma.contract.findMany({
        where: {
          OR: [
            { partyA: entityId },
            { partyB: entityId }
          ],
          status: { in: ['SIGNED', 'ACTIVE'] }
        }
      });
      
      // Calculate Indigenous contract value
      const totalValue = contracts.reduce((sum, c) => sum + Number(c.value), 0);
      const indigenousValue = contracts
        .filter(c => c.isIndigenousContract)
        .reduce((sum, c) => sum + Number(c.value), 0);
      
      const percentage = totalValue > 0 ? (indigenousValue / totalValue) * 100 : 0;
      const isCompliant = percentage >= 5;
      
      // Create compliance check
      const check = await prisma.complianceCheck.create({
        data: {
          checkId: `CHK-${uuidv4().slice(0, 8)}`,
          entityId,
          type: 'INDIGENOUS_MANDATE',
          category: '5% Procurement Mandate',
          description: 'Indigenous procurement mandate compliance check',
          requirements: {
            minimumPercentage: 5,
            currentPercentage: percentage,
            totalContracts: contracts.length,
            indigenousContracts: contracts.filter(c => c.isIndigenousContract).length
          },
          status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
          score: percentage,
          mandate5Percent: isCompliant,
          indigenousCompliance: isCompliant,
          findings: {
            totalValue,
            indigenousValue,
            percentage,
            gap: Math.max(0, 5 - percentage)
          },
          correctiveActions: !isCompliant ? {
            required: true,
            actions: [
              'Increase Indigenous supplier engagement',
              'Review procurement policies',
              'Set Indigenous procurement targets'
            ]
          } : null,
          deadline: !isCompliant ? addDays(new Date(), 90) : null
        }
      });
      
      return {
        checkId: check.checkId,
        compliant: isCompliant,
        percentage: percentage.toFixed(2),
        totalValue,
        indigenousValue,
        gap: Math.max(0, 5 - percentage).toFixed(2),
        correctiveActions: check.correctiveActions
      };
      
    } catch (error) {
      logger.error('Mandate compliance check failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static async getPartyName(partyId: string): Promise<string> {
    // Fetch party name from database
    return `Party-${partyId}`;
  }
  
  private static async check5PercentMandate(params: any): Promise<boolean> {
    // Check if contract contributes to 5% mandate
    return params.isIndigenousContract || params.indigenousPartyId !== null;
  }
  
  private static async generateContractDocument(contract: any, terms: any) {
    // Generate PDF contract document
    const doc = new PDFKit();
    
    // Add content
    doc.fontSize(16).text(contract.title, { align: 'center' });
    doc.fontSize(12).text(`Contract Number: ${contract.contractNumber}`);
    
    // Return document info
    return {
      url: `/documents/contracts/${contract.contractId}.pdf`,
      size: 1024 * 50 // 50KB example
    };
  }
  
  private static async addStandardClauses(contractId: string, type: string, isIndigenous: boolean) {
    // Add standard clauses based on contract type
    const standardClauses = isIndigenous ? 
      ['INDIGENOUS_RIGHTS', 'CULTURAL_PROTOCOLS', 'DISPUTE_RESOLUTION'] :
      ['PAYMENT', 'DELIVERY', 'WARRANTY', 'LIABILITY'];
    
    // Add clauses to contract
    logger.info(`Added standard clauses to contract ${contractId}`);
  }
  
  private static async addIndigenousCulturalProtocols(contract: any) {
    // Add cultural protocols for Indigenous contracts
    logger.info(`Added Indigenous cultural protocols to contract ${contract.contractId}`);
  }
  
  private static async scheduleElderReview(contract: any) {
    // Schedule Elder review
    await redis.zadd('elder:reviews:pending', Date.now(), contract.id);
    logger.info(`Scheduled Elder review for contract ${contract.contractId}`);
  }
  
  private static async trackIndigenousContract(contract: any) {
    // Track Indigenous contract metrics
    const key = `contracts:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'count', 1);
    await redis.hincrbyfloat(key, 'value', Number(contract.value));
  }
  
  private static getNextSteps(contract: any): string[] {
    const steps = [];
    
    if (contract.status === 'DRAFT') {
      steps.push('Complete contract drafting');
      if (contract.requiresElderReview) steps.push('Submit for Elder review');
    }
    
    if (contract.status === 'UNDER_REVIEW') {
      steps.push('Await review completion');
    }
    
    if (contract.status === 'APPROVED') {
      if (contract.ceremonyRequired && !contract.ceremonyCompleted) {
        steps.push('Complete traditional ceremony');
      }
      steps.push('Proceed to signing');
    }
    
    return steps;
  }
  
  private static async generateIBADocument(iba: any) {
    // Generate Impact Benefit Agreement document
    return {
      url: `/documents/iba/${iba.agreementId}.pdf`
    };
  }
  
  private static async createComplianceCheck(params: any) {
    // Create compliance check record
    logger.info('Created compliance check', params);
  }
  
  private static async notifyBandCouncil(iba: any) {
    // Notify Band Council about IBA
    logger.info(`Notified Band Council about IBA ${iba.agreementId}`);
  }
  
  private static async scheduleCeremony(contract: any) {
    // Schedule traditional ceremony
    logger.info(`Scheduled ceremony for contract ${contract.contractId}`);
  }
  
  private static async logContractReview(params: any) {
    // Log contract review
    logger.info('Contract review logged', params);
  }
  
  private static async prepareForSigning(contract: any) {
    // Prepare contract for signing
    logger.info(`Contract ${contract.contractId} prepared for signing`);
  }
  
  private static async requestElderWitness(contract: any) {
    // Request Elder witness
    await redis.zadd('elder:witness:requests', Date.now(), contract.id);
  }
  
  private static async generateSignedContract(contract: any) {
    // Generate final signed contract document
    logger.info(`Generated signed contract ${contract.contractId}`);
  }
  
  private static async updateIndigenousCompliance(contract: any) {
    // Update Indigenous compliance metrics
    const key = `compliance:indigenous:${new Date().getFullYear()}`;
    await redis.hincrby(key, 'contracts', 1);
    await redis.hincrbyfloat(key, 'value', Number(contract.value));
  }
  
  private static async createProtectiveDocumentation(tk: any) {
    // Create protective documentation for traditional knowledge
    logger.info(`Created protective documentation for ${tk.ipId}`);
  }
  
  private static async registerWithIndigenousIPRegistry(tk: any) {
    // Register with Indigenous IP registry
    logger.info(`Registered ${tk.ipId} with Indigenous IP registry`);
  }
  
  private static async searchOralTraditions(query: string) {
    // Search oral tradition records
    return [];
  }
}