// Security Dashboard Component
// Comprehensive security monitoring and compliance management interface

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Eye, Lock, FileText, Users, Activity, BarChart3,
  AlertCircle, Zap, Database, Network, Key, Search,
  Filter, Download, Settings, Bell, RefreshCw
} from 'lucide-react'
import { useSecurity } from '../hooks/useSecurity'
import { SecurityMetrics } from './SecurityMetrics'
import { ThreatMonitor } from './ThreatMonitor'
import { ComplianceOverview } from './ComplianceOverview'
import { IncidentManagement } from './IncidentManagement'
import { AuditTrail } from './AuditTrail'

interface SecurityDashboardProps {
  userId: string
  userRole: string
  compact?: boolean
}

export function SecurityDashboard({ userId, userRole, compact = false }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'compliance' | 'incidents' | 'audit' | 'policies'>('overview')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const {
    incidents,
    threats,
    compliance,
    alerts,
    vulnerabilities,
    riskScore,
    metrics,
    isLoading,
    hasOpenIncidents,
    hasUnacknowledgedAlerts,
    complianceStatus,
    loadSecurityData,
    acknowledgeAlert,
    resolveAlert
  } = useSecurity({ userId, autoMonitor: true })

  // Auto-refresh security data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadSecurityData()
      setLastRefresh(new Date())
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [autoRefresh, loadSecurityData])

  // Security status indicator
  const getSecurityStatus = () => {
    if (riskScore >= 80) return { status: 'critical', color: 'red', icon: AlertTriangle }
    if (riskScore >= 60) return { status: 'high', color: 'orange', icon: AlertCircle }
    if (riskScore >= 40) return { status: 'medium', color: 'yellow', icon: Clock }
    if (riskScore >= 20) return { status: 'low', color: 'blue', icon: Eye }
    return { status: 'secure', color: 'emerald', icon: CheckCircle }
  }

  const securityStatus = getSecurityStatus()
  const StatusIcon = securityStatus.icon

  // Navigation tabs
  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Shield, 
      badge: hasOpenIncidents || hasUnacknowledgedAlerts ? '!' : undefined
    },
    { 
      id: 'threats', 
      label: 'Threats', 
      icon: Zap, 
      badge: threats.filter(t => t.enabled && t.severity === 'critical').length || undefined
    },
    { 
      id: 'compliance', 
      label: 'Compliance', 
      icon: FileText, 
      badge: complianceStatus === 'non_compliant' ? '!' : undefined
    },
    { 
      id: 'incidents', 
      label: 'Incidents', 
      icon: AlertTriangle, 
      badge: incidents.filter(i => !i.resolved).length || undefined
    },
    { 
      id: 'audit', 
      label: 'Audit', 
      icon: Activity, 
      accessible: ['admin', 'security_officer', 'compliance_officer'].includes(userRole)
    },
    { 
      id: 'policies', 
      label: 'Policies', 
      icon: Lock, 
      accessible: ['admin', 'security_officer'].includes(userRole)
    }
  ].filter(tab => tab.accessible !== false)

  // Quick actions
  const quickActions = [
    {
      title: 'Run Security Scan',
      description: 'Perform comprehensive security assessment',
      icon: Search,
      action: () => logger.info('Starting security scan'),
      color: 'blue'
    },
    {
      title: 'Generate Report',
      description: 'Create security compliance report',
      icon: Download,
      action: () => logger.info('Generating report'),
      color: 'emerald'
    },
    {
      title: 'Review Alerts',
      description: 'Process unacknowledged security alerts',
      icon: Bell,
      action: () => setActiveTab('threats'),
      color: 'amber',
      count: alerts.filter(a => !a.acknowledged).length
    },
    {
      title: 'Update Policies',
      description: 'Review and update security policies',
      icon: Settings,
      action: () => setActiveTab('policies'),
      color: 'purple',
      disabled: !['admin', 'security_officer'].includes(userRole)
    }
  ]

  // Critical alerts section
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved)
  const highPriorityIncidents = incidents.filter(i => i.severity === 'critical' && !i.resolved)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Shield className="w-7 h-7 mr-3 text-blue-400" />
            Security & Compliance Dashboard
          </h1>
          <p className="text-white/60 mt-1">
            Comprehensive security monitoring and compliance management
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Security Status */}
          <div className={`flex items-center space-x-2 px-3 py-2 bg-${securityStatus.color}-500/20 
            border border-${securityStatus.color}-400/30 rounded-lg`}>
            <StatusIcon className={`w-5 h-5 text-${securityStatus.color}-400`} />
            <span className={`text-${securityStatus.color}-200 font-medium capitalize`}>
              {securityStatus.status}
            </span>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' 
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}
            title="Auto-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => {
              loadSecurityData()
              setLastRefresh(new Date())
            }}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg 
              text-white/60 hover:text-white transition-colors"
            title="Refresh Now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {(criticalAlerts.length > 0 || highPriorityIncidents.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-400/30 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-200">Critical Security Issues Detected</h3>
              <p className="text-red-100/80 text-sm mt-1">
                {criticalAlerts.length > 0 && `${criticalAlerts.length} critical alert${criticalAlerts.length !== 1 ? 's' : ''}`}
                {criticalAlerts.length > 0 && highPriorityIncidents.length > 0 && ' and '}
                {highPriorityIncidents.length > 0 && `${highPriorityIncidents.length} high-priority incident${highPriorityIncidents.length !== 1 ? 's' : ''}`}
                {' require immediate attention.'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2 mt-3">
            {criticalAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('threats')}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 
                  rounded text-red-200 text-sm"
              >
                Review Alerts
              </button>
            )}
            {highPriorityIncidents.length > 0 && (
              <button
                onClick={() => setActiveTab('incidents')}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 
                  rounded text-red-200 text-sm"
              >
                Manage Incidents
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Last Refresh Indicator */}
      <div className="text-center">
        <p className="text-white/40 text-xs">
          Last updated: {lastRefresh.toLocaleTimeString()} 
          {autoRefresh && ' (auto-refreshing)'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/20">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`relative px-4 py-3 font-medium transition-all duration-200 
                flex items-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white bg-white/10 border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.badge && (
                <div className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Security Metrics */}
              <SecurityMetrics 
                metrics={metrics}
                riskScore={riskScore}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={action.action}
                    disabled={action.disabled}
                    className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                      text-left transition-all duration-200 ${
                      action.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-white/15 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-${action.color}-500/20`}>
                        <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                      </div>
                      {action.count && action.count > 0 && (
                        <div className={`px-3 py-1 bg-${action.color}-500/20 text-${action.color}-300 
                          rounded-full text-sm font-medium`}>
                          {action.count}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                    <p className="text-sm text-white/60">{action.description}</p>
                  </motion.button>
                ))}
              </div>

              {/* Recent Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
                    Recent Incidents
                  </h3>
                  <div className="space-y-3">
                    {incidents.slice(0, 3).map((incident, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          incident.severity === 'critical' ? 'bg-red-400' :
                          incident.severity === 'high' ? 'bg-orange-400' :
                          incident.severity === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{incident.title}</p>
                          <p className="text-white/60 text-xs">{incident.status}</p>
                        </div>
                        <span className="text-white/40 text-xs">
                          {new Date(incident.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {incidents.length === 0 && (
                      <p className="text-white/60 text-sm">No recent incidents</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
                    Compliance Status
                  </h3>
                  <div className="space-y-3">
                    {compliance.slice(0, 3).map((framework, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white text-sm capitalize">{framework.framework.replace('_', ' ')}</p>
                          <p className="text-white/60 text-xs">{framework.version}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            framework.status === 'compliant' ? 'bg-emerald-400' :
                            framework.status === 'partial' ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          <span className="text-white text-sm">{framework.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'threats' && (
            <ThreatMonitor 
              threats={threats}
              alerts={alerts}
              onAcknowledgeAlert={acknowledgeAlert}
              onResolveAlert={resolveAlert}
              userRole={userRole}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceOverview 
              compliance={compliance}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              userRole={userRole}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentManagement 
              incidents={incidents}
              userRole={userRole}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrail 
              userId={userId}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}

          {activeTab === 'policies' && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Security Policies Management
              </h3>
              <p className="text-white/60">
                Policy management interface will be available in the next phase.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Cultural Acknowledgment */}
      <div className="fixed bottom-4 left-4 bg-purple-500/10 border border-purple-400/30 
        rounded-lg px-3 py-2 max-w-xs">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-purple-200 text-xs">
            Security respects Indigenous data sovereignty
          </span>
        </div>
      </div>
    </div>
  )
}