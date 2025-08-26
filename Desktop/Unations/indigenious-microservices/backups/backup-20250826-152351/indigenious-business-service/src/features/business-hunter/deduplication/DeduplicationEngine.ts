/**
 * Intelligent Deduplication System
 * Identifies and merges duplicate businesses using fuzzy matching and ML
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import * as levenshtein from 'fast-levenshtein';
import { metaphone, soundex } from 'natural';
import { createLogger } from '../core/utils/logger';
import {
  DiscoveredBusiness,
  EnrichedBusiness,
  BusinessAddress
} from '../types';
import {
  DuplicateCandidate,
  MatchingField,
  MergeAction,
  MergeStrategy,
  FieldMergeRule
} from '../types/enhanced-types';

export interface DeduplicationOptions {
  similarityThreshold: number; // 0-1
  autoMergeThreshold: number; // 0-1
  enablePhoneticMatching: boolean;
  enableAddressMatching: boolean;
  enableMLScoring: boolean;
  batchSize: number;
}

export interface MatchingWeights {
  name: number;
  businessNumber: number;
  phone: number;
  email: number;
  website: number;
  address: number;
  industry: number;
}

export class DeduplicationEngine extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly options: DeduplicationOptions;
  private readonly weights: MatchingWeights;
  private processedPairs: Set<string>;

  constructor(redis: Redis, options?: Partial<DeduplicationOptions>) {
    super();
    this.logger = createLogger('deduplication-engine');
    this.redis = redis;
    this.processedPairs = new Set();

    // Default options
    this.options = {
      similarityThreshold: 0.7,
      autoMergeThreshold: 0.9,
      enablePhoneticMatching: true,
      enableAddressMatching: true,
      enableMLScoring: true,
      batchSize: 100,
      ...options
    };

    // Default weights for different fields
    this.weights = {
      name: 0.25,
      businessNumber: 0.3,
      phone: 0.15,
      email: 0.1,
      website: 0.1,
      address: 0.05,
      industry: 0.05
    };
  }

  /**
   * Find duplicates in a batch of businesses
   */
  async findDuplicates(
    businesses: (DiscoveredBusiness | EnrichedBusiness)[]
  ): Promise<DuplicateCandidate[]> {
    const startTime = Date.now();
    const duplicates: DuplicateCandidate[] = [];

    this.logger.info(`Starting duplicate detection for ${businesses.length} businesses`);

    // Build indices for efficient matching
    const indices = this.buildSearchIndices(businesses);

    // Process in batches
    for (let i = 0; i < businesses.length; i += this.options.batchSize) {
      const batch = businesses.slice(i, i + this.options.batchSize);
      
      for (const business of batch) {
        const candidates = await this.findCandidatesForBusiness(business, businesses, indices);
        
        for (const candidate of candidates) {
          const pairKey = this.getPairKey(business.id, candidate.id);
          
          // Skip if already processed
          if (this.processedPairs.has(pairKey)) {
            continue;
          }
          
          // Calculate similarity
          const similarity = await this.calculateSimilarity(business, candidate);
          
          if (similarity.score >= this.options.similarityThreshold) {
            const duplicate: DuplicateCandidate = {
              business1: business.id,
              business2: candidate.id,
              similarityScore: similarity.score,
              matchingFields: similarity.fields,
              confidence: similarity.confidence,
              suggestedAction: this.determineMergeAction(similarity.score, similarity.fields)
            };
            
            duplicates.push(duplicate);
            this.processedPairs.add(pairKey);
            
            this.emit('duplicate:found', duplicate);
          }
        }
      }
      
      // Progress update
      this.emit('progress', {
        processed: Math.min(i + this.options.batchSize, businesses.length),
        total: businesses.length,
        duplicatesFound: duplicates.length
      });
    }

    this.logger.info(`Duplicate detection completed`, {
      processed: businesses.length,
      duplicatesFound: duplicates.length,
      duration: Date.now() - startTime
    });

    return duplicates;
  }

  /**
   * Merge duplicate businesses
   */
  async mergeDuplicates(
    duplicate: DuplicateCandidate,
    business1: DiscoveredBusiness | EnrichedBusiness,
    business2: DiscoveredBusiness | EnrichedBusiness,
    strategy?: Partial<MergeStrategy>
  ): Promise<EnrichedBusiness> {
    this.logger.info(`Merging businesses: ${business1.name} and ${business2.name}`);

    // Determine which is primary
    const [primary, secondary] = this.determinePrimaryRecord(business1, business2);

    // Create merge strategy
    const mergeStrategy: MergeStrategy = {
      primaryRecord: primary.id,
      fieldsToMerge: this.generateMergeRules(primary, secondary, duplicate.matchingFields),
      preserveHistory: true,
      notifyAffectedSystems: true,
      ...strategy
    };

    // Perform merge
    const merged = await this.performMerge(primary, secondary, mergeStrategy);

    // Record merge history
    await this.recordMergeHistory(primary.id, secondary.id, mergeStrategy, merged);

    // Notify systems
    if (mergeStrategy.notifyAffectedSystems) {
      this.emit('merge:completed', {
        primaryId: primary.id,
        secondaryId: secondary.id,
        mergedId: merged.id,
        affectedFields: mergeStrategy.fieldsToMerge.map(f => f.field)
      });
    }

    return merged;
  }

  /**
   * Build search indices for efficient matching
   */
  private buildSearchIndices(businesses: any[]): SearchIndices {
    const indices: SearchIndices = {
      byName: new Map(),
      byPhone: new Map(),
      byEmail: new Map(),
      byWebsite: new Map(),
      byBusinessNumber: new Map(),
      byPhonetic: new Map(),
      byLocation: new Map()
    };

    for (const business of businesses) {
      // Name index
      const normalizedName = this.normalizeString(business.name);
      if (!indices.byName.has(normalizedName)) {
        indices.byName.set(normalizedName, []);
      }
      indices.byName.get(normalizedName)!.push(business);

      // Phonetic index
      if (this.options.enablePhoneticMatching) {
        const phoneticKey = this.getPhoneticKey(business.name);
        if (!indices.byPhonetic.has(phoneticKey)) {
          indices.byPhonetic.set(phoneticKey, []);
        }
        indices.byPhonetic.get(phoneticKey)!.push(business);
      }

      // Phone index
      if (business.phone) {
        const normalizedPhone = this.normalizePhone(business.phone);
        if (!indices.byPhone.has(normalizedPhone)) {
          indices.byPhone.set(normalizedPhone, []);
        }
        indices.byPhone.get(normalizedPhone)!.push(business);
      }

      // Email index
      if (business.email) {
        const domain = this.extractEmailDomain(business.email);
        if (!indices.byEmail.has(domain)) {
          indices.byEmail.set(domain, []);
        }
        indices.byEmail.get(domain)!.push(business);
      }

      // Website index
      if (business.website) {
        const domain = this.extractDomain(business.website);
        if (!indices.byWebsite.has(domain)) {
          indices.byWebsite.set(domain, []);
        }
        indices.byWebsite.get(domain)!.push(business);
      }

      // Business number index
      if (business.businessNumber) {
        indices.byBusinessNumber.set(business.businessNumber, business);
      }

      // Location index
      if (business.address?.postalCode) {
        const postalPrefix = business.address.postalCode.substring(0, 3);
        if (!indices.byLocation.has(postalPrefix)) {
          indices.byLocation.set(postalPrefix, []);
        }
        indices.byLocation.get(postalPrefix)!.push(business);
      }
    }

    return indices;
  }

  /**
   * Find potential duplicate candidates for a business
   */
  private async findCandidatesForBusiness(
    business: any,
    allBusinesses: any[],
    indices: SearchIndices
  ): Promise<any[]> {
    const candidates = new Set<any>();

    // Skip self
    const otherBusinesses = allBusinesses.filter(b => b.id !== business.id);

    // Exact business number match
    if (business.businessNumber && indices.byBusinessNumber.has(business.businessNumber)) {
      const match = indices.byBusinessNumber.get(business.businessNumber);
      if (match && match.id !== business.id) {
        candidates.add(match);
      }
    }

    // Name-based candidates
    const nameCandidates = this.findNameCandidates(business, indices);
    nameCandidates.forEach(c => candidates.add(c));

    // Phone-based candidates
    if (business.phone) {
      const normalizedPhone = this.normalizePhone(business.phone);
      const phoneCandidates = indices.byPhone.get(normalizedPhone) || [];
      phoneCandidates.forEach(c => {
        if (c.id !== business.id) candidates.add(c);
      });
    }

    // Email domain candidates
    if (business.email) {
      const domain = this.extractEmailDomain(business.email);
      const emailCandidates = indices.byEmail.get(domain) || [];
      emailCandidates.forEach(c => {
        if (c.id !== business.id) candidates.add(c);
      });
    }

    // Website domain candidates
    if (business.website) {
      const domain = this.extractDomain(business.website);
      const websiteCandidates = indices.byWebsite.get(domain) || [];
      websiteCandidates.forEach(c => {
        if (c.id !== business.id) candidates.add(c);
      });
    }

    // Location-based candidates
    if (business.address?.postalCode) {
      const postalPrefix = business.address.postalCode.substring(0, 3);
      const locationCandidates = indices.byLocation.get(postalPrefix) || [];
      locationCandidates.forEach(c => {
        if (c.id !== business.id) candidates.add(c);
      });
    }

    return Array.from(candidates);
  }

  /**
   * Find candidates based on name similarity
   */
  private findNameCandidates(business: any, indices: SearchIndices): any[] {
    const candidates: any[] = [];
    const normalizedName = this.normalizeString(business.name);

    // Exact normalized match
    const exactMatches = indices.byName.get(normalizedName) || [];
    candidates.push(...exactMatches.filter(b => b.id !== business.id));

    // Phonetic match
    if (this.options.enablePhoneticMatching) {
      const phoneticKey = this.getPhoneticKey(business.name);
      const phoneticMatches = indices.byPhonetic.get(phoneticKey) || [];
      candidates.push(...phoneticMatches.filter(b => b.id !== business.id));
    }

    // Fuzzy match on similar names
    for (const [name, businesses] of indices.byName) {
      const similarity = this.calculateStringSimilarity(normalizedName, name);
      if (similarity > 0.8 && name !== normalizedName) {
        candidates.push(...businesses.filter(b => b.id !== business.id));
      }
    }

    return candidates;
  }

  /**
   * Calculate similarity between two businesses
   */
  private async calculateSimilarity(
    business1: any,
    business2: any
  ): Promise<{ score: number; fields: MatchingField[]; confidence: number }> {
    const fields: MatchingField[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Business number (exact match)
    if (business1.businessNumber && business2.businessNumber) {
      const match = business1.businessNumber === business2.businessNumber;
      fields.push({
        field: 'businessNumber',
        value1: business1.businessNumber,
        value2: business2.businessNumber,
        similarity: match ? 1 : 0,
        matchType: match ? 'exact' : 'partial'
      });
      totalScore += (match ? 1 : 0) * this.weights.businessNumber;
      totalWeight += this.weights.businessNumber;
    }

    // Name similarity
    const nameSimilarity = this.calculateNameSimilarity(business1.name, business2.name);
    fields.push({
      field: 'name',
      value1: business1.name,
      value2: business2.name,
      similarity: nameSimilarity,
      matchType: nameSimilarity === 1 ? 'exact' : nameSimilarity > 0.8 ? 'fuzzy' : 'partial'
    });
    totalScore += nameSimilarity * this.weights.name;
    totalWeight += this.weights.name;

    // Phone similarity
    if (business1.phone && business2.phone) {
      const phoneSimilarity = this.calculatePhoneSimilarity(business1.phone, business2.phone);
      fields.push({
        field: 'phone',
        value1: business1.phone,
        value2: business2.phone,
        similarity: phoneSimilarity,
        matchType: phoneSimilarity === 1 ? 'exact' : 'partial'
      });
      totalScore += phoneSimilarity * this.weights.phone;
      totalWeight += this.weights.phone;
    }

    // Email similarity
    if (business1.email && business2.email) {
      const emailSimilarity = this.calculateEmailSimilarity(business1.email, business2.email);
      fields.push({
        field: 'email',
        value1: business1.email,
        value2: business2.email,
        similarity: emailSimilarity,
        matchType: emailSimilarity === 1 ? 'exact' : 'partial'
      });
      totalScore += emailSimilarity * this.weights.email;
      totalWeight += this.weights.email;
    }

    // Website similarity
    if (business1.website && business2.website) {
      const websiteSimilarity = this.calculateWebsiteSimilarity(business1.website, business2.website);
      fields.push({
        field: 'website',
        value1: business1.website,
        value2: business2.website,
        similarity: websiteSimilarity,
        matchType: websiteSimilarity === 1 ? 'exact' : 'partial'
      });
      totalScore += websiteSimilarity * this.weights.website;
      totalWeight += this.weights.website;
    }

    // Address similarity
    if (business1.address && business2.address) {
      const addressSimilarity = this.calculateAddressSimilarity(business1.address, business2.address);
      fields.push({
        field: 'address',
        value1: this.formatAddress(business1.address),
        value2: this.formatAddress(business2.address),
        similarity: addressSimilarity,
        matchType: addressSimilarity === 1 ? 'exact' : addressSimilarity > 0.8 ? 'fuzzy' : 'partial'
      });
      totalScore += addressSimilarity * this.weights.address;
      totalWeight += this.weights.address;
    }

    // Industry similarity
    if (business1.industry && business2.industry) {
      const industrySimilarity = this.calculateIndustrySimilarity(business1.industry, business2.industry);
      fields.push({
        field: 'industry',
        value1: business1.industry,
        value2: business2.industry,
        similarity: industrySimilarity,
        matchType: industrySimilarity === 1 ? 'exact' : 'partial'
      });
      totalScore += industrySimilarity * this.weights.industry;
      totalWeight += this.weights.industry;
    }

    // Calculate final score
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // ML-based confidence adjustment
    let confidence = finalScore;
    if (this.options.enableMLScoring) {
      confidence = await this.adjustConfidenceWithML(business1, business2, fields, finalScore);
    }

    return {
      score: finalScore,
      fields,
      confidence
    };
  }

  /**
   * Calculate name similarity with multiple algorithms
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeString(name1);
    const normalized2 = this.normalizeString(name2);

    // Exact match
    if (normalized1 === normalized2) return 1;

    // Calculate different similarity metrics
    const scores: number[] = [];

    // Levenshtein distance
    const levenshteinSim = 1 - (levenshtein.get(normalized1, normalized2) / Math.max(normalized1.length, normalized2.length));
    scores.push(levenshteinSim);

    // Token-based similarity
    const tokens1 = normalized1.split(' ');
    const tokens2 = normalized2.split(' ');
    const tokenSim = this.calculateTokenSimilarity(tokens1, tokens2);
    scores.push(tokenSim);

    // Phonetic similarity
    if (this.options.enablePhoneticMatching) {
      const phonetic1 = this.getPhoneticKey(name1);
      const phonetic2 = this.getPhoneticKey(name2);
      const phoneticSim = phonetic1 === phonetic2 ? 1 : 0.5;
      scores.push(phoneticSim);
    }

    // Abbreviation check
    if (this.isAbbreviation(normalized1, normalized2) || this.isAbbreviation(normalized2, normalized1)) {
      scores.push(0.9);
    }

    // Return weighted average
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calculate phone similarity
   */
  private calculatePhoneSimilarity(phone1: string, phone2: string): number {
    const normalized1 = this.normalizePhone(phone1);
    const normalized2 = this.normalizePhone(phone2);

    if (normalized1 === normalized2) return 1;

    // Check if one contains the other (extension)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return 0.9;
    }

    // Check last 7 digits
    if (normalized1.length >= 7 && normalized2.length >= 7) {
      const last7_1 = normalized1.slice(-7);
      const last7_2 = normalized2.slice(-7);
      if (last7_1 === last7_2) return 0.8;
    }

    return 0;
  }

  /**
   * Calculate email similarity
   */
  private calculateEmailSimilarity(email1: string, email2: string): number {
    const lower1 = email1.toLowerCase();
    const lower2 = email2.toLowerCase();

    if (lower1 === lower2) return 1;

    const [local1, domain1] = lower1.split('@');
    const [local2, domain2] = lower2.split('@');

    // Same domain
    if (domain1 === domain2) {
      // Check if local parts are similar
      const localSim = this.calculateStringSimilarity(local1, local2);
      return 0.5 + (localSim * 0.5);
    }

    return 0;
  }

  /**
   * Calculate website similarity
   */
  private calculateWebsiteSimilarity(website1: string, website2: string): number {
    const domain1 = this.extractDomain(website1);
    const domain2 = this.extractDomain(website2);

    if (domain1 === domain2) return 1;

    // Check if one is subdomain of other
    if (domain1.includes(domain2) || domain2.includes(domain1)) {
      return 0.9;
    }

    // Check similarity without TLD
    const base1 = domain1.split('.')[0];
    const base2 = domain2.split('.')[0];
    const baseSim = this.calculateStringSimilarity(base1, base2);

    return baseSim * 0.8;
  }

  /**
   * Calculate address similarity
   */
  private calculateAddressSimilarity(addr1: BusinessAddress, addr2: BusinessAddress): number {
    let score = 0;
    let factors = 0;

    // Postal code
    if (addr1.postalCode && addr2.postalCode) {
      const postal1 = addr1.postalCode.replace(/\s/g, '').toUpperCase();
      const postal2 = addr2.postalCode.replace(/\s/g, '').toUpperCase();
      
      if (postal1 === postal2) {
        score += 1;
      } else if (postal1.substring(0, 3) === postal2.substring(0, 3)) {
        score += 0.5;
      }
      factors += 1;
    }

    // City
    if (addr1.city && addr2.city) {
      const citySim = this.calculateStringSimilarity(
        this.normalizeString(addr1.city),
        this.normalizeString(addr2.city)
      );
      score += citySim;
      factors += 1;
    }

    // Province
    if (addr1.province && addr2.province) {
      score += addr1.province === addr2.province ? 1 : 0;
      factors += 1;
    }

    // Street
    if (addr1.street && addr2.street) {
      const streetSim = this.calculateStringSimilarity(
        this.normalizeString(addr1.street),
        this.normalizeString(addr2.street)
      );
      score += streetSim;
      factors += 1;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate industry similarity
   */
  private calculateIndustrySimilarity(industries1: string[], industries2: string[]): number {
    if (!industries1.length || !industries2.length) return 0;

    const set1 = new Set(industries1.map(i => this.normalizeString(i)));
    const set2 = new Set(industries2.map(i => this.normalizeString(i)));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Determine merge action based on similarity
   */
  private determineMergeAction(score: number, fields: MatchingField[]): MergeAction {
    // Auto-merge for very high confidence
    if (score >= this.options.autoMergeThreshold) {
      return MergeAction.MERGE;
    }

    // Check for conflicting critical fields
    const criticalFields = ['businessNumber', 'phone', 'email'];
    const hasConflicts = fields.some(f => 
      criticalFields.includes(f.field) && 
      f.similarity < 1 && 
      f.value1 && f.value2
    );

    if (hasConflicts) {
      return MergeAction.MANUAL_REVIEW;
    }

    // Mark as duplicate for moderate confidence
    if (score >= this.options.similarityThreshold) {
      return MergeAction.MARK_DUPLICATE;
    }

    return MergeAction.KEEP_BOTH;
  }

  /**
   * Determine primary record for merge
   */
  private determinePrimaryRecord(
    business1: any,
    business2: any
  ): [any, any] {
    let score1 = 0;
    let score2 = 0;

    // Prefer verified businesses
    if (business1.verified) score1 += 10;
    if (business2.verified) score2 += 10;

    // Prefer enriched businesses
    if ('enrichedAt' in business1) score1 += 5;
    if ('enrichedAt' in business2) score2 += 5;

    // Prefer more complete records
    score1 += this.calculateCompleteness(business1);
    score2 += this.calculateCompleteness(business2);

    // Prefer newer records if scores are close
    if (Math.abs(score1 - score2) < 2) {
      const date1 = new Date(business1.discoveredAt || 0).getTime();
      const date2 = new Date(business2.discoveredAt || 0).getTime();
      return date1 > date2 ? [business1, business2] : [business2, business1];
    }

    return score1 >= score2 ? [business1, business2] : [business2, business1];
  }

  /**
   * Calculate record completeness score
   */
  private calculateCompleteness(business: any): number {
    let score = 0;
    
    if (business.name) score += 1;
    if (business.businessNumber) score += 2;
    if (business.phone) score += 1;
    if (business.email) score += 1;
    if (business.website) score += 1;
    if (business.address?.street) score += 1;
    if (business.description) score += 1;
    if (business.contacts?.length > 0) score += 2;
    if (business.certifications?.length > 0) score += 2;
    
    return score;
  }

  /**
   * Generate merge rules based on field comparison
   */
  private generateMergeRules(
    primary: any,
    secondary: any,
    matchingFields: MatchingField[]
  ): FieldMergeRule[] {
    const rules: FieldMergeRule[] = [];
    const allFields = new Set([
      ...Object.keys(primary),
      ...Object.keys(secondary)
    ]);

    for (const field of allFields) {
      // Skip system fields
      if (['id', 'createdAt', 'updatedAt'].includes(field)) continue;

      const matching = matchingFields.find(mf => mf.field === field);
      
      rules.push({
        field,
        source: this.determineFieldSource(primary[field], secondary[field], matching),
        conflictResolution: matching?.similarity === 1 ? 'primary_wins' : 'manual'
      });
    }

    return rules;
  }

  /**
   * Determine which source to use for a field
   */
  private determineFieldSource(
    primaryValue: any,
    secondaryValue: any,
    matching?: MatchingField
  ): 'primary' | 'secondary' | 'newest' | 'highest_quality' {
    // If values are identical, use primary
    if (JSON.stringify(primaryValue) === JSON.stringify(secondaryValue)) {
      return 'primary';
    }

    // If only one has value, use that
    if (primaryValue && !secondaryValue) return 'primary';
    if (!primaryValue && secondaryValue) return 'secondary';

    // For arrays, use the longer one
    if (Array.isArray(primaryValue) && Array.isArray(secondaryValue)) {
      return primaryValue.length >= secondaryValue.length ? 'primary' : 'secondary';
    }

    // For high similarity matches, prefer primary
    if (matching && matching.similarity > 0.9) {
      return 'primary';
    }

    // Default to quality-based selection
    return 'highest_quality';
  }

  /**
   * Perform the actual merge
   */
  private async performMerge(
    primary: any,
    secondary: any,
    strategy: MergeStrategy
  ): Promise<EnrichedBusiness> {
    const merged: any = { ...primary };

    for (const rule of strategy.fieldsToMerge) {
      let value;

      switch (rule.source) {
        case 'primary':
          value = primary[rule.field];
          break;
        
        case 'secondary':
          value = secondary[rule.field];
          break;
        
        case 'newest':
          // Compare timestamps if available
          value = primary[rule.field]; // Default to primary
          break;
        
        case 'highest_quality':
          value = this.selectHighestQuality(
            primary[rule.field],
            secondary[rule.field],
            rule.field
          );
          break;
      }

      // Handle conflicts
      if (rule.conflictResolution === 'combine' && Array.isArray(value)) {
        const combined = new Set([
          ...(primary[rule.field] || []),
          ...(secondary[rule.field] || [])
        ]);
        value = Array.from(combined);
      }

      merged[rule.field] = value;
    }

    // Add merge metadata
    merged.mergedFrom = [primary.id, secondary.id];
    merged.mergedAt = new Date();
    merged.mergeStrategy = strategy;

    return merged as EnrichedBusiness;
  }

  /**
   * Select highest quality value
   */
  private selectHighestQuality(value1: any, value2: any, field: string): any {
    // For strings, prefer longer non-empty values
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      if (!value1) return value2;
      if (!value2) return value1;
      return value1.length >= value2.length ? value1 : value2;
    }

    // For objects, prefer more complete ones
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      const keys1 = Object.keys(value1 || {}).length;
      const keys2 = Object.keys(value2 || {}).length;
      return keys1 >= keys2 ? value1 : value2;
    }

    // Default to first value
    return value1 || value2;
  }

  /**
   * Record merge history
   */
  private async recordMergeHistory(
    primaryId: string,
    secondaryId: string,
    strategy: MergeStrategy,
    result: EnrichedBusiness
  ): Promise<void> {
    const history = {
      primaryId,
      secondaryId,
      resultId: result.id,
      strategy,
      mergedAt: new Date(),
      mergedFields: strategy.fieldsToMerge.map(f => f.field)
    };

    // Store in Redis
    const key = `merge:history:${primaryId}:${secondaryId}`;
    await this.redis.setex(key, 86400 * 90, JSON.stringify(history)); // 90 days

    // Mark secondary as merged
    await this.redis.setex(`business:merged:${secondaryId}`, 86400 * 365, primaryId);
  }

  /**
   * ML-based confidence adjustment
   */
  private async adjustConfidenceWithML(
    business1: any,
    business2: any,
    fields: MatchingField[],
    baseScore: number
  ): Promise<number> {
    // This would use a trained ML model to adjust confidence
    // For now, use heuristics

    let confidence = baseScore;

    // Boost confidence for exact matches on critical fields
    const exactBusinessNumber = fields.find(f => f.field === 'businessNumber' && f.similarity === 1);
    if (exactBusinessNumber) confidence = Math.min(confidence * 1.3, 1);

    // Reduce confidence for missing critical fields
    const hasPhone = fields.find(f => f.field === 'phone');
    const hasEmail = fields.find(f => f.field === 'email');
    if (!hasPhone && !hasEmail) confidence *= 0.8;

    // Boost for multiple strong matches
    const strongMatches = fields.filter(f => f.similarity >= 0.9).length;
    if (strongMatches >= 3) confidence = Math.min(confidence * 1.1, 1);

    return confidence;
  }

  /**
   * Utility methods
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, ''); // Keep only digits
  }

  private extractEmailDomain(email: string): string {
    return email.toLowerCase().split('@')[1] || '';
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private getPhoneticKey(name: string): string {
    const normalized = this.normalizeString(name);
    const tokens = normalized.split(' ');
    const primaryToken = tokens[0] || '';
    
    // Use both metaphone and soundex for better matching
    const metaphoneKey = metaphone(primaryToken);
    const soundexKey = soundex(primaryToken);
    
    return `${metaphoneKey}:${soundexKey}`;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshtein.get(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private isAbbreviation(short: string, long: string): boolean {
    const longTokens = long.split(' ');
    const shortChars = short.replace(/\s/g, '').split('');
    
    // Check if short is initials of long
    const initials = longTokens.map(t => t[0]).join('');
    if (initials === short) return true;
    
    // Check if short contains first letters of each word
    if (shortChars.length === longTokens.length) {
      return shortChars.every((char, i) => longTokens[i].startsWith(char));
    }
    
    return false;
  }

  private formatAddress(addr: BusinessAddress): string {
    const parts = [
      addr.street,
      addr.city,
      addr.province,
      addr.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private getPairKey(id1: string, id2: string): string {
    return [id1, id2].sort().join(':');
  }

  /**
   * Get deduplication statistics
   */
  async getStatistics(): Promise<DeduplicationStats> {
    const stats = {
      totalProcessed: this.processedPairs.size,
      duplicatesFound: await this.redis.get('dedup:stats:duplicates') || '0',
      mergesCompleted: await this.redis.get('dedup:stats:merges') || '0',
      manualReviewPending: await this.redis.get('dedup:stats:pending') || '0'
    };

    return {
      totalProcessed: stats.totalProcessed,
      duplicatesFound: parseInt(stats.duplicatesFound),
      mergesCompleted: parseInt(stats.mergesCompleted),
      manualReviewPending: parseInt(stats.manualReviewPending)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.processedPairs.clear();
  }
}

interface SearchIndices {
  byName: Map<string, any[]>;
  byPhone: Map<string, any[]>;
  byEmail: Map<string, any[]>;
  byWebsite: Map<string, any[]>;
  byBusinessNumber: Map<string, any>;
  byPhonetic: Map<string, any[]>;
  byLocation: Map<string, any[]>;
}

interface DeduplicationStats {
  totalProcessed: number;
  duplicatesFound: number;
  mergesCompleted: number;
  manualReviewPending: number;
}