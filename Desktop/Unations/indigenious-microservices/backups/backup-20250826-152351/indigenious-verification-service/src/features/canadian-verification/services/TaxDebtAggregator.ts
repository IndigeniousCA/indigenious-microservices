/**
 * Tax Debt Aggregator Service
 * 
 * @module TaxDebtAggregator
 * @description Enterprise-grade service for aggregating federal and provincial tax debt data
 */

import { z } from 'zod';
import crypto from 'crypto';
import { Redis } from 'ioredis';
import pLimit from 'p-limit';
import { CircuitBreaker } from 'opossum';
import { Logger } from 'winston';
import { CRAAgent } from './agents/CRAAgent';
import { BaseProvincialAgent } from './agents/BaseAgent';
import {
  TaxDebtDetails,
  TaxDebtVerificationRequest,
  TaxDebtVerificationResponse,
  FederalTaxDebt,
  ProvincialTaxDebt,
  TaxDebtRiskAssessment,
  Province
} from '../types/tax-debt';
import {
  TaxDebtDetailsSchema,
  TaxDebtVerificationResponseSchema
} from '../schemas/tax-debt.schema';

/**
 * Tax debt aggregator configuration
 */
interface TaxDebtAggregatorConfig {
  redis?: Redis;
  logger?: Logger;
  concurrencyLimit?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  encryptionKey?: string;
  auditEnabled?: boolean;
}

/**
 * Provincial tax debt verifier interface
 */
interface ProvincialTaxDebtVerifier {
  verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<ProvincialTaxDebt>;
}

/**
 * Tax Debt Aggregator Service
 * Orchestrates federal and provincial tax debt verification
 */
export class TaxDebtAggregator {
  private readonly redis?: Redis;
  private readonly logger?: Logger;
  private readonly craAgent: CRAAgent;
  private readonly provincialAgents: Map<Province, BaseProvincialAgent & ProvincialTaxDebtVerifier>;
  private readonly concurrencyLimit: pLimit.Limit;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;
  private readonly encryptionKey?: string;
  private readonly auditEnabled: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    config: TaxDebtAggregatorConfig,
    craAgent: CRAAgent,
    provincialAgents: Map<Province, BaseProvincialAgent>
  ) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.craAgent = craAgent;
    this.provincialAgents = provincialAgents as Map<Province, BaseProvincialAgent & ProvincialTaxDebtVerifier>;
    this.concurrencyLimit = pLimit(config.concurrencyLimit || 5);
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTL = config.cacheTTL || 3600; // 1 hour default
    this.encryptionKey = config.encryptionKey;
    this.auditEnabled = config.auditEnabled ?? true;

    // Circuit breaker for resilience
    this.circuitBreaker = new CircuitBreaker(this.performVerification.bind(this), {
      timeout: 60000, // 60 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: 'TaxDebtAggregator'
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Verify comprehensive tax debt across all jurisdictions
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<TaxDebtVerificationResponse> {
    const startTime = Date.now();
    const verificationId = crypto.randomUUID();

    try {
      // Validate request
      const validatedRequest = TaxDebtVerificationRequest.parse(request);

      // Check cache first
      const cachedResult = await this.getCachedResult(validatedRequest);
      if (cachedResult) {
        this.logger?.info('Tax debt verification served from cache', {
          verificationId,
          businessNumber: validatedRequest.businessNumber
        });
        return cachedResult;
      }

      // Execute verification through circuit breaker
      const result = await this.circuitBreaker.fire(validatedRequest, verificationId);
      
      return result as TaxDebtVerificationResponse;
    } catch (error) {
      this.logger?.error('Tax debt verification failed', {
        verificationId,
        error: error.message,
        businessNumber: request.businessNumber
      });

      throw new Error(`Tax debt verification failed: ${error.message}`);
    } finally {
      // Record metrics
      this.recordMetrics('tax_debt_verification', Date.now() - startTime, {
        businessNumber: request.businessNumber,
        success: !this.circuitBreaker.opened
      });
    }
  }

  /**
   * Perform the actual verification
   */
  private async performVerification(
    request: TaxDebtVerificationRequest,
    verificationId: string
  ): Promise<TaxDebtVerificationResponse> {
    try {
      // Start audit trail
      if (this.auditEnabled) {
        await this.startAuditTrail(verificationId, request);
      }

      // Verify federal tax debt
      const federalPromise = this.verifyFederalTaxDebt(request);

      // Verify provincial tax debt in parallel
      const provincialPromises = request.provinces.map(province =>
        this.concurrencyLimit(() => this.verifyProvincialTaxDebt(request, province as Province))
      );

      // Wait for all verifications
      const [federalResult, ...provincialResults] = await Promise.allSettled([
        federalPromise,
        ...provincialPromises
      ]);

      // Process results
      const taxDebtDetails = this.aggregateResults(
        federalResult,
        provincialResults,
        request.provinces as Province[]
      );

      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(taxDebtDetails);

      // Determine procurement eligibility
      const procurementEligibility = this.determineProcurementEligibility(
        taxDebtDetails,
        riskAssessment
      );

      // Create response
      const response: TaxDebtVerificationResponse = {
        request,
        taxDebtDetails,
        recommendations: this.generateRecommendations(riskAssessment),
        procurementEligibility,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTTL * 1000)
      };

      // Validate response
      const validatedResponse = TaxDebtVerificationResponseSchema.parse(response);

      // Cache result
      if (this.cacheEnabled) {
        await this.cacheResult(request, validatedResponse);
      }

      // Complete audit trail
      if (this.auditEnabled) {
        await this.completeAuditTrail(verificationId, validatedResponse);
      }

      return validatedResponse;
    } catch (error) {
      // Log to audit trail
      if (this.auditEnabled) {
        await this.failAuditTrail(verificationId, error);
      }
      throw error;
    }
  }

  /**
   * Verify federal tax debt through CRA
   */
  private async verifyFederalTaxDebt(request: TaxDebtVerificationRequest): Promise<FederalTaxDebt> {
    try {
      return await this.craAgent.verifyTaxDebt(request);
    } catch (error) {
      this.logger?.error('Federal tax debt verification failed', {
        businessNumber: request.businessNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify provincial tax debt
   */
  private async verifyProvincialTaxDebt(
    request: TaxDebtVerificationRequest,
    province: Province
  ): Promise<ProvincialTaxDebt> {
    try {
      const agent = this.provincialAgents.get(province);
      if (!agent || !agent.verifyTaxDebt) {
        throw new Error(`Tax debt verification not implemented for ${province}`);
      }

      return await agent.verifyTaxDebt(request);
    } catch (error) {
      this.logger?.error('Provincial tax debt verification failed', {
        province,
        businessNumber: request.businessNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Aggregate federal and provincial results
   */
  private aggregateResults(
    federalResult: PromiseSettledResult<FederalTaxDebt>,
    provincialResults: PromiseSettledResult<ProvincialTaxDebt>[],
    provinces: Province[]
  ): TaxDebtDetails {
    // Process federal result
    const federal = federalResult.status === 'fulfilled'
      ? federalResult.value
      : this.createEmptyFederalTaxDebt(federalResult.reason);

    // Process provincial results
    const provincial: Record<string, ProvincialTaxDebt> = {};
    let totalProvincialOwing = 0;
    const jurisdictionsWithDebt: string[] = [];

    provincialResults.forEach((result, index) => {
      const province = provinces[index];
      if (result.status === 'fulfilled') {
        provincial[province] = result.value;
        totalProvincialOwing += result.value.totalProvincialOwing;
        if (result.value.totalProvincialOwing > 0) {
          jurisdictionsWithDebt.push(province);
        }
      } else {
        provincial[province] = this.createEmptyProvincialTaxDebt(province, result.reason);
      }
    });

    // Add federal to jurisdictions with debt
    if (federal.totalFederalOwing > 0) {
      jurisdictionsWithDebt.unshift('Federal');
    }

    // Calculate totals
    const totalOwingAllJurisdictions = federal.totalFederalOwing + totalProvincialOwing;

    // Find oldest debt
    const allDebts: Date[] = [];
    if (federal.corporateTax?.oldestDebt) allDebts.push(federal.corporateTax.oldestDebt);
    if (federal.gstHst?.oldestDebt) allDebts.push(federal.gstHst.oldestDebt);
    Object.values(provincial).forEach(prov => {
      if (prov.lastAssessmentDate) allDebts.push(prov.lastAssessmentDate);
    });
    const oldestDebt = allDebts.length > 0 ? new Date(Math.min(...allDebts.map(d => d.getTime()))) : undefined;

    // Determine compliance
    const hasUnfiledReturns = 
      federal.corporateTax?.filingCompliance?.outstandingReturns > 0 ||
      federal.gstHst?.filingCompliance?.outstandingReturns > 0 ||
      federal.payrollDeductions?.filingCompliance?.outstandingReturns > 0 ||
      Object.values(provincial).some(p => 
        p.provincialCorporateTax?.filingCompliance?.outstandingReturns > 0 ||
        p.salesTax?.filingCompliance?.outstandingReturns > 0
      );

    const complianceIssues: string[] = [];
    if (hasUnfiledReturns) complianceIssues.push('Unfiled tax returns');
    if (federal.collectionsStatus) complianceIssues.push('Federal collections action');
    if (federal.payrollDeductions?.totalOwing > 0) complianceIssues.push('Payroll deductions owing');

    // Calculate confidence score
    const successfulVerifications = [federalResult, ...provincialResults]
      .filter(r => r.status === 'fulfilled').length;
    const totalVerifications = 1 + provinces.length;
    const confidenceScore = (successfulVerifications / totalVerifications) * 100;

    return {
      federal,
      provincial,
      totalOwingAllJurisdictions,
      jurisdictionsWithDebt,
      oldestDebt,
      overallRiskScore: 0, // Will be calculated separately
      riskLevel: 'low', // Will be determined separately
      overallCompliance: !hasUnfiledReturns && totalOwingAllJurisdictions === 0,
      complianceIssues: complianceIssues.length > 0 ? complianceIssues : undefined,
      verificationId: crypto.randomUUID(),
      verificationDate: new Date(),
      dataFreshness: this.getDataFreshness(federal, provincial),
      confidenceScore
    };
  }

  /**
   * Calculate comprehensive risk assessment
   */
  private calculateRiskAssessment(taxDebtDetails: TaxDebtDetails): TaxDebtRiskAssessment {
    const factors = {
      totalDebtAmount: taxDebtDetails.totalOwingAllJurisdictions,
      debtToRevenueRatio: undefined, // Would need revenue data
      yearsOfDebt: taxDebtDetails.oldestDebt
        ? Math.floor((Date.now() - taxDebtDetails.oldestDebt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0,
      unfiledReturns: this.countUnfiledReturns(taxDebtDetails),
      collectionsActions: taxDebtDetails.federal.collectionsStatus ? 1 : 0,
      paymentArrangementDefault: taxDebtDetails.federal.paymentArrangement?.status === 'defaulted',
      multipleJurisdictions: taxDebtDetails.jurisdictionsWithDebt.length > 1,
      criticalTaxTypes: this.identifyCriticalTaxTypes(taxDebtDetails),
      recentFilingCompliance: this.calculateRecentFilingCompliance(taxDebtDetails),
      industryRiskFactor: undefined // Would need industry data
    };

    // Calculate risk score
    let score = 0;

    // Debt amount (0-30)
    if (factors.totalDebtAmount === 0) score += 0;
    else if (factors.totalDebtAmount < 10000) score += 10;
    else if (factors.totalDebtAmount < 50000) score += 20;
    else if (factors.totalDebtAmount < 250000) score += 25;
    else score += 30;

    // Years of debt (0-15)
    score += Math.min(15, factors.yearsOfDebt * 3);

    // Unfiled returns (0-20)
    score += Math.min(20, factors.unfiledReturns * 5);

    // Collections (0-15)
    if (factors.collectionsActions > 0) score += 15;

    // Critical tax types (0-10)
    if (factors.criticalTaxTypes.includes('payroll_deductions')) score += 10;
    else if (factors.criticalTaxTypes.length > 0) score += 5;

    // Multiple jurisdictions (0-10)
    if (factors.multipleJurisdictions) score += 10;

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.totalDebtAmount > 0) {
      recommendations.push('Require payment arrangement verification before contract award');
    }
    if (factors.unfiledReturns > 0) {
      recommendations.push('Require all tax returns to be filed before eligibility');
    }
    if (factors.collectionsActions > 0) {
      recommendations.push('High risk - consider requiring security deposit or bond');
    }
    if (factors.criticalTaxTypes.includes('payroll_deductions')) {
      recommendations.push('Critical: Payroll deductions owing - verify employee protection');
    }

    // Mitigation options
    const mitigationOptions = [
      'Holdback percentage of contract payments for tax debt',
      'Direct payment arrangement with tax authorities',
      'Require surety bond for tax obligations',
      'Monthly compliance verification during contract'
    ];

    // Update tax debt details with risk info
    taxDebtDetails.overallRiskScore = score;
    taxDebtDetails.riskLevel = level;
    taxDebtDetails.riskFactors = Object.entries(factors)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);

    return {
      factors,
      score,
      level,
      recommendations,
      mitigationOptions: level === 'high' || level === 'critical' ? mitigationOptions : undefined,
      reviewRequired: score >= 60,
      assessmentDate: new Date()
    };
  }

  /**
   * Determine procurement eligibility
   */
  private determineProcurementEligibility(
    taxDebtDetails: TaxDebtDetails,
    riskAssessment: TaxDebtRiskAssessment
  ): TaxDebtVerificationResponse['procurementEligibility'] {
    const eligible = riskAssessment.level !== 'critical' && 
                    taxDebtDetails.totalOwingAllJurisdictions < 500000 &&
                    !taxDebtDetails.federal.collectionsStatus?.stage?.includes('legal_action');

    const reasons: string[] = [];
    const conditions: string[] = [];

    if (!eligible) {
      if (riskAssessment.level === 'critical') {
        reasons.push('Critical tax debt risk level');
      }
      if (taxDebtDetails.totalOwingAllJurisdictions >= 500000) {
        reasons.push('Tax debt exceeds $500,000 threshold');
      }
      if (taxDebtDetails.federal.collectionsStatus?.stage?.includes('legal_action')) {
        reasons.push('Legal action in progress for tax debt');
      }
    } else {
      if (taxDebtDetails.totalOwingAllJurisdictions > 0) {
        conditions.push('Payment arrangement must be in place and current');
      }
      if (riskAssessment.factors.unfiledReturns > 0) {
        conditions.push('All tax returns must be filed within 30 days');
      }
      if (riskAssessment.level === 'high') {
        conditions.push('Monthly tax compliance verification required');
        conditions.push('10% contract holdback for tax obligations');
      }
    }

    return {
      eligible,
      reasons: reasons.length > 0 ? reasons : undefined,
      conditions: conditions.length > 0 ? conditions : undefined
    };
  }

  /**
   * Generate recommendations based on risk assessment
   */
  private generateRecommendations(riskAssessment: TaxDebtRiskAssessment): string[] {
    return riskAssessment.recommendations;
  }

  /**
   * Get cached result
   */
  private async getCachedResult(
    request: TaxDebtVerificationRequest
  ): Promise<TaxDebtVerificationResponse | null> {
    if (!this.cacheEnabled || !this.redis) return null;

    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) return null;

      // Decrypt if encryption is enabled
      const decrypted = this.encryptionKey ? 
        await this.decrypt(cached) : 
        cached;

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger?.warn('Failed to retrieve cached result', { error: error.message });
      return null;
    }
  }

  /**
   * Cache verification result
   */
  private async cacheResult(
    request: TaxDebtVerificationRequest,
    response: TaxDebtVerificationResponse
  ): Promise<void> {
    if (!this.cacheEnabled || !this.redis) return;

    try {
      const cacheKey = this.generateCacheKey(request);
      const data = JSON.stringify(response);
      
      // Encrypt if encryption is enabled
      const encrypted = this.encryptionKey ? 
        await this.encrypt(data) : 
        data;

      await this.redis.setex(cacheKey, this.cacheTTL, encrypted);
    } catch (error) {
      this.logger?.warn('Failed to cache result', { error: error.message });
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: TaxDebtVerificationRequest): string {
    const components = [
      'tax-debt',
      request.businessNumber,
      ...request.provinces.sort(),
      request.yearsToCheck
    ];
    return components.join(':');
  }

  /**
   * Setup circuit breaker events
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger?.error('Tax debt aggregator circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger?.warn('Tax debt aggregator circuit breaker half-open');
    });

    this.circuitBreaker.on('close', () => {
      this.logger?.info('Tax debt aggregator circuit breaker closed');
    });
  }

  /**
   * Create empty federal tax debt object
   */
  private createEmptyFederalTaxDebt(error?: any): FederalTaxDebt {
    return {
      totalFederalOwing: 0,
      error: error?.message || 'Federal verification failed'
    } as FederalTaxDebt;
  }

  /**
   * Create empty provincial tax debt object
   */
  private createEmptyProvincialTaxDebt(province: string, error?: any): ProvincialTaxDebt {
    return {
      province,
      totalProvincialOwing: 0,
      error: error?.message || 'Provincial verification failed'
    } as ProvincialTaxDebt;
  }

  /**
   * Count unfiled returns
   */
  private countUnfiledReturns(taxDebtDetails: TaxDebtDetails): number {
    let count = 0;
    
    // Federal
    if (taxDebtDetails.federal.corporateTax?.filingCompliance?.outstandingReturns) {
      count += taxDebtDetails.federal.corporateTax.filingCompliance.outstandingReturns;
    }
    if (taxDebtDetails.federal.gstHst?.filingCompliance?.outstandingReturns) {
      count += taxDebtDetails.federal.gstHst.filingCompliance.outstandingReturns;
    }
    
    // Provincial
    Object.values(taxDebtDetails.provincial).forEach(prov => {
      if (prov.provincialCorporateTax?.filingCompliance?.outstandingReturns) {
        count += prov.provincialCorporateTax.filingCompliance.outstandingReturns;
      }
      if (prov.salesTax?.filingCompliance?.outstandingReturns) {
        count += prov.salesTax.filingCompliance.outstandingReturns;
      }
    });
    
    return count;
  }

  /**
   * Identify critical tax types with debt
   */
  private identifyCriticalTaxTypes(taxDebtDetails: TaxDebtDetails): string[] {
    const critical: string[] = [];
    
    if (taxDebtDetails.federal.payrollDeductions?.totalOwing > 0) {
      critical.push('payroll_deductions');
    }
    if (taxDebtDetails.federal.gstHst?.totalOwing > 0) {
      critical.push('gst_hst');
    }
    
    return critical;
  }

  /**
   * Calculate recent filing compliance
   */
  private calculateRecentFilingCompliance(taxDebtDetails: TaxDebtDetails): number {
    const rates: number[] = [];
    
    // Federal
    if (taxDebtDetails.federal.corporateTax?.filingCompliance?.complianceRate !== undefined) {
      rates.push(taxDebtDetails.federal.corporateTax.filingCompliance.complianceRate);
    }
    if (taxDebtDetails.federal.gstHst?.filingCompliance?.complianceRate !== undefined) {
      rates.push(taxDebtDetails.federal.gstHst.filingCompliance.complianceRate);
    }
    
    // Provincial
    Object.values(taxDebtDetails.provincial).forEach(prov => {
      if (prov.provincialCorporateTax?.filingCompliance?.complianceRate !== undefined) {
        rates.push(prov.provincialCorporateTax.filingCompliance.complianceRate);
      }
    });
    
    if (rates.length === 0) return 100;
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }

  /**
   * Get data freshness information
   */
  private getDataFreshness(
    federal: FederalTaxDebt,
    provincial: Record<string, ProvincialTaxDebt>
  ): Record<string, Date> {
    const freshness: Record<string, Date> = {
      federal: new Date()
    };
    
    Object.keys(provincial).forEach(prov => {
      freshness[prov] = new Date();
    });
    
    return freshness;
  }

  /**
   * Start audit trail
   */
  private async startAuditTrail(verificationId: string, request: TaxDebtVerificationRequest): Promise<void> {
    // Implementation for audit trail
  }

  /**
   * Complete audit trail
   */
  private async completeAuditTrail(verificationId: string, response: TaxDebtVerificationResponse): Promise<void> {
    // Implementation for audit trail
  }

  /**
   * Fail audit trail
   */
  private async failAuditTrail(verificationId: string, error: any): Promise<void> {
    // Implementation for audit trail
  }

  /**
   * Record metrics
   */
  private recordMetrics(metric: string, duration: number, tags: Record<string, any>): void {
    // Implementation for metrics recording
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<string> {
    // Implementation for encryption
    return data; // Placeholder
  }

  /**
   * Decrypt data
   */
  private async decrypt(data: string): Promise<string> {
    // Implementation for decryption
    return data; // Placeholder
  }
}