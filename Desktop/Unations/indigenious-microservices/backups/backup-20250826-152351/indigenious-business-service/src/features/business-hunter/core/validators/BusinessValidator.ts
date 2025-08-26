/**
 * Business Validator
 * Validates discovered businesses for legitimacy and data quality
 */

import { z } from 'zod';
import { Redis } from 'ioredis';
import validator from 'validator';
import { Logger } from 'winston';
import fetch from 'node-fetch';
import dns from 'dns/promises';
import { 
  DiscoveredBusiness, 
  BusinessType,
  ValidationResult 
} from '../../types';
import { createLogger } from '../../utils/logger';
import { canadianProvinces, businessNumberRegex } from '../../utils/constants';

export class BusinessValidator {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly validationCache: Map<string, boolean> = new Map();
  
  // Validation rules
  private readonly minNameLength = 3;
  private readonly maxNameLength = 255;
  private readonly suspiciousPatterns = [
    /test/i,
    /demo/i,
    /example/i,
    /sample/i,
    /^abc/i,
    /^123/i,
    /xxx/i,
    /delete/i,
    /temp/i
  ];
  
  constructor(redis: Redis) {
    this.redis = redis;
    this.logger = createLogger('validator:business');
  }
  
  /**
   * Validate a discovered business
   */
  async validate(business: DiscoveredBusiness): Promise<boolean> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(business);
      const cached = this.validationCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
      
      // Run validation checks
      const validations = await Promise.all([
        this.validateBasicInfo(business),
        this.validateBusinessNumber(business),
        this.validateContact(business),
        this.validateAddress(business),
        this.validateWebPresence(business),
        this.checkDuplicates(business),
        this.checkBlacklist(business)
      ]);
      
      const isValid = validations.every(v => v);
      
      // Cache result
      this.validationCache.set(cacheKey, isValid);
      
      // Store validation result
      await this.storeValidationResult(business, isValid, validations);
      
      this.logger.debug(`Validated business ${business.name}: ${isValid}`);
      
      return isValid;
      
    } catch (error) {
      this.logger.error('Validation error:', error);
      return false;
    }
  }
  
  /**
   * Validate basic business information
   */
  private async validateBasicInfo(business: DiscoveredBusiness): Promise<boolean> {
    // Check required fields
    if (!business.name || typeof business.name !== 'string') {
      return false;
    }
    
    // Check name length
    const name = business.name.trim();
    if (name.length < this.minNameLength || name.length > this.maxNameLength) {
      return false;
    }
    
    // Check for suspicious patterns
    if (this.suspiciousPatterns.some(pattern => pattern.test(name))) {
      this.logger.warn(`Suspicious business name detected: ${name}`);
      return false;
    }
    
    // Check for valid characters
    if (!/^[\w\s\-&.,()\']+$/.test(name)) {
      return false;
    }
    
    // Check business type
    if (!Object.values(BusinessType).includes(business.type)) {
      return false;
    }
    
    // Validate confidence score
    if (business.confidence < 0 || business.confidence > 1) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate business number if provided
   */
  private async validateBusinessNumber(business: DiscoveredBusiness): Promise<boolean> {
    if (!business.businessNumber) {
      return true; // Optional field
    }
    
    // Check format (9 digits + optional program identifier)
    if (!businessNumberRegex.test(business.businessNumber)) {
      return false;
    }
    
    // Validate with CRA checksum algorithm
    const digits = business.businessNumber.substring(0, 9);
    if (!this.validateBNChecksum(digits)) {
      return false;
    }
    
    // Check if already validated in our system
    const existingValidation = await this.redis.get(`bn:validated:${business.businessNumber}`);
    if (existingValidation === 'false') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate contact information
   */
  private async validateContact(business: DiscoveredBusiness): Promise<boolean> {
    let hasValidContact = false;
    
    // Validate email
    if (business.email) {
      if (!validator.isEmail(business.email)) {
        return false;
      }
      
      // Check for disposable email
      const domain = business.email.split('@')[1];
      const isDisposable = await this.isDisposableEmail(domain);
      if (isDisposable) {
        this.logger.warn(`Disposable email detected: ${business.email}`);
        return false;
      }
      
      hasValidContact = true;
    }
    
    // Validate phone
    if (business.phone) {
      const cleaned = business.phone.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        return false;
      }
      
      // Check if it's a valid North American number
      if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) {
        hasValidContact = true;
      }
    }
    
    // Validate website
    if (business.website) {
      try {
        const url = new URL(business.website);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return false;
        }
        hasValidContact = true;
      } catch {
        return false;
      }
    }
    
    // At least one valid contact method required for high confidence
    if (business.confidence > 0.7 && !hasValidContact) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate address information
   */
  private async validateAddress(business: DiscoveredBusiness): Promise<boolean> {
    if (!business.address) {
      return true; // Optional
    }
    
    const { address } = business;
    
    // Must be in Canada
    if (address.country && address.country !== 'Canada') {
      return false;
    }
    
    // Validate province
    if (address.province) {
      if (!canadianProvinces.includes(address.province)) {
        return false;
      }
    }
    
    // Validate postal code format
    if (address.postalCode) {
      const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      if (!postalCodeRegex.test(address.postalCode)) {
        return false;
      }
    }
    
    // Validate coordinates if provided
    if (address.coordinates) {
      const { lat, lng } = address.coordinates;
      // Canada's approximate bounds
      if (lat < 41.6 || lat > 83.1 || lng < -141.0 || lng > -52.6) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate web presence
   */
  private async validateWebPresence(business: DiscoveredBusiness): Promise<boolean> {
    if (!business.website) {
      return true; // Optional
    }
    
    try {
      const url = new URL(business.website);
      
      // Check DNS resolution
      const hostname = url.hostname;
      try {
        await dns.resolve4(hostname);
      } catch {
        // Try IPv6
        try {
          await dns.resolve6(hostname);
        } catch {
          this.logger.warn(`DNS resolution failed for ${hostname}`);
          return false;
        }
      }
      
      // Check if website is accessible (with timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(business.website, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Indigenous-Business-Hunter/1.0'
          }
        });
        
        clearTimeout(timeout);
        
        // Accept any 2xx or 3xx status
        if (response.status >= 200 && response.status < 400) {
          return true;
        }
        
        // 403/401 might mean the site exists but requires auth
        if (response.status === 403 || response.status === 401) {
          return true;
        }
        
        return false;
        
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          // Timeout - might still be valid
          return true;
        }
        return false;
      }
      
    } catch {
      return false;
    }
  }
  
  /**
   * Check for duplicate businesses
   */
  private async checkDuplicates(business: DiscoveredBusiness): Promise<boolean> {
    // Check by business number
    if (business.businessNumber) {
      const exists = await this.redis.exists(`business:bn:${business.businessNumber}`);
      if (exists) {
        this.logger.debug(`Duplicate business number: ${business.businessNumber}`);
        return false;
      }
    }
    
    // Check by normalized name and location
    const nameKey = this.normalizeBusinessName(business.name);
    const locationKey = business.address ? 
      `${business.address.city}:${business.address.province}`.toLowerCase() : 
      'unknown';
    
    const duplicateKey = `business:dup:${nameKey}:${locationKey}`;
    const exists = await this.redis.exists(duplicateKey);
    
    if (exists) {
      this.logger.debug(`Duplicate business name/location: ${business.name}`);
      return false;
    }
    
    // Mark as seen
    await this.redis.setex(duplicateKey, 86400 * 7, '1'); // 7 days
    
    return true;
  }
  
  /**
   * Check against blacklist
   */
  private async checkBlacklist(business: DiscoveredBusiness): Promise<boolean> {
    // Check business name blacklist
    const nameBlacklisted = await this.redis.sismember('blacklist:business:names', business.name);
    if (nameBlacklisted) {
      this.logger.warn(`Blacklisted business name: ${business.name}`);
      return false;
    }
    
    // Check domain blacklist
    if (business.website) {
      try {
        const domain = new URL(business.website).hostname;
        const domainBlacklisted = await this.redis.sismember('blacklist:domains', domain);
        if (domainBlacklisted) {
          this.logger.warn(`Blacklisted domain: ${domain}`);
          return false;
        }
      } catch {
        // Invalid URL
      }
    }
    
    // Check email domain blacklist
    if (business.email) {
      const emailDomain = business.email.split('@')[1];
      const emailBlacklisted = await this.redis.sismember('blacklist:email:domains', emailDomain);
      if (emailBlacklisted) {
        this.logger.warn(`Blacklisted email domain: ${emailDomain}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate business number checksum
   */
  private validateBNChecksum(bn: string): boolean {
    if (bn.length !== 9) return false;
    
    // CRA checksum algorithm
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(bn[i]) * weights[i];
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
      sum += digit;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Check if email domain is disposable
   */
  private async isDisposableEmail(domain: string): Promise<boolean> {
    // Check cache
    const cached = await this.redis.get(`email:disposable:${domain}`);
    if (cached !== null) {
      return cached === '1';
    }
    
    // Common disposable email domains
    const disposableDomains = [
      'tempmail.com', 'throwaway.email', '10minutemail.com',
      'guerrillamail.com', 'mailinator.com', 'temp-mail.org'
    ];
    
    const isDisposable = disposableDomains.includes(domain);
    
    // Cache result
    await this.redis.setex(`email:disposable:${domain}`, 86400, isDisposable ? '1' : '0');
    
    return isDisposable;
  }
  
  /**
   * Normalize business name for comparison
   */
  private normalizeBusinessName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 50);
  }
  
  /**
   * Get cache key for business
   */
  private getCacheKey(business: DiscoveredBusiness): string {
    return `${business.name}:${business.businessNumber || 'unknown'}`;
  }
  
  /**
   * Store validation result
   */
  private async storeValidationResult(
    business: DiscoveredBusiness, 
    isValid: boolean,
    validations: boolean[]
  ): Promise<void> {
    const result = {
      businessId: business.id,
      businessName: business.name,
      isValid,
      validations: {
        basicInfo: validations[0],
        businessNumber: validations[1],
        contact: validations[2],
        address: validations[3],
        webPresence: validations[4],
        duplicates: validations[5],
        blacklist: validations[6]
      },
      timestamp: new Date(),
      source: business.source
    };
    
    await this.redis.hset(
      'validation:results',
      business.id,
      JSON.stringify(result)
    );
    
    // Update stats
    await this.redis.hincrby('validation:stats', isValid ? 'valid' : 'invalid', 1);
  }
}