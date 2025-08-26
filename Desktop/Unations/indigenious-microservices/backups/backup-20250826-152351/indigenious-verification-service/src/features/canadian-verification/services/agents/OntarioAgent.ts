/**
 * Ontario Provincial Verification Agent
 * 
 * @module OntarioAgent
 * @description Verifies businesses in Ontario through provincial registries
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
 * Ontario verification agent
 * Integrates with Ontario Business Registry, WSIB, and skilled trades authorities
 */
export class OntarioAgent extends BaseProvincialAgent {
  constructor() {
    super('ON');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Ontario-specific APIs
   */
  private initializeAPIs(): void {
    // Ontario Business Registry
    this.apis.set('ontarioRegistry', {
      client: this.createSecureClient(
        process.env.ON_REGISTRY_URL || 'https://www.ontario.ca/api/businessregistry',
        {
          apiKey: process.env.ON_REGISTRY_API_KEY,
          headers: {
            'X-Ontario-Partner': 'IndigenousProcurement',
            'Accept': 'application/json'
          }
        }
      ),
      
      searchBusiness: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ontarioRegistry').client.post('/business/search', {
            query: {
              businessName: this.sanitizeInput(name),
              ontarioCorporationNumber: number ? this.sanitizeInput(number) : undefined,
              businessIdentificationNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'Active with Conditions']
            },
            searchType: 'comprehensive'
          });
          
          return this.validateOntarioRegistryResponse(response.data);
        }, 'ontarioRegistry:search');
      },
      
      getBusinessProfile: async (businessId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ontarioRegistry').client.get(
            `/business/${this.sanitizeInput(businessId)}/profile`
          );
          
          return this.validateBusinessProfile(response.data);
        }, 'ontarioRegistry:profile');
      }
    });
    
    // Workplace Safety and Insurance Board (WSIB)
    this.apis.set('wsib', {
      client: this.createSecureClient(
        process.env.WSIB_URL || 'https://www.wsib.ca/api',
        {
          apiKey: process.env.WSIB_API_KEY,
          headers: {
            'X-WSIB-Version': '4.0',
            'X-Partner-ID': 'INDIGENOUS-PROC'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wsib').client.post('/clearance/verify', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeCAD7: true
          });
          
          if (response.status === 404) {
            return { 
              clearanceStatus: 'NOT_FOUND',
              accountExists: false 
            };
          }
          
          return {
            clearanceStatus: response.data.clearanceStatus,
            accountNumber: response.data.accountNumber,
            businessLegalName: response.data.legalName,
            clearanceCertificateNumber: response.data.certificateNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            rateGroup: response.data.rateGroup,
            classificationUnit: response.data.classificationUnit,
            experienceRating: response.data.experienceRating,
            neer: response.data.neerRating,
            cad7: response.data.cad7Status,
            accountExists: true
          };
        }, 'wsib:clearance');
      }
    });
    
    // Skilled Trades Ontario
    this.apis.set('skilledTradesON', {
      client: this.createSecureClient(
        process.env.SKILLED_TRADES_ON_URL || 'https://www.skilledtradesontario.ca/api',
        {
          apiKey: process.env.SKILLED_TRADES_ON_API_KEY,
          headers: {
            'Accept': 'application/json',
            'X-STO-Partner': 'Indigenous-Procurement'
          }
        }
      ),
      
      verifyCertificate: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('skilledTradesON').client.post('/certification/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            trade: trade ? this.sanitizeInput(trade) : undefined,
            includeScope: true,
            includeRedSeal: true
          });
          
          return {
            valid: response.data.isValid,
            certificateType: response.data.certificateType,
            trade: response.data.trade,
            scope: response.data.scope,
            class: response.data.class,
            redSealEndorsement: response.data.hasRedSeal,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            restrictions: response.data.restrictions || []
          };
        }, 'skilledTradesON:verify');
      }
    });
    
    // Construction & Industrial Relations Association (ON-CIRA)
    this.apis.set('onCira', {
      client: this.createSecureClient(
        process.env.ON_CIRA_URL || 'https://www.oncira.ca/api',
        { apiKey: process.env.ON_CIRA_API_KEY }
      ),
      
      checkMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('onCira').client.get(
            `/members/search?name=${encodeURIComponent(this.sanitizeInput(companyName))}`
          );
          
          return {
            isMember: response.data.found && response.data.membershipActive,
            membershipType: response.data.membershipType,
            memberSince: response.data.memberSince ? new Date(response.data.memberSince) : undefined,
            laborRelationsStatus: response.data.laborRelationsStatus,
            collectiveAgreements: response.data.collectiveAgreements || []
          };
        }, 'onCira:membership');
      }
    });
    
    // Ontario College of Trades (legacy - now Skilled Trades Ontario)
    this.apis.set('octLegacy', {
      client: this.createSecureClient(
        process.env.OCT_LEGACY_URL || 'https://legacy.collegeoftrades.ca/api',
        { apiKey: process.env.OCT_LEGACY_API_KEY }
      ),
      
      verifyLegacyCertificate: async (memberNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('octLegacy').client.get(
            `/members/${this.sanitizeInput(memberNumber)}/status`
          );
          
          return {
            found: response.status === 200,
            legacyStatus: response.data.status,
            transferredToSTO: response.data.transferredToSTO,
            newCertificateNumber: response.data.stoCertificateNumber
          };
        }, 'octLegacy:verify');
      }
    });
    
    // Ontario Ministry of Finance - Tax Debt API
    this.apis.set('ontarioFinance', {
      client: this.createSecureClient(
        process.env.ON_FINANCE_URL || 'https://api.fin.gov.on.ca/tax-verification',
        {
          apiKey: process.env.ON_FINANCE_API_KEY,
          headers: {
            'X-Ontario-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('ontarioFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            corporationNumber: request.businessNumber ? this.extractONCorp(request.businessNumber) : undefined,
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'corporate_income_tax',
              'employer_health_tax',
              'pst', // Pre-HST legacy debts
              'provincial_land_tax',
              'mining_tax',
              'gas_tax',
              'tobacco_tax',
              'beer_wine_tax'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformOntarioTaxDebtResponse(response.data);
        }, 'ontarioFinance:taxDebt', 30000);
      },
      
      getEmployerHealthTax: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ontarioFinance').client.get(
            `/eht/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.ehtAccountNumber,
            payrollThreshold: response.data.annualPayrollThreshold,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate
          };
        }, 'ontarioFinance:eht');
      },
      
      getPSTLegacyDebt: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ontarioFinance').client.get(
            `/pst-legacy/${this.sanitizeInput(businessNumber)}/balance`
          );
          
          if (response.status === 404) {
            return { hasLegacyDebt: false, balance: 0 };
          }
          
          return {
            hasLegacyDebt: true,
            balance: response.data.totalOwing,
            oldestDebt: response.data.oldestAssessmentDate,
            underCollections: response.data.collectionsStatus === 'active'
          };
        }, 'ontarioFinance:pstLegacy');
      }
    });
  }
  
  /**
   * Main verification method for Ontario
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
      
      // Add industry association check if applicable
      if (this.isConstructionIndustry(request)) {
        verificationTasks.push(this.verifyCIRAMembership(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, ciraResult] = results;
      
      // Calculate confidence
      const confidence = this.calculateConfidence(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'ON',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: ciraResult?.status === 'fulfilled' ? ciraResult.value : null
        },
        confidence,
        errors: this.extractErrors(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Ontario verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Ontario
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for business
      const searchResults = await this.apis.get('ontarioRegistry').searchBusiness(
        businessName,
        businessNumber
      );
      
      if (!searchResults.results || searchResults.results.length === 0) {
        return {
          found: false,
          message: 'Business not found in Ontario Business Registry'
        };
      }
      
      // Get detailed profile for the best match
      const business = searchResults.results[0];
      const profile = await this.apis.get('ontarioRegistry').getBusinessProfile(
        business.businessId
      );
      
      return {
        found: true,
        businessId: profile.businessId,
        businessNumber: profile.businessNumber,
        corporationNumber: profile.ontarioCorporationNumber,
        legalName: profile.legalName,
        operatingName: profile.operatingName,
        status: profile.status,
        registrationDate: profile.registrationDate,
        lastFilingDate: profile.lastFilingDate,
        businessType: profile.businessType,
        naicsCode: profile.naicsCode,
        registeredAddress: {
          street: profile.registeredAddress.street,
          city: profile.registeredAddress.city,
          province: 'ON',
          postalCode: profile.registeredAddress.postalCode
        },
        directors: profile.directors?.length || 0,
        filingStatus: {
          annualReturn: profile.annualReturnFiled,
          corporateTax: profile.corporateTaxFiled,
          upToDate: profile.filingsUpToDate
        }
      };
    } catch (error) {
      throw new Error(`Ontario Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WSIB compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map to WSIB account number
      const wsibAccount = await this.mapToWSIBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('wsib').verifyClearance(wsibAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WSIB account found',
          required: true,
          registrationRequired: true
        };
      }
      
      const isCompliant = clearance.clearanceStatus === 'CLEAR';
      
      return {
        compliant: isCompliant,
        clearanceNumber: clearance.clearanceCertificateNumber,
        accountNumber: clearance.accountNumber,
        legalName: clearance.businessLegalName,
        issueDate: clearance.issueDate,
        expiryDate: clearance.expiryDate,
        rateGroup: clearance.rateGroup,
        experienceRating: clearance.experienceRating,
        neerProgram: clearance.neer,
        cad7Status: clearance.cad7,
        safetyMetrics: {
          experienceRating: clearance.experienceRating,
          performanceIndex: this.calculatePerformanceIndex(clearance),
          recommendation: this.getSafetyRecommendation(clearance)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WSIB verification failed: ${error.message}`
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
    
    const ontarioWorkers = workers.filter(w => 
      w.provinces.includes('ON') || 
      w.certifications.some(c => c.province === 'ON')
    );
    
    if (ontarioWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Ontario workers to verify' };
    }
    
    const verificationPromises = ontarioWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'ON' || cert.redSeal)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for legacy OCT certificates that need updating
    const legacyChecks = await this.checkLegacyCertificates(results);
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: ontarioWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      compulsoryTrades: this.getOntarioCompulsoryTrades(results),
      legacyCertificates: legacyChecks
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
      // First try Skilled Trades Ontario
      const stoResult = await this.apis.get('skilledTradesON').verifyCertificate(
        certification.number,
        certification.type
      );
      
      // If not found, check legacy OCT system
      if (!stoResult.valid && certification.number.startsWith('OCT')) {
        const legacyResult = await this.apis.get('octLegacy').verifyLegacyCertificate(
          certification.number
        );
        
        if (legacyResult.found && legacyResult.transferredToSTO) {
          // Retry with new certificate number
          const newResult = await this.apis.get('skilledTradesON').verifyCertificate(
            legacyResult.newCertificateNumber
          );
          
          return {
            workerName: worker.name,
            certificationType: certification.type,
            certificateNumber: legacyResult.newCertificateNumber,
            originalNumber: certification.number,
            valid: newResult.valid,
            trade: newResult.trade,
            class: newResult.class,
            redSeal: newResult.redSealEndorsement,
            status: newResult.status,
            legacyTransfer: true,
            expiryDate: newResult.expiryDate
          };
        }
      }
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: stoResult.valid,
        trade: stoResult.trade,
        scope: stoResult.scope,
        class: stoResult.class,
        redSeal: stoResult.redSealEndorsement,
        status: stoResult.status,
        restrictions: stoResult.restrictions,
        expiryDate: stoResult.expiryDate,
        compulsoryTrade: this.isCompulsoryTradeON(stoResult.trade)
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
   * Verify CIRA membership
   */
  private async verifyCIRAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('onCira').checkMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Construction & Industrial Relations Association (Ontario)',
        isMember: membership.isMember,
        membershipType: membership.membershipType,
        memberSince: membership.memberSince,
        laborRelationsStatus: membership.laborRelationsStatus,
        collectiveAgreements: membership.collectiveAgreements,
        benefits: membership.isMember ? [
          'Labor relations support',
          'Collective bargaining',
          'Industry advocacy',
          'Training programs'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'ON-CIRA',
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
      const response = await this.apis.get('ontarioRegistry').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if business is in construction industry
   */
  private isConstructionIndustry(request: VerificationRequest): boolean {
    const constructionNAICS = ['236', '237', '238']; // Construction NAICS codes
    const constructionKeywords = [
      'construction', 'contracting', 'builder', 'contractor',
      'electrical', 'plumbing', 'hvac', 'roofing'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionWorkers = request.workers?.some(worker =>
      worker.trades.some(trade => this.isConstructionTrade(trade))
    );
    
    return hasConstructionKeyword || hasConstructionWorkers || false;
  }
  
  /**
   * Check if trade is construction-related
   */
  private isConstructionTrade(trade: string): boolean {
    const constructionTrades = [
      'electrician', 'plumber', 'carpenter', 'roofer',
      'hvac', 'sheet metal worker', 'ironworker', 'painter',
      'drywall', 'glazier', 'insulator', 'mason'
    ];
    
    return constructionTrades.some(ct => trade.toLowerCase().includes(ct));
  }
  
  /**
   * Map business identifier to WSIB account
   */
  private async mapToWSIBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WSIB format (9 digits)
    if (businessIdentifier.match(/^\d{9}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 9) {
      return digits.substring(0, 9);
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': '123456789',
      '987654321RC0001': '987654321'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Calculate performance index from WSIB data
   */
  private calculatePerformanceIndex(clearance: any): number {
    const baseRating = clearance.experienceRating || 1.0;
    const neerAdjustment = clearance.neer ? 0.1 : 0;
    
    return Math.max(0, 2 - baseRating - neerAdjustment);
  }
  
  /**
   * Get safety recommendation based on metrics
   */
  private getSafetyRecommendation(clearance: any): string {
    const rating = clearance.experienceRating || 1.0;
    
    if (rating <= 0.7) return 'Excellent safety performance - maintain current programs';
    if (rating <= 0.9) return 'Good safety performance - consider NEER program';
    if (rating <= 1.1) return 'Average safety performance - review safety procedures';
    if (rating <= 1.3) return 'Below average - implement safety improvements';
    return 'Poor safety performance - immediate action required';
  }
  
  /**
   * Check for legacy OCT certificates
   */
  private async checkLegacyCertificates(results: PromiseSettledResult<any>[]): Promise<any> {
    const legacyCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.legacyTransfer
    ).length;
    
    return {
      found: legacyCount > 0,
      count: legacyCount,
      message: legacyCount > 0 ? 
        'Some certificates were transferred from Ontario College of Trades to Skilled Trades Ontario' : 
        'All certificates are current'
    };
  }
  
  /**
   * Check if trade is compulsory in Ontario
   */
  private isCompulsoryTradeON(trade: string): boolean {
    const compulsoryTrades = [
      'electrician — construction and maintenance',
      'electrician — domestic and rural',
      'plumber',
      'refrigeration and air conditioning systems mechanic',
      'residential air conditioning systems mechanic',
      'sheet metal worker',
      'steamfitter',
      'automotive service technician',
      'truck and coach technician',
      'hairstylist',
      'early childhood educator'
    ];
    
    return compulsoryTrades.some(ct => 
      trade.toLowerCase().includes(ct.toLowerCase())
    );
  }
  
  /**
   * Get Ontario compulsory trades from results
   */
  private getOntarioCompulsoryTrades(results: PromiseSettledResult<any>[]): string[] {
    return results
      .filter(r => r.status === 'fulfilled' && r.value.compulsoryTrade)
      .map(r => (r as PromiseFulfilledResult<any>).value.trade)
      .filter((trade, index, self) => self.indexOf(trade) === index);
  }
  
  /**
   * Validate Ontario Registry response
   */
  private validateOntarioRegistryResponse(data: any): any {
    const schema = z.object({
      results: z.array(z.object({
        businessId: z.string(),
        businessName: z.string(),
        businessNumber: z.string().optional(),
        ontarioCorporationNumber: z.string().optional(),
        status: z.string(),
        businessType: z.string(),
        registrationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchCriteria: z.object({
        businessName: z.string().optional(),
        businessNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate business profile response
   */
  private validateBusinessProfile(data: any): any {
    const schema = z.object({
      businessId: z.string(),
      businessNumber: z.string().optional(),
      ontarioCorporationNumber: z.string().optional(),
      legalName: z.string(),
      operatingName: z.string().optional(),
      status: z.string(),
      registrationDate: z.string(),
      lastFilingDate: z.string().optional(),
      businessType: z.string(),
      naicsCode: z.string().optional(),
      registeredAddress: z.object({
        street: z.string(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string()
      }),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional(),
      annualReturnFiled: z.boolean(),
      corporateTaxFiled: z.boolean(),
      filingsUpToDate: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify Ontario tax debt
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
        province: 'ON',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, ehtResult, pstLegacyResult] = await Promise.allSettled([
        this.apis.get('ontarioFinance').verifyTaxDebt(request),
        this.apis.get('ontarioFinance').getEmployerHealthTax(request.businessNumber),
        this.apis.get('ontarioFinance').getPSTLegacyDebt(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'ON',
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
      
      // Add EHT data
      if (ehtResult.status === 'fulfilled' && ehtResult.value.registered) {
        const ehtDebt = ehtResult.value.outstandingBalance || 0;
        if (ehtDebt > 0) {
          provincialTaxDebt.employerHealthTax = {
            items: [{
              taxType: 'Employer Health Tax',
              amountOwing: ehtDebt,
              originalAmount: ehtDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: ehtResult.value.accountNumber
            }],
            totalOwing: ehtDebt,
            accountNumber: ehtResult.value.accountNumber,
            payrollThreshold: ehtResult.value.payrollThreshold,
            filingFrequency: ehtResult.value.filingFrequency
          };
          provincialTaxDebt.totalProvincialOwing += ehtDebt;
        }
      }
      
      // Add PST legacy debt
      if (pstLegacyResult.status === 'fulfilled' && pstLegacyResult.value.hasLegacyDebt) {
        const pstDebt = pstLegacyResult.value.balance;
        if (!provincialTaxDebt.salesTax) {
          provincialTaxDebt.salesTax = {
            items: [],
            totalOwing: 0,
            taxType: 'PST'
          };
        }
        provincialTaxDebt.salesTax.items.push({
          taxType: 'PST (Legacy)',
          amountOwing: pstDebt,
          originalAmount: pstDebt,
          penaltiesInterest: 0,
          periodStart: new Date('2010-01-01'),
          periodEnd: new Date('2010-06-30'),
          dueDate: new Date('2010-07-31'),
          filingStatus: 'filed',
          note: 'Pre-HST debt from before July 2010'
        });
        provincialTaxDebt.salesTax.totalOwing += pstDebt;
        provincialTaxDebt.totalProvincialOwing += pstDebt;
        
        if (pstLegacyResult.value.underCollections) {
          provincialTaxDebt.collectionsStatus = {
            stage: 'collections',
            totalUnderCollections: pstDebt,
            actions: [{
              actionType: 'collections',
              actionDate: new Date(),
              actionNumber: 'PST-LEGACY-001',
              amount: pstDebt,
              status: 'active'
            }],
            priorityLevel: 'high'
          };
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateOntarioTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'ON',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:ON:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'ON',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`Ontario tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform Ontario tax debt response
   */
  private transformOntarioTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'ON',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformOntarioAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // Special taxes (mining, gas, tobacco, etc.)
    const specialTaxes: TaxDebtItem[] = [];
    let specialTaxTotal = 0;
    
    ['miningTax', 'gasTax', 'tobaccoTax', 'beerWineTax', 'landTransferTax'].forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxes.push(...data[taxKey].assessments.map((assessment: any) => ({
          ...this.transformOntarioAssessment(assessment),
          taxType: taxName
        })));
        specialTaxTotal += data[taxKey].totalBalance;
      }
    });
    
    if (specialTaxes.length > 0) {
      result.otherProvincialTaxes = {
        items: specialTaxes,
        totalOwing: specialTaxTotal,
        types: [...new Set(specialTaxes.map(t => t.taxType))]
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
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform Ontario assessment
   */
  private transformOntarioAssessment(assessment: any): TaxDebtItem {
    return {
      taxType: assessment.taxType || 'Provincial Corporate Tax',
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
      taxType: filingHistory.taxType || 'Corporate Tax',
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
   * Calculate Ontario-specific risk score
   */
  private calculateOntarioTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 250000) riskScore += 40;
    else if (totalOwing > 100000) riskScore += 30;
    else if (totalOwing > 50000) riskScore += 20;
    else if (totalOwing > 10000) riskScore += 10;
    else riskScore += 5;
    
    // EHT factor (0-20 points) - Critical for employers
    if (taxDebt.employerHealthTax?.totalOwing > 0) {
      riskScore += Math.min(20, taxDebt.employerHealthTax.totalOwing / 10000);
    }
    
    // Filing compliance (0-20 points)
    if (taxDebt.filingCompliance && !taxDebt.filingCompliance.overallCompliant) {
      riskScore += 20;
    }
    
    // Collections (0-15 points)
    if (taxDebt.collectionsStatus) {
      switch (taxDebt.collectionsStatus.stage) {
        case 'legal_action': riskScore += 15; break;
        case 'collections': riskScore += 12; break;
        case 'demand': riskScore += 8; break;
        case 'notice': riskScore += 5; break;
      }
    }
    
    // PST legacy debt (0-5 points)
    const hasPSTLegacy = taxDebt.salesTax?.items.some(
      item => item.taxType.includes('Legacy')
    );
    if (hasPSTLegacy) riskScore += 5;
    
    return Math.min(100, riskScore);
  }
  
  /**
   * Extract Ontario corporation number
   */
  private extractONCorp(businessNumber: string): string | undefined {
    // Ontario corporation numbers are typically embedded in business numbers
    // Format: 123456789RC0001 might map to ON corp number
    // This is a simplified extraction
    if (businessNumber.length >= 9) {
      return businessNumber.substring(0, 9);
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
          'tax-debt:audit-log:ON',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Ontario tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}