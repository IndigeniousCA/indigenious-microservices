/**
 * Saskatchewan Provincial Verification Agent
 * 
 * @module SaskatchewanAgent
 * @description Verifies businesses in Saskatchewan through provincial registries
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseProvincialAgent } from './BaseAgent';
import { 
  VerificationRequest, 
  ProvincialVerificationResult,
  Worker,
  Certification 
} from '../../types';
import {
  ProvincialTaxDebt,
  TaxDebtVerificationRequest,
  TaxDebtDetails,
  TaxDebtItem,
  FilingCompliance
} from '../../types/tax-debt';
import {
  EnhancedTaxDebtItemSchema,
  transformers
} from '../../schemas/tax-debt.schema';

/**
 * Saskatchewan verification agent
 * Integrates with ISC Corporate Registry, Saskatchewan WCB, and SATCC
 */
export class SaskatchewanAgent extends BaseProvincialAgent {
  constructor() {
    super('SK');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Saskatchewan-specific APIs
   */
  private initializeAPIs(): void {
    // Information Services Corporation (ISC) - Corporate Registry
    this.apis.set('iscRegistry', {
      client: this.createSecureClient(
        process.env.SK_ISC_URL || 'https://corporateregistry.isc.ca/api',
        {
          apiKey: process.env.SK_ISC_API_KEY,
          headers: {
            'X-ISC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json'
          }
        }
      ),
      
      searchEntity: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('iscRegistry').client.post('/entities/search', {
            searchCriteria: {
              entityName: this.sanitizeInput(name),
              entityNumber: number ? this.sanitizeInput(number) : undefined,
              entityStatus: ['Active', 'In Good Standing'],
              searchType: 'business'
            },
            includeDetails: true
          });
          
          return this.validateISCRegistryResponse(response.data);
        }, 'iscRegistry:search');
      },
      
      getEntityDetails: async (entityNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('iscRegistry').client.get(
            `/entities/${this.sanitizeInput(entityNumber)}/details`
          );
          
          return this.validateEntityDetails(response.data);
        }, 'iscRegistry:details');
      }
    });
    
    // Saskatchewan Workers' Compensation Board
    this.apis.set('saskWCB', {
      client: this.createSecureClient(
        process.env.SK_WCB_URL || 'https://www.wcbsask.com/api',
        {
          apiKey: process.env.SK_WCB_API_KEY,
          headers: {
            'X-WCB-Version': '2.0',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('saskWCB').client.get(
            `/employers/${this.sanitizeInput(accountNumber)}/clearance`
          );
          
          if (response.status === 404) {
            return { 
              inGoodStanding: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            inGoodStanding: response.data.status === 'Good Standing',
            clearanceLetterNumber: response.data.clearanceNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.industryClassification,
            premiumRate: response.data.premiumRate || 1.28, // 2025 average rate
            experienceRating: response.data.experienceRating,
            accountExists: true,
            coverageType: response.data.coverageType
          };
        }, 'saskWCB:clearance');
      }
    });
    
    // Saskatchewan Apprenticeship and Trade Certification Commission (SATCC)
    this.apis.set('satcc', {
      client: this.createSecureClient(
        process.env.SATCC_URL || 'https://saskapprenticeship.ca/api',
        {
          apiKey: process.env.SATCC_API_KEY,
          headers: {
            'X-SATCC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyJourneyperson: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('satcc').client.post('/certification/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            trade: trade ? this.sanitizeInput(trade) : undefined,
            trainingYear: '2025-26', // Current training year
            includeRedSeal: true
          });
          
          return {
            valid: response.data.isValid,
            certificateType: response.data.certificateType,
            trade: response.data.tradeName,
            level: response.data.certificationLevel,
            redSealEndorsement: response.data.hasRedSeal,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            trainingInstitution: response.data.trainingInstitution
          };
        }, 'satcc:verifyJourneyperson');
      },
      
      checkApprentice: async (apprenticeNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('satcc').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeNumber)}/status`
          );
          
          return {
            registered: response.data.isRegistered,
            trade: response.data.trade,
            level: response.data.currentLevel,
            employer: response.data.employer,
            startDate: response.data.startDate ? new Date(response.data.startDate) : undefined,
            expectedCompletion: response.data.expectedCompletionDate
          };
        }, 'satcc:checkApprentice');
      }
    });
    
    // Saskatchewan Construction Association (SCA)
    this.apis.set('sca', {
      client: this.createSecureClient(
        process.env.SCA_URL || 'https://scaonline.ca/api',
        { apiKey: process.env.SCA_API_KEY }
      ),
      
      verifyMember: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('sca').client.get(
            `/members/verify?name=${encodeURIComponent(this.sanitizeInput(companyName))}`
          );
          
          return {
            isMember: response.data.membershipActive,
            memberSince: response.data.memberSince ? new Date(response.data.memberSince) : undefined,
            membershipType: response.data.membershipType,
            corCertified: response.data.hasCOR,
            safetyRating: response.data.safetyRating
          };
        }, 'sca:verifyMember');
      }
    });
    
    // Saskatchewan Ministry of Finance - Tax Debt API
    this.apis.set('saskFinance', {
      client: this.createSecureClient(
        process.env.SK_FINANCE_URL || 'https://api.saskatchewan.ca/finance/tax-verification',
        {
          apiKey: process.env.SK_FINANCE_API_KEY,
          headers: {
            'X-SK-Service': 'Tax-Debt-Verification',
            'X-Partner': 'Indigenous-Procurement',
            'X-Security-Level': 'Enhanced',
            'Accept': 'application/json'
          },
          timeout: 30000,
          retry: {
            limit: 3,
            methods: ['GET', 'POST'],
            statusCodes: [408, 429, 500, 502, 503, 504]
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('saskFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'provincial_corporate_tax',
              'pst', // Provincial Sales Tax
              'education_property_tax',
              'fuel_tax',
              'tobacco_tax',
              'potash_production_tax',
              'oil_surcharge',
              'insurance_tax',
              'land_transfer_tax',
              'freehold_oil_production_tax'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformSKTaxDebtResponse(response.data);
        }, 'saskFinance:taxDebt', 30000);
      },
      
      getPSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('saskFinance').client.get(
            `/pst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.pstAccountNumber,
            registrationDate: response.data.registrationDate,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate,
            exemptions: response.data.exemptions || []
          };
        }, 'saskFinance:pst');
      },
      
      getEducationPropertyTaxStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('saskFinance').client.get(
            `/education-property-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.accountNumber,
            properties: response.data.registeredProperties || [],
            outstandingBalance: response.data.balance || 0,
            millRate: response.data.currentMillRate
          };
        }, 'saskFinance:educationPropertyTax');
      },
      
      getFuelTaxAccount: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('saskFinance').client.get(
            `/fuel-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.fuelTaxAccount,
            fuelTypes: response.data.registeredFuelTypes || ['gasoline', 'diesel'],
            outstandingBalance: response.data.balance || 0,
            monthlyFilingRequired: response.data.monthlyFiling || true
          };
        }, 'saskFinance:fuelTax');
      }
    });
  }
  
  /**
   * Main verification method for Saskatchewan
   */
  async verify(request: VerificationRequest): Promise<ProvincialVerificationResult> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Core verification tasks
      const verificationTasks = [
        this.verifyBusinessRegistration(request.businessName, request.businessNumber),
        this.verifySafetyCompliance(request.businessNumber || request.businessName),
        this.verifyTradeQualifications(request.workers || [])
      ];
      
      // Add SCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifySCAMembership(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, scaResult] = results;
      
      // Calculate confidence
      const confidence = this.calculateConfidence(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'SK',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: scaResult?.status === 'fulfilled' ? scaResult.value : null
        },
        confidence,
        errors: this.extractErrors(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Saskatchewan verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Saskatchewan
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for entity in ISC Registry
      const searchResults = await this.apis.get('iscRegistry').searchEntity(
        businessName,
        businessNumber
      );
      
      if (!searchResults.entities || searchResults.entities.length === 0) {
        return {
          found: false,
          message: 'Business not found in Saskatchewan Corporate Registry'
        };
      }
      
      // Get detailed information for the first match
      const entity = searchResults.entities[0];
      const details = await this.apis.get('iscRegistry').getEntityDetails(
        entity.entityNumber
      );
      
      return {
        found: true,
        entityNumber: details.entityNumber,
        legalName: details.legalName,
        tradeName: details.tradeName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          city: details.city,
          province: 'SK',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        lastFilingDate: details.lastAnnualReturnDate,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber
      };
    } catch (error) {
      throw new Error(`Saskatchewan Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WCB Saskatchewan compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WCB account
      const wcbAccount = await this.mapToWCBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('saskWCB').verifyClearance(wcbAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WCB account found',
          required: true
        };
      }
      
      return {
        compliant: clearance.inGoodStanding,
        clearanceNumber: clearance.clearanceLetterNumber,
        issueDate: clearance.issueDate,
        expiryDate: clearance.expiryDate,
        industryCode: clearance.industryCode,
        premiumRate: clearance.premiumRate,
        experienceRating: clearance.experienceRating,
        coverageType: clearance.coverageType,
        safetyMetrics: {
          rateComparison: this.compareToAverageRate(clearance.premiumRate),
          recommendation: this.getSafetyRecommendation(clearance)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `Saskatchewan WCB verification failed: ${error.message}`
      };
    }
  }
  
  /**
   * Verify trade qualifications for workers
   */
  protected async verifyTradeQualifications(workers: Worker[]): Promise<any> {
    if (!workers || workers.length === 0) {
      return { verified: true, workers: [] };
    }
    
    const saskWorkers = workers.filter(w => 
      w.provinces.includes('SK') || 
      w.certifications.some(c => c.province === 'SK')
    );
    
    if (saskWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Saskatchewan workers to verify' };
    }
    
    const verificationPromises = saskWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'SK' || cert.redSeal)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(saskWorkers);
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: saskWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      designatedTrades: this.identifyDesignatedTrades(results)
    };
  }
  
  /**
   * Verify individual worker certification
   */
  private async verifyWorkerCertification(
    worker: Worker,
    certification: Certification
  ): Promise<any> {
    try {
      const satccResult = await this.apis.get('satcc').verifyJourneyperson(
        certification.number,
        certification.type
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: satccResult.valid,
        level: satccResult.level,
        redSeal: satccResult.redSealEndorsement,
        status: satccResult.status,
        trade: satccResult.trade,
        trainingInstitution: satccResult.trainingInstitution,
        expiryDate: satccResult.expiryDate || certification.expiry
      };
    } catch (error) {
      return {
        workerName: worker.name,
        certificationType: certification.type,
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify SCA membership
   */
  private async verifySCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('sca').verifyMember(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Saskatchewan Construction Association',
        isMember: membership.isMember,
        memberSince: membership.memberSince,
        membershipType: membership.membershipType,
        corCertified: membership.corCertified,
        safetyRating: membership.safetyRating,
        benefits: membership.isMember ? [
          'COR Certification support',
          'Safety training programs',
          'Industry advocacy',
          'Procurement opportunities'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'SCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('iscRegistry').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if business is construction-related
   */
  private isConstructionRelated(request: VerificationRequest): boolean {
    const constructionKeywords = [
      'construction', 'contracting', 'builder', 'contractor',
      'engineering', 'infrastructure', 'civil', 'electrical', 'plumbing'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Map business identifier to WCB account
   */
  private async mapToWCBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WCB account number format
    if (businessIdentifier.match(/^\d{6,9}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return digits.substring(0, 6);
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': '123456',
      '987654321RC0001': '987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare premium rate to 2025 average
   */
  private compareToAverageRate(rate: number): string {
    const averageRate = 1.28; // 2025 Saskatchewan average
    const difference = ((rate - averageRate) / averageRate) * 100;
    
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (excellent)`;
    if (difference < 0) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 10) return `${difference.toFixed(1)}% above average (average)`;
    return `${difference.toFixed(1)}% above average (needs improvement)`;
  }
  
  /**
   * Get safety recommendation based on WCB data
   */
  private getSafetyRecommendation(clearance: any): string {
    const rate = clearance.premiumRate || 1.28;
    
    if (rate <= 1.0) return 'Excellent safety performance - maintain current programs';
    if (rate <= 1.28) return 'Good safety performance - consider additional safety initiatives';
    if (rate <= 1.5) return 'Average safety performance - review safety procedures';
    return 'Safety improvement needed - consider safety consultant';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeNumbers = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.includes('Apprentice'))
      .map(c => c.number);
    
    if (apprenticeNumbers.length === 0) return { count: 0, details: [] };
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeNumbers.map(num => this.apis.get('satcc').checkApprentice(num))
    );
    
    return {
      count: apprenticeChecks.filter(r => r.status === 'fulfilled' && r.value.registered).length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value)
    };
  }
  
  /**
   * Identify designated trades from results
   */
  private identifyDesignatedTrades(results: PromiseSettledResult<any>[]): string[] {
    return results
      .filter(r => r.status === 'fulfilled' && r.value.valid)
      .map(r => (r as PromiseFulfilledResult<any>).value.trade)
      .filter((trade, index, self) => trade && self.indexOf(trade) === index);
  }
  
  /**
   * Validate ISC Registry response
   */
  private validateISCRegistryResponse(data: any): any {
    const schema = z.object({
      entities: z.array(z.object({
        entityNumber: z.string(),
        entityName: z.string(),
        entityType: z.string(),
        status: z.string(),
        incorporationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchCriteria: z.object({
        entityName: z.string().optional(),
        entityNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate entity details response
   */
  private validateEntityDetails(data: any): any {
    const schema = z.object({
      entityNumber: z.string(),
      legalName: z.string(),
      tradeName: z.string().optional(),
      status: z.string(),
      entityType: z.string(),
      incorporationDate: z.string(),
      inGoodStanding: z.boolean(),
      registeredAddress: z.string(),
      city: z.string(),
      postalCode: z.string(),
      businessNumber: z.string().optional(),
      lastAnnualReturnDate: z.string().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify Saskatchewan tax debt
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<ProvincialTaxDebt> {
    const startTime = Date.now();
    
    try {
      // Validate consent
      if (!request.consent?.obtained || request.consent.expiryDate < new Date()) {
        throw new Error('Valid consent required for tax debt verification');
      }
      
      // Log access for audit
      await this.logTaxDebtAccess({
        eventType: 'access_request',
        businessNumber: request.businessNumber,
        province: 'SK',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, pstResult, educationTaxResult, fuelTaxResult] = await Promise.allSettled([
        this.apis.get('saskFinance').verifyTaxDebt(request),
        this.apis.get('saskFinance').getPSTStatus(request.businessNumber),
        this.apis.get('saskFinance').getEducationPropertyTaxStatus(request.businessNumber),
        this.apis.get('saskFinance').getFuelTaxAccount(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'SK',
        provincialCorporateTax: undefined,
        salesTax: undefined,
        payrollTax: undefined,
        otherTaxes: undefined,
        paymentArrangement: undefined,
        collectionsStatus: undefined,
        totalProvincialOwing: 0,
        lastAssessmentDate: undefined,
        riskScore: 0
      };
      
      // Process main tax debt result
      if (taxDebtResult.status === 'fulfilled') {
        provincialTaxDebt = {
          ...provincialTaxDebt,
          ...taxDebtResult.value
        };
      }
      
      // Add PST data
      if (pstResult.status === 'fulfilled' && pstResult.value.registered) {
        const pstDebt = pstResult.value.outstandingBalance || 0;
        if (pstDebt > 0) {
          if (!provincialTaxDebt.salesTax) {
            provincialTaxDebt.salesTax = {
              items: [],
              totalOwing: 0,
              taxType: 'PST'
            };
          }
          provincialTaxDebt.salesTax.items.push({
            taxType: 'Provincial Sales Tax (PST)',
            amountOwing: pstDebt,
            originalAmount: pstDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: pstResult.value.accountNumber
          });
          provincialTaxDebt.salesTax.totalOwing += pstDebt;
          provincialTaxDebt.salesTax.registrationNumber = pstResult.value.accountNumber;
          provincialTaxDebt.salesTax.filingFrequency = pstResult.value.filingFrequency;
          provincialTaxDebt.totalProvincialOwing += pstDebt;
        }
      }
      
      // Add Education Property Tax data
      if (educationTaxResult.status === 'fulfilled' && educationTaxResult.value.required) {
        const educationDebt = educationTaxResult.value.outstandingBalance || 0;
        if (educationDebt > 0) {
          if (!provincialTaxDebt.otherTaxes) {
            provincialTaxDebt.otherTaxes = [];
          }
          provincialTaxDebt.otherTaxes.push({
            taxType: 'education_property_tax',
            items: [{
              taxType: 'Education Property Tax',
              amountOwing: educationDebt,
              originalAmount: educationDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: educationTaxResult.value.accountNumber,
              note: `Mill Rate: ${educationTaxResult.value.millRate || 'Standard'}`
            }],
            totalOwing: educationDebt,
            accountNumber: educationTaxResult.value.accountNumber
          });
          provincialTaxDebt.totalProvincialOwing += educationDebt;
        }
      }
      
      // Add Fuel Tax data
      if (fuelTaxResult.status === 'fulfilled' && fuelTaxResult.value.required) {
        const fuelDebt = fuelTaxResult.value.outstandingBalance || 0;
        if (fuelDebt > 0) {
          if (!provincialTaxDebt.otherTaxes) {
            provincialTaxDebt.otherTaxes = [];
          }
          provincialTaxDebt.otherTaxes.push({
            taxType: 'fuel_tax',
            items: [{
              taxType: 'Fuel Tax',
              amountOwing: fuelDebt,
              originalAmount: fuelDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: fuelTaxResult.value.accountNumber,
              note: `Fuel types: ${fuelTaxResult.value.fuelTypes?.join(', ') || 'Various'}`
            }],
            totalOwing: fuelDebt,
            accountNumber: fuelTaxResult.value.accountNumber
          });
          provincialTaxDebt.totalProvincialOwing += fuelDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateSKTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'SK',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:SK:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'SK',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`SK tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform SK tax debt response
   */
  private transformSKTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'SK',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformSKAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // PST
    if (data.pst && data.pst.totalBalance > 0) {
      result.salesTax = {
        items: data.pst.assessments.map((a: any) => ({
          ...this.transformSKAssessment(a),
          taxType: 'Provincial Sales Tax (PST)'
        })),
        totalOwing: data.pst.totalBalance,
        taxType: 'PST',
        registrationNumber: data.pst.accountNumber,
        filingFrequency: data.pst.filingFrequency
      };
      result.totalProvincialOwing += data.pst.totalBalance;
    }
    
    // Special Saskatchewan taxes
    const specialTaxes: any[] = [];
    const taxKeys = [
      'educationPropertyTax', 'fuelTax', 'tobaccoTax', 'potashProductionTax',
      'oilSurcharge', 'insuranceTax', 'landTransferTax', 'freeholdOilProductionTax'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxes.push({
          taxType: taxKey.replace('Tax', '_tax').toLowerCase(),
          items: data[taxKey].assessments.map((assessment: any) => ({
            ...this.transformSKAssessment(assessment),
            taxType: taxName
          })),
          totalOwing: data[taxKey].totalBalance,
          accountNumber: data[taxKey].accountNumber
        });
        result.totalProvincialOwing += data[taxKey].totalBalance;
      }
    });
    
    if (specialTaxes.length > 0) {
      result.otherTaxes = specialTaxes;
    }
    
    // Payment arrangements
    if (data.paymentArrangements && data.paymentArrangements.length > 0) {
      result.paymentArrangement = transformers.paymentArrangement(data.paymentArrangements[0]);
    }
    
    // Collections status
    if (data.collectionsStatus) {
      result.collectionsStatus = transformers.collectionsStatus(data.collectionsStatus);
    }
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform SK assessment
   */
  private transformSKAssessment(assessment: any): TaxDebtItem {
    return {
      taxType: assessment.taxType || 'Provincial Tax',
      amountOwing: assessment.balance || 0,
      originalAmount: assessment.originalAmount || assessment.balance || 0,
      penaltiesInterest: assessment.penaltiesInterest || 0,
      periodStart: new Date(assessment.periodStart),
      periodEnd: new Date(assessment.periodEnd),
      dueDate: new Date(assessment.dueDate),
      lastPaymentDate: assessment.lastPaymentDate ? 
        new Date(assessment.lastPaymentDate) : undefined,
      filingStatus: assessment.filingStatus || 'filed',
      assessmentNumber: assessment.assessmentNumber,
      yearsOverdue: this.calculateYearsOverdue(assessment.dueDate)
    };
  }
  
  /**
   * Transform filing compliance
   */
  private transformFilingCompliance(filingHistory: any): FilingCompliance {
    if (!filingHistory) return undefined;
    
    return {
      taxType: filingHistory.taxType || 'Tax',
      currentYear: new Date().getFullYear(),
      filedYears: filingHistory.filed || [],
      unfiledYears: filingHistory.unfiled || [],
      complianceRate: filingHistory.complianceRate || 0,
      lastFilingDate: filingHistory.lastFilingDate ? 
        new Date(filingHistory.lastFilingDate) : undefined,
      outstandingReturns: filingHistory.unfiled?.length || 0
    };
  }
  
  /**
   * Calculate SK-specific risk score
   */
  private calculateSKTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 250000) riskScore += 40;
    else if (totalOwing > 100000) riskScore += 30;
    else if (totalOwing > 50000) riskScore += 20;
    else if (totalOwing > 15000) riskScore += 10;
    else riskScore += 5;
    
    // PST factor (0-15 points) - Critical for retailers
    if (taxDebt.salesTax?.totalOwing > 0) {
      riskScore += Math.min(15, taxDebt.salesTax.totalOwing / 15000);
    }
    
    // Resource taxes (0-20 points) - Potash, oil, mining
    const hasResourceDebt = taxDebt.otherTaxes?.some(
      tax => tax.taxType.includes('potash') || tax.taxType.includes('oil') || tax.taxType.includes('mineral')
    );
    if (hasResourceDebt) {
      riskScore += 20;
    }
    
    // Education property tax (0-15 points) - Important for property-based businesses
    const hasEducationTaxDebt = taxDebt.otherTaxes?.some(
      tax => tax.taxType.includes('education_property')
    );
    if (hasEducationTaxDebt) {
      riskScore += 15;
    }
    
    // Collections (0-10 points)
    if (taxDebt.collectionsStatus) {
      switch (taxDebt.collectionsStatus.stage) {
        case 'legal_action': riskScore += 10; break;
        case 'collections': riskScore += 8; break;
        case 'demand': riskScore += 5; break;
        case 'notice': riskScore += 3; break;
      }
    }
    
    return Math.min(100, riskScore);
  }
  
  /**
   * Calculate years overdue
   */
  private calculateYearsOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    const years = (now.getTime() - due.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.floor(years));
  }
  
  /**
   * Log tax debt access
   */
  private async logTaxDebtAccess(logEntry: any): Promise<void> {
    try {
      const auditLog = {
        eventId: crypto.randomUUID(),
        timestamp: new Date(),
        ...logEntry
      };
      
      // Store in audit log (if Redis available)
      if (this.redis) {
        await this.redis.zadd(
          'tax-debt:audit-log:SK',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('SK tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}