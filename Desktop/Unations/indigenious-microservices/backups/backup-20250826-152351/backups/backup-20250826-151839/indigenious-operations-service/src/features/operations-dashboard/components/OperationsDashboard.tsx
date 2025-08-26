/**
 * Operations Dashboard Component
 * Real-time monitoring and system health visualization
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Lock,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Users,
  Wifi,
  XCircle,
  Zap,
  BarChart3,
  CircuitBoard,
  Gauge,
  Network,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { formatBytes, formatDuration, formatNumber } from '@/lib/utils/format'

interface DashboardData {
  system: {
    cpu: { usage: number; cores: number; loadAverage: number[] }
    memory: { total: number; used: number; percentage: number }
    disk: { total: number; used: number; percentage: number }
    process: { uptime: number; memory: number }
  }
  api: {
    requestsPerMinute: number
    averageResponseTime: number
    errorRate: number
    topEndpoints: Array<{ endpoint: string; count: number }>
    statusCodeDistribution: Record<number, number>
  }
  security: {
    threatsDetected: number
    rateLimitHits: number
    authFailures: number
    activeSessions: number
    securityScore: number
  }
  business: {
    activeRFQs: number
    bidsToday: number
    contractsAwarded: number
    totalValue: number
    newUsers: number
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
    timestamp: Date
  }>
}

export default function OperationsDashboard() {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'hour' | 'day' | 'week'>('hour')
  const [activeTab, setActiveTab] = useState<'overview' | 'system' | 'api' | 'security' | 'business'>('overview')
  const [alerts, setAlerts] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Connect to WebSocket
  useEffect(() => {
    if (!user?.token) return

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: { token: user.token },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      logger.info('Connected to dashboard')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      logger.info('Disconnected from dashboard')
      setConnected(false)
    })

    socket.on('error', (error) => {
      logger.error('Dashboard error:', error)
    })

    // Data events
    socket.on('initial_data', (data) => {
      setDashboardData(data)
      setAlerts(data.alerts || [])
    })

    socket.on('metrics:system', (data) => {
      setDashboardData(prev => prev ? { ...prev, system: data } : null)
    })

    socket.on('metrics:api', (data) => {
      // Update API metrics incrementally
      setDashboardData(prev => {
        if (!prev) return null
        return {
          ...prev,
          api: {
            ...prev.api,
            requestsPerMinute: Math.round((prev.api.requestsPerMinute * 59 + 1) / 60)
          }
        }
      })
    })

    socket.on('alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)) // Keep last 50
    })

    socket.on('aggregates', (data) => {
      // Update aggregate data
      logger.info('Received aggregates:', data)
    })

    return () => {
      socket.disconnect()
    }
  }, [user?.token])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !socketRef.current?.connected) return

    const interval = setInterval(() => {
      socketRef.current?.emit('request_historical', {
        type: 'system',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        aggregation: 'minute'
      })
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleTimeRangeChange = (range: 'hour' | 'day' | 'week') => {
    setSelectedTimeRange(range)
    // Request new data for time range
    socketRef.current?.emit('request_historical', {
      type: 'all',
      startTime: getStartTime(range).toISOString(),
      endTime: new Date().toISOString(),
      aggregation: range === 'hour' ? 'minute' : 'hour'
    })
  }

  const getStartTime = (range: string): Date => {
    const now = new Date()
    switch (range) {
      case 'hour': return new Date(now.getTime() - 3600000)
      case 'day': return new Date(now.getTime() - 86400000)
      case 'week': return new Date(now.getTime() - 604800000)
      default: return now
    }
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <GlassPanel className="p-8">
          <div className="flex items-center space-x-4">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
            <span className="text-white">Loading dashboard...</span>
          </div>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              connected ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs ${
                connected ? 'text-green-400' : 'text-red-400'
              }`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex bg-white/10 rounded-lg p-1">
              {(['hour', 'day', 'week'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedTimeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <GlassButton
              variant={autoRefresh ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </GlassButton>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-white/10 pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: Gauge },
            { id: 'system', label: 'System', icon: CircuitBoard },
            { id: 'api', label: 'API', icon: Network },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'business', label: 'Business', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* System Health */}
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">System Health</h3>
                  <Server className="h-5 w-5 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <MetricBar
                    label="CPU"
                    value={dashboardData.system.cpu.usage}
                    max={100}
                    unit="%"
                    color="blue"
                  />
                  <MetricBar
                    label="Memory"
                    value={dashboardData.system.memory.percentage}
                    max={100}
                    unit="%"
                    color="purple"
                  />
                  <MetricBar
                    label="Disk"
                    value={dashboardData.system.disk.percentage}
                    max={100}
                    unit="%"
                    color="yellow"
                  />
                </div>
              </GlassPanel>

              {/* API Performance */}
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">API Performance</h3>
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="space-y-3">
                  <Metric
                    label="Requests/min"
                    value={formatNumber(dashboardData.api.requestsPerMinute)}
                    trend="up"
                  />
                  <Metric
                    label="Avg Response"
                    value={`${dashboardData.api.averageResponseTime.toFixed(0)}ms`}
                    trend={dashboardData.api.averageResponseTime < 200 ? 'good' : 'bad'}
                  />
                  <Metric
                    label="Error Rate"
                    value={`${dashboardData.api.errorRate.toFixed(1)}%`}
                    trend={dashboardData.api.errorRate < 1 ? 'good' : 'bad'}
                  />
                </div>
              </GlassPanel>

              {/* Security Status */}
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Security</h3>
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {dashboardData.security.securityScore}
                    </div>
                    <div className="text-sm text-gray-400">Security Score</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-white font-medium">
                        {dashboardData.security.threatsDetected}
                      </div>
                      <div className="text-gray-400">Threats</div>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {dashboardData.security.activeSessions}
                      </div>
                      <div className="text-gray-400">Sessions</div>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* Business Activity */}
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Business</h3>
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div className="space-y-3">
                  <Metric
                    label="Active RFQs"
                    value={formatNumber(dashboardData.business.activeRFQs)}
                  />
                  <Metric
                    label="Bids Today"
                    value={formatNumber(dashboardData.business.bidsToday)}
                  />
                  <Metric
                    label="New Users"
                    value={formatNumber(dashboardData.business.newUsers)}
                  />
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {/* Other tabs content... */}
        </AnimatePresence>

        {/* Alerts Section */}
        <GlassPanel>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span>Recent Alerts</span>
              {alerts.length > 0 && (
                <span className="text-sm text-gray-400">({alerts.length})</span>
              )}
            </h3>
            {alerts.length > 0 && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => socketRef.current?.emit('command', { action: 'clear_alerts' })}
              >
                Clear All
              </GlassButton>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No active alerts
              </div>
            ) : (
              alerts.map((alert, index) => (
                <motion.div
                  key={alert.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' 
                      ? 'bg-red-500/10 border-red-500/50 text-red-400'
                      : alert.severity === 'high'
                      ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                      : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-xs opacity-75">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

// Helper Components
function MetricBar({ label, value, max, unit, color }: {
  label: string
  value: number
  max: number
  unit: string
  color: string
}) {
  const percentage = (value / max) * 100
  const colorClass = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    red: 'bg-red-500'
  }[color] || 'bg-gray-500'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}{unit}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full ${colorClass}`}
        />
      </div>
    </div>
  )
}

function Metric({ label, value, trend }: {
  label: string
  value: string
  trend?: 'up' | 'down' | 'good' | 'bad'
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center space-x-1">
        <span className="text-white font-medium">{value}</span>
        {trend && (
          <span className={`text-xs ${
            trend === 'good' ? 'text-green-400' :
            trend === 'bad' ? 'text-red-400' :
            trend === 'up' ? 'text-blue-400' :
            'text-yellow-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'good' ? '✓' : '✗'}
          </span>
        )}
      </div>
    </div>
  )
}