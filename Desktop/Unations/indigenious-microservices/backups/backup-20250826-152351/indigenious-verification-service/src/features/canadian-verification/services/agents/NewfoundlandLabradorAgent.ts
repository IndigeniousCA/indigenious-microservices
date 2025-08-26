/**
 * Newfoundland & Labrador Provincial Verification Agent
 * 
 * @module NewfoundlandLabradorAgent
 * @description Verifies businesses in Newfoundland & Labrador through provincial registries
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
 * Newfoundland & Labrador verification agent
 * Integrates with Registry of Companies, WHSCC, and College of the North Atlantic
 */
export class NewfoundlandLabradorAgent extends BaseProvincialAgent {
  constructor() {
    super('NL');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Newfoundland & Labrador-specific APIs
   */
  private initializeAPIs(): void {
    // Registry of Companies and Deeds (NL)
    this.apis.set('registryNL', {
      client: this.createSecureClient(
        process.env.NL_REGISTRY_URL || 'https://www.gov.nl.ca/registrycompanies/api',
        {
          apiKey: process.env.NL_REGISTRY_API_KEY,
          headers: {
            'X-NL-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Registry-Version': '3.0'
          }
        }
      ),
      
      searchCompany: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('registryNL').client.post('/companies/search', {
            searchParameters: {
              companyName: this.sanitizeInput(name),
              companyNumber: number ? this.sanitizeInput(number) : undefined,
              businessNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'In Good Standing'],
              includeExtraprovincial: true, // NL has many extraprovincial registrations
              includePartnerships: true,
              searchScope: 'comprehensive'
            },
            resultLimit: 100
          });
          
          return this.validateRegistryResponse(response.data);
        }, 'registryNL:search');
      },
      
      getCompanyDetails: async (companyNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('registryNL').client.get(
            `/companies/${this.sanitizeInput(companyNumber)}/details`
          );
          
          return this.validateCompanyDetails(response.data);
        }, 'registryNL:details');
      },
      
      getFilingHistory: async (companyNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('registryNL').client.get(
            `/companies/${this.sanitizeInput(companyNumber)}/filings`
          );
          
          return {
            currentFilings: response.data.upToDate,
            lastAnnualReturn: response.data.lastAnnualReturnDate,
            outstandingFilings: response.data.outstandingFilings || [],
            penalties: response.data.penalties || 0,
            dissolutionNotices: response.data.dissolutionNotices || []
          };
        }, 'registryNL:filings');
      }
    });
    
    // Workplace Health, Safety and Compensation Commission (WHSCC)
    this.apis.set('whscc', {
      client: this.createSecureClient(
        process.env.WHSCC_URL || 'https://whscc.nl.ca/api',
        {
          apiKey: process.env.WHSCC_API_KEY,
          headers: {
            'X-WHSCC-Version': '2.5',
            'Accept': 'application/json',
            'X-Atlantic-Harmonization': 'enabled'
          }
        }
      ),
      
      verifyClearance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('whscc').client.post('/employers/clearance-verification', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'comprehensive',
            includeRateHistory: true,
            includeClaimsData: true,
            includeOffshoreWork: true, // Important for NL offshore industry
            includeAtlanticAgreements: true
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
            clearanceCertificateNumber: response.data.certificateNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.naicsCode,
            subIndustry: response.data.subIndustryClassification,
            assessmentRate: response.data.currentRate || 3.12, // 2025 NL average (highest in Atlantic)
            experienceRating: response.data.experienceRating || 1.0,
            accountExists: true,
            assessablePayroll: response.data.payrollAmount,
            offshoreCompliant: response.data.offshoreCompliance, // Offshore petroleum compliance
            safetyPrograms: response.data.activeSafetyPrograms || [],
            atlanticClearanceRecognition: response.data.atlanticHarmonization,
            ruralRemoteClassification: response.data.ruralRemoteStatus
          };
        }, 'whscc:clearance');
      },
      
      getOffshoreCompliance: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('whscc').client.get(
            `/offshore/${this.sanitizeInput(accountNumber)}/compliance`
          );
          
          return {
            offshoreAuthorized: response.data.authorizedForOffshore,
            cnlopbCompliant: response.data.cnlopbCompliance, // Canada-NL Offshore Petroleum Board
            survivalTraining: response.data.basicSurvivalTraining,
            helideckCertification: response.data.helideckCertified,
            marineSafety: response.data.marineSafetyCompliant,
            lastOffshoreInspection: response.data.lastInspectionDate
          };
        }, 'whscc:offshore');
      }
    });
    
    // College of the North Atlantic (CNA) - Trades & Apprenticeship
    this.apis.set('cna', {
      client: this.createSecureClient(
        process.env.CNA_URL || 'https://www.cna.nl.ca/apprenticeship/api',
        {
          apiKey: process.env.CNA_API_KEY,
          headers: {
            'X-CNA-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Atlantic-Trades': 'enabled'
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('cna').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            tradeName: trade ? this.sanitizeInput(trade) : undefined,
            includeRedSeal: true,
            includeAtlanticMobility: true,
            includeOffshoreEndorsement: true, // NL-specific offshore endorsements
            includeRemoteWorkCertification: true
          });
          
          return {
            valid: response.data.isActive,
            certificationType: response.data.certificateClass,
            tradeName: response.data.trade,
            journeypersonLevel: response.data.level,
            redSealCertified: response.data.hasRedSeal,
            atlanticTradesCertified: response.data.atlanticHarmonized,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            status: response.data.currentStatus,
            offshoreEndorsement: response.data.offshoreQualified,
            remoteWorkCertified: response.data.remoteWorkQualification,
            icebergWatchCertified: response.data.icebergWatch, // Unique to NL waters
            helideckCertified: response.data.helideckOps
          };
        }, 'cna:certification');
      },
      
      checkApprenticeStatus: async (apprenticeId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('cna').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeId)}/status`
          );
          
          return {
            active: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            sponsor: response.data.sponsorEmployer,
            hoursCompleted: response.data.hoursLogged,
            hoursRequired: response.data.totalHoursRequired,
            technicalTraining: response.data.institutionalTraining,
            workTerm: response.data.workTermStatus,
            campusLocation: response.data.trainingCampus, // CNA has 17 campuses
            ruralProgram: response.data.ruralTradesProgram,
            indigenousProgram: response.data.indigenousInitiative,
            labradoreseProgram: response.data.labradoreseLanguageSupport
          };
        }, 'cna:apprentice');
      }
    });
    
    // Newfoundland and Labrador Construction Association (NLCA)
    this.apis.set('nlca', {
      client: this.createSecureClient(
        process.env.NLCA_URL || 'https://nlca.ca/api',
        { 
          apiKey: process.env.NLCA_API_KEY,
          headers: {
            'X-NLCA-Version': '2.0'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nlca').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeCorStatus: true,
            includeOffshoreCapability: true,
            includeRuralProjects: true,
            includeIcebergMitigation: true // Unique NL requirement
          });
          
          return {
            isMember: response.data.activeMember,
            membershipTier: response.data.membershipLevel,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            corCertified: response.data.hasCOR,
            corExpiryDate: response.data.corExpiry,
            offshoreCapable: response.data.offshoreQualified,
            icebergMitigationTrained: response.data.icebergMitigation,
            ruralProjectExperience: response.data.ruralExperience,
            safetyRating: response.data.safetyScore,
            bondingCapacity: response.data.bondingLimit,
            flyflyRotation: response.data.flyInFlyOutCapable, // Common NL work arrangement
            weatherDelayInsurance: response.data.weatherInsurance
          };
        }, 'nlca:membership');
      }
    });
    
    // Innu Nation Economic Development (INED) & NunatuKavut Community Council
    this.apis.set('indigenousNL', {
      client: this.createSecureClient(
        process.env.INDIGENOUS_NL_URL || 'https://indigenousbusiness.nl.ca/api',
        { apiKey: process.env.INDIGENOUS_NL_API_KEY }
      ),
      
      verifyIndigenousBusiness: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('indigenousNL').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            verified: response.data.isVerified,
            registrationNumber: response.data.registrationNumber,
            ownershipPercentage: response.data.indigenousOwnership,
            nationAffiliation: response.data.nationAffiliation, // Innu, NunatuKavut, Mi'kmaq
            communityLocation: response.data.community,
            certificationDate: response.data.certDate,
            procurementReady: response.data.procurementCapable,
            impactBenefitAgreement: response.data.ibaEligible,
            capacityLevel: response.data.businessCapacity,
            labradoreanBusiness: response.data.labradorLocation,
            remoteCommunityBased: response.data.remoteCommunity
          };
        }, 'indigenousNL:verify');
      }
    });
    
    // NL Department of Finance - Tax Debt Verification
    this.apis.set('nlFinance', {
      client: this.createSecureClient(
        process.env.NL_FINANCE_URL || 'https://www.gov.nl.ca/finance/api',
        {
          apiKey: process.env.NL_FINANCE_API_KEY,
          headers: {
            'X-NL-Finance-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Finance-Version': '2.0'
          }
        }
      ),
      
      verifyTaxDebt: async (request: TaxDebtVerificationRequest) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nlFinance').client.post('/tax/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            companyNumber: this.sanitizeInput(request.businessIdentifier || ''),
            consentToken: request.consentToken,
            verificationScope: 'comprehensive',
            includeHST: true, // NL has HST
            includePayrollTax: true,
            includeHealthPostSecondaryTax: true,
            includeGasTax: true,
            includeMiningTax: true,
            includeOffshoreRevenue: true, // Oil & gas revenues
            includeEnvironmentalFees: true,
            includePaymentArrangements: true,
            includeRemoteDeliveryCharges: true // Labrador specific
          });
          
          return this.validateTaxDebtResponse(response.data);
        }, 'nlFinance:taxDebt');
      },
      
      getComplianceStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('nlFinance').client.get(
            `/tax/compliance/${this.sanitizeInput(businessNumber)}`
          );
          
          return {
            filingCompliance: response.data.filingStatus,
            paymentCompliance: response.data.paymentStatus,
            outstandingReturns: response.data.missingReturns || [],
            lastFilingDate: response.data.lastFiling,
            complianceScore: response.data.score,
            offshoreFilingRequired: response.data.offshoreFilings
          };
        }, 'nlFinance:compliance');
      }
    });
  }
  
  /**
   * Main verification method for Newfoundland & Labrador
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
      
      // Add NLCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyNLCAMembership(request.businessName));
      }
      
      // Add Indigenous verification if indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyIndigenousNLCertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, nlcaResult, indigenousResult] = results;
      
      // Calculate confidence with remote/offshore factors
      const confidence = this.calculateConfidenceWithRemoteFactors(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'NL',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: nlcaResult?.status === 'fulfilled' ? nlcaResult.value : null,
          indigenousCertification: indigenousResult?.status === 'fulfilled' ? indigenousResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        atlanticHarmonization: this.checkAtlanticHarmonization(results),
        offshoreCapabilities: this.checkOffshoreCapabilities(results),
        remoteWorkCapabilities: this.checkRemoteWorkCapabilities(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Newfoundland & Labrador verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Newfoundland & Labrador
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search in Registry of Companies and Deeds
      const searchResults = await this.apis.get('registryNL').searchCompany(
        businessName,
        businessNumber
      );
      
      if (!searchResults.companies || searchResults.companies.length === 0) {
        return {
          found: false,
          message: 'Business not found in Newfoundland & Labrador Registry of Companies'
        };
      }
      
      // Get detailed information for the first match
      const company = searchResults.companies[0];
      const details = await this.apis.get('registryNL').getCompanyDetails(
        company.companyNumber
      );
      
      // Get filing history
      const filingHistory = await this.apis.get('registryNL').getFilingHistory(
        company.companyNumber
      );
      
      return {
        found: true,
        companyNumber: details.companyNumber,
        legalName: details.legalName,
        businessName: details.businessName,
        status: details.status,
        entityType: details.entityType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredOfficeAddress,
          city: details.city,
          province: 'NL',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        shareholders: details.shareholders?.length || 0,
        authorizedCapital: details.authorizedCapital,
        lastFilingDate: filingHistory.lastAnnualReturn,
        goodStanding: details.inGoodStanding && filingHistory.currentFilings,
        filingStatus: filingHistory.currentFilings,
        outstandingFilings: filingHistory.outstandingFilings,
        penalties: filingHistory.penalties,
        businessNumber: details.businessNumber,
        extraprovincialRegistration: details.extraprovincialRegistration,
        principalPlace: details.principalPlaceOfBusiness,
        isLabradorBased: details.principalPlaceOfBusiness?.includes('Labrador') || false
      };
    } catch (error) {
      throw new Error(`NL Registry verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WHSCC compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map to WHSCC account number
      const whsccAccount = await this.mapToWHSCCAccount(businessIdentifier);
      
      const clearance = await this.apis.get('whscc').verifyClearance(whsccAccount);
      
      if (!clearance.accountExists) {
        return {
          compliant: false,
          reason: 'No WHSCC account found',
          required: true
        };
      }
      
      // Get offshore compliance if applicable
      let offshoreCompliance = null;
      if (clearance.offshoreCompliant) {
        try {
          offshoreCompliance = await this.apis.get('whscc').getOffshoreCompliance(whsccAccount);
        } catch (error) {
          // Offshore compliance is optional
        }
      }
      
      return {
        compliant: clearance.inGoodStanding,
        clearanceNumber: clearance.clearanceCertificateNumber,
        issueDate: clearance.issueDate,
        expiryDate: clearance.expiryDate,
        industryCode: clearance.industryCode,
        subIndustry: clearance.subIndustry,
        assessmentRate: clearance.assessmentRate,
        experienceRating: clearance.experienceRating,
        assessablePayroll: clearance.assessablePayroll,
        offshoreCompliant: clearance.offshoreCompliant,
        safetyPrograms: clearance.safetyPrograms,
        atlanticClearanceRecognition: clearance.atlanticClearanceRecognition,
        ruralRemoteClassification: clearance.ruralRemoteClassification,
        offshoreDetails: offshoreCompliance,
        safetyMetrics: {
          rateComparison: this.compareToProvincialRate(clearance.assessmentRate),
          experienceRating: this.interpretExperienceRating(clearance.experienceRating),
          offshoreQualification: clearance.offshoreCompliant,
          ruralRemoteCapability: clearance.ruralRemoteClassification,
          recommendation: this.getSafetyRecommendation(clearance, offshoreCompliance)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WHSCC verification failed: ${error.message}`
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
    
    const nlWorkers = workers.filter(w => 
      w.provinces.includes('NL') || 
      w.certifications.some(c => c.province === 'NL')
    );
    
    if (nlWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Newfoundland & Labrador workers to verify' };
    }
    
    const verificationPromises = nlWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'NL' || cert.redSeal || cert.atlanticCertified)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(nlWorkers);
    
    // Count specialized certifications
    const redSealCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.redSealCertified
    ).length;
    
    const atlanticCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.atlanticTradesCertified
    ).length;
    
    const offshoreCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.offshoreEndorsement
    ).length;
    
    const remoteWorkCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.remoteWorkCertified
    ).length;
    
    const icebergWatchCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.icebergWatchCertified
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: nlWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      redSealCertified: redSealCount,
      atlanticTradesCertified: atlanticCount,
      specializedCertifications: {
        offshoreEndorsed: offshoreCount,
        remoteWorkCertified: remoteWorkCount,
        icebergWatchCertified: icebergWatchCount,
        helideckCertified: results.filter(r => 
          r.status === 'fulfilled' && r.value.helideckCertified
        ).length
      },
      geographicCapabilities: this.assessGeographicCapabilities(results, apprenticeChecks)
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
      const certResult = await this.apis.get('cna').verifyCertification(
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
        offshoreEndorsement: certResult.offshoreEndorsement,
        remoteWorkCertified: certResult.remoteWorkCertified,
        icebergWatchCertified: certResult.icebergWatchCertified,
        helideckCertified: certResult.helideckCertified,
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
   * Verify NLCA membership
   */
  private async verifyNLCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('nlca').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Newfoundland and Labrador Construction Association',
        isMember: membership.isMember,
        membershipTier: membership.membershipTier,
        memberSince: membership.memberSince,
        corCertified: membership.corCertified,
        corExpiryDate: membership.corExpiryDate,
        offshoreCapable: membership.offshoreCapable,
        icebergMitigationTrained: membership.icebergMitigationTrained,
        ruralProjectExperience: membership.ruralProjectExperience,
        safetyRating: membership.safetyRating,
        bondingCapacity: membership.bondingCapacity,
        flyflyRotation: membership.flyflyRotation,
        weatherDelayInsurance: membership.weatherDelayInsurance,
        benefits: membership.isMember ? [
          'COR safety certification program',
          'Offshore petroleum industry access',
          'Iceberg mitigation training',
          'Rural and remote project capability',
          'Fly-in/fly-out rotation management',
          'Weather delay insurance programs',
          'Atlantic construction mobility'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'NLCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify Indigenous NL certification
   */
  private async verifyIndigenousNLCertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('indigenousNL').verifyIndigenousBusiness(businessName);
      
      return {
        type: 'indigenousCertification',
        certifier: 'Indigenous Business NL',
        verified: certification.verified,
        registrationNumber: certification.registrationNumber,
        ownershipPercentage: certification.ownershipPercentage,
        nationAffiliation: certification.nationAffiliation,
        communityLocation: certification.communityLocation,
        certificationDate: certification.certificationDate,
        procurementReady: certification.procurementReady,
        impactBenefitAgreement: certification.impactBenefitAgreement,
        capacityLevel: certification.capacityLevel,
        labradoreanBusiness: certification.labradoreanBusiness,
        remoteCommunityBased: certification.remoteCommunityBased,
        eligibleForSetAsides: certification.ownershipPercentage >= 51,
        atlanticIndigenousNetwork: true
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certifier: 'Indigenous NL',
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
      const response = await this.apis.get('registryNL').client.get('/health');
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
      'foundation', 'marine', 'offshore', 'petroleum', 'drilling'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'welder',
         'heavy equipment operator', 'crane operator', 'marine engineer',
         'offshore technician', 'petroleum engineer'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'innu', 'nunatukavut', 'mi\'kmaq', 'mikmaq',
      'indigenous', 'aboriginal', 'native', 'band', 'nation', 'tribal',
      'labrador', 'inuit', 'metis', 'métis'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WHSCC account
   */
  private async mapToWHSCCAccount(businessIdentifier: string): Promise<string> {
    // Check if already WHSCC account format
    if (businessIdentifier.match(/^NL\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `NL${digits.substring(0, 6)}`;
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': 'NL123456',
      '987654321RC0001': 'NL987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare to provincial average rate
   */
  private compareToProvincialRate(rate: number): string {
    const provincialAverage = 3.12; // 2025 NL average (highest in Atlantic)
    const difference = ((rate - provincialAverage) / provincialAverage) * 100;
    
    if (difference < -25) return `${Math.abs(difference).toFixed(1)}% below provincial average (exceptional)`;
    if (difference < -15) return `${Math.abs(difference).toFixed(1)}% below average (excellent)`;
    if (difference < -5) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 5) return `Within ${Math.abs(difference).toFixed(1)}% of average`;
    if (difference < 20) return `${difference.toFixed(1)}% above average (attention needed)`;
    return `${difference.toFixed(1)}% above average (immediate improvement required)`;
  }
  
  /**
   * Interpret experience rating
   */
  private interpretExperienceRating(rating: number): string {
    if (rating < 0.75) return `${rating.toFixed(2)} - Excellent safety record (maximum discount)`;
    if (rating < 1.0) return `${rating.toFixed(2)} - Good safety record (discount applied)`;
    if (rating === 1.0) return `${rating.toFixed(2)} - Average safety record (standard rate)`;
    if (rating <= 1.25) return `${rating.toFixed(2)} - Below average safety record (surcharge)`;
    return `${rating.toFixed(2)} - Poor safety record (significant surcharge)`;
  }
  
  /**
   * Get safety recommendation
   */
  private getSafetyRecommendation(clearance: any, offshoreCompliance: any): string {
    const rate = clearance.assessmentRate || 3.12;
    const rating = clearance.experienceRating || 1.0;
    const isOffshore = clearance.offshoreCompliant;
    const hasPrograms = clearance.safetyPrograms?.length > 0;
    
    if (rate <= 2.50 && rating <= 0.85 && isOffshore) {
      return 'Outstanding safety performance - qualified for offshore petroleum and remote operations';
    }
    if (rate <= 3.12 && rating <= 1.0) {
      return hasPrograms ? 
        'Good safety performance - maintain certifications and consider offshore qualification' :
        isOffshore ? 'Good performance - maintain offshore compliance and consider additional programs' :
        'Good performance - consider offshore petroleum training for expanded opportunities';
    }
    if (rate <= 3.74) {
      return 'Average performance - implement comprehensive safety management system and consider COR certification';
    }
    return 'High risk profile - mandatory WHSCC consultation, comprehensive safety overhaul, and quarterly reviews required';
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
        ruralProgram: 0,
        indigenousProgram: 0,
        labradoreseSupport: 0 
      };
    }
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeIds.map(id => this.apis.get('cna').checkApprenticeStatus(id))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.active
    );
    
    const ruralProgram = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.ruralProgram
    ).length;
    
    const indigenousProgram = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.indigenousProgram
    ).length;
    
    const labradoreseSupport = activeApprentices.filter(
      r => (r as PromiseFulfilledResult<any>).value.labradoreseProgram
    ).length;
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      ruralProgram: ruralProgram,
      indigenousProgram: indigenousProgram,
      labradoreseSupport: labradoreseSupport,
      campusDistribution: this.calculateCampusDistribution(activeApprentices)
    };
  }
  
  /**
   * Calculate confidence with remote factors
   */
  private calculateConfidenceWithRemoteFactors(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost for offshore capabilities
    const hasOffshoreCapabilities = results.some(r => 
      r.status === 'fulfilled' && 
      (r.value.offshoreCapable || r.value.offshoreCompliant)
    );
    
    // Boost for remote work capabilities
    const hasRemoteCapabilities = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.geographicCapabilities?.remoteCapable
    );
    
    // Boost for Labrador operations
    const hasLabradorCapabilities = results.some(r => 
      r.status === 'fulfilled' && 
      (r.value.isLabradorBased || r.value.labradoreanBusiness)
    );
    
    let adjustedConfidence = baseConfidence;
    if (hasOffshoreCapabilities) adjustedConfidence += 5;
    if (hasRemoteCapabilities) adjustedConfidence += 3;
    if (hasLabradorCapabilities) adjustedConfidence += 2;
    
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
      r.status === 'fulfilled' && r.value.atlanticClearanceRecognition
    );
    
    return {
      eligible: !!(tradeResult || safetyResult),
      tradeMobility: tradeResult?.status === 'fulfilled' ? {
        certifiedWorkers: tradeResult.value.atlanticTradesCertified,
        provinces: ['NL', 'NB', 'NS', 'PE', 'MB']
      } : null,
      safetyRecognition: safetyResult?.status === 'fulfilled' && safetyResult.value.atlanticClearanceRecognition,
      benefits: [
        'Full Atlantic provinces worker mobility',
        'WCB clearance reciprocity across Atlantic Canada',
        'Harmonized offshore safety standards',
        'Joint apprenticeship programs'
      ]
    };
  }
  
  /**
   * Check offshore capabilities
   */
  private checkOffshoreCapabilities(results: PromiseSettledResult<any>[]): any {
    const membershipResult = results.find(r => 
      r.status === 'fulfilled' && r.value.offshoreCapable !== undefined
    );
    
    const safetyResult = results.find(r => 
      r.status === 'fulfilled' && r.value.offshoreCompliant
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.specializedCertifications
    );
    
    return {
      qualified: !!(membershipResult || safetyResult),
      industryAccess: membershipResult?.status === 'fulfilled' && membershipResult.value.offshoreCapable,
      safetyCompliance: safetyResult?.status === 'fulfilled' && safetyResult.value.offshoreCompliant,
      specializedCertifications: tradesResult?.status === 'fulfilled' ? tradesResult.value.specializedCertifications : null,
      capabilities: [
        'Offshore petroleum operations',
        'Marine construction',
        'Helicopter deck operations',
        'Iceberg watch and mitigation',
        'CNLOPB compliance',
        'Survival training certification'
      ]
    };
  }
  
  /**
   * Check remote work capabilities
   */
  private checkRemoteWorkCapabilities(results: PromiseSettledResult<any>[]): any {
    const businessResult = results.find(r => 
      r.status === 'fulfilled' && r.value.isLabradorBased !== undefined
    );
    
    const tradesResult = results.find(r => 
      r.status === 'fulfilled' && r.value.geographicCapabilities
    );
    
    const membershipResult = results.find(r => 
      r.status === 'fulfilled' && r.value.flyflyRotation !== undefined
    );
    
    return {
      capable: !!(businessResult || tradesResult || membershipResult),
      labradorOperations: businessResult?.status === 'fulfilled' && businessResult.value.isLabradorBased,
      flyflyRotation: membershipResult?.status === 'fulfilled' && membershipResult.value.flyflyRotation,
      remoteProjectExperience: membershipResult?.status === 'fulfilled' && membershipResult.value.ruralProjectExperience,
      weatherDelayInsurance: membershipResult?.status === 'fulfilled' && membershipResult.value.weatherDelayInsurance,
      capabilities: [
        'Remote community operations',
        'Fly-in/fly-out workforce management',
        'Extreme weather adaptability',
        'Rural and isolated project delivery',
        'Multi-lingual support (Labradorese, Inuktitut)',
        'Cultural sensitivity training'
      ]
    };
  }
  
  /**
   * Assess geographic capabilities
   */
  private assessGeographicCapabilities(results: PromiseSettledResult<any>[], apprenticeChecks: any): any {
    const offshoreCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.offshoreEndorsement
    ).length;
    
    const remoteCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.remoteWorkCertified
    ).length;
    
    const totalWorkers = results.length;
    
    return {
      offshoreCapable: offshoreCount > 0,
      remoteCapable: remoteCount > 0 || apprenticeChecks.ruralProgram > 0,
      offshoreWorkers: offshoreCount,
      remoteWorkers: remoteCount,
      ruralTrainees: apprenticeChecks.ruralProgram || 0,
      labradorSupport: apprenticeChecks.labradoreseSupport || 0,
      geographicPercentage: totalWorkers > 0 ? ((offshoreCount + remoteCount) / totalWorkers * 100).toFixed(0) : 0
    };
  }
  
  /**
   * Calculate campus distribution
   */
  private calculateCampusDistribution(apprentices: PromiseFulfilledResult<any>[]): any {
    const campuses = apprentices
      .map(r => r.value.campusLocation)
      .filter(campus => campus);
    
    const distribution = campuses.reduce((acc, campus) => {
      acc[campus] = (acc[campus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalCampuses: Object.keys(distribution).length,
      distribution: distribution,
      stJohnsArea: (distribution['St. Johns'] || 0) + (distribution['Ridge Road'] || 0),
      labradoreaCampuses: (distribution['Happy Valley-Goose Bay'] || 0) + (distribution['Labrador West'] || 0)
    };
  }
  
  /**
   * Validate Registry response
   */
  private validateRegistryResponse(data: any): any {
    const schema = z.object({
      companies: z.array(z.object({
        companyNumber: z.string(),
        legalName: z.string(),
        businessName: z.string().optional(),
        status: z.string(),
        entityType: z.string(),
        incorporationDate: z.string().optional()
      })),
      totalResults: z.number(),
      searchParameters: z.object({
        companyName: z.string().optional(),
        companyNumber: z.string().optional()
      })
    });
    
    return schema.parse(data);
  }
  
  /**
   * Validate company details
   */
  private validateCompanyDetails(data: any): any {
    const schema = z.object({
      companyNumber: z.string(),
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
      authorizedCapital: z.number().optional(),
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
      extraprovincialRegistration: z.boolean(),
      principalPlaceOfBusiness: z.string().optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify tax debt status with NL Finance
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
      const taxDebtResult = await this.apis.get('nlFinance').verifyTaxDebt(request);
      
      // Get compliance status
      const complianceStatus = await this.apis.get('nlFinance').getComplianceStatus(
        request.businessNumber
      );
      
      // Calculate risk score for NL
      const riskScore = this.calculateNLTaxDebtRiskScore(taxDebtResult, complianceStatus);
      
      const result: ProvincialTaxDebt = {
        province: 'NL',
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
        `tax-debt:NL:${request.businessNumber}`,
        result,
        { encrypt: true, ttl: 3600 } // 1 hour TTL for tax data
      );
      
      // Audit log
      await this.auditLog({
        action: 'tax_debt_verification',
        province: 'NL',
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
        province: 'NL',
        businessNumber: request.businessNumber,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`NL tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate NL-specific tax debt risk score
   */
  private calculateNLTaxDebtRiskScore(taxDebt: any, compliance: any): number {
    let score = 0;
    
    // Base score on total debt amount
    const totalDebt = taxDebt.totalOwing || 0;
    if (totalDebt === 0) return 0;
    if (totalDebt < 10000) score += 10;
    else if (totalDebt < 50000) score += 25;
    else if (totalDebt < 200000) score += 50;
    else if (totalDebt < 1000000) score += 75;
    else score += 90;
    
    // Offshore revenue debts (high priority)
    const hasOffshoreDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Offshore Petroleum Royalty' || d.taxType === 'Offshore Revenue Share'
    );
    if (hasOffshoreDebt) score += 20;
    
    // Mining tax debt
    const hasMiningDebt = taxDebt.taxDebts?.some((d: any) => d.taxType === 'Mining Tax');
    if (hasMiningDebt) score += 15;
    
    // HST debt
    const hasHSTDebt = taxDebt.taxDebts?.some((d: any) => d.taxType === 'HST');
    if (hasHSTDebt) score += 10;
    
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
    
    // Offshore filing requirements
    if (compliance.offshoreFilingRequired && compliance.filingCompliance !== 'Compliant') {
      score += 10; // Additional risk for missing offshore filings
    }
    
    // Age of debt
    const oldestDebt = Math.max(...(taxDebt.taxDebts?.map((d: any) => d.daysPastDue) || [0]));
    if (oldestDebt > 365) score += 15;
    else if (oldestDebt > 180) score += 10;
    else if (oldestDebt > 90) score += 5;
    
    // Remote location considerations
    const hasRemoteDeliveryDebt = taxDebt.taxDebts?.some((d: any) => 
      d.taxType === 'Remote Delivery Charge' || d.taxType === 'Labrador Transportation Tax'
    );
    if (hasRemoteDeliveryDebt && oldestDebt < 180) score -= 5; // Consider remote challenges
    
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