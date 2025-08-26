/**
 * Nova Scotia Provincial Verification Agent
 * 
 * @module NovaScotiaAgent
 * @description Verifies businesses in Nova Scotia through provincial registries
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
 * Nova Scotia verification agent
 * Integrates with Registry of Joint Stock Companies, WCB Nova Scotia, and NSAA
 */
export class NovaScotiaAgent extends BaseProvincialAgent {
  constructor() {
    super('NS');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Nova Scotia-specific APIs
   */
  private initializeAPIs(): void {
    // Registry of Joint Stock Companies (RJSC)
    this.apis.set('rjsc', {
      client: this.createSecureClient(
        process.env.NS_RJSC_URL || 'https://rjsc.novascotia.ca/api',
        {
          apiKey: process.env.NS_RJSC_API_KEY,
          headers: {
            'X-RJSC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '2.5'
          }
        }
      ),
      
      searchCompany: async (name: string, registryId?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('rjsc').client.post('/companies/search', {
            searchCriteria: {
              companyName: this.sanitizeInput(name),
              registryId: registryId ? this.sanitizeInput(registryId) : undefined,
              businessNumber: registryId ? this.sanitizeInput(registryId) : undefined,
              status: ['Active', 'In Good Standing'],
              includeDissolvedWithin: 0, // Don't include dissolved companies
              searchType: 'all' // Search all entity types
            },
            pageSize: 100
          });
          
          return this.validateRJSCResponse(response.data);
        }, 'rjsc:search');
      },
      
      getCompanyDetails: async (registryId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('rjsc').client.get(
            `/companies/${this.sanitizeInput(registryId)}/details`
          );
          
          return this.validateCompanyDetails(response.data);
        }, 'rjsc:details');
      },
      
      verifyGoodStanding: async (registryId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('rjsc').client.get(
            `/companies/${this.sanitizeInput(registryId)}/standing`
          );
          
          return {
            inGoodStanding: response.data.status === 'Good Standing',
            annualReturnsDue: response.data.outstandingFilings || [],
            lastFilingDate: response.data.lastFilingDate,
            revivalRequired: response.data.requiresRevival || false
          };
        }, 'rjsc:standing');
      }
    });
    
    // Workers' Compensation Board of Nova Scotia
    this.apis.set('wcbNS', {
      client: this.createSecureClient(
        process.env.WCB_NS_URL || 'https://www.wcb.ns.ca/api',
        {
          apiKey: process.env.WCB_NS_API_KEY,
          headers: {
            'X-WCBNS-Version': '3.0',
            'Accept': 'application/json',
            'X-Atlantic-Partner': 'true' // Atlantic harmonization
          }
        }
      ),
      
      verifyAccount: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbNS').client.post('/accounts/verify', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeIndustryComparison: true,
            includeWorkplaceInsurance: true, // NS's Workplace Insurance System
            atlanticReciprocity: true
          });
          
          if (response.status === 404) {
            return { 
              inGoodStanding: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            inGoodStanding: response.data.accountStatus === 'Active',
            clearanceNumber: response.data.clearanceCertificate,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.industryClassification,
            subClass: response.data.subClassification,
            assessmentRate: response.data.rate || 2.65, // 2025 NS average
            experienceRating: response.data.experienceRating || 1.0,
            accountExists: true,
            workplaceInsuranceActive: response.data.wsiActive,
            safetyCertified: response.data.safetyCertification,
            injuryRate: response.data.timeLosstInjuryRate,
            atlanticClearance: response.data.atlanticProvinceClearance
          };
        }, 'wcbNS:account');
      },
      
      getIndustryProfile: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbNS').client.get(
            `/industries/${this.sanitizeInput(industryCode)}/profile`
          );
          
          return {
            averageRate: response.data.industryAverageRate,
            injuryFrequency: response.data.injuryFrequencyRate,
            returnToWorkRate: response.data.rtw,
            safetyCertificationRate: response.data.certificationPercentage,
            bestPractices: response.data.recommendedPractices || []
          };
        }, 'wcbNS:industry');
      }
    });
    
    // Nova Scotia Apprenticeship Agency (NSAA)
    this.apis.set('nsaa', {
      client: this.createSecureClient(
        process.env.NSAA_URL || 'https://nsapprenticeship.ca/api',
        {
          apiKey: process.env.NSAA_API_KEY,
          headers: {
            'X-NSAA-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Atlantic-Mobility': 'enabled'
          }
        }
      ),
      
      verifyCertificate: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nsaa').client.post('/certificates/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            trade: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeAtlanticEndorsement: true,
            includeProgressionDetails: true // Nova Scotia's progression records
          });
          
          return {
            valid: response.data.isValid,
            certificateType: response.data.certificateClass,
            tradeName: response.data.trade,
            level: response.data.certificationLevel,
            redSealEndorsed: response.data.hasRedSeal,
            atlanticEndorsed: response.data.atlanticTradeCertificate,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.currentStatus,
            progressionLevel: response.data.progressionStage,
            diversityPathway: response.data.diversityProgram // Women/Indigenous in trades
          };
        }, 'nsaa:certificate');
      },
      
      checkApprentice: async (apprenticeId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nsaa').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeId)}/profile`
          );
          
          return {
            active: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            employer: response.data.sponsorEmployer,
            hoursLogged: response.data.hoursCompleted,
            hoursRequired: response.data.totalHoursRequired,
            technicalTraining: response.data.technicalTrainingStatus,
            progressionExams: response.data.progressionExamsPassed,
            indigenousPathway: response.data.indigenousApprenticePath,
            womenInTrades: response.data.womenInTradesProgram
          };
        }, 'nsaa:apprentice');
      }
    });
    
    // Construction Association of Nova Scotia (CANS)
    this.apis.set('cans', {
      client: this.createSecureClient(
        process.env.CANS_URL || 'https://cans.ns.ca/api',
        { 
          apiKey: process.env.CANS_API_KEY,
          headers: {
            'X-CANS-Version': '2.0'
          }
        }
      ),
      
      verifyMember: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('cans').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeCorStatus: true,
            includeGoldSeal: true,
            includeIndigenousStatus: true,
            includeSafetyMetrics: true
          });
          
          return {
            isMember: response.data.membershipActive,
            memberClass: response.data.membershipClass,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            corCertified: response.data.hasCOR,
            corExpiryDate: response.data.corExpiry,
            goldSealCertified: response.data.goldSealActive,
            constructionSafetyNova: response.data.csnsMember, // Construction Safety Nova Scotia
            indigenousPartnership: response.data.indigenousBusinessPartner,
            safetyScore: response.data.safetyRating,
            bidCapacity: response.data.bondingCapacity
          };
        }, 'cans:member');
      }
    });
    
    // Mi'kmaq Economic Benefits Office (MEBO) - Indigenous verification
    this.apis.set('mebo', {
      client: this.createSecureClient(
        process.env.MEBO_URL || 'https://meboapi.ca',
        { apiKey: process.env.MEBO_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mebo').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            registrationNumber: response.data.meboNumber,
            ownershipPercentage: response.data.indigenousOwnership,
            communityAffiliation: response.data.mikmaqCommunity,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            benefitAgreementEligible: response.data.ibaEligible,
            capacityLevel: response.data.businessCapacity
          };
        }, 'mebo:verify');
      }
    });
    
    // Nova Scotia Department of Finance and Treasury Board - Tax Debt API
    this.apis.set('nsFinance', {
      client: this.createSecureClient(
        process.env.NS_FINANCE_URL || 'https://api.novascotia.ca/finance/tax-verification',
        {
          apiKey: process.env.NS_FINANCE_API_KEY,
          headers: {
            'X-NS-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('nsFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            nsRegistryId: request.businessNumber ? this.extractNSRegistryId(request.businessNumber) : undefined,
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'hst', // Harmonized Sales Tax
              'corporate_income_tax',
              'deed_transfer_tax',
              'fire_insurance_tax',
              'tobacco_tax',
              'motive_fuel_tax',
              'carbon_tax',
              'insurance_premium_tax',
              'international_fuel_tax_agreement',
              'gaming_tax'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformNSTaxDebtResponse(response.data);
        }, 'nsFinance:taxDebt', 30000);
      },
      
      getHSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nsFinance').client.get(
            `/hst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.hstAccountNumber,
            registrationDate: response.data.registrationDate,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate,
            complianceStatus: response.data.complianceStatus
          };
        }, 'nsFinance:hst');
      },
      
      getDeedTransferTax: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nsFinance').client.get(
            `/deed-transfer/${this.sanitizeInput(businessNumber)}/liability`
          );
          
          if (response.status === 404) {
            return { hasTransactions: false, totalOwing: 0 };
          }
          
          return {
            hasTransactions: true,
            recentTransactions: response.data.transactions || [],
            totalOwing: response.data.outstandingBalance || 0,
            properties: response.data.propertyCount || 0
          };
        }, 'nsFinance:deedTransfer');
      }
    });
  }
  
  /**
   * Main verification method for Nova Scotia
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
      
      // Add CANS membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyCANSMembership(request.businessName));
      }
      
      // Add MEBO verification if Indigenous-indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyMEBOCertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, cansResult, meboResult] = results;
      
      // Calculate confidence with Atlantic and diversity factors
      const confidence = this.calculateConfidenceWithDiversityFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'NS',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: cansResult?.status === 'fulfilled' ? cansResult.value : null,
          indigenousCertification: meboResult?.status === 'fulfilled' ? meboResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        atlanticHarmonization: this.checkAtlanticHarmonization(results),
        diversityPrograms: this.checkDiversityPrograms(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Nova Scotia verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Nova Scotia
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search in Registry of Joint Stock Companies
      const searchResults = await this.apis.get('rjsc').searchCompany(
        businessName,
        businessNumber
      );
      
      if (!searchResults.companies || searchResults.companies.length === 0) {
        return {
          found: false,
          message: 'Business not found in Nova Scotia Registry of Joint Stock Companies'
        };
      }
      
      // Get detailed information for the first match
      const company = searchResults.companies[0];
      const details = await this.apis.get('rjsc').getCompanyDetails(
        company.registryId
      );
      
      // Verify good standing
      const standing = await this.apis.get('rjsc').verifyGoodStanding(
        company.registryId
      );
      
      return {
        found: true,
        registryId: details.registryId,
        legalName: details.legalName,
        businessName: details.businessName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          city: details.city,
          province: 'NS',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        lastAnnualReturnDate: standing.lastFilingDate,
        goodStanding: standing.inGoodStanding,
        annualReturnsDue: standing.annualReturnsDue,
        revivalRequired: standing.revivalRequired,
        businessNumber: details.businessNumber,
        registrationDate: details.registrationDate,
        recognizedAgent: details.recognizedAgent
      };
    } catch (error) {
      throw new Error(`RJSC verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WCB Nova Scotia compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map to WCB account number
      const wcbAccount = await this.mapToWCBAccount(businessIdentifier);
      
      const account = await this.apis.get('wcbNS').verifyAccount(wcbAccount);
      
      if (!account.accountExists) {
        return {
          compliant: false,
          reason: 'No WCB Nova Scotia account found',
          required: true
        };
      }
      
      // Get industry profile for comparison
      let industryProfile = null;
      if (account.industryCode) {
        try {
          industryProfile = await this.apis.get('wcbNS').getIndustryProfile(
            account.industryCode
          );
        } catch (error) {
          // Industry profile is optional
        }
      }
      
      return {
        compliant: account.inGoodStanding,
        clearanceNumber: account.clearanceNumber,
        issueDate: account.issueDate,
        expiryDate: account.expiryDate,
        industryCode: account.industryCode,
        subClass: account.subClass,
        assessmentRate: account.assessmentRate,
        experienceRating: account.experienceRating,
        workplaceInsuranceActive: account.workplaceInsuranceActive,
        safetyCertified: account.safetyCertified,
        injuryRate: account.injuryRate,
        atlanticClearance: account.atlanticClearance,
        safetyMetrics: {
          rateComparison: this.compareToIndustryRate(account.assessmentRate, industryProfile?.averageRate),
          injuryComparison: this.compareInjuryRates(account.injuryRate, industryProfile?.injuryFrequency),
          returnToWorkPerformance: industryProfile?.returnToWorkRate,
          recommendedPractices: industryProfile?.bestPractices || [],
          recommendation: this.getSafetyRecommendation(account, industryProfile)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WCB Nova Scotia verification failed: ${error.message}`
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
    
    const nsWorkers = workers.filter(w => 
      w.provinces.includes('NS') || 
      w.certifications.some(c => c.province === 'NS')
    );
    
    if (nsWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Nova Scotia workers to verify' };
    }
    
    const verificationPromises = nsWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'NS' || cert.redSeal || cert.atlanticCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(nsWorkers);
    
    // Count certifications by type
    const redSealCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.redSealEndorsed
    ).length;
    
    const atlanticCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.atlanticEndorsed
    ).length;
    
    const diversityPathwayCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.diversityPathway
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: nsWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      redSealCertified: redSealCount,
      atlanticCertified: atlanticCount,
      diversityPrograms: {
        participants: diversityPathwayCount,
        womenInTrades: apprenticeChecks.womenInTradesCount || 0,
        indigenousPathway: apprenticeChecks.indigenousPathwayCount || 0
      },
      progressionTracking: this.calculateProgressionStats(results)
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
      const certResult = await this.apis.get('nsaa').verifyCertificate(
        certification.number,
        certification.type
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: certResult.valid,
        level: certResult.level,
        redSealEndorsed: certResult.redSealEndorsed,
        atlanticEndorsed: certResult.atlanticEndorsed,
        status: certResult.status,
        trade: certResult.tradeName,
        progressionLevel: certResult.progressionLevel,
        diversityPathway: certResult.diversityPathway,
        expiryDate: certResult.expiryDate || certification.expiry
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
   * Verify CANS membership
   */
  private async verifyCANSMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('cans').verifyMember(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Construction Association of Nova Scotia',
        isMember: membership.isMember,
        memberClass: membership.memberClass,
        memberSince: membership.memberSince,
        corCertified: membership.corCertified,
        corExpiryDate: membership.corExpiryDate,
        goldSealCertified: membership.goldSealCertified,
        constructionSafetyNova: membership.constructionSafetyNova,
        indigenousPartnership: membership.indigenousPartnership,
        safetyScore: membership.safetyScore,
        bidCapacity: membership.bidCapacity,
        benefits: membership.isMember ? [
          'COR safety certification program',
          'Gold Seal certification support',
          'Construction Safety Nova Scotia membership',
          'Atlantic procurement opportunities',
          'Indigenous partnership programs',
          'Group benefits and insurance',
          'Bonding support services'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'CANS',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify MEBO certification
   */
  private async verifyMEBOCertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('mebo').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Mi\'kmaq Economic Benefits Office',
        verified: certification.verified,
        registrationNumber: certification.registrationNumber,
        ownershipPercentage: certification.ownershipPercentage,
        communityAffiliation: certification.communityAffiliation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        benefitAgreementEligible: certification.benefitAgreementEligible,
        capacityLevel: certification.capacityLevel,
        eligibleForSetAsides: certification.ownershipPercentage >= 51,
        mikmaqNation: true,
        atlanticIndigenousNetwork: true
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'MEBO',
        verified: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('rjsc').client.get('/health');
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
      'engineering', 'infrastructure', 'civil', 'electrical', 
      'plumbing', 'hvac', 'roofing', 'concrete', 'paving',
      'excavation', 'foundation', 'steel', 'scaffolding'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator', 'pipefitter',
         'insulator', 'sheet metal worker', 'scaffolder'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'mi\'kmaq', 'mikmaq', 'mi\'kmaw', 'indigenous',
      'aboriginal', 'native', 'band', 'nation', 'tribal', 'eskasoni',
      'membertou', 'millbrook', 'sipekne\'katik', 'acadia'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WCB account
   */
  private async mapToWCBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WCB account format
    if (businessIdentifier.match(/^NS\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `NS${digits.substring(0, 6)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'NS123456',
      '987654321RC0001': 'NS987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to industry rate
   */
  private compareToIndustryRate(rate: number, industryAverage?: number): string {
    const avgRate = industryAverage || 2.65; // 2025 NS average
    const difference = ((rate - avgRate) / avgRate) * 100;
    
    if (difference < -25) return `${Math.abs(difference).toFixed(1)}% below industry average (exceptional)`;
    if (difference < -15) return `${Math.abs(difference).toFixed(1)}% below average (excellent)`;
    if (difference < -5) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 5) return `Within ${Math.abs(difference).toFixed(1)}% of average`;
    if (difference < 15) return `${difference.toFixed(1)}% above average (attention needed)`;
    return `${difference.toFixed(1)}% above average (improvement required)`;
  }
  
  /**
   * Compare injury rates
   */
  private compareInjuryRates(rate: number, industryRate?: number): string {
    if (!industryRate) return 'No industry comparison available';
    
    const difference = ((rate - industryRate) / industryRate) * 100;
    
    if (rate === 0) return 'Zero injuries - exceptional safety record';
    if (difference < -50) return `${Math.abs(difference).toFixed(0)}% better than industry`;
    if (difference < 0) return `${Math.abs(difference).toFixed(0)}% better than average`;
    if (difference < 50) return `${difference.toFixed(0)}% above average`;
    return `${difference.toFixed(0)}% above average - immediate action required`;
  }
  
  /**
   * Get safety recommendation
   */
  private getSafetyRecommendation(account: any, industryProfile: any): string {
    const rate = account.assessmentRate || 2.65;
    const injuryRate = account.injuryRate || 0;
    const certified = account.safetyCertified;
    
    if (rate <= 2.12 && injuryRate === 0 && certified) {
      return 'Outstanding safety performance - consider becoming a safety mentor in Construction Safety Nova Scotia';
    }
    if (rate <= 2.65 && injuryRate < 2) {
      return certified ? 
        'Good safety performance - maintain certification and consider advanced programs' :
        'Good performance - pursue COR certification for rate reduction';
    }
    if (rate <= 3.18) {
      const practices = industryProfile?.bestPractices?.slice(0, 2).join(', ') || 'safety management system';
      return `Average performance - implement ${practices} and join safety group`;
    }
    return 'High risk profile - mandatory Construction Safety Nova Scotia consultation required';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeIds = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.toLowerCase().includes('apprentice'))
      .map(c => c.number);
    
    if (apprenticeIds.length === 0) {
      return { 
        count: 0, 
        details: [], 
        womenInTradesCount: 0,
        indigenousPathwayCount: 0 
      };
    }
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeIds.map(id => this.apis.get('nsaa').checkApprentice(id))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.active
    );
    
    const womenInTrades = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.womenInTrades
    ).length;
    
    const indigenousPathway = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousPathway
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      womenInTradesCount: womenInTrades,
      indigenousPathwayCount: indigenousPathway,
      progressionExamAverage: this.calculateProgressionAverage(activeApprentices)
    };
  }
  
  /**
   * Calculate confidence with diversity factors
   */
  private calculateConfidenceWithDiversityFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for Atlantic certification
    const hasAtlanticCertification = results.some(r => 
      r.status === 'fulfilled' && 
      (r.value.atlanticCertified > 0 || r.value.atlanticClearance)
    );
    
    // Boost for diversity programs
    const hasDiversityPrograms = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.diversityPrograms?.participants > 0
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasAtlanticCertification) adjustedConfidence += 3;
    if (hasDiversityPrograms) adjustedConfidence += 2;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Check Atlantic harmonization
   */
  private checkAtlanticHarmonization(results: PromiseSettledResult<any>[]): any {
    const tradeResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticCertified > 0
    );
    
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticClearance
    );
    
    return {
      eligible: !!(tradeResult || safetyResult),
      tradeMobility: tradeResult?.status === 'fulfilled' ? {
        certifiedWorkers: tradeResult.value.atlanticCertified,
        provinces: ['NS', 'NB', 'PE', 'NL', 'MB']
      } : null,
      safetyRecognition: safetyResult?.status === 'fulfilled' && safetyResult.value.atlanticClearance,
      benefits: [
        'Full Atlantic provinces worker mobility',
        'WCB clearance reciprocity',
        'Harmonized safety standards',
        'Reduced certification barriers'
      ]
    };
  }
  
  /**
   * Check diversity programs
   */
  private checkDiversityPrograms(results: PromiseSettledResult<any>[]): any {
    const tradeResult = results.find(r => 
      r.status === 'fulfilled' && r.value.diversityPrograms
    );
    
    if (!tradeResult || tradeResult.status !== 'fulfilled') {
      return { active: false };
    }
    
    return {
      active: true,
      womenInTrades: tradeResult.value.diversityPrograms.womenInTrades,
      indigenousPathway: tradeResult.value.diversityPrograms.indigenousPathway,
      totalParticipants: tradeResult.value.diversityPrograms.participants,
      programs: [
        'Women Unlimited NS',
        'Indigenous Apprenticeship Initiative',
        'Techsploration',
        'Skills Canada Nova Scotia'
      ]
    };
  }
  
  /**
   * Calculate progression statistics
   */
  private calculateProgressionStats(results: PromiseSettledResult<any>[]): string {
    const progressionLevels = results
      .filter(r => r.status === 'fulfilled' && r.value.progressionLevel)
      .map(r => (r as PromiseFulfilledResult<any>).value.progressionLevel);
    
    if (progressionLevels.length === 0) return 'No progression data available';
    
    const advanced = progressionLevels.filter(level => 
      ['Journeyperson', 'Advanced', 'Master'].includes(level)
    ).length;
    
    const percentage = (advanced / progressionLevels.length) * 100;
    return `${percentage.toFixed(0)}% at advanced progression level`;
  }
  
  /**
   * Calculate progression exam average
   */
  private calculateProgressionAverage(apprentices: PromiseFulfilledResult<any>[]): number {
    const examCounts = apprentices
      .map(r => r.value.progressionExams || 0)
      .filter(count => count > 0);
    
    if (examCounts.length === 0) return 0;
    
    return examCounts.reduce((sum, count) => sum + count, 0) / examCounts.length;
  }
  
  /**
   * Validate RJSC response
   */
  private validateRJSCResponse(data: any): any {
    const schema = z.object({
      companies: z.array(z.object({
        registryId: z.string(),
        legalName: z.string(),
        businessName: z.string().optional(),
        status: z.string(),
        entityType: z.string(),
        registrationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchCriteria: z.object({
        companyName: z.string().optional(),
        registryId: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate company details
   */
  private validateCompanyDetails(data: any): any {
    const schema = z.object({
      registryId: z.string(),
      legalName: z.string(),
      businessName: z.string().optional(),
      status: z.string(),
      entityType: z.string(),
      incorporationDate: z.string().optional(),
      registrationDate: z.string(),
      registeredAddress: z.string(),
      city: z.string(),
      postalCode: z.string(),
      businessNumber: z.string().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional(),
      shareholders: z.array(z.object({
        name: z.string(),
        shareClass: z.string(),
        shares: z.number()
      })).optional(),
      recognizedAgent: z.string().optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify Nova Scotia tax debt
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
        province: 'NS',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, hstResult, deedTransferResult] = await Promise.allSettled([
        this.apis.get('nsFinance').verifyTaxDebt(request),
        this.apis.get('nsFinance').getHSTStatus(request.businessNumber),
        this.apis.get('nsFinance').getDeedTransferTax(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'NS',
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
      
      // Add HST data
      if (hstResult.status === 'fulfilled' && hstResult.value.registered) {
        const hstDebt = hstResult.value.outstandingBalance || 0;
        if (hstDebt > 0) {
          if (!provincialTaxDebt.salesTax) {
            provincialTaxDebt.salesTax = {
              items: [],
              totalOwing: 0,
              taxType: 'HST'
            };
          }
          provincialTaxDebt.salesTax.items.push({
            taxType: 'Harmonized Sales Tax (HST)',
            amountOwing: hstDebt,
            originalAmount: hstDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: hstResult.value.accountNumber
          });
          provincialTaxDebt.salesTax.totalOwing += hstDebt;
          provincialTaxDebt.salesTax.accountNumber = hstResult.value.accountNumber;
          provincialTaxDebt.salesTax.filingFrequency = hstResult.value.filingFrequency;
          provincialTaxDebt.totalProvincialOwing += hstDebt;
        }
      }
      
      // Add Deed Transfer Tax data
      if (deedTransferResult.status === 'fulfilled' && deedTransferResult.value.hasTransactions) {
        const deedDebt = deedTransferResult.value.totalOwing || 0;
        if (deedDebt > 0) {
          if (!provincialTaxDebt.otherProvincialTaxes) {
            provincialTaxDebt.otherProvincialTaxes = {
              items: [],
              totalOwing: 0,
              types: []
            };
          }
          provincialTaxDebt.otherProvincialTaxes.items.push({
            taxType: 'Deed Transfer Tax',
            amountOwing: deedDebt,
            originalAmount: deedDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            note: `Properties: ${deedTransferResult.value.properties || 0}`
          });
          provincialTaxDebt.otherProvincialTaxes.totalOwing += deedDebt;
          provincialTaxDebt.otherProvincialTaxes.types.push('Deed Transfer Tax');
          provincialTaxDebt.totalProvincialOwing += deedDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateNSTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'NS',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:NS:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'NS',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`Nova Scotia tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform NS tax debt response
   */
  private transformNSTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'NS',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformNSAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // HST (Harmonized Sales Tax)
    if (data.hst && data.hst.totalBalance > 0) {
      result.salesTax = {
        items: data.hst.assessments.map((a: any) => ({
          ...this.transformNSAssessment(a),
          taxType: 'Harmonized Sales Tax (HST)'
        })),
        totalOwing: data.hst.totalBalance,
        taxType: 'HST',
        accountNumber: data.hst.accountNumber,
        filingFrequency: data.hst.filingFrequency
      };
      result.totalProvincialOwing += data.hst.totalBalance;
    }
    
    // Special taxes (deed transfer, insurance, fuel, tobacco, etc.)
    const specialTaxes: TaxDebtItem[] = [];
    let specialTaxTotal = 0;
    const specialTaxTypes: string[] = [];
    
    const taxKeys = [
      'deedTransferTax', 'fireInsuranceTax', 'tobaccoTax', 'motiveFuelTax',
      'carbonTax', 'insurancePremiumTax', 'gamingTax'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxTypes.push(taxName);
        specialTaxes.push(...data[taxKey].assessments.map((assessment: any) => ({
          ...this.transformNSAssessment(assessment),
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
    
    // Special programs (NS specific)
    if (data.specialPrograms) {
      result.specialPrograms = {
        innovationRebateProgram: data.specialPrograms.innovationRebate,
        digitalMediaTaxCredit: data.specialPrograms.digitalMediaCredit,
        capitalInvestmentTaxCredit: data.specialPrograms.capitalInvestmentCredit,
        researchDevelopmentCredit: data.specialPrograms.rdCredit
      };
    }
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform NS assessment
   */
  private transformNSAssessment(assessment: any): TaxDebtItem {
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
   * Calculate NS-specific risk score
   */
  private calculateNSTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 200000) riskScore += 40;
    else if (totalOwing > 75000) riskScore += 30;
    else if (totalOwing > 35000) riskScore += 20;
    else if (totalOwing > 10000) riskScore += 10;
    else riskScore += 5;
    
    // HST factor (0-20 points) - Critical as harmonized province
    if (taxDebt.salesTax?.totalOwing > 0) {
      riskScore += Math.min(20, taxDebt.salesTax.totalOwing / 15000);
    }
    
    // Property tax factor (0-15 points)
    const hasPropertyDebt = taxDebt.otherProvincialTaxes?.types.some(
      type => type.includes('Deed Transfer')
    );
    if (hasPropertyDebt) {
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
   * Extract NS Registry ID
   */
  private extractNSRegistryId(businessNumber: string): string | undefined {
    // NS registry IDs might be embedded or separate
    // This is a simplified extraction
    if (businessNumber.includes('NS')) {
      return businessNumber;
    }
    // Extract from federal business number pattern
    if (businessNumber.length >= 9) {
      return `NS${businessNumber.substring(0, 7)}`;
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
          'tax-debt:audit-log:NS',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Nova Scotia tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}