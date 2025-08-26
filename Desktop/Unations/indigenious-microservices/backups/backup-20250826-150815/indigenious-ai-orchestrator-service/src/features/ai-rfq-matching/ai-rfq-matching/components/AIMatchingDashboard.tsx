'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { Brain, TrendingUp, Target, Sparkles, ChevronRight, Award, AlertTriangle, Lightbulb } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIRFQMatcher } from '../services/rfq-matcher'

interface MatchResult {
  rfqId: string
  rfq: {
    title: string
    organization: string
    budget: { min: number; max: number }
    closingDate: string
    location: string
  }
  score: number
  winProbability: number
  reasons: string[]
  recommendations: string[]
}

export function AIMatchingDashboard({ businessId }: { businessId: string }) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null)

  useEffect(() => {
    loadMatches()
  }, [businessId])

  const loadMatches = async () => {
    setLoading(true)
    try {
      // In production, this would call the actual AI service
      // For now, we'll use mock data
      const mockMatches: MatchResult[] = [
        {
          rfqId: '1',
          rfq: {
            title: 'Solar Panel Installation - Health Center',
            organization: 'Health Canada',
            budget: { min: 250000, max: 500000 },
            closingDate: '2025-07-20',
            location: 'Treaty 6 Territory'
          },
          score: 0.94,
          winProbability: 0.87,
          reasons: [
            '✅ Strong technical fit: 3 relevant certifications',
            '📍 Local advantage: Based in Treaty 6 Territory',
            '🏆 Won 2 similar solar projects',
            '⚡ Perfect capacity match for project timeline'
          ],
          recommendations: [
            '💡 Highlight your recent solar installation at Maskwacis'
          ]
        },
        {
          rfqId: '2',
          rfq: {
            title: 'Network Infrastructure Upgrade',
            organization: 'Indigenous Services Canada',
            budget: { min: 150000, max: 300000 },
            closingDate: '2025-07-15',
            location: 'Northern Alberta'
          },
          score: 0.88,
          winProbability: 0.76,
          reasons: [
            '✅ IT infrastructure expertise matches perfectly',
            '💰 Historically competitive pricing (78% win rate)',
            '🤝 Strong Indigenous community alignment',
            '📊 Similar project completed under budget'
          ],
          recommendations: [
            '🎓 Obtain Cisco certification to improve score to 95%',
            '👥 Consider partnering with LocalTech for fiber expertise'
          ]
        },
        {
          rfqId: '3',
          rfq: {
            title: 'Cultural Center Construction',
            organization: 'Métis Nation of Alberta',
            budget: { min: 1000000, max: 2000000 },
            closingDate: '2025-08-01',
            location: 'Edmonton Region'
          },
          score: 0.79,
          winProbability: 0.62,
          reasons: [
            '🏗️ Construction experience in cultural projects',
            '🤝 Strong relationship with Métis communities',
            '📍 Regional presence in Edmonton'
          ],
          recommendations: [
            '👥 Partner with certified Indigenous architect',
            '💼 Increase bonding capacity to $2M for automatic qualification',
            '📋 Add LEED certification for sustainability bonus points'
          ]
        }
      ]
      
      setMatches(mockMatches)
    } catch (error) {
      logger.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400'
    if (score >= 0.8) return 'text-blue-400'
    if (score >= 0.7) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <LiquidGlass variant="aurora" intensity="medium" className="p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI-Powered RFQ Matching</h1>
              <p className="text-white/70">Your personal AI finds the best opportunities for you</p>
            </div>
          </div>
          <LiquidGlassButton onClick={loadMatches}>
            <Sparkles className="w-4 h-4 mr-2" />
            Refresh Matches
          </LiquidGlassButton>
        </div>
      </LiquidGlass>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiquidGlass variant="frost" intensity="light" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-bold text-white">12</span>
          </div>
          <p className="text-white/80">Perfect Matches</p>
          <p className="text-sm text-white/60 mt-1">Above 90% win probability</p>
        </LiquidGlass>

        <LiquidGlass variant="frost" intensity="light" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <span className="text-2xl font-bold text-white">$3.2M</span>
          </div>
          <p className="text-white/80">Opportunity Value</p>
          <p className="text-sm text-white/60 mt-1">This month's pipeline</p>
        </LiquidGlass>

        <LiquidGlass variant="frost" intensity="light" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-6 h-6 text-purple-400" />
            <span className="text-2xl font-bold text-white">87%</span>
          </div>
          <p className="text-white/80">Avg Win Probability</p>
          <p className="text-sm text-white/60 mt-1">AI confidence score</p>
        </LiquidGlass>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Top Matches for You</h2>
        
        {loading ? (
          <LiquidGlass variant="clear" intensity="light" className="p-12 text-center">
            <div className="animate-pulse">
              <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-white/70">AI is analyzing opportunities...</p>
            </div>
          </LiquidGlass>
        ) : (
          <AnimatePresence>
            {matches.map((match, index) => (
              <motion.div
                key={match.rfqId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <LiquidGlassCard 
                  variant={match.score >= 0.9 ? 'aurora' : 'frost'}
                  className="cursor-pointer"
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className={`text-4xl font-bold ${getScoreColor(match.score)}`}>
                          {Math.round(match.score * 100)}%
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {match.rfq.title}
                          </h3>
                          <p className="text-white/70 text-sm mb-2">
                            {match.rfq.organization} • {match.rfq.location}
                          </p>
                          
                          {/* Key Info */}
                          <div className="flex items-center gap-6 text-sm mb-3">
                            <span className="text-green-400">
                              {formatCurrency(match.rfq.budget.min)} - {formatCurrency(match.rfq.budget.max)}
                            </span>
                            <span className="text-white/60">
                              Closes {new Date(match.rfq.closingDate).toLocaleDateString()}
                            </span>
                            <span className="text-purple-400">
                              {Math.round(match.winProbability * 100)}% win probability
                            </span>
                          </div>

                          {/* Top Reasons */}
                          <div className="space-y-1">
                            {match.reasons.slice(0, 2).map((reason, i) => (
                              <p key={i} className="text-sm text-white/80">{reason}</p>
                            ))}
                          </div>

                          {/* Recommendations */}
                          {match.recommendations.length > 0 && (
                            <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-400/30">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5" />
                                <p className="text-sm text-yellow-300">
                                  {match.recommendations[0]}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 ml-4" />
                  </div>
                </LiquidGlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* AI Recommendations */}
      <LiquidGlass variant="clear" intensity="light" className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          AI Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-white/80">
              <strong className="text-green-400">Strength:</strong> Your solar installation experience gives you a 94% match rate for renewable energy RFQs
            </p>
            <p className="text-sm text-white/80">
              <strong className="text-blue-400">Opportunity:</strong> Adding ISO 27001 certification would unlock 15 more high-value IT contracts
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-white/80">
              <strong className="text-purple-400">Trend:</strong> Government RFQs in your region are increasing 23% month-over-month
            </p>
            <p className="text-sm text-white/80">
              <strong className="text-yellow-400">Action:</strong> Update your capacity - you're showing as 80% booked but have room for more
            </p>
          </div>
        </div>
      </LiquidGlass>
    </div>
  )
}