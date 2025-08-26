/**
 * Enterprise Network Effects Service Test Suite
 * 
 * Comprehensive testing for NFX Personal Utility Network Effects implementation
 * Tests cover security, performance, edge cases, and business logic
 * 
 * @version 1.0.0
 * @author Indigenous Platform Team
 * @since 2025-01-12
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { EnterpriseNetworkEffectsService } from '../services/EnterpriseNetworkEffectsService';
import { AnimalSpirit } from '../types';

// Mock implementations
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/audit-logger');
jest.mock('@/lib/prisma');
jest.mock('@/lib/secure-config');

describe('Enterprise Network Effects Service', () => {
  let networkService: EnterpriseNetworkEffectsService;
  
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    networkService = new EnterpriseNetworkEffectsService();
    jest.clearAllMocks();
  });

  describe('Personal Utility Memory Updates', () => {
    test('should validate input data for personal utility updates', async () => {
      const invalidInput = {
        businessId: 'invalid-uuid',
        interactionType: 'invalid_type',
        outcome: {
          success: 'not_boolean',
          value: -100,
          satisfaction: 6
        }
      };

      await expect(
        networkService.updatePersonalUtility('user-123', invalidInput, 'USER')
      ).rejects.toThrow('Invalid input data');
    });

    test('should enforce business access controls', async () => {
      const { prisma } = require('@/lib/prisma');
      
      // Mock no business access
      prisma.businessMember.findFirst.mockResolvedValue(null);

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      await expect(
        networkService.updatePersonalUtility('user-123', validInput, 'USER')
      ).rejects.toThrow('Access denied to business data');
    });

    test('should enforce rate limiting for utility updates', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { prisma } = require('@/lib/prisma');
      
      // Mock business access
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });

      // Mock rate limiting denial
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(false);

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      await expect(
        networkService.updatePersonalUtility('user-123', validInput, 'USER')
      ).rejects.toThrow('Rate limit exceeded');
    });

    test('should update personal utility memory correctly', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      // Mock successful setup
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      withTransaction.mockImplementation(async (callback) => callback(prisma));

      // Mock existing memory
      prisma.personalUtilityMemory.findUnique.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        totalInteractions: 5,
        successRate: 0.8,
        preferredPartnerTypes: [],
        learningPatterns: [],
        networkValue: 1000,
        evolutionAccelerators: []
      });

      prisma.personalUtilityMemory.upsert.mockResolvedValue({});

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        partnerId: '87654321-4321-8765-2109-876543210987',
        outcome: {
          success: true,
          value: 75000,
          duration: 45,
          satisfaction: 5
        }
      };

      const result = await networkService.updatePersonalUtility('user-123', validInput, 'USER');

      expect(result.success).toBe(true);
      expect(result.utilityUpdate.totalInteractions).toBe(6);
      expect(result.utilityUpdate.successRate).toBeCloseTo(0.83, 2);
    });

    test('should generate meaningful insights from patterns', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      // Mock setup for high success rate scenario
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      withTransaction.mockImplementation(async (callback) => callback(prisma));

      // Mock memory with high success rate
      prisma.personalUtilityMemory.findUnique.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        totalInteractions: 10,
        successRate: 0.9,
        preferredPartnerTypes: [
          {
            spiritAnimal: AnimalSpirit.EAGLE,
            industry: 'construction',
            successRate: 0.95,
            averageValue: 100000,
            relationshipStrength: 0.8
          }
        ],
        learningPatterns: [],
        networkValue: 5000,
        evolutionAccelerators: []
      });

      prisma.personalUtilityMemory.upsert.mockResolvedValue({});

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      const result = await networkService.updatePersonalUtility('user-123', validInput, 'USER');

      expect(result.newInsights).toContain(
        expect.stringMatching(/success rate is exceptional/)
      );
    });

    test('should log audit trail for utility updates', async () => {
      const { AuditLogger } = require('@/lib/audit-logger');
      const mockLog = jest.fn();
      AuditLogger.prototype.log = mockLog;

      // Setup mocks for successful operation
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      withTransaction.mockImplementation(async (callback) => callback(prisma));
      prisma.personalUtilityMemory.findUnique.mockResolvedValue(null);
      prisma.personalUtilityMemory.upsert.mockResolvedValue({});

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      await networkService.updatePersonalUtility('user-123', validInput, 'USER');

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'UPDATE_PERSONAL_UTILITY',
        resourceType: 'network_memory',
        resourceId: '12345678-1234-5678-9012-123456789012',
        metadata: expect.objectContaining({
          interactionType: 'partnership_formed'
        }),
        securityLevel: 'MEDIUM'
      });
    });
  });

  describe('Network Density Analysis', () => {
    test('should validate network analysis requests', async () => {
      const invalidInput = {
        businessId: 'invalid-uuid',
        analysisType: 'invalid_analysis',
        timeframe: '999d'
      };

      await expect(
        networkService.analyzeNetworkDensity('user-123', invalidInput, 'USER')
      ).rejects.toThrow('Invalid input data');
    });

    test('should enforce authorization for network analysis', async () => {
      const { prisma } = require('@/lib/prisma');
      
      // Mock no business access
      prisma.businessMember.findFirst.mockResolvedValue(null);

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        analysisType: 'network_density',
        timeframe: '30d'
      };

      await expect(
        networkService.analyzeNetworkDensity('user-123', validInput, 'USER')
      ).rejects.toThrow('Access denied to business data');
    });

    test('should return comprehensive density metrics', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      // Mock successful setup
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        analysisType: 'network_density',
        timeframe: '30d'
      };

      const result = await networkService.analyzeNetworkDensity('user-123', validInput, 'USER');

      expect(result.success).toBe(true);
      expect(result.densityMetrics).toHaveProperty('connectionCount');
      expect(result.densityMetrics).toHaveProperty('connectionStrength');
      expect(result.densityMetrics).toHaveProperty('clusteringCoefficient');
      expect(result.optimizationPlan).toBeInstanceOf(Array);
      expect(result.competitiveAnalysis).toHaveProperty('relativePosition');
    });

    test('should enforce rate limiting for analysis requests', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { prisma } = require('@/lib/prisma');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      
      // Mock rate limiting denial
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(false);

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        analysisType: 'network_density',
        timeframe: '30d'
      };

      await expect(
        networkService.analyzeNetworkDensity('user-123', validInput, 'USER')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Collaboration Opportunities', () => {
    test('should find collaboration opportunities with filters', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const filters = {
        spiritAnimals: [AnimalSpirit.EAGLE, AnimalSpirit.WOLF],
        industries: ['construction', 'technology'],
        valueRange: { min: 10000, max: 100000 }
      };

      const result = await networkService.findCollaborationOpportunities(
        'user-123',
        '12345678-1234-5678-9012-123456789012',
        filters
      );

      expect(result.success).toBe(true);
      expect(result.opportunities).toBeInstanceOf(Array);
      expect(result.networkInsights).toHaveProperty('ecosystemHealth');
      expect(result.networkInsights).toHaveProperty('collaborationPotential');
    });

    test('should limit collaboration results to top 20', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);

      const result = await networkService.findCollaborationOpportunities(
        'user-123',
        '12345678-1234-5678-9012-123456789012'
      );

      expect(result.opportunities.length).toBeLessThanOrEqual(20);
    });

    test('should enforce rate limiting for collaboration queries', async () => {
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { prisma } = require('@/lib/prisma');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(false);

      await expect(
        networkService.findCollaborationOpportunities(
          'user-123',
          '12345678-1234-5678-9012-123456789012'
        )
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Champion Metrics', () => {
    test('should calculate champion metrics successfully', async () => {
      const { prisma } = require('@/lib/prisma');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });

      const result = await networkService.calculateChampionMetrics(
        'user-123',
        '12345678-1234-5678-9012-123456789012'
      );

      expect(result.success).toBe(true);
      expect(result.championMetrics).toHaveProperty('championshipScore');
      expect(result.championMetrics).toHaveProperty('leaderboardPosition');
      expect(result.championMetrics).toHaveProperty('networkImpact');
      expect(result.leaderboardData).toBeInstanceOf(Array);
      expect(result.mentorshipOpportunities).toBeInstanceOf(Array);
    });

    test('should enforce authorization for champion metrics', async () => {
      const { prisma } = require('@/lib/prisma');
      
      prisma.businessMember.findFirst.mockResolvedValue(null);

      await expect(
        networkService.calculateChampionMetrics(
          'user-123',
          '12345678-1234-5678-9012-123456789012'
        )
      ).rejects.toThrow('Access denied to business data');
    });

    test('should log champion metrics access', async () => {
      const { AuditLogger } = require('@/lib/audit-logger');
      const { prisma } = require('@/lib/prisma');
      const mockLog = jest.fn();
      AuditLogger.prototype.log = mockLog;

      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });

      await networkService.calculateChampionMetrics(
        'user-123',
        '12345678-1234-5678-9012-123456789012'
      );

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'CALCULATE_CHAMPION_METRICS',
        resourceType: 'champion_analysis',
        resourceId: '12345678-1234-5678-9012-123456789012',
        metadata: expect.any(Object)
      });
    });
  });

  describe('Security and Performance', () => {
    test('should handle database transaction failures gracefully', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      
      // Mock transaction failure
      withTransaction.mockRejectedValue(new Error('Database connection failed'));

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      await expect(
        networkService.updatePersonalUtility('user-123', validInput, 'USER')
      ).rejects.toThrow('Database connection failed');
    });

    test('should sanitize and validate all user inputs', async () => {
      const maliciousInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        },
        metadata: {
          description: '<script>alert("XSS")</script>',
          notes: 'DROP TABLE businesses;'
        }
      };

      // Input validation should catch and reject malicious content
      await expect(
        networkService.updatePersonalUtility('user-123', maliciousInput, 'USER')
      ).rejects.toThrow(); // Should fail validation
    });

    test('should handle concurrent access gracefully', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      withTransaction.mockImplementation(async (callback) => callback(prisma));
      prisma.personalUtilityMemory.findUnique.mockResolvedValue(null);
      prisma.personalUtilityMemory.upsert.mockResolvedValue({});

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      // Simulate concurrent updates
      const promises = Array(5).fill(null).map(() =>
        networkService.updatePersonalUtility('user-123', validInput, 'USER')
      );

      const results = await Promise.allSettled(promises);
      
      // At least some should succeed, transactions should handle conflicts
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should respect data retention and privacy policies', async () => {
      // Test that sensitive data is properly handled according to privacy policies
      const { AuditLogger } = require('@/lib/audit-logger');
      const mockLog = jest.fn();
      AuditLogger.prototype.log = mockLog;

      const { prisma } = require('@/lib/prisma');
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });

      await networkService.calculateChampionMetrics(
        'user-123',
        '12345678-1234-5678-9012-123456789012'
      );

      const logCall = mockLog.mock.calls[0][0];
      
      // Ensure no PII is logged
      expect(JSON.stringify(logCall)).not.toMatch(/email|phone|address/i);
      expect(logCall.userId).toBe('user-123'); // User ID is okay
      expect(logCall.resourceId).toBe('12345678-1234-5678-9012-123456789012'); // Business ID is okay
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty network gracefully', async () => {
      const { prisma } = require('@/lib/prisma');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });

      // Mock empty network scenario
      prisma.business.findMany.mockResolvedValue([]);
      prisma.contract.findMany.mockResolvedValue([]);

      const result = await networkService.findCollaborationOpportunities(
        'user-123',
        '12345678-1234-5678-9012-123456789012'
      );

      expect(result.success).toBe(true);
      expect(result.opportunities).toEqual([]);
      expect(result.networkInsights.ecosystemHealth).toBeDefined();
    });

    test('should handle invalid business references', async () => {
      const { prisma } = require('@/lib/prisma');
      const { RateLimiter } = require('@/lib/rate-limiter');
      const { withTransaction } = require('@/lib/database');
      
      prisma.businessMember.findFirst.mockResolvedValue({
        businessId: '12345678-1234-5678-9012-123456789012',
        userId: 'user-123'
      });
      RateLimiter.prototype.consume = jest.fn().mockResolvedValue(true);
      withTransaction.mockImplementation(async (callback) => callback(prisma));
      
      // Mock invalid partner reference
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.personalUtilityMemory.findUnique.mockResolvedValue(null);
      prisma.personalUtilityMemory.upsert.mockResolvedValue({});

      const validInput = {
        businessId: '12345678-1234-5678-9012-123456789012',
        interactionType: 'partnership_formed',
        partnerId: 'non-existent-partner-id',
        outcome: {
          success: true,
          value: 50000,
          duration: 30,
          satisfaction: 4
        }
      };

      // Should handle gracefully without failing
      const result = await networkService.updatePersonalUtility('user-123', validInput, 'USER');
      expect(result.success).toBe(true);
    });

    test('should validate numeric ranges properly', async () => {
      const invalidInputs = [
        {
          businessId: '12345678-1234-5678-9012-123456789012',
          interactionType: 'partnership_formed',
          outcome: {
            success: true,
            value: -1000, // Negative value
            duration: 30,
            satisfaction: 4
          }
        },
        {
          businessId: '12345678-1234-5678-9012-123456789012',
          interactionType: 'partnership_formed',
          outcome: {
            success: true,
            value: 50000,
            duration: -10, // Negative duration
            satisfaction: 4
          }
        },
        {
          businessId: '12345678-1234-5678-9012-123456789012',
          interactionType: 'partnership_formed',
          outcome: {
            success: true,
            value: 50000,
            duration: 30,
            satisfaction: 10 // Out of range satisfaction
          }
        }
      ];

      for (const invalidInput of invalidInputs) {
        await expect(
          networkService.updatePersonalUtility('user-123', invalidInput, 'USER')
        ).rejects.toThrow('Invalid input data');
      }
    });
  });
});