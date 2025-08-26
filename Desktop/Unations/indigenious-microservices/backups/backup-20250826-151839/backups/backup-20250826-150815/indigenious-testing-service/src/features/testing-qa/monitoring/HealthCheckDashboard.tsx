// Health Check Dashboard Component
// Real-time system health monitoring and alerts

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, AlertCircle, CheckCircle, Clock, Database,
  Globe, Server, Shield, Zap, TrendingUp, TrendingDown,
  RefreshCw, Bell, BellOff, Settings, Calendar, BarChart3,
  Wifi, WifiOff, AlertTriangle, Info, ChevronRight, Play,
  Pause, Download, Gauge
} from 'lucide-react'
import { HealthCheck, HealthCheckResult, TestMetrics, TestRun } from '../types/testing.types'
import { useHealthCheck } from '../hooks/useHealthCheck'

interface HealthCheckDashboardProps {
  onConfigureAlerts?: () => void
  onViewDetails?: (check: HealthCheck) => void
  autoRefresh?: boolean
  refreshInterval?: number
}

export function HealthCheckDashboard({
  onConfigureAlerts,
  onViewDetails,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: HealthCheckDashboardProps) {
  const { healthChecks, metrics, isLoading, refresh } = useHealthCheck()
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h')
  const [isPaused, setIsPaused] = useState(false)
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || isPaused) return

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, isPaused, refreshInterval, refresh])

  // Calculate overall system health
  const overallHealth = () => {
    const checks = healthChecks || []
    const healthy = checks.filter(c => c.lastCheck?.status === 'healthy').length
    const total = checks.length

    if (total === 0) return { status: 'unknown', percentage: 0 }
    
    const percentage = (healthy / total) * 100
    
    if (percentage === 100) return { status: 'healthy', percentage, color: 'emerald' }
    if (percentage >= 90) return { status: 'degraded', percentage, color: 'amber' }
    return { status: 'unhealthy', percentage, color: 'red' }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle, color: 'emerald' }
      case 'degraded':
        return { icon: AlertTriangle, color: 'amber' }
      case 'unhealthy':
        return { icon: AlertCircle, color: 'red' }
      default:
        return { icon: Info, color: 'gray' }
    }
  }

  // Get check type icon
  const getCheckTypeIcon = (type: string) => {
    const iconMap = {
      http: Globe,
      database: Database,
      service: Server,
      job: Clock,
      integration: Zap
    }
    return iconMap[type as keyof typeof iconMap] || Activity
  }

  // Format uptime percentage
  const calculateUptime = (history: HealthCheckResult[]) => {
    if (!history || history.length === 0) return 100
    
    const healthy = history.filter(h => h.status === 'healthy').length
    return ((healthy / history.length) * 100).toFixed(2)
  }

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const health = overallHealth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 bg-${health.color}-500/20 rounded-xl`}>
            <Activity className={`w-8 h-8 text-${health.color}-400`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">System Health</h2>
            <p className="text-white/70">
              Real-time monitoring and health checks
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Refresh Controls */}
          <div className="flex items-center space-x-2 bg-white/10 border border-white/20 
            rounded-lg p-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-white/60" />
              ) : (
                <Pause className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${
                isLoading ? 'animate-spin' : ''
              }`} />
            </button>
          </div>

          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="1h" className="bg-gray-800">Last Hour</option>
            <option value="24h" className="bg-gray-800">Last 24 Hours</option>
            <option value="7d" className="bg-gray-800">Last 7 Days</option>
          </select>

          <button
            onClick={onConfigureAlerts}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
              border border-purple-400/50 rounded-lg text-purple-200 
              transition-colors flex items-center space-x-2"
          >
            <Bell className="w-4 h-4" />
            <span>Configure Alerts</span>
          </button>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className={`bg-gradient-to-r from-${health.color}-500/20 to-${health.color}-600/20 
        backdrop-blur-md border border-${health.color}-400/30 rounded-xl p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              System Status: <span className={`text-${health.color}-300 capitalize`}>
                {health.status}
              </span>
            </h3>
            <p className="text-white/70">
              {healthChecks?.length || 0} services monitored • 
              {healthChecks?.filter(c => c.lastCheck?.status === 'healthy').length || 0} healthy
            </p>
          </div>

          <div className="flex items-center space-x-6">
            {/* Health Percentage */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke={`rgba(${health.color === 'emerald' ? '16, 185, 129' : 
                             health.color === 'amber' ? '245, 158, 11' : 
                             '239, 68, 68'}, 0.8)`}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${health.percentage * 2.26} 226`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold text-${health.color}-300`}>
                    {Math.round(health.percentage)}%
                  </span>
                </div>
              </div>
              <p className="text-white/60 text-sm mt-2">Health Score</p>
            </div>

            {/* Key Metrics */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Gauge className="w-5 h-5 text-white/60" />
                <span className="text-white">
                  Avg Response: {formatResponseTime(
                    healthChecks?.reduce((sum, c) => 
                      sum + (c.lastCheck?.responseTime || 0), 0
                    ) / (healthChecks?.length || 1) || 0
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-white">
                  {metrics?.passRate.toFixed(1)}% Test Pass Rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthChecks?.map(check => {
          const StatusIcon = getStatusIcon(check.lastCheck?.status || 'unknown')
          const TypeIcon = getCheckTypeIcon(check.type)
          const uptime = calculateUptime(check.history)
          const isExpanded = expandedCheck === check.id
          
          return (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white/10 backdrop-blur-md border rounded-xl p-4 
                hover:bg-white/15 transition-all cursor-pointer ${
                  check.lastCheck?.status === 'unhealthy' 
                    ? 'border-red-400/30' 
                    : 'border-white/20'
                }`}
              onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <TypeIcon className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{check.name}</h4>
                    <p className="text-white/60 text-sm">{check.target}</p>
                  </div>
                </div>
                
                <StatusIcon.icon className={`w-5 h-5 text-${StatusIcon.color}-400`} />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-white/60 text-xs">Response Time</p>
                  <p className="text-white font-medium">
                    {formatResponseTime(check.lastCheck?.responseTime || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Uptime</p>
                  <p className="text-white font-medium">{uptime}%</p>
                </div>
              </div>

              {/* Status Bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${
                    check.lastCheck?.status === 'healthy' 
                      ? 'bg-emerald-400' 
                      : check.lastCheck?.status === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${uptime}%` }}
                />
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-white/10"
                  >
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Last Check</span>
                        <span className="text-white">
                          {new Date(check.lastCheck?.timestamp || '').toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Check Interval</span>
                        <span className="text-white">{check.interval}s</span>
                      </div>
                      {check.lastCheck?.message && (
                        <div className="mt-2 p-2 bg-white/5 rounded text-white/80 text-xs">
                          {check.lastCheck.message}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails?.(check)
                      }}
                      className="mt-3 w-full px-3 py-1 bg-white/10 hover:bg-white/20 
                        border border-white/20 rounded text-white/80 text-sm 
                        transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>View History</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Test Metrics Summary */}
      {metrics && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Test Execution Metrics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{metrics.totalTests}</p>
              <p className="text-white/60 text-sm">Total Tests</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-300">{metrics.passedTests}</p>
              <p className="text-white/60 text-sm">Passed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-300">{metrics.failedTests}</p>
              <p className="text-white/60 text-sm">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">
                {metrics.passRate.toFixed(1)}%
              </p>
              <p className="text-white/60 text-sm">Pass Rate</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm">
                  Avg Duration: {(metrics.avgDuration / 1000).toFixed(2)}s
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm">
                  Reliability: {metrics.reliability.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Incidents */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Incidents</h3>
          <span className="text-white/60 text-sm">Last 24 hours</span>
        </div>
        
        <div className="space-y-3">
          {/* Mock incidents - would come from real data */}
          <div className="flex items-center justify-between p-3 bg-red-500/10 
            border border-red-400/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white font-medium">Payment API Timeout</p>
                <p className="text-white/60 text-sm">2 hours ago • 5 min downtime</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
              Resolved
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-amber-500/10 
            border border-amber-400/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white font-medium">High Database Load</p>
                <p className="text-white/60 text-sm">4 hours ago • Performance degradation</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">
              Monitoring
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}