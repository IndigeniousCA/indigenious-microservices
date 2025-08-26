// Smart Recommendations Component
// AI-powered opportunity and insight recommendations

import { useState, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, TrendingUp, Users, Award, BookOpen, Briefcase,
  DollarSign, Clock, Target, ChevronRight, Filter, Search,
  Star, Info, Eye, X, Calendar, MapPin, Shield
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import type { SmartRecommendation } from '../types/ai-ml.types'

interface SmartRecommendationsProps {
  userId: string
  businessId?: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

export function SmartRecommendations({ 
  userId, 
  businessId,
  culturalContext 
}: SmartRecommendationsProps) {
  const [selectedType, setSelectedType] = useState<string | 'all'>('all')
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'impact' | 'date'>('score')

  const { smartRecommendations, isLoading } = useAI({ 
    userId, 
    businessId,
    culturalContext 
  })

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = smartRecommendations

    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType)
    }

    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score
        case 'impact':
          const aImpact = (a.impact.revenue || 0) + (a.impact.growth || 0) * 10000
          const bImpact = (b.impact.revenue || 0) + (b.impact.growth || 0) * 10000
          return bImpact - aImpact
        case 'date':
          return new Date(b.expiresAt || 0).getTime() - new Date(a.expiresAt || 0).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [smartRecommendations, selectedType, searchQuery, sortBy])

  // Group recommendations by type
  const recommendationsByType = useMemo(() => {
    const groups: Record<string, number> = {
      opportunity: 0,
      partnership: 0,
      improvement: 0,
      training: 0,
      resource: 0
    }

    smartRecommendations.forEach(rec => {
      groups[rec.type] = (groups[rec.type] || 0) + 1
    })

    return groups
  }, [smartRecommendations])

  // Calculate total potential impact
  const totalImpact = useMemo(() => {
    return smartRecommendations.reduce((sum, rec) => {
      return sum + (rec.impact.revenue || 0)
    }, 0)
  }, [smartRecommendations])

  // Get recommendation icon
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return Briefcase
      case 'partnership': return Users
      case 'improvement': return TrendingUp
      case 'training': return BookOpen
      case 'resource': return Award
      default: return Sparkles
    }
  }

  // Get recommendation color
  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'emerald'
      case 'partnership': return 'blue'
      case 'improvement': return 'purple'
      case 'training': return 'amber'
      case 'resource': return 'pink'
      default: return 'gray'
    }
  }

  // Handle action click
  const handleAction = (action: { action: string, label: string }) => {
    if (action.action.startsWith('navigate:')) {
      const path = action.action.replace('navigate:', '')
      // In production, use router navigation
      logger.info('Navigate to:', path)
    } else if (action.action.startsWith('action:')) {
      const actionType = action.action.replace('action:', '')
      // Handle custom actions
      logger.info('Execute action:', actionType)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">{smartRecommendations.length}</div>
          <div className="text-white/60 text-sm">Active Recommendations</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <DollarSign className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">${totalImpact.toLocaleString()}</div>
          <div className="text-white/60 text-sm">Potential Revenue</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <Target className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">
            {Math.round(smartRecommendations.reduce((sum, r) => sum + r.score, 0) / smartRecommendations.length)}%
          </div>
          <div className="text-white/60 text-sm">Average Match Score</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">
            {smartRecommendations.filter(r => r.actions.some(a => a.priority === 'high')).length}
          </div>
          <div className="text-white/60 text-sm">High Priority</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search recommendations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="opportunity" className="bg-gray-800">Opportunities ({recommendationsByType.opportunity})</option>
              <option value="partnership" className="bg-gray-800">Partnerships ({recommendationsByType.partnership})</option>
              <option value="improvement" className="bg-gray-800">Improvements ({recommendationsByType.improvement})</option>
              <option value="training" className="bg-gray-800">Training ({recommendationsByType.training})</option>
              <option value="resource" className="bg-gray-800">Resources ({recommendationsByType.resource})</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="score" className="bg-gray-800">Sort by Match Score</option>
            <option value="impact" className="bg-gray-800">Sort by Impact</option>
            <option value="date" className="bg-gray-800">Sort by Urgency</option>
          </select>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecommendations.map((recommendation) => {
          const Icon = getRecommendationIcon(recommendation.type)
          const color = getRecommendationColor(recommendation.type)
          
          return (
            <motion.div
              key={recommendation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                hover:bg-white/15 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                    <Icon className={`w-5 h-5 text-${color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{recommendation.title}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`text-${color}-300 text-sm capitalize`}>
                        {recommendation.type}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-white/60 text-sm">{recommendation.score}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedRecommendation(recommendation)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Description */}
              <p className="text-white/80 text-sm mb-4">{recommendation.description}</p>

              {/* Impact Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {recommendation.impact.revenue && (
                  <div className="text-center">
                    <div className="text-emerald-400 font-semibold">
                      ${(recommendation.impact.revenue / 1000).toFixed(0)}K
                    </div>
                    <div className="text-white/60 text-xs">Revenue</div>
                  </div>
                )}
                {recommendation.impact.efficiency && (
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">
                      {recommendation.impact.efficiency}%
                    </div>
                    <div className="text-white/60 text-xs">Efficiency</div>
                  </div>
                )}
                {recommendation.impact.growth && (
                  <div className="text-center">
                    <div className="text-purple-400 font-semibold">
                      {recommendation.impact.growth}%
                    </div>
                    <div className="text-white/60 text-xs">Growth</div>
                  </div>
                )}
              </div>

              {/* Cultural Context */}
              {recommendation.impact.cultural && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <p className="text-purple-200 text-xs">{recommendation.impact.cultural}</p>
                </div>
              )}

              {/* Primary Action */}
              {recommendation.actions.length > 0 && (
                <button
                  onClick={() => handleAction(recommendation.actions[0])}
                  className={`w-full px-4 py-2 bg-${color}-500/20 hover:bg-${color}-500/30 
                    border border-${color}-400/50 rounded-lg text-${color}-200 text-sm 
                    flex items-center justify-center space-x-2 transition-colors`}
                >
                  <span>{recommendation.actions[0].label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Expiry Warning */}
              {recommendation.expiresAt && (
                <div className="mt-3 flex items-center space-x-2 text-amber-300 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>
                    Expires in {Math.ceil((new Date(recommendation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Recommendations Found</h3>
          <p className="text-white/60">
            {searchQuery || selectedType !== 'all'
              ? 'Try adjusting your filters'
              : 'Check back later for new AI-powered insights'
            }
          </p>
        </div>
      )}

      {/* Recommendation Detail Modal */}
      <AnimatePresence>
        {selectedRecommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRecommendation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${getRecommendationColor(selectedRecommendation.type)}-500/20`}>
                    {(() => {
                      const Icon = getRecommendationIcon(selectedRecommendation.type)
                      return <Icon className={`w-6 h-6 text-${getRecommendationColor(selectedRecommendation.type)}-400`} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedRecommendation.title}</h3>
                    <p className={`text-${getRecommendationColor(selectedRecommendation.type)}-300 text-sm capitalize`}>
                      {selectedRecommendation.type} • {selectedRecommendation.score}% Match
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecommendation(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-white mb-2">Description</h4>
                  <p className="text-white/80">{selectedRecommendation.description}</p>
                </div>

                {/* Impact Analysis */}
                <div>
                  <h4 className="font-medium text-white mb-3">Projected Impact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecommendation.impact.revenue && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                          <span className="text-white/80">Revenue Impact</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">
                          ${selectedRecommendation.impact.revenue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedRecommendation.impact.growth && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-400" />
                          <span className="text-white/80">Growth Potential</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-400">
                          {selectedRecommendation.impact.growth}%
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedRecommendation.impact.cultural && (
                    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <span className="text-purple-200 font-medium">Cultural Impact</span>
                      </div>
                      <p className="text-purple-100/80 text-sm">
                        {selectedRecommendation.impact.cultural}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Reasoning */}
                <div>
                  <h4 className="font-medium text-white mb-3">Why This Recommendation?</h4>
                  <ul className="space-y-2">
                    {selectedRecommendation.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-start space-x-2 text-white/80">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span className="text-sm">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="font-medium text-white mb-3">Recommended Actions</h4>
                  <div className="space-y-2">
                    {selectedRecommendation.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          handleAction(action)
                          setSelectedRecommendation(null)
                        }}
                        className={`w-full px-4 py-3 bg-white/10 hover:bg-white/20 
                          border border-white/20 rounded-lg text-left transition-colors
                          flex items-center justify-between group`}
                      >
                        <div>
                          <p className="text-white font-medium">{action.label}</p>
                          <p className={`text-xs mt-0.5 capitalize ${
                            action.priority === 'high' ? 'text-red-300' :
                            action.priority === 'medium' ? 'text-amber-300' :
                            'text-blue-300'
                          }`}>
                            {action.priority} Priority
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>AI Confidence: {Math.round(selectedRecommendation.score)}%</span>
                    {selectedRecommendation.expiresAt && (
                      <span>
                        Expires: {new Date(selectedRecommendation.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}