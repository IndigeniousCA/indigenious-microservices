/**
 * Prediction Validation Service Test Suite
 * 
 * Tests for AI hallucination prevention, error detection, and validation layers
 * 
 * @author Indigenous Platform Team
 * @since 2025-01-12
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PredictionValidationService } from '../services/PredictionValidationService';

// Mock dependencies
vi.mock('@/lib/logger');
vi.mock('@/lib/audit-logger');

// Test data factories
const createValidPrediction = (overrides = {}) => ({
  predictionId: 'pred-123',
  type: 'contract_value',
  value: 750000,
  confidence: 0.85,
  probability: 0.75,
  entities: [],
  ...overrides
});

const createHallucinationPrediction = (overrides = {}) => ({
  predictionId: 'pred-hallucination',
  type: 'partnership_opportunity',
  value: 1000000,
  confidence: 0.15, // Very low confidence
  entities: [
    { name: 'NonExistentCompany', type: 'business' },
    { name: 'FakePartnership', type: 'partnership' }
  ],
  ...overrides
});

const createImpossiblePrediction = (overrides = {}) => ({
  predictionId: 'pred-impossible',
  type: 'contract_value',
  value: -500000, // Negative contract value
  probability: 1.5, // Probability > 1
  confidence: 0.9,
  ...overrides
});

const createCulturalPrediction = (overrides = {}) => ({
  predictionId: 'pred-cultural',
  type: 'cultural_ceremony_timing',
  value: 'winter_ceremony',
  confidence: 0.65, // Below cultural threshold
  culturalSignificance: 'high',
  ...overrides
});

describe('🛡️ Prediction Validation Service', () => {
  let validationService: PredictionValidationService;
  
  beforeEach(() => {
    validationService = new PredictionValidationService();
    vi.clearAllMocks();
  });

  describe('✅ Valid Predictions', () => {
    test('should pass valid predictions with high confidence', async () => {
      const prediction = createValidPrediction();
      const context = { businessId: 'business-456' };
      
      const result = await validationService.validatePrediction(prediction, context);
      
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.issues.length).toBe(0);
      expect(result.humanReviewRequired).toBe(false);
    });

    test('should validate predictions within statistical norms', async () => {
      const prediction = createValidPrediction({
        value: 500000, // Within normal range
        confidence: 0.7
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const statisticalLayer = result.validationLayers.find(l => 
        l.layerName === 'Statistical Validation'
      );
      
      expect(statisticalLayer?.status).toBe('passed');
      expect(result.isValid).toBe(true);
    });
  });

  describe('🚫 Hallucination Detection', () => {
    test('should detect low confidence hallucinations', async () => {
      const prediction = createHallucinationPrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      expect(result.isValid).toBe(false);
      
      const hallucinationIssues = result.issues.filter(i => 
        i.issueType === 'hallucination'
      );
      
      expect(hallucinationIssues.length).toBeGreaterThan(0);
      expect(hallucinationIssues[0].severity).toBe('critical');
      expect(result.humanReviewRequired).toBe(true);
    });

    test('should detect non-existent entity references', async () => {
      const prediction = createHallucinationPrediction();
      
      // Mock entity verification to return false
      const mockVerifyEntity = vi.fn().mockResolvedValue(false);
      validationService['verifyEntityExists'] = mockVerifyEntity;
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const entityIssues = result.issues.filter(i => 
        i.description.includes('does not exist')
      );
      
      expect(entityIssues.length).toBe(2); // Two fake entities
      expect(mockVerifyEntity).toHaveBeenCalledTimes(2);
    });

    test('should reduce confidence for hallucination corrections', async () => {
      const prediction = createHallucinationPrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const confidenceCorrection = result.corrections.find(c => 
        c.correctionType === 'confidence_reduction'
      );
      
      expect(confidenceCorrection).toBeDefined();
      expect(confidenceCorrection?.correctedValue).toBeLessThanOrEqual(0.3);
    });
  });

  describe('❌ Impossible Value Detection', () => {
    test('should detect negative contract values', async () => {
      const prediction = createImpossiblePrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      expect(result.isValid).toBe(false);
      
      const impossibleIssues = result.issues.filter(i => 
        i.issueType === 'impossible_value'
      );
      
      expect(impossibleIssues.length).toBeGreaterThan(0);
      expect(impossibleIssues[0].description).toContain('cannot be negative');
    });

    test('should detect probability values outside [0,1]', async () => {
      const prediction = createImpossiblePrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const probabilityIssue = result.issues.find(i => 
        i.description.includes('Probability must be between 0 and 1')
      );
      
      expect(probabilityIssue).toBeDefined();
      expect(probabilityIssue?.severity).toBe('critical');
    });

    test('should clamp impossible values when correcting', async () => {
      const prediction = createImpossiblePrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const valueCorrection = result.corrections.find(c => 
        c.correctionType === 'value_adjustment' && 
        c.reason.includes('Probability')
      );
      
      expect(valueCorrection).toBeDefined();
      expect(valueCorrection?.correctedValue).toBe(1); // Clamped to max
    });
  });

  describe('📊 Statistical Validation', () => {
    test('should detect statistical outliers', async () => {
      // Mock historical data
      const mockHistoricalData = Array(100).fill(null).map((_, i) => ({
        value: 100000 + (Math.random() * 50000) // Values between 100k-150k
      }));
      
      validationService['getHistoricalData'] = vi.fn().mockResolvedValue(mockHistoricalData);
      
      const prediction = createValidPrediction({
        value: 5000000 // Way outside normal range
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const outlierIssue = result.issues.find(i => 
        i.issueType === 'data_drift' && 
        i.description.includes('standard deviations')
      );
      
      expect(outlierIssue).toBeDefined();
      expect(outlierIssue?.severity).toBe('high');
    });

    test('should warn about overconfident predictions', async () => {
      validationService['historicalAccuracy'].set('contract_value', 0.65);
      
      const prediction = createValidPrediction({
        type: 'contract_value',
        confidence: 0.95 // Much higher than historical accuracy
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const confidenceIssue = result.issues.find(i => 
        i.description.includes('exceeds historical accuracy')
      );
      
      expect(confidenceIssue).toBeDefined();
      expect(confidenceIssue?.severity).toBe('medium');
    });
  });

  describe('🌍 Cultural Validation', () => {
    test('should require high confidence for cultural predictions', async () => {
      const prediction = createCulturalPrediction();
      const context = {
        culturalContext: {
          nation: 'Test Nation',
          protocols: ['ceremony_protocol']
        }
      };
      
      const result = await validationService.validatePrediction(prediction, context);
      
      const culturalIssue = result.issues.find(i => 
        i.issueType === 'cultural_violation' &&
        i.description.includes('require higher confidence')
      );
      
      expect(culturalIssue).toBeDefined();
      expect(result.culturalReviewRequired).toBe(true);
    });

    test('should enforce seasonal cultural constraints', async () => {
      // Mock winter season
      validationService['isWinter'] = vi.fn().mockReturnValue(true);
      
      const prediction = createCulturalPrediction({
        type: 'ceremony_prediction',
        value: 'winter_ceremony_date'
      });
      
      const context = {
        culturalContext: {
          nation: 'Northern Nation'
        }
      };
      
      const result = await validationService.validatePrediction(prediction, context);
      
      const seasonalViolation = result.issues.find(i => 
        i.issueType === 'cultural_violation'
      );
      
      expect(seasonalViolation).toBeDefined();
      expect(result.isValid).toBe(false);
    });

    test('should reject predictions violating cultural protocols', async () => {
      const prediction = createCulturalPrediction({
        type: 'sacred_site_activity',
        confidence: 0.95
      });
      
      const context = {
        culturalContext: {
          nation: 'Sacred Nation',
          protocols: ['sacred_site_restricted']
        }
      };
      
      const result = await validationService.validatePrediction(prediction, context);
      
      const rejectionCorrection = result.corrections.find(c => 
        c.correctionType === 'complete_rejection'
      );
      
      expect(rejectionCorrection).toBeDefined();
      expect(rejectionCorrection?.reason).toContain('Cultural protocol violation');
    });
  });

  describe('🔍 Bias Detection', () => {
    test('should detect geographic bias', async () => {
      const prediction = createValidPrediction({
        geography: {
          region: 'urban_only',
          excludes: ['rural', 'remote']
        }
      });
      
      // Mock bias detection
      validationService['checkGeographicBias'] = vi.fn().mockResolvedValue({
        biasDetected: true,
        description: 'Urban bias detected - excludes rural communities'
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const biasIssue = result.issues.find(i => 
        i.issueType === 'bias' &&
        i.description.includes('Geographic bias')
      );
      
      expect(biasIssue).toBeDefined();
      expect(biasIssue?.severity).toBe('medium');
    });

    test('should detect business size bias', async () => {
      const prediction = createValidPrediction({
        businessSize: {
          minimum: 'large',
          excludes: ['small', 'medium']
        }
      });
      
      validationService['checkBusinessSizeBias'] = vi.fn().mockResolvedValue({
        biasDetected: true,
        description: 'Favors large businesses only'
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const biasIssue = result.issues.find(i => 
        i.issueType === 'bias' &&
        i.description.includes('Business size bias')
      );
      
      expect(biasIssue).toBeDefined();
    });
  });

  describe('🔄 Contradiction Detection', () => {
    test('should detect contradictory predictions', async () => {
      const prediction = createValidPrediction({
        type: 'market_growth',
        value: 'rapid_expansion',
        marketSegment: 'construction'
      });
      
      // Mock finding contradictions
      validationService['findContradictions'] = vi.fn().mockResolvedValue([{
        description: 'Contradicts recent market downturn prediction',
        conflictingPrediction: {
          type: 'market_decline',
          value: 'significant_contraction',
          marketSegment: 'construction'
        }
      }]);
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const contradictionIssue = result.issues.find(i => 
        i.issueType === 'contradiction'
      );
      
      expect(contradictionIssue).toBeDefined();
      expect(contradictionIssue?.severity).toBe('high');
    });
  });

  describe('📋 Validation Layers', () => {
    test('should execute all validation layers', async () => {
      const prediction = createValidPrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const layerNames = result.validationLayers.map(l => l.layerName);
      
      expect(layerNames).toContain('Sanity Check');
      expect(layerNames).toContain('Statistical Validation');
      expect(layerNames).toContain('Pattern Validation');
      expect(layerNames).toContain('Cross-Reference Validation');
      expect(layerNames).toContain('Cultural Validation');
      expect(layerNames).toContain('Hallucination Detection');
      expect(layerNames).toContain('Bias Detection');
      
      expect(result.validationLayers.length).toBe(7);
    });

    test('should calculate weighted confidence from all layers', async () => {
      const prediction = createValidPrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      // All layers should pass for valid prediction
      const allPassed = result.validationLayers.every(l => 
        l.status === 'passed' || l.status === 'warning'
      );
      
      expect(allPassed).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('👤 Human Review Requirements', () => {
    test('should require human review for critical issues', async () => {
      const prediction = createImpossiblePrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      expect(result.humanReviewRequired).toBe(true);
    });

    test('should require human review for low confidence', async () => {
      const prediction = createValidPrediction({
        confidence: 0.3
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      expect(result.humanReviewRequired).toBe(true);
    });

    test('should require human review for multiple high severity issues', async () => {
      const prediction = {
        ...createValidPrediction(),
        value: -1000, // Issue 1
        probability: 2.0, // Issue 2
        confidence: 0.4 // Issue 3
      };
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const highSeverityCount = result.issues.filter(i => 
        i.severity === 'high' || i.severity === 'critical'
      ).length;
      
      expect(highSeverityCount).toBeGreaterThanOrEqual(2);
      expect(result.humanReviewRequired).toBe(true);
    });
  });

  describe('🛠️ Correction Application', () => {
    test('should apply value adjustments', async () => {
      const prediction = createImpossiblePrediction();
      
      const result = await validationService.validatePrediction(prediction, {});
      
      expect(result.corrections.length).toBeGreaterThan(0);
      
      const valueAdjustment = result.corrections.find(c => 
        c.correctionType === 'value_adjustment'
      );
      
      expect(valueAdjustment).toBeDefined();
    });

    test('should limit scope for outliers', async () => {
      // Mock statistical outlier
      validationService['getHistoricalData'] = vi.fn().mockResolvedValue(
        Array(100).fill({ value: 100000 })
      );
      
      const prediction = createValidPrediction({
        value: 10000000 // Major outlier
      });
      
      const result = await validationService.validatePrediction(prediction, {});
      
      const scopeCorrection = result.corrections.find(c => 
        c.correctionType === 'scope_limitation'
      );
      
      expect(scopeCorrection).toBeDefined();
      expect(scopeCorrection?.correctedValue).toHaveProperty('scope', 'limited');
    });
  });

  describe('🔊 Audit & Logging', () => {
    test('should audit all validations', async () => {
      const mockAuditLogger = {
        log: vi.fn().mockResolvedValue(true)
      };
      
      vi.doMock('@/lib/audit-logger', () => ({
        auditLogger: mockAuditLogger
      }));
      
      const prediction = createValidPrediction();
      await validationService.validatePrediction(prediction, {});
      
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PREDICTION_VALIDATED',
          resourceType: 'prediction_validation',
          resourceId: prediction.predictionId
        })
      );
    });
  });
});