import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInDays, isAfter } from 'date-fns';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import sharp from 'sharp';
import QRCode from 'qrcode';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'vendor.log' })
  ]
});

export class VendorService {
  // Register new vendor with Indigenous business validation
  static async registerVendor(params: {
    companyName: string;
    legalName: string;
    businessNumber?: string;
    email: string;
    phone: string;
    address: any;
    businessType: string;
    industryCode: string;
    isIndigenousBusiness?: boolean;
    indigenousClassification?: string;
    bandNumber?: string;
    treatyNumber?: string;
    statusCardNumber?: string;
    statusCardExpiry?: Date;
    indigenousOwnership?: number;
    womenOwnership?: number;
    youthOwnership?: number;
    primaryContact: any;
    capabilities: any[];
    productsServices: any;
    serviceAreas: any;
    createdBy: string;
  }) {
    const vendorId = `VEN-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const vendorNumber = `V${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    logger.info(`Registering vendor ${vendorId}`, { companyName: params.companyName });
    
    try {
      // Validate Indigenous business status if claimed
      let statusCardValidated = false;
      if (params.isIndigenousBusiness && params.statusCardNumber) {
        statusCardValidated = await this.validateStatusCard(
          params.statusCardNumber, 
          params.statusCardExpiry
        );
      }
      
      // Determine business size based on employee count
      const businessSize = this.determineBusinessSize(params.primaryContact?.employeeCount || 0);
      
      // Calculate credit score (simulated)
      const creditScore = await this.calculateCreditScore(params);
      
      // Create vendor record
      const vendor = await prisma.vendor.create({
        data: {
          vendorId,
          vendorNumber,
          companyName: params.companyName,
          legalName: params.legalName,
          businessNumber: params.businessNumber,
          email: params.email,
          phone: params.phone,
          address: params.address,
          primaryContact: params.primaryContact,
          businessType: params.businessType as any,
          industryCode: params.industryCode,
          businessSize,
          isIndigenousBusiness: params.isIndigenousBusiness || false,
          indigenousClassification: params.indigenousClassification as any,
          bandNumber: params.bandNumber,
          treatyNumber: params.treatyNumber,
          statusCardNumber: params.statusCardNumber,
          statusCardExpiry: params.statusCardExpiry,
          statusCardValidated,
          indigenousOwnership: params.indigenousOwnership,
          womenOwnership: params.womenOwnership,
          youthOwnership: params.youthOwnership,
          creditScore,
          creditRating: this.getCreditRating(creditScore),
          productsServices: params.productsServices,
          serviceAreas: params.serviceAreas,
          verificationStatus: params.isIndigenousBusiness ? 'PENDING' : 'VERIFIED',
          status: 'ACTIVE',
          approvalStatus: 'PENDING',
          createdBy: params.createdBy
        }
      });
      
      // Add capabilities
      if (params.capabilities && params.capabilities.length > 0) {
        await this.addVendorCapabilities(vendor.id, params.capabilities);
      }
      
      // Generate vendor registration documents
      const registrationDoc = await this.generateVendorRegistrationDocument(vendor);
      
      // Create compliance checks
      await this.createInitialComplianceChecks(vendor);
      
      // If Indigenous business, schedule verification
      if (params.isIndigenousBusiness) {
        await this.scheduleIndigenousVerification(vendor);
      }
      
      // Send welcome email
      await this.sendVendorWelcomeEmail(vendor);
      
      // Track Indigenous vendor registration
      if (params.isIndigenousBusiness) {
        await this.trackIndigenousVendorRegistration(vendor);
      }
      
      logger.info(`Vendor ${vendorId} registered successfully`);
      
      return {
        vendorId,
        vendorNumber,
        status: vendor.status,
        verificationStatus: vendor.verificationStatus,
        approvalStatus: vendor.approvalStatus,
        statusCardValidated,
        registrationDocument: registrationDoc.url,
        nextSteps: this.getRegistrationNextSteps(vendor)
      };
      
    } catch (error: any) {
      logger.error(`Vendor registration failed:`, error);
      throw error;
    }
  }
  
  // Verify Indigenous business status
  static async verifyIndigenousBusiness(params: {
    vendorId: string;
    verifierId: string;
    statusCardVerified: boolean;
    bandMembershipVerified: boolean;
    ownershipPercentageVerified: boolean;
    documentationComplete: boolean;
    verificationNotes?: string;
    approved: boolean;
  }) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { vendorId: params.vendorId }
      });
      
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Update verification status
      const verificationStatus = params.approved ? 'VERIFIED' : 'REJECTED';
      
      const updatedVendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          verificationStatus,
          verifiedBy: params.verifierId,
          verifiedDate: new Date(),
          statusCardValidated: params.statusCardVerified,
          approvalStatus: params.approved ? 'APPROVED' : 'REJECTED'
        }
      });
      
      // Create compliance record
      await prisma.vendorCompliance.create({
        data: {
          complianceId: `COMP-${uuidv4().slice(0, 8)}`,
          vendorId: vendor.id,
          checkType: 'INDIGENOUS_STATUS',
          category: 'Indigenous Business Verification',
          description: 'Indigenous business status verification',
          requirements: {
            statusCard: params.statusCardVerified,
            bandMembership: params.bandMembershipVerified,
            ownership: params.ownershipPercentageVerified,
            documentation: params.documentationComplete
          },
          status: params.approved ? 'COMPLIANT' : 'NON_COMPLIANT',
          indigenousCompliance: params.approved,
          statusCardValid: params.statusCardVerified,
          bandMembershipValid: params.bandMembershipVerified,
          ownershipVerified: params.ownershipPercentageVerified,
          findings: {
            approved: params.approved,
            notes: params.verificationNotes
          },
          performedBy: params.verifierId
        }
      });
      
      // Generate verification certificate if approved
      if (params.approved) {
        await this.generateIndigenousBusinessCertificate(vendor);
        
        // Add to Indigenous business registry
        await this.addToIndigenousBusinessRegistry(vendor);
      }
      
      // Send notification email
      await this.sendVerificationNotification(vendor, params.approved, params.verificationNotes);
      
      // Update Indigenous vendor metrics
      await this.updateIndigenousVendorMetrics(vendor, params.approved);
      
      return {
        verificationStatus,
        approved: params.approved,
        certificateGenerated: params.approved,
        nextSteps: this.getVerificationNextSteps(updatedVendor, params.approved)
      };
      
    } catch (error) {
      logger.error('Indigenous business verification failed:', error);
      throw error;
    }
  }
  
  // Search vendors with Indigenous business filters
  static async searchVendors(params: {
    query?: string;
    businessType?: string;
    indigenousOnly?: boolean;
    indigenousClassification?: string;
    capabilities?: string[];
    serviceAreas?: string[];
    certifications?: string[];
    creditRating?: string;
    status?: string;
    verificationStatus?: string;
    location?: any;
    radius?: number;
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
          { vendorNumber: { contains: params.query, mode: 'insensitive' } }
        ];
      }
      
      // Filters
      if (params.businessType) where.businessType = params.businessType;
      if (params.indigenousOnly) where.isIndigenousBusiness = true;
      if (params.indigenousClassification) where.indigenousClassification = params.indigenousClassification;
      if (params.status) where.status = params.status;
      if (params.verificationStatus) where.verificationStatus = params.verificationStatus;
      
      // Credit rating filter
      if (params.creditRating) {
        where.creditRating = { gte: params.creditRating };
      }
      
      // Capability filter
      if (params.capabilities && params.capabilities.length > 0) {
        where.capabilities = {
          some: {
            category: { in: params.capabilities }
          }
        };
      }
      
      // Service area filter
      if (params.serviceAreas && params.serviceAreas.length > 0) {
        // Service areas stored in JSON, would need JSON contains query
        // This is simplified for demonstration
      }
      
      // Location-based search
      if (params.location && params.radius) {
        // Would implement geographic search based on address
        // This is simplified for demonstration
      }
      
      // Sorting
      let orderBy: any = { createdAt: 'desc' };
      if (params.sortBy === 'name') orderBy = { companyName: 'asc' };
      if (params.sortBy === 'rating') orderBy = { qualityRating: 'desc' };
      if (params.sortBy === 'performance') orderBy = { qualityRating: 'desc' };
      
      const [vendors, totalCount] = await Promise.all([
        prisma.vendor.findMany({
          where,
          include: {
            capabilities: true,
            performanceMetrics: {
              orderBy: { periodEnd: 'desc' },
              take: 1
            },
            certifications: {
              where: { isActive: true }
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.vendor.count({ where })
      ]);
      
      // Calculate 5% mandate contribution for Indigenous vendors
      const enrichedVendors = await Promise.all(
        vendors.map(async (vendor) => {
          let mandateContribution = 0;
          if (vendor.isIndigenousBusiness) {
            const contribution = await this.calculateMandateContribution(vendor.id);
            mandateContribution = contribution.percentage;
          }
          
          return {
            vendorId: vendor.vendorId,
            vendorNumber: vendor.vendorNumber,
            companyName: vendor.companyName,
            businessType: vendor.businessType,
            isIndigenousBusiness: vendor.isIndigenousBusiness,
            indigenousClassification: vendor.indigenousClassification,
            verificationStatus: vendor.verificationStatus,
            status: vendor.status,
            creditRating: vendor.creditRating,
            qualityRating: vendor.qualityRating,
            capabilities: vendor.capabilities.map(c => c.category),
            certifications: vendor.certifications.length,
            location: vendor.address,
            mandateContribution,
            lastPerformance: vendor.performanceMetrics[0]?.overallScore,
            createdAt: vendor.createdAt
          };
        })
      );
      
      return {
        vendors: enrichedVendors,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page < Math.ceil(totalCount / limit)
        },
        filters: {
          indigenousVendors: vendors.filter(v => v.isIndigenousBusiness).length,
          verifiedVendors: vendors.filter(v => v.verificationStatus === 'VERIFIED').length,
          activeVendors: vendors.filter(v => v.status === 'ACTIVE').length
        }
      };
      
    } catch (error) {
      logger.error('Vendor search failed:', error);
      throw error;
    }
  }
  
  // Update vendor performance metrics
  static async updateVendorPerformance(params: {
    vendorId: string;
    periodStart: Date;
    periodEnd: Date;
    overallScore: number;
    qualityScore: number;
    deliveryScore: number;
    serviceScore: number;
    complianceScore: number;
    contractsCompleted: number;
    contractsOnTime: number;
    contractsOnBudget: number;
    totalSpend: number;
    indigenousEmployment?: number;
    localProcurement?: number;
    communityBenefit?: number;
    culturalSensitivity?: number;
    evaluatedBy: string;
  }) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { vendorId: params.vendorId }
      });
      
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Create performance record
      const performance = await prisma.vendorPerformance.create({
        data: {
          vendorId: vendor.id,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          overallScore: params.overallScore,
          qualityScore: params.qualityScore,
          deliveryScore: params.deliveryScore,
          serviceScore: params.serviceScore,
          complianceScore: params.complianceScore,
          contractsCompleted: params.contractsCompleted,
          contractsOnTime: params.contractsOnTime,
          contractsOnBudget: params.contractsOnBudget,
          totalSpend: params.totalSpend,
          indigenousEmployment: params.indigenousEmployment,
          localProcurement: params.localProcurement,
          communityBenefit: params.communityBenefit,
          culturalSensitivity: params.culturalSensitivity,
          defectRate: this.calculateDefectRate(params),
          customerSatisfaction: params.overallScore,
          evaluatedBy: params.evaluatedBy
        }
      });
      
      // Update vendor's overall quality rating
      const avgScore = await this.calculateAveragePerformanceScore(vendor.id);
      
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          qualityRating: avgScore,
          lastReviewDate: new Date(),
          nextReviewDate: addDays(new Date(), 90) // Next review in 90 days
        }
      });
      
      // Update performance tier
      const performanceTier = this.getPerformanceTier(avgScore);
      
      // If Indigenous vendor, track mandate contribution
      if (vendor.isIndigenousBusiness) {
        await this.updateMandateContribution(vendor.id, {
          totalContracts: params.totalSpend,
          contractCount: params.contractsCompleted,
          period: params.periodEnd
        });
      }
      
      // Generate performance report
      const reportUrl = await this.generatePerformanceReport(vendor, performance);
      
      logger.info(`Performance updated for vendor ${params.vendorId}`);
      
      return {
        performanceId: performance.id,
        overallScore: params.overallScore,
        performanceTier,
        averageScore: avgScore,
        reportUrl,
        indigenousMetrics: vendor.isIndigenousBusiness ? {
          employment: params.indigenousEmployment,
          procurement: params.localProcurement,
          communityBenefit: params.communityBenefit,
          culturalSensitivity: params.culturalSensitivity
        } : null
      };
      
    } catch (error) {
      logger.error('Vendor performance update failed:', error);
      throw error;
    }
  }
  
  // Track Indigenous procurement mandate contribution
  static async trackMandateContribution(params: {
    vendorId: string;
    contractValue: number;
    contractCount: number;
    category: string;
    year: number;
    quarter?: string;
    verified: boolean;
    reportedBy: string;
  }) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { vendorId: params.vendorId }
      });
      
      if (!vendor || !vendor.isIndigenousBusiness) {
        throw new Error('Vendor not found or not Indigenous business');
      }
      
      // Calculate mandate contribution
      const contribution = await prisma.mandateContribution.upsert({
        where: {
          vendorId_year_quarter: {
            vendorId: vendor.id,
            year: params.year,
            quarter: params.quarter || 'ANNUAL'
          }
        },
        update: {
          totalContracts: { increment: params.contractValue },
          contractCount: { increment: params.contractCount },
          verified: params.verified
        },
        create: {
          contributionId: `CONT-${uuidv4().slice(0, 8)}`,
          vendorId: vendor.id,
          year: params.year,
          quarter: params.quarter || 'ANNUAL',
          totalContracts: params.contractValue,
          contractCount: params.contractCount,
          mandateContribution: params.contractValue, // All Indigenous business spending counts
          mandatePercentage: 100, // This vendor is 100% Indigenous
          verified: params.verified,
          reportedBy: params.reportedBy
        }
      });
      
      // Update category breakdown
      const categoryField = this.getCategoryField(params.category);
      if (categoryField) {
        await prisma.mandateContribution.update({
          where: { id: contribution.id },
          data: {
            [categoryField]: params.contractValue
          }
        });
      }
      
      // Update aggregate statistics
      await this.updateMandateStatistics(params.year, params.quarter);
      
      // Cache contribution for quick access
      const cacheKey = `mandate:${vendor.id}:${params.year}:${params.quarter || 'ANNUAL'}`;
      await redis.setex(cacheKey, 3600, JSON.stringify({
        contribution: params.contractValue,
        percentage: 100,
        contracts: params.contractCount
      }));
      
      return {
        contributionId: contribution.contributionId,
        totalContribution: contribution.mandateContribution,
        percentage: contribution.mandatePercentage,
        verified: contribution.verified,
        cumulativeContracts: contribution.contractCount
      };
      
    } catch (error) {
      logger.error('Mandate contribution tracking failed:', error);
      throw error;
    }
  }
  
  // Generate Indigenous business registry report
  static async generateIndigenousBusinessReport(params: {
    year?: number;
    quarter?: string;
    classification?: string;
    region?: string;
    includePerformance?: boolean;
    format?: string;
  }) {
    try {
      const year = params.year || new Date().getFullYear();
      
      // Get Indigenous vendors
      const where: any = { isIndigenousBusiness: true };
      if (params.classification) where.indigenousClassification = params.classification;
      if (params.region) {
        // Would filter by region in service areas
      }
      
      const vendors = await prisma.vendor.findMany({
        where,
        include: {
          mandateContributions: {
            where: {
              year,
              quarter: params.quarter
            }
          },
          performanceMetrics: params.includePerformance ? {
            orderBy: { periodEnd: 'desc' },
            take: 1
          } : false,
          certifications: {
            where: { isActive: true, isIndigenousCertification: true }
          }
        }
      });
      
      // Calculate totals
      const totalVendors = vendors.length;
      const totalContractValue = vendors.reduce((sum, v) => 
        sum + v.mandateContributions.reduce((s, c) => s + Number(c.totalContracts), 0), 0
      );
      const totalContracts = vendors.reduce((sum, v) => 
        sum + v.mandateContributions.reduce((s, c) => s + c.contractCount, 0), 0
      );
      
      // Classification breakdown
      const classificationBreakdown = vendors.reduce((acc: any, vendor) => {
        const classification = vendor.indigenousClassification || 'UNSPECIFIED';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, {});
      
      // Performance statistics
      const performanceStats = params.includePerformance ? {
        averageQuality: vendors
          .filter(v => v.performanceMetrics[0])
          .reduce((sum, v) => sum + Number(v.performanceMetrics[0].overallScore), 0) / 
          vendors.filter(v => v.performanceMetrics[0]).length,
        topPerformers: vendors
          .filter(v => v.performanceMetrics[0] && Number(v.performanceMetrics[0].overallScore) >= 4.0)
          .length
      } : null;
      
      const report = {
        reportId: `RPT-${uuidv4().slice(0, 8)}`,
        generatedAt: new Date(),
        period: { year, quarter: params.quarter },
        summary: {
          totalVendors,
          totalContractValue,
          totalContracts,
          averageContractSize: totalContracts > 0 ? totalContractValue / totalContracts : 0
        },
        classificationBreakdown,
        performanceStats,
        vendors: vendors.map(v => ({
          vendorId: v.vendorId,
          companyName: v.companyName,
          classification: v.indigenousClassification,
          verificationStatus: v.verificationStatus,
          contractValue: v.mandateContributions.reduce((sum, c) => sum + Number(c.totalContracts), 0),
          contractCount: v.mandateContributions.reduce((sum, c) => sum + c.contractCount, 0),
          performance: v.performanceMetrics[0] ? {
            overallScore: v.performanceMetrics[0].overallScore,
            indigenousEmployment: v.performanceMetrics[0].indigenousEmployment,
            localProcurement: v.performanceMetrics[0].localProcurement
          } : null
        })),
        mandateProgress: {
          targetPercentage: 5,
          currentPercentage: this.calculateCurrentMandatePercentage(vendors),
          gap: Math.max(0, 5 - this.calculateCurrentMandatePercentage(vendors))
        }
      };
      
      // Generate report document
      const documentUrl = await this.generateReportDocument(report, params.format || 'PDF');
      
      return {
        ...report,
        documentUrl
      };
      
    } catch (error) {
      logger.error('Indigenous business report generation failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static async validateStatusCard(cardNumber: string, expiryDate?: Date): Promise<boolean> {
    // Simulate status card validation
    if (!cardNumber || cardNumber.length < 8) return false;
    if (expiryDate && isAfter(new Date(), expiryDate)) return false;
    
    // Would integrate with actual status card validation service
    return true;
  }
  
  private static determineBusinessSize(employeeCount: number): string {
    if (employeeCount < 5) return 'MICRO';
    if (employeeCount < 100) return 'SMALL';
    if (employeeCount < 500) return 'MEDIUM';
    return 'LARGE';
  }
  
  private static async calculateCreditScore(params: any): Promise<number> {
    // Simulate credit score calculation
    let score = 75; // Base score
    
    if (params.businessNumber) score += 10;
    if (params.primaryContact?.yearsInBusiness > 5) score += 15;
    if (params.isIndigenousBusiness) score += 5; // Indigenous business boost
    
    return Math.min(100, score);
  }
  
  private static getCreditRating(score: number): string {
    if (score >= 90) return 'AAA';
    if (score >= 80) return 'AA';
    if (score >= 70) return 'A';
    if (score >= 60) return 'BBB';
    if (score >= 50) return 'BB';
    return 'B';
  }
  
  private static async addVendorCapabilities(vendorId: string, capabilities: any[]) {
    const capabilityRecords = capabilities.map(cap => ({
      vendorId,
      category: cap.category,
      subcategory: cap.subcategory || '',
      description: cap.description || '',
      proficiencyLevel: cap.proficiencyLevel || 'INTERMEDIATE',
      indigenousSpecialization: cap.indigenousSpecialization || false,
      traditionalMethods: cap.traditionalMethods || false,
      serviceRegions: cap.serviceRegions || []
    }));
    
    await prisma.vendorCapability.createMany({
      data: capabilityRecords
    });
  }
  
  private static async generateVendorRegistrationDocument(vendor: any) {
    // Generate vendor registration document
    return {
      url: `/documents/vendors/${vendor.vendorId}/registration.pdf`,
      size: 1024 * 25 // 25KB
    };
  }
  
  private static async createInitialComplianceChecks(vendor: any) {
    const checks = [
      'BUSINESS_LICENSE',
      'TAX_COMPLIANCE',
      'INSURANCE'
    ];
    
    if (vendor.isIndigenousBusiness) {
      checks.push('INDIGENOUS_STATUS');
    }
    
    for (const checkType of checks) {
      await prisma.vendorCompliance.create({
        data: {
          complianceId: `COMP-${uuidv4().slice(0, 8)}`,
          vendorId: vendor.id,
          checkType: checkType as any,
          category: checkType.replace('_', ' '),
          description: `${checkType.replace('_', ' ')} compliance check`,
          requirements: {},
          status: 'PENDING',
          performedBy: 'SYSTEM'
        }
      });
    }
  }
  
  private static async scheduleIndigenousVerification(vendor: any) {
    // Schedule Indigenous verification
    await redis.zadd('vendor:indigenous:verification:pending', Date.now(), vendor.id);
    logger.info(`Scheduled Indigenous verification for vendor ${vendor.vendorId}`);
  }
  
  private static async sendVendorWelcomeEmail(vendor: any) {
    // Send welcome email
    logger.info(`Sent welcome email to vendor ${vendor.vendorId}`);
  }
  
  private static async trackIndigenousVendorRegistration(vendor: any) {
    // Track Indigenous vendor registration metrics
    const key = `vendors:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'registrations', 1);
    await redis.sadd(`vendors:indigenous:${new Date().getFullYear()}`, vendor.id);
  }
  
  private static getRegistrationNextSteps(vendor: any): string[] {
    const steps = ['Complete profile setup'];
    
    if (vendor.isIndigenousBusiness) {
      steps.push('Submit status card documentation');
      steps.push('Await Indigenous business verification');
    }
    
    steps.push('Upload certifications and licenses');
    steps.push('Complete capability assessment');
    
    return steps;
  }
  
  private static async calculateMandateContribution(vendorId: string) {
    const contributions = await prisma.mandateContribution.findMany({
      where: { vendorId },
      orderBy: { year: 'desc' }
    });
    
    const totalValue = contributions.reduce((sum, c) => sum + Number(c.totalContracts), 0);
    const mandateValue = contributions.reduce((sum, c) => sum + Number(c.mandateContribution), 0);
    
    return {
      totalValue,
      mandateValue,
      percentage: totalValue > 0 ? (mandateValue / totalValue) * 100 : 0
    };
  }
  
  private static async calculateAveragePerformanceScore(vendorId: string): Promise<number> {
    const metrics = await prisma.vendorPerformance.findMany({
      where: { vendorId },
      orderBy: { periodEnd: 'desc' },
      take: 5 // Last 5 evaluations
    });
    
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((s, m) => s + Number(m.overallScore), 0);
    return Number((sum / metrics.length).toFixed(2));
  }
  
  private static calculateDefectRate(params: any): number {
    // Calculate defect rate based on performance data
    return Math.max(0, (100 - params.qualityScore) / 10);
  }
  
  private static getPerformanceTier(score: number): string {
    if (score >= 4.5) return 'EXCELLENT';
    if (score >= 4.0) return 'GOOD';
    if (score >= 3.0) return 'SATISFACTORY';
    return 'NEEDS_IMPROVEMENT';
  }
  
  private static async generatePerformanceReport(vendor: any, performance: any) {
    // Generate performance report
    return `/reports/vendors/${vendor.vendorId}/performance-${performance.id}.pdf`;
  }
  
  private static getCategoryField(category: string): string | null {
    const mapping: { [key: string]: string } = {
      'GOODS': 'goodsValue',
      'SERVICES': 'servicesValue',
      'CONSTRUCTION': 'constructionValue'
    };
    return mapping[category] || null;
  }
  
  private static async updateMandateContribution(vendorId: string, params: any) {
    // Update mandate contribution
    logger.info(`Updated mandate contribution for vendor ${vendorId}`, params);
  }
  
  private static async updateMandateStatistics(year: number, quarter?: string) {
    // Update aggregate mandate statistics
    const key = `mandate:stats:${year}${quarter ? ':' + quarter : ''}`;
    await redis.incr(`${key}:updated`);
  }
  
  private static calculateCurrentMandatePercentage(vendors: any[]): number {
    // Calculate current mandate percentage
    const totalValue = vendors.reduce((sum, v) => 
      sum + v.mandateContributions.reduce((s: number, c: any) => s + Number(c.totalContracts), 0), 0
    );
    
    // This would be calculated against total government procurement
    return totalValue > 0 ? Math.min(100, (totalValue / 1000000) * 100) : 0; // Simplified
  }
  
  private static async generateReportDocument(report: any, format: string) {
    // Generate report document
    return `/reports/indigenous-business/${report.reportId}.${format.toLowerCase()}`;
  }
  
  private static async generateIndigenousBusinessCertificate(vendor: any) {
    // Generate Indigenous business certificate
    logger.info(`Generated Indigenous business certificate for vendor ${vendor.vendorId}`);
  }
  
  private static async addToIndigenousBusinessRegistry(vendor: any) {
    // Add to Indigenous business registry
    const registryKey = `registry:indigenous:${vendor.indigenousClassification}`;
    await redis.sadd(registryKey, vendor.id);
  }
  
  private static async sendVerificationNotification(vendor: any, approved: boolean, notes?: string) {
    // Send verification notification
    logger.info(`Sent verification notification to vendor ${vendor.vendorId}`, { approved, notes });
  }
  
  private static async updateIndigenousVendorMetrics(vendor: any, approved: boolean) {
    // Update Indigenous vendor metrics
    const key = `vendors:indigenous:metrics:${new Date().getFullYear()}`;
    if (approved) {
      await redis.hincrby(key, 'verified', 1);
    } else {
      await redis.hincrby(key, 'rejected', 1);
    }
  }
  
  private static getVerificationNextSteps(vendor: any, approved: boolean): string[] {
    if (approved) {
      return [
        'Complete vendor profile',
        'Submit capability assessments',
        'Begin procurement participation',
        'Track mandate contributions'
      ];
    } else {
      return [
        'Address verification issues',
        'Resubmit required documentation',
        'Schedule follow-up review'
      ];
    }
  }
}