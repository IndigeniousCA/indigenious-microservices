/**
 * New Brunswick Provincial Verification Agent
 * 
 * @module NewBrunswickAgent
 * @description Verifies businesses in New Brunswick through provincial registries
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
 * New Brunswick verification agent
 * Integrates with Service New Brunswick, WorkSafeNB, and NB Apprenticeship
 */
export class NewBrunswickAgent extends BaseProvincialAgent {
  constructor() {
    super('NB');
    this.initializeAPIs();
  }
  
  /**
   * Initialize New Brunswick-specific APIs
   */
  private initializeAPIs(): void {
    // Service New Brunswick - Corporate Registry
    this.apis.set('serviceNB', {
      client: this.createSecureClient(
        process.env.SERVICE_NB_URL || 'https://www.pxw1.snb.ca/api',
        {
          apiKey: process.env.SERVICE_NB_API_KEY,
          headers: {
            'X-SNB-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '3.0'
          }
        }
      ),
      
      searchEntity: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('serviceNB').client.post('/corporate/search', {
            searchParams: {
              businessName: this.sanitizeInput(name),
              corporationNumber: number ? this.sanitizeInput(number) : undefined,
              registryNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'In Good Standing'],
              includeTradeNames: true,
              language: 'en' // Support for bilingual services
            },
            maxResults: 100
          });
          
          return this.validateServiceNBResponse(response.data);
        }, 'serviceNB:search');
      },
      
      getEntityDetails: async (registryNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('serviceNB').client.get(
            `/corporate/entity/${this.sanitizeInput(registryNumber)}/details`
          );
          
          return this.validateEntityDetails(response.data);
        }, 'serviceNB:details');
      },
      
      verifyBusinessLicense: async (licenseNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('serviceNB').client.get(
            `/licenses/verify/${this.sanitizeInput(licenseNumber)}`
          );
          
          return {
            valid: response.data.isValid,
            licenseType: response.data.licenseCategory,
            issueDate: response.data.issueDate,
            expiryDate: response.data.expiryDate,
            restrictions: response.data.restrictions || []
          };
        }, 'serviceNB:license');
      }
    });
    
    // WorkSafeNB (WSNB)
    this.apis.set('workSafeNB', {
      client: this.createSecureClient(
        process.env.WORKSAFE_NB_URL || 'https://www.ws-ts.nb.ca/api',
        {
          apiKey: process.env.WORKSAFE_NB_API_KEY,
          headers: {
            'X-WSNB-Version': '2.5',
            'Accept': 'application/json',
            'Accept-Language': 'en-CA,fr-CA' // Bilingual support
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('workSafeNB').client.post('/employers/clearance-verification', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeRates: true,
            includeClaimsHistory: true,
            includeAtlanticHarmonization: true // Atlantic provinces coordination
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
            assessmentRate: response.data.assessmentRate || 2.21, // 2025 NB average
            experienceRating: response.data.experienceRating,
            accountExists: true,
            claimsHistory: {
              totalClaims: response.data.claimsCount || 0,
              openClaims: response.data.openClaims || 0,
              lostTimeInjuryRate: response.data.ltir || 0
            },
            atlanticReciprocity: response.data.atlanticAgreementActive
          };
        }, 'workSafeNB:clearance');
      },
      
      getSafetyPrograms: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('workSafeNB').client.get(
            `/safety/programs/${this.sanitizeInput(industryCode)}`
          );
          
          return {
            mandatoryPrograms: response.data.mandatory || [],
            recommendedPrograms: response.data.recommended || [],
            incentivePrograms: response.data.incentives || [],
            safetyGroupParticipation: response.data.safetyGroups || []
          };
        }, 'workSafeNB:safetyPrograms');
      }
    });
    
    // New Brunswick Community College (NBCC) - Apprenticeship & Trades
    this.apis.set('nbApprentice', {
      client: this.createSecureClient(
        process.env.NB_APPRENTICE_URL || 'https://www.nbcc.ca/api/apprenticeship',
        {
          apiKey: process.env.NB_APPRENTICE_API_KEY,
          headers: {
            'X-NBCC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Atlantic-Harmonization': 'enabled' // Atlantic trade harmonization
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nbApprentice').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeAtlanticMobility: true,
            includeBlockRelease: true // NB's block release training info
          });
          
          return {
            valid: response.data.isActive,
            certificationType: response.data.certificationType,
            tradeName: response.data.trade,
            level: response.data.journeypersonLevel,
            redSealEndorsement: response.data.hasRedSeal,
            atlanticCertified: response.data.atlanticTradeCertified,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.status,
            blockReleaseCompleted: response.data.blockReleaseStatus,
            dualCertification: response.data.dualTradeCertification // For dual-trade programs
          };
        }, 'nbApprentice:verifyCertification');
      },
      
      checkApprenticeStatus: async (apprenticeNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nbApprentice').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeNumber)}/status`
          );
          
          return {
            registered: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            employer: response.data.currentEmployer,
            hoursCompleted: response.data.hoursLogged,
            hoursRequired: response.data.totalHoursRequired,
            blockReleaseSchedule: response.data.upcomingBlocks,
            mentorAssigned: response.data.hasMentor,
            indigenousProgramParticipant: response.data.indigenousPathway
          };
        }, 'nbApprentice:checkApprentice');
      }
    });
    
    // Construction Association of New Brunswick (CANB)
    this.apis.set('canb', {
      client: this.createSecureClient(
        process.env.CANB_URL || 'https://constructionnb.ca/api',
        { 
          apiKey: process.env.CANB_API_KEY,
          headers: {
            'X-CANB-Version': '2.0'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('canb').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeCorStatus: true,
            includeBuildForce: true, // BuildForce Canada certification
            includeIndigenousPrograms: true
          });
          
          return {
            isMember: response.data.activeMember,
            membershipType: response.data.membershipLevel,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            corCertified: response.data.hasCOR,
            corNumber: response.data.corCertificateNumber,
            buildForceCertified: response.data.buildForceParticipant,
            indigenousProcurementReady: response.data.indigenousReadiness,
            safetyRating: response.data.safetyScore,
            trainingCredits: response.data.annualTrainingCredits
          };
        }, 'canb:verifyMembership');
      }
    });
    
    // Joint Economic Development Initiative (JEDI) - Indigenous Business
    this.apis.set('jedi', {
      client: this.createSecureClient(
        process.env.JEDI_NB_URL || 'https://jedinb.ca/api',
        { apiKey: process.env.JEDI_NB_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('jedi').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            certificationNumber: response.data.certNumber,
            indigenousOwnership: response.data.ownershipPercentage,
            firstNationAffiliation: response.data.community,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            capacityLevel: response.data.businessCapacity
          };
        }, 'jedi:verifyIndigenous');
      }
    });
    
    // New Brunswick Department of Finance - Tax Debt API
    this.apis.set('nbFinance', {
      client: this.createSecureClient(
        process.env.NB_FINANCE_URL || 'https://api.gnb.ca/finance/tax-verification',
        {
          apiKey: process.env.NB_FINANCE_API_KEY,
          headers: {
            'X-NB-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('nbFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'provincial_corporate_tax',
              'hst', // Harmonized Sales Tax
              'property_tax',
              'carbon_tax',
              'fuel_tax',
              'tobacco_tax',
              'motor_vehicle_tax',
              'real_property_transfer_tax',
              'insurance_tax'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformNBTaxDebtResponse(response.data);
        }, 'nbFinance:taxDebt', 30000);
      },
      
      getHSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nbFinance').client.get(
            `/hst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.hstAccountNumber,
            registrationDate: response.data.registrationDate,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate,
            harmonized: true // NB uses HST
          };
        }, 'nbFinance:hst');
      },
      
      getPropertyTaxStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nbFinance').client.get(
            `/property-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.propertyTaxAccount,
            properties: response.data.registeredProperties || [],
            outstandingBalance: response.data.balance || 0,
            assessmentYear: response.data.currentAssessmentYear || new Date().getFullYear()
          };
        }, 'nbFinance:propertyTax');
      },
      
      getCarbonTaxStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nbFinance').client.get(
            `/carbon-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.carbonTaxAccount,
            emissionSources: response.data.registeredSources || [],
            outstandingBalance: response.data.balance || 0,
            complianceStatus: response.data.complianceStatus
          };
        }, 'nbFinance:carbonTax');
      }
    });
  }
  
  /**
   * Main verification method for New Brunswick
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
      
      // Add CANB membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyCANBMembership(request.businessName));
      }
      
      // Add JEDI verification if Indigenous-indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyJEDICertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, canbResult, jediResult] = results;
      
      // Calculate confidence with bilingual and Atlantic considerations
      const confidence = this.calculateConfidenceWithRegionalFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'NB',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: canbResult?.status === 'fulfilled' ? canbResult.value : null,
          indigenousCertification: jediResult?.status === 'fulfilled' ? jediResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        atlanticHarmonization: this.checkAtlanticHarmonization(results),
        bilingualCompliance: true // NB is officially bilingual
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`New Brunswick verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in New Brunswick
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for entity in Service NB
      const searchResults = await this.apis.get('serviceNB').searchEntity(
        businessName,
        businessNumber
      );
      
      if (!searchResults.entities || searchResults.entities.length === 0) {
        return {
          found: false,
          message: 'Business not found in Service New Brunswick Registry'
        };
      }
      
      // Get detailed information for the first match
      const entity = searchResults.entities[0];
      const details = await this.apis.get('serviceNB').getEntityDetails(
        entity.registryNumber
      );
      
      // Check for business license if applicable
      let licenseInfo = null;
      if (details.businessLicenseNumber) {
        try {
          licenseInfo = await this.apis.get('serviceNB').verifyBusinessLicense(
            details.businessLicenseNumber
          );
        } catch (error) {
          // License verification is optional
        }
      }
      
      return {
        found: true,
        registryNumber: details.registryNumber,
        corporationNumber: details.corporationNumber,
        legalName: details.legalName,
        tradeName: details.tradeName,
        legalNameFrench: details.legalNameFr, // Bilingual support
        tradeNameFrench: details.tradeNameFr,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredAddress,
          city: details.city,
          province: 'NB',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        lastAnnualReturnDate: details.lastAnnualReturn,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber,
        businessLicense: licenseInfo,
        bilingualRegistration: details.bilingualStatus
      };
    } catch (error) {
      throw new Error(`Service New Brunswick verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WorkSafeNB compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WSNB account
      const wsnbAccount = await this.mapToWSNBAccount(businessIdentifier);
      
      const clearance = await this.apis.get('workSafeNB').verifyClearance(wsnbAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WorkSafeNB account found',
          required: true
        };
      }
      
      // Get safety programs for the industry
      let safetyPrograms = null;
      if (clearance.industryCode) {
        try {
          safetyPrograms = await this.apis.get('workSafeNB').getSafetyPrograms(
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
        atlanticReciprocity: clearance.atlanticReciprocity,
        safetyMetrics: {
          rateComparison: this.compareToProvincialRate(clearance.assessmentRate),
          lostTimeInjuryRate: clearance.claimsHistory.lostTimeInjuryRate,
          mandatoryPrograms: safetyPrograms?.mandatoryPrograms || [],
          recommendedPrograms: safetyPrograms?.recommendedPrograms || [],
          safetyGroupMembership: safetyPrograms?.safetyGroupParticipation || [],
          recommendation: this.getSafetyRecommendation(clearance, safetyPrograms)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WorkSafeNB verification failed: ${error.message}`
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
    
    const nbWorkers = workers.filter(w => 
      w.provinces.includes('NB') || 
      w.certifications.some(c => c.province === 'NB')
    );
    
    if (nbWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No New Brunswick workers to verify' };
    }
    
    const verificationPromises = nbWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'NB' || cert.redSeal || cert.atlanticCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(nbWorkers);
    
    // Identify Atlantic harmonization and dual-trade certifications
    const atlanticCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.atlanticCertified
    ).length;
    
    const dualTradeCertified = results.filter(r => 
      r.status === 'fulfilled' && r.value.dualCertification
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: nbWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      atlanticCertified: atlanticCertified,
      dualTradeCertified: dualTradeCertified,
      blockReleaseParticipation: this.calculateBlockReleaseStats(results),
      indigenousPathwayParticipants: apprenticeChecks.indigenousCount || 0
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
      const certResult = await this.apis.get('nbApprentice').verifyCertification(
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
        atlanticCertified: certResult.atlanticCertified,
        status: certResult.status,
        trade: certResult.tradeName,
        blockReleaseCompleted: certResult.blockReleaseCompleted,
        dualCertification: certResult.dualCertification,
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
   * Verify CANB membership
   */
  private async verifyCANBMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('canb').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Construction Association of New Brunswick',
        isMember: membership.isMember,
        membershipType: membership.membershipType,
        memberSince: membership.memberSince,
        corCertified: membership.corCertified,
        corNumber: membership.corNumber,
        buildForceCertified: membership.buildForceCertified,
        indigenousProcurementReady: membership.indigenousProcurementReady,
        safetyRating: membership.safetyRating,
        trainingCredits: membership.trainingCredits,
        benefits: membership.isMember ? [
          'COR safety certification program',
          'BuildForce Canada workforce development',
          'Indigenous procurement readiness training',
          'Bilingual safety resources',
          'Atlantic trade mobility support',
          'Group insurance programs'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'CANB',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify JEDI certification
   */
  private async verifyJEDICertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('jedi').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Joint Economic Development Initiative',
        verified: certification.verified,
        certificationNumber: certification.certificationNumber,
        indigenousOwnership: certification.indigenousOwnership,
        firstNationAffiliation: certification.firstNationAffiliation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        capacityLevel: certification.capacityLevel,
        eligibleForSetAsides: certification.indigenousOwnership >= 51,
        atlanticIndigenousNetwork: true // Part of Atlantic Indigenous Business Network
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'JEDI',
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
      const response = await this.apis.get('serviceNB').client.get('/health');
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
      'excavation', 'masonry', 'carpentry'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator', 'mason',
         'paver', 'crane operator'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'première nation', 'mi\'kmaq', 'maliseet', 'wolastoqey',
      'passamaquoddy', 'indigenous', 'autochtone', 'aboriginal', 'native',
      'band', 'nation', 'tribal'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WSNB account
   */
  private async mapToWSNBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WSNB account number format
    if (businessIdentifier.match(/^W\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `W${digits.substring(0, 6)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'W123456',
      '987654321RC0001': 'W987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to provincial average rate
   */
  private compareToProvincialRate(rate: number): string {
    const provincialAverage = 2.21; // 2025 NB average
    const difference = ((rate - provincialAverage) / provincialAverage) * 100;
    
    if (difference < -20) return `${Math.abs(difference).toFixed(1)}% below provincial average (excellent)`;
    if (difference < -10) return `${Math.abs(difference).toFixed(1)}% below average (very good)`;
    if (difference < 0) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 10) return `${difference.toFixed(1)}% above average (monitor)`;
    if (difference < 20) return `${difference.toFixed(1)}% above average (review needed)`;
    return `${difference.toFixed(1)}% above average (immediate action required)`;
  }
  
  /**
   * Get safety recommendation
   */
  private getSafetyRecommendation(clearance: any, safetyPrograms: any): string {
    const rate = clearance.assessmentRate || 2.21;
    const ltir = clearance.claimsHistory?.lostTimeInjuryRate || 0;
    
    if (rate <= 1.77 && ltir < 1) {
      return 'Excellent safety performance - consider mentoring other businesses in safety groups';
    }
    if (rate <= 2.21 && ltir < 2) {
      const programs = safetyPrograms?.incentivePrograms?.slice(0, 2).join(', ') || 'safety incentive programs';
      return `Good safety performance - eligible for ${programs}`;
    }
    if (rate <= 2.65) {
      const mandatory = safetyPrograms?.mandatoryPrograms?.[0] || 'safety management system';
      return `Average performance - implement ${mandatory} and join safety group`;
    }
    return 'High risk profile - mandatory safety consultant engagement and weekly WSNB reporting required';
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
      apprenticeNumbers.map(num => this.apis.get('nbApprentice').checkApprenticeStatus(num))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.registered
    );
    
    const indigenousPathway = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousProgramParticipant
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      indigenousCount: indigenousPathway,
      blockReleaseUpcoming: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.blockReleaseSchedule?.length > 0
      ).length,
      mentorshipActive: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.mentorAssigned
      ).length
    };
  }
  
  /**
   * Calculate confidence with regional factors
   */
  private calculateConfidenceWithRegionalFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for Atlantic harmonization
    const hasAtlanticCertified = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.atlanticCertified > 0
    );
    
    // Boost for bilingual compliance
    const hasBilingualRegistration = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.bilingualRegistration
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasAtlanticCertified) adjustedConfidence += 3;
    if (hasBilingualRegistration) adjustedConfidence += 2;
    
    return Math.min(adjustedConfidence, 100);
  }
  
  /**
   * Check Atlantic harmonization status
   */
  private checkAtlanticHarmonization(results: PromiseSettledResult<any>[]): any {
    const tradeResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticCertified
    );
    
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticReciprocity
    );
    
    return {
      eligible: !!(tradeResult || safetyResult),
      tradeMobility: tradeResult?.status === 'fulfilled' ? {
        certifiedWorkers: tradeResult.value.atlanticCertified,
        reciprocalProvinces: ['NB', 'NS', 'PE', 'NL', 'MB']
      } : null,
      safetyReciprocity: safetyResult?.status === 'fulfilled' && safetyResult.value.atlanticReciprocity,
      benefits: [
        'Seamless worker mobility across Atlantic provinces',
        'Mutual WCB clearance recognition',
        'Harmonized trade certifications',
        'Reduced administrative burden'
      ]
    };
  }
  
  /**
   * Calculate block release statistics
   */
  private calculateBlockReleaseStats(results: PromiseSettledResult<any>[]): string {
    const total = results.length;
    const blockReleaseCompleted = results.filter(r => 
      r.status === 'fulfilled' && r.value.blockReleaseCompleted
    ).length;
    
    const percentage = total > 0 ? (blockReleaseCompleted / total) * 100 : 0;
    return `${percentage.toFixed(0)}% completed block release training`;
  }
  
  /**
   * Validate Service NB response
   */
  private validateServiceNBResponse(data: any): any {
    const schema = z.object({
      entities: z.array(z.object({
        registryNumber: z.string(),
        corporationNumber: z.string().optional(),
        businessName: z.string(),
        businessNameFr: z.string().optional(),
        status: z.string(),
        entityType: z.string()
      })),
      totalResults: z.number(),
      searchParams: z.object({
        businessName: z.string().optional(),
        corporationNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate entity details
   */
  private validateEntityDetails(data: any): any {
    const schema = z.object({
      registryNumber: z.string(),
      corporationNumber: z.string().optional(),
      legalName: z.string(),
      legalNameFr: z.string().optional(),
      tradeName: z.string().optional(),
      tradeNameFr: z.string().optional(),
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
      bilingualStatus: z.boolean()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify New Brunswick tax debt
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<ProvincialTaxDebt> {
    try {
      // Validate consent
      if (!request.consent?.obtained || request.consent.expiryDate < new Date()) {
        throw new Error('Valid consent required for tax debt verification');
      }
      
      // Log access for audit
      await this.logTaxDebtAccess({
        eventType: 'access_request',
        businessNumber: request.businessNumber,
        province: 'NB',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, hstResult, propertyTaxResult, carbonTaxResult] = await Promise.allSettled([
        this.apis.get('nbFinance').verifyTaxDebt(request),
        this.apis.get('nbFinance').getHSTStatus(request.businessNumber),
        this.apis.get('nbFinance').getPropertyTaxStatus(request.businessNumber),
        this.apis.get('nbFinance').getCarbonTaxStatus(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'NB',
        provincialCorporateTax: undefined,
        salesTax: undefined,
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
      
      // Add HST data
      if (hstResult.status === 'fulfilled' && hstResult.value.registered) {
        const hstDebt = hstResult.value.outstandingBalance || 0;
        if (hstDebt > 0) {
          provincialTaxDebt.salesTax = {
            items: [{
              taxType: 'Harmonized Sales Tax (HST)',
              amountOwing: hstDebt,
              originalAmount: hstDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: hstResult.value.accountNumber
            }],
            totalOwing: hstDebt,
            taxType: 'HST',
            registrationNumber: hstResult.value.accountNumber,
            filingFrequency: hstResult.value.filingFrequency
          };
          provincialTaxDebt.totalProvincialOwing += hstDebt;
        }
      }
      
      // Add Property Tax data
      if (propertyTaxResult.status === 'fulfilled' && propertyTaxResult.value.required) {
        const propertyDebt = propertyTaxResult.value.outstandingBalance || 0;
        if (propertyDebt > 0) {
          if (!provincialTaxDebt.otherTaxes) {
            provincialTaxDebt.otherTaxes = [];
          }
          provincialTaxDebt.otherTaxes.push({
            taxType: 'property_tax',
            items: [{
              taxType: 'Property Tax',
              amountOwing: propertyDebt,
              originalAmount: propertyDebt,
              penaltiesInterest: 0,
              periodStart: new Date(propertyTaxResult.value.assessmentYear, 0, 1),
              periodEnd: new Date(propertyTaxResult.value.assessmentYear, 11, 31),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: propertyTaxResult.value.accountNumber,
              note: `Assessment Year: ${propertyTaxResult.value.assessmentYear}`
            }],
            totalOwing: propertyDebt,
            accountNumber: propertyTaxResult.value.accountNumber
          });
          provincialTaxDebt.totalProvincialOwing += propertyDebt;
        }
      }
      
      // Add Carbon Tax data
      if (carbonTaxResult.status === 'fulfilled' && carbonTaxResult.value.required) {
        const carbonDebt = carbonTaxResult.value.outstandingBalance || 0;
        if (carbonDebt > 0) {
          if (!provincialTaxDebt.otherTaxes) {
            provincialTaxDebt.otherTaxes = [];
          }
          provincialTaxDebt.otherTaxes.push({
            taxType: 'carbon_tax',
            items: [{
              taxType: 'Carbon Tax',
              amountOwing: carbonDebt,
              originalAmount: carbonDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: carbonTaxResult.value.accountNumber,
              note: `Sources: ${carbonTaxResult.value.emissionSources?.length || 0} registered`
            }],
            totalOwing: carbonDebt,
            accountNumber: carbonTaxResult.value.accountNumber
          });
          provincialTaxDebt.totalProvincialOwing += carbonDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateNBTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'NB',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:NB:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'NB',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`NB tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform NB tax debt response
   */
  private transformNBTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'NB',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformNBAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // HST
    if (data.hst && data.hst.totalBalance > 0) {
      result.salesTax = {
        items: data.hst.assessments.map((a: any) => ({
          ...this.transformNBAssessment(a),
          taxType: 'Harmonized Sales Tax (HST)'
        })),
        totalOwing: data.hst.totalBalance,
        taxType: 'HST',
        registrationNumber: data.hst.accountNumber,
        filingFrequency: data.hst.filingFrequency
      };
      result.totalProvincialOwing += data.hst.totalBalance;
    }
    
    // Other NB taxes
    const specialTaxes: any[] = [];
    const taxKeys = [
      'propertyTax', 'carbonTax', 'fuelTax', 'tobaccoTax',
      'motorVehicleTax', 'realPropertyTransferTax', 'insuranceTax'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxes.push({
          taxType: taxKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
          items: data[taxKey].assessments.map((assessment: any) => ({
            ...this.transformNBAssessment(assessment),
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
    
    return result;
  }
  
  /**
   * Transform NB assessment
   */
  private transformNBAssessment(assessment: any): TaxDebtItem {
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
   * Calculate NB-specific risk score
   */
  private calculateNBTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 150000) riskScore += 40;
    else if (totalOwing > 50000) riskScore += 30;
    else if (totalOwing > 20000) riskScore += 20;
    else if (totalOwing > 5000) riskScore += 10;
    else riskScore += 5;
    
    // HST factor (0-25 points) - Critical in harmonized province
    if (taxDebt.salesTax?.totalOwing > 0) {
      riskScore += Math.min(25, taxDebt.salesTax.totalOwing / 8000);
    }
    
    // Property tax factor (0-20 points) - Important for real estate
    const hasPropertyTaxDebt = taxDebt.otherTaxes?.some(
      tax => tax.taxType.includes('property_tax')
    );
    if (hasPropertyTaxDebt) {
      riskScore += 20;
    }
    
    // Carbon tax factor (0-15 points) - Environmental compliance
    const hasCarbonTaxDebt = taxDebt.otherTaxes?.some(
      tax => tax.taxType.includes('carbon_tax')
    );
    if (hasCarbonTaxDebt) {
      riskScore += 15;
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
          'tax-debt:audit-log:NB',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('NB tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}