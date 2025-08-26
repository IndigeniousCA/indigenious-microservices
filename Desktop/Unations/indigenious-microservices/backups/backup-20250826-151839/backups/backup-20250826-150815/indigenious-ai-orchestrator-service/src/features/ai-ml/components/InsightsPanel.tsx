// Insights Panel Component
// AI-generated insights and recommendations dashboard

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, TrendingUp, Target, Users, DollarSign,
  Calendar, Globe, Award, AlertCircle, ChevronRight,
  Sparkles, BarChart3, Clock, Star, Info
} from 'lucide-react'
import { useAI } from '../hooks/useAI'

interface InsightsPanelProps {
  userId: string
  businessId?: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

interface Insight {
  id: string
  type: 'opportunity' | 'trend' | 'risk' | 'recommendation' | 'cultural'
  title: string
  description: string
  impact: string
  confidence: number
  timeframe: string
  icon: any
  color: string
  actions?: Array<{
    label: string
    action: string
  }>
  culturalRelevance?: boolean
}

export function InsightsPanel({ 
  userId, 
  businessId,
  culturalContext 
}: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [filterType, setFilterType] = useState<string | 'all'>('all')

  const { 
    bidRecommendations, 
    smartRecommendations,
    anomalies,
    priceOptimizations 
  } = useAI({ userId, businessId, culturalContext })

  // Generate insights based on AI data
  useEffect(() => {
    const generateInsights = () => {
      const newInsights: Insight[] = []

      // Opportunity insights
      if (bidRecommendations.length > 0) {
        const highMatchCount = bidRecommendations.filter(r => r.score > 85).length
        if (highMatchCount > 0) {
          newInsights.push({
            id: 'insight-opp-1',
            type: 'opportunity',
            title: `${highMatchCount} High-Match Opportunities Available`,
            description: `We've identified ${highMatchCount} RFQs with over 85% match to your business profile. These represent strong winning potential.`,
            impact: `$${bidRecommendations.reduce((sum, r) => sum + (r.suggestedPrice || 0), 0).toLocaleString()} potential revenue`,
            confidence: 92,
            timeframe: 'Next 30 days',
            icon: Target,
            color: 'emerald',
            actions: [
              { label: 'View Opportunities', action: 'navigate:/opportunities' }
            ]
          })
        }
      }

      // Pricing insights
      if (priceOptimizations.size > 0) {
        const avgOptimization = Array.from(priceOptimizations.values())
          .reduce((sum, opt) => sum + (opt.suggestedPrice - opt.factors.marketRate), 0) / priceOptimizations.size
        
        if (avgOptimization < 0) {
          newInsights.push({
            id: 'insight-price-1',
            type: 'recommendation',
            title: 'Competitive Pricing Advantage',
            description: `Your pricing is ${Math.abs(Math.round(avgOptimization / 1000))}% below market average, giving you a competitive edge while maintaining profitability.`,
            impact: 'Higher win probability',
            confidence: 85,
            timeframe: 'Current',
            icon: DollarSign,
            color: 'blue'
          })
        }
      }

      // Cultural insights
      if (culturalContext) {
        newInsights.push({
          id: 'insight-cultural-1',
          type: 'cultural',
          title: 'Indigenous Procurement Target Progress',
          description: 'Government departments are actively seeking Indigenous businesses to meet 5% procurement targets. Your certifications position you well.',
          impact: 'Preferred vendor status',
          confidence: 95,
          timeframe: 'Ongoing',
          icon: Globe,
          color: 'purple',
          culturalRelevance: true,
          actions: [
            { label: 'Update Certifications', action: 'navigate:/profile/certifications' }
          ]
        })
      }

      // Risk insights from anomalies
      if (anomalies.length > 0) {
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
        if (criticalAnomalies.length > 0) {
          newInsights.push({
            id: 'insight-risk-1',
            type: 'risk',
            title: 'Unusual Market Activity Detected',
            description: criticalAnomalies[0].description,
            impact: 'Requires attention',
            confidence: Math.round((1 - criticalAnomalies[0].falsePositiveProbability) * 100),
            timeframe: 'Immediate',
            icon: AlertCircle,
            color: 'red',
            actions: [
              { label: 'Review Details', action: 'navigate:/ai/anomalies' }
            ]
          })
        }
      }

      // Trend insights
      if (smartRecommendations.length > 2) {
        const partnershipRecs = smartRecommendations.filter(r => r.type === 'partnership')
        if (partnershipRecs.length > 0) {
          newInsights.push({
            id: 'insight-trend-1',
            type: 'trend',
            title: 'Partnership Opportunities Trending',
            description: 'Collaborative bids are showing 40% higher success rates. Consider partnering with complementary businesses.',
            impact: 'Expand capabilities',
            confidence: 78,
            timeframe: 'Next quarter',
            icon: Users,
            color: 'amber',
            actions: [
              { label: 'Find Partners', action: 'navigate:/partners' }
            ]
          })
        }
      }

      // Seasonal insights
      const currentMonth = new Date().getMonth()
      if (currentMonth >= 0 && currentMonth <= 2) { // Q1
        newInsights.push({
          id: 'insight-seasonal-1',
          type: 'trend',
          title: 'Year-End Spending Surge',
          description: 'Government departments typically increase procurement activity in Q4. Prepare capacity for upcoming opportunities.',
          impact: '30% increase in RFQs',
          confidence: 88,
          timeframe: 'Next 3 months',
          icon: Calendar,
          color: 'indigo'
        })
      }

      setInsights(newInsights)
    }

    generateInsights()
  }, [bidRecommendations, smartRecommendations, anomalies, priceOptimizations, culturalContext])

  // Filter insights
  const filteredInsights = filterType === 'all' 
    ? insights 
    : insights.filter(i => i.type === filterType)

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'emerald'
      case 'trend': return 'blue'
      case 'risk': return 'red'
      case 'recommendation': return 'purple'
      case 'cultural': return 'indigo'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        </div>
        
        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="all" className="bg-gray-800">All Insights</option>
          <option value="opportunity" className="bg-gray-800">Opportunities</option>
          <option value="trend" className="bg-gray-800">Trends</option>
          <option value="risk" className="bg-gray-800">Risks</option>
          <option value="recommendation" className="bg-gray-800">Recommendations</option>
          {culturalContext && <option value="cultural" className="bg-gray-800">Cultural</option>}
        </select>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredInsights.map((insight, index) => {
            const Icon = insight.icon
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedInsight(insight)}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                  hover:bg-white/15 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-${insight.color}-500/20`}>
                      <Icon className={`w-5 h-5 text-${insight.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className={`text-${getTypeColor(insight.type)}-300 capitalize`}>
                          {insight.type}
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">{insight.timeframe}</span>
                        {insight.culturalRelevance && (
                          <>
                            <span className="text-white/40">•</span>
                            <span className="text-purple-300">Cultural</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{insight.confidence}%</div>
                    <div className="text-xs text-white/60">confidence</div>
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-3">{insight.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white/60 text-xs">Impact:</span>
                    <p className={`text-${insight.color}-300 text-sm font-medium`}>
                      {insight.impact}
                    </p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 
                    transition-colors" />
                </div>

                {/* Sparkle animation on hover */}
                <motion.div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <Lightbulb className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Insights Available</h3>
          <p className="text-white/60">
            Check back later as our AI analyzes your data and market trends.
          </p>
        </div>
      )}

      {/* Insight Detail Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInsight(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-lg w-full"
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className={`p-2 rounded-lg bg-${selectedInsight.color}-500/20`}>
                  {(() => {
                    const Icon = selectedInsight.icon
                    return <Icon className={`w-6 h-6 text-${selectedInsight.color}-400`} />
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{selectedInsight.title}</h3>
                  <div className="flex items-center space-x-3 text-sm mt-1">
                    <span className={`text-${getTypeColor(selectedInsight.type)}-300 capitalize`}>
                      {selectedInsight.type}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60">{selectedInsight.timeframe}</span>
                  </div>
                </div>
              </div>

              <p className="text-white/80 mb-4">{selectedInsight.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Confidence Level</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-${selectedInsight.color}-400`}
                        style={{ width: `${selectedInsight.confidence}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {selectedInsight.confidence}%
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Expected Impact</div>
                  <p className={`text-${selectedInsight.color}-300 font-medium`}>
                    {selectedInsight.impact}
                  </p>
                </div>
              </div>

              {selectedInsight.culturalRelevance && (
                <div className="mb-6 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <p className="text-purple-200 text-sm">
                    <Globe className="w-4 h-4 inline mr-1" />
                    This insight considers Indigenous business advantages and cultural protocols.
                  </p>
                </div>
              )}

              {selectedInsight.actions && selectedInsight.actions.length > 0 && (
                <div className="space-y-2">
                  {selectedInsight.actions.map((action, index) => (
                    <button
                      key={index}
                      className={`w-full px-4 py-3 bg-${selectedInsight.color}-500/20 
                        hover:bg-${selectedInsight.color}-500/30 border border-${selectedInsight.color}-400/50 
                        rounded-lg text-${selectedInsight.color}-200 text-sm font-medium 
                        flex items-center justify-center space-x-2 transition-colors`}
                    >
                      <span>{action.label}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-white/60">
                  <Info className="w-3 h-3" />
                  <span>AI-generated insight</span>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 
                    rounded text-white/60 text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight Generation Info */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <div className="text-indigo-200 text-sm">
            <p className="font-medium mb-1">How Insights Are Generated</p>
            <p className="text-indigo-100/80">
              Our AI analyzes your business profile, historical performance, market trends, 
              and real-time opportunities to provide personalized insights. Cultural context 
              and Indigenous procurement advantages are always considered.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}