// Predictive Analytics Service
import { 
  BidPrediction, PredictionFactor, Recommendation, 
  CompetitorInsight, HistoricalPattern, TimelineInsight,
  PriceInsight, RiskFactor, AnalyticsSnapshot,
  SuccessPattern, BenchmarkData, SeasonalTrend
} from '../types'

export class PredictionService {
  // Main prediction engine
  async predictBidSuccess(
    rfqId: string, 
    businessId: string, 
    bidDetails?: any
  ): Promise<BidPrediction> {
    // In production, this would call ML models
    const factors = await this.analyzeFactors(rfqId, businessId, bidDetails)
    const competitors = await this.analyzeCompetitors(rfqId, businessId)
    const historical = await this.analyzeHistoricalPatterns(rfqId, businessId)
    const timeline = await this.analyzeTimeline(rfqId, businessId)
    const pricing = await this.analyzePricing(rfqId, businessId, bidDetails)
    const risks = await this.assessRisks(rfqId, businessId, bidDetails)
    
    // Calculate overall success probability
    const successProbability = this.calculateSuccessProbability(factors)
    const recommendations = this.generateRecommendations(factors, successProbability)
    
    return {
      id: `pred-${Date.now()}`,
      rfqId,
      businessId,
      predictionDate: new Date(),
      successProbability,
      confidenceLevel: this.calculateConfidence(factors, historical),
      factors,
      recommendations,
      competitorAnalysis: competitors,
      historicalComparison: historical,
      timelineAnalysis: timeline,
      priceAnalysis: pricing,
      riskAssessment: risks
    }
  }

  private async analyzeFactors(
    rfqId: string, 
    businessId: string, 
    bidDetails?: any
  ): Promise<PredictionFactor[]> {
    // Mock factor analysis - in production would use ML
    return [
      {
        category: 'experience',
        name: 'Relevant Past Projects',
        impact: 'positive',
        score: 85,
        weight: 0.25,
        explanation: 'Strong track record with 12 similar projects completed successfully',
        improvable: false
      },
      {
        category: 'price',
        name: 'Price Competitiveness',
        impact: 'neutral',
        score: 0,
        weight: 0.20,
        explanation: 'Pricing not yet determined',
        improvable: true,
        improvementSuggestions: [
          'Analyze competitor pricing from last 6 months',
          'Consider value-based pricing model',
          'Highlight cost savings in proposal'
        ]
      },
      {
        category: 'team',
        name: 'Team Qualifications',
        impact: 'positive',
        score: 78,
        weight: 0.15,
        explanation: 'Team has required certifications, could benefit from specific training',
        improvable: true,
        improvementSuggestions: [
          'Get cloud architecture certification for lead developer',
          'Add Indigenous cultural training certificates'
        ]
      },
      {
        category: 'indigenous-benefit',
        name: 'Indigenous Impact Score',
        impact: 'positive',
        score: 95,
        weight: 0.15,
        explanation: '100% Indigenous owned with strong community benefits program',
        improvable: false
      },
      {
        category: 'compliance',
        name: 'Mandatory Requirements',
        impact: 'positive',
        score: 100,
        weight: 0.10,
        explanation: 'All mandatory requirements met',
        improvable: false
      },
      {
        category: 'timeline',
        name: 'Delivery Schedule',
        impact: 'negative',
        score: -20,
        weight: 0.10,
        explanation: 'Current capacity constraints may impact timeline',
        improvable: true,
        improvementSuggestions: [
          'Consider partnership to increase capacity',
          'Hire additional contractors',
          'Negotiate phased delivery approach'
        ]
      },
      {
        category: 'location',
        name: 'Geographic Advantage',
        impact: 'positive',
        score: 60,
        weight: 0.05,
        explanation: 'Local presence in project region',
        improvable: false
      }
    ]
  }

  private calculateSuccessProbability(factors: PredictionFactor[]): number {
    let weightedSum = 0
    let totalWeight = 0
    
    factors.forEach(factor => {
      // Convert -100 to 100 score to 0 to 100
      const normalizedScore = (factor.score + 100) / 2
      weightedSum += normalizedScore * factor.weight
      totalWeight += factor.weight
    })
    
    const baseScore = weightedSum / totalWeight
    
    // Apply confidence adjustments
    const confidenceMultiplier = 0.95 // Conservative estimate
    
    return Math.round(baseScore * confidenceMultiplier)
  }

  private calculateConfidence(
    factors: PredictionFactor[], 
    historical: HistoricalPattern[]
  ): 'high' | 'medium' | 'low' {
    const dataQuality = factors.filter(f => f.score !== 0).length / factors.length
    const historicalRelevance = historical.reduce((sum, h) => sum + h.relevance, 0) / historical.length
    
    const confidenceScore = (dataQuality * 0.6) + (historicalRelevance * 0.4 / 100)
    
    if (confidenceScore > 0.8) return 'high'
    if (confidenceScore > 0.5) return 'medium'
    return 'low'
  }

  private generateRecommendations(
    factors: PredictionFactor[], 
    currentProbability: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // Find improvable factors with negative or low scores
    const improvableFactors = factors
      .filter(f => f.improvable)
      .sort((a, b) => a.score - b.score)
    
    improvableFactors.forEach(factor => {
      if (factor.score < 50) {
        const potentialImprovement = factor.weight * (50 - factor.score) / 2
        
        recommendations.push({
          id: `rec-${factor.category}`,
          priority: factor.weight > 0.15 ? 'high' : 'medium',
          category: factor.category,
          title: `Improve ${factor.name}`,
          description: factor.explanation,
          expectedImpact: Math.round(potentialImprovement),
          effort: this.estimateEffort(factor),
          timeRequired: this.estimateTime(factor),
          actionItems: factor.improvementSuggestions || [],
          relatedFactors: [factor.category]
        })
      }
    })
    
    // Add strategic recommendations
    if (currentProbability < 70) {
      recommendations.push({
        id: 'rec-consortium',
        priority: 'high',
        category: 'strategy',
        title: 'Consider Forming a Consortium',
        description: 'Partnering with complementary businesses could significantly increase win probability',
        expectedImpact: 15,
        effort: 'medium',
        timeRequired: '2-3 days',
        actionItems: [
          'Use Consortium Matcher to find partners',
          'Draft partnership agreement',
          'Align on bid strategy'
        ],
        relatedFactors: ['team', 'experience', 'capacity']
      })
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  private estimateEffort(factor: PredictionFactor): 'low' | 'medium' | 'high' {
    if (factor.category === 'price') return 'low'
    if (factor.category === 'team' || factor.category === 'timeline') return 'medium'
    return 'high'
  }

  private estimateTime(factor: PredictionFactor): string {
    const timeEstimates = {
      price: '1-2 hours',
      team: '1-2 weeks',
      timeline: '2-3 days',
      experience: '1-3 months',
      compliance: '1-2 weeks',
      'indigenous-benefit': '1-2 days',
      'past-performance': 'ongoing',
      location: 'N/A'
    }
    return timeEstimates[factor.category] || '1 week'
  }

  private async analyzeCompetitors(
    rfqId: string, 
    businessId: string
  ): Promise<CompetitorInsight[]> {
    // Mock competitor analysis
    return [
      {
        competitorName: 'Large Corp A',
        isAnonymized: true,
        estimatedStrength: 75,
        advantages: [
          'Larger team capacity',
          'More capital resources',
          'Existing government relationships'
        ],
        yourAdvantages: [
          '100% Indigenous owned',
          'Local community connections',
          'More competitive pricing',
          'Agile delivery approach'
        ],
        winRate: 45,
        typicalBidRange: {
          min: 400000,
          max: 600000
        }
      },
      {
        competitorName: 'Indigenous Business B',
        isAnonymized: true,
        estimatedStrength: 82,
        advantages: [
          'Similar Indigenous ownership',
          'Strong past performance',
          'Specialized expertise'
        ],
        yourAdvantages: [
          'Better geographic coverage',
          'More diverse capabilities',
          'Partnership opportunities'
        ],
        winRate: 38,
        pastCollaborations: 2
      }
    ]
  }

  private async analyzeHistoricalPatterns(
    rfqId: string, 
    businessId: string
  ): Promise<HistoricalPattern[]> {
    return [
      {
        pattern: 'Similar RFQs tend to favor Indigenous businesses with local presence',
        frequency: 0.73,
        relevance: 90,
        examples: [
          {
            rfqId: 'rfq-2023-445',
            rfqTitle: 'IT Infrastructure Upgrade - Northern Region',
            date: new Date('2023-08-15'),
            outcome: 'won',
            similarity: 87,
            keyFactors: ['Indigenous ownership', 'Local team', 'Competitive price']
          }
        ],
        insight: 'Your local presence and Indigenous ownership are strong advantages'
      },
      {
        pattern: 'Government prefers phased delivery for large projects',
        frequency: 0.65,
        relevance: 75,
        examples: [],
        insight: 'Consider proposing a phased approach to reduce risk'
      }
    ]
  }

  private async analyzeTimeline(
    rfqId: string, 
    businessId: string
  ): Promise<TimelineInsight> {
    const now = new Date()
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    
    return {
      recommendedSubmissionTime: new Date(deadline.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
      criticalMilestones: [
        {
          name: 'Initial bid draft',
          suggestedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          importance: 'critical',
          dependencies: []
        },
        {
          name: 'Partner agreements finalized',
          suggestedDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          importance: 'critical',
          dependencies: ['Initial bid draft']
        },
        {
          name: 'Final review and polish',
          suggestedDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
          importance: 'important',
          dependencies: ['Partner agreements finalized']
        }
      ],
      preparationTimeNeeded: 120, // hours
      rushPenalty: 15, // % reduction if rushed
      optimalStartDate: now
    }
  }

  private async analyzePricing(
    rfqId: string, 
    businessId: string,
    bidDetails?: any
  ): Promise<PriceInsight> {
    return {
      recommendedRange: {
        min: 380000,
        max: 480000,
        optimal: 425000
      },
      marketAverage: 450000,
      priceCompetitiveness: 78,
      marginAnalysis: {
        atOptimal: 0.22,
        atMin: 0.15,
        atMax: 0.28
      },
      historicalWinningPrices: [
        {
          date: new Date('2023-09-01'),
          amount: 415000,
          wonBid: true,
          projectSize: 'large',
          similarity: 85
        },
        {
          date: new Date('2023-07-15'),
          amount: 390000,
          wonBid: true,
          projectSize: 'medium',
          similarity: 72
        }
      ]
    }
  }

  private async assessRisks(
    rfqId: string, 
    businessId: string,
    bidDetails?: any
  ): Promise<RiskFactor[]> {
    return [
      {
        id: 'risk-1',
        category: 'timeline',
        risk: 'Current project commitments may impact delivery schedule',
        probability: 'medium',
        impact: 'high',
        mitigationStrategies: [
          'Secure additional contractors early',
          'Negotiate flexible timeline with client',
          'Consider partnership to share workload'
        ],
        monitoringRequired: true
      },
      {
        id: 'risk-2',
        category: 'financial',
        risk: 'Large project may strain cash flow',
        probability: 'low',
        impact: 'medium',
        mitigationStrategies: [
          'Negotiate milestone-based payments',
          'Secure line of credit',
          'Consider invoice factoring'
        ],
        monitoringRequired: true
      },
      {
        id: 'risk-3',
        category: 'technical',
        risk: 'New technology requirements need team training',
        probability: 'medium',
        impact: 'low',
        mitigationStrategies: [
          'Start training immediately',
          'Hire consultants with expertise',
          'Build training costs into bid'
        ],
        monitoringRequired: false
      }
    ]
  }

  // Business Analytics Methods
  async getBusinessAnalytics(
    businessId: string,
    period: 'week' | 'month' | 'quarter' | 'year' | 'all-time'
  ): Promise<AnalyticsSnapshot> {
    // In production, aggregate from historical data
    return {
      businessId,
      period,
      startDate: new Date('2023-01-01'),
      endDate: new Date(),
      metrics: {
        totalBids: 45,
        wonBids: 18,
        lostBids: 22,
        withdrawnBids: 5,
        winRate: 40,
        averageScore: 78,
        totalValue: 8500000,
        wonValue: 3400000,
        averageMargin: 0.24,
        medianBidSize: 189000
      },
      trends: {
        winRateTrend: 'improving',
        bidSizeTrend: 'increasing',
        marginTrend: 'stable'
      },
      strengths: [
        {
          area: 'Indigenous Benefits',
          description: 'Consistently high scores on Indigenous impact criteria',
          impact: '+15% win rate vs average',
          examples: ['Community hiring programs', 'Elder consultation processes']
        },
        {
          area: 'Technical Excellence',
          description: 'Strong technical proposals with innovative solutions',
          impact: '+20% technical scores',
          examples: ['Cloud migration project', 'Security implementation']
        }
      ],
      weaknesses: [
        {
          area: 'Pricing Strategy',
          description: 'Occasionally priced out of competitive range',
          impact: '-10% win rate on price-sensitive RFQs',
          examples: ['Lost 3 bids due to pricing'],
          improvementPlan: 'Implement dynamic pricing model'
        }
      ],
      opportunities: [
        {
          id: 'opp-1',
          type: 'certification',
          title: 'ISO 27001 Certification',
          description: 'Would qualify for additional 20% of RFQs',
          potentialValue: 1200000,
          effort: 'medium',
          timeframe: '3-6 months',
          requirements: ['Security audit', 'Process documentation', 'Training'],
          successProbability: 85
        }
      ]
    }
  }

  async getBenchmarks(businessId: string): Promise<BenchmarkData[]> {
    return [
      {
        category: 'Win Rate',
        yourScore: 40,
        industryAverage: 28,
        topPerformers: 55,
        indigenousAverage: 35,
        percentile: 75,
        improvementTarget: 45
      },
      {
        category: 'Bid Quality Score',
        yourScore: 78,
        industryAverage: 72,
        topPerformers: 88,
        indigenousAverage: 75,
        percentile: 68,
        improvementTarget: 82
      },
      {
        category: 'On-Time Delivery',
        yourScore: 92,
        industryAverage: 85,
        topPerformers: 98,
        indigenousAverage: 87,
        percentile: 82,
        improvementTarget: 95
      }
    ]
  }

  async getSuccessPatterns(businessId: string): Promise<SuccessPattern[]> {
    return [
      {
        id: 'pattern-1',
        name: 'Consortium Power Play',
        description: 'Form strategic consortiums for large projects',
        applicability: 85,
        successRate: 73,
        requirements: [
          'Complementary partner capabilities',
          'Clear partnership agreement',
          'Joint bid experience'
        ],
        examples: [
          'Northern Construction Alliance won $5M infrastructure project',
          'Tech Partners Consortium secured government IT contract'
        ],
        implementationGuide: [
          'Identify capability gaps in your bids',
          'Use Consortium Matcher to find partners',
          'Start with smaller joint projects',
          'Build trust and working relationships'
        ]
      },
      {
        id: 'pattern-2',
        name: 'Early Engagement Strategy',
        description: 'Engage with buyers during pre-RFQ consultations',
        applicability: 92,
        successRate: 68,
        requirements: [
          'Active government relationships',
          'Industry expertise',
          'Time for engagement'
        ],
        examples: [
          'Influenced requirements for IT modernization RFQ',
          'Provided input on Indigenous procurement goals'
        ],
        implementationGuide: [
          'Monitor upcoming opportunities early',
          'Attend industry days and consultations',
          'Provide thoughtful feedback on draft RFQs',
          'Build relationships with procurement officers'
        ]
      }
    ]
  }

  async getSeasonalTrends(businessId: string): Promise<SeasonalTrend> {
    return {
      period: 'quarterly',
      data: [
        {
          period: 'Q1',
          bidsAvailable: 125,
          competitionLevel: 0.65,
          averageSuccessRate: 0.42,
          recommendedFocus: ['Government fiscal year-end', 'Construction prep']
        },
        {
          period: 'Q2',
          bidsAvailable: 180,
          competitionLevel: 0.80,
          averageSuccessRate: 0.38,
          recommendedFocus: ['Summer construction', 'IT implementations']
        },
        {
          period: 'Q3',
          bidsAvailable: 145,
          competitionLevel: 0.70,
          averageSuccessRate: 0.40,
          recommendedFocus: ['Fall project starts', 'Training programs']
        },
        {
          period: 'Q4',
          bidsAvailable: 95,
          competitionLevel: 0.55,
          averageSuccessRate: 0.45,
          recommendedFocus: ['Year-end services', 'Planning studies']
        }
      ],
      insights: [
        'Q2 has most opportunities but highest competition',
        'Q4 has best win rates due to lower competition',
        'Q1 aligns with government fiscal year-end spending'
      ],
      recommendations: [
        'Build capacity for Q2 surge',
        'Focus on relationship building in Q4',
        'Prepare standard templates in Q1'
      ]
    }
  }
}