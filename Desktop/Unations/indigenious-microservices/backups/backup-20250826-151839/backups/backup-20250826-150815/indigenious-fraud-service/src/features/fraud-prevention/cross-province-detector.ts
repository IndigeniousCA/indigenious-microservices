/**
 * Cross-Province Fraud Detection Engine
 * Detects and prevents businesses from claiming false Indigenous status across provinces
 * This is our shield against bad actors trying to game the system
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';
import crypto from 'crypto';

// Fraud detection schemas
export const BusinessProfileSchema = z.object({
  businessName: z.string(),
  ownerName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
  }),
  indigenousAffiliation: z.object({
    nation: z.string(),
    territory: z.string(),
    bandNumber: z.string().optional(),
    membershipNumber: z.string().optional(),
  }),
  businessNumber: z.string().optional(),
  gstNumber: z.string().optional(),
});

export interface FraudRiskAssessment {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: FraudFlag[];
  similarProfiles: SimilarProfile[];
  recommendations: string[];
  requiresManualReview: boolean;
}

export interface FraudFlag {
  type: string;
  severity: 'warning' | 'alert' | 'critical';
  description: string;
  evidence: any;
}

export interface SimilarProfile {
  businessId: string;
  businessName: string;
  province: string;
  similarityScore: number;
  matchedFields: string[];
}

export class CrossProvinceFraudDetector {
  private static readonly SIMILARITY_THRESHOLD = 0.85;
  private static readonly CRITICAL_FLAGS = [
    'duplicate_band_number',
    'conflicting_nation_claims',
    'banned_individual',
    'multiple_active_businesses',
  ];
  
  /**
   * Analyze a business profile for fraud risk
   * This runs on every registration and update
   */
  static async analyzeProfile(profile: z.infer<typeof BusinessProfileSchema>): Promise<FraudRiskAssessment> {
    const validated = BusinessProfileSchema.parse(profile);
    
    const flags: FraudFlag[] = [];
    const similarProfiles: SimilarProfile[] = [];
    
    // Run all fraud checks in parallel
    const [
      nameCheck,
      emailCheck,
      phoneCheck,
      addressCheck,
      affiliationCheck,
      businessNumberCheck,
      velocityCheck,
      networkCheck,
    ] = await Promise.all([
      this.checkNameVariations(validated),
      this.checkEmailPatterns(validated),
      this.checkPhonePatterns(validated),
      this.checkAddressAnomalies(validated),
      this.checkIndigenousAffiliation(validated),
      this.checkBusinessNumbers(validated),
      this.checkVelocity(validated),
      this.checkNetworkAnalysis(validated),
    ]);
    
    // Aggregate flags
    flags.push(...nameCheck.flags);
    flags.push(...emailCheck.flags);
    flags.push(...phoneCheck.flags);
    flags.push(...addressCheck.flags);
    flags.push(...affiliationCheck.flags);
    flags.push(...businessNumberCheck.flags);
    flags.push(...velocityCheck.flags);
    flags.push(...networkCheck.flags);
    
    // Find similar profiles
    similarProfiles.push(...nameCheck.similar);
    similarProfiles.push(...emailCheck.similar);
    similarProfiles.push(...phoneCheck.similar);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(flags, similarProfiles);
    const riskLevel = this.determineRiskLevel(riskScore, flags);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(flags, riskLevel);
    
    // Determine if manual review needed
    const requiresManualReview = riskLevel === 'high' || riskLevel === 'critical' || 
      flags.some(f => this.CRITICAL_FLAGS.includes(f.type));
    
    // Log the assessment
    await this.logFraudAssessment({
      profile: validated,
      assessment: { riskScore, riskLevel, flags, similarProfiles, recommendations, requiresManualReview },
    });
    
    // If critical risk, notify immediately
    if (riskLevel === 'critical') {
      await this.notifyFraudTeam(validated, flags);
    }
    
    return {
      riskScore,
      riskLevel,
      flags,
      similarProfiles,
      recommendations,
      requiresManualReview,
    };
  }
  
  /**
   * Check for name variations across provinces
   */
  private static async checkNameVariations(profile: unknown): Promise<{
    flags: FraudFlag[];
    similar: SimilarProfile[];
  }> {
    const flags: FraudFlag[] = [];
    const similar: SimilarProfile[] = [];
    
    // Normalize names for comparison
    const normalizedBusinessName = this.normalizeString(profile.businessName);
    const normalizedOwnerName = this.normalizeString(profile.ownerName);
    
    // Search for similar business names
    const similarBusinesses = await prisma.business.findMany({
      where: {
        OR: [
          { normalizedName: { contains: normalizedBusinessName } },
          { ownerName: { contains: normalizedOwnerName } },
        ],
        province: { not: profile.address.province },
      },
      include: {
        verifications: true,
      },
    });
    
    for (const business of similarBusinesses) {
      const nameSimilarity = this.calculateStringSimilarity(
        normalizedBusinessName,
        business.normalizedName || ''
      );
      
      const ownerSimilarity = this.calculateStringSimilarity(
        normalizedOwnerName,
        business.ownerName || ''
      );
      
      if (nameSimilarity > this.SIMILARITY_THRESHOLD || ownerSimilarity > this.SIMILARITY_THRESHOLD) {
        similar.push({
          businessId: business.id,
          businessName: business.businessName,
          province: business.province,
          similarityScore: Math.max(nameSimilarity, ownerSimilarity),
          matchedFields: [
            ...(nameSimilarity > this.SIMILARITY_THRESHOLD ? ['businessName'] : []),
            ...(ownerSimilarity > this.SIMILARITY_THRESHOLD ? ['ownerName'] : []),
          ],
        });
        
        flags.push({
          type: 'similar_business_different_province',
          severity: 'alert',
          description: `Similar business "${business.businessName}" found in ${business.province}`,
          evidence: {
            existingBusinessId: business.id,
            nameSimilarity,
            ownerSimilarity,
          },
        });
      }
    }
    
    return { flags, similar };
  }
  
  /**
   * Check email patterns for fraud
   */
  private static async checkEmailPatterns(profile: unknown): Promise<{
    flags: FraudFlag[];
    similar: SimilarProfile[];
  }> {
    const flags: FraudFlag[] = [];
    const similar: SimilarProfile[] = [];
    
    // Check for disposable email
    if (this.isDisposableEmail(profile.email)) {
      flags.push({
        type: 'disposable_email',
        severity: 'warning',
        description: 'Using disposable email address',
        evidence: { email: profile.email },
      });
    }
    
    // Check for email variations
    const emailDomain = profile.email.split('@')[1];
    const emailLocal = profile.email.split('@')[0];
    
    // Look for similar emails (john.doe vs johndoe vs john_doe)
    const emailPattern = emailLocal.replace(/[._-]/g, '');
    const similarEmails = await prisma.business.findMany({
      where: {
        email: {
          contains: emailPattern,
          mode: 'insensitive',
        },
        province: { not: profile.address.province },
      },
    });
    
    for (const business of similarEmails) {
      if (this.areEmailsSimilar(profile.email, business.email)) {
        flags.push({
          type: 'similar_email_different_province',
          severity: 'alert',
          description: `Similar email pattern found in ${business.province}`,
          evidence: {
            existingEmail: business.email,
            province: business.province,
          },
        });
      }
    }
    
    return { flags, similar };
  }
  
  /**
   * Check phone patterns
   */
  private static async checkPhonePatterns(profile: unknown): Promise<{
    flags: FraudFlag[];
    similar: SimilarProfile[];
  }> {
    const flags: FraudFlag[] = [];
    const similar: SimilarProfile[] = [];
    
    // Normalize phone number
    const normalizedPhone = profile.phone.replace(/\D/g, '');
    
    // Check if phone area code matches province
    const expectedAreaCodes = this.getAreaCodesForProvince(profile.address.province);
    const phoneAreaCode = normalizedPhone.substring(0, 3);
    
    if (!expectedAreaCodes.includes(phoneAreaCode)) {
      flags.push({
        type: 'mismatched_phone_area_code',
        severity: 'warning',
        description: `Phone area code ${phoneAreaCode} doesn't match province ${profile.address.province}`,
        evidence: {
          phone: profile.phone,
          expectedAreaCodes,
        },
      });
    }
    
    // Check for duplicate phones
    const duplicatePhone = await prisma.business.findFirst({
      where: {
        phone: normalizedPhone,
        province: { not: profile.address.province },
      },
    });
    
    if (duplicatePhone) {
      flags.push({
        type: 'duplicate_phone_different_province',
        severity: 'alert',
        description: `Phone number already used in ${duplicatePhone.province}`,
        evidence: {
          existingBusinessId: duplicatePhone.id,
          province: duplicatePhone.province,
        },
      });
    }
    
    return { flags, similar };
  }
  
  /**
   * Check address anomalies
   */
  private static async checkAddressAnomalies(profile: unknown): Promise<{
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];
    
    // Check for PO Box as primary address
    if (profile.address.street.toLowerCase().includes('po box') || 
        profile.address.street.toLowerCase().includes('p.o. box')) {
      flags.push({
        type: 'po_box_address',
        severity: 'warning',
        description: 'Using PO Box as business address',
        evidence: { address: profile.address.street },
      });
    }
    
    // Check for virtual office indicators
    const virtualOfficeKeywords = ['virtual', 'regus', 'wework', 'spaces'];
    if (virtualOfficeKeywords.some(keyword => 
      profile.address.street.toLowerCase().includes(keyword))) {
      flags.push({
        type: 'virtual_office_address',
        severity: 'warning',
        description: 'Address appears to be a virtual office',
        evidence: { address: profile.address.street },
      });
    }
    
    // Verify postal code format for province
    const postalCodeValid = this.validatePostalCode(
      profile.address.postalCode,
      profile.address.province
    );
    
    if (!postalCodeValid) {
      flags.push({
        type: 'invalid_postal_code',
        severity: 'alert',
        description: 'Postal code doesn\'t match province',
        evidence: {
          postalCode: profile.address.postalCode,
          province: profile.address.province,
        },
      });
    }
    
    return { flags };
  }
  
  /**
   * Check Indigenous affiliation claims
   */
  private static async checkIndigenousAffiliation(profile: unknown): Promise<{
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];
    
    // Check if band number is already in use
    if (profile.indigenousAffiliation.bandNumber) {
      const duplicateBand = await prisma.business.findFirst({
        where: {
          bandNumber: profile.indigenousAffiliation.bandNumber,
          id: { not: profile.id },
        },
      });
      
      if (duplicateBand) {
        flags.push({
          type: 'duplicate_band_number',
          severity: 'critical',
          description: 'Band number already registered to another business',
          evidence: {
            existingBusinessId: duplicateBand.id,
            bandNumber: profile.indigenousAffiliation.bandNumber,
          },
        });
      }
    }
    
    // Verify nation and territory combination
    const validCombination = await this.verifyNationTerritory(
      profile.indigenousAffiliation.nation,
      profile.indigenousAffiliation.territory,
      profile.address.province
    );
    
    if (!validCombination) {
      flags.push({
        type: 'invalid_nation_territory_combination',
        severity: 'alert',
        description: 'Nation and territory combination doesn\'t match known records',
        evidence: {
          nation: profile.indigenousAffiliation.nation,
          territory: profile.indigenousAffiliation.territory,
          province: profile.address.province,
        },
      });
    }
    
    // Check for conflicting claims
    const conflictingClaims = await prisma.business.findMany({
      where: {
        ownerName: profile.ownerName,
        nation: { not: profile.indigenousAffiliation.nation },
      },
    });
    
    if (conflictingClaims.length > 0) {
      flags.push({
        type: 'conflicting_nation_claims',
        severity: 'critical',
        description: 'Same owner claiming different nations',
        evidence: {
          currentClaim: profile.indigenousAffiliation.nation,
          previousClaims: conflictingClaims.map(c => c.nation),
        },
      });
    }
    
    return { flags };
  }
  
  /**
   * Check business numbers
   */
  private static async checkBusinessNumbers(profile: unknown): Promise<{
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];
    
    // Validate business number format
    if (profile.businessNumber && !this.isValidBusinessNumber(profile.businessNumber)) {
      flags.push({
        type: 'invalid_business_number',
        severity: 'alert',
        description: 'Business number format is invalid',
        evidence: { businessNumber: profile.businessNumber },
      });
    }
    
    // Check for duplicate business numbers
    if (profile.businessNumber) {
      const duplicate = await prisma.business.findFirst({
        where: {
          businessNumber: profile.businessNumber,
          id: { not: profile.id },
        },
      });
      
      if (duplicate) {
        flags.push({
          type: 'duplicate_business_number',
          severity: 'critical',
          description: 'Business number already registered',
          evidence: {
            existingBusinessId: duplicate.id,
            province: duplicate.province,
          },
        });
      }
    }
    
    return { flags };
  }
  
  /**
   * Check velocity (rapid registrations)
   */
  private static async checkVelocity(profile: unknown): Promise<{
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];
    
    // Check registrations from same IP
    const recentFromIP = await prisma.businessRegistration.count({
      where: {
        ipAddress: profile.ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });
    
    if (recentFromIP > 3) {
      flags.push({
        type: 'high_velocity_same_ip',
        severity: 'alert',
        description: `${recentFromIP} registrations from same IP in 24 hours`,
        evidence: { count: recentFromIP, ipAddress: profile.ipAddress },
      });
    }
    
    // Check registrations with similar details
    const recentSimilar = await prisma.business.count({
      where: {
        OR: [
          { email: { contains: profile.email.split('@')[0] } },
          { ownerName: { contains: profile.ownerName.split(' ')[0] } },
        ],
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });
    
    if (recentSimilar > 5) {
      flags.push({
        type: 'high_velocity_similar_details',
        severity: 'warning',
        description: `${recentSimilar} similar registrations in past week`,
        evidence: { count: recentSimilar },
      });
    }
    
    return { flags };
  }
  
  /**
   * Network analysis - check connections
   */
  private static async checkNetworkAnalysis(profile: unknown): Promise<{
    flags: FraudFlag[];
  }> {
    const flags: FraudFlag[] = [];
    
    // Check if email/phone connected to banned accounts
    const bannedConnections = await prisma.bannedEntity.findMany({
      where: {
        OR: [
          { email: profile.email },
          { phone: profile.phone },
          { ipAddress: profile.ipAddress },
        ],
      },
    });
    
    if (bannedConnections.length > 0) {
      flags.push({
        type: 'banned_individual',
        severity: 'critical',
        description: 'Connected to previously banned account',
        evidence: {
          bannedEntities: bannedConnections.map(b => ({
            reason: b.reason,
            date: b.createdAt,
          })),
        },
      });
    }
    
    // Check shared details with flagged accounts
    const flaggedConnections = await prisma.business.count({
      where: {
        OR: [
          { bankAccount: profile.bankAccount },
          { taxId: profile.taxId },
        ],
        fraudScore: { gt: 70 },
      },
    });
    
    if (flaggedConnections > 0) {
      flags.push({
        type: 'connected_to_flagged_accounts',
        severity: 'alert',
        description: 'Shares details with high-risk accounts',
        evidence: { connectedAccounts: flaggedConnections },
      });
    }
    
    return { flags };
  }
  
  /**
   * Calculate overall risk score
   */
  private static calculateRiskScore(flags: FraudFlag[], similarProfiles: SimilarProfile[]): number {
    let score = 0;
    
    // Base score from flags
    for (const flag of flags) {
      switch (flag.severity) {
        case 'warning':
          score += 10;
          break;
        case 'alert':
          score += 25;
          break;
        case 'critical':
          score += 50;
          break;
      }
    }
    
    // Additional score from similar profiles
    score += similarProfiles.length * 15;
    
    // Cap at 100
    return Math.min(score, 100);
  }
  
  /**
   * Determine risk level
   */
  private static determineRiskLevel(score: number, flags: FraudFlag[]): 'low' | 'medium' | 'high' | 'critical' {
    // Any critical flag = critical risk
    if (flags.some(f => f.severity === 'critical')) {
      return 'critical';
    }
    
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }
  
  /**
   * Generate recommendations based on flags
   */
  private static generateRecommendations(flags: FraudFlag[], riskLevel: string): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical') {
      recommendations.push('Require manual verification before approval');
      recommendations.push('Request additional documentation');
      recommendations.push('Conduct video verification call');
    }
    
    if (flags.some(f => f.type === 'duplicate_band_number')) {
      recommendations.push('Verify band membership directly with band office');
    }
    
    if (flags.some(f => f.type === 'similar_business_different_province')) {
      recommendations.push('Check if legitimate expansion or fraudulent duplicate');
    }
    
    if (flags.some(f => f.type === 'po_box_address')) {
      recommendations.push('Request physical business address');
    }
    
    return recommendations;
  }
  
  /**
   * Helper methods
   */
  private static normalizeString(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private static isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com', 'throwaway.email', 'guerrillamail.com',
      '10minutemail.com', 'mailinator.com', 'yopmail.com',
    ];
    const domain = email.split('@')[1];
    return disposableDomains.includes(domain);
  }
  
  private static areEmailsSimilar(email1: string, email2: string): boolean {
    const [local1, domain1] = email1.split('@');
    const [local2, domain2] = email2.split('@');
    
    if (domain1 !== domain2) return false;
    
    const normalized1 = local1.replace(/[._-]/g, '');
    const normalized2 = local2.replace(/[._-]/g, '');
    
    return this.calculateStringSimilarity(normalized1, normalized2) > 0.9;
  }
  
  private static getAreaCodesForProvince(province: string): string[] {
    const areaCodes = {
      'AB': ['403', '587', '780', '825'],
      'BC': ['236', '250', '604', '672', '778'],
      'MB': ['204', '431'],
      'NB': ['506'],
      'NL': ['709'],
      'NS': ['782', '902'],
      'NT': ['867'],
      'NU': ['867'],
      'ON': ['226', '249', '289', '343', '365', '416', '437', '519', '548', '613', '647', '705', '807', '905'],
      'PE': ['782', '902'],
      'QC': ['367', '418', '438', '450', '514', '579', '581', '819', '873'],
      'SK': ['306', '639'],
      'YT': ['867'],
    };
    return areaCodes[province] || [];
  }
  
  private static validatePostalCode(postalCode: string, province: string): boolean {
    // Canadian postal code format: A1A 1A1
    const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) return false;
    
    // First letter indicates province/region
    const firstLetter = cleaned[0];
    const provinceLetters = {
      'NL': ['A'],
      'NS': ['B'],
      'PE': ['C'],
      'NB': ['E'],
      'QC': ['G', 'H', 'J'],
      'ON': ['K', 'L', 'M', 'N', 'P'],
      'MB': ['R'],
      'SK': ['S'],
      'AB': ['T'],
      'BC': ['V'],
      'NT': ['X'],
      'NU': ['X'],
      'YT': ['Y'],
    };
    
    return provinceLetters[province]?.includes(firstLetter) || false;
  }
  
  private static async verifyNationTerritory(
    nation: string,
    territory: string,
    province: string
  ): Promise<boolean> {
    // In production, this would check against a comprehensive database
    // For now, basic validation
    return true;
  }
  
  private static isValidBusinessNumber(bn: string): boolean {
    // Canadian BN format: 9 digits + optional program identifier
    return /^\d{9}(RC\d{4})?$/.test(bn.replace(/\s/g, ''));
  }
  
  private static async logFraudAssessment(data: unknown): Promise<void> {
    await prisma.fraudAssessmentLog.create({
      data: {
        businessProfile: data.profile,
        assessment: data.assessment,
        timestamp: new Date(),
      },
    });
  }
  
  private static async notifyFraudTeam(profile: any, flags: FraudFlag[]): Promise<void> {
    // Send immediate notification to fraud team
    logger.info('CRITICAL FRAUD ALERT:', {
      business: profile.businessName,
      flags: flags.filter(f => f.severity === 'critical'),
    });
    
    // In production: Send email, Slack, SMS alerts
  }
  
  /**
   * Get fraud statistics
   */
  static async getFraudStats(): Promise<{
    totalAssessments: number;
    flaggedToday: number;
    criticalAlerts: number;
    preventedFraud: number;
    commonPatterns: unknown[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [total, flagged, critical, prevented] = await Promise.all([
      prisma.fraudAssessmentLog.count(),
      prisma.fraudAssessmentLog.count({
        where: {
          timestamp: { gte: today },
          'assessment.riskLevel': { in: ['high', 'critical'] },
        },
      }),
      prisma.fraudAssessmentLog.count({
        where: {
          'assessment.riskLevel': 'critical',
        },
      }),
      prisma.business.count({
        where: {
          status: 'rejected',
          rejectionReason: { contains: 'fraud' },
        },
      }),
    ]);
    
    // Get common fraud patterns
    const patterns = await prisma.fraudAssessmentLog.groupBy({
      by: ['assessment.flags.type'],
      _count: true,
      orderBy: { _count: { 'assessment.flags.type': 'desc' } },
      take: 5,
    });
    
    return {
      totalAssessments: total,
      flaggedToday: flagged,
      criticalAlerts: critical,
      preventedFraud: prevented,
      commonPatterns: patterns,
    };
  }
}

export default CrossProvinceFraudDetector;