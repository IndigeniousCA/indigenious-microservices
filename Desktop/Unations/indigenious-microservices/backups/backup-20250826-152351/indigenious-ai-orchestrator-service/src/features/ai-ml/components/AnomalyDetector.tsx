// Anomaly Detector Component
// AI-powered unusual pattern detection and alerts

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, Shield, Activity, TrendingUp, Eye, X,
  Clock, CheckCircle, XCircle, Info, Filter, Search,
  Download, RefreshCw, BarChart3, Zap, Users, DollarSign
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import type { AnomalyAlert } from '../types/ai-ml.types'

interface AnomalyDetectorProps {
  userId: string
  userRole: string
}

export function AnomalyDetector({ userId, userRole }: AnomalyDetectorProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null)
  const [filterType, setFilterType] = useState<string | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Set<string>>(new Set())

  const { 
    anomalies, 
    dismissAnomaly, 
    reportFalsePositive,
    isLoading 
  } = useAI({ userId })

  // Filter anomalies
  const filteredAnomalies = useMemo(() => {
    let filtered = anomalies.filter(a => {
      if (!showResolved && resolvedAnomalies.has(a.id)) return false
      return true
    })

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType)
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === filterSeverity)
    }

    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.entities.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    return filtered.sort((a, b) => {
      // Sort by severity then date
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    })
  }, [anomalies, filterType, filterSeverity, searchQuery, showResolved, resolvedAnomalies])

  // Anomaly statistics
  const anomalyStats = useMemo(() => {
    const total = anomalies.length
    const critical = anomalies.filter(a => a.severity === 'critical').length
    const resolved = resolvedAnomalies.size
    const falsePositiveRate = anomalies.reduce((sum, a) => sum + a.falsePositiveProbability, 0) / total

    const byType = {
      bidding_pattern: anomalies.filter(a => a.type === 'bidding_pattern').length,
      pricing_anomaly: anomalies.filter(a => a.type === 'pricing_anomaly').length,
      behavior_change: anomalies.filter(a => a.type === 'behavior_change').length,
      compliance_risk: anomalies.filter(a => a.type === 'compliance_risk').length
    }

    return { total, critical, resolved, falsePositiveRate, byType }
  }, [anomalies, resolvedAnomalies])

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      default: return 'gray'
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bidding_pattern': return BarChart3
      case 'pricing_anomaly': return DollarSign
      case 'behavior_change': return Users
      case 'compliance_risk': return Shield
      default: return AlertTriangle
    }
  }

  // Handle anomaly resolution
  const handleResolveAnomaly = (anomalyId: string) => {
    setResolvedAnomalies(prev => new Set(prev).add(anomalyId))
    setSelectedAnomaly(null)
  }

  // Handle false positive report
  const handleReportFalsePositive = (anomalyId: string) => {
    reportFalsePositive(anomalyId)
    handleResolveAnomaly(anomalyId)
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">{anomalyStats.total}</div>
          <div className="text-white/60 text-sm">Total Anomalies</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <Zap className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">{anomalyStats.critical}</div>
          <div className="text-white/60 text-sm">Critical Alerts</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">{anomalyStats.resolved}</div>
          <div className="text-white/60 text-sm">Resolved</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <Activity className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white">
            {Math.round((1 - anomalyStats.falsePositiveRate) * 100)}%
          </div>
          <div className="text-white/60 text-sm">Accuracy</div>
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
                placeholder="Search anomalies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="bidding_pattern" className="bg-gray-800">Bidding Pattern</option>
              <option value="pricing_anomaly" className="bg-gray-800">Pricing Anomaly</option>
              <option value="behavior_change" className="bg-gray-800">Behavior Change</option>
              <option value="compliance_risk" className="bg-gray-800">Compliance Risk</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all" className="bg-gray-800">All Severities</option>
              <option value="critical" className="bg-gray-800">Critical</option>
              <option value="high" className="bg-gray-800">High</option>
              <option value="medium" className="bg-gray-800">Medium</option>
              <option value="low" className="bg-gray-800">Low</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            {/* Show Resolved Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="text-white text-sm">Show Resolved</span>
            </label>

            {/* Export Button */}
            <button className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border 
              border-amber-400/50 rounded-lg text-amber-200 text-sm flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="space-y-4">
        {filteredAnomalies.map((anomaly) => {
          const TypeIcon = getTypeIcon(anomaly.type)
          const isResolved = resolvedAnomalies.has(anomaly.id)
          
          return (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                ${isResolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg bg-${getSeverityColor(anomaly.severity)}-500/20`}>
                    <TypeIcon className={`w-5 h-5 text-${getSeverityColor(anomaly.severity)}-400`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-white capitalize">
                        {anomaly.type.replace('_', ' ')}
                      </h3>
                      <div className={`px-2 py-1 bg-${getSeverityColor(anomaly.severity)}-500/20 
                        text-${getSeverityColor(anomaly.severity)}-300 rounded text-xs font-medium capitalize`}>
                        {anomaly.severity}
                      </div>
                      {isResolved && (
                        <div className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                          Resolved
                        </div>
                      )}
                    </div>
                    
                    <p className="text-white/80 mb-3">{anomaly.description}</p>
                    
                    {/* Evidence Summary */}
                    <div className="bg-white/5 rounded-lg p-3 mb-3">
                      <h4 className="text-white/80 text-sm font-medium mb-2">Evidence</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-white/60">Deviation:</span>
                          <p className="text-amber-400 font-medium">{anomaly.evidence.deviation}%</p>
                        </div>
                        <div>
                          <span className="text-white/60">Normal Range:</span>
                          <p className="text-white">
                            ${anomaly.evidence.historicalNorm.min?.toLocaleString()} - 
                            ${anomaly.evidence.historicalNorm.max?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60">False Positive:</span>
                          <p className="text-white">
                            {Math.round(anomaly.falsePositiveProbability * 100)}% chance
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Suggested Action */}
                    <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                      <p className="text-blue-200 text-sm">
                        <span className="font-medium">Suggested Action:</span> {anomaly.suggestedAction}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-white/60 text-sm mb-2">{formatTimeAgo(anomaly.detectedAt)}</p>
                  <button
                    onClick={() => setSelectedAnomaly(anomaly)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Entities */}
              {anomaly.entities.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-white/60">
                  <span>Related:</span>
                  <div className="flex flex-wrap gap-2">
                    {anomaly.entities.map((entity, i) => (
                      <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isResolved && userRole === 'admin' && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center space-x-3">
                  <button
                    onClick={() => handleResolveAnomaly(anomaly.id)}
                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                      border-emerald-400/50 rounded text-emerald-200 text-sm transition-colors"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleReportFalsePositive(anomaly.id)}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border 
                      border-amber-400/50 rounded text-amber-200 text-sm transition-colors"
                  >
                    False Positive
                  </button>
                  <button
                    onClick={() => dismissAnomaly(anomaly.id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border 
                      border-red-400/50 rounded text-red-200 text-sm transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {filteredAnomalies.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Anomalies Detected</h3>
          <p className="text-white/60">
            {searchQuery || filterType !== 'all' || filterSeverity !== 'all'
              ? 'Try adjusting your filters'
              : 'All systems operating normally'
            }
          </p>
        </div>
      )}

      {/* Anomaly Detail Modal */}
      <AnimatePresence>
        {selectedAnomaly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAnomaly(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Anomaly Details</h3>
                <button
                  onClick={() => setSelectedAnomaly(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Anomaly Info */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 rounded-lg bg-${getSeverityColor(selectedAnomaly.severity)}-500/20`}>
                      {(() => {
                        const Icon = getTypeIcon(selectedAnomaly.type)
                        return <Icon className={`w-6 h-6 text-${getSeverityColor(selectedAnomaly.severity)}-400`} />
                      })()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white capitalize">
                        {selectedAnomaly.type.replace('_', ' ')}
                      </h4>
                      <p className="text-white/60 text-sm">
                        Detected {formatTimeAgo(selectedAnomaly.detectedAt)}
                      </p>
                    </div>
                  </div>

                  <p className="text-white/80">{selectedAnomaly.description}</p>
                </div>

                {/* Evidence Details */}
                <div>
                  <h4 className="font-medium text-white mb-3">Detailed Evidence</h4>
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-white/60 text-sm">Deviation from Normal:</span>
                      <p className="text-amber-400 text-xl font-bold">{selectedAnomaly.evidence.deviation}%</p>
                    </div>
                    
                    <div>
                      <span className="text-white/60 text-sm">Historical Normal Range:</span>
                      <div className="mt-2">
                        <div className="flex items-center space-x-4">
                          <div>
                            <span className="text-white/40 text-xs">Min</span>
                            <p className="text-white">${selectedAnomaly.evidence.historicalNorm.min?.toLocaleString()}</p>
                          </div>
                          <div className="flex-1 h-2 bg-white/10 rounded-full relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full" />
                          </div>
                          <div>
                            <span className="text-white/40 text-xs">Max</span>
                            <p className="text-white">${selectedAnomaly.evidence.historicalNorm.max?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedAnomaly.evidence.dataPoints.length > 0 && (
                      <div>
                        <span className="text-white/60 text-sm">Sample Data Points:</span>
                        <div className="mt-2 space-y-1">
                          {selectedAnomaly.evidence.dataPoints.map((point, i) => (
                            <div key={i} className="text-white/80 text-sm">
                              • ${point.price?.toLocaleString()} (avg: ${point.avg?.toLocaleString()})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div>
                  <h4 className="font-medium text-white mb-3">Risk Assessment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <span className="text-white/60 text-sm">Severity Level</span>
                      <p className={`text-${getSeverityColor(selectedAnomaly.severity)}-400 
                        font-semibold capitalize`}>
                        {selectedAnomaly.severity}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <span className="text-white/60 text-sm">False Positive Probability</span>
                      <p className="text-white font-semibold">
                        {Math.round(selectedAnomaly.falsePositiveProbability * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="font-medium text-blue-200 mb-2">Recommended Action</h4>
                  <p className="text-white/80">{selectedAnomaly.suggestedAction}</p>
                </div>

                {/* Action Buttons */}
                {!resolvedAnomalies.has(selectedAnomaly.id) && userRole === 'admin' && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        handleResolveAnomaly(selectedAnomaly.id)
                        setSelectedAnomaly(null)
                      }}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                        border-emerald-400/50 rounded-lg text-emerald-200 transition-colors"
                    >
                      Mark as Resolved
                    </button>
                    <button
                      onClick={() => {
                        handleReportFalsePositive(selectedAnomaly.id)
                        setSelectedAnomaly(null)
                      }}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border 
                        border-amber-400/50 rounded-lg text-amber-200 transition-colors"
                    >
                      Report False Positive
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}