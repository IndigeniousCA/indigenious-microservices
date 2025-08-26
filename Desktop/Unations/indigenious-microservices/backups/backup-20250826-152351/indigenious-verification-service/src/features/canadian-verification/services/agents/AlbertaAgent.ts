/**
 * Alberta Provincial Verification Agent
 * 
 * @module AlbertaAgent
 * @description Verifies businesses in Alberta through provincial registries
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
 * Alberta verification agent
 * Integrates with Alberta Corporate Registry, WCB Alberta, and trade authorities
 */
export class AlbertaAgent extends BaseProvincialAgent {
  constructor() {
    super('AB');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Alberta-specific APIs
   */
  private initializeAPIs(): void {
    // Alberta Corporate Registry
    this.apis.set('albertaRegistry', {
      client: this.createSecureClient(
        process.env.AB_REGISTRY_URL || 'https://www.alberta.ca/api/registry',
        {
          apiKey: process.env.AB_REGISTRY_API_KEY,
          headers: {
            'X-Registry-Version': '3.0',
            'Accept': 'application/json'
          }
        }
      ),
      
      searchCorporation: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('albertaRegistry').client.post('/corporations/search', {
            searchCriteria: {
              corporationName: this.sanitizeInput(name),
              corporationNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'Active - Non-compliant']
            },
            includeDetails: true
          });
          
          return this.validateAlbertaRegistryResponse(response.data);
        }, 'albertaRegistry:search');
      },
      
      getCorporationDetails: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('albertaRegistry').client.get(
            `/corporations/${this.sanitizeInput(corporationNumber)}/details`
          );
          
          return this.validateCorporationDetails(response.data);
        }, 'albertaRegistry:details');
      }
    });
    
    // Workers' Compensation Board Alberta
    this.apis.set('wcbAlberta', {
      client: this.createSecureClient(
        process.env.WCB_AB_URL || 'https://www.wcb.ab.ca/api',
        {
          apiKey: process.env.WCB_AB_API_KEY,
          headers: {
            'X-WCB-Partner': 'IndigenousProcurement',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbAlberta').client.get(
            `/clearance/verify/${this.sanitizeInput(accountNumber)}`
          );
          
          if (response.status === 404) {
            return { 
              inGoodStanding: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            inGoodStanding: response.data.accountStatus === 'In Good Standing',
            clearanceNumber: response.data.clearanceLetterNumber,
            effectiveDate: new Date(response.data.effectiveDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.industryCode,
            premiumRate: response.data.premiumRate,
            experienceRating: response.data.experienceRating,
            accountExists: true
          };
        }, 'wcbAlberta:clearance');
      }
    });
    
    // Alberta Apprenticeship and Industry Training (AIT)
    this.apis.set('ait', {
      client: this.createSecureClient(
        process.env.AIT_AB_URL || 'https://tradesecrets.alberta.ca/api',
        {
          apiKey: process.env.AIT_AB_API_KEY,
          headers: {
            'X-AIT-Version': '2.0'
          }
        }
      ),
      
      verifyJourneyperson: async (certificateNumber: string, trade: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ait').client.post('/verify/journeyperson', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            trade: this.sanitizeInput(trade),
            includeRedSeal: true
          });
          
          return {
            valid: response.data.isValid,
            certificateType: response.data.certificateType,
            trade: response.data.trade,
            level: response.data.level,
            redSealEndorsement: response.data.hasRedSeal,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            status: response.data.status
          };
        }, 'ait:verifyJourneyperson');
      }
    });
    
    // Alberta Construction Association
    this.apis.set('aca', {
      client: this.createSecureClient(
        process.env.ACA_URL || 'https://www.albertaconstruction.net/api',
        { apiKey: process.env.ACA_API_KEY }
      ),
      
      verifyMember: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('aca').client.get(
            `/members/verify?name=${encodeURIComponent(this.sanitizeInput(companyName))}`
          );
          
          return {
            isMember: response.data.membershipActive,
            memberSince: response.data.memberSince ? new Date(response.data.memberSince) : undefined,
            certifications: response.data.certifications || [],
            safetyRating: response.data.safetyRating
          };
        }, 'aca:verifyMember');
      }
    });
    
    // Alberta Treasury Board and Finance - Tax Debt API
    this.apis.set('albertaFinance', {
      client: this.createSecureClient(
        process.env.AB_FINANCE_URL || 'https://api.alberta.ca/finance/tax-verification',
        {
          apiKey: process.env.AB_FINANCE_API_KEY,
          headers: {
            'X-Alberta-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('albertaFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            albertaCorporationNumber: request.businessNumber ? this.extractABCorpNumber(request.businessNumber) : undefined,
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'corporate_income_tax',
              'tourism_levy',
              'insurance_premium_tax',
              'fuel_tax',
              'tobacco_tax',
              'carbon_levy',
              'education_property_tax',
              'freehold_mineral_rights_tax',
              'alberta_personal_income_tax' // For sole proprietors
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformAlbertaTaxDebtResponse(response.data);
        }, 'albertaFinance:taxDebt', 30000);
      },
      
      getEducationTaxStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('albertaFinance').client.get(
            `/education-tax/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            liable: response.data.liable,
            accountNumber: response.data.educationTaxAccount,
            propertyAssessments: response.data.assessments || [],
            outstandingBalance: response.data.balance || 0,
            lastAssessmentDate: response.data.lastAssessmentDate
          };
        }, 'albertaFinance:educationTax');
      },
      
      getCarbonLevyAccount: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('albertaFinance').client.get(
            `/carbon-levy/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { applicable: false, registered: false };
          }
          
          return {
            applicable: true,
            registered: true,
            accountNumber: response.data.carbonLevyAccount,
            facilityTypes: response.data.registeredFacilities,
            exemptions: response.data.exemptions || [],
            outstandingBalance: response.data.balance || 0,
            complianceStatus: response.data.complianceStatus
          };
        }, 'albertaFinance:carbonLevy');
      }
    });
  }
  
  /**
   * Main verification method for Alberta
   */
  async verify(request: VerificationRequest): Promise<ProvincialVerificationResult> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Parallel verification tasks
      const verificationTasks = [
        this.verifyBusinessRegistration(request.businessName, request.businessNumber),
        this.verifySafetyCompliance(request.businessNumber || request.businessName),
        this.verifyTradeQualifications(request.workers || [])
      ];
      
      // Add ACA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyACAMembership(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, acaResult] = results;
      
      // Calculate confidence
      const confidence = this.calculateConfidence(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'AB',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: acaResult?.status === 'fulfilled' ? acaResult.value : null
        },
        confidence,
        errors: this.extractErrors(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Alberta verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Alberta
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for corporation
      const searchResults = await this.apis.get('albertaRegistry').searchCorporation(
        businessName,
        businessNumber
      );
      
      if (!searchResults.corporations || searchResults.corporations.length === 0) {
        return {
          found: false,
          message: 'Business not found in Alberta Corporate Registry'
        };
      }
      
      // Get detailed information for the first match
      const corporation = searchResults.corporations[0];
      const details = await this.apis.get('albertaRegistry').getCorporationDetails(
        corporation.corporationNumber
      );
      
      return {
        found: true,
        corporationNumber: details.corporationNumber,
        legalName: details.legalName,
        tradeName: details.tradeName,
        status: details.status,
        incorporationDate: details.incorporationDate,
        businessType: details.businessType,
        registeredOffice: {
          address: details.registeredOffice,
          city: details.city,
          province: 'AB',
          postalCode: details.postalCode
        },
        annualReturnFiled: details.annualReturnFiled,
        lastFilingDate: details.lastFilingDate,
        extraProvincialRegistration: details.extraProvincialStatus
      };
    } catch (error) {
      throw new Error(`Alberta Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WCB Alberta compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WCB account
      const wcbAccount = await this.mapToWCBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('wcbAlberta').verifyClearance(wcbAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WCB account found',
          required: true
        };
      }
      
      return {
        compliant: clearance.inGoodStanding,
        clearanceNumber: clearance.clearanceNumber,
        effectiveDate: clearance.effectiveDate,
        expiryDate: clearance.expiryDate,
        industryCode: clearance.industryCode,
        premiumRate: clearance.premiumRate,
        experienceRating: clearance.experienceRating,
        safetyPerformance: this.assessSafetyPerformance(clearance)
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WCB Alberta verification failed: ${error.message}`
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
    
    const albertaWorkers = workers.filter(w => 
      w.provinces.includes('AB') || 
      w.certifications.some(c => c.province === 'AB')
    );
    
    if (albertaWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Alberta workers to verify' };
    }
    
    const verificationPromises = albertaWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'AB' || cert.redSeal)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: albertaWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      compulsoryTrades: this.identifyCompulsoryTrades(results)
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
      const aitResult = await this.apis.get('ait').verifyJourneyperson(
        certification.number,
        certification.type
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: aitResult.valid,
        level: aitResult.level,
        redSeal: aitResult.redSealEndorsement,
        status: aitResult.status,
        compulsoryTrade: this.isCompulsoryTrade(certification.type),
        expiryDate: certification.expiry
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
   * Verify ACA membership
   */
  private async verifyACAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('aca').verifyMember(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Alberta Construction Association',
        isMember: membership.isMember,
        memberSince: membership.memberSince,
        certifications: membership.certifications,
        safetyRating: membership.safetyRating,
        benefits: membership.isMember ? [
          'COR Certification Support',
          'Safety Training Programs',
          'Industry Advocacy'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'Alberta Construction Association',
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
      const response = await this.apis.get('albertaRegistry').client.get('/health');
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
      'engineering', 'infrastructure', 'civil'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'welder'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Map business identifier to WCB account
   */
  private async mapToWCBAccount(businessIdentifier: string): Promise<string> {
    // In production, this would query a mapping service
    // Check if it's already a WCB account number format
    if (businessIdentifier.match(/^\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': '1234567',
      '987654321RC0001': '9876543'
    };
    
    return mappings[businessIdentifier] || businessIdentifier.substring(0, 7);
  }
  
  /**
   * Assess safety performance based on WCB data
   */
  private assessSafetyPerformance(clearance: any): any {
    const rating = clearance.experienceRating || 1.0;
    
    return {
      rating: rating,
      category: rating <= 0.7 ? 'Excellent' :
                rating <= 0.9 ? 'Above Average' :
                rating <= 1.1 ? 'Average' :
                rating <= 1.3 ? 'Below Average' : 'Poor',
      premiumImpact: `${((rating - 1.0) * 100).toFixed(1)}%`,
      recommendations: rating > 1.1 ? [
        'Consider safety program improvements',
        'Review incident prevention measures',
        'Engage safety consultant'
      ] : []
    };
  }
  
  /**
   * Check if trade is compulsory in Alberta
   */
  private isCompulsoryTrade(trade: string): boolean {
    const compulsoryTrades = [
      'electrician',
      'power system electrician',
      'refrigeration and air conditioning mechanic',
      'plumber',
      'gasfitter',
      'sheet metal worker',
      'steamfitter-pipefitter'
    ];
    
    return compulsoryTrades.includes(trade.toLowerCase());
  }
  
  /**
   * Identify compulsory trades from results
   */
  private identifyCompulsoryTrades(results: PromiseSettledResult<any>[]): string[] {
    return results
      .filter(r => r.status === 'fulfilled' && r.value.compulsoryTrade)
      .map(r => (r as PromiseFulfilledResult<any>).value.certificationType)
      .filter((trade, index, self) => self.indexOf(trade) === index);
  }
  
  /**
   * Validate Alberta Registry response
   */
  private validateAlbertaRegistryResponse(data: any): any {
    const schema = z.object({
      corporations: z.array(z.object({
        corporationNumber: z.string(),
        legalName: z.string(),
        status: z.string(),
        type: z.string(),
        incorporationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchCriteria: z.object({
        corporationName: z.string().optional(),
        corporationNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate corporation details response
   */
  private validateCorporationDetails(data: any): any {
    const schema = z.object({
      corporationNumber: z.string(),
      legalName: z.string(),
      tradeName: z.string().optional(),
      status: z.string(),
      incorporationDate: z.string(),
      businessType: z.string(),
      registeredOffice: z.string(),
      city: z.string(),
      postalCode: z.string(),
      annualReturnFiled: z.boolean(),
      lastFilingDate: z.string().optional(),
      extraProvincialStatus: z.string().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify Alberta tax debt
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
        province: 'AB',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, educationTaxResult, carbonLevyResult] = await Promise.allSettled([
        this.apis.get('albertaFinance').verifyTaxDebt(request),
        this.apis.get('albertaFinance').getEducationTaxStatus(request.businessNumber),
        this.apis.get('albertaFinance').getCarbonLevyAccount(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'AB',
        provincialCorporateTax: undefined,
        salesTax: undefined, // Alberta has no PST
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
      
      // Add Education Tax data
      if (educationTaxResult.status === 'fulfilled' && educationTaxResult.value.liable) {
        const educationDebt = educationTaxResult.value.outstandingBalance || 0;
        if (educationDebt > 0) {
          if (!provincialTaxDebt.otherProvincialTaxes) {
            provincialTaxDebt.otherProvincialTaxes = {
              items: [],
              totalOwing: 0,
              types: []
            };
          }
          provincialTaxDebt.otherProvincialTaxes.items.push({
            taxType: 'Education Property Tax',
            amountOwing: educationDebt,
            originalAmount: educationDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: educationTaxResult.value.accountNumber,
            note: `Properties: ${educationTaxResult.value.propertyAssessments?.length || 0}`
          });
          provincialTaxDebt.otherProvincialTaxes.totalOwing += educationDebt;
          provincialTaxDebt.otherProvincialTaxes.types.push('Education Property Tax');
          provincialTaxDebt.totalProvincialOwing += educationDebt;
        }
      }
      
      // Add Carbon Levy data
      if (carbonLevyResult.status === 'fulfilled' && carbonLevyResult.value.applicable) {
        const carbonDebt = carbonLevyResult.value.outstandingBalance || 0;
        if (carbonDebt > 0) {
          if (!provincialTaxDebt.otherProvincialTaxes) {
            provincialTaxDebt.otherProvincialTaxes = {
              items: [],
              totalOwing: 0,
              types: []
            };
          }
          provincialTaxDebt.otherProvincialTaxes.items.push({
            taxType: 'Carbon Levy',
            amountOwing: carbonDebt,
            originalAmount: carbonDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: carbonLevyResult.value.accountNumber,
            note: `Facilities: ${carbonLevyResult.value.facilityTypes?.join(', ') || 'Various'}`
          });
          provincialTaxDebt.otherProvincialTaxes.totalOwing += carbonDebt;
          provincialTaxDebt.otherProvincialTaxes.types.push('Carbon Levy');
          provincialTaxDebt.totalProvincialOwing += carbonDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateAlbertaTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'AB',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:AB:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'AB',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`Alberta tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform Alberta tax debt response
   */
  private transformAlbertaTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'AB',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformAlbertaAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // Note: Alberta has no PST
    result.salesTax = {
      items: [],
      totalOwing: 0,
      taxType: 'No PST',
      note: 'Alberta does not have a provincial sales tax'
    };
    
    // Special taxes (tourism levy, insurance, fuel, tobacco, etc.)
    const specialTaxes: TaxDebtItem[] = [];
    let specialTaxTotal = 0;
    const specialTaxTypes: string[] = [];
    
    const taxKeys = [
      'tourismLevy', 'insurancePremiumTax', 'fuelTax', 'tobaccoTax',
      'educationPropertyTax', 'freeholdMineralRightsTax', 'carbonLevy'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxTypes.push(taxName);
        specialTaxes.push(...data[taxKey].assessments.map((assessment: any) => ({
          ...this.transformAlbertaAssessment(assessment),
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
    
    // Special programs (Alberta specific)
    if (data.specialPrograms) {
      result.specialPrograms = {
        albertaInvestorTaxCredit: data.specialPrograms.investorTaxCredit,
        scientificResearchCredit: data.specialPrograms.scientificResearchCredit,
        interactiveDigitalMediaCredit: data.specialPrograms.digitalMediaCredit,
        capitalInvestmentTaxCredit: data.specialPrograms.capitalInvestmentCredit
      };
    }
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform Alberta assessment
   */
  private transformAlbertaAssessment(assessment: any): TaxDebtItem {
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
   * Calculate Alberta-specific risk score
   */
  private calculateAlbertaTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 250000) riskScore += 40;
    else if (totalOwing > 100000) riskScore += 30;
    else if (totalOwing > 50000) riskScore += 20;
    else if (totalOwing > 15000) riskScore += 10;
    else riskScore += 5;
    
    // Energy sector taxes (0-20 points) - Critical in Alberta
    const hasEnergyDebt = taxDebt.otherProvincialTaxes?.types.some(
      type => type.includes('Carbon') || type.includes('Fuel') || 
              type.includes('Mineral') || type.includes('Gas')
    );
    if (hasEnergyDebt) {
      riskScore += 20;
    }
    
    // Education tax (0-15 points)
    const hasEducationDebt = taxDebt.otherProvincialTaxes?.types.some(
      type => type.includes('Education')
    );
    if (hasEducationDebt) {
      riskScore += 15;
    }
    
    // Filing compliance (0-15 points)
    if (taxDebt.filingCompliance && !taxDebt.filingCompliance.overallCompliant) {
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
   * Extract Alberta corporation number
   */
  private extractABCorpNumber(businessNumber: string): string | undefined {
    // Alberta corporation numbers are typically embedded
    // This is a simplified extraction
    if (businessNumber.includes('AB')) {
      return businessNumber;
    }
    // Extract from federal business number pattern
    if (businessNumber.length >= 9) {
      return `AB${businessNumber.substring(0, 7)}`;
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
          'tax-debt:audit-log:AB',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Alberta tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}