import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInDays, isAfter, startOfYear, endOfYear } from 'date-fns';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import sharp from 'sharp';
import axios from 'axios';
import _ from 'lodash';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'supplier.log' })
  ]
});

export class SupplierService {
  // Register new supplier with Indigenous business validation
  static async registerSupplier(params: {
    companyName: string;
    legalName: string;
    businessNumber?: string;
    email: string;
    phone: string;
    headOfficeAddress: any;
    businessType: string;
    industryCategory: string[];
    supplierCategory: string;
    isIndigenousSupplier?: boolean;
    indigenousClassification?: string;
    bandNumber?: string;
    treatyNumber?: string;
    traditionTerritory?: string;
    indigenousOwnership?: number;
    womenOwnership?: number;
    primaryContact: any;
    productCategories?: any[];
    serviceOfferings?: any[];
    capabilities?: any[];
    serviceRegions: string[];
    annualRevenue?: number;
    employeeCount?: number;
    createdBy: string;
  }) {
    const supplierId = `SUP-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const supplierNumber = `S${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    logger.info(`Registering supplier ${supplierId}`, { companyName: params.companyName });
    
    try {
      // Determine supplier tier based on revenue and capabilities
      const supplierTier = this.determineSupplierTier(params.annualRevenue, params.capabilities?.length || 0);
      
      // Calculate initial credit rating
      const creditRating = await this.calculateCreditRating({
        businessNumber: params.businessNumber,
        annualRevenue: params.annualRevenue,
        employeeCount: params.employeeCount,
        yearsInBusiness: params.primaryContact?.yearsInBusiness || 0
      });
      
      // Create supplier record
      const supplier = await prisma.supplier.create({
        data: {
          supplierId,
          supplierNumber,
          companyName: params.companyName,
          legalName: params.legalName,
          businessNumber: params.businessNumber,
          email: params.email,
          phone: params.phone,
          headOfficeAddress: params.headOfficeAddress,
          primaryContact: params.primaryContact,
          businessType: params.businessType as any,
          industryCategory: params.industryCategory,
          supplierCategory: params.supplierCategory as any,
          supplierTier,
          isIndigenousSupplier: params.isIndigenousSupplier || false,
          indigenousClassification: params.indigenousClassification as any,
          bandNumber: params.bandNumber,
          treatyNumber: params.treatyNumber,
          traditionTerritory: params.traditionTerritory,
          indigenousOwnership: params.indigenousOwnership,
          womenOwnership: params.womenOwnership,
          serviceRegions: params.serviceRegions,
          annualRevenue: params.annualRevenue,
          employeeCount: params.employeeCount,
          creditRating,
          status: 'PENDING',
          approvalStatus: 'PENDING',
          onboardingStatus: 'NOT_STARTED',
          traditionalProducts: params.isIndigenousSupplier && 
            params.productCategories?.some(p => p.traditionalMethods) || false,
          culturalProducts: params.isIndigenousSupplier &&
            params.productCategories?.some(p => p.culturalSignificance) || false,
          createdBy: params.createdBy
        }
      });
      
      // Add product categories if provided
      if (params.productCategories && params.productCategories.length > 0) {
        await this.addProductCategories(supplier.id, params.productCategories);
      }
      
      // Add service offerings if provided
      if (params.serviceOfferings && params.serviceOfferings.length > 0) {
        await this.addServiceOfferings(supplier.id, params.serviceOfferings);
      }
      
      // Add capabilities if provided
      if (params.capabilities && params.capabilities.length > 0) {
        await this.addSupplierCapabilities(supplier.id, params.capabilities);
      }
      
      // Create initial compliance checks
      await this.createInitialComplianceChecks(supplier);
      
      // If Indigenous supplier, create network invitation
      if (params.isIndigenousSupplier) {
        await this.inviteToIndigenousNetwork(supplier);
        await this.trackIndigenousSupplierRegistration(supplier);
      }
      
      // Start onboarding process
      await this.initiateOnboardingProcess(supplier);
      
      // Send welcome email
      await this.sendSupplierWelcomeEmail(supplier);
      
      logger.info(`Supplier ${supplierId} registered successfully`);
      
      return {
        supplierId,
        supplierNumber,
        status: supplier.status,
        supplierTier,
        onboardingStatus: supplier.onboardingStatus,
        approvalStatus: supplier.approvalStatus,
        nextSteps: this.getRegistrationNextSteps(supplier)
      };
      
    } catch (error: any) {
      logger.error(`Supplier registration failed:`, error);
      throw error;
    }
  }
  
  // Create Indigenous supplier network
  static async createSupplierNetwork(params: {
    name: string;
    description: string;
    networkType: string;
    coordinatorId: string;
    coordinatorName: string;
    elderAdvisor?: string;
    region: string;
    territories: string[];
    communities: string[];
    objectives: any;
    focusAreas: string[];
    capacityBuilding?: any;
    mentorship?: any;
    createdBy: string;
  }) {
    const networkId = `NET-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const network = await prisma.indigenousSupplierNetwork.create({
        data: {
          networkId,
          name: params.name,
          description: params.description,
          networkType: params.networkType as any,
          coordinatorId: params.coordinatorId,
          coordinatorName: params.coordinatorName,
          elderAdvisor: params.elderAdvisor,
          region: params.region,
          territories: params.territories,
          communities: params.communities,
          objectives: params.objectives,
          focusAreas: params.focusAreas,
          capacityBuilding: params.capacityBuilding,
          mentorship: params.mentorship,
          members: [], // Start with empty member list
          memberCount: 0,
          status: 'ACTIVE',
          establishedDate: new Date(),
          createdBy: params.createdBy
        }
      });
      
      // Create network analytics baseline
      await this.createNetworkAnalytics(network);
      
      // Invite eligible Indigenous suppliers
      await this.inviteEligibleSuppliers(network);
      
      logger.info(`Indigenous supplier network ${networkId} created`);
      
      return {
        networkId,
        name: network.name,
        status: network.status,
        memberCount: 0,
        invitationsSent: await this.getInvitationCount(networkId)
      };
      
    } catch (error) {
      logger.error('Supplier network creation failed:', error);
      throw error;
    }
  }
  
  // Search suppliers with advanced Indigenous filtering
  static async searchSuppliers(params: {
    query?: string;
    supplierCategory?: string;
    supplierTier?: string;
    indigenousOnly?: boolean;
    indigenousClassification?: string;
    traditionalProducts?: boolean;
    culturalProducts?: boolean;
    serviceRegions?: string[];
    capabilities?: string[];
    industryCategory?: string[];
    creditRating?: string;
    annualRevenueMin?: number;
    annualRevenueMax?: number;
    employeeCountMin?: number;
    employeeCountMax?: number;
    certifications?: string[];
    sustainabilityRating?: number;
    qualityRating?: number;
    status?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || 20, 100);
      const offset = (page - 1) * limit;
      
      const where: any = {};
      
      // Text search
      if (params.query) {
        where.OR = [
          { companyName: { contains: params.query, mode: 'insensitive' } },
          { legalName: { contains: params.query, mode: 'insensitive' } },
          { supplierNumber: { contains: params.query, mode: 'insensitive' } }
        ];
      }
      
      // Category filters
      if (params.supplierCategory) where.supplierCategory = params.supplierCategory;
      if (params.supplierTier) where.supplierTier = params.supplierTier;
      if (params.status) where.status = params.status;
      
      // Indigenous filters
      if (params.indigenousOnly) where.isIndigenousSupplier = true;
      if (params.indigenousClassification) where.indigenousClassification = params.indigenousClassification;
      if (params.traditionalProducts) where.traditionalProducts = true;
      if (params.culturalProducts) where.culturalProducts = true;
      
      // Financial filters
      if (params.annualRevenueMin || params.annualRevenueMax) {
        where.annualRevenue = {};
        if (params.annualRevenueMin) where.annualRevenue.gte = params.annualRevenueMin;
        if (params.annualRevenueMax) where.annualRevenue.lte = params.annualRevenueMax;
      }
      
      if (params.employeeCountMin || params.employeeCountMax) {
        where.employeeCount = {};
        if (params.employeeCountMin) where.employeeCount.gte = params.employeeCountMin;
        if (params.employeeCountMax) where.employeeCount.lte = params.employeeCountMax;
      }
      
      // Rating filters
      if (params.qualityRating) {
        where.qualityRating = { gte: params.qualityRating };
      }
      
      if (params.sustainabilityRating) {
        where.sustainabilityRating = { gte: params.sustainabilityRating };
      }
      
      // Credit rating filter
      if (params.creditRating) {
        where.creditRating = { gte: params.creditRating };
      }
      
      // Service regions filter
      if (params.serviceRegions && params.serviceRegions.length > 0) {
        where.serviceRegions = {
          hasSome: params.serviceRegions
        };
      }
      
      // Industry category filter
      if (params.industryCategory && params.industryCategory.length > 0) {
        where.industryCategory = {
          hasSome: params.industryCategory
        };
      }
      
      // Capabilities filter
      if (params.capabilities && params.capabilities.length > 0) {
        where.capabilities = {
          some: {
            category: { in: params.capabilities }
          }
        };
      }
      
      // Certifications filter
      if (params.certifications && params.certifications.length > 0) {
        where.certifications = {
          some: {
            type: { in: params.certifications },
            isActive: true
          }
        };
      }
      
      // Sorting
      let orderBy: any = { createdAt: 'desc' };
      if (params.sortBy === 'name') orderBy = { companyName: 'asc' };
      if (params.sortBy === 'quality') orderBy = { qualityRating: 'desc' };
      if (params.sortBy === 'revenue') orderBy = { annualRevenue: 'desc' };
      if (params.sortBy === 'tier') orderBy = { supplierTier: 'asc' };
      
      const [suppliers, totalCount] = await Promise.all([
        prisma.supplier.findMany({
          where,
          include: {
            productCategories: {
              select: {
                name: true,
                isIndigenousProduct: true,
                traditionalMethods: true
              },
              take: 5
            },
            serviceOfferings: {
              select: {
                name: true,
                serviceType: true,
                isIndigenousService: true
              },
              take: 3
            },
            capabilities: {
              select: {
                category: true,
                indigenousCapability: true,
                traditionalMethods: true
              }
            },
            certifications: {
              where: { isActive: true },
              select: {
                type: true,
                name: true
              },
              take: 5
            },
            performanceMetrics: {
              orderBy: { periodEnd: 'desc' },
              take: 1
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.supplier.count({ where })
      ]);
      
      // Enrich with mandate contribution data for Indigenous suppliers
      const enrichedSuppliers = await Promise.all(
        suppliers.map(async (supplier) => {
          let mandateData = null;
          if (supplier.isIndigenousSupplier) {
            mandateData = await this.calculateMandateContribution(supplier.id);
          }
          
          return {
            supplierId: supplier.supplierId,
            supplierNumber: supplier.supplierNumber,
            companyName: supplier.companyName,
            supplierCategory: supplier.supplierCategory,
            supplierTier: supplier.supplierTier,
            isIndigenousSupplier: supplier.isIndigenousSupplier,
            indigenousClassification: supplier.indigenousClassification,
            traditionalProducts: supplier.traditionalProducts,
            culturalProducts: supplier.culturalProducts,
            status: supplier.status,
            creditRating: supplier.creditRating,
            qualityRating: supplier.qualityRating,
            sustainabilityRating: supplier.sustainabilityRating,
            serviceRegions: supplier.serviceRegions,
            employeeCount: supplier.employeeCount,
            annualRevenue: supplier.annualRevenue,
            productCategories: supplier.productCategories.map(p => ({
              name: p.name,
              indigenous: p.isIndigenousProduct,
              traditional: p.traditionalMethods
            })),
            serviceOfferings: supplier.serviceOfferings.map(s => ({
              name: s.name,
              type: s.serviceType,
              indigenous: s.isIndigenousService
            })),
            capabilities: supplier.capabilities.length,
            certifications: supplier.certifications.length,
            lastPerformance: supplier.performanceMetrics[0]?.overallScore,
            mandateContribution: mandateData?.currentYear || 0,
            createdAt: supplier.createdAt
          };
        })
      );
      
      return {
        suppliers: enrichedSuppliers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page < Math.ceil(totalCount / limit)
        },
        aggregates: {
          indigenousSuppliers: suppliers.filter(s => s.isIndigenousSupplier).length,
          traditionalProductSuppliers: suppliers.filter(s => s.traditionalProducts).length,
          culturalProductSuppliers: suppliers.filter(s => s.culturalProducts).length,
          strategicSuppliers: suppliers.filter(s => s.supplierTier === 'STRATEGIC').length,
          averageQualityRating: this.calculateAverageRating(suppliers, 'qualityRating'),
          averageSustainabilityRating: this.calculateAverageRating(suppliers, 'sustainabilityRating')
        }
      };
      
    } catch (error) {
      logger.error('Supplier search failed:', error);
      throw error;
    }
  }
  
  // Create purchase order with Indigenous procurement tracking
  static async createPurchaseOrder(params: {
    supplierId: string;
    contractId?: string;
    orderType: string;
    priority: string;
    description?: string;
    lineItems: any[];
    requestedDeliveryDate: Date;
    deliveryLocation: any;
    paymentTerms: string;
    isIndigenousProcurement?: boolean;
    orderedBy: string;
  }) {
    const poNumber = `PO-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { supplierId: params.supplierId }
      });
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      // Calculate order totals
      const subtotal = params.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = subtotal * 0.13; // Simplified tax calculation
      const totalAmount = subtotal + taxAmount;
      
      // Determine if this is Indigenous procurement
      const isIndigenousProcurement = params.isIndigenousProcurement || supplier.isIndigenousSupplier;
      const mandateContribution = isIndigenousProcurement ? totalAmount : 0;
      
      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: supplier.id,
          contractId: params.contractId,
          orderType: params.orderType as any,
          priority: params.priority as any,
          description: params.description,
          subtotal,
          taxAmount,
          totalAmount,
          requestedDeliveryDate: params.requestedDeliveryDate,
          deliveryLocation: params.deliveryLocation,
          paymentTerms: params.paymentTerms as any,
          isIndigenousProcurement,
          mandateContribution,
          status: 'DRAFT',
          approvalStatus: totalAmount > 50000 ? 'PENDING' : 'APPROVED', // Auto-approve smaller orders
          orderedBy: params.orderedBy
        }
      });
      
      // Create line items
      for (let i = 0; i < params.lineItems.length; i++) {
        const item = params.lineItems[i];
        await prisma.orderLineItem.create({
          data: {
            poId: purchaseOrder.id,
            lineNumber: i + 1,
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure || 'EA',
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            isIndigenousProduct: item.isIndigenousProduct || false,
            indigenousContent: item.indigenousContent,
            specifications: item.specifications,
            requestedDelivery: params.requestedDeliveryDate,
            status: 'PENDING'
          }
        });
      }
      
      // If Indigenous procurement, track mandate contribution
      if (isIndigenousProcurement) {
        await this.trackPurchaseOrderMandateContribution({
          supplierId: supplier.id,
          poId: purchaseOrder.id,
          amount: mandateContribution,
          category: this.categorizeOrder(params.lineItems)
        });
      }
      
      // Send order to supplier if auto-approved
      if (purchaseOrder.approvalStatus === 'APPROVED') {
        await this.sendOrderToSupplier(purchaseOrder, supplier);
      }
      
      logger.info(`Purchase order ${poNumber} created for supplier ${params.supplierId}`);
      
      return {
        poNumber,
        status: purchaseOrder.status,
        approvalStatus: purchaseOrder.approvalStatus,
        totalAmount,
        isIndigenousProcurement,
        mandateContribution,
        lineItemsCount: params.lineItems.length,
        estimatedDelivery: params.requestedDeliveryDate
      };
      
    } catch (error) {
      logger.error('Purchase order creation failed:', error);
      throw error;
    }
  }
  
  // Update supplier performance metrics
  static async updateSupplierPerformance(params: {
    supplierId: string;
    periodStart: Date;
    periodEnd: Date;
    overallScore: number;
    qualityScore: number;
    deliveryScore: number;
    serviceScore: number;
    innovationScore?: number;
    onTimeDeliveryRate: number;
    qualityAcceptanceRate: number;
    totalOrders: number;
    ordersFulfilled: number;
    totalSpend: number;
    indigenousEmployment?: number;
    localSourcing?: number;
    communityBenefit?: number;
    culturalSensitivity?: number;
    traditionalKnowledgeUse?: number;
    evaluatedBy: string;
    evaluationMethod: string;
  }) {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { supplierId: params.supplierId }
      });
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      // Create performance record
      const performance = await prisma.supplierPerformance.create({
        data: {
          performanceId: `PERF-${uuidv4().slice(0, 8)}`,
          supplierId: supplier.id,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          overallScore: params.overallScore,
          qualityScore: params.qualityScore,
          deliveryScore: params.deliveryScore,
          serviceScore: params.serviceScore,
          innovationScore: params.innovationScore,
          indigenousEmployment: params.indigenousEmployment,
          localSourcing: params.localSourcing,
          communityBenefit: params.communityBenefit,
          culturalSensitivity: params.culturalSensitivity,
          traditionalKnowledgeUse: params.traditionalKnowledgeUse,
          onTimeDeliveryRate: params.onTimeDeliveryRate,
          qualityAcceptanceRate: params.qualityAcceptanceRate,
          totalOrders: params.totalOrders,
          ordersFulfilled: params.ordersFulfilled,
          totalSpend: params.totalSpend,
          evaluatedBy: params.evaluatedBy,
          evaluationMethod: params.evaluationMethod as any
        }
      });
      
      // Update supplier's overall ratings
      const avgQuality = await this.calculateAveragePerformanceScore(supplier.id, 'qualityScore');
      const avgOverall = await this.calculateAveragePerformanceScore(supplier.id, 'overallScore');
      
      // Determine new supplier tier based on performance
      const newTier = this.determineSupplierTierFromPerformance(avgOverall, params.totalSpend);
      
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          qualityRating: avgQuality,
          supplierTier: newTier,
          riskLevel: this.calculateRiskLevel(avgOverall, params.onTimeDeliveryRate),
        }
      });
      
      // Generate performance insights
      const insights = await this.generatePerformanceInsights(supplier, performance);
      
      // If Indigenous supplier, update community benefit tracking
      if (supplier.isIndigenousSupplier) {
        await this.updateCommunityBenefitTracking(supplier, performance);
      }
      
      logger.info(`Performance updated for supplier ${params.supplierId}`);
      
      return {
        performanceId: performance.performanceId,
        overallScore: params.overallScore,
        newTier,
        qualityRating: avgQuality,
        insights,
        indigenousMetrics: supplier.isIndigenousSupplier ? {
          employment: params.indigenousEmployment,
          localSourcing: params.localSourcing,
          communityBenefit: params.communityBenefit,
          culturalSensitivity: params.culturalSensitivity,
          traditionalKnowledgeUse: params.traditionalKnowledgeUse
        } : null
      };
      
    } catch (error) {
      logger.error('Supplier performance update failed:', error);
      throw error;
    }
  }
  
  // Generate Indigenous supplier network report
  static async generateNetworkReport(params: {
    networkId?: string;
    region?: string;
    year?: number;
    quarter?: string;
    includePerformance?: boolean;
    includeMandateTracking?: boolean;
    format?: string;
  }) {
    try {
      const year = params.year || new Date().getFullYear();
      const startDate = startOfYear(new Date(year, 0, 1));
      const endDate = endOfYear(new Date(year, 11, 31));
      
      // Get networks
      const where: any = {};
      if (params.networkId) where.networkId = params.networkId;
      if (params.region) where.region = params.region;
      
      const networks = await prisma.indigenousSupplierNetwork.findMany({
        where,
        include: {
          _count: true
        }
      });
      
      // Get Indigenous suppliers in networks
      const supplierIds = networks.reduce((acc: string[], network) => {
        const memberIds = network.members.map((member: any) => member.supplierId);
        return [...acc, ...memberIds];
      }, []);
      
      const suppliers = await prisma.supplier.findMany({
        where: {
          id: { in: supplierIds }
        },
        include: {
          performanceMetrics: params.includePerformance ? {
            where: {
              periodStart: { gte: startDate },
              periodEnd: { lte: endDate }
            }
          } : false,
          purchaseOrders: params.includeMandateTracking ? {
            where: {
              orderDate: {
                gte: startDate,
                lte: endDate
              },
              isIndigenousProcurement: true
            }
          } : false
        }
      });
      
      // Calculate network statistics
      const totalSuppliers = suppliers.length;
      const totalNetworks = networks.length;
      const totalContracts = suppliers.reduce((sum, s) => sum + (s.purchaseOrders?.length || 0), 0);
      const totalSpend = suppliers.reduce((sum, s) => 
        sum + (s.purchaseOrders?.reduce((orderSum, po) => orderSum + Number(po.totalAmount), 0) || 0), 0
      );
      
      // Performance aggregation
      const performanceData = params.includePerformance ? {
        averageQuality: this.calculateNetworkAveragePerformance(suppliers, 'qualityScore'),
        averageDelivery: this.calculateNetworkAveragePerformance(suppliers, 'deliveryScore'),
        averageCommunityBenefit: this.calculateNetworkAveragePerformance(suppliers, 'communityBenefit'),
        averageCulturalSensitivity: this.calculateNetworkAveragePerformance(suppliers, 'culturalSensitivity')
      } : null;
      
      // Regional breakdown
      const regionalBreakdown = _.groupBy(suppliers, 'traditionTerritory');
      
      // Classification breakdown
      const classificationBreakdown = _.groupBy(suppliers, 'indigenousClassification');
      
      const report = {
        reportId: `NET-RPT-${uuidv4().slice(0, 8)}`,
        generatedAt: new Date(),
        period: { year, quarter: params.quarter },
        summary: {
          totalNetworks,
          totalSuppliers,
          totalContracts,
          totalSpend,
          averageSpendPerSupplier: totalSuppliers > 0 ? totalSpend / totalSuppliers : 0,
          mandateContribution: totalSpend, // All Indigenous supplier spend counts
          mandatePercentage: this.calculateNetworkMandatePercentage(totalSpend)
        },
        networks: networks.map(n => ({
          networkId: n.networkId,
          name: n.name,
          type: n.networkType,
          region: n.region,
          memberCount: n.memberCount,
          territories: n.territories,
          focusAreas: n.focusAreas
        })),
        regionalBreakdown: Object.keys(regionalBreakdown).map(region => ({
          region,
          count: regionalBreakdown[region].length,
          spend: regionalBreakdown[region].reduce((sum, s) => 
            sum + (s.purchaseOrders?.reduce((orderSum, po) => orderSum + Number(po.totalAmount), 0) || 0), 0
          )
        })),
        classificationBreakdown: Object.keys(classificationBreakdown).map(classification => ({
          classification,
          count: classificationBreakdown[classification].length
        })),
        performanceMetrics: performanceData,
        topPerformers: suppliers
          .filter(s => s.performanceMetrics && s.performanceMetrics.length > 0)
          .sort((a, b) => {
            const aAvg = a.performanceMetrics!.reduce((sum, p) => sum + Number(p.overallScore), 0) / a.performanceMetrics!.length;
            const bAvg = b.performanceMetrics!.reduce((sum, p) => sum + Number(p.overallScore), 0) / b.performanceMetrics!.length;
            return bAvg - aAvg;
          })
          .slice(0, 10)
          .map(s => ({
            supplierId: s.supplierId,
            companyName: s.companyName,
            classification: s.indigenousClassification,
            region: s.traditionTerritory,
            averagePerformance: s.performanceMetrics!.reduce((sum, p) => sum + Number(p.overallScore), 0) / s.performanceMetrics!.length
          }))
      };
      
      // Generate report document
      const documentUrl = await this.generateReportDocument(report, params.format || 'PDF');
      
      return {
        ...report,
        documentUrl
      };
      
    } catch (error) {
      logger.error('Network report generation failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static determineSupplierTier(annualRevenue?: number, capabilityCount: number = 0): string {
    if (annualRevenue && annualRevenue > 100000000) return 'STRATEGIC'; // $100M+
    if (annualRevenue && annualRevenue > 50000000) return 'TIER_1';    // $50M+
    if (annualRevenue && annualRevenue > 10000000) return 'TIER_2';    // $10M+
    if (capabilityCount > 10) return 'PREFERRED';
    if (capabilityCount > 5) return 'APPROVED';
    return 'TIER_3';
  }
  
  private static async calculateCreditRating(params: any): Promise<string> {
    // Simulate credit rating calculation
    let score = 650; // Base credit score
    
    if (params.businessNumber) score += 50;
    if (params.annualRevenue && params.annualRevenue > 1000000) score += 100;
    if (params.employeeCount && params.employeeCount > 50) score += 50;
    if (params.yearsInBusiness > 10) score += 75;
    
    if (score >= 800) return 'AAA';
    if (score >= 750) return 'AA';
    if (score >= 700) return 'A';
    if (score >= 650) return 'BBB';
    if (score >= 600) return 'BB';
    return 'B';
  }
  
  private static async addProductCategories(supplierId: string, categories: any[]) {
    for (const category of categories) {
      await prisma.productCategory.create({
        data: {
          categoryId: `CAT-${uuidv4().slice(0, 8)}`,
          supplierId,
          name: category.name,
          description: category.description,
          commodityCode: category.commodityCode,
          specifications: category.specifications || {},
          priceRange: category.priceRange,
          isIndigenousProduct: category.isIndigenousProduct || false,
          traditionalMethods: category.traditionalMethods || false,
          culturalSignificance: category.culturalSignificance,
          originCommunity: category.originCommunity,
          availability: category.availability || 'AVAILABLE',
          leadTime: category.leadTime,
          qualityStandards: category.qualityStandards || []
        }
      });
    }
  }
  
  private static async addServiceOfferings(supplierId: string, services: any[]) {
    for (const service of services) {
      await prisma.serviceOffering.create({
        data: {
          serviceId: `SVC-${uuidv4().slice(0, 8)}`,
          supplierId,
          name: service.name,
          description: service.description,
          serviceType: service.serviceType,
          specifications: service.specifications || {},
          deliverables: service.deliverables || {},
          pricingModel: service.pricingModel,
          priceStructure: service.priceStructure || {},
          isIndigenousService: service.isIndigenousService || false,
          incorporatesTraditionalKnowledge: service.incorporatesTraditionalKnowledge || false,
          culturalConsultation: service.culturalConsultation || false,
          elderInvolvement: service.elderInvolvement || false,
          capacity: service.capacity || {},
          availability: service.availability || {},
          serviceAreas: service.serviceAreas || [],
          remoteCapable: service.remoteCapable || false
        }
      });
    }
  }
  
  private static async addSupplierCapabilities(supplierId: string, capabilities: any[]) {
    for (const capability of capabilities) {
      await prisma.supplierCapability.create({
        data: {
          supplierId,
          category: capability.category,
          subcategory: capability.subcategory || '',
          description: capability.description || '',
          proficiencyLevel: capability.proficiencyLevel || 'INTERMEDIATE',
          experienceYears: capability.experienceYears,
          capacity: capability.capacity,
          indigenousCapability: capability.indigenousCapability || false,
          traditionalMethods: capability.traditionalMethods || false,
          communityBased: capability.communityBased || false,
          certified: capability.certified || false,
          certificationDetails: capability.certificationDetails
        }
      });
    }
  }
  
  private static async createInitialComplianceChecks(supplier: any) {
    const checks = ['BUSINESS_LICENSE', 'INSURANCE', 'TAX_COMPLIANCE'];
    
    for (const checkType of checks) {
      await prisma.supplierCompliance.create({
        data: {
          complianceId: `COMP-${uuidv4().slice(0, 8)}`,
          supplierId: supplier.id,
          checkType: checkType as any,
          category: checkType.replace('_', ' '),
          description: `${checkType.replace('_', ' ')} compliance verification`,
          requirements: {},
          status: 'PENDING',
          performedBy: 'SYSTEM'
        }
      });
    }
  }
  
  private static async inviteToIndigenousNetwork(supplier: any) {
    // Find suitable Indigenous networks for the supplier
    const networks = await prisma.indigenousSupplierNetwork.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { region: supplier.serviceRegions[0] },
          { territories: { hasSome: [supplier.traditionTerritory] } }
        ]
      }
    });
    
    for (const network of networks) {
      await prisma.supplierInvitation.create({
        data: {
          invitationId: `INV-${uuidv4().slice(0, 8)}`,
          companyName: supplier.companyName,
          contactEmail: supplier.email,
          contactName: supplier.primaryContact?.name,
          invitationType: 'NETWORK_INVITATION',
          indigenousSpecific: true,
          targetClassification: supplier.indigenousClassification,
          customMessage: `Welcome to the ${network.name} Indigenous Supplier Network`,
          requirements: {
            networkId: network.id,
            networkName: network.name
          },
          status: 'SENT',
          sentBy: 'SYSTEM'
        }
      });
    }
  }
  
  private static async trackIndigenousSupplierRegistration(supplier: any) {
    const key = `suppliers:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'registrations', 1);
    await redis.sadd(`suppliers:indigenous:${new Date().getFullYear()}`, supplier.id);
  }
  
  private static async initiateOnboardingProcess(supplier: any) {
    // Update onboarding status
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        onboardingStatus: 'IN_PROGRESS'
      }
    });
    
    // Create onboarding tasks
    await redis.zadd('supplier:onboarding:tasks', Date.now(), JSON.stringify({
      supplierId: supplier.id,
      tasks: [
        'Complete capability assessment',
        'Submit required documents',
        'Schedule quality audit',
        'Setup payment terms'
      ]
    }));
  }
  
  private static async sendSupplierWelcomeEmail(supplier: any) {
    logger.info(`Sent welcome email to supplier ${supplier.supplierId}`);
  }
  
  private static getRegistrationNextSteps(supplier: any): string[] {
    const steps = ['Complete supplier profile'];
    
    if (supplier.isIndigenousSupplier) {
      steps.push('Join Indigenous supplier network');
      steps.push('Submit Indigenous business verification');
    }
    
    steps.push('Upload certifications and licenses');
    steps.push('Complete capability assessment');
    steps.push('Await approval');
    
    return steps;
  }
  
  private static calculateAverageRating(suppliers: any[], field: string): number {
    const validRatings = suppliers.filter(s => s[field] != null).map(s => Number(s[field]));
    return validRatings.length > 0 ? Number((validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length).toFixed(2)) : 0;
  }
  
  private static async calculateMandateContribution(supplierId: string) {
    const currentYear = new Date().getFullYear();
    
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        isIndigenousProcurement: true,
        orderDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31)
        }
      }
    });
    
    const totalValue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    
    return {
      currentYear: totalValue,
      orderCount: orders.length
    };
  }
  
  private static categorizeOrder(lineItems: any[]): string {
    // Simple categorization logic
    if (lineItems.some(item => item.description?.toLowerCase().includes('construction'))) return 'CONSTRUCTION';
    if (lineItems.some(item => item.description?.toLowerCase().includes('service'))) return 'SERVICES';
    return 'GOODS';
  }
  
  private static async trackPurchaseOrderMandateContribution(params: any) {
    const key = `mandate:contribution:${new Date().getFullYear()}`;
    await redis.hincrbyfloat(key, 'total_spend', params.amount);
    await redis.hincrby(key, 'indigenous_orders', 1);
    await redis.hincrbyfloat(key, params.category.toLowerCase(), params.amount);
  }
  
  private static async sendOrderToSupplier(order: any, supplier: any) {
    logger.info(`Sent purchase order ${order.poNumber} to supplier ${supplier.companyName}`);
  }
  
  private static async calculateAveragePerformanceScore(supplierId: string, metric: string): Promise<number> {
    const performances = await prisma.supplierPerformance.findMany({
      where: { supplierId },
      orderBy: { periodEnd: 'desc' },
      take: 5
    });
    
    if (performances.length === 0) return 0;
    
    const sum = performances.reduce((s, p) => s + Number(p[metric as keyof typeof p] || 0), 0);
    return Number((sum / performances.length).toFixed(2));
  }
  
  private static determineSupplierTierFromPerformance(avgScore: number, totalSpend: number): string {
    if (avgScore >= 4.5 && totalSpend > 10000000) return 'STRATEGIC';
    if (avgScore >= 4.0 && totalSpend > 5000000) return 'PREFERRED';
    if (avgScore >= 3.5) return 'TIER_1';
    if (avgScore >= 3.0) return 'TIER_2';
    return 'TIER_3';
  }
  
  private static calculateRiskLevel(avgScore: number, onTimeRate: number): string {
    if (avgScore >= 4.0 && onTimeRate >= 95) return 'LOW';
    if (avgScore >= 3.5 && onTimeRate >= 90) return 'MEDIUM';
    if (avgScore >= 3.0 && onTimeRate >= 80) return 'HIGH';
    return 'CRITICAL';
  }
  
  private static async generatePerformanceInsights(supplier: any, performance: any) {
    const insights = [];
    
    if (Number(performance.overallScore) >= 4.5) {
      insights.push('Excellent overall performance - consider for strategic partnership');
    }
    
    if (Number(performance.onTimeDeliveryRate) < 90) {
      insights.push('Delivery performance needs improvement');
    }
    
    if (supplier.isIndigenousSupplier && performance.communityBenefit) {
      if (Number(performance.communityBenefit) >= 4.0) {
        insights.push('Strong community benefit contribution');
      }
    }
    
    return insights;
  }
  
  private static async updateCommunityBenefitTracking(supplier: any, performance: any) {
    const key = `community:benefits:${supplier.id}:${new Date().getFullYear()}`;
    await redis.hset(key, {
      'employment': performance.indigenousEmployment || 0,
      'local_sourcing': performance.localSourcing || 0,
      'community_benefit': performance.communityBenefit || 0,
      'cultural_sensitivity': performance.culturalSensitivity || 0,
      'traditional_knowledge': performance.traditionalKnowledgeUse || 0
    });
  }
  
  private static calculateNetworkAveragePerformance(suppliers: any[], metric: string): number {
    const validScores = suppliers
      .filter(s => s.performanceMetrics && s.performanceMetrics.length > 0)
      .map(s => {
        const avg = s.performanceMetrics.reduce((sum: number, p: any) => sum + Number(p[metric] || 0), 0) / s.performanceMetrics.length;
        return avg;
      })
      .filter(score => score > 0);
    
    return validScores.length > 0 ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)) : 0;
  }
  
  private static calculateNetworkMandatePercentage(totalSpend: number): number {
    // This would be calculated against total government procurement
    // Simplified calculation for demonstration
    const totalGovernmentProcurement = 50000000000; // $50B example
    return totalSpend > 0 ? Number(((totalSpend / totalGovernmentProcurement) * 100).toFixed(2)) : 0;
  }
  
  private static async createNetworkAnalytics(network: any) {
    const key = `network:analytics:${network.id}`;
    await redis.hset(key, {
      'created_at': Date.now(),
      'member_count': 0,
      'total_spend': 0,
      'contracts_count': 0
    });
  }
  
  private static async inviteEligibleSuppliers(network: any) {
    // Find suppliers eligible for this network
    const eligibleSuppliers = await prisma.supplier.findMany({
      where: {
        isIndigenousSupplier: true,
        status: 'ACTIVE',
        serviceRegions: {
          hasSome: [network.region]
        }
      },
      take: 50 // Limit initial invitations
    });
    
    return eligibleSuppliers.length;
  }
  
  private static async getInvitationCount(networkId: string): Promise<number> {
    return await redis.get(`invitations:sent:${networkId}`).then(count => parseInt(count || '0'));
  }
  
  private static async generateReportDocument(report: any, format: string) {
    return `/reports/supplier-networks/${report.reportId}.${format.toLowerCase()}`;
  }
}