/**
 * Prince Edward Island Provincial Verification Agent
 * 
 * @module PrinceEdwardIslandAgent
 * @description Verifies businesses in Prince Edward Island through provincial registries
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
 * Prince Edward Island verification agent
 * Integrates with Corporate Registry PEI, WCB PEI, and Skills PEI
 */
export class PrinceEdwardIslandAgent extends BaseProvincialAgent {
  constructor() {
    super('PE');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Prince Edward Island-specific APIs
   */
  private initializeAPIs(): void {
    // Corporate Registry Services PEI
    this.apis.set('corporateRegistryPEI', {
      client: this.createSecureClient(
        process.env.PEI_CORP_REGISTRY_URL || 'https://www.gov.pe.ca/corporateregistry/api',
        {
          apiKey: process.env.PEI_CORP_REGISTRY_API_KEY,
          headers: {
            'X-PEI-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Registry-Version': '2.0'
          }
        }
      ),
      
      searchCorporation: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateRegistryPEI').client.post('/corporations/search', {
            searchCriteria: {
              corporationName: this.sanitizeInput(name),
              corporationNumber: number ? this.sanitizeInput(number) : undefined,
              businessNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'In Good Standing'],
              includeExtraprovincial: false, // PEI corporations only
              searchType: 'comprehensive'
            },
            maxResults: 50
          });
          
          return this.validateCorporateRegistryResponse(response.data);
        }, 'corporateRegistryPEI:search');
      },
      
      getCorporationDetails: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateRegistryPEI').client.get(
            `/corporations/${this.sanitizeInput(corporationNumber)}/details`
          );
          
          return this.validateCorporationDetails(response.data);
        }, 'corporateRegistryPEI:details');
      },
      
      getAnnualReturnStatus: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporateRegistryPEI').client.get(
            `/corporations/${this.sanitizeInput(corporationNumber)}/annual-returns`
          );
          
          return {
            upToDate: response.data.currentYear === new Date().getFullYear(),
            lastFilingYear: response.data.lastFiling,
            outstandingYears: response.data.outstandingFilings || [],
            penaltiesOwed: response.data.penalties || 0
          };
        }, 'corporateRegistryPEI:annualReturns');
      }
    });
    
    // Workers Compensation Board of PEI
    this.apis.set('wcbPEI', {
      client: this.createSecureClient(
        process.env.WCB_PEI_URL || 'https://wcb.pe.ca/api',
        {
          apiKey: process.env.WCB_PEI_API_KEY,
          headers: {
            'X-WCBPEI-Version': '2.0',
            'Accept': 'application/json',
            'X-Atlantic-Harmonization': 'enabled'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbPEI').client.post('/employers/clearance', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationScope: 'full',
            includeAssessmentHistory: true,
            includeAtlanticAgreements: true,
            includeSafetyPrograms: true
          });
          
          if (response.status === 404) {
            return { 
              inGoodStanding: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            inGoodStanding: response.data.clearanceStatus === 'Current',
            clearanceCertificateNumber: response.data.certificateNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryClass: response.data.industryClassification,
            assessmentRate: response.data.currentRate || 1.89, // 2025 PEI average
            experienceModifier: response.data.experienceModifier || 1.0,
            accountExists: true,
            payrollCovered: response.data.assessablePayroll,
            safetyPrograms: response.data.activeSafetyPrograms || [],
            atlanticClearanceValid: response.data.atlanticRecognition,
            smallEmployerDiscount: response.data.smallEmployerRate // PEI's small employer program
          };
        }, 'wcbPEI:clearance');
      },
      
      getSafetyIncentives: async (industryClass: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbPEI').client.get(
            `/safety/incentives/${this.sanitizeInput(industryClass)}`
          );
          
          return {
            availablePrograms: response.data.programs || [],
            rebateEligible: response.data.rebatePrograms || [],
            safeWorkplaceCertification: response.data.safeWorkplace,
            maritimeCooperation: response.data.maritimePrograms // Regional cooperation
          };
        }, 'wcbPEI:safety');
      }
    });
    
    // Skills PEI (formerly Holland College - Apprenticeship & Trades)
    this.apis.set('skillsPEI', {
      client: this.createSecureClient(
        process.env.SKILLS_PEI_URL || 'https://skillspei.com/api',
        {
          apiKey: process.env.SKILLS_PEI_API_KEY,
          headers: {
            'X-SkillsPEI-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Atlantic-Trades': 'enabled'
          }
        }
      ),
      
      verifyTradeCertificate: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('skillsPEI').client.post('/trades/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeAtlanticMobility: true,
            includeIslandPrograms: true // PEI-specific programs
          });
          
          return {
            valid: response.data.isActive,
            certificateType: response.data.certificationType,
            tradeName: response.data.trade,
            journeypersonLevel: response.data.level,
            redSealCertified: response.data.hasRedSeal,
            atlanticTradesCertified: response.data.atlanticTrades,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            renewalDate: response.data.renewalDate ? new Date(response.data.renewalDate) : undefined,
            status: response.data.status,
            islandInnovationProgram: response.data.innovationTrack, // PEI innovation focus
            ruralTradesInitiative: response.data.ruralProgram
          };
        }, 'skillsPEI:certificate');
      },
      
      checkApprenticeshipStatus: async (apprenticeId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('skillsPEI').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeId)}/status`
          );
          
          return {
            active: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            sponsorEmployer: response.data.employer,
            hoursCompleted: response.data.hoursLogged,
            hoursRequired: response.data.totalHoursRequired,
            technicalTraining: response.data.schoolComponent,
            workExperience: response.data.workComponent,
            ruralApprentice: response.data.ruralProgram,
            indigenousSupport: response.data.indigenousProgram
          };
        }, 'skillsPEI:apprentice');
      }
    });
    
    // Construction Association of PEI (CAPEI)
    this.apis.set('capei', {
      client: this.createSecureClient(
        process.env.CAPEI_URL || 'https://capei.ca/api',
        { 
          apiKey: process.env.CAPEI_API_KEY,
          headers: {
            'X-CAPEI-Version': '1.5'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('capei').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeISNetD: true, // Island Safety Net Database
            includeSkillsPartnership: true,
            includeLocalPreference: true // PEI local preference programs
          });
          
          return {
            isMember: response.data.activeMember,
            membershipClass: response.data.membershipType,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            isNetDCertified: response.data.isNetDStatus, // Island Safety Net Database
            skillsPartnership: response.data.skillsProgram,
            localPreferenceEligible: response.data.localPreference,
            safetyRating: response.data.safetyScore,
            bondingCapacity: response.data.bondingLimit,
            yearRoundEmployment: response.data.yearRoundEmployer // Important for seasonal economy
          };
        }, 'capei:membership');
      }
    });
    
    // PEI Department of Finance - Tax Debt Verification
    this.apis.set('peiFinance', {
      client: this.createSecureClient(
        process.env.PEI_FINANCE_URL || 'https://www.princeedwardisland.ca/finance/api',
        {
          apiKey: process.env.PEI_FINANCE_API_KEY,
          headers: {
            'X-PEI-Finance-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Finance-Version': '2.0'
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('peiFinance').client.post('/tax/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            corporationNumber: this.sanitizeInput(request.businessIdentifier || ''),
            consentToken: request.consentToken,
            verificationScope: 'comprehensive',
            includePST: true,
            includePropertyTax: true,
            includeEducationTax: true,
            includeGasTax: true,
            includeHealthLevies: true,
            includeEnvironmentalFees: true,
            includePaymentArrangements: true,
            includeIslandSpecificTaxes: true
          });
          
          return this.validateTaxDebtResponse(response.data);
        }, 'peiFinance:taxDebt');
      },
      
      getComplianceStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('peiFinance').client.get(
            `/tax/compliance/${this.sanitizeInput(businessNumber)}`
          );
          
          return {
            filingCompliance: response.data.filingStatus,
            paymentCompliance: response.data.paymentStatus,
            outstandingReturns: response.data.missingReturns || [],
            lastFilingDate: response.data.lastFiling,
            complianceScore: response.data.score
          };
        }, 'peiFinance:compliance');
      }
    });
    
    // Mi'kmaq Confederacy of PEI - Indigenous Business Registry
    this.apis.set('mcpei', {
      client: this.createSecureClient(
        process.env.MCPEI_URL || 'https://mcpei.ca/api',
        { apiKey: process.env.MCPEI_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mcpei').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            registrationNumber: response.data.mcpeiNumber,
            ownershipPercentage: response.data.indigenousOwnership,
            firstNationAffiliation: response.data.community,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            islandPreference: response.data.islandBusiness,
            capacityLevel: response.data.businessCapacity,
            seasonalOperations: response.data.seasonalBusiness // Important for PEI economy
          };
        }, 'mcpei:verify');
      }
    });
  }
  
  /**
   * Main verification method for Prince Edward Island
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
      
      // Add CAPEI membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyCAPEIMembership(request.businessName));
      }
      
      // Add Mi'kmaq Confederacy verification if Indigenous-indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyMCPEICertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, capeiResult, mcpeiResult] = results;
      
      // Calculate confidence with island-specific factors
      const confidence = this.calculateConfidenceWithIslandFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'PE',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: capeiResult?.status === 'fulfilled' ? capeiResult.value : null,
          indigenousCertification: mcpeiResult?.status === 'fulfilled' ? mcpeiResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        atlanticHarmonization: this.checkAtlanticHarmonization(results),
        islandEconomyFactors: this.checkIslandEconomyFactors(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Prince Edward Island verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Prince Edward Island
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search in Corporate Registry PEI
      const searchResults = await this.apis.get('corporateRegistryPEI').searchCorporation(
        businessName,
        businessNumber
      );
      
      if (!searchResults.corporations || searchResults.corporations.length === 0) {
        return {
          found: false,
          message: 'Business not found in Prince Edward Island Corporate Registry'
        };
      }
      
      // Get detailed information for the first match
      const corporation = searchResults.corporations[0];
      const details = await this.apis.get('corporateRegistryPEI').getCorporationDetails(
        corporation.corporationNumber
      );
      
      // Get annual return status
      const annualReturnStatus = await this.apis.get('corporateRegistryPEI').getAnnualReturnStatus(
        corporation.corporationNumber
      );
      
      return {
        found: true,
        corporationNumber: details.corporationNumber,
        legalName: details.legalName,
        businessName: details.businessName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredOfficeAddress,
          city: details.city,
          province: 'PE',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shares: details.authorizedShares,
        lastAnnualReturn: annualReturnStatus.lastFilingYear,
        goodStanding: details.inGoodStanding && annualReturnStatus.upToDate,
        annualReturnsUpToDate: annualReturnStatus.upToDate,
        outstandingFilings: annualReturnStatus.outstandingYears,
        penaltiesOwed: annualReturnStatus.penaltiesOwed,
        businessNumber: details.businessNumber,
        islandBusiness: details.principalPlaceOfBusiness?.includes('PE') || true
      };
    } catch (error) {
      throw new Error(`PEI Corporate Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WCB PEI compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map to WCB PEI account number
      const wcbAccount = await this.mapToWCBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('wcbPEI').verifyClearance(wcbAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WCB PEI account found',
          required: true
        };
      }
      
      // Get safety incentives information
      let safetyIncentives = null;
      if (clearance.industryClass) {
        try {
          safetyIncentives = await this.apis.get('wcbPEI').getSafetyIncentives(
            clearance.industryClass
          );
        } catch (error) {
          // Safety incentives are optional
        }
      }
      
      return {
        compliant: clearance.inGoodStanding,
        clearanceNumber: clearance.clearanceCertificateNumber,
        issueDate: clearance.issueDate,
        expiryDate: clearance.expiryDate,
        industryClass: clearance.industryClass,
        assessmentRate: clearance.assessmentRate,
        experienceModifier: clearance.experienceModifier,
        payrollCovered: clearance.payrollCovered,
        safetyPrograms: clearance.safetyPrograms,
        atlanticClearanceValid: clearance.atlanticClearanceValid,
        smallEmployerDiscount: clearance.smallEmployerDiscount,
        safetyMetrics: {
          rateComparison: this.compareToProvincialRate(clearance.assessmentRate),
          experienceModifier: this.interpretExperienceModifier(clearance.experienceModifier),
          safetyPrograms: clearance.safetyPrograms,
          rebateEligibility: safetyIncentives?.rebateEligible || [],
          recommendation: this.getSafetyRecommendation(clearance, safetyIncentives)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WCB PEI verification failed: ${error.message}`
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
    
    const peiWorkers = workers.filter(w => 
      w.provinces.includes('PE') || 
      w.certifications.some(c => c.province === 'PE')
    );
    
    if (peiWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Prince Edward Island workers to verify' };
    }
    
    const verificationPromises = peiWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'PE' || cert.redSeal || cert.atlanticCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(peiWorkers);
    
    // Count specific certification types
    const redSealCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.redSealCertified
    ).length;
    
    const atlanticCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.atlanticTradesCertified
    ).length;
    
    const islandInnovationCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.islandInnovationProgram
    ).length;
    
    const ruralTradesCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.ruralTradesInitiative
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: peiWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      redSealCertified: redSealCount,
      atlanticTradesCertified: atlanticCount,
      islandPrograms: {
        innovationTrack: islandInnovationCount,
        ruralTrades: ruralTradesCount,
        totalParticipants: islandInnovationCount + ruralTradesCount
      },
      ruralWorkforceSupport: this.assessRuralWorkforce(results, apprenticeChecks)
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
      const certResult = await this.apis.get('skillsPEI').verifyTradeCertificate(
        certification.number,
        certification.type
      );
      
      return {
        workerName: worker.name,
        certificationType: certification.type,
        certificateNumber: certification.number,
        valid: certResult.valid,
        level: certResult.journeypersonLevel,
        redSealCertified: certResult.redSealCertified,
        atlanticTradesCertified: certResult.atlanticTradesCertified,
        status: certResult.status,
        trade: certResult.tradeName,
        islandInnovationProgram: certResult.islandInnovationProgram,
        ruralTradesInitiative: certResult.ruralTradesInitiative,
        renewalDate: certResult.renewalDate || certification.expiry
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
   * Verify CAPEI membership
   */
  private async verifyCAPEIMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('capei').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Construction Association of Prince Edward Island',
        isMember: membership.isMember,
        membershipClass: membership.membershipClass,
        memberSince: membership.memberSince,
        isNetDCertified: membership.isNetDCertified,
        skillsPartnership: membership.skillsPartnership,
        localPreferenceEligible: membership.localPreferenceEligible,
        safetyRating: membership.safetyRating,
        bondingCapacity: membership.bondingCapacity,
        yearRoundEmployment: membership.yearRoundEmployment,
        benefits: membership.isMember ? [
          'Island Safety Net Database (ISNetD) certification',
          'Skills PEI partnership programs',
          'Local preference procurement eligibility',
          'Year-round employment incentives',
          'Atlantic construction mobility',
          'Group insurance and bonding'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'CAPEI',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify MCPEI certification
   */
  private async verifyMCPEICertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('mcpei').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Mi\'kmaq Confederacy of Prince Edward Island',
        verified: certification.verified,
        registrationNumber: certification.registrationNumber,
        ownershipPercentage: certification.ownershipPercentage,
        firstNationAffiliation: certification.firstNationAffiliation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        islandPreference: certification.islandPreference,
        capacityLevel: certification.capacityLevel,
        seasonalOperations: certification.seasonalOperations,
        eligibleForSetAsides: certification.ownershipPercentage >= 51,
        mikmaqNation: true,
        atlanticIndigenousNetwork: true
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'MCPEI',
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
      const response = await this.apis.get('corporateRegistryPEI').client.get('/health');
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
      'plumbing', 'hvac', 'roofing', 'concrete', 'excavation',
      'foundation', 'renovation', 'residential', 'commercial'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'mason', 'roofer',
         'hvac technician', 'concrete finisher', 'excavator operator'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'mi\'kmaq', 'mikmaq', 'indigenous', 'aboriginal', 
      'native', 'band', 'nation', 'tribal', 'lennox island', 'abegweit'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WCB account
   */
  private async mapToWCBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WCB PEI account format
    if (businessIdentifier.match(/^PE\d{5,7}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 5) {
      return `PE${digits.substring(0, 5)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'PE12345',
      '987654321RC0001': 'PE98765'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to provincial average rate
   */
  private compareToProvincialRate(rate: number): string {
    const provincialAverage = 1.89; // 2025 PEI average
    const difference = ((rate - provincialAverage) / provincialAverage) * 100;
    
    if (difference < -20) return `${Math.abs(difference).toFixed(1)}% below provincial average (excellent)`;
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (very good)`;
    if (difference < -5) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 5) return `Within ${Math.abs(difference).toFixed(1)}% of average`;
    if (difference < 15) return `${difference.toFixed(1)}% above average (monitor)`;
    return `${difference.toFixed(1)}% above average (improvement needed)`;
  }
  
  /**
   * Interpret experience modifier
   */
  private interpretExperienceModifier(modifier: number): string {
    if (modifier < 0.8) return `${modifier.toFixed(2)} - Excellent safety record (significant discount)`;
    if (modifier < 1.0) return `${modifier.toFixed(2)} - Good safety record (discount applied)`;
    if (modifier === 1.0) return `${modifier.toFixed(2)} - Average safety record (standard rate)`;
    if (modifier <= 1.2) return `${modifier.toFixed(2)} - Below average safety record (surcharge)`;
    return `${modifier.toFixed(2)} - Poor safety record (significant surcharge)`;
  }
  
  /**
   * Get safety recommendation
   */
  private getSafetyRecommendation(clearance: any, safetyIncentives: any): string {
    const rate = clearance.assessmentRate || 1.89;
    const modifier = clearance.experienceModifier || 1.0;
    const hasPrograms = clearance.safetyPrograms?.length > 0;
    
    if (rate <= 1.51 && modifier <= 0.9 && hasPrograms) {
      return 'Outstanding safety performance - eligible for maximum rebates and mentorship opportunities';
    }
    if (rate <= 1.89 && modifier <= 1.0) {
      const rebates = safetyIncentives?.rebateEligible?.slice(0, 2).join(', ') || 'safety rebate programs';
      return hasPrograms ? 
        `Good safety performance - maintain programs and consider ${rebates}` :
        `Good performance - enroll in safety programs for additional rebates`;
    }
    if (rate <= 2.27) {
      return 'Average performance - implement Safe Workplace Certification and join industry safety group';
    }
    return 'High risk profile - mandatory safety consultation and immediate program enrollment required';
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
        ruralApprentices: 0,
        indigenousSupport: 0 
      };
    }
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeIds.map(id => this.apis.get('skillsPEI').checkApprenticeshipStatus(id))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.active
    );
    
    const ruralApprentices = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.ruralApprentice
    ).length;
    
    const indigenousSupport = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousSupport
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      ruralApprentices: ruralApprentices,
      indigenousSupport: indigenousSupport,
      yearRoundPrograms: this.assessYearRoundPrograms(activeApprentices)
    };
  }
  
  /**
   * Calculate confidence with island-specific factors
   */
  private calculateConfidenceWithIslandFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for island business status
    const isIslandBusiness = results.some(r => 
      r.status === 'fulfilled' && 
      (r.value.islandBusiness || r.value.islandPreference)
    );
    
    // Boost for year-round employment
    const hasYearRoundEmployment = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.yearRoundEmployment
    );
    
    // Boost for rural programs
    const hasRuralPrograms = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.ruralWorkforceSupport?.active
    );
    
    let adjustedConfidence = baseConfidence;
    if (isIslandBusiness) adjustedConfidence += 3;
    if (hasYearRoundEmployment) adjustedConfidence += 2;
    if (hasRuralPrograms) adjustedConfidence += 2;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Check Atlantic harmonization
   */
  private checkAtlanticHarmonization(results: PromiseSettledResult<any>[]): any {
    const tradeResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticTradesCertified > 0
    );
    
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticClearanceValid
    );
    
    return {
      eligible: !!(tradeResult || safetyResult),
      tradeMobility: tradeResult?.status === 'fulfilled' ? {
        certifiedWorkers: tradeResult.value.atlanticTradesCertified,
        provinces: ['PE', 'NB', 'NS', 'NL', 'MB']
      } : null,
      safetyRecognition: safetyResult?.status === 'fulfilled' && safetyResult.value.atlanticClearanceValid,
      benefits: [
        'Seamless Atlantic provinces worker mobility',
        'WCB clearance reciprocity across Atlantic Canada',
        'Harmonized trade certification standards',
        'Shared apprenticeship programs'
      ]
    };
  }
  
  /**
   * Check island economy factors
   */
  private checkIslandEconomyFactors(results: PromiseSettledResult<any>[]): any {
    const businessResult = results.find(r => 
      r.status === 'fulfilled' && r.value.islandBusiness !== undefined
    );
    
    const membershipResult = results.find(r => 
      r.status === 'fulfilled' && r.value.yearRoundEmployment !== undefined
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.ruralWorkforceSupport
    );
    
    return {
      islandBusiness: businessResult?.status === 'fulfilled' && businessResult.value.islandBusiness,
      yearRoundEmployment: membershipResult?.status === 'fulfilled' && membershipResult.value.yearRoundEmployment,
      ruralWorkforceSupport: tradesResult?.status === 'fulfilled' && tradesResult.value.ruralWorkforceSupport?.active,
      localPreference: results.some(r => 
        r.status === 'fulfilled' && r.value.localPreferenceEligible
      ),
      seasonalConsiderations: {
        adaptable: true,
        winterPrograms: results.some(r => 
          r.status === 'fulfilled' && r.value.seasonalOperations
        ),
        tourishSupport: true // Tourism integration potential
      }
    };
  }
  
  /**
   * Assess rural workforce support
   */
  private assessRuralWorkforce(results: PromiseSettledResult<any>[], apprenticeChecks: any): any {
    const ruralTradesCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.ruralTradesInitiative
    ).length;
    
    const ruralApprentices = apprenticeChecks.ruralApprentices || 0;
    const totalWorkers = results.length;
    
    return {
      active: ruralTradesCount > 0 || ruralApprentices > 0,
      ruralCertifications: ruralTradesCount,
      ruralApprentices: ruralApprentices,
      ruralPercentage: totalWorkers > 0 ? ((ruralTradesCount + ruralApprentices) / totalWorkers * 100).toFixed(0) : 0,
      programs: [
        'Rural Trades Initiative',
        'Mobile Training Units',
        'Distance Learning Programs',
        'Employer Incentives for Rural Training'
      ]
    };
  }
  
  /**
   * Assess year-round programs
   */
  private assessYearRoundPrograms(apprentices: PromiseFulfilledResult<any>[]): number {
    // Count apprentices with year-round training schedules
    return apprentices.filter(r => 
      r.value.technicalTraining?.includes('year-round') ||
      r.value.workExperience?.includes('continuous')
    ).length;
  }
  
  /**
   * Validate Corporate Registry response
   */
  private validateCorporateRegistryResponse(data: any): any {
    const schema = z.object({
      corporations: z.array(z.object({
        corporationNumber: z.string(),
        legalName: z.string(),
        businessName: z.string().optional(),
        status: z.string(),
        entityType: z.string(),
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
   * Validate corporation details
   */
  private validateCorporationDetails(data: any): any {
    const schema = z.object({
      corporationNumber: z.string(),
      legalName: z.string(),
      businessName: z.string().optional(),
      status: z.string(),
      entityType: z.string(),
      incorporationDate: z.string(),
      inGoodStanding: z.boolean(),
      registeredOfficeAddress: z.string(),
      city: z.string(),
      postalCode: z.string(),
      businessNumber: z.string().optional(),
      authorizedShares: z.number().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional(),
      principalPlaceOfBusiness: z.string().optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify tax debt status with PEI Finance
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
      const taxDebtResult = await this.apis.get('peiFinance').verifyTaxDebt(request);
      
      // Get compliance status
      const complianceStatus = await this.apis.get('peiFinance').getComplianceStatus(
        request.businessNumber
      );
      
      // Calculate risk score for PEI
      const riskScore = this.calculatePEITaxDebtRiskScore(taxDebtResult, complianceStatus);
      
      const result: ProvincialTaxDebt = {
        province: 'PE',
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
        `tax-debt:PEI:${request.businessNumber}`,
        result,
        { encrypt: true, ttl: 3600 } // 1 hour TTL for tax data
      );
      
      // Audit log
      await this.auditLog({
        action: 'tax_debt_verification',
        province: 'PE',
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
        province: 'PE',
        businessNumber: request.businessNumber,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`PEI tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate PEI-specific tax debt risk score
   */
  private calculatePEITaxDebtRiskScore(taxDebt: any, compliance: any): number {
    let score = 0;
    
    // Base score on total debt amount
    const totalDebt = taxDebt.totalOwing || 0;
    if (totalDebt === 0) return 0;
    if (totalDebt < 5000) score += 10;
    else if (totalDebt < 25000) score += 25;
    else if (totalDebt < 100000) score += 50;
    else if (totalDebt < 500000) score += 75;
    else score += 90;
    
    // Tax types (island-specific taxes increase risk)
    const hasIslandTaxes = taxDebt.taxDebts?.some((d: any) => 
      ['Property Tax', 'Health Levy', 'Gas Tax', 'Environmental Fee'].includes(d.taxType)
    );
    if (hasIslandTaxes) score += 10;
    
    // Provincial Sales Tax debt
    const hasPSTDebt = taxDebt.taxDebts?.some((d: any) => d.taxType === 'PST');
    if (hasPSTDebt) score += 15;
    
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
    
    // Age of debt
    const oldestDebt = Math.max(...(taxDebt.taxDebts?.map((d: any) => d.daysPastDue) || [0]));
    if (oldestDebt > 365) score += 15;
    else if (oldestDebt > 180) score += 10;
    else if (oldestDebt > 90) score += 5;
    
    // Island economy factors
    const hasSeasonalDebt = taxDebt.taxDebts?.some((d: any) => 
      d.periodStart && new Date(d.periodStart).getMonth() >= 9 // Oct-Dec
    );
    if (hasSeasonalDebt) score -= 5; // Consider seasonal economy impact
    
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