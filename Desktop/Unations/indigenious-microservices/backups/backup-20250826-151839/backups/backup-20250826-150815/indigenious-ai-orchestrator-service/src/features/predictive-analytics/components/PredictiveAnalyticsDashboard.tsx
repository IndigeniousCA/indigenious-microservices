'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, TrendingUp, Target, AlertTriangle, 
  Trophy, Users, DollarSign, Calendar,
  BarChart3, PieChart, Activity, Zap,
  ChevronRight, ChevronUp, ChevronDown,
  RefreshCw, Download, Filter, Info
} from 'lucide-react'
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { PredictionService } from '../services/PredictionService'
import { 
  BidPrediction, AnalyticsSnapshot, BenchmarkData, 
  SuccessPattern, SeasonalTrend, PredictionFactor,
  Recommendation
} from '../types'

interface PredictiveAnalyticsDashboardProps {
  businessId: string
  rfqId?: string
  onActionClick?: (action: string, data?: any) => void
}

export function PredictiveAnalyticsDashboard({ 
  businessId, 
  rfqId,
  onActionClick 
}: PredictiveAnalyticsDashboardProps) {
  const [predictionService] = useState(() => new PredictionService())
  const [activeTab, setActiveTab] = useState<'prediction' | 'analytics' | 'patterns' | 'benchmarks'>('prediction')
  const [prediction, setPrediction] = useState<BidPrediction | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([])
  const [patterns, setPatterns] = useState<SuccessPattern[]>([])
  const [seasonalTrends, setSeasonalTrends] = useState<SeasonalTrend | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('quarter')

  useEffect(() => {
    loadData()
  }, [businessId, rfqId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load prediction if RFQ is provided
      if (rfqId) {
        const pred = await predictionService.predictBidSuccess(rfqId, businessId)
        setPrediction(pred)
      }

      // Load analytics
      const analyticsData = await predictionService.getBusinessAnalytics(businessId, selectedPeriod)
      setAnalytics(analyticsData)

      // Load benchmarks
      const benchmarkData = await predictionService.getBenchmarks(businessId)
      setBenchmarks(benchmarkData)

      // Load patterns
      const patternData = await predictionService.getSuccessPatterns(businessId)
      setPatterns(patternData)

      // Load seasonal trends
      const trends = await predictionService.getSeasonalTrends(businessId)
      setSeasonalTrends(trends)
    } catch (error) {
      logger.error('Error loading predictive analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFactorIcon = (category: string) => {
    const icons = {
      experience: Trophy,
      price: DollarSign,
      team: Users,
      timeline: Calendar,
      compliance: Target,
      'indigenous-benefit': Users,
      'past-performance': BarChart3,
      location: Target
    }
    return icons[category] || Target
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-400'
      case 'negative': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  const renderPredictionTab = () => {
    if (!prediction) {
      return (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Select an RFQ to see bid predictions</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Success Probability */}
        <LiquidGlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Success Probability</h3>
              <p className="text-sm text-white/60">Based on AI analysis of {prediction.factors.length} factors</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-white">{prediction.successProbability}%</p>
              <p className="text-sm text-white/60">Confidence: {prediction.confidenceLevel}</p>
            </div>
          </div>

          {/* Probability Gauge */}
          <div className="relative h-8 bg-white/10 rounded-full overflow-hidden mb-4">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${prediction.successProbability}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {prediction.successProbability < 30 && 'Low Chance'}
                {prediction.successProbability >= 30 && prediction.successProbability < 70 && 'Moderate Chance'}
                {prediction.successProbability >= 70 && 'High Chance'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {prediction.factors.filter(f => f.impact === 'positive').length}
              </p>
              <p className="text-xs text-white/60">Strengths</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {prediction.factors.filter(f => f.impact === 'neutral').length}
              </p>
              <p className="text-xs text-white/60">Neutral</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">
                {prediction.factors.filter(f => f.impact === 'negative').length}
              </p>
              <p className="text-xs text-white/60">Weaknesses</p>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Key Factors */}
        <LiquidGlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Key Success Factors</h3>
          <div className="space-y-3">
            {prediction.factors.map((factor, index) => {
              const Icon = getFactorIcon(factor.category)
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-white/10`}>
                    <Icon className={`w-5 h-5 ${getImpactColor(factor.impact)}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium">{factor.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getImpactColor(factor.impact)}`}>
                          {factor.score > 0 ? '+' : ''}{factor.score}
                        </span>
                        {factor.improvable && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            Improvable
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/60">{factor.explanation}</p>
                    {factor.improvementSuggestions && (
                      <div className="mt-2 pl-4 border-l-2 border-blue-400/30">
                        {factor.improvementSuggestions.slice(0, 2).map((suggestion, i) => (
                          <p key={i} className="text-xs text-blue-400">• {suggestion}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </LiquidGlassCard>

        {/* Recommendations */}
        <LiquidGlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
            <span className="text-sm text-white/60">
              Potential +{prediction.recommendations.reduce((sum, r) => sum + r.expectedImpact, 0)}% improvement
            </span>
          </div>
          <div className="space-y-3">
            {prediction.recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  rec.priority === 'critical' ? 'bg-red-400' :
                  rec.priority === 'high' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{rec.title}</p>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      +{rec.expectedImpact}%
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{rec.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                    <span>Effort: {rec.effort}</span>
                    <span>Time: {rec.timeRequired}</span>
                  </div>
                </div>
                <LiquidGlassButton
                  onClick={() => onActionClick?.('implement-recommendation', rec)}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </LiquidGlassButton>
              </div>
            ))}
          </div>
        </LiquidGlassCard>

        {/* Competitor Analysis */}
        <LiquidGlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Competitor Analysis</h3>
          <div className="space-y-4">
            {prediction.competitorAnalysis.map((competitor, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">
                    {competitor.competitorName || `Competitor ${index + 1}`}
                  </h4>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{competitor.estimatedStrength}%</p>
                    <p className="text-xs text-white/60">Strength</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60 mb-2">Their Advantages:</p>
                    <ul className="space-y-1">
                      {competitor.advantages.map((adv, i) => (
                        <li key={i} className="text-red-400 text-xs">• {adv}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-white/60 mb-2">Your Advantages:</p>
                    <ul className="space-y-1">
                      {competitor.yourAdvantages.map((adv, i) => (
                        <li key={i} className="text-green-400 text-xs">• {adv}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      </div>
    )
  }

  const renderAnalyticsTab = () => {
    if (!analytics) return null

    return (
      <div className="space-y-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LiquidGlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-green-400" />
              <span className={`text-xs px-2 py-1 rounded ${
                analytics.trends.winRateTrend === 'improving' ? 'bg-green-500/20 text-green-400' :
                analytics.trends.winRateTrend === 'declining' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {analytics.trends.winRateTrend === 'improving' ? <ChevronUp className="w-3 h-3 inline" /> :
                 analytics.trends.winRateTrend === 'declining' ? <ChevronDown className="w-3 h-3 inline" /> :
                 '→'} {analytics.trends.winRateTrend}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics.metrics.winRate}%</p>
            <p className="text-sm text-white/60">Win Rate</p>
            <p className="text-xs text-white/40 mt-1">
              {analytics.metrics.wonBids} of {analytics.metrics.totalBids} bids
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-white/60">{selectedPeriod}</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${(analytics.metrics.wonValue / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-white/60">Won Value</p>
            <p className="text-xs text-white/40 mt-1">
              of ${(analytics.metrics.totalValue / 1000000).toFixed(1)}M total
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <span className={`text-xs px-2 py-1 rounded ${
                analytics.trends.marginTrend === 'improving' ? 'bg-green-500/20 text-green-400' :
                analytics.trends.marginTrend === 'declining' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {analytics.trends.marginTrend}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {(analytics.metrics.averageMargin * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-white/60">Avg Margin</p>
            <p className="text-xs text-white/40 mt-1">
              Industry avg: 18%
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-yellow-400" />
              <Info className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-2xl font-bold text-white">{analytics.metrics.averageScore}</p>
            <p className="text-sm text-white/60">Avg Score</p>
            <p className="text-xs text-white/40 mt-1">
              Technical excellence
            </p>
          </LiquidGlassCard>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LiquidGlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Core Strengths
            </h3>
            <div className="space-y-3">
              {analytics.strengths.map((strength, index) => (
                <div key={index} className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-white font-medium mb-1">{strength.area}</p>
                  <p className="text-sm text-white/60 mb-2">{strength.description}</p>
                  <p className="text-xs text-green-400">{strength.impact}</p>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Improvement Areas
            </h3>
            <div className="space-y-3">
              {analytics.weaknesses.map((weakness, index) => (
                <div key={index} className="p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-white font-medium mb-1">{weakness.area}</p>
                  <p className="text-sm text-white/60 mb-2">{weakness.description}</p>
                  <p className="text-xs text-yellow-400">{weakness.impact}</p>
                  {weakness.improvementPlan && (
                    <p className="text-xs text-blue-400 mt-2">
                      → {weakness.improvementPlan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </LiquidGlassCard>
        </div>

        {/* Opportunities */}
        <LiquidGlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Growth Opportunities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.opportunities.map((opp) => (
              <div key={opp.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{opp.title}</p>
                    <p className="text-sm text-white/60">{opp.description}</p>
                  </div>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400">
                    +${(opp.potentialValue / 1000000).toFixed(1)}M potential
                  </span>
                  <span className="text-white/40">
                    {opp.effort} effort
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/60 mb-2">Requirements:</p>
                  <div className="flex flex-wrap gap-1">
                    {opp.requirements.slice(0, 3).map((req, i) => (
                      <span key={i} className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      </div>
    )
  }

  const renderPatternsTab = () => (
    <div className="space-y-6">
      {/* Success Patterns */}
      <LiquidGlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Winning Patterns</h3>
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">{pattern.name}</h4>
                  <p className="text-sm text-white/60">{pattern.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">{pattern.successRate}%</p>
                  <p className="text-xs text-white/60">Success Rate</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="text-white/60">
                  Applicability: <span className="text-white">{pattern.applicability}%</span>
                </span>
                <span className="text-white/60">
                  Examples: <span className="text-white">{pattern.examples.length}</span>
                </span>
              </div>

              <details className="cursor-pointer">
                <summary className="text-sm text-blue-400 hover:text-blue-300">
                  View implementation guide
                </summary>
                <div className="mt-3 pl-4 border-l-2 border-blue-400/30">
                  {pattern.implementationGuide.map((step, i) => (
                    <p key={i} className="text-sm text-white/60 mb-1">
                      {i + 1}. {step}
                    </p>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Seasonal Trends */}
      {seasonalTrends && (
        <LiquidGlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Seasonal Insights</h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {seasonalTrends.data.map((period) => (
              <div key={period.period} className="text-center">
                <p className="text-sm text-white/60 mb-2">{period.period}</p>
                <p className="text-2xl font-bold text-white mb-1">
                  {period.bidsAvailable}
                </p>
                <p className="text-xs text-white/40">Opportunities</p>
                <div className="mt-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${period.averageSuccessRate * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    {(period.averageSuccessRate * 100).toFixed(0)}% win rate
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {seasonalTrends.insights.map((insight, i) => (
              <p key={i} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-blue-400">•</span> {insight}
              </p>
            ))}
          </div>
        </LiquidGlassCard>
      )}
    </div>
  )

  const renderBenchmarksTab = () => (
    <div className="space-y-6">
      <LiquidGlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Benchmarks</h3>
        <div className="space-y-4">
          {benchmarks.map((benchmark) => (
            <div key={benchmark.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">{benchmark.category}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">
                    {benchmark.yourScore}
                  </span>
                  {benchmark.yourScore > benchmark.industryAverage && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      Above avg
                    </span>
                  )}
                </div>
              </div>
              
              {/* Benchmark Bar */}
              <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden">
                {/* Industry ranges */}
                <div className="absolute inset-0 flex">
                  <div className="relative flex-1">
                    {/* Your score */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-blue-400"
                      style={{ left: `${benchmark.yourScore}%` }}
                    />
                    {/* Industry average */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                      style={{ left: `${benchmark.industryAverage}%` }}
                    />
                    {/* Top performers */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-green-400/40"
                      style={{ left: `${benchmark.topPerformers}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-400 rounded" />
                  You ({benchmark.percentile}th percentile)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white/40 rounded" />
                  Industry Avg ({benchmark.industryAverage})
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400/40 rounded" />
                  Top 10% ({benchmark.topPerformers})
                </span>
              </div>
              
              {benchmark.yourScore < benchmark.improvementTarget && (
                <p className="text-xs text-yellow-400">
                  Target: Reach {benchmark.improvementTarget} to be in top quartile
                </p>
              )}
            </div>
          ))}
        </div>
      </LiquidGlassCard>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <LiquidGlass variant="aurora" intensity="strong" className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Predictive Analytics
              </h2>
              <p className="text-sm text-white/60">
                AI-powered insights to win more bids
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'analytics' && (
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as unknown)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              >
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            )}
            <LiquidGlassButton
              onClick={loadData}
              className="p-2"
            >
              <RefreshCw className="w-5 h-5" />
            </LiquidGlassButton>
            <LiquidGlassButton className="p-2">
              <Download className="w-5 h-5" />
            </LiquidGlassButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <LiquidGlassButton
            onClick={() => setActiveTab('prediction')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'prediction'
                ? 'border-2 border-blue-400/50'
                : ''
            }`}
          >
            Bid Prediction
          </LiquidGlassButton>
          <LiquidGlassButton
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'analytics'
                ? 'border-2 border-blue-400/50'
                : ''
            }`}
          >
            Analytics
          </LiquidGlassButton>
          <LiquidGlassButton
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'patterns'
                ? 'border-2 border-blue-400/50'
                : ''
            }`}
          >
            Success Patterns
          </LiquidGlassButton>
          <LiquidGlassButton
            onClick={() => setActiveTab('benchmarks')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'benchmarks'
                ? 'border-2 border-blue-400/50'
                : ''
            }`}
          >
            Benchmarks
          </LiquidGlassButton>
        </div>
      </LiquidGlass>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Brain className="w-16 h-16 text-blue-400" />
          </motion.div>
          <p className="text-white/60">Analyzing data...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'prediction' && renderPredictionTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'patterns' && renderPatternsTab()}
            {activeTab === 'benchmarks' && renderBenchmarksTab()}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}