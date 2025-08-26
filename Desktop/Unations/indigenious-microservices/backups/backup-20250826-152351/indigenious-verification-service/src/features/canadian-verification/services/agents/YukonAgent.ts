/**
 * Yukon Territorial Verification Agent
 * 
 * @module YukonAgent
 * @description Verifies businesses in Yukon Territory through territorial registries
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
 * Yukon verification agent
 * Integrates with Corporate Affairs YT, YWCHSB, CYC, YBCA, and Champagne Aishihik FN
 */
export class YukonAgent extends BaseProvincialAgent {
  constructor() {
    super('YT');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Yukon-specific APIs
   */
  private initializeAPIs(): void {
    // Yukon Corporate Affairs
    this.apis.set('corporateAffairs', {
      client: this.createSecureClient(
        process.env.YT_CORPORATE_URL || 'https://www.corporate.gov.yk.ca/api',
        {
          apiKey: process.env.YT_CORPORATE_API_KEY,
          headers: {
            'X-YT-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '2.5'
          }
        }
      ),
      
      searchBusiness: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateAffairs').client.post('/businesses/search', {
            searchCriteria: {
              businessName: this.sanitizeInput(name),
              incorporationNumber: number ? this.sanitizeInput(number) : undefined,
              businessNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'Good Standing'],
              includeExtraProvincialCompanies: true
            },
            maxResults: 75
          });
          
          return this.validateBusinessSearchResponse(response.data);
        }, 'corporateAffairs:search');
      },
      
      getBusinessDetails: async (incorporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateAffairs').client.get(
            `/businesses/${this.sanitizeInput(incorporationNumber)}/details`
          );
          
          return this.validateBusinessDetails(response.data);
        }, 'corporateAffairs:details');
      },
      
      verifyBusinessLicense: async (licenseNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateAffairs').client.get(
            `/licenses/verify/${this.sanitizeInput(licenseNumber)}`
          );
          
          return {
            valid: response.data.isValid,
            licenseType: response.data.licenseCategory,
            issueDate: response.data.issueDate,
            expiryDate: response.data.expiryDate,
            conditions: response.data.conditions || [],
            municipalityIssued: response.data.issuingMunicipality
          };
        }, 'corporateAffairs:license');
      }
    });
    
    // Yukon Workers' Compensation Health and Safety Board (YWCHSB)
    this.apis.set('ywchsb', {
      client: this.createSecureClient(
        process.env.YWCHSB_URL || 'https://www.wcb.yk.ca/api',
        {
          apiKey: process.env.YWCHSB_API_KEY,
          headers: {
            'X-YWCHSB-Version': '3.1',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ywchsb').client.post('/employers/clearance-verification', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeRates: true,
            includeClaimsHistory: true,
            includeNorthernWorkerPrograms: true // Northern/remote worker programs
          });
          
          if (response.status === 404) {
            return { 
              inGoodStanding: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            inGoodStanding: response.data.clearanceStatus === 'Valid',
            clearanceLetterNumber: response.data.clearanceNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.naicsCode,
            rateGroup: response.data.rateGroup,
            assessmentRate: response.data.assessmentRate || 1.92, // 2025 YT average
            experienceRating: response.data.experienceRating,
            accountExists: true,
            claimsHistory: {
              totalClaims: response.data.claimsCount || 0,
              openClaims: response.data.openClaims || 0,
              lostTimeInjuryRate: response.data.ltir || 0
            },
            northernWorkerCompliance: response.data.northernWorkerPrograms,
            remoteWorkSafety: response.data.remoteWorkCompliance
          };
        }, 'ywchsb:clearance');
      },
      
      getNorthernSafetyPrograms: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ywchsb').client.get(
            `/safety/northern-programs/${this.sanitizeInput(industryCode)}`
          );
          
          return {
            coldWeatherPrograms: response.data.coldWeather || [],
            remoteWorksitePrograms: response.data.remoteWorksites || [],
            wildlifeAwarenessPrograms: response.data.wildlifeAwareness || [],
            emergencyResponsePrograms: response.data.emergencyResponse || [],
            northernLivingSupport: response.data.northernLiving || []
          };
        }, 'ywchsb:northernSafety');
      }
    });
    
    // College of Yukon (formerly Yukon College) - Trades & Apprenticeship
    this.apis.set('collegeYukon', {
      client: this.createSecureClient(
        process.env.CYC_URL || 'https://www.yukoncollege.yk.ca/api/trades',
        {
          apiKey: process.env.CYC_API_KEY,
          headers: {
            'X-CYC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Northern-Certification': 'enabled' // Northern trade specializations
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('collegeYukon').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeNorthernSpecialization: true,
            includeMiningSafety: true // Mining industry focus
          });
          
          return {
            valid: response.data.isActive,
            certificationType: response.data.certificationType,
            tradeName: response.data.trade,
            level: response.data.journeypersonLevel,
            redSealEndorsement: response.data.hasRedSeal,
            northernSpecialization: response.data.hasNorthernSpecialization,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            miningCertification: response.data.miningIndustryCertified,
            coldWeatherQualified: response.data.coldWeatherQualified
          };
        }, 'collegeYukon:verifyCertification');
      },
      
      checkApprenticeStatus: async (apprenticeNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('collegeYukon').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeNumber)}/status`
          );
          
          return {
            registered: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            employer: response.data.currentEmployer,
            hoursCompleted: response.data.hoursLogged,
            hoursRequired: response.data.totalHoursRequired,
            technicalTraining: response.data.technicalTrainingStatus,
            northernTraining: response.data.northernSpecializationProgress,
            indigenousProgram: response.data.indigenousApprenticeProgram
          };
        }, 'collegeYukon:checkApprentice');
      }
    });
    
    // Yukon Building Contractors Association (YBCA)
    this.apis.set('ybca', {
      client: this.createSecureClient(
        process.env.YBCA_URL || 'https://ybca.ca/api',
        { 
          apiKey: process.env.YBCA_API_KEY,
          headers: {
            'X-YBCA-Version': '2.0'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ybca').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeBondingInfo: true,
            includeNorthernProjectExperience: true,
            includeIndigenousPartnerships: true
          });
          
          return {
            isMember: response.data.activeMember,
            membershipType: response.data.membershipLevel,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            bondingCapacity: response.data.bondingLimit,
            northernProjectExperience: response.data.northernProjects,
            indigenousPartnership: response.data.indigenousCollaborations,
            coldWeatherConstruction: response.data.coldWeatherExperience,
            remoteSiteExperience: response.data.remoteSiteProjects,
            safetyRating: response.data.safetyScore
          };
        }, 'ybca:verifyMembership');
      }
    });
    
    // Champagne and Aishihik First Nations Development Corporation (represents multiple YT FNs)
    this.apis.set('cafndc', {
      client: this.createSecureClient(
        process.env.CAFNDC_URL || 'https://cafndc.com/api',
        { apiKey: process.env.CAFNDC_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('cafndc').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            certificationNumber: response.data.certNumber,
            indigenousOwnership: response.data.ownershipPercentage,
            firstNationAffiliation: response.data.community,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            capacityLevel: response.data.businessCapacity,
            northernExperience: response.data.northernOperationsExperience,
            landClaimsCompliance: response.data.landClaimsAgreementCompliant
          };
        }, 'cafndc:verifyIndigenous');
      }
    });
    
    // Yukon Department of Finance - Tax Debt Verification
    this.apis.set('ytFinance', {
      client: this.createSecureClient(
        process.env.YT_FINANCE_URL || 'https://yukon.ca/finance/api',
        {
          apiKey: process.env.YT_FINANCE_API_KEY,
          headers: {
            'X-YT-Finance-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Finance-Version': '2.0'
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ytFinance').client.post('/tax/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            corporationNumber: this.sanitizeInput(request.businessIdentifier || ''),
            consentToken: request.consentToken,
            verificationScope: 'comprehensive',
            includePayrollTax: true,
            includeFuelTax: true,
            includeEnvironmentalLevy: true,
            includeMiningRoyalties: true,
            includeFirstNationsTaxes: true, // Self-government tax agreements
            includePropertyTax: true,
            includePaymentArrangements: true,
            includeNorthernLivingAllowances: true // YT specific
          });
          
          return this.validateTaxDebtResponse(response.data);
        }, 'ytFinance:taxDebt');
      },
      
      getComplianceStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ytFinance').client.get(
            `/tax/compliance/${this.sanitizeInput(businessNumber)}`
          );
          
          return {
            filingCompliance: response.data.filingStatus,
            paymentCompliance: response.data.paymentStatus,
            outstandingReturns: response.data.missingReturns || [],
            lastFilingDate: response.data.lastFiling,
            complianceScore: response.data.score,
            miningFilingsRequired: response.data.miningReturns,
            firstNationsFilings: response.data.selfGovernmentFilings
          };
        }, 'ytFinance:compliance');
      }
    });
  }
  
  /**
   * Main verification method for Yukon
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
      
      // Add YBCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyYBCAMembership(request.businessName));
      }
      
      // Add CAFNDC verification if Indigenous-indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyCAFNDCCertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, ybcaResult, cafndcResult] = results;
      
      // Calculate confidence with northern factors
      const confidence = this.calculateConfidenceWithNorthernFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'YT',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: ybcaResult?.status === 'fulfilled' ? ybcaResult.value : null,
          indigenousCertification: cafndcResult?.status === 'fulfilled' ? cafndcResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        northernCapability: this.assessNorthernCapability(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Yukon verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Yukon
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for business in Yukon Corporate Affairs
      const searchResults = await this.apis.get('corporateAffairs').searchBusiness(
        businessName,
        businessNumber
      );
      
      if (!searchResults.businesses || searchResults.businesses.length === 0) {
        return {
          found: false,
          message: 'Business not found in Yukon Corporate Affairs'
        };
      }
      
      // Get detailed information for the first match
      const business = searchResults.businesses[0];
      const details = await this.apis.get('corporateAffairs').getBusinessDetails(
        business.incorporationNumber
      );
      
      // Check for business license if applicable
      let licenseInfo = null;
      if (details.businessLicenseNumber) {
        try {
          licenseInfo = await this.apis.get('corporateAffairs').verifyBusinessLicense(
            details.businessLicenseNumber
          );
        } catch (error) {
          // License verification is optional
        }
      }
      
      return {
        found: true,
        incorporationNumber: details.incorporationNumber,
        legalName: details.legalName,
        tradeName: details.tradeName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          city: details.city,
          territory: 'YT',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        lastAnnualReturnDate: details.lastAnnualReturn,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber,
        businessLicense: licenseInfo,
        extraProvincialRegistration: details.extraProvincialStatus
      };
    } catch (error) {
      throw new Error(`Yukon Corporate Affairs verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify YWCHSB compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to YWCHSB account
      const ywchsbAccount = await this.mapToYWCHSBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('ywchsb').verifyClearance(ywchsbAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No YWCHSB account found',
          required: true
        };
      }
      
      // Get northern safety programs for the industry
      let safetyPrograms = null;
      if (clearance.industryCode) {
        try {
          safetyPrograms = await this.apis.get('ywchsb').getNorthernSafetyPrograms(
            clearance.industryCode
          );
        } catch (error) {
          // Safety programs are optional
        }
      }
      
      return {
        compliant: clearance.inGoodStanding,
        clearanceNumber: clearance.clearanceLetterNumber,
        issueDate: clearance.issueDate,
        expiryDate: clearance.expiryDate,
        industryCode: clearance.industryCode,
        rateGroup: clearance.rateGroup,
        assessmentRate: clearance.assessmentRate,
        experienceRating: clearance.experienceRating,
        claimsHistory: clearance.claimsHistory,
        northernWorkerCompliance: clearance.northernWorkerCompliance,
        remoteWorkSafety: clearance.remoteWorkSafety,
        safetyMetrics: {
          rateComparison: this.compareToTerritorialRate(clearance.assessmentRate),
          lostTimeInjuryRate: clearance.claimsHistory.lostTimeInjuryRate,
          coldWeatherPrograms: safetyPrograms?.coldWeatherPrograms || [],
          remoteWorksitePrograms: safetyPrograms?.remoteWorksitePrograms || [],
          wildlifeAwarenessPrograms: safetyPrograms?.wildlifeAwarenessPrograms || [],
          emergencyResponsePrograms: safetyPrograms?.emergencyResponsePrograms || [],
          recommendation: this.getNorthernSafetyRecommendation(clearance, safetyPrograms)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `YWCHSB verification failed: ${error.message}`
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
    
    const ytWorkers = workers.filter(w => 
      w.provinces.includes('YT') || 
      w.certifications.some(c => c.province === 'YT')
    );
    
    if (ytWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Yukon workers to verify' };
    }
    
    const verificationPromises = ytWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'YT' || cert.redSeal || cert.northernCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(ytWorkers);
    
    // Identify northern specializations and mining certifications
    const northernSpecialized = results.filter(r => 
      r.status === 'fulfilled' && r.value.northernSpecialization
    ).length;
    
    const miningCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.miningCertification
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: ytWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      northernSpecialized: northernSpecialized,
      miningCertified: miningCertified,
      coldWeatherQualified: this.calculateColdWeatherStats(results),
      indigenousProgram: apprenticeChecks.indigenousCount || 0
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
      const certResult = await this.apis.get('collegeYukon').verifyCertification(
        certification.number,
        certification.type
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: certResult.valid,
        level: certResult.level,
        redSeal: certResult.redSealEndorsement,
        northernSpecialization: certResult.northernSpecialization,
        status: certResult.status,
        trade: certResult.tradeName,
        miningCertification: certResult.miningCertification,
        coldWeatherQualified: certResult.coldWeatherQualified,
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
   * Verify YBCA membership
   */
  private async verifyYBCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('ybca').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Yukon Building Contractors Association',
        isMember: membership.isMember,
        membershipType: membership.membershipType,
        memberSince: membership.memberSince,
        bondingCapacity: membership.bondingCapacity,
        northernProjectExperience: membership.northernProjectExperience,
        indigenousPartnership: membership.indigenousPartnership,
        coldWeatherConstruction: membership.coldWeatherConstruction,
        remoteSiteExperience: membership.remoteSiteExperience,
        safetyRating: membership.safetyRating,
        benefits: membership.isMember ? [
          'Northern construction expertise certification',
          'Cold weather construction training',
          'Remote site project management',
          'Indigenous partnership facilitation',
          'Bonding capacity verification',
          'Territory-specific regulatory guidance'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'YBCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify CAFNDC certification
   */
  private async verifyCAFNDCCertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('cafndc').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Champagne and Aishihik First Nations Development Corporation',
        verified: certification.verified,
        certificationNumber: certification.certificationNumber,
        indigenousOwnership: certification.indigenousOwnership,
        firstNationAffiliation: certification.firstNationAffiliation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        capacityLevel: certification.capacityLevel,
        northernExperience: certification.northernExperience,
        landClaimsCompliance: certification.landClaimsCompliance,
        eligibleForSetAsides: certification.indigenousOwnership >= 51,
        territorialNetwork: true // Part of Yukon Indigenous business network
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'CAFNDC',
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
      const response = await this.apis.get('corporateAffairs').client.get('/health');
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
      'excavation', 'masonry', 'carpentry', 'mining'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator', 'mason',
         'paver', 'crane operator', 'miner', 'blaster'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'première nation', 'champagne', 'aishihik', 'vuntut gwitchin',
      'tr\'ondëk hwëch\'in', 'white river', 'little salmon', 'indigenous', 
      'aboriginal', 'native', 'band', 'nation', 'tribal', 'gwitchin', 'han'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to YWCHSB account
   */
  private async mapToYWCHSBAccount(businessIdentifier: string): Promise<string> {
    // Check if already YWCHSB account number format
    if (businessIdentifier.match(/^Y\d{5,7}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 5) {
      return `Y${digits.substring(0, 5)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'Y12345',
      '987654321RC0001': 'Y98765'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to territorial average rate
   */
  private compareToTerritorialRate(rate: number): string {
    const territorialAverage = 1.92; // 2025 YT average
    const difference = ((rate - territorialAverage) / territorialAverage) * 100;
    
    if (difference < -20) return `${Math.abs(difference).toFixed(1)}% below territorial average (excellent)`;
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (very good)`;
    if (difference < 0) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 10) return `${difference.toFixed(1)}% above average (monitor)`;
    if (difference < 20) return `${difference.toFixed(1)}% above average (review needed)`;
    return `${difference.toFixed(1)}% above average (immediate action required)`;
  }
  
  /**
   * Get northern safety recommendation
   */
  private getNorthernSafetyRecommendation(clearance: any, safetyPrograms: any): string {
    const rate = clearance.assessmentRate || 1.92;
    const ltir = clearance.claimsHistory?.lostTimeInjuryRate || 0;
    
    if (rate <= 1.54 && ltir < 1) {
      return 'Excellent safety performance - consider mentoring other northern operators';
    }
    if (rate <= 1.92 && ltir < 2) {
      const programs = safetyPrograms?.coldWeatherPrograms?.slice(0, 2).join(', ') || 'cold weather safety programs';
      return `Good safety performance - eligible for ${programs}`;
    }
    if (rate <= 2.30) {
      const mandatory = safetyPrograms?.remoteWorksitePrograms?.[0] || 'remote worksite safety system';
      return `Average performance - implement ${mandatory} and wildlife awareness training`;
    }
    return 'High risk profile - mandatory northern safety consultant and emergency response plan required';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeNumbers = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.toLowerCase().includes('apprentice'))
      .map(c => c.number);
    
    if (apprenticeNumbers.length === 0) return { count: 0, details: [], indigenousCount: 0 };
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeNumbers.map(num => this.apis.get('collegeYukon').checkApprenticeStatus(num))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.registered
    );
    
    const indigenousProgram = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousProgram
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      indigenousCount: indigenousProgram,
      northernTraining: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.northernTraining
      ).length
    };
  }
  
  /**
   * Calculate confidence with northern factors
   */
  private calculateConfidenceWithNorthernFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for northern specialization
    const hasNorthernSpecialized = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.northernSpecialized > 0
    );
    
    // Boost for land claims compliance
    const hasLandClaimsCompliance = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.landClaimsCompliance
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasNorthernSpecialized) adjustedConfidence += 5;
    if (hasLandClaimsCompliance) adjustedConfidence += 3;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Assess northern capability
   */
  private assessNorthernCapability(results: PromiseSettledResult<any>[]): any {
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.northernWorkerCompliance
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.northernSpecialized
    );
    
    const constructionResult = results.find(r => 
      r.status === 'fulfilled' && r.value.northernProjectExperience
    );
    
    return {
      ready: !!(safetyResult || tradesResult || constructionResult),
      safetyCompliant: safetyResult?.status === 'fulfilled' && safetyResult.value.northernWorkerCompliance,
      specializedWorkers: tradesResult?.status === 'fulfilled' ? tradesResult.value.northernSpecialized : 0,
      projectExperience: constructionResult?.status === 'fulfilled' && constructionResult.value.northernProjectExperience,
      capabilities: [
        'Cold weather construction operations (-40°C)',
        'Remote site project management',
        'Wildlife awareness and mitigation',
        'Emergency response in isolated locations',
        'Land claims agreement compliance',
        'Indigenous partnership protocols'
      ]
    };
  }
  
  /**
   * Calculate cold weather statistics
   */
  private calculateColdWeatherStats(results: PromiseSettledResult<any>[]): string {
    const total = results.length;
    const coldWeatherQualified = results.filter(r => 
      r.status === 'fulfilled' && r.value.coldWeatherQualified
    ).length;
    
    const percentage = total > 0 ? (coldWeatherQualified / total) * 100 : 0;
    return `${percentage.toFixed(0)}% cold weather qualified`;
  }
  
  /**
   * Validate business search response
   */
  private validateBusinessSearchResponse(data: any): any {
    const schema = z.object({
      businesses: z.array(z.object({
        incorporationNumber: z.string(),
        businessName: z.string(),
        status: z.string(),
        entityType: z.string(),
        incorporationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchCriteria: z.object({
        businessName: z.string().optional(),
        incorporationNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate business details
   */
  private validateBusinessDetails(data: any): any {
    const schema = z.object({
      incorporationNumber: z.string(),
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
      businessLicenseNumber: z.string().optional(),
      lastAnnualReturn: z.string().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional(),
      shareholders: z.array(z.object({
        name: z.string(),
        shareClass: z.string(),
        numberOfShares: z.number()
      })).optional(),
      extraProvincialStatus: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify tax debt status with YT Finance
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<ProvincialTaxDebt> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Validate consent
      if (!request.consentToken) {
        throw new Error('Consent token required for tax debt verification');
      }
      
      // Get tax debt information
      const taxDebtResult = await this.apis.get('ytFinance').verifyTaxDebt(request);
      
      // Get compliance status
      const complianceStatus = await this.apis.get('ytFinance').getComplianceStatus(
        request.businessNumber
      );
      
      // Calculate risk score for YT
      const riskScore = this.calculateYTTaxDebtRiskScore(taxDebtResult, complianceStatus);
      
      const result: ProvincialTaxDebt = {
        province: 'YT',
        verificationId,
        timestamp: new Date(),
        businessNumber: request.businessNumber,
        totalDebt: taxDebtResult.totalOwing,
        details: {
          items: taxDebtResult.taxDebts.map((debt: any) => ({
            taxType: debt.taxType,
            amountOwing: debt.amountOwing,
            originalAmount: debt.originalAmount,
            penaltiesInterest: debt.penaltiesInterest,
            periodStart: new Date(debt.periodStart),
            periodEnd: new Date(debt.periodEnd),
            dueDate: new Date(debt.dueDate),
            daysPastDue: debt.daysPastDue,
            status: debt.status,
            assessmentNumber: debt.assessmentNumber,
            collectionStatus: debt.collectionStatus
          })),
          paymentArrangements: taxDebtResult.paymentArrangements,
          collectionsStatus: taxDebtResult.collectionsStatus,
          lastPaymentDate: taxDebtResult.lastPaymentDate ? new Date(taxDebtResult.lastPaymentDate) : undefined,
          filingCompliance: complianceStatus
        },
        riskScore,
        verificationStatus: 'completed',
        dataFreshness: new Date(),
        processingTime: Date.now() - startTime
      };
      
      // Cache result with encryption
      await this.cacheResult(
        `tax-debt:YT:${request.businessNumber}`,
        result,
        { encrypt: true, ttl: 3600 } // 1 hour TTL for tax data
      );
      
      // Audit log
      await this.auditLog({
        action: 'tax_debt_verification',
        province: 'YT',
        businessNumber: request.businessNumber,
        result: {
          totalDebt: result.totalDebt,
          riskScore: result.riskScore,
          hasDebt: result.totalDebt > 0
        },
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      await this.auditLog({
        action: 'tax_debt_verification_failed',
        province: 'YT',
        businessNumber: request.businessNumber,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`YT tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate YT-specific tax debt risk score
   */
  private calculateYTTaxDebtRiskScore(taxDebt: any, compliance: any): number {
    let score = 0;
    
    // Base score on total debt amount
    const totalDebt = taxDebt.totalOwing || 0;
    if (totalDebt === 0) return 0;
    if (totalDebt < 5000) score += 10;
    else if (totalDebt < 25000) score += 25;
    else if (totalDebt < 100000) score += 50;
    else if (totalDebt < 500000) score += 75;
    else score += 90;
    
    // Mining royalties debt (critical for YT economy)
    const hasMiningDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Mining Royalty' || d.taxType === 'Quartz Mining Tax'
    );
    if (hasMiningDebt) score += 20;
    
    // First Nations tax debt (self-government agreements)
    const hasFirstNationsDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType.includes('First Nation') || d.taxType.includes('Self-Government')
    );
    if (hasFirstNationsDebt) score += 15;
    
    // Fuel tax debt
    const hasFuelTaxDebt = taxDebt.taxDebts?.some((d: any) => d.taxType === 'Fuel Tax');
    if (hasFuelTaxDebt) score += 10;
    
    // Collections status
    if (taxDebt.collectionsStatus === 'Active Collections') score += 20;
    else if (taxDebt.collectionsStatus === 'Pre-Collections') score += 10;
    
    // Payment arrangements
    if (taxDebt.paymentArrangements?.active) {
      score -= 10; // Reduce risk if payment arrangement exists
      if (taxDebt.paymentArrangements.inGoodStanding) score -= 5;
    }
    
    // Filing compliance
    if (compliance.filingCompliance === 'Non-Compliant') score += 15;
    else if (compliance.filingCompliance === 'Partially Compliant') score += 7;
    
    // Mining filing requirements
    if (compliance.miningFilingsRequired && compliance.filingCompliance !== 'Compliant') {
      score += 10; // Additional risk for missing mining filings
    }
    
    // Age of debt
    const oldestDebt = Math.max(...(taxDebt.taxDebts?.map((d: any) => d.daysPastDue) || [0]));
    if (oldestDebt > 365) score += 15;
    else if (oldestDebt > 180) score += 10;
    else if (oldestDebt > 90) score += 5;
    
    // Northern considerations
    const hasNorthernAllowanceDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Northern Living Allowance' || d.taxType === 'Remote Work Tax'
    );
    if (hasNorthernAllowanceDebt && oldestDebt < 180) score -= 5; // Consider northern challenges
    
    return Math.min(Math.max(score, 0), 100);
  }
  
  /**
   * Validate tax debt response
   */
  private validateTaxDebtResponse(data: any): any {
    const schema = z.object({
      businessNumber: z.string(),
      verificationDate: z.string(),
      totalOwing: z.number().min(0),
      taxDebts: z.array(z.object({
        taxType: z.string(),
        amountOwing: z.number().min(0),
        originalAmount: z.number().min(0),
        penaltiesInterest: z.number().min(0),
        periodStart: z.string(),
        periodEnd: z.string(),
        dueDate: z.string(),
        daysPastDue: z.number(),
        status: z.string(),
        assessmentNumber: z.string(),
        collectionStatus: z.string().optional()
      })),
      paymentArrangements: z.object({
        active: z.boolean(),
        inGoodStanding: z.boolean().optional(),
        monthlyAmount: z.number().optional(),
        remainingPayments: z.number().optional()
      }).optional(),
      collectionsStatus: z.string(),
      lastPaymentDate: z.string().optional(),
      consentValid: z.boolean()
    });
    
    return schema.parse(data);
  }
}
