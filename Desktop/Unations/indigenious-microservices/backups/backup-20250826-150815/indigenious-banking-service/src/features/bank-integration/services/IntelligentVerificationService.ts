/**
 * Intelligent Verification Service
 * Enhanced risk scoring and verification with ML capabilities
 * Builds on existing Indigenous verification system
 */

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { verifyIndigenousStatus } from '@/lib/auth/indigenous-verification';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import { PredictionService } from '@/features/predictive-analytics/services/PredictionService';
import { AIIntelligenceService } from '@/features/ai-intelligence/services/AIIntelligenceService';
import { redisEncryption } from './RedisEncryptionService';
import { auditLogger } from './AuditLogger';

// Risk score schema
export const RiskScoreSchema = z.object({
  businessId: z.string(),
  overallScore: z.number().min(0).max(100),
  components: z.object({
    ownershipVerification: z.number().min(0).max(100),
    financialStability: z.number().min(0).max(100),
    pastPerformance: z.number().min(0).max(100),
    communityStanding: z.number().min(0).max(100),
    capacityAssessment: z.number().min(0).max(100)
  }),
  confidenceLevel: z.enum(['high', 'medium', 'low']),
  lastUpdated: z.date(),
  expiresAt: z.date(),
  verificationSources: z.array(z.string()),
  alerts: z.array(z.object({
    type: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    message: z.string()
  })).optional()
});

export type RiskScore = z.infer<typeof RiskScoreSchema>;

// Verification sources
export enum VerificationSource {
  ISC_REGISTRY = 'isc_registry', // Indigenous Services Canada
  CCAB_MEMBERSHIP = 'ccab_membership', // Canadian Council for Aboriginal Business
  COMMUNITY_ATTESTATION = 'community_attestation',
  BANK_VERIFICATION = 'bank_verification',
  GOVERNMENT_CONTRACTS = 'government_contracts',
  NETWORK_ANALYSIS = 'network_analysis'
}

export class IntelligentVerificationService {
  private static instance: IntelligentVerificationService;
  private predictionService: PredictionService;
  private aiService: AIIntelligenceService;
  
  private readonly CACHE_PREFIX = 'risk_score:';
  private readonly DEFAULT_CACHE_TTL = 86400; // 24 hours
  private readonly HIGH_RISK_CACHE_TTL = 3600; // 1 hour for high-risk businesses
  
  private constructor() {
    this.predictionService = new PredictionService();
    this.aiService = new AIIntelligenceService();
  }
  
  static getInstance(): IntelligentVerificationService {
    if (!IntelligentVerificationService.instance) {
      IntelligentVerificationService.instance = new IntelligentVerificationService();
    }
    return IntelligentVerificationService.instance;
  }
  
  /**
   * Verify Indigenous business with enhanced risk scoring
   */
  async verifyIndigenousBusiness(businessId: string, options?: {
    forceRefresh?: boolean;
    includeNetworkAnalysis?: boolean;
    contractValue?: number;
  }): Promise<RiskScore> {
    try {
      // Check cache first
      if (!options?.forceRefresh) {
        const cached = await this.getCachedScore(businessId);
        if (cached && this.isCacheValid(cached)) {
          logger.info('Returning cached risk score', { businessId });
          return cached;
        }
      }
      
      // Get business data
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          verificationDocuments: true,
          contracts: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          partnerships: true,
          financialRecords: true
        }
      });
      
      if (!business) {
        throw new Error('Business not found');
      }
      
      // Run multi-source verification in parallel
      const verificationResults = await Promise.all([
        this.verifyISCRegistry(business),
        this.verifyCCABMembership(business),
        this.verifyCommunityAttestation(business),
        this.checkOwnershipStructure(business),
        this.analyzeFinancialStability(business),
        this.assessPastPerformance(business),
        options?.includeNetworkAnalysis ? this.analyzeBusinessRelationships(business) : null
      ].filter(Boolean));
      
      // Calculate risk score
      const riskScore = await this.calculateRiskScore(business, verificationResults, options);
      
      // Store in cache with intelligent TTL
      const ttl = this.calculateCacheTTL(riskScore);
      await this.cacheScore(businessId, riskScore, ttl);
      
      // Store in database
      await this.saveRiskScore(riskScore);
      
      // Log to blockchain for audit
      await indigenousLedger.log(
        'verification.completed',
        'info',
        'Indigenous business verification completed',
        {
          businessId,
          overallScore: riskScore.overallScore,
          confidenceLevel: riskScore.confidenceLevel,
          verificationSources: riskScore.verificationSources
        }
      );
      
      // SOC 2 audit logging
      await auditLogger.logEvent({
        eventType: 'data_read',
        action: 'business_risk_verification',
        resource: {
          type: 'business',
          id: businessId,
          name: business.name
        },
        metadata: {
          overallScore: riskScore.overallScore,
          confidenceLevel: riskScore.confidenceLevel,
          cached: !options?.forceRefresh && !!cached
        }
      });
      
      return riskScore;
      
    } catch (error) {
      logger.error('Failed to verify Indigenous business', { error, businessId });
      throw error;
    }
  }
  
  /**
   * Verify ISC Registry
   */
  private async verifyISCRegistry(business: any): Promise<{
    source: VerificationSource;
    verified: boolean;
    score: number;
    details: any;
  }> {
    try {
      // In production, this would call ISC API
      // For now, check if business has ISC registration number
      const hasISCNumber = !!business.metadata?.iscRegistrationNumber;
      const isRecent = business.createdAt > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      return {
        source: VerificationSource.ISC_REGISTRY,
        verified: hasISCNumber,
        score: hasISCNumber ? (isRecent ? 90 : 100) : 0,
        details: {
          registrationNumber: business.metadata?.iscRegistrationNumber,
          registrationDate: business.createdAt
        }
      };
    } catch (error) {
      logger.error('ISC verification failed', { error });
      return {
        source: VerificationSource.ISC_REGISTRY,
        verified: false,
        score: 0,
        details: { error: error.message }
      };
    }
  }
  
  /**
   * Verify CCAB Membership
   */
  private async verifyCCABMembership(business: any): Promise<{
    source: VerificationSource;
    verified: boolean;
    score: number;
    details: any;
  }> {
    // Check for CCAB certification
    const hasCCAB = business.certifications?.some((cert: any) => 
      cert.type === 'CCAB' && cert.status === 'active'
    );
    
    return {
      source: VerificationSource.CCAB_MEMBERSHIP,
      verified: hasCCAB,
      score: hasCCAB ? 95 : 0,
      details: {
        certificationLevel: hasCCAB ? business.certifications.find((c: any) => c.type === 'CCAB').level : null
      }
    };
  }
  
  /**
   * Verify Community Attestation
   */
  private async verifyCommunityAttestation(business: any): Promise<{
    source: VerificationSource;
    verified: boolean;
    score: number;
    details: any;
  }> {
    const attestation = await prisma.communityAttestation.findFirst({
      where: {
        businessId: business.id,
        status: 'approved'
      },
      include: {
        approver: true
      }
    });
    
    return {
      source: VerificationSource.COMMUNITY_ATTESTATION,
      verified: !!attestation,
      score: attestation ? 100 : 0,
      details: {
        attestationId: attestation?.id,
        approver: attestation?.approver?.name,
        approvedDate: attestation?.createdAt
      }
    };
  }
  
  /**
   * Check Ownership Structure
   */
  private async checkOwnershipStructure(business: any): Promise<{
    ownershipScore: number;
    indigenousPercentage: number;
    verifiedOwners: number;
    totalOwners: number;
  }> {
    // Use existing Indigenous verification
    const verificationResult = await verifyIndigenousStatus({
      name: business.name,
      registrationNumber: business.registrationNumber,
      communityAffiliation: business.communityAffiliation,
      indigenousOwnership: business.indigenousOwnership || 0,
      documents: business.verificationDocuments?.map((d: any) => d.id),
      contractValue: 0
    });
    
    return {
      ownershipScore: verificationResult.trustScore || 0,
      indigenousPercentage: business.indigenousOwnership || 0,
      verifiedOwners: business.metadata?.verifiedOwners || 0,
      totalOwners: business.metadata?.totalOwners || 1
    };
  }
  
  /**
   * Analyze Financial Stability
   */
  private async analyzeFinancialStability(business: any): Promise<{
    stabilityScore: number;
    metrics: any;
  }> {
    const financialMetrics = {
      revenue: business.financialRecords?.totalRevenue || 0,
      employees: business.employeeCount || 0,
      contractsCompleted: business.contracts?.filter((c: any) => c.status === 'completed').length || 0,
      avgContractValue: business.contracts?.reduce((sum: number, c: any) => sum + c.value, 0) / (business.contracts?.length || 1),
      paymentHistory: business.metadata?.paymentHistoryScore || 100
    };
    
    // Use AI to predict financial stability
    const prediction = await this.predictionService.predict({
      input: financialMetrics,
      modelType: 'regression',
      options: { feature: 'financial_stability' }
    });
    
    return {
      stabilityScore: Math.min(100, Math.max(0, prediction.value * 100)),
      metrics: financialMetrics
    };
  }
  
  /**
   * Assess Past Performance
   */
  private async assessPastPerformance(business: any): Promise<{
    performanceScore: number;
    completionRate: number;
    avgDelay: number;
    disputes: number;
  }> {
    const completedContracts = business.contracts?.filter((c: any) => c.status === 'completed') || [];
    const totalContracts = business.contracts?.length || 0;
    
    const metrics = {
      completionRate: totalContracts > 0 ? completedContracts.length / totalContracts : 0,
      avgDelay: 0, // Would calculate from contract timelines
      disputes: business.metadata?.disputeCount || 0,
      ratings: business.metadata?.avgRating || 5
    };
    
    const performanceScore = 
      (metrics.completionRate * 40) +
      (metrics.disputes === 0 ? 30 : 15) +
      ((metrics.ratings / 5) * 30);
    
    return {
      performanceScore,
      ...metrics
    };
  }
  
  /**
   * Analyze Business Relationships (Network Analysis)
   */
  private async analyzeBusinessRelationships(business: any): Promise<{
    networkScore: number;
    trustedConnections: number;
    riskConnections: number;
  }> {
    // Get business connections
    const connections = await prisma.businessConnection.findMany({
      where: {
        OR: [
          { businessId: business.id },
          { connectedBusinessId: business.id }
        ]
      },
      include: {
        business: true,
        connectedBusiness: true
      }
    });
    
    // Analyze network
    const trustedConnections = connections.filter(c => {
      const partner = c.businessId === business.id ? c.connectedBusiness : c.business;
      return partner.isVerified && partner.metadata?.riskScore < 30;
    }).length;
    
    const riskConnections = connections.filter(c => {
      const partner = c.businessId === business.id ? c.connectedBusiness : c.business;
      return partner.metadata?.riskScore > 70 || partner.metadata?.hasDisputes;
    }).length;
    
    const networkScore = trustedConnections > 0 
      ? Math.min(100, (trustedConnections / (trustedConnections + riskConnections)) * 100)
      : 50;
    
    return {
      networkScore,
      trustedConnections,
      riskConnections
    };
  }
  
  /**
   * Calculate Overall Risk Score
   */
  private async calculateRiskScore(
    business: any,
    verificationResults: any[],
    options?: any
  ): Promise<RiskScore> {
    // Extract scores from verification results
    const iscResult = verificationResults.find(r => r.source === VerificationSource.ISC_REGISTRY);
    const ccabResult = verificationResults.find(r => r.source === VerificationSource.CCAB_MEMBERSHIP);
    const communityResult = verificationResults.find(r => r.source === VerificationSource.COMMUNITY_ATTESTATION);
    const ownershipResult = verificationResults.find(r => r.ownershipScore !== undefined);
    const financialResult = verificationResults.find(r => r.stabilityScore !== undefined);
    const performanceResult = verificationResults.find(r => r.performanceScore !== undefined);
    const networkResult = verificationResults.find(r => r.networkScore !== undefined);
    
    // Calculate component scores
    const components = {
      ownershipVerification: ownershipResult?.ownershipScore || 0,
      financialStability: financialResult?.stabilityScore || 50,
      pastPerformance: performanceResult?.performanceScore || 50,
      communityStanding: Math.max(
        iscResult?.score || 0,
        ccabResult?.score || 0,
        communityResult?.score || 0
      ),
      capacityAssessment: this.assessCapacity(business, options?.contractValue)
    };
    
    // Weighted scoring
    const weights = {
      ownershipVerification: 0.3,
      financialStability: 0.2,
      pastPerformance: 0.2,
      communityStanding: 0.2,
      capacityAssessment: 0.1
    };
    
    const overallScore = Object.entries(components).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof typeof weights]);
    }, 0);
    
    // Determine confidence level
    const verificationSources = verificationResults
      .filter(r => r.verified)
      .map(r => r.source)
      .filter(Boolean);
    
    const confidenceLevel = 
      verificationSources.length >= 3 ? 'high' :
      verificationSources.length >= 2 ? 'medium' : 'low';
    
    // Check for alerts
    const alerts = this.generateAlerts(business, components, verificationResults);
    
    return {
      businessId: business.id,
      overallScore: Math.round(overallScore),
      components,
      confidenceLevel,
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + this.calculateCacheTTL({ overallScore, confidenceLevel } as RiskScore) * 1000),
      verificationSources,
      alerts: alerts.length > 0 ? alerts : undefined
    };
  }
  
  /**
   * Assess Business Capacity
   */
  private assessCapacity(business: any, contractValue?: number): number {
    if (!contractValue) return 75; // Default score if no contract value
    
    const avgContractValue = business.contracts?.reduce((sum: number, c: any) => sum + c.value, 0) / (business.contracts?.length || 1) || 0;
    const employeeCapacity = business.employeeCount || 1;
    const capacityRatio = contractValue / (avgContractValue || contractValue);
    
    if (capacityRatio > 10) return 20; // Very high risk - 10x normal capacity
    if (capacityRatio > 5) return 40;
    if (capacityRatio > 3) return 60;
    if (capacityRatio > 2) return 80;
    return 95; // Within normal capacity
  }
  
  /**
   * Generate Risk Alerts
   */
  private generateAlerts(business: any, components: any, verificationResults: any[]): any[] {
    const alerts = [];
    
    // Ownership alert
    if (components.ownershipVerification < 51) {
      alerts.push({
        type: 'ownership',
        severity: 'critical',
        message: 'Business does not meet minimum 51% Indigenous ownership requirement'
      });
    }
    
    // Financial stability alert
    if (components.financialStability < 30) {
      alerts.push({
        type: 'financial',
        severity: 'high',
        message: 'Low financial stability score indicates potential payment risks'
      });
    }
    
    // Performance alert
    if (components.pastPerformance < 40) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: 'Past performance issues detected'
      });
    }
    
    // New business alert
    if (business.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      alerts.push({
        type: 'new_business',
        severity: 'low',
        message: 'Business registered within last 90 days'
      });
    }
    
    return alerts;
  }
  
  /**
   * Calculate Cache TTL based on risk score
   */
  private calculateCacheTTL(riskScore: Pick<RiskScore, 'overallScore' | 'confidenceLevel'>): number {
    // High-risk businesses get shorter cache
    if (riskScore.overallScore < 30) return this.HIGH_RISK_CACHE_TTL;
    
    // Low confidence gets shorter cache
    if (riskScore.confidenceLevel === 'low') return 12 * 60 * 60; // 12 hours
    
    // Medium confidence
    if (riskScore.confidenceLevel === 'medium') return 24 * 60 * 60; // 24 hours
    
    // High confidence, low risk
    return 7 * 24 * 60 * 60; // 7 days
  }
  
  /**
   * Cache Management with Encryption
   * SOC 2 CC6.1: Encrypt sensitive risk scores at rest
   */
  private async getCachedScore(businessId: string): Promise<RiskScore | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${businessId}`;
      const cached = await redisEncryption.getEncrypted<RiskScore>(cacheKey, businessId);
      
      if (cached) {
        // Validate the cached data structure
        const parsed = RiskScoreSchema.safeParse(cached);
        if (parsed.success) {
          return parsed.data;
        }
        logger.warn('Invalid cached risk score structure', { businessId });
      }
      return null;
    } catch (error) {
      logger.error('Failed to get cached score', { error, businessId });
      return null;
    }
  }
  
  private async cacheScore(businessId: string, score: RiskScore, ttl: number): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${businessId}`;
      
      // Store encrypted score with metadata for SOC 2 compliance
      await redisEncryption.setEncrypted(
        cacheKey,
        score,
        ttl,
        {
          businessId,
          cachedAt: new Date().toISOString(),
          ttlSeconds: ttl,
          confidenceLevel: score.confidenceLevel
        }
      );
      
      logger.info('Risk score cached with encryption', {
        businessId,
        ttl,
        confidenceLevel: score.confidenceLevel
      });
    } catch (error) {
      logger.error('Failed to cache score', { error, businessId });
      // Don't throw - caching failure shouldn't break the flow
    }
  }
  
  private isCacheValid(score: RiskScore): boolean {
    return new Date() < new Date(score.expiresAt);
  }
  
  /**
   * Save Risk Score to Database
   */
  private async saveRiskScore(score: RiskScore): Promise<void> {
    try {
      await prisma.riskScore.create({
        data: {
          businessId: score.businessId,
          overallScore: score.overallScore,
          ownershipVerification: score.components.ownershipVerification,
          financialStability: score.components.financialStability,
          pastPerformance: score.components.pastPerformance,
          communityStanding: score.components.communityStanding,
          capacityAssessment: score.components.capacityAssessment,
          confidenceLevel: score.confidenceLevel,
          expiresAt: score.expiresAt,
          metadata: {
            verificationSources: score.verificationSources,
            alerts: score.alerts
          }
        }
      });
    } catch (error) {
      logger.error('Failed to save risk score', { error, score });
    }
  }
  
  /**
   * Bulk verification for multiple businesses
   */
  async bulkVerify(businessIds: string[], webhookUrl?: string): Promise<Map<string, RiskScore>> {
    const results = new Map<string, RiskScore>();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < businessIds.length; i += batchSize) {
      const batch = businessIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(id => this.verifyIndigenousBusiness(id)
          .catch(error => {
            logger.error('Bulk verification failed for business', { businessId: id, error });
            return null;
          })
        )
      );
      
      batch.forEach((id, index) => {
        if (batchResults[index]) {
          results.set(id, batchResults[index]);
        }
      });
    }
    
    // SOC 2: Log bulk operation
    await auditLogger.logEvent({
      eventType: 'data_read',
      action: 'bulk_business_verification',
      metadata: {
        totalRequested: businessIds.length,
        totalProcessed: results.size,
        batchSize,
        webhookProvided: !!webhookUrl
      }
    });
    
    // Send webhook if provided
    if (webhookUrl) {
      await this.sendWebhook(webhookUrl, {
        type: 'bulk_verification_complete',
        results: Array.from(results.entries()).map(([id, score]) => ({
          businessId: id,
          score: score.overallScore,
          confidence: score.confidenceLevel
        }))
      });
    }
    
    return results;
  }
  
  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      logger.error('Failed to send webhook', { error, url });
    }
  }
}

// Export singleton instance
export const intelligentVerificationService = IntelligentVerificationService.getInstance();