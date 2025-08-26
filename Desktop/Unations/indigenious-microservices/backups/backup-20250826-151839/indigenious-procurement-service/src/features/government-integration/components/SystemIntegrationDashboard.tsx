// System Integration Dashboard Component
// Overview of all government system connections and sync status

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Zap, AlertCircle, CheckCircle, RefreshCw,
  Download, Upload, Clock, TrendingUp, Settings,
  Shield, Database, Activity, Link2, XCircle
} from 'lucide-react'
import { GovernmentSystem, IntegrationStatus } from '../types/integration.types'
import { useIntegrationStatus } from '../hooks/useIntegrationStatus'

interface SystemIntegrationDashboardProps {
  onSystemClick?: (system: GovernmentSystem) => void
  onConfigureClick?: (system: GovernmentSystem) => void
}

export function SystemIntegrationDashboard({
  onSystemClick,
  onConfigureClick
}: SystemIntegrationDashboardProps) {
  const { systems, refreshStatus, isLoading } = useIntegrationStatus()
  const [selectedSystem, setSelectedSystem] = useState<GovernmentSystem | null>(null)

  // System display information
  const systemInfo: Record<GovernmentSystem, {
    name: string
    description: string
    icon: any
    color: string
    priority: number
  }> = {
    GETS: {
      name: 'GETS',
      description: 'Government Electronic Tendering Service',
      icon: Database,
      color: 'blue',
      priority: 1
    },
    SAP_ARIBA: {
      name: 'SAP Ariba',
      description: 'PSPC Procurement Platform',
      icon: Globe,
      color: 'emerald',
      priority: 2
    },
    BUY_AND_SELL: {
      name: 'Buy and Sell',
      description: 'Federal Procurement Portal',
      icon: Link2,
      color: 'purple',
      priority: 3
    },
    MERX: {
      name: 'MERX',
      description: 'Canadian Public Tenders',
      icon: Database,
      color: 'amber',
      priority: 4
    },
    BC_BID: {
      name: 'BC Bid',
      description: 'British Columbia Procurement',
      icon: Globe,
      color: 'indigo',
      priority: 5
    },
    BIDCENTRAL: {
      name: 'BidCentral',
      description: 'Ontario Vendor Portal',
      icon: Database,
      color: 'red',
      priority: 6
    },
    PSIB: {
      name: 'PSIB',
      description: 'Indigenous Business Portal',
      icon: Shield,
      color: 'purple',
      priority: 7
    },
    ISC: {
      name: 'ISC',
      description: 'Indigenous Services Canada',
      icon: Shield,
      color: 'indigo',
      priority: 8
    }
  }

  // Sort systems by priority
  const sortedSystems = systems.sort((a, b) => 
    systemInfo[a.system].priority - systemInfo[b.system].priority
  )

  // Calculate overall health
  const overallHealth = {
    connected: systems.filter(s => s.connected).length,
    total: systems.length,
    syncing: systems.filter(s => s.syncStatus === 'syncing').length,
    errors: systems.filter(s => s.syncStatus === 'error').length
  }

  // Get status color
  const getStatusColor = (status: IntegrationStatus) => {
    if (!status.connected) return 'gray'
    if (status.syncStatus === 'error') return 'red'
    if (status.syncStatus === 'syncing') return 'amber'
    return 'emerald'
  }

  // Get status icon
  const getStatusIcon = (status: IntegrationStatus) => {
    if (!status.connected) return XCircle
    if (status.syncStatus === 'error') return AlertCircle
    if (status.syncStatus === 'syncing') return RefreshCw
    return CheckCircle
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border 
        border-blue-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Government System Integration
            </h2>
            <p className="text-white/70">
              Real-time connection to federal and provincial procurement systems
            </p>
          </div>
          
          <button
            onClick={() => refreshStatus()}
            disabled={isLoading}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Overall Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Connected</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {overallHealth.connected}/{overallHealth.total}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Syncing</span>
              <RefreshCw className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{overallHealth.syncing}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Errors</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">{overallHealth.errors}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Uptime</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">99.9%</p>
          </div>
        </div>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSystems.map((system) => {
          const info = systemInfo[system.system]
          const Icon = info.icon
          const StatusIcon = getStatusIcon(system)
          const statusColor = getStatusColor(system)

          return (
            <motion.div
              key={system.system}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 
                rounded-xl p-6 hover:bg-white/15 transition-all cursor-pointer"
              onClick={() => {
                setSelectedSystem(system.system)
                onSystemClick?.(system.system)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${info.color}-500/20 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${info.color}-400`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{info.name}</h3>
                    <p className="text-white/60 text-sm">{info.description}</p>
                  </div>
                </div>
                
                <StatusIcon className={`w-5 h-5 text-${statusColor}-400`} />
              </div>

              {/* Connection Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Status</span>
                  <span className={`text-${statusColor}-400 font-medium capitalize`}>
                    {system.connected ? system.syncStatus : 'Disconnected'}
                  </span>
                </div>

                {system.connected && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Last Sync</span>
                      <span className="text-white/80">
                        {new Date(system.lastSync).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">RFQs Imported</span>
                      <span className="text-white/80">
                        {system.metrics.rfqsImported.toLocaleString()}
                      </span>
                    </div>

                    {system.syncStatus === 'error' && system.errorMessage && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-400/30 rounded">
                        <p className="text-red-300 text-xs">{system.errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 mt-4">
                {system.connected ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Trigger sync
                      }}
                      className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                        border border-blue-400/50 rounded-lg text-blue-200 text-sm 
                        font-medium transition-colors"
                    >
                      Sync Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfigureClick?.(system.system)
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
                        rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-white/60" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onConfigureClick?.(system.system)
                    }}
                    className="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                      border border-emerald-400/50 rounded-lg text-emerald-200 text-sm 
                      font-medium transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Integration Activity</h3>
        
        <div className="space-y-3">
          {[
            { 
              system: 'GETS', 
              action: 'Imported 15 new RFQs', 
              time: '2 minutes ago',
              icon: Download,
              color: 'blue'
            },
            { 
              system: 'SAP Ariba', 
              action: 'Submitted bid #2024-001', 
              time: '1 hour ago',
              icon: Upload,
              color: 'emerald'
            },
            { 
              system: 'PSIB', 
              action: 'Certification validated', 
              time: '3 hours ago',
              icon: Shield,
              color: 'purple'
            },
            { 
              system: 'MERX', 
              action: 'Document sync completed', 
              time: '5 hours ago',
              icon: CheckCircle,
              color: 'amber'
            }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className={`p-2 bg-${activity.color}-500/20 rounded-lg`}>
                <activity.icon className={`w-4 h-4 text-${activity.color}-400`} />
              </div>
              <div className="flex-1">
                <p className="text-white/90 text-sm">{activity.action}</p>
                <p className="text-white/60 text-xs">{activity.system}</p>
              </div>
              <span className="text-white/40 text-xs">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected System Details Modal */}
      <AnimatePresence>
        {selectedSystem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSystem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full"
            >
              {/* Modal content would go here */}
              <h3 className="text-xl font-semibold text-white mb-4">
                {systemInfo[selectedSystem].name} Integration Details
              </h3>
              <p className="text-white/70">Detailed integration information...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}