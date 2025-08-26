/**
 * Indigenous Services Canada (ISC) Federal Verification Agent
 * 
 * @module ISCAgent
 * @description Verifies Indigenous business status and partnerships with ISC
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseAgent } from './BaseAgent';
import { 
  VerificationRequest, 
  FederalVerificationResult 
} from '../../types';

/**
 * ISC verification agent
 * Verifies Indigenous business certification, band affiliation, and partnerships
 */
export class ISCAgent extends BaseAgent {
  constructor() {
    super('ISC-Federal');
    this.initializeAPIs();
  }
  
  /**
   * Initialize ISC APIs
   */
  private initializeAPIs(): void {
    // Indigenous Business Directory
    this.apis.set('indigenousDirectory', {
      client: this.createSecureClient(
        process.env.ISC_DIRECTORY_URL || 'https://api.sac-isc.gc.ca/business',
        {
          apiKey: process.env.ISC_API_KEY,
          headers: {
            'X-ISC-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'Accept-Language': 'en-CA,fr-CA'
          }
        }
      ),
      
      verifyIndigenousBusiness: async (businessName: string, businessNumber?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('indigenousDirectory').client.post('/verify', {
            businessName: this.sanitizeInput(businessName),
            businessNumber: businessNumber ? this.sanitizeInput(businessNumber) : undefined,
            includeOwnership: true,
            includePartnerships: true
          });
          
          if (response.status === 404) {
            return { verified: false, reason: 'Not found in Indigenous Business Directory' };
          }
          
          return this.validateIndigenousBusinessResponse(response.data);
        }, 'isc:verifyBusiness');
      },
      
      getIndigenousRegistration: async (registrationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('indigenousDirectory').client.get(
            `/registration/${this.sanitizeInput(registrationNumber)}`
          );
          
          return {
            valid: response.data.valid,
            registrationNumber: response.data.registrationNumber,
            businessName: response.data.businessName,
            registrationDate: new Date(response.data.registrationDate),
            expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
            ownershipType: response.data.ownershipType,
            ownershipPercentage: response.data.ownershipPercentage
          };
        }, 'isc:registration');
      }
    });
    
    // Band Registry and Affiliation
    this.apis.set('bandRegistry', {
      client: this.createSecureClient(
        process.env.ISC_BAND_URL || 'https://api.sac-isc.gc.ca/band',
        {
          apiKey: process.env.ISC_BAND_API_KEY,
          headers: {
            'X-ISC-Service': 'Business-Verification'
          }
        }
      ),
      
      verifyBandAffiliation: async (bandNumber: string, businessName: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bandRegistry').client.post('/affiliation/verify', {
            bandNumber: this.sanitizeInput(bandNumber),
            entityName: this.sanitizeInput(businessName),
            verificationType: 'business'
          });
          
          return {
            verified: response.data.affiliationVerified,
            bandName: response.data.bandName,
            nation: response.data.nation,
            province: response.data.province,
            treatyArea: response.data.treatyArea,
            affiliationType: response.data.affiliationType,
            endorsementDate: response.data.endorsementDate ? new Date(response.data.endorsementDate) : undefined,
            councilResolution: response.data.councilResolutionNumber
          };
        }, 'isc:bandAffiliation');
      },
      
      getBandDetails: async (bandNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('bandRegistry').client.get(
            `/band/${this.sanitizeInput(bandNumber)}/details`
          );
          
          return {
            bandNumber: response.data.bandNumber,
            bandName: response.data.bandName,
            nation: response.data.nation,
            culturalGroup: response.data.culturalGroup,
            province: response.data.province,
            region: response.data.region,
            memberCount: response.data.registeredMembers,
            economicDevelopmentCorp: response.data.hasEDC,
            businessEntities: response.data.businessEntities || []
          };
        }, 'isc:bandDetails');
      }
    });
    
    // Indigenous Partnership Verification
    this.apis.set('partnerships', {
      client: this.createSecureClient(
        process.env.ISC_PARTNERSHIP_URL || 'https://api.sac-isc.gc.ca/partnerships',
        {
          apiKey: process.env.ISC_PARTNERSHIP_API_KEY
        }
      ),
      
      verifyPartnership: async (
        nonIndigenousBusiness: string,
        indigenousPartner: string,
        agreementDate?: Date
      ) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('partnerships').client.post('/verify', {
            business: this.sanitizeInput(nonIndigenousBusiness),
            indigenousPartner: this.sanitizeInput(indigenousPartner),
            agreementDate: agreementDate?.toISOString(),
            includeHistorical: true
          });
          
          return {
            verified: response.data.partnershipVerified,
            partnershipType: response.data.type,
            indigenousOwnership: response.data.indigenousOwnershipPercentage,
            agreementDetails: {
              signedDate: response.data.agreementDate ? new Date(response.data.agreementDate) : undefined,
              expiryDate: response.data.expiryDate ? new Date(response.data.expiryDate) : undefined,
              benefitType: response.data.benefitType,
              communityBenefits: response.data.communityBenefits || []
            },
            validationSource: response.data.validationSource,
            lastVerified: new Date(response.data.lastVerifiedDate)
          };
        }, 'isc:partnership');
      }
    });
    
    // Procurement Strategy for Aboriginal Business (PSAB)
    this.apis.set('psab', {
      client: this.createSecureClient(
        process.env.PSAB_URL || 'https://api.sac-isc.gc.ca/psab',
        {
          apiKey: process.env.PSAB_API_KEY
        }
      ),
      
      checkPSABEligibility: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('psab').client.get(
            `/eligibility/${this.sanitizeInput(businessNumber)}`
          );
          
          if (response.status === 404) {
            return { eligible: false, reason: 'Not registered for PSAB' };
          }
          
          return {
            eligible: response.data.eligible,
            registrationNumber: response.data.psabNumber,
            category: response.data.category,
            setAsideEligible: response.data.setAsideEligible,
            conditionalEligible: response.data.conditionalEligible,
            registrationDate: new Date(response.data.registrationDate),
            lastReview: new Date(response.data.lastReviewDate),
            nextReview: new Date(response.data.nextReviewDate)
          };
        }, 'psab:eligibility');
      }
    });
  }
  
  /**
   * Main verification method for ISC
   */
  async verify(request: VerificationRequest): Promise<FederalVerificationResult> {
    const verificationId = crypto.randomUUID();
    
    try {
      // Check if Indigenous partnership is claimed
      if (!request.indigenousPartnership) {
        return {
          type: 'federal',
          agency: 'ISC',
          verified: false,
          confidence: 0,
          details: {
            message: 'No Indigenous partnership information provided',
            required: 'Indigenous partnership details required for ISC verification'
          }
        };
      }
      
      // Parallel verification tasks
      const verificationTasks = [
        this.apis.get('indigenousDirectory').verifyIndigenousBusiness(
          request.businessName,
          request.businessNumber
        )
      ];
      
      // Add band affiliation check if band number provided
      const bandNumber = this.extractBandNumber(request);
      if (bandNumber) {
        verificationTasks.push(
          this.apis.get('bandRegistry').verifyBandAffiliation(bandNumber, request.businessName),
          this.apis.get('bandRegistry').getBandDetails(bandNumber)
        );
      }
      
      // Add partnership verification if non-Indigenous business
      if (request.indigenousPartnership.ownershipPercentage && 
          request.indigenousPartnership.ownershipPercentage < 51) {
        verificationTasks.push(
          this.apis.get('partnerships').verifyPartnership(
            request.businessName,
            request.indigenousPartnership.partnerName,
            request.indigenousPartnership.agreementDate
          )
        );
      }
      
      // Add PSAB check if business number provided
      if (request.businessNumber) {
        verificationTasks.push(
          this.apis.get('psab').checkPSABEligibility(request.businessNumber)
        );
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, bandResult, bandDetailsResult, partnershipResult, psabResult] = results;
      
      // Process results
      const isIndigenousBusiness = businessResult.status === 'fulfilled' && businessResult.value.verified;
      const hasBandAffiliation = bandResult?.status === 'fulfilled' && bandResult.value.verified;
      const hasValidPartnership = partnershipResult?.status === 'fulfilled' && partnershipResult.value.verified;
      const isPSABEligible = psabResult?.status === 'fulfilled' && psabResult.value.eligible;
      
      // Calculate confidence
      let confidence = 0;
      if (isIndigenousBusiness) confidence += 0.4;
      if (hasBandAffiliation) confidence += 0.3;
      if (hasValidPartnership) confidence += 0.2;
      if (isPSABEligible) confidence += 0.1;
      
      const verified = isIndigenousBusiness || (hasValidPartnership && hasBandAffiliation);
      
      const result: FederalVerificationResult = {
        type: 'federal',
        agency: 'ISC',
        verified,
        confidence: Math.min(confidence, 1),
        details: {
          indigenousBusiness: businessResult.status === 'fulfilled' ? {
            verified: businessResult.value.verified,
            ...(businessResult.value.verified ? {
              registrationNumber: businessResult.value.registrationNumber,
              ownershipType: businessResult.value.ownershipType,
              ownershipPercentage: businessResult.value.ownershipPercentage,
              registrationDate: businessResult.value.registrationDate,
              partners: businessResult.value.indigenousPartners
            } : {
              reason: businessResult.value.reason
            })
          } : {
            verified: false,
            error: businessResult.reason?.message
          },
          
          bandAffiliation: bandResult?.status === 'fulfilled' ? {
            verified: bandResult.value.verified,
            ...(bandResult.value.verified ? {
              bandName: bandResult.value.bandName,
              nation: bandResult.value.nation,
              province: bandResult.value.province,
              treatyArea: bandResult.value.treatyArea,
              councilResolution: bandResult.value.councilResolution
            } : {})
          } : null,
          
          bandDetails: bandDetailsResult?.status === 'fulfilled' ? bandDetailsResult.value : null,
          
          partnership: partnershipResult?.status === 'fulfilled' ? {
            verified: partnershipResult.value.verified,
            ...(partnershipResult.value.verified ? {
              type: partnershipResult.value.partnershipType,
              indigenousOwnership: partnershipResult.value.indigenousOwnership,
              agreementDetails: partnershipResult.value.agreementDetails,
              validationSource: partnershipResult.value.validationSource
            } : {})
          } : null,
          
          psabEligibility: psabResult?.status === 'fulfilled' ? {
            eligible: psabResult.value.eligible,
            ...(psabResult.value.eligible ? {
              registrationNumber: psabResult.value.registrationNumber,
              category: psabResult.value.category,
              setAsideEligible: psabResult.value.setAsideEligible,
              conditionalEligible: psabResult.value.conditionalEligible
            } : {
              reason: psabResult.value.reason
            })
          } : null,
          
          verificationDate: new Date(),
          verificationId
        }
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`ISC verification failed: ${error.message}`);
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('indigenousDirectory').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Extract band number from request
   */
  private extractBandNumber(request: VerificationRequest): string | undefined {
    // Check in Indigenous partnership details
    if (request.indigenousPartnership?.benefitAgreement?.community) {
      // Extract band number from community string (e.g., "Band 123 - Name")
      const match = request.indigenousPartnership.benefitAgreement.community.match(/\d{3,4}/);
      if (match) return match[0];
    }
    
    // Check in location or other fields
    // Band numbers are typically 3-4 digits
    return undefined;
  }
  
  /**
   * Validate Indigenous business response
   */
  private validateIndigenousBusinessResponse(data: any): any {
    const schema = z.object({
      verified: z.boolean(),
      registrationNumber: z.string().optional(),
      businessName: z.string(),
      ownershipType: z.string(),
      ownershipPercentage: z.number(),
      registrationDate: z.string(),
      expiryDate: z.string().optional(),
      indigenousPartners: z.array(z.object({
        name: z.string(),
        nation: z.string(),
        ownershipPercentage: z.number(),
        role: z.string()
      })).optional(),
      certifications: z.array(z.object({
        type: z.string(),
        issuer: z.string(),
        validUntil: z.string()
      })).optional()
    });
    
    return schema.parse(data);
  }
}