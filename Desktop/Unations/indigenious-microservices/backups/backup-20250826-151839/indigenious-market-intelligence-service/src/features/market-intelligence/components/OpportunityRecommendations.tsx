// Opportunity Recommendations Component
// AI-powered opportunity matching and recommendations

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Star, Clock, DollarSign, MapPin, Users,
  TrendingUp, AlertCircle, CheckCircle, Eye, Bookmark,
  Filter, Search, ChevronDown, Lightbulb, Zap
} from 'lucide-react'
import type { OpportunityRecommendation } from '../types/market-intelligence.types'

interface OpportunityRecommendationsProps {
  recommendations: OpportunityRecommendation[]
  businessId: string
}

export function OpportunityRecommendations({ recommendations, businessId }: OpportunityRecommendationsProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'match' | 'value' | 'deadline' | 'probability'>('match')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(rec => {
      if (filterLevel === 'all') return true
      const level = rec.matchScore >= 80 ? 'high' : rec.matchScore >= 60 ? 'medium' : 'low'
      return level === filterLevel
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return b.matchScore - a.matchScore
        case 'value':
          return b.value - a.value
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        case 'probability':
          return b.winProbability - a.winProbability
        default:
          return 0
      }
    })

  // Get match score color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'emerald'
    if (score >= 60) return 'amber'
    return 'red'
  }

  // Get competition level color
  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'emerald'
      case 'medium': return 'amber'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  // Calculate days until deadline
  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center">
              <Lightbulb className="w-6 h-6 mr-2 text-amber-400" />
              Opportunity Recommendations
            </h2>
            <p className="text-white/60">
              AI-powered suggestions based on your capabilities and market analysis
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg text-white text-sm transition-all duration-200 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/20 pt-4 mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Match Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Match Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as unknown)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
                  >
                    <option value="all" className="bg-gray-800">All Matches</option>
                    <option value="high" className="bg-gray-800">High (80%+)</option>
                    <option value="medium" className="bg-gray-800">Medium (60-79%)</option>
                    <option value="low" className="bg-gray-800">Low (&lt;60%)</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as unknown)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
                  >
                    <option value="match" className="bg-gray-800">Match Score</option>
                    <option value="value" className="bg-gray-800">Contract Value</option>
                    <option value="deadline" className="bg-gray-800">Deadline</option>
                    <option value="probability" className="bg-gray-800">Win Probability</option>
                  </select>
                </div>

                {/* Quick Stats */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{filteredRecommendations.length}</p>
                      <p className="text-xs text-white/60">Opportunities</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">
                        ${filteredRecommendations.reduce((sum, rec) => sum + rec.value, 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-white/60">Total Value</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-400">
                        {filteredRecommendations.filter(rec => rec.matchScore >= 80).length}
                      </p>
                      <p className="text-xs text-white/60">High Match</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Opportunity Cards */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
            <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No opportunities match your current filters</p>
          </div>
        ) : (
          filteredRecommendations.map((opportunity, index) => {
            const matchColor = getMatchColor(opportunity.matchScore)
            const competitionColor = getCompetitionColor(opportunity.competitionLevel)
            const daysLeft = getDaysUntilDeadline(opportunity.deadline)
            const isSelected = selectedOpportunity === opportunity.id
            
            return (
              <motion.div
                key={opportunity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                  overflow-hidden hover:bg-white/15 transition-all duration-200"
              >
                {/* Main Card Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {opportunity.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-white/60 mb-3">
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {opportunity.sector}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${opportunity.value.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {daysLeft} days left
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Match Score */}
                      <div className={`px-3 py-1 rounded-full bg-${matchColor}-500/20 
                        border border-${matchColor}-400/30`}>
                        <span className={`text-sm font-medium text-${matchColor}-300`}>
                          {opportunity.matchScore}% match
                        </span>
                      </div>
                      
                      {/* Bookmark */}
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Bookmark className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-400">
                        {opportunity.winProbability}%
                      </p>
                      <p className="text-xs text-white/60">Win Probability</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold text-${competitionColor}-400`}>
                        {opportunity.competitionLevel.toUpperCase()}
                      </p>
                      <p className="text-xs text-white/60">Competition</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">
                        {opportunity.similarWins.length}
                      </p>
                      <p className="text-xs text-white/60">Similar Wins</p>
                    </div>
                  </div>

                  {/* Key Reasoning */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                      <Zap className="w-4 h-4 mr-1 text-amber-400" />
                      Why This Opportunity Matches
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.reasoning.slice(0, 3).map((reason, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-200 
                          text-xs rounded border border-blue-400/30">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedOpportunity(isSelected ? null : opportunity.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center 
                        transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {isSelected ? 'Hide Details' : 'View Details'}
                    </button>
                    
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                          border-white/20 rounded-lg text-white text-sm font-medium 
                          transition-all duration-200"
                      >
                        Save for Later
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                          border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                          transition-all duration-200"
                      >
                        Start Application
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/20 bg-white/5 p-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Requirements */}
                        <div>
                          <h4 className="font-medium text-white mb-3 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                            Key Requirements
                          </h4>
                          <ul className="space-y-2">
                            {opportunity.requirements.map((req, i) => (
                              <li key={i} className="text-sm text-white/80 flex items-start">
                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommended Actions */}
                        <div>
                          <h4 className="font-medium text-white mb-3 flex items-center">
                            <Target className="w-4 h-4 mr-2 text-blue-400" />
                            Recommended Actions
                          </h4>
                          <ul className="space-y-2">
                            {opportunity.recommendedActions.map((action, i) => (
                              <li key={i} className="text-sm text-white/80 flex items-start">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Similar Wins */}
                      {opportunity.similarWins.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          <h4 className="font-medium text-white mb-3 flex items-center">
                            <Star className="w-4 h-4 mr-2 text-amber-400" />
                            Your Similar Wins
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {opportunity.similarWins.map((win, i) => (
                              <span key={i} className="px-3 py-1 bg-emerald-500/20 text-emerald-200 
                                text-xs rounded-full border border-emerald-400/30">
                                {win}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Urgency Indicator */}
                      {daysLeft <= 7 && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-amber-100">
                              Deadline approaching! Only {daysLeft} days remaining to submit.
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}