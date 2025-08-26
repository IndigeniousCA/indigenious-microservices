/**
 * Cross-System Learning Pipeline Test Suite
 * 
 * Enterprise-grade testing for ML-powered cross-system learning
 * Tests real-time pattern recognition, model updates, and cultural protocols
 * 
 * @author Indigenous Platform Team
 * @since 2025-01-12
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { CrossSystemLearningPipeline } from '../services/CrossSystemLearningPipeline';
import { AnimalSpirit } from '@/features/verification-badges/types';

// Mock dependencies
vi.mock('@/lib/logger');
vi.mock('@/lib/rate-limiter');
vi.mock('@/lib/audit-logger');
vi.mock('@/lib/event-streaming/kafka');
vi.mock('@/lib/cache/redis');
vi.mock('@/lib/ml/ml-service');
vi.mock('@/lib/database');

// Test data factories
const createMockRFQWinEvent = (overrides = {}) => ({
  eventId: 'event-rfq-win-123',
  eventType: 'rfq_win',
  timestamp: new Date(),
  businessIds: ['business-456', 'partner-789'],
  eventData: {
    rfqId: 'rfq-123',
    contractValue: 750000,
    category: 'infrastructure',
    winProbability: 0.65,
    actualWin: true,
    teamComposition: {
      lead: 'business-456',
      partners: ['partner-789'],
      roles: {
        'business-456': 'prime_contractor',
        'partner-789': 'subcontractor'
      }
    }
  },
  culturalContext: {
    nation: 'First Nation',
    ceremonies: [],
    protocols: ['elder_blessing'],
    seasonalFactors: ['summer_construction']
  },
  securityClassification: 'business_sensitive',
  ...overrides
});

const createMockPartnershipEvent = (overrides = {}) => ({
  eventId: 'event-partnership-123',
  eventType: 'partnership_formed',
  timestamp: new Date(),
  businessIds: ['business-456', 'partner-abc'],
  eventData: {
    partnershipId: 'partnership-123',
    partnershipType: 'supplier',
    capabilities: ['construction', 'materials'],
    culturalAlignment: 0.9,
    expectedValue: 500000
  },
  culturalContext: {
    nation: 'Test Nation',
    ceremonies: ['partnership_ceremony'],
    protocols: ['elder_approval'],
    seasonalFactors: []
  },
  securityClassification: 'business_sensitive',
  ...overrides
});

const createMockPattern = (overrides = {}) => ({
  patternId: 'pattern-123',
  patternType: 'success_combination',
  confidence: 0.85,
  occurrences: 5,
  businessCombinations: [['business-456', 'partner-789']],
  culturalFactors: [
    { factorType: 'ceremony', description: 'Partnership blessing', significance: 0.9 }
  ],
  predictiveValue: 0.88,
  lastUpdated: new Date(),
  ...overrides
});

describe('🧠 Cross-System Learning Pipeline', () => {
  let learningPipeline: CrossSystemLearningPipeline;
  let mockKafka: any;
  let mockRedis: any;
  let mockMLService: any;
  
  beforeEach(() => {
    learningPipeline = new CrossSystemLearningPipeline();
    
    // Setup mocks
    mockKafka = {
      subscribe: vi.fn(),
      publish: vi.fn().mockResolvedValue(true)
    };
    
    mockRedis = {
      setex: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1)
    };
    
    mockMLService = {
      loadModel: vi.fn().mockResolvedValue({
        predict: vi.fn().mockResolvedValue({ probability: 0.85, confidenceInterval: [0.8, 0.9] }),
        updateWeight: vi.fn().mockResolvedValue(true),
        partialRetrain: vi.fn().mockResolvedValue(true),
        validate: vi.fn().mockResolvedValue({ accuracy: 0.88 }),
        evaluate: vi.fn().mockResolvedValue({ 
          accuracy: 0.87, 
          precision: 0.89, 
          recall: 0.85, 
          f1: 0.87 
        })
      })
    };
    
    vi.clearAllMocks();
  });

  describe('🔐 Security & Authentication', () => {
    test('should validate event authenticity before processing', async () => {
      const event = createMockRFQWinEvent();
      
      // Mock event validation
      const mockEventValidator = {
        validateEventSignature: vi.fn().mockResolvedValue(false)
      };
      
      // @ts-ignore
      learningPipeline.eventValidator = mockEventValidator;
      
      await expect(
        learningPipeline.handleRFQWin(event)
      ).rejects.toThrow('Invalid event signature');
    });

    test('should enforce rate limiting for model updates', async () => {
      const event = createMockRFQWinEvent();
      
      // Simulate multiple rapid events
      const promises = Array(10).fill(null).map(() => 
        learningPipeline.handleRFQWin(event)
      );
      
      const results = await Promise.allSettled(promises);
      
      // Some should be rate limited
      const rateLimited = results.filter(r => 
        r.status === 'rejected' && 
        r.reason.message.includes('Rate limit')
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should protect cultural data in learning events', async () => {
      const culturalEvent = createMockRFQWinEvent({
        culturalContext: {
          nation: 'Sacred Nation',
          ceremonies: ['sacred_ceremony'],
          protocols: ['elder_only'],
          seasonalFactors: ['ceremony_season']
        },
        securityClassification: 'cultural_sacred'
      });
      
      const mockCulturalValidator = {
        validateCulturalAccess: vi.fn().mockResolvedValue({
          isValid: false,
          reason: 'Elder approval required'
        })
      };
      
      // @ts-ignore
      learningPipeline.culturalValidator = mockCulturalValidator;
      
      await expect(
        learningPipeline.handleRFQWin(culturalEvent)
      ).rejects.toThrow('Elder approval required');
    });
  });

  describe('📊 Pattern Recognition', () => {
    test('should identify success patterns from RFQ wins', async () => {
      const event = createMockRFQWinEvent();
      
      const result = await learningPipeline.handleRFQWin(event);
      
      expect(result.success).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      
      const successPattern = result.patterns.find(p => 
        p.patternType === 'success_combination'
      );
      
      expect(successPattern).toBeDefined();
      expect(successPattern?.confidence).toBeGreaterThan(0.7);
      expect(successPattern?.businessCombinations).toContainEqual([
        'business-456', 
        'partner-789'
      ]);
    });

    test('should detect cultural synergy patterns', async () => {
      const event = createMockRFQWinEvent({
        culturalContext: {
          nation: 'First Nation',
          ceremonies: ['partnership_blessing'],
          protocols: ['elder_approval', 'traditional_protocol'],
          seasonalFactors: ['harvest_season']
        }
      });
      
      const result = await learningPipeline.handleRFQWin(event);
      
      const culturalPattern = result.patterns.find(p => 
        p.patternType === 'cultural_synergy'
      );
      
      expect(culturalPattern).toBeDefined();
      expect(culturalPattern?.culturalFactors.length).toBeGreaterThan(0);
      expect(culturalPattern?.confidence).toBeGreaterThan(0.6);
    });

    test('should identify network amplification patterns', async () => {
      const event = createMockRFQWinEvent({
        businessIds: ['business-456', 'partner-789', 'partner-xyz'],
        eventData: {
          networkEffectScore: 0.92,
          connectionGrowth: 15,
          reachExpansion: 250
        }
      });
      
      const result = await learningPipeline.handleRFQWin(event);
      
      const networkPattern = result.patterns.find(p => 
        p.patternType === 'network_amplification'
      );
      
      expect(networkPattern).toBeDefined();
      expect(networkPattern?.predictiveValue).toBeGreaterThan(1); // Amplification > 100%
    });

    test('should identify capability complement patterns', async () => {
      const event = createMockRFQWinEvent({
        eventData: {
          teamCapabilities: {
            'business-456': ['construction', 'project_management'],
            'partner-789': ['materials', 'logistics']
          },
          capabilityGaps: [],
          synergyScore: 0.95
        }
      });
      
      const result = await learningPipeline.handleRFQWin(event);
      
      const capabilityPattern = result.patterns.find(p => 
        p.patternType === 'capability_complement'
      );
      
      expect(capabilityPattern).toBeDefined();
      expect(capabilityPattern?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('🤖 Model Updates', () => {
    test('should update partnership model based on RFQ success', async () => {
      const event = createMockRFQWinEvent();
      
      const result = await learningPipeline.handleRFQWin(event);
      
      const partnershipUpdate = result.modelUpdates.find(u => 
        u.modelType === 'partnership_recommendation'
      );
      
      expect(partnershipUpdate).toBeDefined();
      expect(partnershipUpdate?.updateType).toBe('weight_adjustment');
      expect(partnershipUpdate?.changes.length).toBeGreaterThan(0);
      
      // Verify model was actually updated
      expect(mockMLService.loadModel).toHaveBeenCalled();
    });

    test('should update RFQ model based on partnership success', async () => {
      const event = createMockPartnershipEvent();
      
      const result = await learningPipeline.handlePartnershipFormed(event);
      
      const rfqUpdate = result.modelUpdates.find(u => 
        u.modelType === 'rfq_matching'
      );
      
      expect(rfqUpdate).toBeDefined();
      expect(rfqUpdate?.culturalValidation).toBe(true);
    });

    test('should validate model performance after updates', async () => {
      const event = createMockRFQWinEvent();
      
      // Mock model with degraded performance after update
      mockMLService.loadModel.mockResolvedValue({
        predict: vi.fn(),
        updateWeight: vi.fn(),
        partialRetrain: vi.fn(),
        validate: vi.fn().mockResolvedValue({ accuracy: 0.65 }) // Below threshold
      });
      
      await expect(
        learningPipeline.handleRFQWin(event)
      ).rejects.toThrow('Model update degraded performance');
    });

    test('should rollback failed model updates', async () => {
      const event = createMockRFQWinEvent();
      
      const mockModel = {
        predict: vi.fn(),
        updateWeight: vi.fn(),
        partialRetrain: vi.fn().mockRejectedValue(new Error('Training failed')),
        validate: vi.fn(),
        rollback: vi.fn()
      };
      
      mockMLService.loadModel.mockResolvedValue(mockModel);
      
      try {
        await learningPipeline.handleRFQWin(event);
      } catch (error) {
        // Expected to fail
      }
      
      // Verify rollback was called
      expect(mockModel.rollback).toHaveBeenCalled();
    });
  });

  describe('🔮 Predictive Intelligence', () => {
    test('should predict RFQ success for new partnerships', async () => {
      const event = createMockPartnershipEvent();
      
      const result = await learningPipeline.handlePartnershipFormed(event);
      
      expect(result.predictions.length).toBeGreaterThan(0);
      
      const topPrediction = result.predictions[0];
      expect(topPrediction.successProbability).toBeGreaterThan(0);
      expect(topPrediction.successProbability).toBeLessThanOrEqual(1);
      expect(topPrediction.estimatedContractValue).toBeGreaterThan(0);
      expect(topPrediction.keyAdvantages).toContain(expect.any(String));
      expect(topPrediction.recommendedStrategy).toBeDefined();
    });

    test('should generate growth recommendations from badge evolution', async () => {
      const event = {
        eventId: 'event-badge-123',
        eventType: 'badge_evolution',
        timestamp: new Date(),
        businessIds: ['business-456'],
        eventData: {
          fromStage: 1,
          toStage: 2,
          evolutionTriggers: ['revenue_milestone', 'partnership_count'],
          spiritAnimal: AnimalSpirit.EAGLE
        },
        securityClassification: 'business_sensitive'
      };
      
      const result = await learningPipeline.handleBadgeEvolution(event);
      
      expect(result.success).toBe(true);
      expect(result.growthPatterns.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const recommendation = result.recommendations[0];
      expect(recommendation.priority).toMatch(/high|medium|low/);
      expect(recommendation.actions).toContain(expect.any(String));
    });

    test('should detect emerging patterns in real-time', async () => {
      const result = await learningPipeline.detectEmergingPatterns(7 * 24 * 60 * 60 * 1000);
      
      expect(result.emergingPatterns).toBeDefined();
      expect(result.alerts).toBeDefined();
      
      // Verify pattern structure
      if (result.emergingPatterns.length > 0) {
        const pattern = result.emergingPatterns[0];
        expect(pattern.patternId).toMatch(/^emerging_/);
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.occurrences).toBeGreaterThan(0);
      }
    });
  });

  describe('🌐 Cross-System Integration', () => {
    test('should generate insights across both systems', async () => {
      const event = createMockRFQWinEvent();
      
      const result = await learningPipeline.handleRFQWin(event);
      
      expect(result.insights.length).toBeGreaterThan(0);
      
      // Check for different insight types
      const insightTypes = result.insights.map(i => i.type);
      expect(insightTypes).toContain('emerging_pattern');
      
      // Verify economic impact calculation
      const economicInsight = result.insights.find(i => i.economicImpact);
      if (economicInsight) {
        expect(economicInsight.economicImpact).toBeGreaterThan(0);
      }
    });

    test('should update unified profiles after learning', async () => {
      const mockUnifiedService = {
        updateProfiles: vi.fn().mockResolvedValue(true)
      };
      
      // @ts-ignore
      learningPipeline.unifiedService = mockUnifiedService;
      
      const event = createMockRFQWinEvent();
      await learningPipeline.handleRFQWin(event);
      
      expect(mockUnifiedService.updateProfiles).toHaveBeenCalledWith(
        event.businessIds,
        expect.objectContaining({
          type: 'rfq_win',
          patterns: expect.any(Array),
          insights: expect.any(Array)
        })
      );
    });

    test('should trigger proactive recommendations', async () => {
      const mockNotificationService = {
        sendRecommendations: vi.fn().mockResolvedValue(true)
      };
      
      // @ts-ignore
      learningPipeline.notificationService = mockNotificationService;
      
      const event = createMockRFQWinEvent();
      const result = await learningPipeline.handleRFQWin(event);
      
      if (result.insights.length > 0) {
        expect(mockNotificationService.sendRecommendations).toHaveBeenCalled();
      }
    });
  });

  describe('📈 Performance & Scalability', () => {
    test('should handle high-volume event streams', async () => {
      const events = Array(100).fill(null).map((_, i) => 
        createMockRFQWinEvent({
          eventId: `event-${i}`,
          businessIds: [`business-${i}`, `partner-${i}`]
        })
      );
      
      const startTime = Date.now();
      
      const promises = events.map(event => 
        learningPipeline.handleRFQWin(event)
      );
      
      const results = await Promise.allSettled(promises);
      const processingTime = Date.now() - startTime;
      
      // Should process 100 events in reasonable time (< 10 seconds)
      expect(processingTime).toBeLessThan(10000);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(50); // At least 50% success rate
    });

    test('should cache patterns for performance', async () => {
      const event = createMockRFQWinEvent();
      
      await learningPipeline.handleRFQWin(event);
      
      // Verify Redis caching was used
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^pattern:/),
        86400, // 24 hours
        expect.any(String)
      );
    });

    test('should batch model updates for efficiency', async () => {
      const events = Array(5).fill(null).map((_, i) => 
        createMockRFQWinEvent({ eventId: `event-${i}` })
      );
      
      // Process multiple events
      for (const event of events) {
        await learningPipeline.handleRFQWin(event);
      }
      
      // Model updates should be batched (not 5 separate updates)
      const updateCalls = mockMLService.loadModel.mock.results[0]?.value?.partialRetrain?.mock?.calls?.length || 0;
      expect(updateCalls).toBeLessThan(events.length);
    });
  });

  describe('🎯 Cultural Protocol Compliance', () => {
    test('should respect seasonal restrictions in pattern detection', async () => {
      const winterEvent = createMockRFQWinEvent({
        culturalContext: {
          nation: 'Northern Nation',
          ceremonies: [],
          protocols: ['winter_protocol'],
          seasonalFactors: ['winter_restrictions']
        }
      });
      
      const result = await learningPipeline.handleRFQWin(winterEvent);
      
      // Should not suggest ceremony-based partnerships in winter
      const insights = result.insights;
      insights.forEach(insight => {
        expect(insight.recommendations).not.toContain('ceremony-based partnerships');
      });
    });

    test('should validate cultural appropriateness of model updates', async () => {
      const event = createMockRFQWinEvent({
        culturalContext: {
          nation: 'Sacred Nation',
          ceremonies: ['sacred_ceremony'],
          protocols: ['strict_protocol']
        }
      });
      
      const result = await learningPipeline.handleRFQWin(event);
      
      // Cultural validation should be performed
      const culturalUpdate = result.modelUpdates.find(u => u.culturalValidation);
      expect(culturalUpdate).toBeDefined();
    });

    test('should prioritize elder-approved patterns', async () => {
      const mockElderService = {
        getApprovedPatterns: vi.fn().mockResolvedValue([
          createMockPattern({ patternId: 'elder-approved-1', confidence: 0.95 })
        ])
      };
      
      // @ts-ignore
      learningPipeline.elderService = mockElderService;
      
      const result = await learningPipeline.detectEmergingPatterns();
      
      // Elder-approved patterns should be included
      const elderPattern = result.emergingPatterns.find(p => 
        p.patternId === 'elder-approved-1'
      );
      
      expect(elderPattern).toBeDefined();
    });
  });

  describe('⚠️ Error Handling & Resilience', () => {
    test('should handle ML service failures gracefully', async () => {
      mockMLService.loadModel.mockRejectedValue(new Error('ML service unavailable'));
      
      // Should still process event without ML predictions
      const event = createMockRFQWinEvent();
      const result = await learningPipeline.handleRFQWin(event);
      
      expect(result.success).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0); // Basic patterns still detected
      expect(result.modelUpdates).toEqual([]); // No model updates when ML fails
    });

    test('should validate event data integrity', async () => {
      const corruptedEvent = {
        eventId: null,
        eventType: 'rfq_win',
        timestamp: 'invalid-date',
        businessIds: undefined,
        eventData: null
      };
      
      await expect(
        learningPipeline.handleRFQWin(corruptedEvent as any)
      ).rejects.toThrow('Invalid event data');
    });

    test('should handle Kafka connection failures', async () => {
      mockKafka.publish.mockRejectedValue(new Error('Kafka connection failed'));
      
      // Should still process locally
      const event = createMockRFQWinEvent();
      const result = await learningPipeline.handleRFQWin(event);
      
      expect(result.success).toBe(true);
      // Verify fallback to local processing
    });
  });

  describe('📊 Audit & Monitoring', () => {
    test('should log all learning events', async () => {
      const mockAuditLogger = {
        log: vi.fn().mockResolvedValue(true)
      };
      
      vi.doMock('@/lib/audit-logger', () => ({
        auditLogger: mockAuditLogger
      }));
      
      const event = createMockRFQWinEvent();
      await learningPipeline.handleRFQWin(event);
      
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CROSS_SYSTEM_LEARNING_RFQ_WIN',
          eventId: event.eventId,
          resourceType: 'learning_pipeline'
        })
      );
    });

    test('should track model performance metrics', async () => {
      const event = createMockRFQWinEvent();
      const result = await learningPipeline.handleRFQWin(event);
      
      const modelUpdate = result.modelUpdates[0];
      expect(modelUpdate.performanceImpact).toBeDefined();
      expect(modelUpdate.performanceImpact.accuracyChange).toBeDefined();
    });

    test('should monitor pattern confidence over time', async () => {
      const pattern = createMockPattern({ confidence: 0.75 });
      
      // Store pattern
      await learningPipeline['storePatterns']([pattern]);
      
      // Simulate time passing and confidence increase
      const updatedPattern = { ...pattern, confidence: 0.85, occurrences: 10 };
      await learningPipeline['storePatterns']([updatedPattern]);
      
      // Verify confidence tracking
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `pattern:${pattern.patternId}`,
        expect.any(Number),
        expect.stringContaining('"confidence":0.85')
      );
    });
  });
});