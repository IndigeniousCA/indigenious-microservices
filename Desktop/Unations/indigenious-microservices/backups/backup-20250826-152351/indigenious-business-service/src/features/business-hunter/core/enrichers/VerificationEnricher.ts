/**
 * Verification Enricher
 * Enriches discovered businesses using our Canadian Verification System
 */

import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { 
  DiscoveredBusiness, 
  EnrichedBusiness,
  TaxDebtStatus,
  VerificationResult,
  ProcurementReadiness,
  Certification,
  CertificationType
} from '../../types';
import { createLogger } from '../../utils/logger';
import { CanadianVerificationOrchestrator } from '@/features/canadian-verification/services/CanadianVerificationOrchestrator';
import { TaxDebtAggregator } from '@/features/canadian-verification/services/TaxDebtAggregator';
import { CCABVerifier } from '@/features/canadian-verification/services/CCABVerifier';

export class VerificationEnricher {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly verificationOrchestrator: CanadianVerificationOrchestrator;
  private readonly taxDebtAggregator: TaxDebtAggregator;
  private readonly ccabVerifier: CCABVerifier;
  
  constructor(redis: Redis) {
    this.redis = redis;
    this.logger = createLogger('enricher:verification');
    
    // Initialize our verification services
    this.verificationOrchestrator = new CanadianVerificationOrchestrator();
    this.taxDebtAggregator = new TaxDebtAggregator();
    this.ccabVerifier = new CCABVerifier();
  }
  
  /**
   * Enrich a discovered business with verification data
   */
  async enrich(business: DiscoveredBusiness): Promise<EnrichedBusiness> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Enriching business: ${business.name}`, {
        businessNumber: business.businessNumber,
        province: business.address?.province
      });
      
      // Run enrichment tasks in parallel where possible
      const [
        verificationResult,
        taxDebtStatus,
        certifications,
        procurementReadiness
      ] = await Promise.all([
        this.verifyBusiness(business),
        this.checkTaxDebt(business),
        this.checkCertifications(business),
        this.assessProcurementReadiness(business)
      ]);
      
      // Create enriched business
      const enrichedBusiness: EnrichedBusiness = {
        ...business,
        verified: verificationResult.verified,
        verificationDetails: verificationResult,
        taxDebtStatus,
        certifications,
        procurementReadiness,
        enrichedAt: new Date(),
        contacts: [], // TODO: Implement contact enrichment
        financialInfo: await this.estimateFinancialInfo(business),
        indigenousDetails: await this.enrichIndigenousDetails(business),
        socialProfiles: [], // TODO: Implement social profile enrichment
        riskScore: this.calculateRiskScore(verificationResult, taxDebtStatus),
        partnershipScore: await this.calculatePartnershipScore(business, verificationResult)
      };
      
      // Cache enriched data
      await this.cacheEnrichedBusiness(enrichedBusiness);
      
      // Update metrics
      const duration = Date.now() - startTime;
      await this.updateEnrichmentMetrics(duration, true);
      
      this.logger.info(`Successfully enriched business: ${business.name}`, {
        duration,
        verified: enrichedBusiness.verified,
        riskScore: enrichedBusiness.riskScore
      });
      
      return enrichedBusiness;
      
    } catch (error) {
      this.logger.error(`Failed to enrich business ${business.name}:`, error);
      await this.updateEnrichmentMetrics(Date.now() - startTime, false);
      
      // Return partially enriched business
      return {
        ...business,
        verified: false,
        enrichedAt: new Date(),
        contacts: [],
        certifications: [],
        socialProfiles: []
      } as EnrichedBusiness;
    }
  }
  
  /**
   * Verify business using Canadian Verification System
   */
  private async verifyBusiness(business: DiscoveredBusiness): Promise<VerificationResult> {
    try {
      // Skip if no business number or province
      if (!business.businessNumber || !business.address?.province) {
        return {
          verified: false,
          confidence: 0,
          lastVerified: new Date(),
          issues: ['Missing business number or province']
        };
      }
      
      // Use our comprehensive verification system
      const verification = await this.verificationOrchestrator.verifyBusiness({
        businessName: business.name,
        businessNumber: business.businessNumber,
        businessType: this.mapBusinessType(business.type),
        address: {
          street: business.address.street || '',
          city: business.address.city || '',
          province: business.address.province,
          postalCode: business.address.postalCode || '',
          country: 'Canada'
        },
        requestedBy: 'business-hunter',
        purpose: 'discovery-enrichment'
      });
      
      return {
        verified: verification.isValid && verification.confidence > 80,
        confidence: verification.confidence / 100,
        province: business.address.province,
        federalStatus: verification.federal?.status,
        provincialStatus: verification.provincial?.status,
        lastVerified: new Date(),
        issues: verification.issues || []
      };
      
    } catch (error) {
      this.logger.error('Verification failed:', error);
      return {
        verified: false,
        confidence: 0,
        lastVerified: new Date(),
        issues: [error.message]
      };
    }
  }
  
  /**
   * Check tax debt status
   */
  private async checkTaxDebt(business: DiscoveredBusiness): Promise<TaxDebtStatus | undefined> {
    try {
      // Skip if no business number
      if (!business.businessNumber) {
        return undefined;
      }
      
      // Generate automated consent token for discovery
      const consentToken = await this.generateDiscoveryConsent(business);
      
      // Check tax debt across all jurisdictions
      const taxDebtResult = await this.taxDebtAggregator.verifyTaxDebt({
        businessNumber: business.businessNumber,
        businessIdentifier: business.businessNumber,
        consentToken,
        requestedBy: 'business-hunter',
        purpose: 'procurement-eligibility'
      });
      
      return {
        hasDebt: taxDebtResult.totalDebt > 0,
        totalDebt: taxDebtResult.totalDebt,
        riskScore: taxDebtResult.riskAssessment.score,
        procurementEligible: taxDebtResult.procurementEligibility.eligible,
        lastChecked: new Date()
      };
      
    } catch (error) {
      this.logger.error('Tax debt check failed:', error);
      return undefined;
    }
  }
  
  /**
   * Check business certifications
   */
  private async checkCertifications(business: DiscoveredBusiness): Promise<Certification[]> {
    const certifications: Certification[] = [];
    
    try {
      // Check CCAB certification
      if (business.businessNumber) {
        const ccabResult = await this.ccabVerifier.verify(business.businessNumber);
        
        if (ccabResult.certified) {
          certifications.push({
            type: CertificationType.CCAB,
            issuer: 'Canadian Council for Aboriginal Business',
            number: ccabResult.certificationNumber,
            issuedDate: ccabResult.certificationDate,
            expiryDate: ccabResult.expiryDate,
            status: ccabResult.status === 'active' ? 'active' : 'expired'
          });
        }
      }
      
      // Check for PAR certification mentioned in data
      if (business.rawData?.certifications?.includes('PAR')) {
        certifications.push({
          type: CertificationType.PAR,
          issuer: 'Canadian Council for Aboriginal Business',
          status: 'active'
        });
      }
      
      // Check for ISO certifications
      const isoPattern = /ISO[\s-]?(\d{4,5})/gi;
      const description = `${business.description || ''} ${JSON.stringify(business.rawData || {})}`;
      const isoMatches = description.match(isoPattern);
      
      if (isoMatches) {
        isoMatches.forEach(iso => {
          certifications.push({
            type: CertificationType.ISO,
            issuer: 'International Organization for Standardization',
            number: iso,
            status: 'active'
          });
        });
      }
      
    } catch (error) {
      this.logger.error('Certification check failed:', error);
    }
    
    return certifications;
  }
  
  /**
   * Assess procurement readiness
   */
  private async assessProcurementReadiness(business: DiscoveredBusiness): Promise<ProcurementReadiness> {
    let score = 0;
    const capabilities: string[] = [];
    
    // Base score on business type
    if (business.type === 'indigenous_owned') score += 20;
    if (business.type === 'indigenous_partnership') score += 15;
    
    // Business number increases readiness
    if (business.businessNumber) score += 15;
    
    // Contact information
    if (business.email) score += 10;
    if (business.phone) score += 10;
    if (business.website) score += 10;
    
    // Address completeness
    if (business.address?.street && business.address?.postalCode) score += 10;
    
    // Industry/capabilities from description
    if (business.industry && business.industry.length > 0) {
      score += 5 * Math.min(business.industry.length, 3);
      capabilities.push(...business.industry);
    }
    
    // TODO: Check actual insurance/bonding through external APIs
    const hasInsurance = score > 50; // Placeholder
    const hasBonding = score > 60; // Placeholder
    const hasHealthSafety = score > 40; // Placeholder
    
    return {
      score: Math.min(score, 100),
      hasInsurance,
      hasBonding,
      hasHealthSafety,
      capabilities,
      naicsCodes: this.extractNAICSCodes(business),
      unspscCodes: [] // TODO: Implement UNSPSC mapping
    };
  }
  
  /**
   * Estimate financial information
   */
  private async estimateFinancialInfo(business: DiscoveredBusiness): Promise<any> {
    // TODO: Implement financial estimation based on:
    // - Industry averages
    // - Employee count
    // - Years in business
    // - Government contract history
    
    return {
      revenueRange: 'Unknown',
      employeeRange: 'Unknown',
      yearEstablished: this.extractYearEstablished(business)
    };
  }
  
  /**
   * Enrich Indigenous-specific details
   */
  private async enrichIndigenousDetails(business: DiscoveredBusiness): Promise<any> {
    if (business.type !== 'indigenous_owned' && business.type !== 'indigenous_partnership') {
      return undefined;
    }
    
    // Extract from raw data or description
    const data = business.rawData || {};
    const description = business.description || '';
    
    return {
      ownershipPercentage: data.indigenousOwnership || 
                          (business.type === 'indigenous_owned' ? 100 : 51),
      nation: this.extractNation(business),
      community: data.community || business.address?.territoryName,
      indigenousEmployeePercentage: data.indigenousEmployees,
      communityBenefitAgreements: description.toLowerCase().includes('cba') || 
                                 description.toLowerCase().includes('community benefit'),
      traditionalTerritoryWork: business.address?.isOnReserve || false
    };
  }
  
  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    verification: VerificationResult,
    taxDebt?: TaxDebtStatus
  ): number {
    let riskScore = 0;
    
    // Verification risk
    if (!verification.verified) riskScore += 30;
    else if (verification.confidence < 0.8) riskScore += 20;
    else if (verification.confidence < 0.9) riskScore += 10;
    
    // Tax debt risk
    if (taxDebt?.hasDebt) {
      riskScore += taxDebt.riskScore * 0.5; // Weight tax risk at 50%
    }
    
    // Issues risk
    if (verification.issues && verification.issues.length > 0) {
      riskScore += verification.issues.length * 5;
    }
    
    return Math.min(riskScore, 100);
  }
  
  /**
   * Calculate partnership score
   */
  private async calculatePartnershipScore(
    business: DiscoveredBusiness,
    verification: VerificationResult
  ): Promise<number> {
    let score = 0;
    
    // Verified businesses are better partners
    if (verification.verified) score += 30;
    
    // Indigenous businesses get preference
    if (business.type === 'indigenous_owned') score += 25;
    if (business.type === 'indigenous_partnership') score += 20;
    
    // Complete information increases score
    if (business.businessNumber) score += 10;
    if (business.website) score += 5;
    if (business.email && business.phone) score += 10;
    
    // Industry match (TODO: Compare with platform RFQs)
    if (business.industry && business.industry.length > 0) {
      score += 10;
    }
    
    // Location bonus for remote areas
    if (business.address?.isOnReserve) score += 10;
    
    return Math.min(score, 100);
  }
  
  /**
   * Generate discovery consent token
   */
  private async generateDiscoveryConsent(business: DiscoveredBusiness): Promise<string> {
    // In production, this would follow proper consent protocols
    // For discovery, we use a special automated consent process
    return `discovery-consent-${business.businessNumber}-${Date.now()}`;
  }
  
  /**
   * Map business type to verification system format
   */
  private mapBusinessType(type: string): string {
    const mapping = {
      'indigenous_owned': 'indigenous-owned',
      'indigenous_partnership': 'indigenous-partnership',
      'indigenous_affiliated': 'indigenous-affiliated',
      'canadian_general': 'general',
      'potential_partner': 'general',
      'unknown': 'unknown'
    };
    
    return mapping[type] || 'unknown';
  }
  
  /**
   * Extract NAICS codes from business data
   */
  private extractNAICSCodes(business: DiscoveredBusiness): string[] {
    const codes: string[] = [];
    
    // Check raw data
    if (business.rawData?.naicsCodes) {
      if (Array.isArray(business.rawData.naicsCodes)) {
        codes.push(...business.rawData.naicsCodes);
      } else {
        codes.push(business.rawData.naicsCodes);
      }
    }
    
    // Extract from description
    const naicsPattern = /\b\d{2,6}\b/g;
    const description = `${business.description || ''} ${JSON.stringify(business.rawData || {})}`;
    const matches = description.match(naicsPattern);
    
    if (matches) {
      matches.forEach(match => {
        if (match.length >= 2 && match.length <= 6) {
          codes.push(match);
        }
      });
    }
    
    return [...new Set(codes)];
  }
  
  /**
   * Extract year established
   */
  private extractYearEstablished(business: DiscoveredBusiness): number | undefined {
    // Check raw data
    if (business.rawData?.yearEstablished) {
      return parseInt(business.rawData.yearEstablished);
    }
    
    // Extract from description
    const yearPattern = /(?:established|founded|since|est\.?)\s*(?:in\s*)?(\d{4})/i;
    const description = business.description || '';
    const match = description.match(yearPattern);
    
    if (match && match[1]) {
      const year = parseInt(match[1]);
      if (year > 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract nation/tribe information
   */
  private extractNation(business: DiscoveredBusiness): string | undefined {
    // Check raw data
    if (business.rawData?.nation || business.rawData?.tribe || business.rawData?.firstNation) {
      return business.rawData.nation || business.rawData.tribe || business.rawData.firstNation;
    }
    
    // Common First Nations in Canada
    const nations = [
      'Cree', 'Ojibwe', 'Inuit', 'Métis', 'Mi\'kmaq', 'Haudenosaunee',
      'Blackfoot', 'Dene', 'Salish', 'Haida', 'Mohawk', 'Algonquin'
    ];
    
    const text = `${business.name} ${business.description || ''}`.toLowerCase();
    
    for (const nation of nations) {
      if (text.includes(nation.toLowerCase())) {
        return nation;
      }
    }
    
    return undefined;
  }
  
  /**
   * Cache enriched business
   */
  private async cacheEnrichedBusiness(business: EnrichedBusiness): Promise<void> {
    const key = `enriched:${business.id}`;
    const ttl = 86400 * 7; // 7 days
    
    await this.redis.setex(key, ttl, JSON.stringify({
      id: business.id,
      name: business.name,
      businessNumber: business.businessNumber,
      verified: business.verified,
      verificationConfidence: business.verificationDetails?.confidence,
      taxDebtStatus: business.taxDebtStatus,
      certifications: business.certifications?.length || 0,
      procurementScore: business.procurementReadiness?.score,
      riskScore: business.riskScore,
      partnershipScore: business.partnershipScore,
      enrichedAt: business.enrichedAt
    }));
  }
  
  /**
   * Update enrichment metrics
   */
  private async updateEnrichmentMetrics(duration: number, success: boolean): Promise<void> {
    const hour = new Date().getHours();
    
    await this.redis.hincrby('enrichment:stats', success ? 'success' : 'failed', 1);
    await this.redis.hincrby('enrichment:stats', 'total', 1);
    await this.redis.hincrby(`enrichment:hourly:${hour}`, 'count', 1);
    await this.redis.hincrby(`enrichment:hourly:${hour}`, 'duration', duration);
    
    // Update average duration
    const avgKey = 'enrichment:stats:avgDuration';
    const current = await this.redis.get(avgKey);
    const currentAvg = current ? parseFloat(current) : duration;
    const newAvg = (currentAvg * 0.95) + (duration * 0.05); // Exponential moving average
    await this.redis.set(avgKey, newAvg.toString());
  }
}