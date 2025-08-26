// Incident Management Component
// Security incident tracking and response coordination

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, Clock, CheckCircle, User, Calendar, 
  FileText, Shield, Activity, Eye, MessageSquare,
  Filter, Search, Plus, Edit, ArrowRight, X, Info
} from 'lucide-react'
import type { SecurityIncident, ThreatLevel, IncidentStatus } from '../types/security.types'

interface IncidentManagementProps {
  incidents: SecurityIncident[]
  userRole: string
}

export function IncidentManagement({ incidents, userRole }: IncidentManagementProps) {
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null)
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<ThreatLevel | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'status'>('date')

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let filtered = incidents

    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus)
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(i => i.severity === filterSeverity)
    }

    if (searchQuery) {
      filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort incidents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { emergency: 5, critical: 4, high: 3, medium: 2, low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        case 'status':
          return a.status.localeCompare(b.status)
        case 'date':
        default:
          return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      }
    })

    return filtered
  }, [incidents, filterStatus, filterSeverity, searchQuery, sortBy])

  // Incident statistics
  const incidentStats = useMemo(() => {
    const total = incidents.length
    const open = incidents.filter(i => !i.resolved).length
    const critical = incidents.filter(i => i.severity === 'critical' && !i.resolved).length
    const avgResolutionTime = 4.2 // Mock data - would be calculated from actual resolution times
    
    const byStatus = {
      detected: incidents.filter(i => i.status === 'detected').length,
      investigating: incidents.filter(i => i.status === 'investigating').length,
      containing: incidents.filter(i => i.status === 'containing').length,
      mitigating: incidents.filter(i => i.status === 'mitigating').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      closed: incidents.filter(i => i.status === 'closed').length
    }

    return { total, open, critical, avgResolutionTime, byStatus }
  }, [incidents])

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

  // Get status color
  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case 'detected': return 'red'
      case 'investigating': return 'orange'
      case 'containing': return 'yellow'
      case 'mitigating': return 'blue'
      case 'resolved': return 'emerald'
      case 'closed': return 'gray'
      default: return 'gray'
    }
  }

  // Format time since detection
  const formatTimeSince = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  // Incident card component
  const IncidentCard = ({ incident }: { incident: SecurityIncident }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setSelectedIncident(incident)}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
        hover:bg-white/15 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg bg-${getSeverityColor(incident.severity)}-500/20 mt-1`}>
            <AlertTriangle className={`w-5 h-5 text-${getSeverityColor(incident.severity)}-400`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{incident.title}</h3>
            <p className="text-white/60 text-sm line-clamp-2">{incident.description}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <div className={`px-2 py-1 bg-${getSeverityColor(incident.severity)}-500/20 
            text-${getSeverityColor(incident.severity)}-300 rounded text-xs font-medium capitalize`}>
            {incident.severity}
          </div>
          <div className={`px-2 py-1 bg-${getStatusColor(incident.status)}-500/20 
            text-${getStatusColor(incident.status)}-300 rounded text-xs font-medium capitalize`}>
            {incident.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-white/60">Category:</span>
          <span className="text-white ml-2">{incident.category}</span>
        </div>
        <div>
          <span className="text-white/60">Assigned to:</span>
          <span className="text-white ml-2">{incident.assignedTo}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeSince(incident.detectedAt)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{incident.reportedBy}</span>
          </div>
        </div>
        
        {incident.dataImpact && (
          <div className="flex items-center space-x-1 text-red-400">
            <Shield className="w-3 h-3" />
            <span>Data Impact</span>
          </div>
        )}
      </div>

      {/* Timeline Preview */}
      {incident.timeline.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-white/60">
            <Activity className="w-3 h-3" />
            <span>Latest: {incident.timeline[incident.timeline.length - 1].event}</span>
          </div>
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{incidentStats.open}</div>
          <div className="text-white/60 text-sm">Open Incidents</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <Shield className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{incidentStats.critical}</div>
          <div className="text-white/60 text-sm">Critical Severity</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{incidentStats.avgResolutionTime}h</div>
          <div className="text-white/60 text-sm">Avg Resolution</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{incidentStats.byStatus.resolved}</div>
          <div className="text-white/60 text-sm">Resolved Today</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Status</option>
            <option value="detected" className="bg-gray-800">Detected</option>
            <option value="investigating" className="bg-gray-800">Investigating</option>
            <option value="containing" className="bg-gray-800">Containing</option>
            <option value="mitigating" className="bg-gray-800">Mitigating</option>
            <option value="resolved" className="bg-gray-800">Resolved</option>
          </select>
          
          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as unknown)}
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
        
        <div className="flex items-center space-x-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="date" className="bg-gray-800">Sort by Date</option>
            <option value="severity" className="bg-gray-800">Sort by Severity</option>
            <option value="status" className="bg-gray-800">Sort by Status</option>
          </select>
          
          {userRole === 'admin' && (
            <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-lg text-blue-200 text-sm flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Incident
            </button>
          )}
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Security Incidents ({filteredIncidents.length})
        </h3>
        
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
        
        {filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Incidents Found</h3>
            <p className="text-white/60">
              {searchQuery || filterStatus !== 'all' || filterSeverity !== 'all'
                ? 'Try adjusting your filters'
                : 'No security incidents to display'
              }
            </p>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedIncident(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${getSeverityColor(selectedIncident.severity)}-500/20`}>
                    <AlertTriangle className={`w-6 h-6 text-${getSeverityColor(selectedIncident.severity)}-400`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedIncident.title}</h2>
                    <p className="text-white/60">Incident ID: {selectedIncident.id}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Status and Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Status</h4>
                  <div className={`inline-flex px-3 py-1 bg-${getStatusColor(selectedIncident.status)}-500/20 
                    text-${getStatusColor(selectedIncident.status)}-300 rounded-lg text-sm font-medium capitalize`}>
                    {selectedIncident.status.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Severity</h4>
                  <div className={`inline-flex px-3 py-1 bg-${getSeverityColor(selectedIncident.severity)}-500/20 
                    text-${getSeverityColor(selectedIncident.severity)}-300 rounded-lg text-sm font-medium capitalize`}>
                    {selectedIncident.severity}
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Category</h4>
                  <p className="text-white">{selectedIncident.category}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-2">Description</h4>
                <p className="text-white/80">{selectedIncident.description}</p>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-4">Incident Timeline</h4>
                <div className="space-y-3">
                  {selectedIncident.timeline.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white font-medium">{event.event}</p>
                          <span className="text-white/60 text-xs">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm">{event.details}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-white/60 text-xs">By: {event.actor}</span>
                          {event.automated && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                              Automated
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Plan */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-4">Response Plan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-white/80 text-sm font-medium mb-2">Containment Actions</h5>
                    <ul className="space-y-1">
                      {selectedIncident.response.containmentActions.map((action, index) => (
                        <li key={index} className="flex items-center space-x-2 text-white/60 text-sm">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-white/80 text-sm font-medium mb-2">Mitigation Steps</h5>
                    <ul className="space-y-1">
                      {selectedIncident.response.mitigationSteps.map((step, index) => (
                        <li key={index} className="flex items-center space-x-2 text-white/60 text-sm">
                          <ArrowRight className="w-3 h-3 text-blue-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {userRole === 'admin' && (
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-200 flex items-center">
                    <Edit className="w-4 h-4 mr-2" />
                    Update Incident
                  </button>
                  
                  <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                    border-emerald-400/50 rounded-lg text-emerald-200 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </button>
                  
                  <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border 
                    border-purple-400/50 rounded-lg text-purple-200 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}