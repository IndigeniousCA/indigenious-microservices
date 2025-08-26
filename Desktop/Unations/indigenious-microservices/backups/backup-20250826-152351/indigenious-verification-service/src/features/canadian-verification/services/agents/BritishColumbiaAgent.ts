/**
 * British Columbia Provincial Verification Agent
 * 
 * @module BritishColumbiaAgent
 * @description Verifies businesses in British Columbia through provincial registries
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
 * British Columbia verification agent
 * Integrates with BC Registry Services, WorkSafeBC, and trade authorities
 */
export class BritishColumbiaAgent extends BaseProvincialAgent {
  constructor() {
    super('BC');
    this.initializeAPIs();
  }
  
  /**
   * Initialize BC-specific APIs
   */
  private initializeAPIs(): void {
    // BC Registry Services
    this.apis.set('bcRegistry', {
      client: this.createSecureClient(
        process.env.BC_REGISTRY_URL || 'https://www.bcregistry.ca/api',
        {
          apiKey: process.env.BC_REGISTRY_API_KEY,
          certPath: './certs/bc-registry-ca.pem'
        }
      ),
      
      searchBusiness: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bcRegistry').client.post('/business/search', {
            query: {
              name: this.sanitizeInput(name),
              identifier: number ? this.sanitizeInput(number) : undefined,
              status: ['ACTIVE', 'GOODSTANDING']
            }
          });
          
          return this.validateBCRegistryResponse(response.data);
        }, 'bcRegistry:search');
      },
      
      getBusinessDetails: async (identifier: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bcRegistry').client.get(
            `/business/${this.sanitizeInput(identifier)}`
          );
          
          return this.validateBusinessDetails(response.data);
        }, 'bcRegistry:details');
      }
    });
    
    // WorkSafeBC
    this.apis.set('worksafeBC', {
      client: this.createSecureClient(
        process.env.WORKSAFE_BC_URL || 'https://online.worksafebc.com/api',
        {
          apiKey: process.env.WORKSAFE_BC_API_KEY,
          headers: {
            'Accept': 'application/json',
            'X-WSBC-Version': '2.0'
          }
        }
      ),
      
      checkCompliance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('worksafeBC').client.get(
            `/employer/${this.sanitizeInput(accountNumber)}/clearance`
          );
          
          if (response.status === 404) {
            return { compliant: false, reason: 'Account not found' };
          }
          
          return {
            compliant: response.data.clearanceStatus === 'VALID',
            clearanceNumber: response.data.clearanceNumber,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            industryClassification: response.data.classification,
            experienceRating: response.data.experienceRating
          };
        }, 'worksafeBC:compliance');
      }
    });
    
    // BC Construction Association (trades verification)
    this.apis.set('bcca', {
      client: this.createSecureClient(
        process.env.BCCA_URL || 'https://api.bccassn.com',
        { apiKey: process.env.BCCA_API_KEY }
      ),
      
      verifyTrade: async (workerName: string, trade: string, certificateNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bcca').client.post('/verify/trade', {
            name: this.sanitizeInput(workerName),
            trade: this.sanitizeInput(trade),
            certificateNumber: this.sanitizeInput(certificateNumber)
          });
          
          return {
            valid: response.data.valid,
            tradeName: response.data.tradeName,
            level: response.data.level,
            redSeal: response.data.redSealEndorsement,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined
          };
        }, 'bcca:verifyTrade');
      }
    });
    
    // Industry Training Authority (ITA)
    this.apis.set('ita', {
      client: this.createSecureClient(
        process.env.ITA_BC_URL || 'https://api.itabc.ca',
        { apiKey: process.env.ITA_BC_API_KEY }
      ),
      
      verifyRedSeal: async (certificateNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ita').client.get(
            `/certification/redseal/${this.sanitizeInput(certificateNumber)}`
          );
          
          return {
            valid: response.data.status === 'ACTIVE',
            holderName: response.data.holderName,
            trade: response.data.trade,
            issueDate: new Date(response.data.issueDate),
            interprovincialEndorsement: response.data.interprovincialEndorsement
          };
        }, 'ita:verifyRedSeal');
      }
    });
    
    // BC Ministry of Finance - Tax Debt API
    this.apis.set('bcFinance', {
      client: this.createSecureClient(
        process.env.BC_FINANCE_URL || 'https://api.gov.bc.ca/finance/tax-verification',
        {
          apiKey: process.env.BC_FINANCE_API_KEY,
          headers: {
            'X-BC-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('bcFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            bcBusinessNumber: request.businessNumber ? this.extractBCNumber(request.businessNumber) : undefined,
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'corporate_income_tax',
              'pst', // Provincial Sales Tax
              'carbon_tax',
              'motor_fuel_tax',
              'tobacco_tax',
              'employer_health_tax',
              'speculation_vacancy_tax',
              'property_transfer_tax',
              'logging_tax',
              'mineral_tax',
              'natural_gas_royalties'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformBCTaxDebtResponse(response.data);
        }, 'bcFinance:taxDebt', 30000);
      },
      
      getPSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bcFinance').client.get(
            `/pst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.pstAccountNumber,
            registrationDate: response.data.registrationDate,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate,
            collectorsStatus: response.data.collectorsStatus
          };
        }, 'bcFinance:pst');
      },
      
      getCarbonTaxAccount: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bcFinance').client.get(
            `/carbon-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.carbonTaxAccount,
            fuelTypes: response.data.registeredFuelTypes,
            outstandingBalance: response.data.balance || 0,
            complianceStatus: response.data.complianceStatus
          };
        }, 'bcFinance:carbonTax');
      }
    });
  }
  
  /**
   * Main verification method for BC
   */
  async verify(request: VerificationRequest): Promise<ProvincialVerificationResult> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Parallel verification tasks
      const [businessResult, safetyResult, tradeResults] = await Promise.allSettled([
        this.verifyBusinessRegistration(request.businessName, request.businessNumber),
        this.verifySafetyCompliance(request.businessNumber || request.businessName),
        this.verifyTradeQualifications(request.workers || [])
      ]);
      
      // Calculate confidence
      const confidence = this.calculateConfidence([businessResult, safetyResult, tradeResults]);
      
      // Extract business ID if found
      let businessId: string | undefined;
      if (businessResult.status === 'fulfilled' && businessResult.value?.identifier) {
        businessId = businessResult.value.identifier;
      }
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'BC',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null
        },
        confidence,
        errors: this.extractErrors([businessResult, safetyResult, tradeResults])
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`BC verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in BC
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for business
      const searchResults = await this.apis.get('bcRegistry').searchBusiness(
        businessName,
        businessNumber
      );
      
      if (!searchResults.results || searchResults.results.length === 0) {
        return {
          found: false,
          message: 'Business not found in BC Registry'
        };
      }
      
      // Get detailed information for the first match
      const business = searchResults.results[0];
      const details = await this.apis.get('bcRegistry').getBusinessDetails(
        business.identifier
      );
      
      return {
        found: true,
        identifier: details.identifier,
        legalName: details.legalName,
        operatingName: details.operatingName,
        status: details.status,
        goodStanding: details.goodStanding,
        incorporationDate: details.incorporationDate,
        businessType: details.businessType,
        registeredOffice: details.registeredOffice,
        directors: details.directors?.length || 0,
        filingHistory: {
          lastFiling: details.lastFiling,
          upToDate: details.filingsUpToDate
        }
      };
    } catch (error) {
      throw new Error(`BC Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WorkSafeBC compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // First try with business number, then business name
      let accountNumber = businessIdentifier;
      
      // If it's a business number, extract potential WSBC account
      if (businessIdentifier.match(/^\d{9}[A-Z]{2}\d{4}$/)) {
        // Try to look up WSBC account from business number
        // In production, this would query a mapping service
        accountNumber = await this.lookupWSBCAccount(businessIdentifier);
      }
      
      const compliance = await this.apis.get('worksafeBC').checkCompliance(accountNumber);
      
      return {
        compliant: compliance.compliant,
        clearanceNumber: compliance.clearanceNumber,
        expiryDate: compliance.expiryDate,
        classification: compliance.industryClassification,
        experienceRating: compliance.experienceRating,
        safetyRecord: {
          rating: this.calculateSafetyRating(compliance.experienceRating),
          claims: compliance.recentClaims || 0
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WorkSafeBC verification failed: ${error.message}`
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
    
    const verificationPromises = workers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'BC')
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: workers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      )
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
      // Check if it's a Red Seal certification
      if (certification.redSeal) {
        const redSealResult = await this.apis.get('ita').verifyRedSeal(
          certification.number
        );
        
        return {
          workerName: worker.name,
          certificationType: certification.type,
          certificateNumber: certification.number,
          valid: redSealResult.valid,
          redSeal: true,
          interprovincial: redSealResult.interprovincialEndorsement,
          trade: redSealResult.trade,
          expiryDate: certification.expiry
        };
      }
      
      // Regular trade certification
      const tradeResult = await this.apis.get('bcca').verifyTrade(
        worker.name,
        certification.type,
        certification.number
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: tradeResult.valid,
        level: tradeResult.level,
        expiryDate: tradeResult.expiryDate
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
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('bcRegistry').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate BC Registry response
   */
  private validateBCRegistryResponse(data: any): any {
    const schema = z.object({
      results: z.array(z.object({
        identifier: z.string(),
        name: z.string(),
        status: z.string(),
        type: z.string()
      })),
      totalResults: z.number()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate business details response
   */
  private validateBusinessDetails(data: any): any {
    const schema = z.object({
      identifier: z.string(),
      legalName: z.string(),
      operatingName: z.string().optional(),
      status: z.string(),
      goodStanding: z.boolean(),
      incorporationDate: z.string(),
      businessType: z.string(),
      registeredOffice: z.object({
        street: z.string(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string()
      }),
      directors: z.array(z.object({
        name: z.string(),
        appointmentDate: z.string()
      })).optional(),
      lastFiling: z.string().optional(),
      filingsUpToDate: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Look up WSBC account from business number
   */
  private async lookupWSBCAccount(businessNumber: string): Promise<string> {
    // In production, this would query a mapping service
    // For now, return a mock mapping
    const mappings: Record<string, string> = {
      '123456789RC0001': 'WSBC123456',
      '987654321RC0001': 'WSBC987654'
    };
    
    return mappings[businessNumber] || businessNumber;
  }
  
  /**
   * Calculate safety rating from experience rating
   */
  private calculateSafetyRating(experienceRating?: number): string {
    if (!experienceRating) return 'Unknown';
    if (experienceRating <= 0.8) return 'Excellent';
    if (experienceRating <= 1.0) return 'Good';
    if (experienceRating <= 1.2) return 'Average';
    return 'Below Average';
  }
  
  /**
   * Verify BC tax debt
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
        province: 'BC',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, pstResult, carbonTaxResult] = await Promise.allSettled([
        this.apis.get('bcFinance').verifyTaxDebt(request),
        this.apis.get('bcFinance').getPSTStatus(request.businessNumber),
        this.apis.get('bcFinance').getCarbonTaxAccount(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'BC',
        provincialCorporateTax: undefined,
        salesTax: undefined,
        employerHealthTax: undefined,
        otherProvincialTaxes: undefined,
        paymentArrangement: undefined,
        collectionsStatus: undefined,
        totalProvincialOwing: 0,
        lastAssessmentDate: undefined,
        filingCompliance: undefined,
        specialPrograms: undefined,
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
          provincialTaxDebt.salesTax.accountNumber = pstResult.value.accountNumber;
          provincialTaxDebt.salesTax.filingFrequency = pstResult.value.filingFrequency;
          provincialTaxDebt.totalProvincialOwing += pstDebt;
        }
      }
      
      // Add Carbon Tax data
      if (carbonTaxResult.status === 'fulfilled' && carbonTaxResult.value.required) {
        const carbonDebt = carbonTaxResult.value.outstandingBalance || 0;
        if (carbonDebt > 0) {
          if (!provincialTaxDebt.otherProvincialTaxes) {
            provincialTaxDebt.otherProvincialTaxes = {
              items: [],
              totalOwing: 0,
              types: []
            };
          }
          provincialTaxDebt.otherProvincialTaxes.items.push({
            taxType: 'Carbon Tax',
            amountOwing: carbonDebt,
            originalAmount: carbonDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: carbonTaxResult.value.accountNumber,
            note: `Fuel types: ${carbonTaxResult.value.fuelTypes?.join(', ') || 'Various'}`
          });
          provincialTaxDebt.otherProvincialTaxes.totalOwing += carbonDebt;
          provincialTaxDebt.otherProvincialTaxes.types.push('Carbon Tax');
          provincialTaxDebt.totalProvincialOwing += carbonDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateBCTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'BC',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:BC:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'BC',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`BC tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform BC tax debt response
   */
  private transformBCTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'BC',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformBCAssessment(a)),
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
          ...this.transformBCAssessment(a),
          taxType: 'Provincial Sales Tax (PST)'
        })),
        totalOwing: data.pst.totalBalance,
        taxType: 'PST',
        accountNumber: data.pst.accountNumber,
        filingFrequency: data.pst.filingFrequency
      };
      result.totalProvincialOwing += data.pst.totalBalance;
    }
    
    // Special taxes (carbon, fuel, tobacco, etc.)
    const specialTaxes: TaxDebtItem[] = [];
    let specialTaxTotal = 0;
    const specialTaxTypes: string[] = [];
    
    const taxKeys = [
      'carbonTax', 'motorFuelTax', 'tobaccoTax', 'employerHealthTax',
      'speculationVacancyTax', 'propertyTransferTax', 'loggingTax',
      'mineralTax', 'naturalGasRoyalties'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxTypes.push(taxName);
        specialTaxes.push(...data[taxKey].assessments.map((assessment: any) => ({
          ...this.transformBCAssessment(assessment),
          taxType: taxName
        })));
        specialTaxTotal += data[taxKey].totalBalance;
      }
    });
    
    if (specialTaxes.length > 0) {
      result.otherProvincialTaxes = {
        items: specialTaxes,
        totalOwing: specialTaxTotal,
        types: specialTaxTypes
      };
      result.totalProvincialOwing += specialTaxTotal;
    }
    
    // Payment arrangements
    if (data.paymentArrangements && data.paymentArrangements.length > 0) {
      result.paymentArrangement = transformers.paymentArrangement(data.paymentArrangements[0]);
    }
    
    // Collections status
    if (data.collectionsStatus) {
      result.collectionsStatus = transformers.collectionsStatus(data.collectionsStatus);
    }
    
    // Filing compliance
    if (data.overallFilingCompliance) {
      result.filingCompliance = {
        overallCompliant: data.overallFilingCompliance.compliant,
        outstandingReturns: data.overallFilingCompliance.outstandingReturns || 0,
        filingDeadlines: data.overallFilingCompliance.upcomingDeadlines || []
      };
    }
    
    // Special programs (if any)
    if (data.specialPrograms) {
      result.specialPrograms = {
        miningTaxCredit: data.specialPrograms.miningTaxCredit,
        scientificResearchCredit: data.specialPrograms.scientificResearchCredit,
        filmTaxCredit: data.specialPrograms.filmTaxCredit,
        interactiveDigitalMediaCredit: data.specialPrograms.interactiveDigitalMediaCredit
      };
    }
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform BC assessment
   */
  private transformBCAssessment(assessment: any): TaxDebtItem {
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
   * Calculate BC-specific risk score
   */
  private calculateBCTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 300000) riskScore += 40;
    else if (totalOwing > 150000) riskScore += 30;
    else if (totalOwing > 75000) riskScore += 20;
    else if (totalOwing > 25000) riskScore += 10;
    else riskScore += 5;
    
    // PST factor (0-15 points) - Critical for retailers
    if (taxDebt.salesTax?.totalOwing > 0) {
      riskScore += Math.min(15, taxDebt.salesTax.totalOwing / 20000);
    }
    
    // Environmental taxes (0-15 points) - Carbon tax, etc.
    const hasEnvironmentalDebt = taxDebt.otherProvincialTaxes?.types.some(
      type => type.includes('Carbon') || type.includes('Fuel')
    );
    if (hasEnvironmentalDebt) {
      riskScore += 15;
    }
    
    // Filing compliance (0-20 points)
    if (taxDebt.filingCompliance && !taxDebt.filingCompliance.overallCompliant) {
      riskScore += 20;
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
   * Extract BC business number
   */
  private extractBCNumber(businessNumber: string): string | undefined {
    // BC business numbers might be embedded or separate
    // This is a simplified extraction
    if (businessNumber.startsWith('BC')) {
      return businessNumber;
    }
    // Extract from federal business number pattern
    if (businessNumber.length >= 9) {
      return `BC${businessNumber.substring(0, 7)}`;
    }
    return undefined;
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
          'tax-debt:audit-log:BC',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('BC tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}