// Security Metrics Component
// Visual representation of security KPIs and risk indicators

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Activity, Clock, Users, Database, Network, Key, Eye
} from 'lucide-react'

interface SecurityMetricsProps {
  metrics: {
    totalPolicies: number
    activePolicies: number
    openIncidents: number
    criticalIncidents: number
    unacknowledgedAlerts: number
    criticalAlerts: number
    avgComplianceScore: number
    riskScore: number
  }
  riskScore: number
  timeRange: '1h' | '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void
}

export function SecurityMetrics({ 
  metrics, 
  riskScore, 
  timeRange, 
  onTimeRangeChange 
}: SecurityMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  // Risk level calculation
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { level: 'critical', color: 'red', trend: 'up' }
    if (score >= 60) return { level: 'high', color: 'orange', trend: 'up' }
    if (score >= 40) return { level: 'medium', color: 'yellow', trend: 'stable' }
    if (score >= 20) return { level: 'low', color: 'blue', trend: 'down' }
    return { level: 'minimal', color: 'emerald', trend: 'down' }
  }

  const riskLevel = getRiskLevel(riskScore)

  // Security metrics cards
  const metricCards = [
    {
      id: 'risk-score',
      title: 'Risk Score',
      value: riskScore,
      unit: '/100',
      icon: Shield,
      color: riskLevel.color,
      trend: riskLevel.trend,
      description: `Overall security risk level: ${riskLevel.level}`,
      details: 'Calculated from active threats, vulnerabilities, and compliance gaps'
    },
    {
      id: 'compliance',
      title: 'Compliance Score',
      value: Math.round(metrics.avgComplianceScore),
      unit: '%',
      icon: CheckCircle,
      color: metrics.avgComplianceScore >= 90 ? 'emerald' : 
             metrics.avgComplianceScore >= 70 ? 'yellow' : 'red',
      trend: 'up',
      description: 'Average compliance across all frameworks',
      details: 'FedRAMP, PIPEDA, and Indigenous data sovereignty compliance'
    },
    {
      id: 'incidents',
      title: 'Open Incidents',
      value: metrics.openIncidents,
      unit: '',
      icon: AlertTriangle,
      color: metrics.criticalIncidents > 0 ? 'red' : 
             metrics.openIncidents > 5 ? 'orange' : 'emerald',
      trend: metrics.openIncidents > 10 ? 'up' : 'down',
      description: `${metrics.criticalIncidents} critical incidents`,
      details: 'Security incidents requiring investigation or response'
    },
    {
      id: 'alerts',
      title: 'Active Alerts',
      value: metrics.unacknowledgedAlerts,
      unit: '',
      icon: Eye,
      color: metrics.criticalAlerts > 0 ? 'red' : 
             metrics.unacknowledgedAlerts > 10 ? 'orange' : 'emerald',
      trend: metrics.unacknowledgedAlerts > 20 ? 'up' : 'stable',
      description: `${metrics.criticalAlerts} critical alerts`,
      details: 'Unacknowledged security alerts requiring attention'
    },
    {
      id: 'policies',
      title: 'Active Policies',
      value: metrics.activePolicies,
      unit: `/${metrics.totalPolicies}`,
      icon: Database,
      color: metrics.activePolicies === metrics.totalPolicies ? 'emerald' : 'yellow',
      trend: 'stable',
      description: 'Security policies currently enforced',
      details: 'Includes Indigenous data sovereignty and federal compliance policies'
    },
    {
      id: 'monitoring',
      title: 'System Health',
      value: 99.2,
      unit: '%',
      icon: Activity,
      color: 'emerald',
      trend: 'stable',
      description: 'Security monitoring uptime',
      details: '24/7 threat detection and incident response capabilities'
    }
  ]

  // Time range options
  const timeRangeOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ]

  // Simulated trend data
  const getTrendData = (metricId: string) => {
    const baseData = Array.from({ length: 24 }, (_, i) => ({
      time: i,
      value: Math.random() * 100
    }))
    
    return baseData
  }

  // Risk score visualization
  const RiskMeter = () => {
    const circumference = 2 * Math.PI * 45
    const strokeDasharray = `${(riskScore / 100) * circumference} ${circumference}`
    
    return (
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke={`rgb(var(--color-${riskLevel.color}-400))`}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 283' }}
            animate={{ strokeDasharray }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{riskScore}</div>
            <div className="text-xs text-white/60">Risk</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Security Metrics</h2>
        
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value as unknown)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeRange === option.value
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Score Highlight */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Overall Security Posture</h3>
            <p className="text-white/60 mb-4">
              Comprehensive risk assessment based on threats, vulnerabilities, and compliance
            </p>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 bg-${riskLevel.color}-500/20 border border-${riskLevel.color}-400/30 
                rounded-lg text-${riskLevel.color}-200 text-sm font-medium capitalize`}>
                {riskLevel.level} Risk
              </div>
              <div className="flex items-center space-x-1 text-white/60 text-sm">
                {riskLevel.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
                {riskLevel.trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                {riskLevel.trend === 'stable' && <Activity className="w-4 h-4 text-blue-400" />}
                <span>Trend: {riskLevel.trend}</span>
              </div>
            </div>
          </div>
          <RiskMeter />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
              cursor-pointer transition-all duration-200 hover:bg-white/15 ${
              selectedMetric === metric.id ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-${metric.color}-500/20`}>
                <metric.icon className={`w-5 h-5 text-${metric.color}-400`} />
              </div>
              <div className="flex items-center space-x-1">
                {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
                {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                {metric.trend === 'stable' && <Activity className="w-4 h-4 text-blue-400" />}
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                <span className="text-white/60 text-sm">{metric.unit}</span>
              </div>
              <h3 className="text-white/80 font-medium">{metric.title}</h3>
            </div>

            <p className="text-white/60 text-sm">{metric.description}</p>

            {/* Expanded Details */}
            {selectedMetric === metric.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-white/10"
              >
                <p className="text-white/50 text-xs mb-3">{metric.details}</p>
                
                {/* Mini trend chart */}
                <div className="h-16 bg-white/5 rounded p-2">
                  <div className="flex items-end space-x-1 h-full">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 bg-${metric.color}-400/60 rounded-sm`}
                        style={{ 
                          height: `${Math.random() * 80 + 20}%`,
                          minHeight: '20%'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Security Performance Indicators */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Performance Indicators</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">99.9%</div>
            <div className="text-sm text-white/60">Security Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">&lt; 15min</div>
            <div className="text-sm text-white/60">Mean Detection Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">&lt; 1hr</div>
            <div className="text-sm text-white/60">Mean Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">2.1%</div>
            <div className="text-sm text-white/60">False Positive Rate</div>
          </div>
        </div>
      </div>

      {/* Indigenous Data Sovereignty Metrics */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-200 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Indigenous Data Sovereignty Compliance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">100%</div>
            <div className="text-sm text-purple-100/80">Community Consent</div>
            <div className="text-xs text-purple-100/60 mt-1">All data access approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">24</div>
            <div className="text-sm text-purple-100/80">Participating Nations</div>
            <div className="text-xs text-purple-100/60 mt-1">Active data agreements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">0</div>
            <div className="text-sm text-purple-100/80">Protocol Violations</div>
            <div className="text-xs text-purple-100/60 mt-1">Cultural protocols respected</div>
          </div>
        </div>
      </div>
    </div>
  )
}