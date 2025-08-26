/**
 * Manitoba Provincial Verification Agent
 * 
 * @module ManitobaAgent
 * @description Verifies businesses in Manitoba through provincial registries
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
 * Manitoba verification agent
 * Integrates with Manitoba Companies Office, WCB Manitoba, and Apprenticeship Manitoba
 */
export class ManitobaAgent extends BaseProvincialAgent {
  constructor() {
    super('MB');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Manitoba-specific APIs
   */
  private initializeAPIs(): void {
    // Manitoba Companies Office
    this.apis.set('companiesOffice', {
      client: this.createSecureClient(
        process.env.MB_COMPANIES_OFFICE_URL || 'https://companiesoffice.gov.mb.ca/api',
        {
          apiKey: process.env.MB_COMPANIES_OFFICE_API_KEY,
          headers: {
            'X-MB-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-API-Version': '2.0'
          }
        }
      ),
      
      searchCorporation: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('companiesOffice').client.post('/corporations/search', {
            searchCriteria: {
              corporationName: this.sanitizeInput(name),
              corporationNumber: number ? this.sanitizeInput(number) : undefined,
              status: ['Active', 'In Good Standing'],
              includeNameHistory: true
            },
            resultLimit: 50
          });
          
          return this.validateCompaniesOfficeResponse(response.data);
        }, 'companiesOffice:search');
      },
      
      getCorporationDetails: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('companiesOffice').client.get(
            `/corporations/${this.sanitizeInput(corporationNumber)}/details`
          );
          
          return this.validateCorporationDetails(response.data);
        }, 'companiesOffice:details');
      },
      
      getBusinessPartnership: async (registrationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('companiesOffice').client.get(
            `/partnerships/${this.sanitizeInput(registrationNumber)}`
          );
          
          return response.data;
        }, 'companiesOffice:partnership');
      }
    });
    
    // WCB Manitoba (Workers Compensation Board of Manitoba)
    this.apis.set('wcbManitoba', {
      client: this.createSecureClient(
        process.env.WCB_MB_URL || 'https://www.wcb.mb.ca/api',
        {
          apiKey: process.env.WCB_MB_API_KEY,
          headers: {
            'X-WCB-MB-Version': '3.0',
            'Accept': 'application/json'
          }
        }
      ),
      
      verifyCoverage: async (accountNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbManitoba').client.post('/employers/verify-coverage', {
            accountNumber: this.sanitizeInput(accountNumber),
            verificationType: 'detailed',
            includeRates: true,
            includeExperienceRating: true
          });
          
          if (response.status === 404) {
            return { 
              hasCoverage: false, 
              reason: 'Account not found',
              accountExists: false 
            };
          }
          
          return {
            hasCoverage: response.data.coverageStatus === 'Active',
            clearanceStatus: response.data.clearanceStatus,
            clearanceCertificateNumber: response.data.certificateNumber,
            issueDate: new Date(response.data.issueDate),
            expiryDate: new Date(response.data.expiryDate),
            industryCode: response.data.industryClassification,
            rateCode: response.data.rateCode,
            premiumRate: response.data.assessmentRate || 1.45, // 2025 Manitoba average
            experienceRating: response.data.experienceRating,
            maximumAssessableEarnings: 382050, // 2025 maximum
            accountExists: true,
            complianceStatus: response.data.complianceStatus,
            lastAssessmentDate: response.data.lastAssessmentDate
          };
        }, 'wcbManitoba:coverage');
      },
      
      getIndustryStatistics: async (industryCode: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('wcbManitoba').client.get(
            `/industries/${this.sanitizeInput(industryCode)}/statistics`
          );
          
          return {
            averageRate: response.data.averageRate,
            injuryRate: response.data.injuryRate,
            claimsCost: response.data.averageClaimsCost,
            safetyPrograms: response.data.recommendedPrograms
          };
        }, 'wcbManitoba:industryStats');
      }
    });
    
    // Apprenticeship Manitoba (now online-only as of January 2025)
    this.apis.set('apprenticeshipMB', {
      client: this.createSecureClient(
        process.env.APPRENTICESHIP_MB_URL || 'https://apprenticeship.mb.ca/api',
        {
          apiKey: process.env.APPRENTICESHIP_MB_API_KEY,
          headers: {
            'X-AMB-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'X-Platform': 'Online-Portal-2025'
          }
        }
      ),
      
      verifyCertification: async (certificateNumber: string, trade?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('apprenticeshipMB').client.post('/certifications/verify', {
            certificateNumber: this.sanitizeInput(certificateNumber),
            trade: trade ? this.sanitizeInput(trade) : undefined,
            verificationLevel: 'comprehensive',
            includeRedSeal: true,
            includeAtlanticHarmonization: true // New for 2025
          });
          
          return {
            valid: response.data.isValid,
            certificationType: response.data.certificationType,
            tradeName: response.data.tradeName,
            level: response.data.certificationLevel,
            redSealEndorsement: response.data.hasRedSeal,
            atlanticMobility: response.data.atlanticHarmonizationApproved,
            issueDate: response.data.issueDate ? new Date(response.data.issueDate) : undefined,
            renewalDate: response.data.renewalDate ? new Date(response.data.renewalDate) : undefined,
            status: response.data.status,
            onlinePortalRegistered: response.data.registeredInNewSystem
          };
        }, 'apprenticeshipMB:verifyCertification');
      },
      
      checkApprenticeStatus: async (apprenticeId: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('apprenticeshipMB').client.get(
            `/apprentices/${this.sanitizeInput(apprenticeId)}/status`
          );
          
          return {
            registered: response.data.isActive,
            trade: response.data.tradeName,
            level: response.data.currentLevel,
            employer: response.data.currentEmployer,
            hoursCompleted: response.data.totalHours,
            hoursRequired: response.data.requiredHours,
            technicalTraining: response.data.technicalTrainingStatus,
            expectedCompletionDate: response.data.projectedCompletionDate,
            onlineAccountActive: response.data.hasOnlineAccount
          };
        }, 'apprenticeshipMB:checkApprentice');
      }
    });
    
    // Manitoba Construction Association (MCA)
    this.apis.set('mca', {
      client: this.createSecureClient(
        process.env.MCA_URL || 'https://mbconstruction.ca/api',
        { 
          apiKey: process.env.MCA_API_KEY,
          headers: {
            'X-MCA-Version': '2.0'
          }
        }
      ),
      
      verifyMembership: async (companyName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mca').client.post('/members/verify', {
            companyName: this.sanitizeInput(companyName),
            includeGoldSeal: true,
            includeSafetyCertifications: true
          });
          
          return {
            isMember: response.data.activeMember,
            membershipLevel: response.data.membershipTier,
            memberSince: response.data.joinDate ? new Date(response.data.joinDate) : undefined,
            goldSealCertified: response.data.hasGoldSeal,
            corCertified: response.data.hasCOR,
            secorCertified: response.data.hasSECOR,
            safetyRating: response.data.safetyScore,
            indigenousPartnership: response.data.indigenousBusinessPartnership
          };
        }, 'mca:verifyMembership');
      }
    });
    
    // Manitoba Indigenous Business Directory (optional integration)
    this.apis.set('indigenousMB', {
      client: this.createSecureClient(
        process.env.MB_INDIGENOUS_BIZ_URL || 'https://indigenousbusiness.mb.ca/api',
        { apiKey: process.env.MB_INDIGENOUS_BIZ_API_KEY }
      ),
      
      checkCertification: async (businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('indigenousMB').client.get(
            `/businesses/verify?name=${encodeURIComponent(this.sanitizeInput(businessName))}`
          );
          
          return {
            certified: response.data.isCertified,
            certificationNumber: response.data.certNumber,
            ownershipPercentage: response.data.indigenousOwnership,
            certificationDate: response.data.certDate,
            communityAffiliation: response.data.community
          };
        }, 'indigenousMB:checkCertification');
      }
    });
    
    // Manitoba Finance - Tax Debt API
    this.apis.set('mbFinance', {
      client: this.createSecureClient(
        process.env.MB_FINANCE_URL || 'https://api.gov.mb.ca/finance/tax-verification',
        {
          apiKey: process.env.MB_FINANCE_API_KEY,
          headers: {
            'X-MB-Service': 'Tax-Debt-Verification',
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
          const response = await this.apis.get('mbFinance').client.post('/debt/verify', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            businessName: this.sanitizeInput(request.businessName),
            consentToken: request.consent.consentNumber,
            taxTypes: [
              'provincial_corporate_tax',
              'rst', // Retail Sales Tax
              'payroll_tax',
              'health_education_levy',
              'fuel_tax',
              'tobacco_tax',
              'mining_tax',
              'land_transfer_tax',
              'insurance_corporation_tax',
              'health_wellness_tax'
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance
          });
          
          return this.transformMBTaxDebtResponse(response.data);
        }, 'mbFinance:taxDebt', 30000);
      },
      
      getRSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mbFinance').client.get(
            `/rst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          return {
            registered: response.data.registered,
            accountNumber: response.data.rstAccountNumber,
            registrationDate: response.data.registrationDate,
            filingFrequency: response.data.filingFrequency,
            outstandingBalance: response.data.balance || 0,
            lastFilingDate: response.data.lastFilingDate,
            complianceStatus: response.data.complianceStatus
          };
        }, 'mbFinance:rst');
      },
      
      getPayrollTaxStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mbFinance').client.get(
            `/payroll-tax/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.payrollTaxAccount,
            annualPayroll: response.data.annualPayroll || 0,
            exemptionThreshold: response.data.exemptionThreshold || 2500000, // 2025 threshold
            outstandingBalance: response.data.balance || 0,
            taxRate: response.data.currentRate || 0.0425 // 4.25% rate for 2025
          };
        }, 'mbFinance:payrollTax');
      },
      
      getHealthEducationLevyStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('mbFinance').client.get(
            `/health-education-levy/${this.sanitizeInput(businessNumber)}/account`
          );
          
          if (response.status === 404) {
            return { required: false, registered: false };
          }
          
          return {
            required: true,
            registered: true,
            accountNumber: response.data.levyAccount,
            annualPayroll: response.data.annualPayroll || 0,
            exemptionThreshold: response.data.exemptionThreshold || 2000000, // 2025 threshold
            outstandingBalance: response.data.balance || 0,
            levyRate: response.data.currentRate || 0.0225 // 2.25% rate for 2025
          };
        }, 'mbFinance:healthEducationLevy');
      }
    });
  }
  
  /**
   * Main verification method for Manitoba
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
      
      // Add MCA membership check if construction-related
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyMCAMembership(request.businessName));
      }
      
      // Add Indigenous certification check if indicated
      if (request.indigenousOwned || this.hasIndigenousIndicators(request)) {
        verificationTasks.push(this.verifyIndigenousCertification(request.businessName));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, mcaResult, indigenousResult] = results;
      
      // Calculate confidence with Atlantic harmonization consideration
      const confidence = this.calculateConfidenceWithHarmonization(results);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'MB',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          industryAssociation: mcaResult?.status === 'fulfilled' ? mcaResult.value : null,
          indigenousCertification: indigenousResult?.status === 'fulfilled' ? indigenousResult.value : null
        },
        confidence,
        errors: this.extractErrors(results),
        atlanticHarmonization: this.checkAtlanticHarmonization(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Manitoba verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Manitoba
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Search for corporation
      const searchResults = await this.apis.get('companiesOffice').searchCorporation(
        businessName,
        businessNumber
      );
      
      if (!searchResults.corporations || searchResults.corporations.length === 0) {
        // Try partnership search
        if (businessNumber) {
          try {
            const partnership = await this.apis.get('companiesOffice').getBusinessPartnership(
              businessNumber
            );
            
            return {
              found: true,
              entityType: 'Partnership',
              registrationNumber: partnership.registrationNumber,
              businessName: partnership.name,
              status: partnership.status,
              registrationDate: partnership.registrationDate,
              partners: partnership.partners?.length || 0,
              goodStanding: partnership.status === 'Active'
            };
          } catch {
            // Not a partnership either
          }
        }
        
        return {
          found: false,
          message: 'Business not found in Manitoba Companies Office'
        };
      }
      
      // Get detailed information for the first match
      const corporation = searchResults.corporations[0];
      const details = await this.apis.get('companiesOffice').getCorporationDetails(
        corporation.corporationNumber
      );
      
      return {
        found: true,
        corporationNumber: details.corporationNumber,
        legalName: details.legalName,
        operatingName: details.operatingName,
        status: details.status,
        entityType: details.corporationType,
        incorporationDate: details.incorporationDate,
        registeredOffice: {
          address: details.registeredOfficeAddress,
          city: details.city,
          province: 'MB',
          postalCode: details.postalCode
        },
        directors: details.directors?.length || 0,
        lastAnnualFilingDate: details.lastAnnualReturnDate,
        goodStanding: details.inGoodStanding,
        businessNumber: details.businessNumber,
        nameHistory: details.previousNames || []
      };
    } catch (error) {
      throw new Error(`Manitoba Companies Office verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify WCB Manitoba compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map business identifier to WCB account
      const wcbAccount = await this.mapToWCBAccount(businessIdentifier);
      
      const coverage = await this.apis.get('wcbManitoba').verifyCoverage(wcbAccount);
      
      if (!coverage.accountExists) {
        return {
          compliant: false,
          reason: 'No WCB Manitoba account found',
          required: true
        };
      }
      
      // Get industry statistics for comparison
      let industryStats = null;
      if (coverage.industryCode) {
        try {
          industryStats = await this.apis.get('wcbManitoba').getIndustryStatistics(
            coverage.industryCode
          );
        } catch (error) {
          // Industry stats are optional
        }
      }
      
      return {
        compliant: coverage.hasCoverage && coverage.clearanceStatus === 'Valid',
        clearanceNumber: coverage.clearanceCertificateNumber,
        issueDate: coverage.issueDate,
        expiryDate: coverage.expiryDate,
        industryCode: coverage.industryCode,
        rateCode: coverage.rateCode,
        premiumRate: coverage.premiumRate,
        experienceRating: coverage.experienceRating,
        maximumAssessableEarnings: coverage.maximumAssessableEarnings,
        complianceStatus: coverage.complianceStatus,
        safetyMetrics: {
          rateComparison: this.compareToAverageRate(coverage.premiumRate, industryStats?.averageRate),
          industryInjuryRate: industryStats?.injuryRate,
          recommendedPrograms: industryStats?.safetyPrograms || [],
          recommendation: this.getSafetyRecommendation(coverage, industryStats)
        }
      };
    } catch (error) {
      return {
        compliant: false,
        error: `WCB Manitoba verification failed: ${error.message}`
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
    
    const mbWorkers = workers.filter(w => 
      w.provinces.includes('MB') || 
      w.certifications.some(c => c.province === 'MB')
    );
    
    if (mbWorkers.length === 0) {
      return { verified: true, workers: [], message: 'No Manitoba workers to verify' };
    }
    
    const verificationPromises = mbWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'MB' || cert.redSeal)
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    // Check for apprentices
    const apprenticeChecks = await this.checkForApprentices(mbWorkers);
    
    // Identify Atlantic harmonization eligibility
    const atlanticEligible = results.filter(r => 
      r.status === 'fulfilled' && r.value.atlanticMobility
    ).length;
    
    return {
      verified: results.some(r => r.status === 'fulfilled' && r.value.valid),
      totalWorkers: mbWorkers.length,
      verifiedCertifications: results.filter(
        r => r.status === 'fulfilled' && r.value.valid
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valid: false, error: r.reason }
      ),
      apprentices: apprenticeChecks,
      atlanticHarmonizationEligible: atlanticEligible,
      onlinePortalAdoption: this.calculateOnlineAdoption(results)
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
      const certResult = await this.apis.get('apprenticeshipMB').verifyCertification(
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
        atlanticMobility: certResult.atlanticMobility,
        status: certResult.status,
        trade: certResult.tradeName,
        onlinePortalRegistered: certResult.onlinePortalRegistered,
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
   * Verify MCA membership
   */
  private async verifyMCAMembership(businessName: string): Promise<any> {
    try {
      const membership = await this.apis.get('mca').verifyMembership(businessName);
      
      return {
        type: 'industryAssociation',
        association: 'Manitoba Construction Association',
        isMember: membership.isMember,
        membershipLevel: membership.membershipLevel,
        memberSince: membership.memberSince,
        goldSealCertified: membership.goldSealCertified,
        corCertified: membership.corCertified,
        secorCertified: membership.secorCertified,
        safetyRating: membership.safetyRating,
        indigenousPartnership: membership.indigenousPartnership,
        benefits: membership.isMember ? [
          'Gold Seal Certification support',
          'COR/SECOR safety programs',
          'Indigenous partnership opportunities',
          'Construction safety training',
          'Industry advocacy and resources'
        ] : []
      };
    } catch (error) {
      return {
        type: 'industryAssociation',
        association: 'MCA',
        isMember: false,
        error: error.message
      };
    }
  }
  
  /**
   * Verify Indigenous business certification
   */
  private async verifyIndigenousCertification(businessName: string): Promise<any> {
    try {
      const certification = await this.apis.get('indigenousMB').checkCertification(businessName);
      
      return {
        type: 'indigenousCertification',
        certified: certification.certified,
        certificationNumber: certification.certificationNumber,
        ownershipPercentage: certification.ownershipPercentage,
        certificationDate: certification.certificationDate,
        communityAffiliation: certification.communityAffiliation,
        eligibleForSetAsides: certification.ownershipPercentage >= 51
      };
    } catch (error) {
      return {
        type: 'indigenousCertification',
        certified: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('companiesOffice').client.get('/health');
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
      'plumbing', 'hvac', 'roofing', 'concrete'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    const hasConstructionKeyword = constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
    
    const hasConstructionTrades = request.workers?.some(worker =>
      worker.trades.some(trade => 
        ['electrician', 'plumber', 'carpenter', 'ironworker', 'hvac technician', 
         'roofer', 'concrete finisher', 'heavy equipment operator'].includes(trade.toLowerCase())
      )
    );
    
    return hasConstructionKeyword || hasConstructionTrades || false;
  }
  
  /**
   * Check for Indigenous indicators
   */
  private hasIndigenousIndicators(request: VerificationRequest): boolean {
    const indigenousKeywords = [
      'first nations', 'métis', 'metis', 'inuit', 'indigenous',
      'aboriginal', 'native', 'band', 'tribal', 'nation'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return indigenousKeywords.some(keyword => businessNameLower.includes(keyword));
  }
  
  /**
   * Map business identifier to WCB account
   */
  private async mapToWCBAccount(businessIdentifier: string): Promise<string> {
    // Check if already WCB account number format (6-8 digits)
    if (businessIdentifier.match(/^\d{6,8}$/)) {
      return businessIdentifier;
    }
    
    // Extract digits from business number
    const digits = businessIdentifier.replace(/\D/g, '');
    if (digits.length >= 6) {
      return digits.substring(0, 6);
    }
    
    // Mock mapping for demo
    const mappings: Record<string, string> = {
      '123456789RC0001': '123456',
      '987654321RC0001': '987654'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Compare premium rate to average
   */
  private compareToAverageRate(rate: number, industryAverage?: number): string {
    const averageRate = industryAverage || 1.45; // 2025 Manitoba average
    const difference = ((rate - averageRate) / averageRate) * 100;
    
    if (difference < -15) return `${Math.abs(difference).toFixed(1)}% below average (excellent)`;
    if (difference < -5) return `${Math.abs(difference).toFixed(1)}% below average (good)`;
    if (difference < 5) return `${Math.abs(difference).toFixed(1)}% near average`;
    if (difference < 15) return `${difference.toFixed(1)}% above average (review needed)`;
    return `${difference.toFixed(1)}% above average (improvement required)`;
  }
  
  /**
   * Get safety recommendation
   */
  private getSafetyRecommendation(coverage: any, industryStats: any): string {
    const rate = coverage.premiumRate || 1.45;
    const industryAverage = industryStats?.averageRate || 1.45;
    
    if (rate <= industryAverage * 0.8) {
      return 'Excellent safety performance - maintain current programs and consider mentoring others';
    }
    if (rate <= industryAverage) {
      return 'Good safety performance - consider advanced safety certifications like COR/SECOR';
    }
    if (rate <= industryAverage * 1.2) {
      const programs = industryStats?.safetyPrograms?.slice(0, 2).join(', ') || 'safety training';
      return `Average safety performance - implement ${programs}`;
    }
    return 'Safety improvement critical - engage safety consultant and implement comprehensive program';
  }
  
  /**
   * Check for apprentices
   */
  private async checkForApprentices(workers: Worker[]): Promise<any> {
    const apprenticeIds = workers
      .flatMap(w => w.certifications)
      .filter(c => c.type?.toLowerCase().includes('apprentice'))
      .map(c => c.number);
    
    if (apprenticeIds.length === 0) return { count: 0, details: [] };
    
    const apprenticeChecks = await Promise.allSettled(
      apprenticeIds.map(id => this.apis.get('apprenticeshipMB').checkApprenticeStatus(id))
    );
    
    const activeApprentices = apprenticeChecks.filter(
      r => r.status === 'fulfilled' && r.value.registered
    );
    
    return {
      count: activeApprentices.length,
      details: apprenticeChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value),
      onlineAccountAdoption: activeApprentices.filter(
        r => (r as PromiseFulfilledResult<any>).value.onlineAccountActive
      ).length
    };
  }
  
  /**
   * Calculate confidence with Atlantic harmonization
   */
  private calculateConfidenceWithHarmonization(results: PromiseSettledResult<any>[]): number {
    const baseConfidence = this.calculateConfidence(results);
    
    // Boost confidence if Atlantic harmonization verified
    const hasAtlanticWorkers = results.some(r => 
      r.status === 'fulfilled' && 
      r.value.details?.some((d: any) => d.atlanticMobility)
    );
    
    return hasAtlanticWorkers ? Math.min(baseConfidence + 5, 100) : baseConfidence;
  }
  
  /**
   * Check Atlantic harmonization status
   */
  private checkAtlanticHarmonization(results: PromiseSettledResult<any>[]): any {
    const tradeResult = results.find(r => 
      r.status === 'fulfilled' && r.value.atlanticHarmonizationEligible
    );
    
    if (!tradeResult || tradeResult.status !== 'fulfilled') {
      return { eligible: false };
    }
    
    return {
      eligible: true,
      eligibleWorkers: tradeResult.value.atlanticHarmonizationEligible,
      harmonizedProvinces: ['MB', 'NB', 'NS', 'PE', 'NL'],
      benefits: [
        'Worker mobility across Atlantic provinces',
        'Mutual recognition of certifications',
        'Streamlined interprovincial work permits'
      ]
    };
  }
  
  /**
   * Calculate online adoption rate
   */
  private calculateOnlineAdoption(results: PromiseSettledResult<any>[]): string {
    const total = results.length;
    const online = results.filter(r => 
      r.status === 'fulfilled' && r.value.onlinePortalRegistered
    ).length;
    
    const percentage = total > 0 ? (online / total) * 100 : 0;
    return `${percentage.toFixed(0)}% using new online portal`;
  }
  
  /**
   * Validate Companies Office response
   */
  private validateCompaniesOfficeResponse(data: any): any {
    const schema = z.object({
      corporations: z.array(z.object({
        corporationNumber: z.string(),
        corporationName: z.string(),
        status: z.string(),
        corporationType: z.string(),
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
      operatingName: z.string().optional(),
      status: z.string(),
      corporationType: z.string(),
      incorporationDate: z.string(),
      inGoodStanding: z.boolean(),
      registeredOfficeAddress: z.string(),
      city: z.string(),
      postalCode: z.string(),
      businessNumber: z.string().optional(),
      lastAnnualReturnDate: z.string().optional(),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string()
      })).optional(),
      previousNames: z.array(z.string()).optional()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Verify Manitoba tax debt
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
        province: 'MB',
        purpose: 'procurement_verification'
      });
      
      // Main tax debt verification
      const [taxDebtResult, rstResult, payrollTaxResult, healthEducationLevyResult] = await Promise.allSettled([
        this.apis.get('mbFinance').verifyTaxDebt(request),
        this.apis.get('mbFinance').getRSTStatus(request.businessNumber),
        this.apis.get('mbFinance').getPayrollTaxStatus(request.businessNumber),
        this.apis.get('mbFinance').getHealthEducationLevyStatus(request.businessNumber)
      ]);
      
      // Process results
      let provincialTaxDebt: ProvincialTaxDebt = {
        province: 'MB',
        provincialCorporateTax: undefined,
        salesTax: undefined,
        payrollTax: undefined,
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
      
      // Add RST data
      if (rstResult.status === 'fulfilled' && rstResult.value.registered) {
        const rstDebt = rstResult.value.outstandingBalance || 0;
        if (rstDebt > 0) {
          if (!provincialTaxDebt.salesTax) {
            provincialTaxDebt.salesTax = {
              items: [],
              totalOwing: 0,
              taxType: 'RST'
            };
          }
          provincialTaxDebt.salesTax.items.push({
            taxType: 'Retail Sales Tax (RST)',
            amountOwing: rstDebt,
            originalAmount: rstDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: rstResult.value.accountNumber
          });
          provincialTaxDebt.salesTax.totalOwing += rstDebt;
          provincialTaxDebt.salesTax.registrationNumber = rstResult.value.accountNumber;
          provincialTaxDebt.salesTax.filingFrequency = rstResult.value.filingFrequency;
          provincialTaxDebt.totalProvincialOwing += rstDebt;
        }
      }
      
      // Add Payroll Tax data
      if (payrollTaxResult.status === 'fulfilled' && payrollTaxResult.value.required) {
        const payrollDebt = payrollTaxResult.value.outstandingBalance || 0;
        if (payrollDebt > 0) {
          if (!provincialTaxDebt.payrollTax) {
            provincialTaxDebt.payrollTax = {
              items: [],
              totalOwing: 0,
              taxTypes: []
            };
          }
          provincialTaxDebt.payrollTax.items.push({
            taxType: 'Payroll Tax',
            amountOwing: payrollDebt,
            originalAmount: payrollDebt,
            penaltiesInterest: 0,
            periodStart: new Date(new Date().getFullYear(), 0, 1),
            periodEnd: new Date(),
            dueDate: new Date(),
            filingStatus: 'filed',
            accountNumber: payrollTaxResult.value.accountNumber,
            note: `Rate: ${payrollTaxResult.value.taxRate * 100}% | Annual Payroll: $${payrollTaxResult.value.annualPayroll?.toLocaleString()}`
          });
          provincialTaxDebt.payrollTax.totalOwing += payrollDebt;
          provincialTaxDebt.payrollTax.taxTypes.push('Payroll Tax');
          provincialTaxDebt.totalProvincialOwing += payrollDebt;
        }
      }
      
      // Add Health & Education Levy data
      if (healthEducationLevyResult.status === 'fulfilled' && healthEducationLevyResult.value.required) {
        const levyDebt = healthEducationLevyResult.value.outstandingBalance || 0;
        if (levyDebt > 0) {
          if (!provincialTaxDebt.otherTaxes) {
            provincialTaxDebt.otherTaxes = [];
          }
          provincialTaxDebt.otherTaxes.push({
            taxType: 'health_education_levy',
            items: [{
              taxType: 'Health & Education Levy',
              amountOwing: levyDebt,
              originalAmount: levyDebt,
              penaltiesInterest: 0,
              periodStart: new Date(new Date().getFullYear(), 0, 1),
              periodEnd: new Date(),
              dueDate: new Date(),
              filingStatus: 'filed',
              accountNumber: healthEducationLevyResult.value.accountNumber,
              note: `Rate: ${healthEducationLevyResult.value.levyRate * 100}% | Annual Payroll: $${healthEducationLevyResult.value.annualPayroll?.toLocaleString()}`
            }],
            totalOwing: levyDebt,
            accountNumber: healthEducationLevyResult.value.accountNumber
          });
          provincialTaxDebt.totalProvincialOwing += levyDebt;
        }
      }
      
      // Calculate risk score
      provincialTaxDebt.riskScore = this.calculateMBTaxDebtRiskScore(provincialTaxDebt);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        province: 'MB',
        outcome: 'success',
        dataAccessed: ['provincial_tax_debt'],
        riskScore: provincialTaxDebt.riskScore
      });
      
      // Cache result
      await this.cacheResult(
        `tax-debt:MB:${request.businessNumber}`,
        provincialTaxDebt,
        3600 // 1 hour TTL
      );
      
      return provincialTaxDebt;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        province: 'MB',
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`MB tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Transform MB tax debt response
   */
  private transformMBTaxDebtResponse(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'MB',
      totalProvincialOwing: 0,
      riskScore: 0
    };
    
    // Corporate tax
    if (data.corporateTax && data.corporateTax.totalBalance > 0) {
      result.provincialCorporateTax = {
        items: data.corporateTax.assessments.map((a: any) => this.transformMBAssessment(a)),
        totalOwing: data.corporateTax.totalBalance,
        oldestDebt: data.corporateTax.oldestAssessmentDate ? 
          new Date(data.corporateTax.oldestAssessmentDate) : undefined,
        filingCompliance: this.transformFilingCompliance(data.corporateTax.filingHistory)
      };
      result.totalProvincialOwing += data.corporateTax.totalBalance;
    }
    
    // RST
    if (data.rst && data.rst.totalBalance > 0) {
      result.salesTax = {
        items: data.rst.assessments.map((a: any) => ({
          ...this.transformMBAssessment(a),
          taxType: 'Retail Sales Tax (RST)'
        })),
        totalOwing: data.rst.totalBalance,
        taxType: 'RST',
        registrationNumber: data.rst.accountNumber,
        filingFrequency: data.rst.filingFrequency
      };
      result.totalProvincialOwing += data.rst.totalBalance;
    }
    
    // Payroll taxes
    if (data.payrollTax && data.payrollTax.totalBalance > 0) {
      result.payrollTax = {
        items: data.payrollTax.assessments.map((a: any) => ({
          ...this.transformMBAssessment(a),
          taxType: 'Payroll Tax'
        })),
        totalOwing: data.payrollTax.totalBalance,
        taxTypes: ['Payroll Tax']
      };
      result.totalProvincialOwing += data.payrollTax.totalBalance;
    }
    
    // Other Manitoba taxes
    const specialTaxes: any[] = [];
    const taxKeys = [
      'healthEducationLevy', 'fuelTax', 'tobaccoTax', 'miningTax',
      'landTransferTax', 'insuranceCorporationTax', 'healthWellnessTax'
    ];
    
    taxKeys.forEach(taxKey => {
      if (data[taxKey] && data[taxKey].totalBalance > 0) {
        const taxName = taxKey.replace(/([A-Z])/g, ' $1').trim()
          .replace(/^./, str => str.toUpperCase());
        
        specialTaxes.push({
          taxType: taxKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
          items: data[taxKey].assessments.map((assessment: any) => ({
            ...this.transformMBAssessment(assessment),
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
    
    // Payment arrangements
    if (data.paymentArrangements && data.paymentArrangements.length > 0) {
      result.paymentArrangement = transformers.paymentArrangement(data.paymentArrangements[0]);
    }
    
    // Collections status
    if (data.collectionsStatus) {
      result.collectionsStatus = transformers.collectionsStatus(data.collectionsStatus);
    }
    
    // Last assessment date
    result.lastAssessmentDate = data.lastAssessmentDate ? 
      new Date(data.lastAssessmentDate) : undefined;
    
    return result;
  }
  
  /**
   * Transform MB assessment
   */
  private transformMBAssessment(assessment: any): TaxDebtItem {
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
   * Calculate MB-specific risk score
   */
  private calculateMBTaxDebtRiskScore(taxDebt: ProvincialTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalProvincialOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 200000) riskScore += 40;
    else if (totalOwing > 75000) riskScore += 30;
    else if (totalOwing > 35000) riskScore += 20;
    else if (totalOwing > 10000) riskScore += 10;
    else riskScore += 5;
    
    // RST factor (0-15 points) - Critical for retailers
    if (taxDebt.salesTax?.totalOwing > 0) {
      riskScore += Math.min(15, taxDebt.salesTax.totalOwing / 10000);
    }
    
    // Payroll tax factor (0-20 points) - Critical employer tax
    if (taxDebt.payrollTax?.totalOwing > 0) {
      riskScore += Math.min(20, taxDebt.payrollTax.totalOwing / 25000 * 10);
    }
    
    // Health & Education Levy (0-15 points) - Important for large employers
    const hasHealthEducationLevyDebt = taxDebt.otherTaxes?.some(
      tax => tax.taxType.includes('health_education_levy')
    );
    if (hasHealthEducationLevyDebt) {
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
          'tax-debt:audit-log:MB',
          Date.now(),
          JSON.stringify(auditLog)
        );
      }
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('MB tax debt access:', auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
}