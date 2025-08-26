/**
 * Data Quality Analyzer
 * Analyzes and scores data quality with detailed recommendations
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { createLogger } from '../core/utils/logger';
import {
  DiscoveredBusiness,
  EnrichedBusiness,
  Contact,
  Certification,
  FinancialInfo
} from '../types';
import {
  DataQualityScore,
  DataQualityRecommendation
} from '../types/enhanced-types';

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  validity: number;
}

export interface FieldQualityAssessment {
  field: string;
  quality: number;
  issues: string[];
  recommendations: string[];
}

export class DataQualityAnalyzer extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  
  // Field importance weights
  private readonly fieldWeights: Record<string, number> = {
    // Critical fields (weight 3)
    businessNumber: 3,
    name: 3,
    
    // Important fields (weight 2)
    phone: 2,
    email: 2,
    address: 2,
    industry: 2,
    
    // Valuable fields (weight 1)
    website: 1,
    description: 1,
    legalName: 1,
    contacts: 1,
    certifications: 1,
    financialInfo: 1,
    procurementReadiness: 1,
    indigenousDetails: 1
  };

  // Data quality rules
  private readonly qualityRules = {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      checkDomain: true,
      checkDeliverability: true
    },
    phone: {
      minLength: 10,
      maxLength: 15,
      pattern: /^[\d\s\-\+\(\)]+$/
    },
    website: {
      pattern: /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/.*)?$/,
      checkAccessibility: true
    },
    businessNumber: {
      pattern: /^\d{9}(\d{6})?$/, // 9 digits or 15 digits (with program identifier)
      checkValidity: true
    },
    postalCode: {
      pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
    }
  };

  constructor(redis: Redis) {
    super();
    this.logger = createLogger('data-quality-analyzer');
    this.redis = redis;
  }

  /**
   * Perform comprehensive data quality analysis
   */
  async analyzeDataQuality(
    business: DiscoveredBusiness | EnrichedBusiness
  ): Promise<DataQualityScore> {
    const startTime = Date.now();
    
    this.logger.debug(`Analyzing data quality for ${business.name}`);

    // Calculate quality metrics
    const metrics = await this.calculateQualityMetrics(business);
    
    // Perform field-level assessments
    const fieldAssessments = await this.assessFieldQuality(business);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(fieldAssessments, metrics);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics);
    
    // Identify missing fields
    const missingFields = this.identifyMissingFields(business);

    const qualityScore: DataQualityScore = {
      businessId: business.id,
      overallScore: Math.round(overallScore),
      completeness: Math.round(metrics.completeness),
      accuracy: Math.round(metrics.accuracy),
      freshness: Math.round(metrics.timeliness),
      sourceReliability: Math.round(this.assessSourceReliability(business)),
      verificationLevel: Math.round(this.assessVerificationLevel(business)),
      missingFields,
      recommendations,
      lastAssessed: new Date()
    };

    // Cache the assessment
    await this.cacheAssessment(business.id, qualityScore);

    this.logger.info(`Data quality analysis completed for ${business.name}`, {
      score: overallScore,
      duration: Date.now() - startTime
    });

    this.emit('quality:assessed', qualityScore);

    return qualityScore;
  }

  /**
   * Calculate comprehensive quality metrics
   */
  private async calculateQualityMetrics(business: any): Promise<QualityMetrics> {
    const completeness = this.calculateCompleteness(business);
    const accuracy = await this.calculateAccuracy(business);
    const consistency = this.calculateConsistency(business);
    const timeliness = this.calculateTimeliness(business);
    const uniqueness = await this.calculateUniqueness(business);
    const validity = this.calculateValidity(business);

    return {
      completeness,
      accuracy,
      consistency,
      timeliness,
      uniqueness,
      validity
    };
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(business: any): number {
    let totalWeight = 0;
    let completedWeight = 0;

    for (const [field, weight] of Object.entries(this.fieldWeights)) {
      totalWeight += weight;
      
      const value = this.getFieldValue(business, field);
      if (this.isFieldComplete(field, value)) {
        completedWeight += weight;
      }
    }

    return (completedWeight / totalWeight) * 100;
  }

  /**
   * Calculate accuracy score
   */
  private async calculateAccuracy(business: any): Promise<number> {
    const enriched = business as EnrichedBusiness;
    let accuracyScore = 50; // Base score

    // Verified businesses get high accuracy
    if (enriched.verified) {
      accuracyScore = 95;
    } else if (enriched.verificationDetails) {
      accuracyScore = enriched.verificationDetails.confidence * 100;
    }

    // Check specific field accuracy
    const fieldAccuracyScores: number[] = [];

    // Email accuracy
    if (business.email) {
      const emailValid = this.validateEmail(business.email);
      fieldAccuracyScores.push(emailValid ? 100 : 0);
    }

    // Phone accuracy
    if (business.phone) {
      const phoneValid = this.validatePhone(business.phone);
      fieldAccuracyScores.push(phoneValid ? 100 : 0);
    }

    // Website accuracy
    if (business.website) {
      const websiteValid = this.validateWebsite(business.website);
      fieldAccuracyScores.push(websiteValid ? 100 : 0);
    }

    // Business number accuracy
    if (business.businessNumber) {
      const bnValid = await this.validateBusinessNumber(business.businessNumber);
      fieldAccuracyScores.push(bnValid ? 100 : 0);
    }

    // Average field accuracy with base accuracy
    if (fieldAccuracyScores.length > 0) {
      const fieldAccuracy = fieldAccuracyScores.reduce((a, b) => a + b, 0) / fieldAccuracyScores.length;
      accuracyScore = (accuracyScore + fieldAccuracy) / 2;
    }

    return accuracyScore;
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistency(business: any): number {
    const inconsistencies: string[] = [];

    // Check phone/email domain consistency
    if (business.email && business.website) {
      const emailDomain = business.email.split('@')[1];
      const websiteDomain = this.extractDomain(business.website);
      
      if (emailDomain && websiteDomain && !this.domainsMatch(emailDomain, websiteDomain)) {
        inconsistencies.push('Email and website domains do not match');
      }
    }

    // Check address consistency
    if (business.address) {
      // Check postal code matches city/province
      if (business.address.postalCode && business.address.province) {
        const expectedProvince = this.getProvinceFromPostalCode(business.address.postalCode);
        if (expectedProvince && expectedProvince !== business.address.province) {
          inconsistencies.push('Postal code does not match province');
        }
      }
    }

    // Check industry consistency
    if (business.industry && Array.isArray(business.industry)) {
      const hasConflictingIndustries = this.checkIndustryConflicts(business.industry);
      if (hasConflictingIndustries) {
        inconsistencies.push('Conflicting industry classifications');
      }
    }

    // Calculate score based on inconsistencies
    const maxInconsistencies = 5;
    const score = Math.max(0, 100 - (inconsistencies.length / maxInconsistencies) * 100);
    
    return score;
  }

  /**
   * Calculate timeliness score
   */
  private calculateTimeliness(business: any): number {
    const enriched = business as EnrichedBusiness;
    const now = new Date();
    
    // Use most recent update date
    const lastUpdate = enriched.enrichedAt || business.discoveredAt;
    if (!lastUpdate) return 0;
    
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Scoring based on age
    if (daysSinceUpdate <= 30) return 100;      // Less than 1 month
    if (daysSinceUpdate <= 90) return 80;       // 1-3 months
    if (daysSinceUpdate <= 180) return 60;      // 3-6 months
    if (daysSinceUpdate <= 365) return 40;      // 6-12 months
    if (daysSinceUpdate <= 730) return 20;      // 1-2 years
    return 10; // More than 2 years
  }

  /**
   * Calculate uniqueness score
   */
  private async calculateUniqueness(business: any): Promise<number> {
    // Check for duplicate indicators
    const duplicateChecks = {
      businessNumber: 100,
      phone: 80,
      email: 80,
      website: 70,
      name: 50
    };
    
    let totalScore = 0;
    let checksPerformed = 0;
    
    for (const [field, weight] of Object.entries(duplicateChecks)) {
      const value = (business as any)[field];
      if (value) {
        const isDuplicate = await this.checkForDuplicate(field, value, business.id);
        if (!isDuplicate) {
          totalScore += weight;
        }
        checksPerformed++;
      }
    }
    
    return checksPerformed > 0 ? (totalScore / checksPerformed) : 100;
  }

  /**
   * Calculate validity score
   */
  private calculateValidity(business: any): number {
    const validityChecks: boolean[] = [];
    
    // Email validity
    if (business.email) {
      validityChecks.push(this.validateEmail(business.email));
    }
    
    // Phone validity
    if (business.phone) {
      validityChecks.push(this.validatePhone(business.phone));
    }
    
    // Website validity
    if (business.website) {
      validityChecks.push(this.validateWebsite(business.website));
    }
    
    // Address validity
    if (business.address?.postalCode) {
      validityChecks.push(this.validatePostalCode(business.address.postalCode));
    }
    
    // Business number validity
    if (business.businessNumber) {
      validityChecks.push(this.validateBusinessNumberFormat(business.businessNumber));
    }
    
    if (validityChecks.length === 0) return 50; // No fields to validate
    
    const validCount = validityChecks.filter(v => v).length;
    return (validCount / validityChecks.length) * 100;
  }

  /**
   * Assess individual field quality
   */
  private async assessFieldQuality(business: any): Promise<FieldQualityAssessment[]> {
    const assessments: FieldQualityAssessment[] = [];
    
    // Assess each weighted field
    for (const field of Object.keys(this.fieldWeights)) {
      const assessment = await this.assessField(business, field);
      assessments.push(assessment);
    }
    
    return assessments;
  }

  /**
   * Assess a single field
   */
  private async assessField(business: any, field: string): Promise<FieldQualityAssessment> {
    const value = this.getFieldValue(business, field);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let quality = 0;
    
    if (!value) {
      issues.push(`${field} is missing`);
      recommendations.push(`Add ${field} to improve completeness`);
      quality = 0;
    } else {
      // Field-specific assessments
      switch (field) {
        case 'email':
          quality = this.assessEmailQuality(value, issues, recommendations);
          break;
        case 'phone':
          quality = this.assessPhoneQuality(value, issues, recommendations);
          break;
        case 'website':
          quality = this.assessWebsiteQuality(value, issues, recommendations);
          break;
        case 'businessNumber':
          quality = await this.assessBusinessNumberQuality(value, issues, recommendations);
          break;
        case 'address':
          quality = this.assessAddressQuality(value, issues, recommendations);
          break;
        case 'contacts':
          quality = this.assessContactsQuality(value, issues, recommendations);
          break;
        default:
          quality = value ? 75 : 0; // Default quality for other fields
      }
    }
    
    return {
      field,
      quality,
      issues,
      recommendations
    };
  }

  /**
   * Generate recommendations based on assessments
   */
  private generateRecommendations(
    assessments: FieldQualityAssessment[],
    metrics: QualityMetrics
  ): DataQualityRecommendation[] {
    const recommendations: DataQualityRecommendation[] = [];
    
    // Field-level recommendations
    for (const assessment of assessments) {
      if (assessment.quality < 70) {
        const weight = this.fieldWeights[assessment.field] || 1;
        const impact = weight >= 3 ? 'high' : weight >= 2 ? 'medium' : 'low';
        
        for (let i = 0; i < assessment.recommendations.length; i++) {
          recommendations.push({
            field: assessment.field,
            issue: assessment.issues[i] || 'Quality below threshold',
            impact: impact as 'high' | 'medium' | 'low',
            suggestion: assessment.recommendations[i],
            estimatedImprovement: (100 - assessment.quality) * (weight / 10)
          });
        }
      }
    }
    
    // Metric-level recommendations
    if (metrics.completeness < 70) {
      recommendations.push({
        field: 'overall',
        issue: 'Low completeness score',
        impact: 'high',
        suggestion: 'Complete missing critical fields to improve data completeness',
        estimatedImprovement: 15
      });
    }
    
    if (metrics.accuracy < 70) {
      recommendations.push({
        field: 'overall',
        issue: 'Low accuracy score',
        impact: 'high',
        suggestion: 'Verify business information through official sources',
        estimatedImprovement: 20
      });
    }
    
    if (metrics.timeliness < 50) {
      recommendations.push({
        field: 'overall',
        issue: 'Outdated information',
        impact: 'medium',
        suggestion: 'Update business information to ensure currency',
        estimatedImprovement: 10
      });
    }
    
    // Sort by impact and improvement
    recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.estimatedImprovement - a.estimatedImprovement;
    });
    
    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  /**
   * Field quality assessment methods
   */
  private assessEmailQuality(email: string, issues: string[], recommendations: string[]): number {
    let quality = 100;
    
    if (!this.validateEmail(email)) {
      issues.push('Invalid email format');
      recommendations.push('Verify and correct email format');
      quality -= 50;
    }
    
    // Check for generic emails
    const genericPrefixes = ['info', 'admin', 'contact', 'hello', 'support'];
    const localPart = email.split('@')[0].toLowerCase();
    if (genericPrefixes.includes(localPart)) {
      issues.push('Generic email address');
      recommendations.push('Find personal contact email for better engagement');
      quality -= 20;
    }
    
    // Check for free email providers
    const domain = email.split('@')[1];
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (freeProviders.includes(domain)) {
      issues.push('Free email provider');
      recommendations.push('Verify business email domain');
      quality -= 10;
    }
    
    return Math.max(0, quality);
  }

  private assessPhoneQuality(phone: string, issues: string[], recommendations: string[]): number {
    let quality = 100;
    
    if (!this.validatePhone(phone)) {
      issues.push('Invalid phone format');
      recommendations.push('Format phone number correctly');
      quality -= 40;
    }
    
    // Check length
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      issues.push('Phone number too short');
      recommendations.push('Ensure phone number includes area code');
      quality -= 30;
    } else if (digits.length > 15) {
      issues.push('Phone number too long');
      recommendations.push('Remove extra digits or extensions');
      quality -= 20;
    }
    
    return Math.max(0, quality);
  }

  private assessWebsiteQuality(website: string, issues: string[], recommendations: string[]): number {
    let quality = 100;
    
    if (!this.validateWebsite(website)) {
      issues.push('Invalid website format');
      recommendations.push('Correct website URL format');
      quality -= 40;
    }
    
    // Check for HTTPS
    if (!website.startsWith('https://')) {
      issues.push('Website not using HTTPS');
      recommendations.push('Verify if website supports HTTPS');
      quality -= 10;
    }
    
    // Check for www consistency
    if (website.includes('://www.')) {
      issues.push('Using www subdomain');
      recommendations.push('Consider using canonical domain format');
      quality -= 5;
    }
    
    return Math.max(0, quality);
  }

  private async assessBusinessNumberQuality(
    bn: string,
    issues: string[],
    recommendations: string[]
  ): Promise<number> {
    let quality = 100;
    
    if (!this.validateBusinessNumberFormat(bn)) {
      issues.push('Invalid business number format');
      recommendations.push('Verify business number with government registry');
      quality -= 60;
    }
    
    // Check validity
    const isValid = await this.validateBusinessNumber(bn);
    if (!isValid) {
      issues.push('Business number not found in registry');
      recommendations.push('Confirm business number with official sources');
      quality -= 40;
    }
    
    return Math.max(0, quality);
  }

  private assessAddressQuality(address: any, issues: string[], recommendations: string[]): number {
    let quality = 100;
    
    if (!address.street) {
      issues.push('Missing street address');
      recommendations.push('Add complete street address');
      quality -= 30;
    }
    
    if (!address.city) {
      issues.push('Missing city');
      recommendations.push('Add city information');
      quality -= 20;
    }
    
    if (!address.province) {
      issues.push('Missing province');
      recommendations.push('Add province/territory');
      quality -= 20;
    }
    
    if (!address.postalCode) {
      issues.push('Missing postal code');
      recommendations.push('Add postal code');
      quality -= 20;
    } else if (!this.validatePostalCode(address.postalCode)) {
      issues.push('Invalid postal code format');
      recommendations.push('Correct postal code format (A1A 1A1)');
      quality -= 15;
    }
    
    return Math.max(0, quality);
  }

  private assessContactsQuality(contacts: any[], issues: string[], recommendations: string[]): number {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      issues.push('No contacts found');
      recommendations.push('Add at least one business contact');
      return 0;
    }
    
    let quality = 60; // Base score for having contacts
    
    // Check for decision makers
    const hasDecisionMaker = contacts.some(c => c.isPrimary || c.title?.toLowerCase().includes('owner'));
    if (!hasDecisionMaker) {
      issues.push('No decision maker identified');
      recommendations.push('Identify and add key decision maker contact');
      quality -= 20;
    }
    
    // Check contact completeness
    const incompleteContacts = contacts.filter(c => !c.email && !c.phone);
    if (incompleteContacts.length > 0) {
      issues.push(`${incompleteContacts.length} contacts missing email and phone`);
      recommendations.push('Add email or phone for all contacts');
      quality -= 10;
    }
    
    // Bonus for multiple contacts
    if (contacts.length >= 3) quality += 20;
    else if (contacts.length >= 2) quality += 10;
    
    return Math.min(100, quality);
  }

  /**
   * Validation methods
   */
  private validateEmail(email: string): boolean {
    return this.qualityRules.email.pattern.test(email);
  }

  private validatePhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= this.qualityRules.phone.minLength &&
           digits.length <= this.qualityRules.phone.maxLength &&
           this.qualityRules.phone.pattern.test(phone);
  }

  private validateWebsite(website: string): boolean {
    return this.qualityRules.website.pattern.test(website);
  }

  private validatePostalCode(postalCode: string): boolean {
    return this.qualityRules.postalCode.pattern.test(postalCode);
  }

  private validateBusinessNumberFormat(bn: string): boolean {
    return this.qualityRules.businessNumber.pattern.test(bn);
  }

  private async validateBusinessNumber(bn: string): Promise<boolean> {
    // Check cache first
    const cached = await this.redis.get(`bn:valid:${bn}`);
    if (cached) return cached === 'true';
    
    // In production, this would check against government registry
    // For now, validate format
    const isValid = this.validateBusinessNumberFormat(bn);
    
    // Cache result
    await this.redis.setex(`bn:valid:${bn}`, 86400, isValid ? 'true' : 'false');
    
    return isValid;
  }

  /**
   * Utility methods
   */
  private getFieldValue(business: any, field: string): any {
    // Handle nested fields
    if (field === 'address') {
      return business.address;
    }
    
    // Handle enriched fields
    const enriched = business as EnrichedBusiness;
    if (field === 'contacts') return enriched.contacts;
    if (field === 'certifications') return enriched.certifications;
    if (field === 'financialInfo') return enriched.financialInfo;
    if (field === 'procurementReadiness') return enriched.procurementReadiness;
    if (field === 'indigenousDetails') return enriched.indigenousDetails;
    
    return business[field];
  }

  private isFieldComplete(field: string, value: any): boolean {
    if (!value) return false;
    
    // Special handling for complex fields
    if (field === 'address') {
      return !!(value.street && value.city && value.province && value.postalCode);
    }
    
    if (field === 'contacts') {
      return Array.isArray(value) && value.length > 0;
    }
    
    if (field === 'industry') {
      return Array.isArray(value) && value.length > 0;
    }
    
    return true;
  }

  private identifyMissingFields(business: any): string[] {
    const missing: string[] = [];
    
    for (const field of Object.keys(this.fieldWeights)) {
      const value = this.getFieldValue(business, field);
      if (!this.isFieldComplete(field, value)) {
        missing.push(field);
      }
    }
    
    return missing;
  }

  private assessSourceReliability(business: any): number {
    if (!business.source) return 50;
    
    // Use source reliability if available
    if (business.source.reliability !== undefined) {
      return business.source.reliability * 100;
    }
    
    // Default scores by source type
    const sourceScores: Record<string, number> = {
      government: 95,
      indigenous_org: 90,
      business_registry: 85,
      supply_chain: 70,
      social_media: 50,
      web_crawl: 40,
      referral: 60
    };
    
    return sourceScores[business.source.type] || 50;
  }

  private assessVerificationLevel(business: any): number {
    const enriched = business as EnrichedBusiness;
    
    if (enriched.verified) return 100;
    if (enriched.taxDebtStatus) return 90;
    if (enriched.verificationDetails) return 80;
    if (enriched.certifications?.some(c => c.status === 'active')) return 70;
    if (business.businessNumber) return 50;
    if (enriched.contacts?.some(c => c.email)) return 30;
    
    return 10;
  }

  private calculateOverallScore(metrics: QualityMetrics): number {
    // Weighted average of all metrics
    const weights = {
      completeness: 0.25,
      accuracy: 0.20,
      consistency: 0.15,
      timeliness: 0.15,
      uniqueness: 0.15,
      validity: 0.10
    };
    
    return Object.entries(metrics).reduce((score, [metric, value]) => {
      return score + (value * weights[metric as keyof QualityMetrics]);
    }, 0);
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private domainsMatch(domain1: string, domain2: string): boolean {
    // Remove common subdomains
    const clean1 = domain1.replace(/^(www|mail|email)\./, '');
    const clean2 = domain2.replace(/^(www|mail|email)\./, '');
    
    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
  }

  private getProvinceFromPostalCode(postalCode: string): string | null {
    const firstChar = postalCode.charAt(0).toUpperCase();
    const provinceMap: Record<string, string> = {
      'A': 'NL', // Newfoundland and Labrador
      'B': 'NS', // Nova Scotia
      'C': 'PE', // Prince Edward Island
      'E': 'NB', // New Brunswick
      'G': 'QC', // Quebec East
      'H': 'QC', // Montreal
      'J': 'QC', // Quebec West
      'K': 'ON', // Eastern Ontario
      'L': 'ON', // Central Ontario
      'M': 'ON', // Toronto
      'N': 'ON', // Southwestern Ontario
      'P': 'ON', // Northern Ontario
      'R': 'MB', // Manitoba
      'S': 'SK', // Saskatchewan
      'T': 'AB', // Alberta
      'V': 'BC', // British Columbia
      'X': 'NT', // Northwest Territories and Nunavut
      'Y': 'YT'  // Yukon
    };
    
    return provinceMap[firstChar] || null;
  }

  private checkIndustryConflicts(industries: string[]): boolean {
    // Define conflicting industry pairs
    const conflicts = [
      ['retail', 'wholesale'],
      ['manufacturing', 'retail'],
      ['construction', 'demolition']
    ];
    
    const lowerIndustries = industries.map(i => i.toLowerCase());
    
    for (const [ind1, ind2] of conflicts) {
      if (lowerIndustries.some(i => i.includes(ind1)) && 
          lowerIndustries.some(i => i.includes(ind2))) {
        return true;
      }
    }
    
    return false;
  }

  private async checkForDuplicate(field: string, value: any, businessId: string): Promise<boolean> {
    const key = `duplicate:${field}:${value}`;
    const existing = await this.redis.get(key);
    
    if (existing && existing !== businessId) {
      return true; // Duplicate found
    }
    
    // Store for future checks
    await this.redis.setex(key, 86400 * 30, businessId); // 30 days
    return false;
  }

  private async cacheAssessment(businessId: string, score: DataQualityScore): Promise<void> {
    const key = `quality:assessment:${businessId}`;
    await this.redis.setex(key, 86400 * 7, JSON.stringify(score)); // 7 days
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
  }
}