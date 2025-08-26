import { PrismaClient, BondType, BondStatus, AssistanceType, RiskLevel } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { addDays, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

// Configure Decimal for financial precision
Decimal.set({ precision: 10, rounding: 4 });

export class BondingService {
  private static readonly CACHE_PREFIX = 'bond:';
  private static readonly CACHE_TTL = 3600;

  // Indigenous business premium discounts
  private static readonly INDIGENOUS_DISCOUNTS = {
    MAJORITY_OWNED: 0.15,    // 15% discount for 51%+ ownership
    FULLY_OWNED: 0.25,        // 25% discount for 100% ownership
    BAND_OWNED: 0.30          // 30% discount for band-owned
  };

  /**
   * Calculate bond requirements for a contract
   */
  static async calculateBondRequirements(contractData: {
    contractValue: number;
    projectType: string;
    duration: number; // days
    riskLevel?: string;
    isGovernmentContract: boolean;
    isIndigenousBusiness: boolean;
    indigenousOwnership?: number;
  }) {
    // Standard bond percentages by type
    const bondPercentages = {
      bid: contractData.isGovernmentContract ? 0.10 : 0.05,        // 10% or 5%
      performance: contractData.isGovernmentContract ? 0.50 : 0.25, // 50% or 25%
      payment: 0.50,                                                // 50% for labor/material
      maintenance: 0.10                                             // 10% for warranty
    };

    // Adjust for risk level
    const riskMultiplier = this.getRiskMultiplier(contractData.riskLevel);

    // Calculate bond amounts
    const bonds = {
      bid: {
        required: contractData.isGovernmentContract || contractData.contractValue > 100000,
        amount: contractData.contractValue * bondPercentages.bid * riskMultiplier,
        percentage: bondPercentages.bid * 100
      },
      performance: {
        required: true,
        amount: contractData.contractValue * bondPercentages.performance * riskMultiplier,
        percentage: bondPercentages.performance * 100
      },
      payment: {
        required: contractData.contractValue > 50000,
        amount: contractData.contractValue * bondPercentages.payment * riskMultiplier,
        percentage: bondPercentages.payment * 100
      },
      maintenance: {
        required: contractData.projectType === 'construction',
        amount: contractData.contractValue * bondPercentages.maintenance,
        percentage: bondPercentages.maintenance * 100,
        duration: 365 // 1 year warranty
      }
    };

    // Calculate premiums
    const premiums = await this.calculatePremiums(bonds, contractData);

    // Check for Indigenous assistance eligibility
    const assistance = contractData.isIndigenousBusiness 
      ? await this.checkAssistanceEligibility(contractData)
      : null;

    return {
      contractValue: contractData.contractValue,
      bonds,
      premiums,
      totalBondAmount: Object.values(bonds).reduce((sum, b) => sum + (b.required ? b.amount : 0), 0),
      totalPremium: premiums.total,
      assistance,
      recommendations: this.generateBondRecommendations(contractData, bonds)
    };
  }

  /**
   * Apply for a bond with Indigenous assistance
   */
  static async applyForBond(application: {
    businessId: string;
    businessName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    bondType: BondType;
    requestedAmount: number;
    contractValue: number;
    projectDescription: string;
    projectLocation: string;
    projectDuration: number;
    startDate: Date;
    completionDate: Date;
    isIndigenousBusiness: boolean;
    indigenousOwnership?: number;
    bandAffiliation?: string;
    requestedAssistance: boolean;
    financialStatements?: any;
    creditScore?: number;
  }) {
    // Generate application number
    const applicationNumber = `APP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Perform initial risk assessment
    const riskAssessment = await this.assessRisk(application);

    // Find suitable providers
    const providers = await this.findSuitableProviders({
      bondType: application.bondType,
      amount: application.requestedAmount,
      isIndigenous: application.isIndigenousBusiness,
      location: application.projectLocation,
      riskLevel: riskAssessment.level
    });

    // Check Indigenous assistance programs
    let assistanceOptions = null;
    if (application.isIndigenousBusiness && application.requestedAssistance) {
      assistanceOptions = await this.findAssistancePrograms({
        businessId: application.businessId,
        bondAmount: application.requestedAmount,
        indigenousOwnership: application.indigenousOwnership,
        bandAffiliation: application.bandAffiliation,
        location: application.projectLocation
      });
    }

    // Create application
    const bondApplication = await prisma.bondApplication.create({
      data: {
        applicationNumber,
        businessId: application.businessId,
        businessName: application.businessName,
        contactName: application.contactName,
        contactEmail: application.contactEmail,
        contactPhone: application.contactPhone,
        bondType: application.bondType,
        requestedAmount: application.requestedAmount,
        contractValue: application.contractValue,
        projectDescription: application.projectDescription,
        projectLocation: application.projectLocation,
        projectDuration: application.projectDuration,
        startDate: application.startDate,
        completionDate: application.completionDate,
        indigenousStatus: {
          isIndigenous: application.isIndigenousBusiness,
          ownership: application.indigenousOwnership,
          band: application.bandAffiliation
        },
        requestedAssistance: application.requestedAssistance,
        creditCheckConsent: true,
        backgroundCheckConsent: true,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        riskScore: riskAssessment.score,
        financialStatements: application.financialStatements
      }
    });

    // Create evaluation
    const evaluation = await this.createInitialEvaluation(bondApplication.id, riskAssessment);

    // Calculate premium offers from providers
    const offers = await this.generateProviderOffers(bondApplication, providers, assistanceOptions);

    // Send notifications
    await this.notifyProviders(bondApplication, providers);
    await this.notifyApplicant(bondApplication, offers);

    return {
      applicationId: bondApplication.id,
      applicationNumber,
      status: 'submitted',
      riskAssessment: {
        level: riskAssessment.level,
        score: riskAssessment.score,
        factors: riskAssessment.factors
      },
      providers: providers.length,
      offers: offers.slice(0, 3), // Top 3 offers
      assistanceOptions,
      nextSteps: [
        'Await provider responses (1-3 business days)',
        'Review and compare offers',
        'Submit additional documents if requested',
        assistanceOptions ? 'Apply for assistance programs' : null
      ].filter(Boolean),
      estimatedApprovalTime: this.estimateApprovalTime(riskAssessment.level)
    };
  }

  /**
   * Issue a bond
   */
  static async issueBond(applicationId: string, providerId: string, terms: {
    bondAmount: number;
    premium: number;
    collateralRequired: boolean;
    collateralValue?: number;
    personalGuarantee: boolean;
    specialConditions?: string[];
    assistanceApplied?: {
      type: AssistanceType;
      amount: number;
      programId: string;
    };
  }) {
    const application = await prisma.bondApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'APPROVED') {
      throw new Error('Application must be approved before bond issuance');
    }

    // Generate bond number
    const bondNumber = `BOND-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Get provider details
    const provider = await prisma.bondProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Calculate final premium with assistance
    let finalPremium = terms.premium;
    if (terms.assistanceApplied) {
      finalPremium = Math.max(0, terms.premium - terms.assistanceApplied.amount);
    }

    // Create bond
    const bond = await prisma.bond.create({
      data: {
        bondNumber,
        type: application.bondType,
        status: 'ACTIVE',
        projectName: application.projectDescription,
        businessId: application.businessId,
        businessName: application.businessName,
        isIndigenousBusiness: application.indigenousStatus?.isIndigenous || false,
        indigenousOwnership: application.indigenousStatus?.ownership,
        bondAmount: terms.bondAmount,
        contractValue: application.contractValue,
        bondPercentage: (terms.bondAmount / application.contractValue) * 100,
        premium: finalPremium,
        premiumRate: (finalPremium / terms.bondAmount) * 100,
        coverageStartDate: application.startDate,
        coverageEndDate: application.completionDate,
        duration: application.projectDuration,
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        indigenousAssistance: terms.assistanceApplied ? true : false,
        assistanceType: terms.assistanceApplied?.type,
        assistanceAmount: terms.assistanceApplied?.amount,
        collateralRequired: terms.collateralRequired,
        collateralValue: terms.collateralValue,
        personalGuarantee: terms.personalGuarantee,
        specialConditions: terms.specialConditions || [],
        applicationDate: application.submittedAt,
        approvalDate: application.approvedAt,
        issuanceDate: new Date(),
        expiryDate: application.completionDate
      }
    });

    // Update application
    await prisma.bondApplication.update({
      where: { id: applicationId },
      data: {
        bondId: bond.id,
        status: 'COMPLETED'
      }
    });

    // Create payment record
    await prisma.bondPayment.create({
      data: {
        paymentNumber: `PAY-${bondNumber}`,
        bondId: bond.id,
        type: 'PREMIUM',
        amount: finalPremium,
        paymentMethod: 'PENDING',
        paymentDate: new Date(),
        dueDate: addDays(new Date(), 30),
        status: 'PENDING',
        description: `Premium payment for ${bond.bondNumber}`
      }
    });

    // Generate bond certificate
    const certificate = await this.generateBondCertificate(bond);

    // Emit event
    eventEmitter.emit('bond:issued', {
      bondId: bond.id,
      businessId: bond.businessId,
      amount: bond.bondAmount,
      type: bond.type
    });

    return {
      bondId: bond.id,
      bondNumber: bond.bondNumber,
      status: 'issued',
      bondAmount: terms.bondAmount,
      premium: finalPremium,
      savings: terms.assistanceApplied ? terms.assistanceApplied.amount : 0,
      certificate,
      paymentDue: addDays(new Date(), 30),
      coverage: {
        start: bond.coverageStartDate,
        end: bond.coverageEndDate,
        duration: bond.duration
      }
    };
  }

  /**
   * Process bond claim
   */
  static async processClaim(claimData: {
    bondId: string;
    claimantId: string;
    claimantName: string;
    claimantType: string;
    claimType: string;
    claimAmount: number;
    description: string;
    projectDeficiency?: string;
    dateOfDefault: Date;
    documents?: any[];
  }) {
    const bond = await prisma.bond.findUnique({
      where: { id: claimData.bondId }
    });

    if (!bond) {
      throw new Error('Bond not found');
    }

    if (bond.status !== 'ACTIVE') {
      throw new Error('Bond is not active');
    }

    // Generate claim number
    const claimNumber = `CLAIM-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create claim
    const claim = await prisma.bondClaim.create({
      data: {
        claimNumber,
        bondId: claimData.bondId,
        claimantId: claimData.claimantId,
        claimantName: claimData.claimantName,
        claimantType: claimData.claimantType as any,
        claimType: claimData.claimType as any,
        claimAmount: claimData.claimAmount,
        description: claimData.description,
        projectDeficiency: claimData.projectDeficiency,
        dateOfDefault: claimData.dateOfDefault,
        noticeDate: new Date(),
        filingDate: new Date(),
        dueDate: addDays(new Date(), 30),
        status: 'FILED',
        documents: claimData.documents
      }
    });

    // Trigger investigation
    await this.initiateClaimInvestigation(claim);

    // Update bond claims count
    await prisma.bond.update({
      where: { id: bond.id },
      data: {
        claimsCount: { increment: 1 },
        totalClaimAmount: { increment: claimData.claimAmount }
      }
    });

    // Notify parties
    await this.notifyClaimParties(claim, bond);

    return {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      status: 'filed',
      investigationStarted: true,
      estimatedResolutionTime: '15-30 business days',
      nextSteps: [
        'Investigation will be conducted',
        'All parties will be notified',
        'Documentation review',
        'Site inspection if required',
        'Claim validation and settlement'
      ]
    };
  }

  /**
   * Get bond marketplace for Indigenous businesses
   */
  static async getBondMarketplace(filters: {
    businessId: string;
    bondType?: BondType;
    amount?: number;
    isIndigenous?: boolean;
    indigenousOwnership?: number;
    location?: string;
  }) {
    // Get available providers
    let providers = await prisma.bondProvider.findMany({
      where: {
        isActive: true,
        minimumBond: { lte: filters.amount || 999999999 },
        maximumBond: { gte: filters.amount || 0 }
      },
      orderBy: [
        { indigenousFriendly: 'desc' },
        { standardPremiumRate: 'asc' }
      ]
    });

    // Filter for Indigenous-friendly if applicable
    if (filters.isIndigenous) {
      providers = providers.sort((a, b) => {
        const aScore = (a.indigenousFriendly ? 2 : 0) + (a.indigenousOwned ? 1 : 0);
        const bScore = (b.indigenousFriendly ? 2 : 0) + (b.indigenousOwned ? 1 : 0);
        return bScore - aScore;
      });
    }

    // Get assistance programs
    const assistancePrograms = filters.isIndigenous
      ? await prisma.bondAssistance.findMany({
          where: {
            isActive: true,
            indigenousRequired: true,
            minimumOwnership: { lte: filters.indigenousOwnership || 0 }
          }
        })
      : [];

    // Calculate estimated premiums
    const quotes = await Promise.all(providers.slice(0, 10).map(async provider => {
      const basePremium = await this.calculateProviderPremium(
        provider,
        filters.amount || 100000,
        filters.bondType || 'PERFORMANCE'
      );

      let finalPremium = basePremium;
      let discount = 0;

      // Apply Indigenous discount
      if (filters.isIndigenous && provider.indigenousDiscount) {
        discount = basePremium * provider.indigenousDiscount;
        finalPremium = basePremium - discount;
      }

      return {
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        indigenousFriendly: provider.indigenousFriendly,
        indigenousOwned: provider.indigenousOwned,
        basePremium,
        discount,
        finalPremium,
        premiumRate: (finalPremium / (filters.amount || 100000)) * 100,
        turnaroundTime: provider.turnaroundTime,
        rating: provider.rating,
        features: this.getProviderFeatures(provider)
      };
    }));

    // Sort by best value for Indigenous businesses
    quotes.sort((a, b) => {
      if (filters.isIndigenous) {
        // Prioritize Indigenous-friendly and lower premiums
        const aScore = (a.indigenousFriendly ? 1000 : 0) - a.finalPremium;
        const bScore = (b.indigenousFriendly ? 1000 : 0) - b.finalPremium;
        return bScore - aScore;
      }
      return a.finalPremium - b.finalPremium;
    });

    return {
      providers: quotes,
      assistancePrograms: assistancePrograms.map(program => ({
        id: program.id,
        name: program.programName,
        type: program.programType,
        maxAssistance: program.maxAssistanceAmount,
        maxPercentage: program.maxAssistancePercent,
        eligibility: program.eligibilityCriteria,
        provider: program.provider,
        applicationProcess: program.applicationProcess
      })),
      summary: {
        lowestPremium: Math.min(...quotes.map(q => q.finalPremium)),
        averagePremium: quotes.reduce((sum, q) => sum + q.finalPremium, 0) / quotes.length,
        fastestTurnaround: Math.min(...quotes.map(q => q.turnaroundTime)),
        indigenousProviders: quotes.filter(q => q.indigenousOwned).length,
        potentialSavings: filters.isIndigenous 
          ? Math.max(...quotes.map(q => q.discount))
          : 0
      },
      recommendations: this.generateMarketplaceRecommendations(quotes, filters)
    };
  }

  // Helper methods
  private static getRiskMultiplier(riskLevel?: string): number {
    switch (riskLevel) {
      case 'VERY_HIGH': return 1.5;
      case 'HIGH': return 1.3;
      case 'MEDIUM': return 1.1;
      case 'LOW': return 0.9;
      case 'VERY_LOW': return 0.8;
      default: return 1.0;
    }
  }

  private static async calculatePremiums(bonds: any, contractData: any) {
    const basePremiumRates = {
      bid: 0.005,        // 0.5% of bond amount
      performance: 0.015, // 1.5% of bond amount
      payment: 0.01,     // 1% of bond amount
      maintenance: 0.008  // 0.8% of bond amount
    };

    const premiums: any = {};
    let total = 0;

    for (const [type, bond] of Object.entries(bonds)) {
      if ((bond as any).required) {
        let rate = basePremiumRates[type as keyof typeof basePremiumRates];
        
        // Apply Indigenous discount
        if (contractData.isIndigenousBusiness) {
          if (contractData.indigenousOwnership >= 100) {
            rate *= (1 - this.INDIGENOUS_DISCOUNTS.FULLY_OWNED);
          } else if (contractData.indigenousOwnership >= 51) {
            rate *= (1 - this.INDIGENOUS_DISCOUNTS.MAJORITY_OWNED);
          }
        }

        const premium = (bond as any).amount * rate;
        premiums[type] = premium;
        total += premium;
      }
    }

    premiums.total = total;
    premiums.withAssistance = contractData.isIndigenousBusiness ? total * 0.5 : total; // 50% assistance possible

    return premiums;
  }

  private static async checkAssistanceEligibility(contractData: any) {
    const eligiblePrograms = [];

    // Premium subsidy for Indigenous businesses
    if (contractData.indigenousOwnership >= 51) {
      eligiblePrograms.push({
        type: 'PREMIUM_SUBSIDY',
        name: 'Indigenous Business Premium Support',
        coverage: 0.5, // 50% of premium
        maxAmount: 50000,
        requirements: ['Proof of Indigenous ownership', 'Band registration']
      });
    }

    // Collateral support for first-time contractors
    eligiblePrograms.push({
      type: 'COLLATERAL_SUPPORT',
      name: 'Collateral Assistance Program',
      coverage: 0.75, // 75% of collateral
      maxAmount: 100000,
      requirements: ['Business plan', 'Financial statements']
    });

    return {
      eligible: eligiblePrograms.length > 0,
      programs: eligiblePrograms,
      potentialSavings: eligiblePrograms.reduce((sum, p) => sum + (p.maxAmount * p.coverage), 0)
    };
  }

  private static generateBondRecommendations(contractData: any, bonds: any) {
    const recommendations = [];

    if (contractData.isIndigenousBusiness) {
      recommendations.push('Apply for Indigenous business premium subsidies');
      recommendations.push('Consider Indigenous-friendly surety providers');
      
      if (contractData.indigenousOwnership < 51) {
        recommendations.push('Increase Indigenous ownership to 51% for better rates');
      }
    }

    if (contractData.contractValue > 500000) {
      recommendations.push('Consider co-surety arrangements to spread risk');
    }

    if (contractData.duration > 365) {
      recommendations.push('Negotiate phased bonding for long-term projects');
    }

    return recommendations;
  }

  private static async assessRisk(application: any): Promise<any> {
    let riskScore = 50; // Base score
    const factors = [];

    // Credit score impact
    if (application.creditScore) {
      if (application.creditScore >= 750) {
        riskScore -= 20;
        factors.push('Excellent credit score');
      } else if (application.creditScore >= 650) {
        riskScore -= 10;
        factors.push('Good credit score');
      } else if (application.creditScore < 600) {
        riskScore += 20;
        factors.push('Low credit score');
      }
    }

    // Indigenous business advantage
    if (application.isIndigenousBusiness) {
      riskScore -= 10;
      factors.push('Indigenous business with community support');
    }

    // Contract size relative to business capacity
    if (application.contractValue > 1000000) {
      riskScore += 15;
      factors.push('Large contract value');
    }

    // Determine risk level
    let level: RiskLevel;
    if (riskScore >= 80) level = 'VERY_HIGH';
    else if (riskScore >= 65) level = 'HIGH';
    else if (riskScore >= 50) level = 'MEDIUM';
    else if (riskScore >= 35) level = 'LOW';
    else level = 'VERY_LOW';

    return {
      score: riskScore,
      level,
      factors
    };
  }

  private static async findSuitableProviders(criteria: any) {
    return prisma.bondProvider.findMany({
      where: {
        isActive: true,
        minimumBond: { lte: criteria.amount },
        maximumBond: { gte: criteria.amount },
        ...(criteria.isIndigenous && { indigenousFriendly: true })
      },
      orderBy: [
        { indigenousFriendly: 'desc' },
        { standardPremiumRate: 'asc' }
      ],
      take: 10
    });
  }

  private static async findAssistancePrograms(criteria: any) {
    return prisma.bondAssistance.findMany({
      where: {
        isActive: true,
        indigenousRequired: true,
        minimumOwnership: { lte: criteria.indigenousOwnership || 0 },
        maxAssistanceAmount: { gte: criteria.bondAmount * 0.1 }
      }
    });
  }

  private static async createInitialEvaluation(applicationId: string, riskAssessment: any) {
    return prisma.bondEvaluation.create({
      data: {
        applicationId,
        evaluatorId: 'system',
        evaluatorName: 'Automated System',
        evaluationType: 'COMPREHENSIVE',
        overallScore: 100 - riskAssessment.score,
        riskLevel: riskAssessment.level,
        strengths: riskAssessment.factors.filter((f: string) => f.includes('Good') || f.includes('Excellent')),
        weaknesses: riskAssessment.factors.filter((f: string) => f.includes('Low') || f.includes('Large')),
        recommendations: [],
        maxBondRecommended: 1000000, // Would calculate based on financials
        premiumRateRecommended: 1.5,
        collateralRecommended: riskAssessment.level === 'HIGH' || riskAssessment.level === 'VERY_HIGH',
        guaranteeRecommended: riskAssessment.score > 65,
        coSuretyRecommended: false,
        evaluatedAt: new Date()
      }
    });
  }

  private static async generateProviderOffers(application: any, providers: any[], assistance: any) {
    return Promise.all(providers.map(async provider => {
      const basePremium = application.requestedAmount * provider.standardPremiumRate;
      let finalPremium = basePremium;

      // Apply Indigenous discount
      if (application.indigenousStatus?.isIndigenous && provider.indigenousDiscount) {
        finalPremium *= (1 - provider.indigenousDiscount);
      }

      return {
        providerId: provider.id,
        providerName: provider.name,
        bondAmount: application.requestedAmount,
        premium: finalPremium,
        premiumRate: (finalPremium / application.requestedAmount) * 100,
        turnaroundTime: provider.turnaroundTime,
        requiresCollateral: application.riskScore > 65,
        rating: provider.rating
      };
    }));
  }

  private static async notifyProviders(application: any, providers: any[]) {
    // Send notifications to providers
    for (const provider of providers) {
      eventEmitter.emit('bond:application:new', {
        providerId: provider.id,
        applicationId: application.id,
        businessName: application.businessName,
        bondType: application.bondType,
        amount: application.requestedAmount
      });
    }
  }

  private static async notifyApplicant(application: any, offers: any[]) {
    eventEmitter.emit('bond:offers:ready', {
      applicationId: application.id,
      businessId: application.businessId,
      offerCount: offers.length,
      bestOffer: offers[0]
    });
  }

  private static estimateApprovalTime(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'VERY_LOW':
      case 'LOW':
        return '1-2 business days';
      case 'MEDIUM':
        return '3-5 business days';
      case 'HIGH':
      case 'VERY_HIGH':
        return '5-10 business days';
      default:
        return '3-5 business days';
    }
  }

  private static async generateBondCertificate(bond: any) {
    // Generate PDF certificate
    return {
      url: `/certificates/${bond.bondNumber}.pdf`,
      generated: new Date()
    };
  }

  private static async initiateClaimInvestigation(claim: any) {
    // Start investigation process
    eventEmitter.emit('claim:investigation:start', {
      claimId: claim.id,
      bondId: claim.bondId,
      amount: claim.claimAmount
    });
  }

  private static async notifyClaimParties(claim: any, bond: any) {
    // Notify all parties about the claim
    eventEmitter.emit('claim:filed', {
      claimId: claim.id,
      bondId: bond.id,
      businessId: bond.businessId,
      claimant: claim.claimantName,
      amount: claim.claimAmount
    });
  }

  private static async calculateProviderPremium(provider: any, amount: number, bondType: BondType) {
    let rate = provider.standardPremiumRate;
    
    // Adjust rate by bond type
    const typeMultipliers = {
      BID: 0.5,
      PERFORMANCE: 1.0,
      PAYMENT: 0.8,
      MAINTENANCE: 0.6,
      SUPPLY: 0.7,
      LICENSE: 0.4,
      PERMIT: 0.4,
      CUSTOMS: 0.5,
      ADVANCE_PAYMENT: 1.2,
      RETENTION: 0.5,
      WARRANTY: 0.6
    };

    rate *= typeMultipliers[bondType] || 1.0;

    return amount * rate;
  }

  private static getProviderFeatures(provider: any) {
    const features = [];
    
    if (provider.indigenousFriendly) features.push('Indigenous-friendly');
    if (provider.indigenousOwned) features.push('Indigenous-owned');
    if (provider.coSuretyAccepted) features.push('Co-surety available');
    if (provider.turnaroundTime <= 2) features.push('Fast approval');
    if (provider.assistancePrograms) features.push('Assistance programs');
    
    return features;
  }

  private static generateMarketplaceRecommendations(quotes: any[], filters: any) {
    const recommendations = [];

    const bestValue = quotes[0];
    if (bestValue) {
      recommendations.push(`Best value: ${bestValue.providerName} at ${bestValue.premiumRate.toFixed(2)}% premium rate`);
    }

    const indigenous = quotes.find(q => q.indigenousOwned);
    if (indigenous && filters.isIndigenous) {
      recommendations.push(`Consider ${indigenous.providerName} - Indigenous-owned provider`);
    }

    const fastest = quotes.reduce((min, q) => q.turnaroundTime < min.turnaroundTime ? q : min);
    if (fastest && fastest.turnaroundTime <= 2) {
      recommendations.push(`Fastest approval: ${fastest.providerName} (${fastest.turnaroundTime} days)`);
    }

    return recommendations;
  }
}