// Bid Matcher Component
// AI-powered RFQ matching and bid recommendations

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Brain, TrendingUp, Award, AlertCircle, CheckCircle,
  Filter, Search, ChevronRight, Calendar, DollarSign, Users,
  MapPin, Clock, BarChart3, FileText, Eye, Info, Star
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import type { BidRecommendation } from '../types/ai-ml.types'

interface BidMatcherProps {
  userId: string
  businessId?: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

interface MockRFQ {
  id: string
  title: string
  category: string
  budget: number
  deadline: string
  location: string
  indigenousRequirement: boolean
  description: string
}

export function BidMatcher({ 
  userId, 
  businessId,
  culturalContext 
}: BidMatcherProps) {
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all')
  const [filterMatch, setFilterMatch] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showExplanation, setShowExplanation] = useState<string | null>(null)

  const { 
    bidRecommendations, 
    getBidRecommendations,
    explainDecision,
    isLoading 
  } = useAI({ 
    userId, 
    businessId,
    culturalContext 
  })

  // Mock RFQs data
  const mockRFQs: MockRFQ[] = [
    {
      id: 'rfq-001',
      title: 'Highway Maintenance Services - Northern Ontario',
      category: 'Infrastructure',
      budget: 750000,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Thunder Bay, ON',
      indigenousRequirement: true,
      description: 'Seeking qualified Indigenous contractors for highway maintenance services including snow removal, pothole repair, and general maintenance.'
    },
    {
      id: 'rfq-002',
      title: 'IT Infrastructure Upgrade - Government Buildings',
      category: 'Technology',
      budget: 250000,
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Ottawa, ON',
      indigenousRequirement: true,
      description: 'Network infrastructure upgrade for federal government buildings. Indigenous business participation required.'
    },
    {
      id: 'rfq-003',
      title: 'Community Center Construction',
      category: 'Construction',
      budget: 2000000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Six Nations, ON',
      indigenousRequirement: true,
      description: 'New community center construction project on Six Nations territory. Local Indigenous contractors preferred.'
    }
  ]

  // Load initial recommendations
  useEffect(() => {
    mockRFQs.forEach(rfq => {
      getBidRecommendations(rfq.id)
    })
  }, [])

  // Get recommendations for specific RFQ
  const getRFQRecommendations = (rfqId: string): BidRecommendation[] => {
    return bidRecommendations.filter(rec => rec.rfqId === rfqId)
  }

  // Filter RFQs based on recommendations
  const filteredRFQs = mockRFQs.filter(rfq => {
    const recommendations = getRFQRecommendations(rfq.id)
    const matchScore = recommendations[0]?.score || 0

    if (filterCategory !== 'all' && rfq.category !== filterCategory) return false
    if (matchScore < filterMatch) return false
    if (searchQuery && !rfq.title.toLowerCase().includes(searchQuery.toLowerCase())) return false

    return true
  })

  // Get match quality color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'emerald'
    if (score >= 60) return 'blue'
    if (score >= 40) return 'amber'
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

  // Handle explanation request
  const handleExplainMatch = async (recommendationId: string) => {
    try {
      const explanation = await explainDecision(recommendationId)
      setShowExplanation(recommendationId)
      logger.info('Explanation:', explanation)
    } catch (error) {
      logger.error('Failed to get explanation:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border 
        border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Target className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Bid Matcher</h2>
            <p className="text-white/60">Intelligent RFQ matching powered by machine learning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{filteredRFQs.length}</div>
            <div className="text-white/60 text-sm">Matching RFQs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">
              {bidRecommendations.filter(r => r.score >= 80).length}
            </div>
            <div className="text-white/60 text-sm">High Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-300">
              ${bidRecommendations.reduce((sum, r) => sum + (r.suggestedPrice || 0), 0).toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">Potential Value</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search RFQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all" className="bg-gray-800">All Categories</option>
            <option value="Infrastructure" className="bg-gray-800">Infrastructure</option>
            <option value="Technology" className="bg-gray-800">Technology</option>
            <option value="Construction" className="bg-gray-800">Construction</option>
            <option value="Services" className="bg-gray-800">Services</option>
          </select>

          {/* Match Score Filter */}
          <div>
            <label className="text-white/60 text-xs">Min Match Score: {filterMatch}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterMatch}
              onChange={(e) => setFilterMatch(Number(e.target.value))}
              className="w-full mt-1"
            />
          </div>

          {/* Indigenous Only */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-white text-sm">Indigenous Requirement</span>
          </label>
        </div>
      </div>

      {/* RFQ List with AI Recommendations */}
      <div className="space-y-6">
        {filteredRFQs.map((rfq) => {
          const recommendations = getRFQRecommendations(rfq.id)
          const topRecommendation = recommendations[0]
          
          return (
            <motion.div
              key={rfq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
            >
              {/* RFQ Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{rfq.title}</h3>
                      {rfq.indigenousRequirement && (
                        <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          Indigenous Required
                        </div>
                      )}
                    </div>
                    <p className="text-white/70 text-sm mb-4">{rfq.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Budget:</span>
                        <p className="text-white font-medium">${rfq.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Deadline:</span>
                        <p className="text-white font-medium">
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/60">Location:</span>
                        <p className="text-white font-medium">{rfq.location}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Category:</span>
                        <p className="text-white font-medium">{rfq.category}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Panel */}
                {topRecommendation && (
                  <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <h4 className="font-medium text-purple-200">AI Recommendation</h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`text-2xl font-bold text-${getMatchColor(topRecommendation.score)}-400`}>
                          {topRecommendation.score}%
                        </div>
                        <div className="text-sm text-white/60">Match Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span className="text-white/60 text-sm">Suggested Bid</span>
                        </div>
                        <p className="text-emerald-400 font-semibold">
                          ${topRecommendation.suggestedPrice?.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="text-white/60 text-sm">Win Probability</span>
                        </div>
                        <p className="text-blue-400 font-semibold">
                          {Math.round(topRecommendation.successProbability * 100)}%
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Users className="w-4 h-4 text-amber-400" />
                          <span className="text-white/60 text-sm">Competition</span>
                        </div>
                        <p className={`text-${getCompetitionColor(topRecommendation.competitionLevel)}-400 
                          font-semibold capitalize`}>
                          {topRecommendation.competitionLevel}
                        </p>
                      </div>
                    </div>

                    {/* Key Reasons */}
                    <div className="mb-4">
                      <h5 className="text-white/80 text-sm font-medium mb-2">Why this is a good match:</h5>
                      <ul className="space-y-1">
                        {topRecommendation.reasons.slice(0, 3).map((reason, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/70">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cultural Alignment */}
                    {topRecommendation.culturalAlignment > 0.8 && (
                      <div className="mb-4 flex items-center space-x-2 text-purple-300 text-sm">
                        <Star className="w-4 h-4" />
                        <span>High cultural alignment ({Math.round(topRecommendation.culturalAlignment * 100)}%)</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleExplainMatch(topRecommendation.id)}
                        className="text-purple-300 hover:text-purple-200 text-sm flex items-center space-x-1"
                      >
                        <Info className="w-4 h-4" />
                        <span>Explain this match</span>
                      </button>

                      <div className="flex items-center space-x-3">
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                          border-white/20 rounded-lg text-white text-sm transition-colors">
                          View Details
                        </button>
                        <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                          border border-purple-400/50 rounded-lg text-purple-200 text-sm 
                          flex items-center space-x-2 transition-colors">
                          <span>Prepare Bid</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {topRecommendation.recommendations.partnerships && 
                     topRecommendation.recommendations.partnerships.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-purple-400/30">
                        <p className="text-purple-200 text-sm">
                          <span className="font-medium">Partnership suggestion:</span> {topRecommendation.recommendations.partnerships[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* No Recommendation */}
                {!topRecommendation && (
                  <div className="mt-6 p-4 bg-gray-500/10 border border-gray-400/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <p className="text-gray-300 text-sm">
                        AI analysis pending... Check back soon for match recommendations.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredRFQs.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Matching RFQs Found</h3>
          <p className="text-white/60">
            Try adjusting your filters or check back later for new opportunities.
          </p>
        </div>
      )}

      {/* AI Insights Panel */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">AI Matching Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white/80 text-sm font-medium mb-3">Your Strengths</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-white/70">Strong match with infrastructure projects</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-white/70">Competitive pricing in your region</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-white/70">Indigenous certification advantage</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white/80 text-sm font-medium mb-3">Improvement Areas</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-white/70">Consider ISO 14001 for environmental projects</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-white/70">Expand capacity for larger contracts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}