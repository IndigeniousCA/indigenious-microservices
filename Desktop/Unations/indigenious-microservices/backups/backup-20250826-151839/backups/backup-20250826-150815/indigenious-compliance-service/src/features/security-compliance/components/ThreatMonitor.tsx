// Threat Monitor Component
// Real-time threat detection and alert management

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, AlertTriangle, Eye, EyeOff, Clock, CheckCircle,
  Shield, Target, Activity, TrendingUp, Filter, Search,
  MapPin, Calendar, User, Globe, ArrowRight, X, Info
} from 'lucide-react'
import type { ThreatDetection, SecurityAlert, ThreatLevel } from '../types/security.types'

interface ThreatMonitorProps {
  threats: ThreatDetection[]
  alerts: SecurityAlert[]
  onAcknowledgeAlert: (alertId: string) => void
  onResolveAlert: (alertId: string, resolution: string) => void
  userRole: string
}

export function ThreatMonitor({ 
  threats, 
  alerts, 
  onAcknowledgeAlert, 
  onResolveAlert, 
  userRole 
}: ThreatMonitorProps) {
  const [activeView, setActiveView] = useState<'overview' | 'threats' | 'alerts'>('overview')
  const [selectedSeverity, setSelectedSeverity] = useState<ThreatLevel | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)

  // Filter threats and alerts
  const filteredThreats = useMemo(() => {
    let filtered = threats

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(t => t.severity === selectedSeverity)
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, emergency: 5 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }, [threats, selectedSeverity, searchQuery])

  const filteredAlerts = useMemo(() => {
    let filtered = alerts

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === selectedSeverity)
    }

    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, emergency: 5 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }, [alerts, selectedSeverity, searchQuery])

  // Threat statistics
  const threatStats = useMemo(() => {
    const total = threats.length
    const active = threats.filter(t => t.enabled).length
    const critical = threats.filter(t => t.severity === 'critical' && t.enabled).length
    const triggered = threats.filter(t => t.lastTriggered).length
    
    return { total, active, critical, triggered }
  }, [threats])

  // Alert statistics
  const alertStats = useMemo(() => {
    const total = alerts.length
    const unacknowledged = alerts.filter(a => !a.acknowledged).length
    const unresolved = alerts.filter(a => !a.resolved).length
    const critical = alerts.filter(a => a.severity === 'critical' && !a.resolved).length
    
    return { total, unacknowledged, unresolved, critical }
  }, [alerts])

  // Get severity color
  const getSeverityColor = (severity: ThreatLevel) => {
    switch (severity) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      case 'emergency': return 'purple'
      default: return 'gray'
    }
  }

  // Get MITRE ATT&CK color coding
  const getMitreColor = (tactic: string) => {
    const tacticColors: Record<string, string> = {
      'Initial Access': 'red',
      'Execution': 'orange',
      'Persistence': 'yellow',
      'Privilege Escalation': 'purple',
      'Defense Evasion': 'blue',
      'Credential Access': 'indigo',
      'Discovery': 'emerald',
      'Lateral Movement': 'teal',
      'Collection': 'cyan',
      'Command and Control': 'amber',
      'Exfiltration': 'rose',
      'Impact': 'pink'
    }
    return tacticColors[tactic] || 'gray'
  }

  // Threat detection card
  const ThreatCard = ({ threat }: { threat: ThreatDetection }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${getSeverityColor(threat.severity)}-500/20`}>
            <Target className={`w-5 h-5 text-${getSeverityColor(threat.severity)}-400`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{threat.name}</h3>
            <p className="text-white/60 text-sm capitalize">{threat.type} detection</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 bg-${getSeverityColor(threat.severity)}-500/20 
            text-${getSeverityColor(threat.severity)}-300 rounded text-xs font-medium capitalize`}>
            {threat.severity}
          </div>
          {threat.enabled ? (
            <Eye className="w-4 h-4 text-emerald-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      <p className="text-white/80 text-sm mb-4">{threat.description}</p>

      {/* MITRE ATT&CK Mapping */}
      <div className="flex items-center space-x-2 mb-4">
        <div className={`px-2 py-1 bg-${getMitreColor(threat.mitre.tactic)}-500/20 
          text-${getMitreColor(threat.mitre.tactic)}-300 rounded text-xs`}>
          {threat.mitre.tactic}
        </div>
        <ArrowRight className="w-3 h-3 text-white/40" />
        <div className="px-2 py-1 bg-white/10 text-white/80 rounded text-xs">
          {threat.mitre.technique}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-white/5 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{threat.confidence}%</div>
          <div className="text-xs text-white/60">Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">{threat.truePositives}</div>
          <div className="text-xs text-white/60">True Positives</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-400">{threat.falsePositives}</div>
          <div className="text-xs text-white/60">False Positives</div>
        </div>
      </div>

      {/* Indicators */}
      {threat.indicators.length > 0 && (
        <div>
          <h4 className="text-white/80 text-sm font-medium mb-2">Recent Indicators:</h4>
          <div className="space-y-1">
            {threat.indicators.slice(0, 2).map((indicator, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-white/60">{indicator.type}:</span>
                <span className="text-white">{indicator.value}</span>
                <span className="text-white/40">({indicator.confidence}%)</span>
              </div>
            ))}
            {threat.indicators.length > 2 && (
              <div className="text-xs text-white/40">
                +{threat.indicators.length - 2} more indicators
              </div>
            )}
          </div>
        </div>
      )}

      {threat.lastTriggered && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-white/60">
            <Clock className="w-3 h-3" />
            <span>Last triggered: {new Date(threat.lastTriggered).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </motion.div>
  )

  // Alert card
  const AlertCard = ({ alert }: { alert: SecurityAlert }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setSelectedAlert(alert)}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
        hover:bg-white/15 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${getSeverityColor(alert.severity)}-500/20`}>
            <AlertTriangle className={`w-5 h-5 text-${getSeverityColor(alert.severity)}-400`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{alert.title}</h3>
            <p className="text-white/60 text-sm">{alert.category}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 bg-${getSeverityColor(alert.severity)}-500/20 
            text-${getSeverityColor(alert.severity)}-300 rounded text-xs font-medium capitalize`}>
            {alert.severity}
          </div>
          {alert.acknowledged && !alert.resolved && (
            <CheckCircle className="w-4 h-4 text-blue-400" />
          )}
          {alert.resolved && (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>

      <p className="text-white/80 text-sm mb-4">{alert.description}</p>

      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Globe className="w-3 h-3" />
            <span>{alert.source}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(alert.triggered).toLocaleDateString()}</span>
          </div>
        </div>
        
        {!alert.acknowledged && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAcknowledgeAlert(alert.id)
            }}
            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 
              rounded text-blue-200 text-xs"
          >
            Acknowledge
          </button>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Threat Monitor</h2>
          <p className="text-white/60 text-sm">Real-time threat detection and security alerts</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Severities</option>
            <option value="critical" className="bg-gray-800">Critical</option>
            <option value="high" className="bg-gray-800">High</option>
            <option value="medium" className="bg-gray-800">Medium</option>
            <option value="low" className="bg-gray-800">Low</option>
          </select>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'threats', label: 'Threat Detection', icon: Target },
          { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as unknown)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
              activeView === view.id
                ? 'bg-blue-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <view.icon className="w-4 h-4" />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{threatStats.active}</div>
            <div className="text-white/60 text-sm">Active Detections</div>
            <div className="text-white/40 text-xs mt-1">{threatStats.total} total</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{threatStats.critical}</div>
            <div className="text-white/60 text-sm">Critical Threats</div>
            <div className="text-white/40 text-xs mt-1">requiring attention</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <Eye className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{alertStats.unacknowledged}</div>
            <div className="text-white/60 text-sm">Unack. Alerts</div>
            <div className="text-white/40 text-xs mt-1">{alertStats.total} total</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">98.2%</div>
            <div className="text-white/60 text-sm">Detection Rate</div>
            <div className="text-white/40 text-xs mt-1">last 30 days</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'threats' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Threat Detection Rules ({filteredThreats.length})
                </h3>
                {userRole === 'admin' && (
                  <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-200 text-sm">
                    Configure Rules
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredThreats.map((threat) => (
                  <ThreatCard key={threat.id} threat={threat} />
                ))}
              </div>
              
              {filteredThreats.length === 0 && (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Threats Found</h3>
                  <p className="text-white/60">
                    {searchQuery || selectedSeverity !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'All systems are secure'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {activeView === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Security Alerts ({filteredAlerts.length})
                </h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded text-blue-200 text-sm">
                    Bulk Acknowledge
                  </button>
                  <button className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                    border-emerald-400/50 rounded text-emerald-200 text-sm">
                    Export
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
              
              {filteredAlerts.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
                  <p className="text-white/60">All security alerts have been addressed</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAlert(null)}
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
                <h3 className="text-xl font-semibold text-white">{selectedAlert.title}</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-white mb-2">Description</h4>
                  <p className="text-white/80">{selectedAlert.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-white mb-2">Severity</h4>
                    <div className={`inline-flex px-3 py-1 bg-${getSeverityColor(selectedAlert.severity)}-500/20 
                      text-${getSeverityColor(selectedAlert.severity)}-300 rounded-lg text-sm font-medium capitalize`}>
                      {selectedAlert.severity}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-2">Category</h4>
                    <p className="text-white/80">{selectedAlert.category}</p>
                  </div>
                </div>

                {selectedAlert.indicators.length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Indicators</h4>
                    <div className="space-y-2">
                      {selectedAlert.indicators.map((indicator, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                          <div className="text-sm">
                            <span className="text-white/60">{indicator.type}:</span>
                            <span className="text-white ml-2">{indicator.value}</span>
                          </div>
                          <div className="text-xs text-white/40">
                            {indicator.confidence}% confidence
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  {!selectedAlert.acknowledged && (
                    <button
                      onClick={() => {
                        onAcknowledgeAlert(selectedAlert.id)
                        setSelectedAlert(null)
                      }}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                        border-blue-400/50 rounded-lg text-blue-200"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!selectedAlert.resolved && (
                    <button
                      onClick={() => {
                        onResolveAlert(selectedAlert.id, 'Resolved by admin')
                        setSelectedAlert(null)
                      }}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                        border-emerald-400/50 rounded-lg text-emerald-200"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}