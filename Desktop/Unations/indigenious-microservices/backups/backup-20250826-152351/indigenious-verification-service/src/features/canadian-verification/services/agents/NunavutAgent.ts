/**
 * Nunavut Territorial Verification Agent
 * 
 * @module NunavutAgent
 * @description Verifies businesses in Nunavut Territory through territorial registries
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
 * Nunavut verification agent
 * Integrates with GN Corporate Registry, WSCC-NU, Nunavut Arctic College, NCA, and NTI
 */
export class NunavutAgent extends BaseProvincialAgent {
  constructor() {
    super('NU');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Nunavut-specific APIs
   */
  private initializeAPIs(): void {
    // Government of Nunavut Corporate Registry
    this.apis.set('gnRegistry', {
      client: this.createSecureClient(
        process.env.GN_REGISTRY_URL || 'https://www.justice.gov.nu.ca/api/corporate',
        {
          apiKey: process.env.GN_REGISTRY_API_KEY,
          headers: {
            'X-GN-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '3.5',
            'Accept-Language': 'en,fr,iu,ikt' // Inuktitut syllabics and Latin support
          }
        }
      ),
      
      searchBusiness: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnRegistry').client.post('/businesses/search', {
            searchCriteria: {
              businessName: this.sanitizeInput(name),
              incorporationNumber: number ? this.sanitizeInput(number) : undefined,
              businessNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'Good Standing'],
              includeInuitFirms: true,
              includeNunangat: true // Inuit homeland designation
            },
            maxResults: 100
          });
          
          return this.validateGNResponse(response.data);
        }, 'gnRegistry:search');
      },
      
      getBusinessDetails: async (incorporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnRegistry').client.get(
            `/businesses/${this.sanitizeInput(incorporationNumber)}/details`
          );
          
          return this.validateBusinessDetails(response.data);
        }, 'gnRegistry:details');
      },
      
      verifyBusinessLicense: async (licenseNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnRegistry').client.get(
            `/licenses/verify/${this.sanitizeInput(licenseNumber)}`
          );
          
          return {
            valid: response.data.isValid,
            licenseType: response.data.licenseCategory,
            issueDate: response.data.issueDate,
            expiryDate: response.data.expiryDate,
            conditions: response.data.conditions || [],
            hamlet: response.data.issuingHamlet,
            nunangat: response.data.nunangat // Inuit homeland status
          };
        }, 'gnRegistry:license');
      }
    });
    
    // Workers' Safety and Compensation Commission - Nunavut (WSCC-NU)
    this.apis.set('wsccnu', {
      client: this.createSecureClient(
        process.env.WSCC_NU_URL || 'https://www.wscc.nu.ca/api',
        {
          apiKey: process.env.WSCC_NU_API_KEY,
          headers: {
            'X-WSCC-NU-Version': '4.0',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wsccnu').client.post('/employers/clearance-verification', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeRates: true,
            includeClaimsHistory: true,
            includeArcticCompliance: true,
            includeSeaLiftOperations: true, // Seasonal supply chain
            includeTraditionalHuntingExemptions: true
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
            assessmentRate: response.data.assessmentRate || 2.85, // 2025 NU average (highest in Canada)
            experienceRating: response.data.experienceRating,
            accountExists: true,
            claimsHistory: {
              totalClaims: response.data.claimsCount || 0,
              openClaims: response.data.openClaims || 0,
              lostTimeInjuryRate: response.data.ltir || 0,
              arcticRelatedClaims: response.data.arcticClaims || 0
            },
            arcticCompliance: response.data.arcticOperationsCompliance,
            seaLiftCompliance: response.data.seaLiftOperationsCompliance,
            traditionalActivitiesExemption: response.data.traditionalHuntingExemption,
            polarBearEncounterProtocol: response.data.polarBearProtocolCompliance
          };
        }, 'wsccnu:clearance');
      },
      
      getArcticSafetyPrograms: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wsccnu').client.get(
            `/safety/arctic-programs/${this.sanitizeInput(industryCode)}`
          );
          
          return {
            extremeArcticPrograms: response.data.extremeArctic || [], // -60°C operations
            polarBearSafetyPrograms: response.data.polarBearSafety || [],
            seaIceSafetyPrograms: response.data.seaIceSafety || [],
            blizzardResponsePrograms: response.data.blizzardResponse || [],
            traditionalKnowledgeSafety: response.data.traditionalKnowledge || [],
            communityEmergencyPrograms: response.data.communityEmergency || [],
            inuktitutSafetyPrograms: response.data.inuktitutPrograms || []
          };
        }, 'wsccnu:arcticSafety');
      }
    });
    
    // Nunavut Arctic College - Trades & Traditional Skills
    this.apis.set('arcticCollege', {
      client: this.createSecureClient(
        process.env.NUNAVUT_ARCTIC_COLLEGE_URL || 'https://www.arcticcollege.ca/api/trades',
        {
          apiKey: process.env.NUNAVUT_ARCTIC_COLLEGE_API_KEY,
          headers: {
            'X-NAC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Inuit-Programs': 'enabled', // Inuit-specific programming
            'X-Traditional-Skills': 'enabled'
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('arcticCollege').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeInuitPrograms: true,
            includeTraditionalSkills: true,
            includeArticMod: true // Arctic modification certifications
          });
          
          return {
            valid: response.data.isActive,
            certificationType: response.data.certificationType,
            tradeName: response.data.trade,
            level: response.data.journeypersonLevel,
            redSealEndorsement: response.data.hasRedSeal,
            inuitProgramCertified: response.data.hasInuitProgram,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            traditionalSkillsCertified: response.data.traditionalSkillsCertified,
            extremeArcticQualified: response.data.extremeArcticQualified, // -60°C rating  
            inuktitutProficiency: response.data.inuktitutLevel,
            articModification: response.data.articModCertified
          };
        }, 'arcticCollege:verifyCertification');
      },
      
      checkApprenticeStatus: async (apprenticeNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('arcticCollege').client.get(
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
            inuitProgram: response.data.inuitApprenticeProgram,
            traditionalSkillsTraining: response.data.traditionalSkillsProgress,
            communityBased: response.data.communityBasedTraining,
            inuktitutInstruction: response.data.inuktitutInstructionLevel
          };
        }, 'arcticCollege:checkApprentice');
      }
    });
    
    // Nunavut Construction Association (NCA)
    this.apis.set('nca', {
      client: this.createSecureClient(
        process.env.NCA_URL || 'https://nunavutconstruction.ca/api',
        { 
          apiKey: process.env.NCA_API_KEY,
          headers: {
            'X-NCA-Version': '3.0'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nca').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeBondingInfo: true,
            includeArcticProjectExperience: true,
            includeSeaLiftOperations: true,
            includeInuitPartnerships: true,
            includeArticMod: true
          });
          
          return {
            isMember: response.data.activeMember,
            membershipType: response.data.membershipLevel,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            bondingCapacity: response.data.bondingLimit,
            arcticProjectExperience: response.data.arcticProjects,
            seaLiftExperience: response.data.seaLiftProjects,
            inuitPartnership: response.data.inuitCollaborations,
            extremeArcticConstruction: response.data.extremeArcticExperience, // -60°C operations
            permafrostConstruction: response.data.permafrostExperience,
            hamletProjectsCompleted: response.data.hamletProjects,
            articModCertified: response.data.articModCertified,
            safetyRating: response.data.safetyScore,
            polarBearProtocolCompliance: response.data.polarBearProtocols
          };
        }, 'nca:verifyMembership');
      }
    });
    
    // Nunavut Tunngavik Incorporated (NTI) - Inuit Business Registry
    this.apis.set('nti', {
      client: this.createSecureClient(
        process.env.NTI_URL || 'https://www.tunngavik.com/api/business',
        { apiKey: process.env.NTI_API_KEY }
      ),
      
      verifyInuitBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nti').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            certificationNumber: response.data.certNumber,
            inuitOwnership: response.data.inuitOwnershipPercentage,
            inuitImpactBenefitAgreementBeneficiary: response.data.iibaStatus,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            capacityLevel: response.data.businessCapacity,
            traditionalKnowledgeIntegration: response.data.traditionalKnowledgeUse,
            nunangat: response.data.nunangat, // Inuit homeland
            landClaimsAgreementCompliance: response.data.landClaimsCompliant,
            inuktitutServices: response.data.inuktitutServiceCapability,
            communityBenefitAgreement: response.data.communityBenefitStatus
          };
        }, 'nti:verifyInuit');
      }
    });
    
    // NU Department of Finance - Tax Debt Verification
    this.apis.set('nuFinance', {
      client: this.createSecureClient(
        process.env.NU_FINANCE_URL || 'https://www.gov.nu.ca/finance/api',
        {
          apiKey: process.env.NU_FINANCE_API_KEY,
          headers: {
            'X-NU-Finance-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Finance-Version': '2.0',
            'Accept-Language': 'en,fr,iu' // Support Inuktitut
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nuFinance').client.post('/tax/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            corporationNumber: this.sanitizeInput(request.businessIdentifier || ''),
            consentToken: request.consentToken,
            verificationScope: 'comprehensive',
            includePayrollTax: true,
            includeFuelTax: true,
            includePropertyTax: true,
            includeTobaccoTax: true, // High rates in NU
            includeMiningRoyalties: true,
            includeEnvironmentalFees: true,
            includeNunavutAgreementTaxes: true, // Land claims agreement
            includePaymentArrangements: true,
            includeRemoteCommunityCharges: true, // Critical for NU
            includeAirTransportTaxes: true // Unique to NU logistics
          });
          
          return this.validateTaxDebtResponse(response.data);
        }, 'nuFinance:taxDebt');
      },
      
      getComplianceStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nuFinance').client.get(
            `/tax/compliance/${this.sanitizeInput(businessNumber)}`
          );
          
          return {
            filingCompliance: response.data.filingStatus,
            paymentCompliance: response.data.paymentStatus,
            outstandingReturns: response.data.missingReturns || [],
            lastFilingDate: response.data.lastFiling,
            complianceScore: response.data.score,
            resourceFilingsRequired: response.data.resourceReturns,
            nunavutAgreementFilings: response.data.landClaimFilings,
            remoteFilingExtensions: response.data.remoteExtensions
          };
        }, 'nuFinance:compliance');
      }
    });
  }
  
  /**
   * Main verification method for Nunavut
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
      
      // Add NCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyNCAMembership(request.businessName));
      }
      
      // Add NTI verification if Inuit-indicated
      if (request.indigenousOwned || this.hasInuitIndicators(request)) {
        verificationTasks.push(this.verifyNTICertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, ncaResult, ntiResult] = results;
      
      // Calculate confidence with extreme arctic factors
      const confidence = this.calculateConfidenceWithExtremeArcticFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'NU',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: ncaResult?.status === 'fulfilled' ? ncaResult.value : null,
          indigenousCertification: ntiResult?.status === 'fulfilled' ? ntiResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        extremeArcticCapability: this.assessExtremeArcticCapability(results),
        inuitBeneficiaryStatus: this.assessInuitBeneficiaryStatus(results),
        multilingualCompliance: true // Official languages: English, French, Inuktitut
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Nunavut verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Nunavut
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for business in GN Registry
      const searchResults = await this.apis.get('gnRegistry').searchBusiness(
        businessName,
        businessNumber
      );
      
      if (!searchResults.businesses || searchResults.businesses.length === 0) {
        return {
          found: false,
          message: 'Business not found in Government of Nunavut Corporate Registry'
        };
      }
      
      // Get detailed information for the first match
      const business = searchResults.businesses[0];
      const details = await this.apis.get('gnRegistry').getBusinessDetails(
        business.incorporationNumber
      );
      
      // Check for business license if applicable
      let licenseInfo = null;
      if (details.businessLicenseNumber) {
        try {
          licenseInfo = await this.apis.get('gnRegistry').verifyBusinessLicense(
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
        inuktitutName: details.inuktitutName, // Official Inuktitut name
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          hamlet: details.hamlet, // Hamlet instead of city
          territory: 'NU',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        lastAnnualReturnDate: details.lastAnnualReturn,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber,
        businessLicense: licenseInfo,
        inuitFirm: details.inuitFirmDesignation,
        nunangat: details.nunangat // Inuit homeland designation
      };
    } catch (error) {
      throw new Error(`Government of Nunavut Corporate Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WSCC-NU compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WSCC-NU account
      const wsccAccount = await this.mapToWSCCNUAccount(businessIdentifier);
      
      const clearance = await this.apis.get('wsccnu').verifyClearance(wsccAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WSCC-NU account found',
          required: true
        };
      }
      
      // Get extreme arctic safety programs for the industry
      let safetyPrograms = null;
      if (clearance.industryCode) {
        try {
          safetyPrograms = await this.apis.get('wsccnu').getArcticSafetyPrograms(
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
        arcticCompliance: clearance.arcticCompliance,
        seaLiftCompliance: clearance.seaLiftCompliance,
        traditionalActivitiesExemption: clearance.traditionalActivitiesExemption,
        polarBearEncounterProtocol: clearance.polarBearEncounterProtocol,
        safetyMetrics: {
          rateComparison: this.compareToTerritorialRate(clearance.assessmentRate),
          lostTimeInjuryRate: clearance.claimsHistory.lostTimeInjuryRate,
          arcticRelatedClaims: clearance.claimsHistory.arcticRelatedClaims,
          extremeArcticPrograms: safetyPrograms?.extremeArcticPrograms || [],
          polarBearSafetyPrograms: safetyPrograms?.polarBearSafetyPrograms || [],
          seaIceSafetyPrograms: safetyPrograms?.seaIceSafetyPrograms || [],
          blizzardResponsePrograms: safetyPrograms?.blizzardResponsePrograms || [],
          traditionalKnowledgeSafety: safetyPrograms?.traditionalKnowledgeSafety || [],
          communityEmergencyPrograms: safetyPrograms?.communityEmergencyPrograms || [],
          inuktitutSafetyPrograms: safetyPrograms?.inuktitutSafetyPrograms || [],
          recommendation: this.getExtremeArcticSafetyRecommendation(clearance, safetyPrograms)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WSCC-NU verification failed: ${error.message}`
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
    
    const nuWorkers = workers.filter(w => 
      w.provinces.includes('NU') || 
      w.certifications.some(c => c.province === 'NU')
    );
    
    if (nuWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Nunavut workers to verify' };
    }
    
    const verificationPromises = nuWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'NU' || cert.redSeal || cert.inuitCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(nuWorkers);
    
    // Identify Inuit programs and traditional skills
    const inuitProgramCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.inuitProgramCertified
    ).length;
    
    const traditionalSkillsCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.traditionalSkillsCertified
    ).length;
    
    const extremeArcticQualified = results.filter(r => 
      r.status === 'fulfilled' && r.value.extremeArcticQualified
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: nuWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      inuitProgramCertified: inuitProgramCertified,
      traditionalSkillsCertified: traditionalSkillsCertified,
      extremeArcticQualified: extremeArcticQualified,
      inuktitutProficiency: this.calculateInuktitutProficiencyStats(results),
      indigenousProgram: apprenticeChecks.inuitCount || 0,
      communityBasedTraining: apprenticeChecks.communityBasedCount || 0
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
      const certResult = await this.apis.get('arcticCollege').verifyCertification(
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
        inuitProgramCertified: certResult.inuitProgramCertified,
        status: certResult.status,
        trade: certResult.tradeName,
        traditionalSkillsCertified: certResult.traditionalSkillsCertified,
        extremeArcticQualified: certResult.extremeArcticQualified,
        inuktitutProficiency: certResult.inuktitutProficiency,
        articModification: certResult.articModification,
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
   * Verify NCA membership
   */
  private async verifyNCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('nca').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Nunavut Construction Association',
        isMember: membership.isMember,
        membershipType: membership.membershipType,
        memberSince: membership.memberSince,
        bondingCapacity: membership.bondingCapacity,
        arcticProjectExperience: membership.arcticProjectExperience,
        seaLiftExperience: membership.seaLiftExperience,
        inuitPartnership: membership.inuitPartnership,
        extremeArcticConstruction: membership.extremeArcticConstruction,
        permafrostConstruction: membership.permafrostConstruction,
        hamletProjectsCompleted: membership.hamletProjectsCompleted,
        articModCertified: membership.articModCertified,
        polarBearProtocolCompliance: membership.polarBearProtocolCompliance,
        safetyRating: membership.safetyRating,
        benefits: membership.isMember ? [
          'Extreme Arctic construction expertise (-60°C)',
          'Permafrost construction and foundation systems',
          'Sea lift logistics and supply chain management',
          'Hamlet-specific project delivery methods',
          'Arctic modification (ArticMod) certification',
          'Polar bear encounter protocol training',
          'Inuit partnership facilitation',
          'Traditional knowledge integration',
          'Inuktitut language support services'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'NCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify NTI Inuit business certification
   */
  private async verifyNTICertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('nti').verifyInuitBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Nunavut Tunngavik Incorporated',
        verified: certification.verified,
        certificationNumber: certification.certificationNumber,
        inuitOwnership: certification.inuitOwnership,
        inuitImpactBenefitAgreementBeneficiary: certification.inuitImpactBenefitAgreementBeneficiary,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        capacityLevel: certification.capacityLevel,
        traditionalKnowledgeIntegration: certification.traditionalKnowledgeIntegration,
        nunangat: certification.nunangat,
        landClaimsAgreementCompliance: certification.landClaimsAgreementCompliance,
        inuktitutServices: certification.inuktitutServices,
        communityBenefitAgreement: certification.communityBenefitAgreement,
        eligibleForSetAsides: certification.inuitOwnership >= 51,
        territorialNetwork: true // Part of Nunavut Inuit business network
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'NTI',
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
      const response = await this.apis.get('gnRegistry').client.get('/health');
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
      'excavation', 'masonry', 'carpentry', 'permafrost',
      'arctic', 'hamlet', 'sealift'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator', 'mason',
         'paver', 'crane operator', 'permafrost specialist'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Inuit indicators
   */
  private hasInuitIndicators(request: VerificationRequest): boolean {
    const inuitKeywords = [
      'inuit', 'nunavut', 'iqaluit', 'nunangat', 'inuktitut',
      'arctic', 'tundra', 'hamlet', 'community', 'traditional',
      'polar', 'sea ice', 'permafrost', 'blizzard'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return inuitKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WSCC-NU account
   */
  private async mapToWSCCNUAccount(businessIdentifier: string): Promise<string> {
    // Check if already WSCC-NU account number format
    if (businessIdentifier.match(/^NU\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `NU${digits.substring(0, 6)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'NU123456',
      '987654321RC0001': 'NU987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to territorial average rate
   */
  private compareToTerritorialRate(rate: number): string {
    const territorialAverage = 2.85; // 2025 NU average (highest in Canada)
    const difference = ((rate - territorialAverage) / territorialAverage) * 100;
    
    if (difference < -20) return `${Math.abs(difference).toFixed(1)}% below territorial average (excellent)`;
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (very good)`;
    if (difference < 0) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 10) return `${difference.toFixed(1)}% above average (monitor)`;
    if (difference < 20) return `${difference.toFixed(1)}% above average (review needed)`;
    return `${difference.toFixed(1)}% above average (immediate action required)`;
  }
  
  /**
   * Get extreme arctic safety recommendation
   */
  private getExtremeArcticSafetyRecommendation(clearance: any, safetyPrograms: any): string {
    const rate = clearance.assessmentRate || 2.85;
    const ltir = clearance.claimsHistory?.lostTimeInjuryRate || 0;
    const arcticClaims = clearance.claimsHistory?.arcticRelatedClaims || 0;
    
    if (rate <= 2.28 && ltir < 1 && arcticClaims === 0) {
      return 'Excellent safety performance - consider extreme arctic operations mentoring program';
    }
    if (rate <= 2.85 && ltir < 2) {
      const programs = safetyPrograms?.extremeArcticPrograms?.slice(0, 2).join(', ') || 'extreme arctic safety programs';
      return `Good safety performance - eligible for ${programs}`;
    }
    if (rate <= 3.42) {
      const mandatory = safetyPrograms?.polarBearSafetyPrograms?.[0] || 'polar bear encounter safety system';
      return `Average performance - implement ${mandatory} and sea ice safety training`;
    }
    if (arcticClaims > 1) {
      return 'High arctic risk profile - mandatory extreme arctic safety consultant and specialized training required';
    }
    return 'High risk profile - mandatory arctic safety consultant, polar bear protocol, and comprehensive emergency response plan required';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeNumbers = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.toLowerCase().includes('apprentice'))
      .map(c => c.number);
    
    if (apprenticeNumbers.length === 0) return { count: 0, details: [], inuitCount: 0, communityBasedCount: 0 };
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeNumbers.map(num => this.apis.get('arcticCollege').checkApprenticeStatus(num))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.registered
    );
    
    const inuitProgram = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.inuitProgram
    ).length;
    
    const communityBased = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.communityBased
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      inuitCount: inuitProgram,
      communityBasedCount: communityBased,
      traditionalSkillsTraining: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.traditionalSkillsTraining
      ).length,
      inuktitutInstruction: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.inuktitutInstruction
      ).length
    };
  }
  
  /**
   * Calculate confidence with extreme arctic factors
   */
  private calculateConfidenceWithExtremeArcticFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for Inuit program certification
    const hasInuitProgram = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.inuitProgramCertified > 0
    );
    
    // Boost for traditional knowledge integration
    const hasTraditionalKnowledge = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.traditionalKnowledgeIntegration
    );
    
    // Boost for Nunangat (Inuit homeland) compliance
    const hasNunangat = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.nunangat
    );
    
    // Boost for IIBA beneficiary status
    const hasIIBA = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.inuitImpactBenefitAgreementBeneficiary
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasInuitProgram) adjustedConfidence += 6;
    if (hasTraditionalKnowledge) adjustedConfidence += 4;
    if (hasNunangat) adjustedConfidence += 5;
    if (hasIIBA) adjustedConfidence += 7;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Assess extreme arctic capability
   */
  private assessExtremeArcticCapability(results: PromiseSettledResult<any>[]): any {
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.arcticCompliance
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.extremeArcticQualified
    );
    
    const constructionResult = results.find(r => 
      r.status === 'fulfilled' && r.value.extremeArcticConstruction
    );
    
    return {
      ready: !!(safetyResult || tradesResult || constructionResult),
      safetyCompliant: safetyResult?.status === 'fulfilled' && safetyResult.value.arcticCompliance,
      specializedWorkers: tradesResult?.status === 'fulfilled' ? tradesResult.value.extremeArcticQualified : 0,
      constructionExperience: constructionResult?.status === 'fulfilled' && constructionResult.value.extremeArcticConstruction,
      capabilities: [
        'Extreme Arctic construction operations (-60°C)',
        'Permafrost foundation systems and thermal management',
        'Sea lift logistics and annual supply delivery',
        'Hamlet-specific project delivery in remote communities',
        'Polar bear encounter protocols and wildlife safety',
        'Sea ice safety and blizzard response procedures',
        'Traditional Inuit knowledge integration',
        'Nunangat (Inuit homeland) regulatory compliance',
        'Inuktitut language service capability',
        'Community emergency response and evacuation'
      ]
    };
  }
  
  /**
   * Assess Inuit beneficiary status
   */
  private assessInuitBeneficiaryStatus(results: PromiseSettledResult<any>[]): any {
    const ntiResult = results.find(r => 
      r.status === 'fulfilled' && r.value.inuitImpactBenefitAgreementBeneficiary !== undefined
    );
    
    const businessResult = results.find(r => 
      r.status === 'fulfilled' && r.value.inuitFirm !== undefined
    );
    
    return {
      iibaStatus: ntiResult?.status === 'fulfilled' ? ntiResult.value.inuitImpactBenefitAgreementBeneficiary : false,
      inuitFirmDesignation: businessResult?.status === 'fulfilled' ? businessResult.value.inuitFirm : false,
      nunangat: ntiResult?.status === 'fulfilled' ? ntiResult.value.nunangat : false,
      benefits: [
        'Priority access to Inuit Impact and Benefit Agreement projects',
        'Preferential procurement status for government contracts',
        'Access to Inuit-specific training and development programs',
        'Traditional knowledge incorporation requirements',
        'Community benefit sharing agreements',
        'Nunangat (Inuit homeland) project preferences'
      ]
    };
  }
  
  /**
   * Calculate Inuktitut proficiency statistics
   */
  private calculateInuktitutProficiencyStats(results: PromiseSettledResult<any>[]): string {
    const total = results.length;
    const inuktitutProficient = results.filter(r => 
      r.status === 'fulfilled' && r.value.inuktitutProficiency
    ).length;
    
    const percentage = total > 0 ? (inuktitutProficient / total) * 100 : 0;
    return `${percentage.toFixed(0)}% Inuktitut proficiency`;
  }
  
  /**
   * Validate GN response
   */
  private validateGNResponse(data: any): any {
    const schema = z.object({
      businesses: z.array(z.object({
        incorporationNumber: z.string(),
        businessName: z.string(),
        inuktitutName: z.string().optional(),
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
      inuktitutName: z.string().optional(),
      status: z.string(),
      entityType: z.string(),
      incorporationDate: z.string(),
      inGoodStanding: z.boolean(),
      registeredAddress: z.string(),
      hamlet: z.string(),
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
      inuitFirmDesignation: z.boolean(),
      nunangat: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify tax debt status with NU Finance
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
      const taxDebtResult = await this.apis.get('nuFinance').verifyTaxDebt(request);
      
      // Get compliance status
      const complianceStatus = await this.apis.get('nuFinance').getComplianceStatus(
        request.businessNumber
      );
      
      // Calculate risk score for NU
      const riskScore = this.calculateNUTaxDebtRiskScore(taxDebtResult, complianceStatus);
      
      const result: ProvincialTaxDebt = {
        province: 'NU',
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
        `tax-debt:NU:${request.businessNumber}`,
        result,
        { encrypt: true, ttl: 3600 } // 1 hour TTL for tax data
      );
      
      // Audit log
      await this.auditLog({
        action: 'tax_debt_verification',
        province: 'NU',
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
        province: 'NU',
        businessNumber: request.businessNumber,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`NU tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate NU-specific tax debt risk score
   */
  private calculateNUTaxDebtRiskScore(taxDebt: any, compliance: any): number {
    let score = 0;
    
    // Base score on total debt amount
    const totalDebt = taxDebt.totalOwing || 0;
    if (totalDebt === 0) return 0;
    if (totalDebt < 5000) score += 10;
    else if (totalDebt < 25000) score += 25;
    else if (totalDebt < 100000) score += 50;
    else if (totalDebt < 500000) score += 75;
    else score += 90;
    
    // Tobacco tax debt (extremely high rates in NU)
    const hasTobaccoDebt = taxDebt.taxDebts?.some((d: any) => d.taxType === 'Tobacco Tax');
    if (hasTobaccoDebt) score += 20;
    
    // Remote community charges (critical for NU operations)
    const hasRemoteCharges = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Remote Community Delivery' || d.taxType === 'Arctic Transportation Tax'
    );
    if (hasRemoteCharges) score += 15;
    
    // Air transport taxes
    const hasAirTransportDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Air Transport Tax' || d.taxType === 'Aviation Fuel Tax'
    );
    if (hasAirTransportDebt) score += 15;
    
    // Nunavut Agreement taxes (land claims)
    const hasNunavutAgreementDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType.includes('Nunavut Agreement') || d.taxType.includes('Land Claim')
    );
    if (hasNunavutAgreementDebt) score += 10;
    
    // Mining royalties
    const hasMiningDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Mining Royalty' || d.taxType === 'Mineral Resource Tax'
    );
    if (hasMiningDebt) score += 15;
    
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
    
    // Remote filing extensions consideration
    if (compliance.remoteFilingExtensions && compliance.remoteFilingExtensions > 0) {
      score -= 5; // Consider legitimate challenges for remote communities
    }
    
    // Age of debt
    const oldestDebt = Math.max(...(taxDebt.taxDebts?.map((d: any) => d.daysPastDue) || [0]));
    if (oldestDebt > 365) score += 15;
    else if (oldestDebt > 180) score += 10;
    else if (oldestDebt > 90) score += 5;
    
    // Extreme remoteness considerations
    if (hasRemoteCharges && oldestDebt < 365) {
      score -= 10; // Significant consideration for extreme logistics challenges
    }
    
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
