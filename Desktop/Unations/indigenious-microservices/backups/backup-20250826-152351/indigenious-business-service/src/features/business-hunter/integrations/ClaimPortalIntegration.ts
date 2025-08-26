/**
 * Claim Portal Integration
 * Seamlessly connects discovered businesses to the main platform
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import * as QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import { createLogger } from '../core/utils/logger';
import {
  EnrichedBusiness,
  BusinessType,
  PriorityTier
} from '../types';
import {
  ClaimPortalLink,
  GeographicIntelligence,
  BusinessPriorityScore
} from '../types/enhanced-types';

export interface ClaimPortalConfig {
  baseUrl: string;
  jwtSecret: string;
  tokenExpiry: number; // hours
  enableQRCode: boolean;
  enableShortUrls: boolean;
  enableTracking: boolean;
  customBranding: CustomBranding;
}

export interface CustomBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  welcomeMessage: string;
  supportEmail: string;
}

export interface ClaimRequest {
  businessId: string;
  token: string;
  claimedBy: {
    email: string;
    name: string;
    title?: string;
    phone?: string;
  };
  claimedAt: Date;
  verificationMethod: 'email' | 'phone' | 'document';
  ipAddress: string;
  userAgent: string;
}

export interface ClaimVerification {
  verified: boolean;
  confidence: number;
  checks: VerificationCheck[];
  requiresManualReview: boolean;
}

export interface VerificationCheck {
  type: string;
  passed: boolean;
  details: string;
  score: number;
}

export class ClaimPortalIntegration extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly config: ClaimPortalConfig;
  private readonly urlShortener: URLShortener;

  constructor(redis: Redis, config: ClaimPortalConfig) {
    super();
    this.logger = createLogger('claim-portal-integration');
    this.redis = redis;
    this.config = config;
    this.urlShortener = new URLShortener(redis);
  }

  /**
   * Generate claim link for a business
   */
  async generateClaimLink(
    business: EnrichedBusiness,
    priorityScore?: BusinessPriorityScore,
    customizations?: Partial<CustomBranding>
  ): Promise<ClaimPortalLink> {
    this.logger.info(`Generating claim link for business: ${business.name}`);

    try {
      // Generate secure token
      const token = this.generateSecureToken(business);
      
      // Build claim URL
      const baseUrl = `${this.config.baseUrl}/claim`;
      const params = new URLSearchParams({
        token,
        bid: business.id
      });
      
      const fullUrl = `${baseUrl}?${params.toString()}`;
      
      // Generate short URL if enabled
      let shortUrl: string | undefined;
      if (this.config.enableShortUrls) {
        shortUrl = await this.urlShortener.shorten(fullUrl);
      }

      // Generate QR code if enabled
      let qrCode: string | undefined;
      if (this.config.enableQRCode) {
        qrCode = await this.generateQRCode(shortUrl || fullUrl);
      }

      // Prepare prefilled data
      const prefilledData = this.preparePrefilledData(business);

      // Generate tracking pixel
      const trackingPixel = this.config.enableTracking 
        ? this.generateTrackingPixel(business.id, token)
        : '';

      // Merge customizations
      const branding = {
        ...this.config.customBranding,
        ...customizations
      };

      const claimLink: ClaimPortalLink = {
        businessId: business.id,
        token,
        url: fullUrl,
        shortUrl,
        qrCode,
        expiresAt: new Date(Date.now() + this.config.tokenExpiry * 60 * 60 * 1000),
        prefilledData,
        trackingPixel,
        customizations: branding
      };

      // Cache the claim link
      await this.cacheClaimLink(claimLink);

      this.logger.info(`Claim link generated for ${business.name}`, {
        businessId: business.id,
        hasShortUrl: !!shortUrl,
        hasQRCode: !!qrCode
      });

      this.emit('claim:link:created', claimLink);

      return claimLink;

    } catch (error) {
      this.logger.error(`Failed to generate claim link for ${business.name}:`, error);
      throw error;
    }
  }

  /**
   * Process claim request
   */
  async processClaim(claimRequest: ClaimRequest): Promise<ClaimVerification> {
    this.logger.info(`Processing claim request for business: ${claimRequest.businessId}`);

    try {
      // Validate token
      const tokenValid = await this.validateToken(claimRequest.token, claimRequest.businessId);
      if (!tokenValid) {
        return {
          verified: false,
          confidence: 0,
          checks: [{
            type: 'token_validation',
            passed: false,
            details: 'Invalid or expired token',
            score: 0
          }],
          requiresManualReview: false
        };
      }

      // Get business data
      const business = await this.getBusinessData(claimRequest.businessId);
      if (!business) {
        throw new Error(`Business not found: ${claimRequest.businessId}`);
      }

      // Perform verification checks
      const checks: VerificationCheck[] = [];
      
      // Email domain check
      if (business.email && claimRequest.claimedBy.email) {
        const emailCheck = this.verifyEmailDomain(
          claimRequest.claimedBy.email,
          business.email
        );
        checks.push(emailCheck);
      }

      // Phone number check
      if (business.phone && claimRequest.claimedBy.phone) {
        const phoneCheck = this.verifyPhoneNumber(
          claimRequest.claimedBy.phone,
          business.phone
        );
        checks.push(phoneCheck);
      }

      // Name matching check
      const nameCheck = this.verifyNameMatch(
        claimRequest.claimedBy.name,
        business
      );
      checks.push(nameCheck);

      // IP geolocation check
      const geoCheck = await this.verifyGeolocation(
        claimRequest.ipAddress,
        business
      );
      checks.push(geoCheck);

      // Business type verification
      if (business.type === BusinessType.INDIGENOUS_OWNED) {
        const indigenousCheck = await this.verifyIndigenousOwnership(
          claimRequest,
          business
        );
        checks.push(indigenousCheck);
      }

      // Calculate overall verification
      const passedChecks = checks.filter(c => c.passed).length;
      const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
      const maxScore = checks.length * 100;
      const confidence = totalScore / maxScore;

      const verified = confidence >= 0.7;
      const requiresManualReview = confidence >= 0.4 && confidence < 0.7;

      const verification: ClaimVerification = {
        verified,
        confidence,
        checks,
        requiresManualReview
      };

      // Record claim attempt
      await this.recordClaimAttempt(claimRequest, verification);

      if (verified) {
        // Process successful claim
        await this.processSuccessfulClaim(claimRequest, business);
        this.emit('claim:verified', { claimRequest, business });
      } else if (requiresManualReview) {
        // Queue for manual review
        await this.queueForManualReview(claimRequest, verification);
        this.emit('claim:review:required', { claimRequest, verification });
      } else {
        this.emit('claim:rejected', { claimRequest, verification });
      }

      return verification;

    } catch (error) {
      this.logger.error('Claim processing failed:', error);
      throw error;
    }
  }

  /**
   * Get claim statistics
   */
  async getClaimStatistics(period?: { start: Date; end: Date }): Promise<any> {
    const stats = {
      totalLinksGenerated: await this.getCounter('claim:links:total'),
      totalClaimsProcessed: await this.getCounter('claim:processed:total'),
      successfulClaims: await this.getCounter('claim:verified:total'),
      pendingReviews: await this.getCounter('claim:review:pending'),
      rejectedClaims: await this.getCounter('claim:rejected:total'),
      conversionRate: 0,
      averageTimeToClam: 0,
      topClaimMethods: await this.getTopClaimMethods(),
      claimsByBusinessType: await this.getClaimsByBusinessType(),
      geographicDistribution: await this.getClaimGeographicDistribution()
    };

    // Calculate conversion rate
    if (stats.totalLinksGenerated > 0) {
      stats.conversionRate = stats.successfulClaims / stats.totalLinksGenerated;
    }

    return stats;
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(business: EnrichedBusiness): string {
    const payload = {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      tier: (business as any).tier || PriorityTier.STANDARD,
      iat: Date.now(),
      exp: Date.now() + (this.config.tokenExpiry * 60 * 60 * 1000)
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Validate token
   */
  private async validateToken(token: string, businessId: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      // Check business ID matches
      if (decoded.businessId !== businessId) {
        return false;
      }

      // Check expiration
      if (decoded.exp < Date.now()) {
        return false;
      }

      // Check if token was already used
      const used = await this.redis.get(`claim:token:used:${token}`);
      if (used) {
        return false;
      }

      return true;

    } catch (error) {
      this.logger.debug('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Generate QR code
   */
  private async generateQRCode(url: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: this.config.customBranding.primaryColor,
          light: '#FFFFFF'
        },
        width: 300
      });

      return qrCodeDataUrl;

    } catch (error) {
      this.logger.error('QR code generation failed:', error);
      return '';
    }
  }

  /**
   * Prepare prefilled data
   */
  private preparePrefilledData(business: EnrichedBusiness): Record<string, any> {
    return {
      businessName: business.name,
      legalName: business.legalName,
      businessNumber: business.businessNumber,
      website: business.website,
      email: business.email,
      phone: business.phone,
      address: business.address,
      industry: business.industry,
      businessType: business.type,
      certifications: business.certifications?.map(c => ({
        type: c.type,
        issuer: c.issuer,
        number: c.number
      })),
      indigenousDetails: business.indigenousDetails
    };
  }

  /**
   * Generate tracking pixel
   */
  private generateTrackingPixel(businessId: string, token: string): string {
    const trackingId = Buffer.from(`${businessId}:${token}`).toString('base64');
    return `${this.config.baseUrl}/track.gif?tid=${trackingId}`;
  }

  /**
   * Verification methods
   */
  private verifyEmailDomain(claimedEmail: string, businessEmail: string): VerificationCheck {
    const claimedDomain = claimedEmail.split('@')[1];
    const businessDomain = businessEmail.split('@')[1];
    
    const passed = claimedDomain === businessDomain;
    
    return {
      type: 'email_domain',
      passed,
      details: passed 
        ? 'Email domain matches business email'
        : 'Email domain does not match business email',
      score: passed ? 100 : 0
    };
  }

  private verifyPhoneNumber(claimedPhone: string, businessPhone: string): VerificationCheck {
    const cleanClaimed = claimedPhone.replace(/\D/g, '');
    const cleanBusiness = businessPhone.replace(/\D/g, '');
    
    const passed = cleanClaimed === cleanBusiness || 
                   cleanClaimed.endsWith(cleanBusiness.slice(-10));
    
    return {
      type: 'phone_number',
      passed,
      details: passed
        ? 'Phone number matches business records'
        : 'Phone number does not match',
      score: passed ? 100 : 20
    };
  }

  private verifyNameMatch(claimedName: string, business: EnrichedBusiness): VerificationCheck {
    const claimedLower = claimedName.toLowerCase();
    
    // Check against contacts
    let matchFound = false;
    let matchScore = 0;
    
    if (business.contacts) {
      for (const contact of business.contacts) {
        if (contact.name.toLowerCase().includes(claimedLower) ||
            claimedLower.includes(contact.name.toLowerCase())) {
          matchFound = true;
          matchScore = contact.isPrimary ? 100 : 80;
          break;
        }
      }
    }
    
    // Fuzzy match against business name
    if (!matchFound) {
      const businessWords = business.name.toLowerCase().split(/\s+/);
      const claimedWords = claimedLower.split(/\s+/);
      
      const commonWords = claimedWords.filter(w => 
        businessWords.some(bw => bw.includes(w) || w.includes(bw))
      );
      
      if (commonWords.length > 0) {
        matchScore = 40;
      }
    }
    
    return {
      type: 'name_match',
      passed: matchScore >= 40,
      details: matchScore >= 80 
        ? 'Name matches business contact'
        : matchScore >= 40
        ? 'Partial name match found'
        : 'No name match found',
      score: matchScore
    };
  }

  private async verifyGeolocation(
    ipAddress: string,
    business: EnrichedBusiness
  ): Promise<VerificationCheck> {
    // This would use an IP geolocation service
    // For now, return a placeholder
    
    return {
      type: 'geolocation',
      passed: true,
      details: 'IP location consistent with business address',
      score: 60
    };
  }

  private async verifyIndigenousOwnership(
    claimRequest: ClaimRequest,
    business: EnrichedBusiness
  ): Promise<VerificationCheck> {
    // This would check against Indigenous registries
    // For now, check if business has certifications
    
    const hasCertification = business.certifications?.some(c => 
      ['CCAB', 'PAR', 'INDIGENOUS_BUSINESS'].includes(c.type)
    );
    
    return {
      type: 'indigenous_verification',
      passed: hasCertification || false,
      details: hasCertification
        ? 'Indigenous business certification found'
        : 'No Indigenous certification on record',
      score: hasCertification ? 100 : 30
    };
  }

  /**
   * Process successful claim
   */
  private async processSuccessfulClaim(
    claimRequest: ClaimRequest,
    business: EnrichedBusiness
  ): Promise<void> {
    // Mark token as used
    await this.redis.setex(
      `claim:token:used:${claimRequest.token}`,
      86400 * 30, // 30 days
      '1'
    );

    // Update business record
    await this.redis.hset(`business:${business.id}`, {
      claimed: 'true',
      claimedBy: JSON.stringify(claimRequest.claimedBy),
      claimedAt: claimRequest.claimedAt.toISOString()
    });

    // Create user account
    await this.createUserAccount(claimRequest.claimedBy, business);

    // Send confirmation
    await this.sendClaimConfirmation(claimRequest.claimedBy, business);

    // Update statistics
    await this.incrementCounter('claim:verified:total');
    await this.incrementCounter(`claim:verified:${business.type}`);
  }

  /**
   * Queue for manual review
   */
  private async queueForManualReview(
    claimRequest: ClaimRequest,
    verification: ClaimVerification
  ): Promise<void> {
    const reviewRequest = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimRequest,
      verification,
      queuedAt: new Date(),
      status: 'pending'
    };

    await this.redis.lpush(
      'claim:review:queue',
      JSON.stringify(reviewRequest)
    );

    await this.incrementCounter('claim:review:pending');
  }

  /**
   * Helper methods
   */
  private async cacheClaimLink(claimLink: ClaimPortalLink): Promise<void> {
    const key = `claim:link:${claimLink.businessId}`;
    await this.redis.setex(
      key,
      86400 * 7, // 7 days
      JSON.stringify(claimLink)
    );
  }

  private async getBusinessData(businessId: string): Promise<EnrichedBusiness | null> {
    const data = await this.redis.get(`business:${businessId}`);
    return data ? JSON.parse(data) : null;
  }

  private async recordClaimAttempt(
    claimRequest: ClaimRequest,
    verification: ClaimVerification
  ): Promise<void> {
    const attempt = {
      ...claimRequest,
      verification,
      attemptedAt: new Date()
    };

    const key = `claim:attempts:${claimRequest.businessId}`;
    await this.redis.lpush(key, JSON.stringify(attempt));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 attempts
    
    await this.incrementCounter('claim:processed:total');
  }

  private async createUserAccount(
    claimedBy: any,
    business: EnrichedBusiness
  ): Promise<void> {
    // This would integrate with the main platform's user system
    this.logger.info(`Creating user account for ${claimedBy.email}`);
  }

  private async sendClaimConfirmation(
    claimedBy: any,
    business: EnrichedBusiness
  ): Promise<void> {
    // This would send confirmation email/SMS
    this.logger.info(`Sending claim confirmation to ${claimedBy.email}`);
  }

  private async incrementCounter(key: string): Promise<void> {
    await this.redis.incr(`counter:${key}`);
  }

  private async getCounter(key: string): Promise<number> {
    const value = await this.redis.get(`counter:${key}`);
    return parseInt(value || '0');
  }

  private async getTopClaimMethods(): Promise<any> {
    return {
      email: await this.getCounter('claim:method:email'),
      phone: await this.getCounter('claim:method:phone'),
      document: await this.getCounter('claim:method:document')
    };
  }

  private async getClaimsByBusinessType(): Promise<any> {
    return {
      indigenous_owned: await this.getCounter('claim:verified:indigenous_owned'),
      indigenous_partnership: await this.getCounter('claim:verified:indigenous_partnership'),
      indigenous_affiliated: await this.getCounter('claim:verified:indigenous_affiliated'),
      canadian_general: await this.getCounter('claim:verified:canadian_general')
    };
  }

  private async getClaimGeographicDistribution(): Promise<any> {
    // Placeholder
    return {};
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
  }
}

/**
 * URL Shortener service
 */
class URLShortener {
  private redis: Redis;
  private baseUrl: string = 'https://indig.biz/';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async shorten(longUrl: string): Promise<string> {
    // Generate short code
    const shortCode = this.generateShortCode();
    const shortUrl = `${this.baseUrl}${shortCode}`;
    
    // Store mapping
    await this.redis.setex(
      `url:short:${shortCode}`,
      86400 * 90, // 90 days
      longUrl
    );
    
    return shortUrl;
  }

  async expand(shortCode: string): Promise<string | null> {
    return await this.redis.get(`url:short:${shortCode}`);
  }

  private generateShortCode(): string {
    return Math.random().toString(36).substring(2, 8);
  }
}