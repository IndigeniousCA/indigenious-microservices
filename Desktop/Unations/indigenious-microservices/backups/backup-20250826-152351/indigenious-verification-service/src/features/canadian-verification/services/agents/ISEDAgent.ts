/**
 * Innovation, Science and Economic Development Canada (ISED) Federal Verification Agent
 * 
 * @module ISEDAgent
 * @description Verifies federal corporation status and compliance with ISED
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseAgent } from './BaseAgent';
import { 
  VerificationRequest, 
  FederalVerificationResult 
} from '../../types';

/**
 * ISED verification agent
 * Verifies federal incorporation, corporate compliance, and industry registrations
 */
export class ISEDAgent extends BaseAgent {
  constructor() {
    super('ISED-Federal');
    this.initializeAPIs();
  }
  
  /**
   * Initialize ISED APIs
   */
  private initializeAPIs(): void {
    // Corporations Canada
    this.apis.set('corporationsCanada', {
      client: this.createSecureClient(
        process.env.ISED_CORP_URL || 'https://api.ic.gc.ca/corporations',
        {
          apiKey: process.env.ISED_API_KEY,
          headers: {
            'X-ISED-Service': 'Indigenous-Procurement',
            'Accept': 'application/json'
          }
        }
      ),
      
      searchCorporation: async (name: string, number?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporationsCanada').client.post('/search', {
            corporationName: name ? this.sanitizeInput(name) : undefined,
            corporationNumber: number ? this.sanitizeInput(number) : undefined,
            searchType: 'exact_and_similar',
            includeInactive: false
          });
          
          return this.validateCorporationSearchResponse(response.data);
        }, 'ised:searchCorp');
      },
      
      getCorporationDetails: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporationsCanada').client.get(
            `/corporation/${this.sanitizeInput(corporationNumber)}`
          );
          
          return this.validateCorporationDetails(response.data);
        }, 'ised:corpDetails');
      },
      
      checkCorporateCompliance: async (corporationNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('corporationsCanada').client.get(
            `/corporation/${this.sanitizeInput(corporationNumber)}/compliance`
          );
          
          return {
            compliant: response.data.overallCompliant,
            annualReturns: {
              upToDate: response.data.annualReturnsUpToDate,
              lastFiled: response.data.lastAnnualReturnDate,
              outstanding: response.data.outstandingReturns || 0
            },
            corporateFilings: {
              required: response.data.requiredFilings || [],
              completed: response.data.completedFilings || [],
              pending: response.data.pendingFilings || []
            },
            goodStanding: response.data.inGoodStanding,
            disqualifications: response.data.disqualifications || []
          };
        }, 'ised:compliance');
      }
    });
    
    // Canadian Company Capabilities (for government contracting)
    this.apis.set('ccc', {
      client: this.createSecureClient(
        process.env.CCC_URL || 'https://api.ic.gc.ca/ccc',
        {
          apiKey: process.env.CCC_API_KEY,
          headers: {
            'X-CCC-Partner': 'Indigenous-Procurement'
          }
        }
      ),
      
      verifyCCCRegistration: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ccc').client.get(
            `/registration/${this.sanitizeInput(businessNumber)}`
          );
          
          if (response.status === 404) {
            return { registered: false };
          }
          
          return {
            registered: true,
            registrationNumber: response.data.cccNumber,
            validUntil: new Date(response.data.expiryDate),
            capabilities: response.data.capabilities || [],
            naicsCodesRegistered: response.data.naicsCodes || [],
            securityClearance: response.data.securityClearance,
            indigenousBusinessStatus: response.data.indigenousStatus
          };
        }, 'ccc:verify');
      }
    });
    
    // Industry Canada Business Registry
    this.apis.set('businessRegistry', {
      client: this.createSecureClient(
        process.env.IC_REGISTRY_URL || 'https://api.ic.gc.ca/registry',
        {
          apiKey: process.env.IC_REGISTRY_API_KEY
        }
      ),
      
      checkBusinessNameAvailability: async (name: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('businessRegistry').client.post('/name/check', {
            proposedName: this.sanitizeInput(name),
            includeVariations: true
          });
          
          return {
            available: response.data.available,
            conflicts: response.data.conflicts || [],
            suggestions: response.data.suggestions || [],
            restrictedTerms: response.data.restrictedTerms || []
          };
        }, 'ic:nameCheck');
      },
      
      verifyIndustryLicenses: async (businessNumber: string, industryCode?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('businessRegistry').client.get(
            `/licenses/${this.sanitizeInput(businessNumber)}`,
            {
              params: { industryCode: industryCode || 'all' }
            }
          );
          
          return {
            licenses: response.data.licenses || [],
            permits: response.data.permits || [],
            certifications: response.data.certifications || [],
            requiredForIndustry: response.data.requiredLicenses || []
          };
        }, 'ic:licenses');
      }
    });
  }
  
  /**
   * Main verification method for ISED
   */
  async verify(request: VerificationRequest): Promise<FederalVerificationResult> {
    const verificationId = crypto.randomUUID();
    
    try {
      // Extract corporation number if available
      const corpNumber = this.extractCorporationNumber(request.businessNumber);
      
      // Search for corporation
      const searchResult = await this.apis.get('corporationsCanada').searchCorporation(
        request.businessName,
        corpNumber
      );
      
      if (!searchResult.results || searchResult.results.length === 0) {
        return {
          type: 'federal',
          agency: 'ISED',
          verified: false,
          confidence: 0,
          details: {
            error: 'Corporation not found in federal registry',
            searchCriteria: {
              name: request.businessName,
              number: corpNumber
            }
          }
        };
      }
      
      // Get the best match
      const corporation = searchResult.results[0];
      
      // Parallel verification tasks
      const [detailsResult, complianceResult, cccResult, licensesResult] = await Promise.allSettled([
        this.apis.get('corporationsCanada').getCorporationDetails(corporation.corporationNumber),
        this.apis.get('corporationsCanada').checkCorporateCompliance(corporation.corporationNumber),
        request.businessNumber ? 
          this.apis.get('ccc').verifyCCCRegistration(request.businessNumber) : 
          Promise.resolve({ registered: false }),
        request.businessNumber ? 
          this.apis.get('businessRegistry').verifyIndustryLicenses(request.businessNumber) :
          Promise.resolve({ licenses: [] })
      ]);
      
      // Process results
      const hasValidDetails = detailsResult.status === 'fulfilled';
      const isCompliant = complianceResult.status === 'fulfilled' && complianceResult.value.compliant;
      const hasCCC = cccResult.status === 'fulfilled' && cccResult.value.registered;
      const hasLicenses = licensesResult.status === 'fulfilled' && licensesResult.value.licenses.length > 0;
      
      // Calculate confidence
      let confidence = 0;
      if (hasValidDetails) confidence += 0.4;
      if (isCompliant) confidence += 0.3;
      if (hasCCC) confidence += 0.2;
      if (hasLicenses) confidence += 0.1;
      
      const verified = hasValidDetails && isCompliant;
      
      const result: FederalVerificationResult = {
        type: 'federal',
        agency: 'ISED',
        verified,
        confidence: Math.min(confidence, 1),
        details: {
          corporation: {
            found: true,
            number: corporation.corporationNumber,
            name: corporation.corporationName,
            ...(detailsResult.status === 'fulfilled' ? {
              status: detailsResult.value.status,
              type: detailsResult.value.corporationType,
              incorporationDate: detailsResult.value.incorporationDate,
              jurisdiction: detailsResult.value.jurisdiction,
              registeredOffice: detailsResult.value.registeredOffice,
              directors: detailsResult.value.directors?.length || 0,
              sharesStructure: detailsResult.value.sharesStructure
            } : {
              error: detailsResult.reason?.message || 'Failed to get details'
            })
          },
          compliance: complianceResult.status === 'fulfilled' ? complianceResult.value : {
            compliant: false,
            error: complianceResult.reason?.message
          },
          governmentContracting: {
            cccRegistered: hasCCC,
            ...(cccResult.status === 'fulfilled' && hasCCC ? {
              cccNumber: cccResult.value.registrationNumber,
              validUntil: cccResult.value.validUntil,
              capabilities: cccResult.value.capabilities,
              indigenousStatus: cccResult.value.indigenousBusinessStatus
            } : {})
          },
          industryLicenses: licensesResult.status === 'fulfilled' ? licensesResult.value : {
            licenses: [],
            error: licensesResult.reason?.message
          },
          verificationDate: new Date(),
          verificationId
        }
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`ISED verification failed: ${error.message}`);
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('corporationsCanada').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Extract corporation number from business number
   */
  private extractCorporationNumber(businessNumber?: string): string | undefined {
    if (!businessNumber) return undefined;
    
    // Federal corporation numbers are typically 7 digits
    const corpMatch = businessNumber.match(/\d{7}/);
    return corpMatch ? corpMatch[0] : undefined;
  }
  
  /**
   * Validate corporation search response
   */
  private validateCorporationSearchResponse(data: any): any {
    const schema = z.object({
      results: z.array(z.object({
        corporationNumber: z.string(),
        corporationName: z.string(),
        status: z.string(),
        jurisdiction: z.string(),
        matchScore: z.number().optional()
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
      corporationName: z.string(),
      status: z.string(),
      corporationType: z.string(),
      incorporationDate: z.string(),
      jurisdiction: z.string(),
      registeredOffice: z.object({
        street: z.string(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string(),
        country: z.string()
      }),
      directors: z.array(z.object({
        name: z.string(),
        position: z.string(),
        appointmentDate: z.string(),
        address: z.object({
          city: z.string(),
          province: z.string().optional(),
          country: z.string()
        })
      })).optional(),
      sharesStructure: z.object({
        authorized: z.string(),
        issued: z.string(),
        classes: z.array(z.object({
          className: z.string(),
          rights: z.string()
        }))
      }).optional(),
      amalgamations: z.array(z.string()).optional(),
      continuations: z.array(z.string()).optional()
    });
    
    return schema.parse(data);
  }
}