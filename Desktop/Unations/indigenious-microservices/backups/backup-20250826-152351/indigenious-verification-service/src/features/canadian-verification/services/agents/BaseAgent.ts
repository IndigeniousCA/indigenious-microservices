/**
 * Base Agent for Canadian Universal Verification System
 * 
 * @module BaseAgent
 * @description Foundation for all verification agents with security and monitoring
 */

import { z } from 'zod';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import fs from 'fs';
import crypto from 'crypto';
import pRetry from 'p-retry';
import CircuitBreaker from 'opossum';
import DOMPurify from 'isomorphic-dompurify';

import { logger } from '@/lib/monitoring/logger';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { auditLogger } from '@/features/bank-integration/services/AuditLogger';

import { 
  VerificationRequest, 
  BaseAgent as IBaseAgent,
  ProvincialVerificationResult 
} from '../../types';

/**
 * Abstract base class for all verification agents
 * Provides security, monitoring, and resilience features
 */
export abstract class BaseAgent implements IBaseAgent {
  protected readonly maxRetries = 3;
  protected readonly timeout = 30000; // 30 seconds
  protected circuitBreaker: CircuitBreaker;
  protected apis: Map<string, any> = new Map();
  
  constructor(protected readonly agentName: string) {
    this.circuitBreaker = new CircuitBreaker(
      async (fn: Function) => fn(),
      {
        timeout: this.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: `${agentName}CircuitBreaker`
      }
    );
    
    this.setupCircuitBreakerEvents();
  }
  
  /**
   * Abstract verification method to be implemented by each agent
   */
  abstract verify(request: VerificationRequest): Promise<any>;
  
  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<{ 
    healthy: boolean; 
    latency?: number; 
    lastSuccess?: Date;
    circuitBreakerState?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Test primary API endpoint
      const testResult = await this.testPrimaryEndpoint();
      
      return {
        healthy: testResult,
        latency: Date.now() - startTime,
        lastSuccess: new Date(),
        circuitBreakerState: this.circuitBreaker.stats.state
      };
    } catch (error) {
      logger.error(`Health check failed for ${this.agentName}`, {
        error: error.message,
        state: this.circuitBreaker.stats.state
      });
      
      return {
        healthy: false,
        latency: Date.now() - startTime,
        circuitBreakerState: this.circuitBreaker.stats.state
      };
    }
  }
  
  /**
   * Make secure API request with retry and circuit breaker
   */
  protected async makeSecureRequest<T>(
    apiCall: () => Promise<T>,
    context: string
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Log request start
      await this.logRequestStart(requestId, context);
      
      // Execute with circuit breaker
      const result = await this.circuitBreaker.fire(async () => {
        // Add timeout protection
        return Promise.race([
          pRetry(apiCall, {
            retries: this.maxRetries,
            minTimeout: 1000,
            maxTimeout: 5000,
            randomize: true,
            onFailedAttempt: (error) => {
              logger.warn(`API call attempt failed`, {
                agent: this.agentName,
                context,
                attempt: error.attemptNumber,
                error: error.message
              });
            }
          }),
          this.createTimeout()
        ]);
      });
      
      // Log success
      await this.logRequestSuccess(requestId, context, Date.now() - startTime);
      
      return result as T;
    } catch (error) {
      // Log error
      await this.logRequestError(requestId, context, error, Date.now() - startTime);
      throw error;
    }
  }
  
  /**
   * Create secure HTTP client with certificate pinning
   */
  protected createSecureClient(
    baseURL: string,
    options?: {
      certPath?: string;
      apiKey?: string;
      headers?: Record<string, string>;
    }
  ): AxiosInstance {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: true,
      minVersion: 'TLSv1.3',
      ...(options?.certPath && fs.existsSync(options.certPath) ? {
        ca: fs.readFileSync(options.certPath)
      } : {})
    });
    
    return axios.create({
      baseURL,
      httpsAgent,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'IndigenousProcurement/1.0',
        ...(options?.apiKey && { 'X-API-Key': options.apiKey }),
        ...options?.headers
      },
      validateStatus: (status) => status < 500
    });
  }
  
  /**
   * Sanitize input to prevent injection attacks
   */
  protected sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    }).trim();
  }
  
  /**
   * Calculate verification confidence based on results
   */
  protected calculateConfidence(results: PromiseSettledResult<any>[]): number {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const total = results.length;
    
    if (total === 0) return 0;
    
    let confidence = successful / total;
    
    // Reduce confidence for any errors
    const errors = results.filter(r => r.status === 'rejected');
    errors.forEach(error => {
      const errorMessage = error.reason?.message || '';
      if (errorMessage.includes('timeout')) {
        confidence *= 0.7;
      } else if (errorMessage.includes('not found')) {
        confidence *= 0.8;
      } else {
        confidence *= 0.9;
      }
    });
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Extract errors from results
   */
  protected extractErrors(results: PromiseSettledResult<any>[]): string[] {
    return results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message || 'Unknown error');
  }
  
  /**
   * Setup circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      logger.error(`Circuit breaker opened for ${this.agentName}`, {
        stats: this.circuitBreaker.stats
      });
    });
    
    this.circuitBreaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${this.agentName}`);
    });
    
    this.circuitBreaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${this.agentName}`);
    });
    
    this.circuitBreaker.on('failure', (error) => {
      logger.warn(`Circuit breaker failure for ${this.agentName}`, {
        error: error.message
      });
    });
  }
  
  /**
   * Create timeout promise
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API call timeout')), this.timeout)
    );
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected abstract testPrimaryEndpoint(): Promise<boolean>;
  
  /**
   * Log request start
   */
  private async logRequestStart(requestId: string, context: string): Promise<void> {
    await auditLogger.log({
      action: 'agent.request.start',
      requestId,
      agent: this.agentName,
      context,
      timestamp: new Date()
    });
  }
  
  /**
   * Log request success
   */
  private async logRequestSuccess(
    requestId: string, 
    context: string, 
    duration: number
  ): Promise<void> {
    await Promise.all([
      auditLogger.log({
        action: 'agent.request.success',
        requestId,
        agent: this.agentName,
        context,
        duration,
        timestamp: new Date()
      }),
      
      performanceMonitor.recordMetric({
        operation: `${this.agentName}:${context}`,
        duration,
        success: true
      })
    ]);
  }
  
  /**
   * Log request error
   */
  private async logRequestError(
    requestId: string,
    context: string,
    error: any,
    duration: number
  ): Promise<void> {
    await Promise.all([
      auditLogger.log({
        action: 'agent.request.error',
        requestId,
        agent: this.agentName,
        context,
        error: error.message,
        duration,
        timestamp: new Date()
      }),
      
      performanceMonitor.recordMetric({
        operation: `${this.agentName}:${context}`,
        duration,
        success: false,
        metadata: { error: error.message }
      })
    ]);
  }
  
  /**
   * Store verification result
   */
  protected async storeVerificationResult(result: any): Promise<void> {
    try {
      await auditLogger.log({
        action: 'agent.verification.complete',
        agent: this.agentName,
        verificationId: result.verificationId,
        confidence: result.confidence,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to store verification result', {
        agent: this.agentName,
        error: error.message
      });
    }
  }
}

/**
 * Base class for provincial agents
 */
export abstract class BaseProvincialAgent extends BaseAgent {
  constructor(protected readonly province: string) {
    super(`${province}-Provincial`);
  }
  
  /**
   * Verify business registration in the province
   */
  protected abstract verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any>;
  
  /**
   * Verify safety compliance (WCB/WSIB)
   */
  protected abstract verifySafetyCompliance(
    businessIdentifier: string
  ): Promise<any>;
  
  /**
   * Verify trade qualifications
   */
  protected abstract verifyTradeQualifications(
    workers: any[]
  ): Promise<any>;
}