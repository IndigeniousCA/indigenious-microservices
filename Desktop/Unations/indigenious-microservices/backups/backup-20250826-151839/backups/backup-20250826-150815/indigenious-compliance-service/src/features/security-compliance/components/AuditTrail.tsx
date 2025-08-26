// Audit Trail Component
// Forensic-quality audit logging and compliance tracking

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Clock, User, Shield, Database, FileText,
  Filter, Search, Download, Calendar, MapPin, AlertTriangle,
  CheckCircle, Eye, EyeOff, Trash2, Lock, Unlock, Edit,
  Globe, Smartphone, Monitor, Server, ChevronDown, Info
} from 'lucide-react'

interface AuditEvent {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  ipAddress: string
  userAgent: string
  location: {
    country: string
    city: string
    coordinates?: [number, number]
  }
  outcome: 'success' | 'failure' | 'warning'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  details: {
    description: string
    metadata: Record<string, any>
    culturalContext?: string
    dataClassification?: string
    indigenousRelevance?: boolean
  }
  complianceFrameworks: string[]
  retention: {
    category: string
    retentionPeriod: string
    legalHold: boolean
  }
}

interface AuditTrailProps {
  userId: string
  timeRange: '1h' | '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void
}

export function AuditTrail({ userId, timeRange, onTimeRangeChange }: AuditTrailProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | 'all'>('all')
  const [selectedAction, setSelectedAction] = useState<string | 'all'>('all')
  const [selectedRisk, setSelectedRisk] = useState<string | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xml'>('json')

  // Mock audit data - would come from real audit system
  const auditEvents: AuditEvent[] = [
    {
      id: 'audit-001',
      timestamp: new Date().toISOString(),
      userId: 'user-123',
      userName: 'Sarah Johnson',
      userRole: 'admin',
      action: 'access_indigenous_data',
      resource: 'community_profiles',
      resourceId: 'profile-456',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      location: {
        country: 'Canada',
        city: 'Ottawa',
        coordinates: [-75.6972, 45.4215]
      },
      outcome: 'success',
      riskLevel: 'medium',
      details: {
        description: 'Accessed community profile data with proper cultural protocol',
        metadata: {
          communityName: 'Anishinaabe Nation',
          consentVerified: true,
          protocolFollowed: 'Traditional Governance Review'
        },
        culturalContext: 'Traditional governance protocols followed',
        dataClassification: 'Indigenous Sensitive',
        indigenousRelevance: true
      },
      complianceFrameworks: ['indigenous_sovereignty', 'pipeda'],
      retention: {
        category: 'Indigenous Data Access',
        retentionPeriod: '7 years',
        legalHold: false
      }
    },
    {
      id: 'audit-002',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      userId: 'user-456',
      userName: 'Michael Thompson',
      userRole: 'security_officer',
      action: 'policy_update',
      resource: 'security_policies',
      resourceId: 'policy-789',
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: {
        country: 'Canada',
        city: 'Toronto'
      },
      outcome: 'success',
      riskLevel: 'high',
      details: {
        description: 'Updated encryption policy to include Indigenous data protection requirements',
        metadata: {
          policyType: 'Data Encryption',
          previousVersion: '2.1',
          newVersion: '2.2',
          reviewedBy: 'Indigenous Data Committee'
        },
        culturalContext: 'Aligned with CARE principles',
        indigenousRelevance: true
      },
      complianceFrameworks: ['fedramp', 'cccs', 'indigenous_sovereignty'],
      retention: {
        category: 'Policy Management',
        retentionPeriod: '10 years',
        legalHold: true
      }
    },
    {
      id: 'audit-003',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      userId: 'user-789',
      userName: 'System Automated',
      userRole: 'system',
      action: 'threat_detection',
      resource: 'security_monitoring',
      ipAddress: '127.0.0.1',
      userAgent: 'SecurityBot/1.0',
      location: {
        country: 'Canada',
        city: 'Vancouver'
      },
      outcome: 'warning',
      riskLevel: 'critical',
      details: {
        description: 'Detected potential unauthorized access attempt to Indigenous community data',
        metadata: {
          threatType: 'Brute Force Attack',
          attemptsBlocked: 15,
          sourceIP: '203.0.113.42',
          mitigationApplied: 'IP Block + Alert'
        },
        dataClassification: 'Indigenous Restricted'
      },
      complianceFrameworks: ['indigenous_sovereignty', 'cccs'],
      retention: {
        category: 'Security Incident',
        retentionPeriod: '7 years',
        legalHold: true
      }
    }
  ]

  // Filter audit events
  const filteredEvents = useMemo(() => {
    let filtered = auditEvents

    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.details.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedUser !== 'all') {
      filtered = filtered.filter(event => event.userId === selectedUser)
    }

    if (selectedAction !== 'all') {
      filtered = filtered.filter(event => event.action === selectedAction)
    }

    if (selectedRisk !== 'all') {
      filtered = filtered.filter(event => event.riskLevel === selectedRisk)
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [auditEvents, searchQuery, selectedUser, selectedAction, selectedRisk])

  // Get unique values for filters
  const uniqueUsers = [...new Set(auditEvents.map(e => ({ id: e.userId, name: e.userName })))]
  const uniqueActions = [...new Set(auditEvents.map(e => e.action))]

  // Get risk level color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      default: return 'gray'
    }
  }

  // Get outcome color
  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'emerald'
      case 'failure': return 'red'
      case 'warning': return 'amber'
      default: return 'gray'
    }
  }

  // Get device icon
  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return Smartphone
    }
    if (userAgent.includes('SecurityBot') || userAgent.includes('System')) {
      return Server
    }
    return Monitor
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    }
  }

  const getRelativeTime = (date: Date) => {
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

  // Export audit logs
  const handleExport = () => {
    const exportData = filteredEvents.map(event => ({
      timestamp: event.timestamp,
      user: event.userName,
      action: event.action,
      resource: event.resource,
      outcome: event.outcome,
      riskLevel: event.riskLevel,
      ipAddress: event.ipAddress,
      location: `${event.location.city}, ${event.location.country}`,
      description: event.details.description,
      complianceFrameworks: event.complianceFrameworks.join(', '),
      indigenousRelevance: event.details.indigenousRelevance || false
    }))

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${exportFormat}`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Audit Trail</h2>
          <p className="text-white/60 text-sm">
            Forensic-quality logging and compliance tracking for all system activities
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range as unknown)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
              border-emerald-400/50 rounded-lg text-emerald-200 text-sm flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-4">
          <h3 className="font-medium text-white">Filter Audit Events</h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 text-white/60 hover:text-white text-sm"
          >
            <span>Advanced Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Users</option>
            {uniqueUsers.map((user) => (
              <option key={user.id} value={user.id} className="bg-gray-800">
                {user.name}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action} className="bg-gray-800">
                {action.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Risk Level Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Risk Levels</option>
            <option value="critical" className="bg-gray-800">Critical</option>
            <option value="high" className="bg-gray-800">High</option>
            <option value="medium" className="bg-gray-800">Medium</option>
            <option value="low" className="bg-gray-800">Low</option>
          </select>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Export Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as unknown)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="json" className="bg-gray-800">JSON</option>
                    <option value="csv" className="bg-gray-800">CSV</option>
                    <option value="xml" className="bg-gray-800">XML</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-200 text-sm">
                    Apply Filters
                  </button>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedUser('all')
                      setSelectedAction('all')
                      setSelectedRisk('all')
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                      rounded-lg text-white/60 text-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Audit Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Audit Events ({filteredEvents.length})
          </h3>
          <div className="text-white/60 text-sm">
            Showing events from {timeRange}
          </div>
        </div>

        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const timestamp = formatTimestamp(event.timestamp)
            const DeviceIcon = getDeviceIcon(event.userAgent)
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedEvent(event)}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                  hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg bg-${getRiskColor(event.riskLevel)}-500/20 mt-1`}>
                      <Activity className={`w-5 h-5 text-${getRiskColor(event.riskLevel)}-400`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-white">
                          {event.action.replace('_', ' ')}
                        </h4>
                        <div className={`px-2 py-1 bg-${getOutcomeColor(event.outcome)}-500/20 
                          text-${getOutcomeColor(event.outcome)}-300 rounded text-xs font-medium capitalize`}>
                          {event.outcome}
                        </div>
                        {event.details.indigenousRelevance && (
                          <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            Indigenous Data
                          </div>
                        )}
                      </div>
                      
                      <p className="text-white/80 text-sm mb-3">{event.details.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-white/60">User:</span>
                          <span className="text-white ml-2">{event.userName}</span>
                        </div>
                        <div>
                          <span className="text-white/60">Resource:</span>
                          <span className="text-white ml-2">{event.resource}</span>
                        </div>
                        <div>
                          <span className="text-white/60">Location:</span>
                          <span className="text-white ml-2">{event.location.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <DeviceIcon className="w-4 h-4 text-white/60" />
                      <span className="text-white/60 text-xs">{timestamp.relative}</span>
                    </div>
                    <div className={`px-2 py-1 bg-${getRiskColor(event.riskLevel)}-500/20 
                      text-${getRiskColor(event.riskLevel)}-300 rounded text-xs font-medium capitalize`}>
                      {event.riskLevel} Risk
                    </div>
                  </div>
                </div>

                {/* Compliance Frameworks */}
                <div className="flex items-center space-x-2">
                  <span className="text-white/60 text-xs">Compliance:</span>
                  <div className="flex space-x-1">
                    {event.complianceFrameworks.map((framework) => (
                      <div key={framework} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 
                        rounded text-xs">
                        {framework.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Audit Events Found</h3>
            <p className="text-white/60">
              {searchQuery || selectedUser !== 'all' || selectedAction !== 'all' || selectedRisk !== 'all'
                ? 'Try adjusting your filters'
                : 'No audit events to display'
              }
            </p>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Audit Event Details</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Event Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Event Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Action:</span>
                        <span className="text-white ml-2">{selectedEvent.action.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Resource:</span>
                        <span className="text-white ml-2">{selectedEvent.resource}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Timestamp:</span>
                        <span className="text-white ml-2">
                          {formatTimestamp(selectedEvent.timestamp).date} {formatTimestamp(selectedEvent.timestamp).time}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Outcome:</span>
                        <span className={`ml-2 px-2 py-1 bg-${getOutcomeColor(selectedEvent.outcome)}-500/20 
                          text-${getOutcomeColor(selectedEvent.outcome)}-300 rounded text-xs capitalize`}>
                          {selectedEvent.outcome}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">User & Location</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">User:</span>
                        <span className="text-white ml-2">{selectedEvent.userName}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Role:</span>
                        <span className="text-white ml-2">{selectedEvent.userRole}</span>
                      </div>
                      <div>
                        <span className="text-white/60">IP Address:</span>
                        <span className="text-white ml-2">{selectedEvent.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Location:</span>
                        <span className="text-white ml-2">
                          {selectedEvent.location.city}, {selectedEvent.location.country}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cultural Context */}
                {selectedEvent.details.indigenousRelevance && (
                  <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                    <h4 className="font-medium text-purple-200 mb-3 flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      Indigenous Data Context
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-purple-100/80">Cultural Context:</span>
                        <span className="text-purple-100 ml-2">{selectedEvent.details.culturalContext}</span>
                      </div>
                      <div>
                        <span className="text-purple-100/80">Data Classification:</span>
                        <span className="text-purple-100 ml-2">{selectedEvent.details.dataClassification}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Metadata */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Event Metadata</h4>
                  <pre className="text-xs text-white/80 bg-black/20 rounded p-3 overflow-x-auto">
                    {JSON.stringify(selectedEvent.details.metadata, null, 2)}
                  </pre>
                </div>

                {/* Compliance & Retention */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Compliance Frameworks</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.complianceFrameworks.map((framework) => (
                        <div key={framework} className="px-3 py-1 bg-blue-500/20 text-blue-300 
                          rounded text-sm">
                          {framework.replace('_', ' ').toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Retention Policy</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Category:</span>
                        <span className="text-white ml-2">{selectedEvent.retention.category}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Retention Period:</span>
                        <span className="text-white ml-2">{selectedEvent.retention.retentionPeriod}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Legal Hold:</span>
                        <span className="text-white ml-2">
                          {selectedEvent.retention.legalHold ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compliance Notice */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-indigo-400" />
          <div className="text-indigo-200 text-sm">
            <p className="font-medium mb-1">Audit Trail Compliance</p>
            <p className="text-indigo-100/80">
              All audit events are retained according to government standards and Indigenous data sovereignty requirements. 
              Logs are tamper-evident and stored with end-to-end encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}