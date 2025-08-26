// Insights Feed Component
// AI-generated insights and recommendations display

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, TrendingUp, AlertCircle, CheckCircle, Info,
  Target, Zap, Brain, Eye, EyeOff, Clock, Calendar,
  ThumbsUp, ThumbsDown, Bookmark, Share, X, ChevronRight,
  Bell, BellOff, Filter, Search, MoreHorizontal, Sparkles
} from 'lucide-react'
import { Insight, InsightType } from '../types/analytics.types'

interface InsightsFeedProps {
  insights: Insight[]
  onInsightClick?: (insight: Insight) => void
  onAcknowledge?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
  onShare?: (insight: Insight) => void
  showFilters?: boolean
  autoRefresh?: boolean
}

export function InsightsFeed({
  insights,
  onInsightClick,
  onAcknowledge,
  onDismiss,
  onShare,
  showFilters = true,
  autoRefresh = true
}: InsightsFeedProps) {
  const [selectedTypes, setSelectedTypes] = useState<InsightType[]>([])
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'severity' | 'relevance'>('newest')

  // Filter insights
  const filteredInsights = useMemo(() => {
    let filtered = insights

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(insight => selectedTypes.includes(insight.type))
    }

    // Filter by severity
    if (selectedSeverity.length > 0) {
      filtered = filtered.filter(insight => selectedSeverity.includes(insight.severity))
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(insight =>
        insight.title.toLowerCase().includes(search) ||
        insight.description.toLowerCase().includes(search) ||
        insight.recommendation?.toLowerCase().includes(search)
      )
    }

    // Filter acknowledged
    if (!showAcknowledged) {
      filtered = filtered.filter(insight => !insight.acknowledgedAt)
    }

    // Sort insights
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 4, warning: 3, positive: 2, info: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        case 'relevance':
          // Mock relevance score
          return Math.random() - 0.5
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return filtered
  }, [insights, selectedTypes, selectedSeverity, searchTerm, showAcknowledged, sortBy])

  // Get insight icon
  const getInsightIcon = (type: InsightType) => {
    const iconMap = {
      anomaly: AlertCircle,
      trend: TrendingUp,
      prediction: Brain,
      opportunity: Lightbulb,
      risk: AlertCircle,
      achievement: CheckCircle,
      recommendation: Target
    }
    return iconMap[type] || Info
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const colorMap = {
      critical: 'red',
      warning: 'amber',
      positive: 'emerald',
      info: 'blue'
    }
    return colorMap[severity as keyof typeof colorMap] || 'gray'
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  // Toggle filter
  const toggleFilter = (type: 'type' | 'severity', value: string) => {
    if (type === 'type') {
      setSelectedTypes(prev =>
        prev.includes(value as InsightType)
          ? prev.filter(t => t !== value)
          : [...prev, value as InsightType]
      )
    } else {
      setSelectedSeverity(prev =>
        prev.includes(value)
          ? prev.filter(s => s !== value)
          : [...prev, value]
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Insights</h2>
            <p className="text-white/60 text-sm">
              {filteredInsights.length} insights • {insights.filter(i => !i.acknowledgedAt).length} unread
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {autoRefresh && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 
              border border-emerald-400/30 rounded-lg text-emerald-300 text-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'relevance' | 'newest')}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="newest" className="bg-gray-800">Newest First</option>
            <option value="severity" className="bg-gray-800">By Severity</option>
            <option value="relevance" className="bg-gray-800">By Relevance</option>
          </select>
        </div>
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center space-x-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search insights..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                  rounded-lg text-white placeholder-white/50 focus:outline-none 
                  focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Show Acknowledged Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="w-4 h-4 bg-white/10 border-white/20 rounded text-purple-500 
                  focus:ring-purple-400"
              />
              <span className="text-white/80 text-sm">Show acknowledged</span>
            </label>
          </div>

          {/* Filter Tags */}
          <div className="space-y-3">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Insight Types</label>
              <div className="flex flex-wrap gap-2">
                {(['anomaly', 'trend', 'prediction', 'opportunity', 'risk', 'achievement', 'recommendation'] as InsightType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => toggleFilter('type', type)}
                    className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                      selectedTypes.includes(type)
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                        : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">Severity</label>
              <div className="flex flex-wrap gap-2">
                {['critical', 'warning', 'positive', 'info'].map(severity => (
                  <button
                    key={severity}
                    onClick={() => toggleFilter('severity', severity)}
                    className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                      selectedSeverity.includes(severity)
                        ? `bg-${getSeverityColor(severity)}-500/20 text-${getSeverityColor(severity)}-200 border border-${getSeverityColor(severity)}-400/30`
                        : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <Lightbulb className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No insights found</h3>
            <p className="text-white/60">
              {insights.length === 0 
                ? 'AI insights will appear here as they are generated'
                : 'Try adjusting your filters or search terms'
              }
            </p>
          </div>
        ) : (
          filteredInsights.map(insight => {
            const Icon = getInsightIcon(insight.type)
            const severityColor = getSeverityColor(insight.severity)
            const isExpanded = expandedInsight === insight.id
            const isAcknowledged = !!insight.acknowledgedAt

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/10 backdrop-blur-md border rounded-xl p-4 
                  hover:bg-white/15 transition-all cursor-pointer ${
                    isAcknowledged 
                      ? 'border-white/10 opacity-75' 
                      : `border-${severityColor}-400/30`
                  }`}
                onClick={() => {
                  setExpandedInsight(isExpanded ? null : insight.id)
                  onInsightClick?.(insight)
                }}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`p-2 bg-${severityColor}-500/20 rounded-lg mt-1`}>
                    <Icon className={`w-5 h-5 text-${severityColor}-400`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-medium line-clamp-1 mb-1">
                          {insight.title}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-white/60">
                          <span className={`px-2 py-0.5 bg-${severityColor}-500/20 
                            text-${severityColor}-300 rounded-full capitalize`}>
                            {insight.severity}
                          </span>
                          <span className="capitalize">{insight.type}</span>
                          <span>{formatTimeAgo(insight.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {isAcknowledged && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                        <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>

                    <p className="text-white/80 text-sm mb-3 line-clamp-2">
                      {insight.description}
                    </p>

                    {/* Metric Value */}
                    {insight.metric && insight.value !== undefined && (
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="px-3 py-1 bg-white/10 rounded-lg">
                          <span className="text-white/60 text-xs block">Current Value</span>
                          <span className="text-white font-medium">
                            {typeof insight.value === 'number' 
                              ? insight.value.toLocaleString()
                              : insight.value
                            }
                          </span>
                        </div>
                        
                        {insight.change !== undefined && (
                          <div className={`px-3 py-1 rounded-lg ${
                            insight.change > 0 
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            <span className="text-xs block opacity-80">Change</span>
                            <span className="font-medium">
                              {insight.change > 0 ? '+' : ''}{insight.change}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-white/10"
                        >
                          {/* Recommendation */}
                          {insight.recommendation && (
                            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                                <div>
                                  <p className="text-blue-200 font-medium text-sm mb-1">
                                    Recommendation
                                  </p>
                                  <p className="text-blue-100/80 text-sm">
                                    {insight.recommendation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {insight.actions && insight.actions.length > 0 && (
                            <div className="mb-4">
                              <p className="text-white/80 text-sm mb-2">Suggested Actions:</p>
                              <div className="space-y-2">
                                {insight.actions.map((action, index) => (
                                  <button
                                    key={index}
                                    className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 
                                      border border-white/20 rounded-lg text-white/80 text-sm 
                                      text-left transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Handle action
                                    }}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/10">
                            <div className="flex items-center space-x-2">
                              {!isAcknowledged && onAcknowledge && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onAcknowledge(insight.id)
                                  }}
                                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 
                                    border border-emerald-400/50 rounded text-emerald-200 text-sm 
                                    transition-colors flex items-center space-x-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Acknowledge</span>
                                </button>
                              )}

                              {onDismiss && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDismiss(insight.id)
                                  }}
                                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 
                                    border border-red-400/50 rounded text-red-200 text-sm 
                                    transition-colors flex items-center space-x-1"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Dismiss</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                              >
                                <Bookmark className="w-4 h-4 text-white/60" />
                              </button>
                              
                              {onShare && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onShare(insight)
                                  }}
                                  className="p-1 hover:bg-white/10 rounded transition-colors"
                                >
                                  <Share className="w-4 h-4 text-white/60" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {insights.filter(i => i.severity === 'critical').length}
            </p>
            <p className="text-red-300 text-sm">Critical</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {insights.filter(i => i.severity === 'warning').length}
            </p>
            <p className="text-amber-300 text-sm">Warnings</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {insights.filter(i => i.severity === 'positive').length}
            </p>
            <p className="text-emerald-300 text-sm">Achievements</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {insights.filter(i => !i.acknowledgedAt).length}
            </p>
            <p className="text-blue-300 text-sm">Unread</p>
          </div>
        </div>
      </div>
    </div>
  )
}