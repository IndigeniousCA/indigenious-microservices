import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScoringAlgorithm, BidEvaluation, CommunityWeights } from '../scoring-algorithm'

describe('RFQ Scoring Algorithm - Military Grade Testing', () => {
  let scoringAlgorithm: ScoringAlgorithm
  
  beforeEach(() => {
    scoringAlgorithm = new ScoringAlgorithm()
  })

  describe('Community-Controlled Weighting System', () => {
    it('should correctly apply community-defined weights to bid evaluation', () => {
      const communityWeights: CommunityWeights = {
        price: 0.3,
        indigenousEmployment: 0.25,
        environmentalImpact: 0.2,
        localContent: 0.15,
        pastPerformance: 0.1,
      }
      
      const bid: BidEvaluation = {
        price: 85, // Lower is better, scored out of 100
        indigenousEmployment: 95, // % of Indigenous employees
        environmentalImpact: 80, // Environmental score
        localContent: 90, // % of local suppliers
        pastPerformance: 75, // Historical performance score
      }
      
      const score = scoringAlgorithm.calculateWeightedScore(bid, communityWeights)
      
      // Expected: (85*0.3) + (95*0.25) + (80*0.2) + (90*0.15) + (75*0.1) = 86.25
      expect(score).toBe(86.25)
    })

    it('should validate that weights sum to 1.0', () => {
      const invalidWeights: CommunityWeights = {
        price: 0.5,
        indigenousEmployment: 0.3,
        environmentalImpact: 0.3, // Sum = 1.1
        localContent: 0.0,
        pastPerformance: 0.0,
      }
      
      expect(() => 
        scoringAlgorithm.validateWeights(invalidWeights)
      ).toThrow('Community weights must sum to 1.0')
    })

    it('should enforce minimum weight requirements for critical factors', () => {
      const weights: CommunityWeights = {
        price: 0.9,
        indigenousEmployment: 0.05, // Below minimum
        environmentalImpact: 0.05,
        localContent: 0.0,
        pastPerformance: 0.0,
      }
      
      const validation = scoringAlgorithm.validateMinimumWeights(weights)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Indigenous employment weight must be at least 10%')
    })
  })

  describe('Price Normalization', () => {
    it('should correctly normalize bid prices for fair comparison', () => {
      const bids = [
        { id: '1', price: 100000 },
        { id: '2', price: 120000 },
        { id: '3', price: 80000 }, // Lowest
        { id: '4', price: 150000 },
      ]
      
      const normalized = scoringAlgorithm.normalizePrices(bids)
      
      // Lowest price should get score of 100
      expect(normalized.find(b => b.id === '3')?.normalizedPrice).toBe(100)
      
      // Others scored relative to lowest
      expect(normalized.find(b => b.id === '1')?.normalizedPrice).toBe(80) // 80000/100000 * 100
      expect(normalized.find(b => b.id === '2')?.normalizedPrice).toBeCloseTo(66.67, 1)
      expect(normalized.find(b => b.id === '4')?.normalizedPrice).toBeCloseTo(53.33, 1)
    })

    it('should handle edge case of identical prices', () => {
      const bids = [
        { id: '1', price: 100000 },
        { id: '2', price: 100000 },
        { id: '3', price: 100000 },
      ]
      
      const normalized = scoringAlgorithm.normalizePrices(bids)
      
      // All should get perfect score
      normalized.forEach(bid => {
        expect(bid.normalizedPrice).toBe(100)
      })
    })
  })

  describe('Indigenous Business Preference', () => {
    it('should apply 5% preference to verified Indigenous businesses', () => {
      const bid1 = {
        vendorId: 'indigenous-001',
        isIndigenousBusiness: true,
        baseScore: 85,
      }
      
      const bid2 = {
        vendorId: 'non-indigenous-001',
        isIndigenousBusiness: false,
        baseScore: 87,
      }
      
      const adjustedScores = scoringAlgorithm.applyIndigenousPreference([bid1, bid2])
      
      // Indigenous business gets 5% boost
      expect(adjustedScores[0].finalScore).toBe(89.25) // 85 * 1.05
      expect(adjustedScores[1].finalScore).toBe(87)
    })

    it('should cap Indigenous preference boost at 100 points', () => {
      const bid = {
        vendorId: 'indigenous-001',
        isIndigenousBusiness: true,
        baseScore: 96,
      }
      
      const [adjusted] = scoringAlgorithm.applyIndigenousPreference([bid])
      
      // Should cap at 100, not 100.8
      expect(adjusted.finalScore).toBe(100)
    })
  })

  describe('Evaluation Matrix Compliance', () => {
    it('should generate compliant evaluation matrix for government audit', () => {
      const rfqId = 'RFQ-2024-001'
      const evaluations = [
        {
          bidId: 'BID-001',
          scores: {
            technical: 85,
            financial: 90,
            management: 80,
            indigenousValue: 95,
          },
          evaluatorId: 'EVAL-001',
        },
      ]
      
      const matrix = scoringAlgorithm.generateEvaluationMatrix(rfqId, evaluations)
      
      expect(matrix.rfqId).toBe(rfqId)
      expect(matrix.timestamp).toBeDefined()
      expect(matrix.evaluations).toHaveLength(1)
      expect(matrix.signature).toBeDefined() // Cryptographic signature for integrity
    })
  })

  describe('Consensus Building', () => {
    it('should calculate consensus scores from multiple evaluators', () => {
      const bidId = 'BID-001'
      const evaluatorScores = [
        { evaluatorId: 'E1', score: 85 },
        { evaluatorId: 'E2', score: 87 },
        { evaluatorId: 'E3', score: 83 },
        { evaluatorId: 'E4', score: 89 },
        { evaluatorId: 'E5', score: 86 },
      ]
      
      const consensus = scoringAlgorithm.calculateConsensus(bidId, evaluatorScores)
      
      expect(consensus.meanScore).toBe(86)
      expect(consensus.medianScore).toBe(86)
      expect(consensus.standardDeviation).toBeCloseTo(2.24, 2)
      expect(consensus.outliers).toHaveLength(0) // No significant outliers
    })

    it('should identify and flag outlier evaluations', () => {
      const bidId = 'BID-001'
      const evaluatorScores = [
        { evaluatorId: 'E1', score: 85 },
        { evaluatorId: 'E2', score: 87 },
        { evaluatorId: 'E3', score: 45 }, // Outlier
        { evaluatorId: 'E4', score: 86 },
        { evaluatorId: 'E5', score: 88 },
      ]
      
      const consensus = scoringAlgorithm.calculateConsensus(bidId, evaluatorScores)
      
      expect(consensus.outliers).toContain('E3')
      expect(consensus.requiresReview).toBe(true)
    })
  })

  describe('Scoring Algorithm Security', () => {
    it('should prevent score manipulation through input validation', () => {
      const maliciousBid = {
        scores: {
          technical: 150, // Over 100
          financial: -10, // Negative
          management: NaN,
          indigenousValue: Infinity,
        },
      }
      
      expect(() => 
        scoringAlgorithm.validateBidScores(maliciousBid)
      ).toThrow('Invalid bid scores detected')
    })

    it('should maintain audit trail for all score calculations', () => {
      const bid = {
        id: 'BID-001',
        scores: { technical: 85, financial: 90 },
      }
      
      const result = scoringAlgorithm.calculateWithAudit(bid)
      
      expect(result.auditTrail).toBeDefined()
      expect(result.auditTrail.calculations).toHaveLength(2)
      expect(result.auditTrail.timestamp).toBeDefined()
      expect(result.auditTrail.algorithmVersion).toBe('1.0.0')
    })
  })

  describe('Performance Under Load', () => {
    it('should handle evaluation of 1000+ bids within performance threshold', () => {
      const bids = Array.from({ length: 1000 }, (_, i) => ({
        id: `BID-${i}`,
        price: 100000 + Math.random() * 50000,
        scores: {
          technical: 70 + Math.random() * 30,
          indigenousEmployment: 60 + Math.random() * 40,
        },
      }))
      
      const startTime = performance.now()
      const results = scoringAlgorithm.evaluateBulkBids(bids)
      const endTime = performance.now()
      
      expect(results).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(100) // Should process in < 100ms
    })
  })
})