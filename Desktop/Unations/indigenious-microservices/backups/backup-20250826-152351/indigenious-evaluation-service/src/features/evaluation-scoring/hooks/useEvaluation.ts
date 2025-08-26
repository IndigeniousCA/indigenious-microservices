// Hook for managing bid evaluation process
// Handles scoring, consensus building, and evaluation completion

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '@/core/providers/data-provider'
import type { 
  Evaluation, 
  EvaluatedBid, 
  BidScore,
  EvaluationStatus,
  AuditEntry
} from '../types/evaluation.types'

export function useEvaluation(rfqId: string) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const provider = useDataProvider()

  // Load evaluation data
  useEffect(() => {
    loadEvaluation()
  }, [rfqId])

  const loadEvaluation = async () => {
    try {
      setLoading(true)
      
      // Mock evaluation data
      const mockEvaluation: Evaluation = {
        id: `eval-${rfqId}`,
        rfqId,
        rfqTitle: 'Construction of Community Center',
        evaluatorId: 'current-user',
        evaluatorName: 'John Smith',
        createdAt: new Date().toISOString(),
        status: 'in_progress',
        
        settings: {
          evaluationType: 'consensus',
          blindEvaluation: true,
          showBidderNames: false,
          scoringMethod: 'points',
          evaluationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        
        criteria: [
          {
            id: 'c1',
            name: 'Price',
            category: 'price',
            weight: 30,
            maxPoints: 10,
            description: 'Competitive pricing and value for money'
          },
          {
            id: 'c2',
            name: 'Technical Approach',
            category: 'technical',
            weight: 25,
            maxPoints: 10,
            description: 'Quality of technical solution and methodology',
            subCriteria: [
              { id: 'c2-1', name: 'Methodology', maxPoints: 5 },
              { id: 'c2-2', name: 'Innovation', maxPoints: 5 }
            ]
          },
          {
            id: 'c3',
            name: 'Experience',
            category: 'experience',
            weight: 20,
            maxPoints: 10,
            description: 'Relevant experience and past performance'
          },
          {
            id: 'c4',
            name: 'Indigenous Content',
            category: 'indigenous_content',
            weight: 15,
            maxPoints: 10,
            description: 'Indigenous workforce and subcontracting'
          },
          {
            id: 'c5',
            name: 'Local Benefit',
            category: 'local_benefit',
            weight: 10,
            maxPoints: 10,
            description: 'Benefits to local community'
          }
        ],
        
        bids: generateMockBids(),
        
        auditLog: []
      }
      
      setEvaluation(mockEvaluation)
    } catch (err) {
      setError('Failed to load evaluation data')
      logger.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Generate mock bids
  function generateMockBids(): EvaluatedBid[] {
    const bidders = [
      { name: 'Eagle Construction Inc.', org: 'Cree Nation Enterprises' },
      { name: 'Northern Builders Ltd.', org: 'Métis Works Cooperative' },
      { name: 'Thunderbird Contracting', org: 'First Nations Development Corp' },
      { name: 'Maple Leaf Construction', org: 'General Contractors Inc.' },
      { name: 'Summit Engineering', org: 'Indigenous Tech Solutions' }
    ]

    return bidders.map((bidder, index) => {
      const scores = generateScores(index)
      const totalScore = calculateTotalScore(scores)
      const normalizedScore = (totalScore / 50) * 100 // Max 50 points

      return {
        bidId: `bid-${index + 1}`,
        bidderName: bidder.name,
        bidderOrganization: bidder.org,
        submittedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        
        scores,
        totalScore,
        normalizedScore,
        rank: 0, // Will be calculated later
        
        mandatoryCompliance: [
          {
            requirementId: 'req-1',
            requirement: 'Valid business license',
            status: 'pass',
            reviewedBy: 'System',
            reviewedAt: new Date().toISOString()
          },
          {
            requirementId: 'req-2',
            requirement: 'Insurance coverage',
            status: index === 3 ? 'fail' : 'pass',
            reviewedBy: 'System',
            reviewedAt: new Date().toISOString()
          }
        ],
        
        isCompliant: index !== 3, // Fourth bid is disqualified
        disqualificationReason: index === 3 ? 'Insufficient insurance coverage' : undefined,
        
        strengths: getStrengths(index),
        weaknesses: getWeaknesses(index),
        risks: getRisks(index),
        
        recommendation: getRecommendation(normalizedScore, index === 3),
        
        documentsReviewed: [
          {
            documentId: 'doc-1',
            documentName: 'Technical Proposal.pdf',
            reviewed: true,
            satisfactory: true
          }
        ]
      }
    })
  }

  // Generate scores for a bid
  function generateScores(bidIndex: number): BidScore[] {
    const baseScores = [
      { criterionId: 'c1', base: 8, variance: 1.5 },
      { criterionId: 'c2', base: 7, variance: 2 },
      { criterionId: 'c3', base: 8.5, variance: 1 },
      { criterionId: 'c4', base: 9, variance: 0.5 },
      { criterionId: 'c5', base: 7.5, variance: 1.5 }
    ]

    return baseScores.map(({ criterionId, base, variance }) => {
      const criterion = evaluation?.criteria.find(c => c.id === criterionId)!
      const score = Math.max(0, Math.min(10, base + (Math.random() - 0.5) * variance - bidIndex * 0.5))
      
      return {
        criterionId,
        criterionName: criterion.name,
        score: Math.round(score * 2) / 2, // Round to 0.5
        maxScore: criterion.maxPoints,
        weightedScore: (score * criterion.weight) / 10,
        justification: `Score based on ${criterion.name.toLowerCase()} evaluation`
      }
    })
  }

  // Calculate total score
  function calculateTotalScore(scores: BidScore[]): number {
    return scores.reduce((sum, s) => sum + s.weightedScore, 0)
  }

  // Get strengths
  function getStrengths(index: number): string[] {
    const strengths = [
      ['Strong technical approach', 'Experienced team', 'Competitive pricing'],
      ['Excellent Indigenous content', 'Local workforce', 'Innovative solutions'],
      ['Proven track record', 'Comprehensive methodology', 'Risk management'],
      ['Cost-effective solution', 'Quick delivery timeline', 'Modern equipment'],
      ['Sustainable practices', 'Community engagement', 'Quality assurance']
    ]
    return strengths[index] || []
  }

  // Get weaknesses
  function getWeaknesses(index: number): string[] {
    const weaknesses = [
      ['Limited local presence', 'Higher cost than average'],
      ['Tight timeline', 'Dependency on weather'],
      ['Limited equipment availability', 'Subcontractor risks'],
      ['Insurance coverage gaps', 'Incomplete documentation'],
      ['Higher pricing', 'Complex management structure']
    ]
    return weaknesses[index] || []
  }

  // Get risks
  function getRisks(index: number): string[] {
    const risks = [
      ['Weather delays possible', 'Material availability'],
      ['Resource constraints', 'Schedule conflicts'],
      ['Subcontractor reliability', 'Cost overruns'],
      ['Compliance issues', 'Financial stability'],
      ['Timeline aggressive', 'Scope creep potential']
    ]
    return risks[index] || []
  }

  // Get recommendation
  function getRecommendation(score: number, disqualified: boolean): any {
    if (disqualified) return 'not_recommended'
    if (score >= 85) return 'highly_recommended'
    if (score >= 70) return 'recommended'
    if (score >= 50) return 'acceptable'
    return 'not_recommended'
  }

  // Update score
  const updateScore = async (
    bidId: string, 
    criterionId: string, 
    score: number, 
    justification?: string
  ) => {
    if (!evaluation) return

    try {
      // Update bid scores
      const updatedBids = evaluation.bids.map(bid => {
        if (bid.bidId !== bidId) return bid

        const updatedScores = bid.scores.map(s => {
          if (s.criterionId !== criterionId) return s
          
          const criterion = evaluation.criteria.find(c => c.id === criterionId)!
          return {
            ...s,
            score,
            weightedScore: (score * criterion.weight) / 10,
            justification: justification || s.justification
          }
        })

        const totalScore = calculateTotalScore(updatedScores)
        const normalizedScore = (totalScore / 50) * 100

        return {
          ...bid,
          scores: updatedScores,
          totalScore,
          normalizedScore,
          recommendation: getRecommendation(normalizedScore, !bid.isCompliant)
        }
      })

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: 'current-user',
        userName: 'John Smith',
        action: 'score_updated',
        details: `Updated score for criterion "${criterionId}" to ${score}`,
        changes: [{
          field: 'score',
          oldValue: evaluation.bids.find(b => b.bidId === bidId)?.scores.find(s => s.criterionId === criterionId)?.score,
          newValue: score
        }]
      }

      setEvaluation({
        ...evaluation,
        bids: updatedBids,
        auditLog: [...evaluation.auditLog, auditEntry]
      })
    } catch (err) {
      setError('Failed to update score')
      throw err
    }
  }

  // Disqualify bid
  const disqualifyBid = async (bidId: string, reason: string) => {
    if (!evaluation) return

    try {
      const updatedBids = evaluation.bids.map(bid => {
        if (bid.bidId !== bidId) return bid

        return {
          ...bid,
          isCompliant: false,
          disqualificationReason: reason,
          recommendation: 'not_recommended' as const
        }
      })

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: 'current-user',
        userName: 'John Smith',
        action: 'bid_disqualified',
        details: `Disqualified bid: ${reason}`
      }

      setEvaluation({
        ...evaluation,
        bids: updatedBids,
        auditLog: [...evaluation.auditLog, auditEntry]
      })
    } catch (err) {
      setError('Failed to disqualify bid')
      throw err
    }
  }

  // Complete evaluation
  const completeEvaluation = async (consensusData?: any) => {
    if (!evaluation) return

    try {
      // Rank bids
      const rankedBids = [...evaluation.bids]
        .filter(b => b.isCompliant)
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((bid, index) => ({ ...bid, rank: index + 1 }))

      // Add disqualified bids at the end
      const disqualifiedBids = evaluation.bids
        .filter(b => !b.isCompliant)
        .map(bid => ({ ...bid, rank: undefined }))

      const allBids = [...rankedBids, ...disqualifiedBids]

      // Create results
      const results = {
        rankedBids: rankedBids.map(bid => ({
          rank: bid.rank!,
          bidId: bid.bidId,
          bidderName: bid.bidderName,
          totalScore: bid.totalScore,
          priceScore: bid.scores.find(s => s.criterionName === 'Price')?.weightedScore || 0,
          technicalScore: bid.scores.find(s => s.criterionName === 'Technical Approach')?.weightedScore || 0,
          scoreBreakdown: bid.scores.map(s => ({
            criterion: s.criterionName,
            score: s.score,
            weightedScore: s.weightedScore
          })),
          strengths: bid.strengths,
          concerns: bid.weaknesses,
          recommendation: `${bid.bidderName} is ${bid.recommendation.replace('_', ' ')}`
        })),
        recommendedBidId: rankedBids[0]?.bidId,
        justification: 'Based on comprehensive evaluation of all criteria',
        consensusReached: consensusData?.consensusReached || false
      }

      // Add audit entry
      const auditEntry: AuditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: 'current-user',
        userName: 'John Smith',
        action: 'evaluation_completed',
        details: 'Evaluation completed and ranking finalized'
      }

      setEvaluation({
        ...evaluation,
        bids: allBids,
        status: 'completed',
        completedAt: new Date().toISOString(),
        results,
        auditLog: [...evaluation.auditLog, auditEntry]
      })
    } catch (err) {
      setError('Failed to complete evaluation')
      throw err
    }
  }

  // Export results
  const exportResults = async () => {
    if (!evaluation) return

    try {
      // In real implementation, would generate PDF/Excel report
      const exportData = {
        evaluation: {
          id: evaluation.id,
          rfqTitle: evaluation.rfqTitle,
          evaluator: evaluation.evaluatorName,
          completedAt: evaluation.completedAt || 'In Progress'
        },
        results: evaluation.results,
        bids: evaluation.bids.map(bid => ({
          bidder: bid.bidderName,
          totalScore: bid.totalScore,
          rank: bid.rank,
          status: bid.isCompliant ? 'Compliant' : 'Disqualified',
          recommendation: bid.recommendation
        })),
        criteria: evaluation.criteria
      }

      // Download as JSON for now
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evaluation-${evaluation.rfqId}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export results')
      throw err
    }
  }

  return {
    evaluation,
    loading,
    error,
    updateScore,
    disqualifyBid,
    completeEvaluation,
    exportResults
  }
}