/**
 * Canada Revenue Agency (CRA) Federal Verification Agent
 * 
 * @module CRAAgent
 * @description Verifies business tax and registration status with CRA
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseAgent } from './BaseAgent';
import { 
  VerificationRequest, 
  FederalVerificationResult 
} from '../../types';
import {
  FederalTaxDebt,
  TaxDebtVerificationRequest,
  TaxDebtDetailsSchema,
  FederalTaxDebtSchema
} from '../../types/tax-debt';
import {
  transformCRAResponse,
  CRATaxDebtRequestSchema,
  TaxDebtAccessRequestSchema,
  TaxDebtAuditLogSchema
} from '../../schemas/tax-debt.schema';

/**
 * CRA verification agent
 * Verifies business number, GST/HST registration, tax compliance, and comprehensive tax debt
 */
export class CRAAgent extends BaseAgent {
  constructor() {
    super('CRA-Federal');
    this.initializeAPIs();
  }
  
  /**
   * Initialize CRA APIs
   */
  private initializeAPIs(): void {
    // CRA Business Registry
    this.apis.set('businessRegistry', {
      client: this.createSecureClient(
        process.env.CRA_REGISTRY_URL || 'https://api.cra-arc.gc.ca/business',
        {
          apiKey: process.env.CRA_API_KEY,
          headers: {
            'X-CRA-Partner': 'Indigenous-Procurement',
            'Accept': 'application/json',
            'Accept-Language': 'en-CA,fr-CA'
          }
        }
      ),
      
      verifyBusinessNumber: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('businessRegistry').client.post('/verify', {
            businessNumber: this.sanitizeInput(businessNumber),
            verificationType: 'comprehensive',
            includePrograms: true
          });
          
          return this.validateBusinessNumberResponse(response.data);
        }, 'cra:verifyBN');
      },
      
      checkGSTHSTStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('businessRegistry').client.get(
            `/gst-hst/${this.sanitizeInput(businessNumber)}/status`
          );
          
          if (response.status === 404) {
            return { registered: false, reason: 'Not registered for GST/HST' };
          }
          
          return {
            registered: response.data.registered,
            registrationNumber: response.data.gstHstNumber,
            effectiveDate: response.data.effectiveDate,
            status: response.data.status,
            filingFrequency: response.data.filingFrequency
          };
        }, 'cra:gstHstStatus');
      }
    });
    
    // CRA Compliance API
    this.apis.set('compliance', {
      client: this.createSecureClient(
        process.env.CRA_COMPLIANCE_URL || 'https://api.cra-arc.gc.ca/compliance',
        {
          apiKey: process.env.CRA_COMPLIANCE_API_KEY,
          headers: {
            'X-CRA-Service': 'Procurement-Verification'
          }
        }
      ),
      
      checkTaxCompliance: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('compliance').client.post('/verify', {
            businessNumber: this.sanitizeInput(businessNumber),
            complianceTypes: ['corporate-tax', 'gst-hst', 'payroll', 'import-export'],
            periodYears: 3
          });
          
          return {
            overallCompliant: response.data.compliant,
            complianceDetails: {
              corporateTax: response.data.corporateTax,
              gstHst: response.data.gstHst,
              payroll: response.data.payroll,
              importExport: response.data.importExport
            },
            lastFilingDate: response.data.lastFilingDate,
            outstandingReturns: response.data.outstandingReturns || 0,
            outstandingBalance: response.data.outstandingBalance || 0
          };
        }, 'cra:compliance');
      }
    });
    
    // CRA Tax Debt API - Enhanced verification
    this.apis.set('taxDebt', {
      client: this.createSecureClient(
        process.env.CRA_TAX_DEBT_URL || 'https://api.cra-arc.gc.ca/tax-debt',
        {
          apiKey: process.env.CRA_TAX_DEBT_API_KEY,
          headers: {
            'X-CRA-Service': 'Tax-Debt-Verification',
            'X-Security-Level': 'Enhanced',
            'X-Consent-Required': 'true'
          },
          timeout: 30000, // 30s for complex queries
          retry: {
            limit: 3,
            methods: ['GET', 'POST'],
            statusCodes: [408, 429, 500, 502, 503, 504]
          }
        }
      ),
      
      verifyTaxDebt: async (request: z.infer<typeof TaxDebtVerificationRequest>) => {
        return this.makeSecureRequest(async () => {
          // Validate consent
          if (!request.consent?.obtained || request.consent.expiryDate < new Date()) {
            throw new Error('Valid consent required for tax debt verification');
          }
          
          const response = await this.apis.get('taxDebt').client.post('/verify-comprehensive', {
            businessNumber: this.sanitizeInput(request.businessNumber),
            taxTypes: [
              'T2', // Corporate income tax
              'RT', // GST/HST
              'RP', // Payroll deductions
              'RZ', // Import/export
              'RD'  // Excise tax
            ],
            yearsToCheck: request.yearsToCheck || 5,
            includeDetails: true,
            includePaymentArrangements: request.includePaymentArrangements,
            includeCollections: request.includeCollectionsStatus,
            includeFilingHistory: request.includeFilingCompliance,
            consent: {
              token: request.consent.consentNumber,
              expiresAt: request.consent.expiryDate
            }
          });
          
          // Transform and validate response
          return transformCRAResponse(response.data);
        }, 'cra:taxDebt', 30000); // 30s timeout
      },
      
      getDetailedTaxDebt: async (businessNumber: string, taxType: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('taxDebt').client.get(
            `/debt/${this.sanitizeInput(businessNumber)}/${taxType}/details`
          );
          
          return {
            taxType,
            assessments: response.data.assessments || [],
            totalOwing: response.data.totalBalance || 0,
            oldestDebt: response.data.oldestAssessmentDate,
            paymentHistory: response.data.paymentHistory || [],
            interestAccrual: response.data.dailyInterest || 0
          };
        }, 'cra:taxDebtDetails');
      },
      
      checkPaymentArrangement: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('taxDebt').client.get(
            `/payment-arrangements/${this.sanitizeInput(businessNumber)}/active`
          );
          
          if (response.status === 404) {
            return { hasArrangement: false };
          }
          
          return {
            hasArrangement: true,
            arrangements: response.data.arrangements || [],
            totalUnderArrangement: response.data.totalAmount || 0,
            complianceStatus: response.data.overallCompliance || 'unknown'
          };
        }, 'cra:paymentArrangement');
      },
      
      getCollectionsStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('taxDebt').client.get(
            `/collections/${this.sanitizeInput(businessNumber)}/status`
          );
          
          if (response.status === 404) {
            return { underCollections: false };
          }
          
          return {
            underCollections: true,
            stage: response.data.currentStage,
            totalAmount: response.data.totalUnderCollections,
            actions: response.data.collectionsActions || [],
            restrictions: response.data.businessRestrictions || []
          };
        }, 'cra:collectionsStatus');
      }
    });
    
    // CRA Charity API (for non-profits)
    this.apis.set('charity', {
      client: this.createSecureClient(
        process.env.CRA_CHARITY_URL || 'https://api.cra-arc.gc.ca/charity',
        {
          apiKey: process.env.CRA_CHARITY_API_KEY
        }
      ),
      
      verifyCharityStatus: async (businessNumber: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('charity').client.get(
            `/status/${this.sanitizeInput(businessNumber)}`
          );
          
          if (response.status === 404) {
            return { isCharity: false };
          }
          
          return {
            isCharity: true,
            charityName: response.data.name,
            registrationNumber: response.data.registrationNumber,
            status: response.data.status,
            effectiveDate: response.data.effectiveDate,
            category: response.data.category,
            designation: response.data.designation
          };
        }, 'cra:charity');
      }
    });
  }
  
  /**
   * Verify comprehensive tax debt
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<FederalTaxDebt> {
    const startTime = Date.now();
    
    try {
      // Log access request for audit
      await this.logTaxDebtAccess({
        eventType: 'access_request',
        businessNumber: request.businessNumber,
        purpose: 'procurement_verification'
      });
      
      // Verify tax debt with enhanced security
      const taxDebtResult = await this.apis.get('taxDebt').verifyTaxDebt(request);
      
      // Get additional details if significant debt found
      if (taxDebtResult.totalFederalOwing > 10000) {
        const [arrangementResult, collectionsResult] = await Promise.allSettled([
          this.apis.get('taxDebt').checkPaymentArrangement(request.businessNumber),
          this.apis.get('taxDebt').getCollectionsStatus(request.businessNumber)
        ]);
        
        if (arrangementResult.status === 'fulfilled' && arrangementResult.value.hasArrangement) {
          taxDebtResult.paymentArrangement = arrangementResult.value.arrangements[0];
        }
        
        if (collectionsResult.status === 'fulfilled' && collectionsResult.value.underCollections) {
          taxDebtResult.collectionsStatus = {
            stage: collectionsResult.value.stage,
            totalUnderCollections: collectionsResult.value.totalAmount,
            actions: collectionsResult.value.actions,
            priorityLevel: this.determineCollectionsPriority(collectionsResult.value)
          };
        }
      }
      
      // Calculate risk score
      taxDebtResult.riskScore = this.calculateTaxDebtRiskScore(taxDebtResult);
      
      // Log successful retrieval
      await this.logTaxDebtAccess({
        eventType: 'data_retrieved',
        businessNumber: request.businessNumber,
        outcome: 'success',
        dataAccessed: ['federal_tax_debt'],
        riskScore: taxDebtResult.riskScore
      });
      
      // Cache result with encryption
      await this.cacheEncryptedResult(
        `tax-debt:federal:${request.businessNumber}`,
        taxDebtResult,
        3600 // 1 hour TTL for tax debt data
      );
      
      return taxDebtResult;
    } catch (error) {
      // Log failure
      await this.logTaxDebtAccess({
        eventType: 'access_denied',
        businessNumber: request.businessNumber,
        outcome: 'failure',
        error: error.message
      });
      
      throw new Error(`Tax debt verification failed: ${error.message}`);
    }
  }
  
  /**
   * Main verification method for CRA
   */
  async verify(request: VerificationRequest): Promise<FederalVerificationResult> {
    const verificationId = crypto.randomUUID();
    
    try {
      // Business number is required for CRA verification
      if (!request.businessNumber) {
        return {
          type: 'federal',
          agency: 'CRA',
          verified: false,
          confidence: 0,
          details: {
            error: 'Business number required for CRA verification',
            message: 'Please provide a valid Canadian business number (9 digits + program identifier)'
          }
        };
      }
      
      // Validate business number format
      if (!this.isValidBusinessNumber(request.businessNumber)) {
        return {
          type: 'federal',
          agency: 'CRA',
          verified: false,
          confidence: 0,
          details: {
            error: 'Invalid business number format',
            expected: '123456789RC0001 (9 digits + 2 letters + 4 digits)'
          }
        };
      }
      
      // Parallel verification tasks
      const [bnResult, gstResult, complianceResult, charityResult] = await Promise.allSettled([
        this.apis.get('businessRegistry').verifyBusinessNumber(request.businessNumber),
        this.apis.get('businessRegistry').checkGSTHSTStatus(request.businessNumber),
        this.apis.get('compliance').checkTaxCompliance(request.businessNumber),
        this.apis.get('charity').verifyCharityStatus(request.businessNumber)
      ]);
      
      // Process results
      const businessValid = bnResult.status === 'fulfilled' && bnResult.value.valid;
      const gstRegistered = gstResult.status === 'fulfilled' && gstResult.value.registered;
      const taxCompliant = complianceResult.status === 'fulfilled' && complianceResult.value.overallCompliant;
      const isCharity = charityResult.status === 'fulfilled' && charityResult.value.isCharity;
      
      // Calculate confidence
      let confidence = 0;
      if (businessValid) confidence += 0.4;
      if (gstRegistered) confidence += 0.2;
      if (taxCompliant) confidence += 0.3;
      if (bnResult.status === 'fulfilled' && bnResult.value.programAccounts?.length > 1) confidence += 0.1;
      
      const verified = businessValid && taxCompliant;
      
      const result: FederalVerificationResult = {
        type: 'federal',
        agency: 'CRA',
        verified,
        confidence: Math.min(confidence, 1),
        details: {
          businessNumber: {
            valid: businessValid,
            number: request.businessNumber,
            ...(bnResult.status === 'fulfilled' ? {
              legalName: bnResult.value.legalName,
              operatingName: bnResult.value.operatingName,
              businessType: bnResult.value.businessType,
              registrationDate: bnResult.value.registrationDate,
              status: bnResult.value.status,
              programAccounts: bnResult.value.programAccounts
            } : {
              error: bnResult.reason?.message || 'Verification failed'
            })
          },
          gstHst: gstResult.status === 'fulfilled' ? gstResult.value : { 
            registered: false, 
            error: gstResult.reason?.message 
          },
          taxCompliance: complianceResult.status === 'fulfilled' ? complianceResult.value : {
            overallCompliant: false,
            error: complianceResult.reason?.message
          },
          charityStatus: charityResult.status === 'fulfilled' ? charityResult.value : {
            isCharity: false
          },
          verificationDate: new Date(),
          verificationId
        }
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`CRA verification failed: ${error.message}`);
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('businessRegistry').client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate Canadian business number format
   */
  private isValidBusinessNumber(businessNumber: string): boolean {
    // Format: 123456789RC0001 (9 digits + 2 letters + 4 digits)
    const bnPattern = /^\d{9}[A-Z]{2}\d{4}$/;
    return bnPattern.test(businessNumber);
  }
  
  /**
   * Calculate tax debt risk score
   */
  private calculateTaxDebtRiskScore(taxDebt: FederalTaxDebt): number {
    let riskScore = 0;
    
    // Amount factor (0-40 points)
    const totalOwing = taxDebt.totalFederalOwing;
    if (totalOwing === 0) return 0;
    if (totalOwing > 500000) riskScore += 40;
    else if (totalOwing > 100000) riskScore += 30;
    else if (totalOwing > 50000) riskScore += 20;
    else if (totalOwing > 10000) riskScore += 10;
    else riskScore += 5;
    
    // Payroll deductions factor (0-20 points) - Critical
    if (taxDebt.payrollDeductions?.totalOwing > 0) {
      riskScore += Math.min(20, taxDebt.payrollDeductions.totalOwing / 5000);
    }
    
    // Filing compliance factor (0-20 points)
    const hasUnfiledReturns = 
      taxDebt.corporateTax?.filingCompliance?.outstandingReturns > 0 ||
      taxDebt.gstHst?.filingCompliance?.outstandingReturns > 0;
    if (hasUnfiledReturns) riskScore += 20;
    
    // Collections factor (0-15 points)
    if (taxDebt.collectionsStatus) {
      switch (taxDebt.collectionsStatus.stage) {
        case 'legal_action': riskScore += 15; break;
        case 'collections': riskScore += 12; break;
        case 'demand': riskScore += 8; break;
        case 'notice': riskScore += 5; break;
      }
    }
    
    // Payment arrangement factor (0-5 points)
    if (taxDebt.paymentArrangement) {
      if (taxDebt.paymentArrangement.status === 'defaulted') riskScore += 5;
      else if (taxDebt.paymentArrangement.complianceRate < 80) riskScore += 3;
    }
    
    return Math.min(100, riskScore);
  }
  
  /**
   * Determine collections priority level
   */
  private determineCollectionsPriority(collections: any): 'low' | 'medium' | 'high' | 'critical' {
    if (collections.totalAmount > 500000 || collections.actions.some(a => a.actionType === 'legal_action')) {
      return 'critical';
    }
    if (collections.totalAmount > 100000 || collections.stage === 'collections') {
      return 'high';
    }
    if (collections.totalAmount > 50000 || collections.stage === 'demand') {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Log tax debt access for audit
   */
  private async logTaxDebtAccess(logEntry: any): Promise<void> {
    try {
      const auditLog = {
        eventId: crypto.randomUUID(),
        timestamp: new Date(),
        ipAddress: this.getClientIP(),
        userAgent: this.getUserAgent(),
        ...logEntry
      };
      
      // Store in audit log
      await this.redis?.zadd(
        'tax-debt:audit-log',
        Date.now(),
        JSON.stringify(auditLog)
      );
      
      // Send to SIEM if configured
      if (process.env.SIEM_ENDPOINT) {
        await this.sendToSIEM(auditLog);
      }
    } catch (error) {
      console.error('Failed to log tax debt access:', error);
    }
  }
  
  /**
   * Cache encrypted result
   */
  private async cacheEncryptedResult(key: string, data: any, ttl: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      const encrypted = await this.encrypt(JSON.stringify(data));
      await this.redis.setex(key, ttl, encrypted);
    } catch (error) {
      console.error('Failed to cache encrypted result:', error);
    }
  }
  
  /**
   * Get client IP for audit
   */
  private getClientIP(): string {
    // Implementation depends on your framework
    return process.env.CLIENT_IP || '0.0.0.0';
  }
  
  /**
   * Get user agent for audit
   */
  private getUserAgent(): string {
    // Implementation depends on your framework
    return process.env.USER_AGENT || 'Unknown';
  }
  
  /**
   * Send to SIEM system
   */
  private async sendToSIEM(auditLog: any): Promise<void> {
    // Implementation for your SIEM system
    // Example: Splunk, ElasticSearch, etc.
  }
  
  /**
   * Encrypt sensitive data
   */
  private async encrypt(data: string): Promise<string> {
    // Implementation using crypto module
    // This is a placeholder - use proper encryption in production
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Validate business number response
   */
  private validateBusinessNumberResponse(data: any): any {
    const schema = z.object({
      valid: z.boolean(),
      businessNumber: z.string(),
      legalName: z.string(),
      operatingName: z.string().optional(),
      businessType: z.string(),
      status: z.string(),
      registrationDate: z.string(),
      programAccounts: z.array(z.object({
        programType: z.string(),
        accountNumber: z.string(),
        status: z.string()
      })).optional(),
      address: z.object({
        street: z.string().optional(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string()
      }).optional()
    });
    
    return schema.parse(data);
  }
}