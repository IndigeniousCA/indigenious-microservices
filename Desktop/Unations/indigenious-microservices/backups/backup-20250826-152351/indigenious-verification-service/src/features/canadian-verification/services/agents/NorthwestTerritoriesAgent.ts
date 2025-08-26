/**
 * Northwest Territories Territorial Verification Agent
 * 
 * @module NorthwestTerritoriesAgent
 * @description Verifies businesses in Northwest Territories through territorial registries
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
 * Northwest Territories verification agent
 * Integrates with GNWT Corporate Registry, WSCC, Aurora College, NWTCA, and Dene Nation
 */
export class NorthwestTerritoriesAgent extends BaseProvincialAgent {
  constructor() {
    super('NT');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Northwest Territories-specific APIs
   */
  private initializeAPIs(): void {
    // GNWT Corporate Registry
    this.apis.set('gnwtRegistry', {
      client: this.createSecureClient(
        process.env.GNWT_REGISTRY_URL || 'https://www.justice.gov.nt.ca/api/corporate',
        {
          apiKey: process.env.GNWT_REGISTRY_API_KEY,
          headers: {
            'X-GNWT-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '3.0',
            'Accept-Language': 'en,fr,dgr,gwi,scs,den' // Multi-Indigenous language support
          }
        }
      ),
      
      searchCorporation: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnwtRegistry').client.post('/corporations/search', {
            searchParameters: {
              corporationName: this.sanitizeInput(name),
              corporationNumber: number ? this.sanitizeInput(number) : undefined,
              businessNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'In Good Standing'],
              includeExtraprovincialCompanies: true,
              includeNorthernBusiness: true
            },
            resultLimit: 100
          });
          
          return this.validateGNWTResponse(response.data);
        }, 'gnwtRegistry:search');
      },
      
      getCorporationDetails: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnwtRegistry').client.get(
            `/corporations/${this.sanitizeInput(corporationNumber)}/details`
          );
          
          return this.validateCorporationDetails(response.data);
        }, 'gnwtRegistry:details');
      },
      
      verifyBusinessLicense: async (licenseNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('gnwtRegistry').client.get(
            `/licenses/verify/${this.sanitizeInput(licenseNumber)}`
          );
          
          return {
            valid: response.data.isValid,
            licenseType: response.data.licenseCategory,
            issueDate: response.data.issueDate,
            expiryDate: response.data.expiryDate,
            restrictions: response.data.restrictions || [],
            communityIssued: response.data.issuingCommunity,
            northernBusinessProgram: response.data.northernBusinessStatus
          };
        }, 'gnwtRegistry:license');
      }
    });
    
    // Workers' Safety and Compensation Commission (WSCC)
    this.apis.set('wscc', {
      client: this.createSecureClient(
        process.env.WSCC_URL || 'https://www.wscc.nt.ca/api',
        {
          apiKey: process.env.WSCC_API_KEY,
          headers: {
            'X-WSCC-Version': '3.2',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wscc').client.post('/employers/clearance-verification', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeRates: true,
            includeClaimsHistory: true,
            includeMiningCompliance: true, // Diamond mining industry
            includeRemoteWorkCompliance: true
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
            assessmentRate: response.data.assessmentRate || 2.15, // 2025 NT average
            experienceRating: response.data.experienceRating,
            accountExists: true,
            claimsHistory: {
              totalClaims: response.data.claimsCount || 0,
              openClaims: response.data.openClaims || 0,
              lostTimeInjuryRate: response.data.ltir || 0,
              miningRelatedClaims: response.data.miningClaims || 0
            },
            miningCompliance: response.data.miningIndustryCompliance,
            remoteWorkCompliance: response.data.remoteWorkSafety,
            arcticOperationsApproval: response.data.arcticOperationsStatus
          };
        }, 'wscc:clearance');
      },
      
      getArcticSafetyPrograms: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wscc').client.get(
            `/safety/arctic-programs/${this.sanitizeInput(industryCode)}`
          );
          
          return {
            extremeColdPrograms: response.data.extremeCold || [], // -50°C operations
            wildlifeEncounterPrograms: response.data.wildlifeEncounter || [], // Polar bear, etc.
            iceRoadSafetyPrograms: response.data.iceRoadSafety || [],
            diamondMiningSafetyPrograms: response.data.diamondMining || [],
            remoteEvacuationPrograms: response.data.remoteEvacuation || [],
            traditionalKnowledgePrograms: response.data.traditionalKnowledge || []
          };
        }, 'wscc:arcticSafety');
      }
    });
    
    // Aurora College - Trades & Technology
    this.apis.set('auroraCollege', {
      client: this.createSecureClient(
        process.env.AURORA_COLLEGE_URL || 'https://www.auroracollege.nt.ca/api/trades',
        {
          apiKey: process.env.AURORA_COLLEGE_API_KEY,
          headers: {
            'X-Aurora-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Arctic-Certification': 'enabled' // Arctic trade specializations
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('auroraCollege').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeArcticSpecialization: true,
            includeMiningCertification: true,
            includeIndigenousPrograms: true
          });
          
          return {
            valid: response.data.isActive,
            certificationType: response.data.certificationType,
            tradeName: response.data.trade,
            level: response.data.journeypersonLevel,
            redSealEndorsement: response.data.hasRedSeal,
            arcticSpecialization: response.data.hasArcticSpecialization,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            miningCertification: response.data.miningIndustryCertified,
            extremeColdQualified: response.data.extremeColdQualified, // -50°C rating
            traditionalSkillsIntegration: response.data.traditionalSkillsProgram
          };
        }, 'auroraCollege:verifyCertification');
      },
      
      checkApprenticeStatus: async (apprenticeNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('auroraCollege').client.get(
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
            arcticTraining: response.data.arcticSpecializationProgress,
            indigenousProgram: response.data.indigenousApprenticeProgram,
            communityBased: response.data.communityBasedTraining
          };
        }, 'auroraCollege:checkApprentice');
      }
    });
    
    // Northwest Territories Construction Association (NWTCA)
    this.apis.set('nwtca', {
      client: this.createSecureClient(
        process.env.NWTCA_URL || 'https://nwtca.ca/api',
        { 
          apiKey: process.env.NWTCA_API_KEY,
          headers: {
            'X-NWTCA-Version': '2.5'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nwtca').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeBondingInfo: true,
            includeArcticProjectExperience: true,
            includeMiningProjectExperience: true,
            includeIndigenousPartnerships: true
          });
          
          return {
            isMember: response.data.activeMember,
            membershipType: response.data.membershipLevel,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            bondingCapacity: response.data.bondingLimit,
            arcticProjectExperience: response.data.arcticProjects,
            miningProjectExperience: response.data.miningProjects,
            indigenousPartnership: response.data.indigenousCollaborations,
            extremeColdConstruction: response.data.extremeColdExperience, // -50°C operations
            iceRoadConstruction: response.data.iceRoadExperience,
            remoteCommunitiesExperience: response.data.remoteCommunityProjects,
            safetyRating: response.data.safetyScore,
            diamondMineExperience: response.data.diamondMineProjects
          };
        }, 'nwtca:verifyMembership');
      }
    });
    
    // Dene Nation Business Registry (represents multiple Dene communities)
    this.apis.set('deneNation', {
      client: this.createSecureClient(
        process.env.DENE_NATION_URL || 'https://denenation.ca/api/business',
        { apiKey: process.env.DENE_NATION_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('deneNation').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            certificationNumber: response.data.certNumber,
            indigenousOwnership: response.data.ownershipPercentage,
            deneNationAffiliation: response.data.community,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            capacityLevel: response.data.businessCapacity,
            traditionalKnowledgeIntegration: response.data.traditionalKnowledgeUse,
            landsAndResourcesCompliance: response.data.landsResourcesCompliant,
            communityBenefitAgreement: response.data.communityBenefitStatus
          };
        }, 'deneNation:verifyIndigenous');
      }
    });
    
    // NT Department of Finance - Tax Debt Verification
    this.apis.set('ntFinance', {
      client: this.createSecureClient(
        process.env.NT_FINANCE_URL || 'https://www.fin.gov.nt.ca/api',
        {
          apiKey: process.env.NT_FINANCE_API_KEY,
          headers: {
            'X-NT-Finance-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Finance-Version': '2.0',
            'Accept-Language': 'en,fr,dgr' // Support official languages
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ntFinance').client.post('/tax/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            corporationNumber: this.sanitizeInput(request.businessIdentifier || ''),
            consentToken: request.consentToken,
            verificationScope: 'comprehensive',
            includePayrollTax: true,
            includeFuelTax: true,
            includePropertyTax: true,
            includeDiamondRoyalties: true, // NT specific
            includeMiningRoyalties: true,
            includeOilGasRoyalties: true,
            includeEnvironmentalFees: true,
            includeSelfGovernmentTaxes: true, // Land claim agreements
            includePaymentArrangements: true,
            includeRemoteCommunityCharges: true // Remote delivery costs
          });
          
          return this.validateTaxDebtResponse(response.data);
        }, 'ntFinance:taxDebt');
      },
      
      getComplianceStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ntFinance').client.get(
            `/tax/compliance/${this.sanitizeInput(businessNumber)}`
          );
          
          return {
            filingCompliance: response.data.filingStatus,
            paymentCompliance: response.data.paymentStatus,
            outstandingReturns: response.data.missingReturns || [],
            lastFilingDate: response.data.lastFiling,
            complianceScore: response.data.score,
            resourceFilingsRequired: response.data.resourceReturns,
            selfGovernmentFilings: response.data.landClaimFilings
          };
        }, 'ntFinance:compliance');
      }
    });
  }
  
  /**
   * Main verification method for Northwest Territories
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
      
      // Add NWTCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyNWTCAMembership(request.businessName));
      }
      
      // Add Dene Nation verification if Indigenous-indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyDeneNationCertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, nwtcaResult, deneResult] = results;
      
      // Calculate confidence with arctic factors
      const confidence = this.calculateConfidenceWithArcticFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'NT',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: nwtcaResult?.status === 'fulfilled' ? nwtcaResult.value : null,
          indigenousCertification: deneResult?.status === 'fulfilled' ? deneResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        arcticCapability: this.assessArcticCapability(results),
        multilingualCompliance: true // Official languages: English, French, 9 Indigenous languages
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Northwest Territories verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Northwest Territories
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for corporation in GNWT Registry
      const searchResults = await this.apis.get('gnwtRegistry').searchCorporation(
        businessName,
        businessNumber
      );
      
      if (!searchResults.corporations || searchResults.corporations.length === 0) {
        return {
          found: false,
          message: 'Business not found in GNWT Corporate Registry'
        };
      }
      
      // Get detailed information for the first match
      const corporation = searchResults.corporations[0];
      const details = await this.apis.get('gnwtRegistry').getCorporationDetails(
        corporation.corporationNumber
      );
      
      // Check for business license if applicable
      let licenseInfo = null;
      if (details.businessLicenseNumber) {
        try {
          licenseInfo = await this.apis.get('gnwtRegistry').verifyBusinessLicense(
            details.businessLicenseNumber
          );
        } catch (error) {
          // License verification is optional
        }
      }
      
      return {
        found: true,
        corporationNumber: details.corporationNumber,
        legalName: details.legalName,
        tradeName: details.tradeName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          city: details.city,
          territory: 'NT',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        lastAnnualReturnDate: details.lastAnnualReturn,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber,
        businessLicense: licenseInfo,
        northernBusinessStatus: details.northernBusinessProgram,
        extraprovincialRegistration: details.extraProvincialStatus
      };
    } catch (error) {
      throw new Error(`GNWT Corporate Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WSCC compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WSCC account
      const wsccAccount = await this.mapToWSCCAccount(businessIdentifier);
      
      const clearance = await this.apis.get('wscc').verifyClearance(wsccAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WSCC account found',
          required: true
        };
      }
      
      // Get arctic safety programs for the industry
      let safetyPrograms = null;
      if (clearance.industryCode) {
        try {
          safetyPrograms = await this.apis.get('wscc').getArcticSafetyPrograms(
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
        miningCompliance: clearance.miningCompliance,
        remoteWorkCompliance: clearance.remoteWorkCompliance,
        arcticOperationsApproval: clearance.arcticOperationsApproval,
        safetyMetrics: {
          rateComparison: this.compareToTerritorialRate(clearance.assessmentRate),
          lostTimeInjuryRate: clearance.claimsHistory.lostTimeInjuryRate,
          miningRelatedClaims: clearance.claimsHistory.miningRelatedClaims,
          extremeColdPrograms: safetyPrograms?.extremeColdPrograms || [],
          wildlifeEncounterPrograms: safetyPrograms?.wildlifeEncounterPrograms || [],
          iceRoadSafetyPrograms: safetyPrograms?.iceRoadSafetyPrograms || [],
          diamondMiningSafetyPrograms: safetyPrograms?.diamondMiningSafetyPrograms || [],
          remoteEvacuationPrograms: safetyPrograms?.remoteEvacuationPrograms || [],
          traditionalKnowledgePrograms: safetyPrograms?.traditionalKnowledgePrograms || [],
          recommendation: this.getArcticSafetyRecommendation(clearance, safetyPrograms)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WSCC verification failed: ${error.message}`
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
    
    const ntWorkers = workers.filter(w => 
      w.provinces.includes('NT') || 
      w.certifications.some(c => c.province === 'NT')
    );
    
    if (ntWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Northwest Territories workers to verify' };
    }
    
    const verificationPromises = ntWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'NT' || cert.redSeal || cert.arcticCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(ntWorkers);
    
    // Identify arctic specializations and mining certifications
    const arcticSpecialized = results.filter(r => 
      r.status === 'fulfilled' && r.value.arcticSpecialization
    ).length;
    
    const miningCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.miningCertification
    ).length;
    
    const extremeColdQualified = results.filter(r => 
      r.status === 'fulfilled' && r.value.extremeColdQualified
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: ntWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      arcticSpecialized: arcticSpecialized,
      miningCertified: miningCertified,
      extremeColdQualified: extremeColdQualified,
      traditionalSkillsIntegration: this.calculateTraditionalSkillsStats(results),
      indigenousProgram: apprenticeChecks.indigenousCount || 0,
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
      const certResult = await this.apis.get('auroraCollege').verifyCertification(
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
        arcticSpecialization: certResult.arcticSpecialization,
        status: certResult.status,
        trade: certResult.tradeName,
        miningCertification: certResult.miningCertification,
        extremeColdQualified: certResult.extremeColdQualified,
        traditionalSkillsIntegration: certResult.traditionalSkillsIntegration,
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
   * Verify NWTCA membership
   */
  private async verifyNWTCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('nwtca').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Northwest Territories Construction Association',
        isMember: membership.isMember,
        membershipType: membership.membershipType,
        memberSince: membership.memberSince,
        bondingCapacity: membership.bondingCapacity,
        arcticProjectExperience: membership.arcticProjectExperience,
        miningProjectExperience: membership.miningProjectExperience,
        indigenousPartnership: membership.indigenousPartnership,
        extremeColdConstruction: membership.extremeColdConstruction,
        iceRoadConstruction: membership.iceRoadConstruction,
        remoteCommunitiesExperience: membership.remoteCommunitiesExperience,
        diamondMineExperience: membership.diamondMineExperience,
        safetyRating: membership.safetyRating,
        benefits: membership.isMember ? [
          'Arctic construction expertise certification',
          'Extreme cold construction training (-50°C)',
          'Diamond mine project qualification',
          'Ice road construction and logistics',
          'Remote community project management',
          'Indigenous partnership facilitation',
          'WSCC safety program integration',
          'Traditional knowledge incorporation'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'NWTCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify Dene Nation certification
   */
  private async verifyDeneNationCertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('deneNation').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Dene Nation Business Registry',
        verified: certification.verified,
        certificationNumber: certification.certificationNumber,
        indigenousOwnership: certification.indigenousOwnership,
        deneNationAffiliation: certification.deneNationAffiliation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        capacityLevel: certification.capacityLevel,
        traditionalKnowledgeIntegration: certification.traditionalKnowledgeIntegration,
        landsAndResourcesCompliance: certification.landsAndResourcesCompliance,
        communityBenefitAgreement: certification.communityBenefitAgreement,
        eligibleForSetAsides: certification.indigenousOwnership >= 51,
        territorialNetwork: true // Part of NWT Indigenous business network
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'Dene Nation',
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
      const response = await this.apis.get('gnwtRegistry').client.get('/health');
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
      'excavation', 'masonry', 'carpentry', 'mining', 'diamond',
      'ice road', 'arctic'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator', 'mason',
         'paver', 'crane operator', 'miner', 'blaster', 'diamond processor'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'dene', 'gwich\'in', 'inuvialuit', 'métis', 'metis',
      'sahtu', 'tlicho', 'yellowknives', 'dogrib', 'chipewyan', 'cree',
      'indigenous', 'aboriginal', 'native', 'band', 'nation', 'tribal'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WSCC account
   */
  private async mapToWSCCAccount(businessIdentifier: string): Promise<string> {
    // Check if already WSCC account number format
    if (businessIdentifier.match(/^NT\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `NT${digits.substring(0, 6)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'NT123456',
      '987654321RC0001': 'NT987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to territorial average rate
   */
  private compareToTerritorialRate(rate: number): string {
    const territorialAverage = 2.15; // 2025 NT average
    const difference = ((rate - territorialAverage) / territorialAverage) * 100;
    
    if (difference < -20) return `${Math.abs(difference).toFixed(1)}% below territorial average (excellent)`;
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (very good)`;
    if (difference < 0) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 10) return `${difference.toFixed(1)}% above average (monitor)`;
    if (difference < 20) return `${difference.toFixed(1)}% above average (review needed)`;
    return `${difference.toFixed(1)}% above average (immediate action required)`;
  }
  
  /**
   * Get arctic safety recommendation
   */
  private getArcticSafetyRecommendation(clearance: any, safetyPrograms: any): string {
    const rate = clearance.assessmentRate || 2.15;
    const ltir = clearance.claimsHistory?.lostTimeInjuryRate || 0;
    const miningClaims = clearance.claimsHistory?.miningRelatedClaims || 0;
    
    if (rate <= 1.72 && ltir < 1 && miningClaims === 0) {
      return 'Excellent safety performance - consider arctic operations mentoring program';
    }
    if (rate <= 2.15 && ltir < 2) {
      const programs = safetyPrograms?.extremeColdPrograms?.slice(0, 2).join(', ') || 'extreme cold safety programs';
      return `Good safety performance - eligible for ${programs}`;
    }
    if (rate <= 2.58) {
      const mandatory = safetyPrograms?.wildlifeEncounterPrograms?.[0] || 'wildlife encounter safety system';
      return `Average performance - implement ${mandatory} and ice road safety training`;
    }
    if (miningClaims > 2) {
      return 'High mining risk profile - mandatory diamond mine safety consultant and specialized training required';
    }
    return 'High risk profile - mandatory arctic safety consultant and comprehensive emergency response plan required';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeNumbers = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.toLowerCase().includes('apprentice'))
      .map(c => c.number);
    
    if (apprenticeNumbers.length === 0) return { count: 0, details: [], indigenousCount: 0, communityBasedCount: 0 };
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeNumbers.map(num => this.apis.get('auroraCollege').checkApprenticeStatus(num))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.registered
    );
    
    const indigenousProgram = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousProgram
    ).length;
    
    const communityBased = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.communityBased
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      indigenousCount: indigenousProgram,
      communityBasedCount: communityBased,
      arcticTraining: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.arcticTraining
      ).length
    };
  }
  
  /**
   * Calculate confidence with arctic factors
   */
  private calculateConfidenceWithArcticFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for arctic specialization
    const hasArcticSpecialized = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.arcticSpecialized > 0
    );
    
    // Boost for traditional knowledge integration
    const hasTraditionalKnowledge = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.traditionalKnowledgeIntegration
    );
    
    // Boost for lands and resources compliance
    const hasLandsCompliance = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.landsAndResourcesCompliance
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasArcticSpecialized) adjustedConfidence += 5;
    if (hasTraditionalKnowledge) adjustedConfidence += 3;
    if (hasLandsCompliance) adjustedConfidence += 4;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Assess arctic capability
   */
  private assessArcticCapability(results: PromiseSettledResult<any>[]): any {
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.arcticOperationsApproval
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.arcticSpecialized
    );
    
    const constructionResult = results.find(r => 
      r.status === 'fulfilled' && r.value.arcticProjectExperience
    );
    
    const miningResult = results.find(r => 
      r.status === 'fulfilled' && r.value.diamondMineExperience
    );
    
    return {
      ready: !!(safetyResult || tradesResult || constructionResult),
      safetyApproved: safetyResult?.status === 'fulfilled' && safetyResult.value.arcticOperationsApproval,
      specializedWorkers: tradesResult?.status === 'fulfilled' ? tradesResult.value.arcticSpecialized : 0,
      projectExperience: constructionResult?.status === 'fulfilled' && constructionResult.value.arcticProjectExperience,
      diamondMineQualified: miningResult?.status === 'fulfilled' && miningResult.value.diamondMineExperience,
      capabilities: [
        'Extreme cold construction operations (-50°C)',
        'Diamond mine construction and maintenance',
        'Ice road construction and logistics',
        'Remote community project delivery',
        'Polar bear and wildlife encounter protocols',
        'Traditional knowledge integration',
        'Community benefit agreement compliance',
        'Lands and resources regulatory compliance',
        'Emergency evacuation procedures'
      ]
    };
  }
  
  /**
   * Calculate traditional skills statistics
   */
  private calculateTraditionalSkillsStats(results: PromiseSettledResult<any>[]): string {
    const total = results.length;
    const traditionalSkills = results.filter(r => 
      r.status === 'fulfilled' && r.value.traditionalSkillsIntegration
    ).length;
    
    const percentage = total > 0 ? (traditionalSkills / total) * 100 : 0;
    return `${percentage.toFixed(0)}% traditional skills integration`;
  }
  
  /**
   * Validate GNWT response
   */
  private validateGNWTResponse(data: any): any {
    const schema = z.object({
      corporations: z.array(z.object({
        corporationNumber: z.string(),
        corporationName: z.string(),
        status: z.string(),
        entityType: z.string(),
        incorporationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchParameters: z.object({
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
      northernBusinessProgram: z.boolean(),
      extraProvincialStatus: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify tax debt status with NT Finance
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
      const taxDebtResult = await this.apis.get('ntFinance').verifyTaxDebt(request);
      
      // Get compliance status
      const complianceStatus = await this.apis.get('ntFinance').getComplianceStatus(
        request.businessNumber
      );
      
      // Calculate risk score for NT
      const riskScore = this.calculateNTTaxDebtRiskScore(taxDebtResult, complianceStatus);
      
      const result: ProvincialTaxDebt = {
        province: 'NT',
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
        `tax-debt:NT:${request.businessNumber}`,
        result,
        { encrypt: true, ttl: 3600 } // 1 hour TTL for tax data
      );
      
      // Audit log
      await this.auditLog({
        action: 'tax_debt_verification',
        province: 'NT',
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
        province: 'NT',
        businessNumber: request.businessNumber,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`NT tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate NT-specific tax debt risk score
   */
  private calculateNTTaxDebtRiskScore(taxDebt: any, compliance: any): number {
    let score = 0;
    
    // Base score on total debt amount
    const totalDebt = taxDebt.totalOwing || 0;
    if (totalDebt === 0) return 0;
    if (totalDebt < 10000) score += 10;
    else if (totalDebt < 50000) score += 25;
    else if (totalDebt < 250000) score += 50;
    else if (totalDebt < 1000000) score += 75;
    else score += 90;
    
    // Diamond royalties debt (critical for NT)
    const hasDiamondDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Diamond Royalty' || d.taxType === 'Diamond Mine Tax'
    );
    if (hasDiamondDebt) score += 25;
    
    // Oil & gas royalties debt
    const hasOilGasDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Oil Royalty' || d.taxType === 'Gas Royalty' || d.taxType === 'Petroleum Resource Tax'
    );
    if (hasOilGasDebt) score += 20;
    
    // Mining royalties debt
    const hasMiningDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Mining Royalty' || d.taxType === 'Mineral Resource Tax'
    );
    if (hasMiningDebt) score += 15;
    
    // Self-government tax debt (land claims)
    const hasSelfGovDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType.includes('Self-Government') || d.taxType.includes('Land Claim')
    );
    if (hasSelfGovDebt) score += 15;
    
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
    
    // Resource filing requirements
    if (compliance.resourceFilingsRequired && compliance.filingCompliance !== 'Compliant') {
      score += 10; // Additional risk for missing resource filings
    }
    
    // Age of debt
    const oldestDebt = Math.max(...(taxDebt.taxDebts?.map((d: any) => d.daysPastDue) || [0]));
    if (oldestDebt > 365) score += 15;
    else if (oldestDebt > 180) score += 10;
    else if (oldestDebt > 90) score += 5;
    
    // Remote community considerations
    const hasRemoteCharges = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Remote Community Delivery' || d.taxType === 'Northern Transportation'
    );
    if (hasRemoteCharges && oldestDebt < 180) score -= 5; // Consider remote challenges
    
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
