/**
 * Base Hunter Abstract Class
 * Foundation for all business hunter implementations
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { CircuitBreaker } from 'opossum';
import UserAgent from 'user-agents';
import { 
  DiscoveredBusiness, 
  HunterConfig, 
  HuntingResult, 
  HuntingStats,
  HuntingError,
  SourceType
} from '../../types';
import { createLogger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';
import { ProxyRotator } from '../../utils/proxyRotator';

export abstract class BaseHunter extends EventEmitter {
  protected readonly id: string;
  protected readonly config: HunterConfig;
  protected readonly logger: Logger;
  protected readonly redis: Redis;
  protected readonly httpClient: AxiosInstance;
  protected readonly rateLimiter: RateLimiter;
  protected readonly proxyRotator?: ProxyRotator;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly concurrencyLimit: any;
  
  // Stats tracking
  protected stats: HuntingStats = {
    discovered: 0,
    validated: 0,
    enriched: 0,
    duplicates: 0,
    errors: 0,
    duration: 0,
    source: ''
  };
  
  constructor(config: HunterConfig, redis: Redis) {
    super();
    this.id = config.id;
    this.config = config;
    this.redis = redis;
    this.logger = createLogger(`hunter:${config.type}:${config.id}`);
    
    // Setup HTTP client with retry logic
    this.httpClient = this.createHttpClient();
    
    // Setup rate limiting
    this.rateLimiter = new RateLimiter({
      requests: config.rateLimit,
      interval: 60000 // per minute
    });
    
    // Setup proxy rotation if configured
    if (config.proxy) {
      this.proxyRotator = new ProxyRotator(config.proxy);
    }
    
    // Setup circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(
      this.hunt.bind(this),
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000
      }
    );
    
    // Setup concurrency control
    this.concurrencyLimit = pLimit(5); // Max 5 concurrent requests
    
    this.setupEventHandlers();
  }
  
  /**
   * Abstract method - must be implemented by each hunter type
   */
  abstract hunt(source: string, options?: any): Promise<DiscoveredBusiness[]>;
  
  /**
   * Start hunting from configured sources
   */
  async startHunting(): Promise<HuntingResult> {
    const startTime = Date.now();
    const allBusinesses: DiscoveredBusiness[] = [];
    const errors: HuntingError[] = [];
    
    this.logger.info(`Hunter ${this.id} starting hunt`, {
      sources: this.config.sources.length,
      type: this.config.type
    });
    
    // Hunt from each source
    for (const source of this.config.sources) {
      try {
        // Check if source was recently crawled
        const cacheKey = `hunter:source:${this.generateSourceHash(source)}`;
        const lastCrawled = await this.redis.get(cacheKey);
        
        if (lastCrawled && Date.now() - parseInt(lastCrawled) < 3600000) {
          this.logger.debug(`Skipping recently crawled source: ${source}`);
          continue;
        }
        
        // Hunt with circuit breaker protection
        const businesses = await this.circuitBreaker.fire(source);
        
        // Deduplicate
        const uniqueBusinesses = await this.deduplicateBusinesses(businesses);
        allBusinesses.push(...uniqueBusinesses);
        
        // Update cache
        await this.redis.set(cacheKey, Date.now(), 'EX', 3600);
        
        // Update stats
        this.stats.discovered += businesses.length;
        this.stats.duplicates += businesses.length - uniqueBusinesses.length;
        
        // Emit progress
        this.emit('progress', {
          hunterId: this.id,
          source,
          discovered: uniqueBusinesses.length,
          total: allBusinesses.length
        });
        
      } catch (error) {
        this.logger.error(`Error hunting source ${source}:`, error);
        this.stats.errors++;
        errors.push({
          code: 'HUNT_ERROR',
          message: error.message,
          source,
          timestamp: new Date(),
          context: { hunterId: this.id }
        });
      }
    }
    
    this.stats.duration = Date.now() - startTime;
    this.stats.source = this.config.type;
    
    const result: HuntingResult = {
      taskId: `hunt-${this.id}-${Date.now()}`,
      hunterId: this.id,
      businesses: allBusinesses,
      stats: { ...this.stats },
      errors
    };
    
    this.logger.info(`Hunter ${this.id} completed hunt`, this.stats);
    this.emit('complete', result);
    
    return result;
  }
  
  /**
   * Create configured HTTP client
   */
  protected createHttpClient(): AxiosInstance {
    const client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': new UserAgent().toString(),
        'Accept': 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });
    
    // Add request interceptor for rate limiting
    client.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquire();
      
      // Use proxy if configured
      if (this.proxyRotator) {
        const proxy = await this.proxyRotator.getNext();
        config.proxy = proxy;
      }
      
      return config;
    });
    
    // Add response interceptor for retry logic
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.config && error.config.__retryCount < 3) {
          error.config.__retryCount = (error.config.__retryCount || 0) + 1;
          
          // Exponential backoff
          const delay = Math.pow(2, error.config.__retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return client(error.config);
        }
        return Promise.reject(error);
      }
    );
    
    return client;
  }
  
  /**
   * Deduplicate discovered businesses
   */
  protected async deduplicateBusinesses(
    businesses: DiscoveredBusiness[]
  ): Promise<DiscoveredBusiness[]> {
    const unique: DiscoveredBusiness[] = [];
    const seen = new Set<string>();
    
    for (const business of businesses) {
      const hash = this.generateBusinessHash(business);
      
      // Check local set
      if (seen.has(hash)) {
        continue;
      }
      
      // Check Redis for global deduplication
      const exists = await this.redis.exists(`business:${hash}`);
      if (!exists) {
        unique.push(business);
        seen.add(hash);
        
        // Store in Redis with TTL
        await this.redis.setex(`business:${hash}`, 86400, JSON.stringify({
          name: business.name,
          businessNumber: business.businessNumber,
          discoveredAt: business.discoveredAt
        }));
      }
    }
    
    return unique;
  }
  
  /**
   * Generate unique hash for a business
   */
  protected generateBusinessHash(business: DiscoveredBusiness): string {
    const parts = [
      business.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      business.businessNumber || '',
      business.address?.city || '',
      business.address?.province || ''
    ].filter(Boolean);
    
    return createHash('sha256').update(parts.join(':')).digest('hex');
  }
  
  /**
   * Generate hash for a source URL
   */
  protected generateSourceHash(source: string): string {
    return createHash('md5').update(source).digest('hex');
  }
  
  /**
   * Parse and normalize business data
   */
  protected normalizeBusinessData(raw: any, source: string): DiscoveredBusiness {
    // Base normalization - hunters should override for specific sources
    return {
      id: createHash('md5').update(`${raw.name}-${Date.now()}`).digest('hex'),
      name: this.cleanBusinessName(raw.name || raw.businessName || raw.company),
      legalName: raw.legalName,
      businessNumber: this.cleanBusinessNumber(raw.businessNumber || raw.bnNumber),
      description: raw.description,
      website: this.cleanUrl(raw.website || raw.url),
      email: this.cleanEmail(raw.email),
      phone: this.cleanPhone(raw.phone || raw.telephone),
      type: raw.type || 'unknown',
      industry: Array.isArray(raw.industry) ? raw.industry : [raw.industry].filter(Boolean),
      source: {
        type: this.config.type as any,
        name: source,
        reliability: 0.8
      },
      discoveredAt: new Date(),
      confidence: 0.5,
      rawData: raw
    };
  }
  
  /**
   * Clean business name
   */
  protected cleanBusinessName(name: string): string {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-&.,()]/g, '')
      .substring(0, 255);
  }
  
  /**
   * Clean business number
   */
  protected cleanBusinessNumber(bn: string): string | undefined {
    if (!bn) return undefined;
    const cleaned = bn.replace(/\D/g, '');
    return cleaned.length >= 9 ? cleaned : undefined;
  }
  
  /**
   * Clean URL
   */
  protected cleanUrl(url: string): string | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.href;
    } catch {
      return undefined;
    }
  }
  
  /**
   * Clean email
   */
  protected cleanEmail(email: string): string | undefined {
    if (!email) return undefined;
    const cleaned = email.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : undefined;
  }
  
  /**
   * Clean phone number
   */
  protected cleanPhone(phone: string): string | undefined {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned : undefined;
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      this.logger.error('Hunter error:', error);
    });
    
    this.on('progress', (progress) => {
      this.logger.debug('Hunter progress:', progress);
    });
    
    // Circuit breaker events
    this.circuitBreaker.on('open', () => {
      this.logger.warn(`Circuit breaker opened for hunter ${this.id}`);
    });
    
    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info(`Circuit breaker half-open for hunter ${this.id}`);
    });
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.circuitBreaker.shutdown();
    if (this.proxyRotator) {
      await this.proxyRotator.cleanup();
    }
  }
}