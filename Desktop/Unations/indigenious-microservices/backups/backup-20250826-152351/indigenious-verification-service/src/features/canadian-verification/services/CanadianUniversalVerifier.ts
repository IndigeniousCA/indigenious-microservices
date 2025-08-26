/**
 * Canadian Universal Verification Service
 * Enterprise-grade verification across all 13 provinces/territories
 * 
 * @module CanadianUniversalVerifier
 * @requires SOC2 Type II Compliance
 * @requires ISO 27001 Certification
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import { Redis } from 'ioredis';
import pRetry from 'p-retry';
import CircuitBreaker from 'opossum';

// Internal imports
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { auditLogger } from '@/features/bank-integration/services/AuditLogger';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import { RateLimiter } from '@/lib/rate-limiter';
import { MetricsCollector } from '@/lib/monitoring/metrics';

// Import existing services
import { IntelligentVerificationService } from '@/features/bank-integration/services/IntelligentVerificationService';
// Import { VerificationMonopolyEngine } from '@/features/verification-monopoly/verification-engine';
// Import { FraudDetectionService } from '@/features/bank-integration/services/FraudDetectionService';

// Import provincial agents
import { BritishColumbiaAgent } from './agents/BritishColumbiaAgent';
import { AlbertaAgent } from './agents/AlbertaAgent';
import { SaskatchewanAgent } from './agents/SaskatchewanAgent';
import { ManitobaAgent } from './agents/ManitobaAgent';
import { OntarioAgent } from './agents/OntarioAgent';
import { QuebecAgent } from './agents/QuebecAgent';
import { NewBrunswickAgent } from './agents/NewBrunswickAgent';
import { NovaScotiaAgent } from './agents/NovaScotiaAgent';
import { PrinceEdwardIslandAgent } from './agents/PrinceEdwardIslandAgent';
import { NewfoundlandLabradorAgent } from './agents/NewfoundlandLabradorAgent';
import { YukonAgent } from './agents/YukonAgent';
import { NorthwestTerritoriesAgent } from './agents/NorthwestTerritoriesAgent';
import { NunavutAgent } from './agents/NunavutAgent';

// Import federal agents
import { CRAAgent } from './agents/CRAAgent';
import { ISEDAgent } from './agents/ISEDAgent';
import { ISCAgent } from './agents/ISCAgent';
import { ESDCAgent } from './agents/ESDCAgent';

// Import specialized agents
import { IndigenousVerificationAgent } from './agents/IndigenousVerificationAgent';
import { TradeHarmonizationAgent } from './agents/TradeHarmonizationAgent';
import { BillC5ComplianceAgent } from './agents/BillC5ComplianceAgent';
import { SafetyComplianceAgent } from './agents/SafetyComplianceAgent';

// Import types
import {
  VerificationRequest,
  VerificationResult,
  Worker,
  Certification,
  ProvincialVerificationResult,
  FederalVerificationResult,
  SpecializedVerificationResult,
  BaseAgent,
  ConfidenceLevel,
  VerificationError,
  getConfidenceLevel
} from '../types';

/**
 * Canadian Universal Verification Service
 * 
 * This service orchestrates verification across all Canadian provinces and territories,
 * federal agencies, and specialized verification systems.
 * 
 * @example
 * ```typescript
 * const verifier = CanadianUniversalVerifier.getInstance();
 * const result = await verifier.verifyEntity({
 *   businessName: "Northern Construction Inc",
 *   location: { province: "ON" }
 * });
 * ```
 */
export class CanadianUniversalVerifier {
  private static instance: CanadianUniversalVerifier;
  
  private readonly provincialAgents: Map<string, BaseAgent>;
  private readonly federalAgents: Map<string, BaseAgent>;
  private readonly specializedAgents: Map<string, BaseAgent>;
  
  private readonly redis: Redis;
  private readonly rateLimiter: RateLimiter;
  private readonly metrics: MetricsCollector;
  private readonly fraudService: any; // FraudDetectionService
  private readonly intelligentVerification: IntelligentVerificationService;
  
  // Configuration
  private readonly config = {
    cache: {
      ttl: 86400, // 24 hours
      highRiskTtl: 3600, // 1 hour for high-risk entities
      prefix: 'can_verify:'
    },
    timeout: {
      agent: 30000, // 30 seconds per agent
      total: 120000 // 2 minutes total
    },
    retries: {
      attempts: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      randomize: true
    },
    circuitBreaker: {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    }
  };
  
  private constructor() {
    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    // Initialize services
    this.rateLimiter = new RateLimiter({
      verification: { points: 10, duration: 60 }, // 10 per minute
      heavyVerification: { points: 100, duration: 3600 } // 100 per hour
    });
    
    this.metrics = new MetricsCollector('canadian_verification');
    // this.fraudService = FraudDetectionService.getInstance();
    this.fraudService = { assessRisk: async (data: any) => ({ riskScore: 0.1, indicators: [], recommendations: [] }) };
    this.intelligentVerification = IntelligentVerificationService.getInstance();
    
    // Initialize agents
    this.initializeAgents();
    
    // Start monitoring
    this.startHealthMonitoring();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): CanadianUniversalVerifier {
    if (!CanadianUniversalVerifier.instance) {
      CanadianUniversalVerifier.instance = new CanadianUniversalVerifier();
    }
    return CanadianUniversalVerifier.instance;
  }
  
  /**
   * Initialize all verification agents
   */
  private initializeAgents(): void {
    // Provincial Agents
    this.provincialAgents = new Map([
      ['BC', new BritishColumbiaAgent()],
      ['AB', new AlbertaAgent()],
      ['SK', new SaskatchewanAgent()],
      ['MB', new ManitobaAgent()],
      ['ON', new OntarioAgent()],
      ['QC', new QuebecAgent()],
      ['NB', new NewBrunswickAgent()],
      ['NS', new NovaScotiaAgent()],
      ['PE', new PrinceEdwardIslandAgent()],
      ['NL', new NewfoundlandLabradorAgent()],
      ['YT', new YukonAgent()],
      ['NT', new NorthwestTerritoriesAgent()],
      ['NU', new NunavutAgent()]
    ]);
    
    // Federal Agents
    this.federalAgents = new Map([
      ['CRA', new CRAAgent()],
      ['ISED', new ISEDAgent()],
      ['ISC', new ISCAgent()],
      ['ESDC', new ESDCAgent()]
    ]);
    
    // Specialized Agents
    this.specializedAgents = new Map([
      ['indigenous', new IndigenousVerificationAgent()],
      ['trade', new TradeHarmonizationAgent()],
      ['fraud', this.createFraudAgent()],
      ['billC5', new BillC5ComplianceAgent()],
      ['safety', new SafetyComplianceAgent()]
    ]);
    
    logger.info('All verification agents initialized', {
      provincial: this.provincialAgents.size,
      federal: this.federalAgents.size,
      specialized: this.specializedAgents.size
    });
  }
  
  /**
   * Main verification method
   * 
   * @param request - Verification request
   * @param options - Additional options
   * @returns Verification result with confidence score
   */
  async verifyEntity(
    request: VerificationRequest,
    options?: {
      forceRefresh?: boolean;
      includeNetworkAnalysis?: boolean;
      urgency?: 'normal' | 'high' | 'critical';
    }
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const verificationId = crypto.randomUUID();
    const traceId = crypto.randomUUID();
    
    try {
      // Start trace
      logger.info('Starting verification', {
        verificationId,
        traceId,
        businessName: request.businessName,
        province: request.location.province,
        urgency: options?.urgency || 'normal'
      });
      
      // Validate request
      const validatedRequest = await this.validateRequest(request);
      
      // Check rate limits
      await this.checkRateLimits(validatedRequest, options?.urgency);
      
      // Check cache if not forcing refresh
      if (!options?.forceRefresh) {
        const cached = await this.getCachedResult(validatedRequest);
        if (cached) {
          logger.info('Returning cached result', { verificationId, cacheAge: cached.age });
          return cached.result;
        }
      }
      
      // Log to audit trail
      await this.logVerificationStart(verificationId, validatedRequest);
      
      // Execute verification
      const result = await this.executeVerification(
        verificationId,
        validatedRequest,
        options
      );
      
      // Cache result
      await this.cacheResult(validatedRequest, result);
      
      // Log completion
      await this.logVerificationComplete(verificationId, result);
      
      // Record metrics
      await this.recordMetrics(verificationId, result, Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // Log error
      logger.error('Verification failed', {
        verificationId,
        traceId,
        error: error.message,
        stack: error.stack
      });
      
      // Record error metrics
      await this.metrics.recordError('verification_failed', {
        error: error.message,
        businessName: request.businessName
      });
      
      // Re-throw with context
      throw new VerificationError(
        `Verification failed: ${error.message}`,
        'VERIFICATION_FAILED',
        { verificationId, originalError: error }
      );
    }
  }
  
  /**
   * Execute the actual verification process
   */
  private async executeVerification(
    verificationId: string,
    request: VerificationRequest,
    options?: any
  ): Promise<VerificationResult> {
    const systemsChecked: string[] = [];
    const verificationTasks: Promise<any>[] = [];
    
    // Determine which provinces to check
    const provincesToCheck = this.determineProvincesToCheck(request);
    
    // 1. Provincial verifications
    for (const province of provincesToCheck) {
      const agent = this.provincialAgents.get(province);
      if (agent) {
        verificationTasks.push(
          this.executeAgentVerification(agent, request, `${province}-Provincial`)
        );
        systemsChecked.push(`${province}-Provincial`);
      }
    }
    
    // 2. Federal verifications (always check CRA and ISED)
    verificationTasks.push(
      this.executeAgentVerification(this.federalAgents.get('CRA')!, request, 'CRA')
    );
    verificationTasks.push(
      this.executeAgentVerification(this.federalAgents.get('ISED')!, request, 'ISED')
    );
    systemsChecked.push('CRA', 'ISED');
    
    // 3. Indigenous verification if applicable
    if (request.indigenousPartnership) {
      verificationTasks.push(
        this.executeAgentVerification(this.specializedAgents.get('indigenous')!, request, 'Indigenous-Validator')
      );
      verificationTasks.push(
        this.executeAgentVerification(this.federalAgents.get('ISC')!, request, 'ISC')
      );
      systemsChecked.push('ISC', 'Indigenous-Validator');
    }
    
    // 4. Trade verifications if applicable
    if (request.tradeQualifications?.length || request.workers?.length) {
      verificationTasks.push(
        this.executeAgentVerification(this.specializedAgents.get('trade')!, request, 'Trade-Harmonizer')
      );
      systemsChecked.push('Trade-Harmonizer');
    }
    
    // 5. Safety compliance (always check)
    verificationTasks.push(
      this.executeAgentVerification(this.specializedAgents.get('safety')!, request, 'Safety-Compliance')
    );
    systemsChecked.push('Safety-Compliance');
    
    // 6. Bill C-5 compliance for cross-provincial
    if (provincesToCheck.length > 1) {
      verificationTasks.push(
        this.executeAgentVerification(this.specializedAgents.get('billC5')!, request, 'BillC5-Compliance')
      );
      systemsChecked.push('BillC5-Compliance');
    }
    
    // 7. Fraud detection (always run)
    verificationTasks.push(
      this.executeAgentVerification(this.specializedAgents.get('fraud')!, request, 'Fraud-Detection')
    );
    systemsChecked.push('Fraud-Detection');
    
    // Execute all verifications in parallel with timeout
    const results = await Promise.race([
      Promise.allSettled(verificationTasks),
      this.createTimeout(this.config.timeout.total)
    ]);
    
    // Process results
    const processedResults = this.processVerificationResults(results);
    
    // Synthesize final result
    const synthesized = this.synthesizeResults(processedResults);
    
    // Generate certificate if verified
    const certificate = synthesized.verified ? 
      await this.generateVerificationCertificate(verificationId, synthesized) : 
      undefined;
    
    return {
      verificationId,
      ...synthesized,
      timeElapsed: Date.now() - Date.now(),
      systemsChecked,
      certificate
    };
  }
  
  /**
   * Execute a single agent verification with retry and circuit breaker
   */
  private async executeAgentVerification(
    agent: BaseAgent,
    request: VerificationRequest,
    agentName: string
  ): Promise<any> {
    const circuitBreaker = new CircuitBreaker(
      async () => agent.verify(request),
      this.config.circuitBreaker
    );
    
    circuitBreaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${agentName}`);
      this.metrics.recordGauge('circuit_breaker_open', 1, { agent: agentName });
    });
    
    circuitBreaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${agentName}`);
    });
    
    try {
      return await pRetry(
        () => circuitBreaker.fire(),
        {
          ...this.config.retries,
          onFailedAttempt: (error) => {
            logger.warn(`Agent verification attempt failed`, {
              agent: agentName,
              attempt: error.attemptNumber,
              error: error.message
            });
          }
        }
      );
    } catch (error) {
      logger.error(`Agent verification failed after retries`, {
        agent: agentName,
        error: error.message
      });
      
      // Return error result instead of throwing
      return {
        agent: agentName,
        error: true,
        message: error.message,
        confidence: 0
      };
    }
  }
  
  /**
   * Determine which provinces need to be checked
   */
  private determineProvincesToCheck(request: VerificationRequest): string[] {
    const provinces = new Set<string>();
    
    // Always check business location province
    provinces.add(request.location.province);
    
    // Add provinces where workers are certified
    request.workers?.forEach(worker => {
      worker.provinces.forEach(p => provinces.add(p));
      worker.certifications?.forEach(cert => {
        if (cert.province) provinces.add(cert.province);
      });
    });
    
    // Add project location province if different
    if (request.projectDetails?.location) {
      const projectProvince = this.extractProvinceFromLocation(request.projectDetails.location);
      if (projectProvince) provinces.add(projectProvince);
    }
    
    return Array.from(provinces);
  }
  
  /**
   * Extract province code from location string
   */
  private extractProvinceFromLocation(location: string): string | null {
    const provinceMap: Record<string, string> = {
      'British Columbia': 'BC', 'BC': 'BC',
      'Alberta': 'AB', 'AB': 'AB',
      'Saskatchewan': 'SK', 'SK': 'SK',
      'Manitoba': 'MB', 'MB': 'MB',
      'Ontario': 'ON', 'ON': 'ON',
      'Quebec': 'QC', 'QC': 'QC', 'Québec': 'QC',
      'New Brunswick': 'NB', 'NB': 'NB',
      'Nova Scotia': 'NS', 'NS': 'NS',
      'Prince Edward Island': 'PE', 'PEI': 'PE', 'PE': 'PE',
      'Newfoundland': 'NL', 'NL': 'NL', 'Newfoundland and Labrador': 'NL',
      'Yukon': 'YT', 'YT': 'YT',
      'Northwest Territories': 'NT', 'NWT': 'NT', 'NT': 'NT',
      'Nunavut': 'NU', 'NU': 'NU'
    };
    
    for (const [key, value] of Object.entries(provinceMap)) {
      if (location.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return null;
  }
  
  /**
   * Process verification results from all agents
   */
  private processVerificationResults(results: PromiseSettledResult<any>[]): any[] {
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error('Agent verification failed', {
          index,
          reason: result.reason
        });
        return {
          error: true,
          message: result.reason?.message || 'Unknown error',
          confidence: 0
        };
      }
    });
  }
  
  /**
   * Synthesize results from all agents into final verification
   */
  private synthesizeResults(results: any[]): Omit<VerificationResult, 'verificationId' | 'timeElapsed' | 'systemsChecked' | 'certificate'> {
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(results);
    
    // Determine verification status
    const verified = confidence >= 0.95 && !results.some(r => r.type === 'fraud' && r.riskScore > 0.3);
    
    // Organize results by type
    const details = {
      businessVerification: results.find(r => r.type === 'business'),
      workerVerifications: results.filter(r => r.type === 'worker'),
      indigenousVerification: results.find(r => r.type === 'indigenous'),
      tradeVerifications: results.filter(r => r.type === 'trade'),
      safetyCompliance: results.find(r => r.type === 'safety'),
      crossProvincialCompliance: results.find(r => r.type === 'billC5'),
      fraudAssessment: results.find(r => r.type === 'fraud')
    };
    
    return {
      verified,
      confidence,
      details
    };
  }
  
  /**
   * Calculate weighted confidence score
   */
  private calculateOverallConfidence(results: any[]): number {
    const weights: Record<string, number> = {
      'business': 0.25,
      'indigenous': 0.20,
      'worker': 0.15,
      'trade': 0.15,
      'safety': 0.15,
      'billC5': 0.05,
      'fraud': 0.05
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    results.forEach(result => {
      const weight = weights[result.type] || 0.1;
      const confidence = result.confidence || (result.error ? 0 : 0.5);
      
      totalWeight += weight;
      weightedSum += confidence * weight;
    });
    
    return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0;
  }
  
  /**
   * Generate verification certificate
   */
  private async generateVerificationCertificate(
    verificationId: string,
    result: any
  ): Promise<string> {
    const certificate = {
      id: verificationId,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      confidence: result.confidence,
      details: result.details,
      signature: ''
    };
    
    // Sign certificate
    certificate.signature = await this.signCertificate(certificate);
    
    // Store certificate
    await prisma.verificationCertificate.create({
      data: {
        id: verificationId,
        certificate: JSON.stringify(certificate),
        expiresAt: certificate.expiresAt
      }
    });
    
    return verificationId;
  }
  
  /**
   * Sign certificate with private key
   */
  private async signCertificate(certificate: any): Promise<string> {
    const privateKey = process.env.VERIFICATION_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Verification private key not configured');
    }
    
    const data = JSON.stringify({
      id: certificate.id,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      confidence: certificate.confidence
    });
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  }
  
  /**
   * Validate and sanitize request
   */
  private async validateRequest(request: VerificationRequest): Promise<VerificationRequest> {
    // Define validation schema
    const schema = z.object({
      businessName: z.string()
        .min(1, 'Business name is required')
        .max(255, 'Business name too long')
        .transform(val => DOMPurify.sanitize(val)),
      
      businessNumber: z.string()
        .regex(/^\d{9}[A-Z]{2}\d{4}$/, 'Invalid business number format')
        .optional()
        .transform(val => val ? DOMPurify.sanitize(val) : undefined),
      
      location: z.object({
        province: z.enum(['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']),
        city: z.string().max(100).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined)
      }),
      
      indigenousPartnership: z.object({
        partnerName: z.string().max(255).transform(val => DOMPurify.sanitize(val)),
        nation: z.string().max(100).transform(val => DOMPurify.sanitize(val)),
        agreementDate: z.date().optional()
      }).optional(),
      
      workers: z.array(z.object({
        name: z.string().max(255).transform(val => DOMPurify.sanitize(val)),
        sin: z.string().optional(), // Will be encrypted
        trades: z.array(z.string()),
        provinces: z.array(z.string()),
        certifications: z.array(z.object({
          type: z.string(),
          number: z.string(),
          province: z.string(),
          expiry: z.date(),
          redSeal: z.boolean().optional()
        }))
      })).max(100).optional(),
      
      tradeQualifications: z.array(z.string()).optional(),
      
      projectDetails: z.object({
        name: z.string().max(500).transform(val => DOMPurify.sanitize(val)),
        location: z.string().max(500).transform(val => DOMPurify.sanitize(val)),
        value: z.number().positive(),
        requiredCertifications: z.array(z.string())
      }).optional()
    });
    
    try {
      const validated = schema.parse(request);
      
      // Encrypt sensitive data
      if (validated.workers) {
        for (const worker of validated.workers) {
          if (worker.sin) {
            worker.sin = await this.encryptSensitiveData(worker.sin);
          }
        }
      }
      
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new VerificationError(
          'Invalid request data',
          'VALIDATION_ERROR',
          { errors: error.errors }
        );
      }
      throw error;
    }
  }
  
  /**
   * Check rate limits
   */
  private async checkRateLimits(request: VerificationRequest, urgency?: string): Promise<void> {
    const clientId = this.getClientId(); // Get from context/auth
    
    // Different limits based on urgency
    const limitType = urgency === 'critical' ? 'verification' : 'heavyVerification';
    
    try {
      await this.rateLimiter.checkLimit(clientId, limitType);
    } catch (error) {
      throw new VerificationError(
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        { retryAfter: error.retryAfter }
      );
    }
  }
  
  /**
   * Get cached verification result
   */
  private async getCachedResult(request: VerificationRequest): Promise<{ result: VerificationResult; age: number } | null> {
    const cacheKey = this.generateCacheKey(request);
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      
      // Check if cache is still valid
      const ttl = parsed.result.confidence < 0.7 ? this.config.cache.highRiskTtl : this.config.cache.ttl;
      if (age > ttl * 1000) {
        await this.redis.del(cacheKey);
        return null;
      }
      
      return {
        result: parsed.result,
        age
      };
    } catch (error) {
      logger.error('Cache retrieval error', { error: error.message });
      return null;
    }
  }
  
  /**
   * Cache verification result
   */
  private async cacheResult(request: VerificationRequest, result: VerificationResult): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = result.confidence < 0.7 ? this.config.cache.highRiskTtl : this.config.cache.ttl;
    
    try {
      await this.redis.setex(
        cacheKey,
        ttl,
        JSON.stringify({
          result,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      logger.error('Cache storage error', { error: error.message });
      // Don't throw - caching is not critical
    }
  }
  
  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: VerificationRequest): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      businessName: request.businessName,
      businessNumber: request.businessNumber,
      location: request.location,
      workerCount: request.workers?.length || 0
    }));
    return `${this.config.cache.prefix}${hash.digest('hex')}`;
  }
  
  /**
   * Log verification start
   */
  private async logVerificationStart(verificationId: string, request: VerificationRequest): Promise<void> {
    await Promise.all([
      // Audit log
      auditLogger.log({
        action: 'verification.start',
        verificationId,
        businessName: request.businessName,
        province: request.location.province,
        timestamp: new Date()
      }),
      
      // Indigenous ledger
      indigenousLedger.log(
        'verification.initiated',
        'info',
        'Verification process started',
        {
          verificationId,
          businessName: request.businessName,
          hasIndigenousPartnership: !!request.indigenousPartnership
        }
      )
    ]);
  }
  
  /**
   * Log verification completion
   */
  private async logVerificationComplete(verificationId: string, result: VerificationResult): Promise<void> {
    await Promise.all([
      // Audit log
      auditLogger.log({
        action: 'verification.complete',
        verificationId,
        verified: result.verified,
        confidence: result.confidence,
        duration: result.timeElapsed,
        timestamp: new Date()
      }),
      
      // Indigenous ledger
      indigenousLedger.log(
        'verification.completed',
        result.verified ? 'info' : 'warning',
        'Verification process completed',
        {
          verificationId,
          verified: result.verified,
          confidence: result.confidence,
          systemsChecked: result.systemsChecked.length
        }
      ),
      
      // Store in database
      prisma.verificationAudit.create({
        data: {
          businessId: result.details.businessVerification?.businessId || 'unknown',
          verificationType: 'comprehensive',
          systemsChecked: result.systemsChecked,
          confidence: result.confidence,
          result: result as any,
          performedBy: this.getClientId(),
          performedAt: new Date()
        }
      })
    ]);
  }
  
  /**
   * Record performance metrics
   */
  private async recordMetrics(verificationId: string, result: VerificationResult, duration: number): Promise<void> {
    await Promise.all([
      // Record duration
      this.metrics.recordHistogram('verification_duration', duration, {
        verified: result.verified.toString(),
        confidence_bucket: this.getConfidenceBucket(result.confidence)
      }),
      
      // Record success rate
      this.metrics.recordCounter('verification_total', 1, {
        verified: result.verified.toString()
      }),
      
      // Record systems checked
      this.metrics.recordGauge('systems_checked', result.systemsChecked.length, {
        verificationId
      }),
      
      // Performance monitoring
      performanceMonitor.recordMetric({
        operation: 'canadian_verification',
        duration,
        success: result.verified,
        metadata: {
          confidence: result.confidence,
          systemsChecked: result.systemsChecked.length
        }
      })
    ]);
  }
  
  /**
   * Get confidence bucket for metrics
   */
  private getConfidenceBucket(confidence: number): string {
    if (confidence >= 0.95) return 'very_high';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    if (confidence >= 0.4) return 'low';
    return 'very_low';
  }
  
  /**
   * Get client ID from context
   */
  private getClientId(): string {
    // In real implementation, get from auth context
    return 'system';
  }
  
  /**
   * Encrypt sensitive data
   */
  private async encryptSensitiveData(data: string): Promise<string> {
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
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new VerificationError('Verification timeout', 'TIMEOUT', { timeout: ms }));
      }, ms);
    });
  }
  
  /**
   * Create fraud detection agent wrapper
   */
  private createFraudAgent(): BaseAgent {
    return {
      verify: async (request: VerificationRequest) => {
        const fraudResult = await this.fraudService.assessRisk({
          businessName: request.businessName,
          businessNumber: request.businessNumber,
          location: request.location.province,
          metadata: {
            hasIndigenousPartnership: !!request.indigenousPartnership,
            workerCount: request.workers?.length || 0,
            projectValue: request.projectDetails?.value
          }
        });
        
        return {
          type: 'fraud',
          riskScore: fraudResult.riskScore,
          confidence: 1 - fraudResult.riskScore,
          indicators: fraudResult.indicators,
          recommendations: fraudResult.recommendations
        };
      }
    };
  }
  
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        // Check Redis health
        await this.redis.ping();
        
        // Check agent health
        for (const [name, agent] of this.provincialAgents) {
          if (agent.healthCheck) {
            const health = await agent.healthCheck();
            this.metrics.recordGauge('agent_health', health.healthy ? 1 : 0, {
              agent: name,
              type: 'provincial'
            });
          }
        }
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
      }
    }, 60000); // Every minute
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    logger.info('Canadian Universal Verifier cleaned up');
  }
}

// Export singleton instance
export const canadianVerifier = CanadianUniversalVerifier.getInstance();