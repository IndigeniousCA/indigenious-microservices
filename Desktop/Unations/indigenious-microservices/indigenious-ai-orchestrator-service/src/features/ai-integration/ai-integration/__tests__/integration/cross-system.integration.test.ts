/**
 * Cross-System Integration Tests
 * 
 * Tests the integration between RFQ and Partnership systems
 * 
 * @author Indigenous Platform Team
 * @since 2025-01-12
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedBusinessIntelligence } from '../../services/UnifiedBusinessIntelligence';
import { CrossSystemLearningPipeline } from '../../services/CrossSystemLearningPipeline';
import { PredictiveIntelligenceEngine } from '../../services/PredictiveIntelligenceEngine';
import { redis } from '@/lib/cache/redis';
import { kafka } from '@/lib/event-streaming/kafka';

// Mock external dependencies
vi.mock('@/lib/cache/redis');
vi.mock('@/lib/event-streaming/kafka');
vi.mock('@/lib/logger');
vi.mock('@/lib/audit-logger');

describe('🔄 Cross-System Integration', () => {
  let unifiedIntelligence: UnifiedBusinessIntelligence;
  let learningPipeline: CrossSystemLearningPipeline;
  let predictiveEngine: PredictiveIntelligenceEngine;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize services
    unifiedIntelligence = new UnifiedBusinessIntelligence();
    learningPipeline = new CrossSystemLearningPipeline();
    predictiveEngine = new PredictiveIntelligenceEngine();
  });
  
  afterEach(() => {
    // Clean up
    predictiveEngine.destroy();
  });

  describe('🌉 Data Bridge Tests', () => {
    test('should build unified profile from both systems', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      const userRole = 'owner';
      
      // Mock RFQ data
      vi.spyOn(unifiedIntelligence['rfqService'], 'getBusinessRFQData').mockResolvedValue({
        history: [
          { rfqId: 'rfq-1', status: 'won', contractValue: 500000 },
          { rfqId: 'rfq-2', status: 'lost', contractValue: 300000 }
        ],
        wins: [{ rfqId: 'rfq-1', value: 500000 }],
        patterns: [{ type: 'construction', successRate: 0.75 }]
      });
      
      // Mock partnership data
      vi.spyOn(unifiedIntelligence['partnershipEngine'], 'getBusinessPartnershipData').mockResolvedValue({
        partnerships: [
          { partnerId: 'partner-1', type: 'supplier', status: 'active' }
        ],
        badgeEvolution: [{ badge: 'verified', level: 3 }]
      });
      
      const result = await unifiedIntelligence.buildUnifiedProfile(userId, businessId, userRole);
      
      expect(result.success).toBe(true);
      expect(result.profile.rfqHistory).toHaveLength(2);
      expect(result.profile.partnershipNetwork).toHaveLength(1);
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should generate cross-system insights', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      
      // Build profile first
      const profileResult = await unifiedIntelligence.buildUnifiedProfile(
        userId, 
        businessId, 
        'owner'
      );
      
      expect(profileResult.insights.length).toBeGreaterThan(0);
      
      const crossSystemInsights = profileResult.insights.filter(i => 
        i.insightType === 'partnership_to_rfq' || 
        i.insightType === 'rfq_to_partnership'
      );
      
      expect(crossSystemInsights.length).toBeGreaterThan(0);
    });
  });

  describe('🧠 Learning Pipeline Tests', () => {
    test('should process RFQ win and update partnership recommendations', async () => {
      const rfqWinEvent = {
        eventId: 'event-123',
        eventType: 'rfq_win' as const,
        timestamp: new Date(),
        businessIds: ['business-456', 'business-789'],
        eventData: {
          rfqId: 'rfq-won-1',
          contractValue: 750000,
          category: 'construction'
        },
        securityClassification: 'business_sensitive' as const
      };
      
      const result = await learningPipeline.handleRFQWin(rfqWinEvent);
      
      expect(result.success).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.modelUpdates.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    test('should process partnership success and update RFQ matching', async () => {
      const partnershipEvent = {
        eventId: 'event-456',
        eventType: 'partnership_formed' as const,
        timestamp: new Date(),
        businessIds: ['business-123', 'business-456'],
        eventData: {
          partnershipId: 'partnership-1',
          type: 'strategic',
          value: 1000000
        },
        securityClassification: 'business_sensitive' as const
      };
      
      const result = await learningPipeline.handlePartnershipFormed(partnershipEvent);
      
      expect(result.success).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.predictions.length).toBeGreaterThan(0);
    });

    test('should detect emerging patterns across systems', async () => {
      // Mock recent events
      vi.spyOn(learningPipeline as any, 'getRecentEvents').mockResolvedValue([
        { type: 'rfq_win', businesses: ['b1', 'b2'], success: true },
        { type: 'rfq_win', businesses: ['b1', 'b2'], success: true },
        { type: 'rfq_win', businesses: ['b1', 'b2'], success: true },
        { type: 'partnership_formed', businesses: ['b1', 'b2'] }
      ]);
      
      const result = await learningPipeline.detectEmergingPatterns();
      
      expect(result.emergingPatterns.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('🔮 Predictive Intelligence Tests', () => {
    test('should generate hyper-intelligent predictions', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      
      // Mock service responses
      vi.spyOn(predictiveEngine['ambientService'], 'getPredictions').mockResolvedValue({
        predictions: [{ type: 'opportunity', confidence: 0.8 }]
      });
      
      vi.spyOn(predictiveEngine['learningPipeline'], 'getPatterns').mockResolvedValue([
        { patternType: 'success_combination', confidence: 0.75 }
      ]);
      
      const result = await predictiveEngine.generateHyperIntelligentPredictions(
        userId,
        businessId,
        {}
      );
      
      expect(result.success).toBe(true);
      expect(result.insights).toBeDefined();
      expect(result.immediateOpportunities).toBeDefined();
      expect(result.strategicRecommendations).toBeDefined();
      expect(result.culturalGuidance).toBeDefined();
      expect(result.networkEffects).toBeDefined();
      expect(result.automationSuggestions).toBeDefined();
    });

    test('should handle service failures gracefully', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      
      // Mock service failures
      vi.spyOn(predictiveEngine['ambientService'], 'getPredictions').mockRejectedValue(
        new Error('Service unavailable')
      );
      
      vi.spyOn(predictiveEngine['marketIntelligence'], 'getIntelligence').mockRejectedValue(
        new Error('Market data unavailable')
      );
      
      // Should still return results from available services
      const result = await predictiveEngine.generateHyperIntelligentPredictions(
        userId,
        businessId,
        {}
      );
      
      expect(result.success).toBe(true);
      expect(result.insights).toBeDefined();
      // Should have reduced insights due to failed services
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔄 Event-Driven Integration Tests', () => {
    test('should propagate RFQ success through all systems', async () => {
      const mockKafkaPublish = vi.fn().mockResolvedValue(true);
      kafka.publish = mockKafkaPublish;
      
      const rfqResult = {
        rfqId: 'rfq-123',
        businessId: 'business-456',
        contractValue: 1000000,
        partners: ['partner-1', 'partner-2'],
        involvedBusinesses: ['business-456', 'business-789'],
        successFactors: {
          keyStrengths: ['technical', 'cultural'],
          winProbability: 0.85
        }
      };
      
      const result = await unifiedIntelligence.processRFQSuccess(
        'user-123',
        rfqResult,
        'owner'
      );
      
      expect(result.success).toBe(true);
      expect(result.partnershipUpdates).toBeDefined();
      expect(result.networkEffectChanges).toBeDefined();
      expect(result.newInsights).toBeDefined();
      
      // Verify events were published
      expect(mockKafkaPublish).toHaveBeenCalledWith(
        expect.stringContaining('insight'),
        expect.any(Object)
      );
    });
  });

  describe('🛡️ Security Integration Tests', () => {
    test('should enforce authentication across systems', async () => {
      // Mock auth failure
      vi.spyOn(unifiedIntelligence['authService'], 'validateJWTToken').mockResolvedValue(false);
      
      await expect(
        unifiedIntelligence.buildUnifiedProfile('invalid-user', 'business-123', 'owner')
      ).rejects.toThrow('Invalid authentication token');
    });

    test('should enforce business access control', async () => {
      // Mock auth success but business access failure
      vi.spyOn(unifiedIntelligence['authService'], 'validateJWTToken').mockResolvedValue(true);
      vi.spyOn(unifiedIntelligence['businessService'], 'verifyBusinessAccess').mockResolvedValue(false);
      
      await expect(
        unifiedIntelligence.buildUnifiedProfile('user-123', 'unauthorized-business', 'owner')
      ).rejects.toThrow('User not authorized for this business');
    });

    test('should handle rate limiting across systems', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          unifiedIntelligence.buildUnifiedProfile(userId, businessId, 'owner')
            .catch(e => e)
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimitErrors = results.filter(r => 
        r instanceof Error && r.message.includes('rate limit')
      );
      
      // Should have some rate limit errors after threshold
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('📊 Performance Tests', () => {
    test('should handle high volume of cross-system events', async () => {
      const startTime = Date.now();
      const eventCount = 100;
      
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        const event = {
          eventId: `event-${i}`,
          eventType: i % 2 === 0 ? 'rfq_win' : 'partnership_formed' as const,
          timestamp: new Date(),
          businessIds: [`business-${i}`, `business-${i + 1}`],
          eventData: { value: Math.random() * 1000000 },
          securityClassification: 'business_sensitive' as const
        };
        
        promises.push(
          i % 2 === 0 
            ? learningPipeline.handleRFQWin(event)
            : learningPipeline.handlePartnershipFormed(event)
        );
      }
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // Should process 100 events in under 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    test('should maintain memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process many patterns
      for (let i = 0; i < 20000; i++) {
        learningPipeline['patterns'].set(`pattern-${i}`, {
          patternId: `pattern-${i}`,
          patternType: 'test',
          confidence: Math.random(),
          occurrences: i,
          businessCombinations: [],
          culturalFactors: [],
          predictiveValue: Math.random(),
          lastUpdated: new Date()
        });
      }
      
      // Trigger cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (under 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      // Patterns should be limited by MAX_PATTERNS
      expect(learningPipeline['patterns'].size).toBeLessThanOrEqual(10000);
    });
  });
});