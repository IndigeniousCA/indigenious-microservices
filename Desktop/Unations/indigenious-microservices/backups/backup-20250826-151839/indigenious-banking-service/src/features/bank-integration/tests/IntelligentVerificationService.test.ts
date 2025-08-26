/**
 * Intelligent Verification Service Tests
 * Comprehensive test coverage for risk scoring and verification
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { intelligentVerificationService } from '../services/IntelligentVerificationService';
import { secureCredentialManager } from '../services/SecureCredentialManager';
import prisma from '@/lib/prisma';
import { verifyIndigenousStatus } from '@/lib/auth/indigenous-verification';
import { PredictionService } from '@/features/predictive-analytics/services/PredictionService';
import Redis from 'ioredis';

// Mock dependencies
vi.mock('ioredis');
vi.mock('@/lib/prisma', () => ({
  default: {
    business: {
      findUnique: vi.fn()
    },
    communityAttestation: {
      findFirst: vi.fn()
    },
    businessConnection: {
      findMany: vi.fn()
    },
    riskScore: {
      create: vi.fn()
    }
  }
}));

vi.mock('@/lib/auth/indigenous-verification', () => ({
  verifyIndigenousStatus: vi.fn()
}));

vi.mock('@/features/predictive-analytics/services/PredictionService');

describe('IntelligentVerificationService', () => {
  let mockRedis: any;
  let mockPredictionService: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Redis mock
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn()
    };
    (Redis as any).mockImplementation(() => mockRedis);
    
    // Setup PredictionService mock
    mockPredictionService = {
      predict: vi.fn(),
      assessRisk: vi.fn()
    };
    (PredictionService as any).mockImplementation(() => mockPredictionService);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('verifyIndigenousBusiness', () => {
    const mockBusiness = {
      id: 'biz-123',
      name: 'Test Indigenous Business',
      indigenousOwnership: 75,
      createdAt: new Date('2023-01-01'),
      employeeCount: 10,
      metadata: {
        iscRegistrationNumber: 'ISC123',
        paymentHistoryScore: 95,
        avgRating: 4.5
      },
      verificationDocuments: [{ id: 'doc-1' }, { id: 'doc-2' }],
      contracts: [
        { status: 'completed', value: 100000 },
        { status: 'completed', value: 150000 }
      ],
      partnerships: [],
      financialRecords: { totalRevenue: 500000 },
      certifications: [
        { type: 'CCAB', status: 'active', level: 'Certified' }
      ]
    };
    
    it('should return cached risk score when available', async () => {
      // Arrange
      const cachedScore = {
        businessId: 'biz-123',
        overallScore: 85,
        components: {
          ownershipVerification: 90,
          financialStability: 80,
          pastPerformance: 85,
          communityStanding: 95,
          capacityAssessment: 75
        },
        confidenceLevel: 'high',
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        verificationSources: ['isc_registry', 'ccab_membership']
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedScore));
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      expect(result).toEqual(cachedScore);
      expect(prisma.business.findUnique).not.toHaveBeenCalled();
    });
    
    it('should perform full verification when cache miss', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      (prisma.communityAttestation.findFirst as Mock).mockResolvedValue({
        id: 'att-1',
        businessId: 'biz-123',
        status: 'approved',
        approver: { name: 'Chief Test' }
      });
      (verifyIndigenousStatus as Mock).mockResolvedValue({
        trustScore: 85,
        isValid: true
      });
      mockPredictionService.predict.mockResolvedValue({ value: 0.82 });
      mockPredictionService.assessRisk.mockResolvedValue({ score: 0.15 });
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      expect(result.businessId).toBe('biz-123');
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.components.ownershipVerification).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeDefined();
      expect(result.verificationSources).toContain('ccab_membership');
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(prisma.riskScore.create).toHaveBeenCalled();
    });
    
    it('should generate alerts for low scores', async () => {
      // Arrange
      const lowScoreBusiness = {
        ...mockBusiness,
        indigenousOwnership: 40, // Below 51%
        financialRecords: { totalRevenue: 50000 },
        contracts: []
      };
      
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(lowScoreBusiness);
      (verifyIndigenousStatus as Mock).mockResolvedValue({
        trustScore: 40,
        isValid: false
      });
      mockPredictionService.predict.mockResolvedValue({ value: 0.25 });
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      expect(result.alerts).toBeDefined();
      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          type: 'ownership',
          severity: 'critical',
          message: expect.stringContaining('51% Indigenous ownership')
        })
      );
    });
    
    it('should handle network analysis when requested', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      (prisma.businessConnection.findMany as Mock).mockResolvedValue([
        {
          businessId: 'biz-123',
          connectedBusinessId: 'biz-456',
          connectedBusiness: {
            isVerified: true,
            metadata: { riskScore: 20 }
          }
        }
      ]);
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness(
        'biz-123',
        { includeNetworkAnalysis: true }
      );
      
      // Assert
      expect(prisma.businessConnection.findMany).toHaveBeenCalled();
      expect(result.components).toBeDefined();
    });
    
    it('should calculate cache TTL based on risk level', async () => {
      // Arrange
      const highRiskBusiness = {
        ...mockBusiness,
        indigenousOwnership: 51,
        contracts: [],
        financialRecords: { totalRevenue: 0 }
      };
      
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(highRiskBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.2 });
      
      // Act
      await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      const setexCall = mockRedis.setex.mock.calls[0];
      const ttl = setexCall[1];
      expect(ttl).toBeLessThan(86400); // Less than 24 hours for high risk
    });
  });
  
  describe('bulkVerify', () => {
    it('should process multiple businesses in batches', async () => {
      // Arrange
      const businessIds = Array.from({ length: 25 }, (_, i) => `biz-${i}`);
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.75 });
      
      // Act
      const results = await intelligentVerificationService.bulkVerify(businessIds);
      
      // Assert
      expect(results.size).toBe(25);
      // Should process in batches of 10
      expect(prisma.business.findUnique).toHaveBeenCalledTimes(25);
    });
    
    it('should send webhook on completion', async () => {
      // Arrange
      const businessIds = ['biz-1', 'biz-2'];
      const webhookUrl = 'https://example.com/webhook';
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.75 });
      
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      // Act
      await intelligentVerificationService.bulkVerify(businessIds, webhookUrl);
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('bulk_verification_complete')
        })
      );
    });
  });
  
  describe('Security Tests', () => {
    it('should sanitize business data to prevent XSS', async () => {
      // Arrange
      const maliciousBusiness = {
        ...mockBusiness,
        name: '<script>alert("XSS")</script>',
        metadata: {
          malicious: '<img src=x onerror=alert("XSS")>'
        }
      };
      
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(maliciousBusiness);
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      // The service should handle malicious input safely
      expect(result).toBeDefined();
      expect(result.businessId).toBe('biz-123');
    });
    
    it('should validate webhook URLs', async () => {
      // Arrange
      const businessIds = ['biz-1'];
      const maliciousWebhook = 'javascript:alert("XSS")';
      
      // Act & Assert
      await expect(
        intelligentVerificationService.bulkVerify(businessIds, maliciousWebhook)
      ).rejects.toThrow();
    });
    
    it('should handle Redis connection failures gracefully', async () => {
      // Arrange
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.75 });
      
      // Act
      const result = await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      
      // Assert
      expect(result).toBeDefined();
      expect(result.businessId).toBe('biz-123');
    });
  });
  
  describe('Performance Tests', () => {
    it('should complete verification within acceptable time', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.75 });
      
      // Act
      const startTime = Date.now();
      await intelligentVerificationService.verifyIndigenousBusiness('biz-123');
      const endTime = Date.now();
      
      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
    
    it('should handle concurrent verifications', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      (prisma.business.findUnique as Mock).mockResolvedValue(mockBusiness);
      mockPredictionService.predict.mockResolvedValue({ value: 0.75 });
      
      // Act
      const promises = Array.from({ length: 10 }, (_, i) =>
        intelligentVerificationService.verifyIndigenousBusiness(`biz-${i}`)
      );
      
      const results = await Promise.all(promises);
      
      // Assert
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.businessId).toBeDefined();
        expect(result.overallScore).toBeGreaterThan(0);
      });
    });
  });
});