// Compliance Reporting Component
// Track and report on Indigenous procurement targets and compliance

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Download, Calendar, Target, Users, Building, DollarSign, Award, BarChart3 } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'
import { GlassButton } from '../ui/GlassButton'
// Recharts imports would go here, but for now we'll use placeholder visualizations

interface ComplianceMetric {
  category: string
  target: number
  actual: number
  trend: number
  status: 'on-track' | 'at-risk' | 'behind'
  details: {
    totalContracts: number
    indigenousContracts: number
    totalValue: number
    indigenousValue: number
  }
}

interface ComplianceAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  date: string
  actionRequired: boolean
}

const complianceData: ComplianceMetric[] = [
  {
    category: 'Overall Procurement',
    target: 5,
    actual: 4.2,
    trend: 0.3,
    status: 'at-risk',
    details: {
      totalContracts: 1250,
      indigenousContracts: 53,
      totalValue: 125000000,
      indigenousValue: 5250000
    }
  },
  {
    category: 'Construction',
    target: 5,
    actual: 6.8,
    trend: 0.5,
    status: 'on-track',
    details: {
      totalContracts: 320,
      indigenousContracts: 22,
      totalValue: 45000000,
      indigenousValue: 3060000
    }
  },
  {
    category: 'Professional Services',
    target: 5,
    actual: 3.2,
    trend: -0.2,
    status: 'behind',
    details: {
      totalContracts: 480,
      indigenousContracts: 15,
      totalValue: 32000000,
      indigenousValue: 1024000
    }
  },
  {
    category: 'IT Services',
    target: 5,
    actual: 4.5,
    trend: 0.8,
    status: 'at-risk',
    details: {
      totalContracts: 200,
      indigenousContracts: 9,
      totalValue: 28000000,
      indigenousValue: 1260000
    }
  },
  {
    category: 'Supplies & Equipment',
    target: 5,
    actual: 2.8,
    trend: -0.5,
    status: 'behind',
    details: {
      totalContracts: 250,
      indigenousContracts: 7,
      totalValue: 20000000,
      indigenousValue: 560000
    }
  }
]

const alerts: ComplianceAlert[] = [
  {
    id: '1',
    severity: 'warning',
    message: 'Q4 procurement target at risk - currently at 4.2% vs 5% target',
    date: '2024-01-25',
    actionRequired: true
  },
  {
    id: '2',
    severity: 'info',
    message: 'New Indigenous suppliers added to directory: +12 this month',
    date: '2024-01-24',
    actionRequired: false
  },
  {
    id: '3',
    severity: 'critical',
    message: 'Professional Services category below 70% of target',
    date: '2024-01-23',
    actionRequired: true
  }
]

// Mock trend data for chart
const trendData = [
  { month: 'Jan', target: 5, actual: 3.8 },
  { month: 'Feb', target: 5, actual: 4.1 },
  { month: 'Mar', target: 5, actual: 4.0 },
  { month: 'Apr', target: 5, actual: 4.3 },
  { month: 'May', target: 5, actual: 4.2 },
  { month: 'Jun', target: 5, actual: 4.5 },
  { month: 'Jul', target: 5, actual: 4.3 },
  { month: 'Aug', target: 5, actual: 4.6 },
  { month: 'Sep', target: 5, actual: 4.4 },
  { month: 'Oct', target: 5, actual: 4.5 },
  { month: 'Nov', target: 5, actual: 4.3 },
  { month: 'Dec', target: 5, actual: 4.2 }
]

export function ComplianceReporting() {
  const [selectedPeriod, setSelectedPeriod] = useState('year')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-emerald-400'
      case 'at-risk': return 'text-amber-400'
      case 'behind': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track': return CheckCircle
      case 'at-risk': return AlertTriangle
      case 'behind': return AlertTriangle
      default: return FileText
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-400/50 text-red-300'
      case 'warning': return 'bg-amber-500/20 border-amber-400/50 text-amber-300'
      case 'info': return 'bg-blue-500/20 border-blue-400/50 text-blue-300'
      default: return 'bg-white/10 border-white/20 text-white/70'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(value)
  }

  const overallCompliance = complianceData.reduce((acc, metric) => 
    acc + metric.actual, 0) / complianceData.length

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Compliance Reporting</h2>
          <p className="text-white/70">
            Track progress towards 5% Indigenous procurement target
          </p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <GlassButton variant="primary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
        </div>
      </div>

      {/* Overall Compliance Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <GlassPanel className="p-6 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Overall Compliance</h3>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold text-white mb-1">
                {overallCompliance.toFixed(1)}%
              </div>
              <div className="text-white/60">of 5% target</div>
            </div>
            <div className="w-32 h-32">
              {/* Circular progress indicator */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallCompliance / 5)}`}
                  className={overallCompliance >= 5 ? 'text-emerald-400' : 
                           overallCompliance >= 4 ? 'text-amber-400' : 'text-red-400'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {Math.round((overallCompliance / 5) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-emerald-400">+12.5%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(5250000)}
          </div>
          <div className="text-white/60 text-sm">Indigenous Contract Value</div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Building className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-400">53 active</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            234
          </div>
          <div className="text-white/60 text-sm">Indigenous Suppliers</div>
        </GlassPanel>
      </div>

      {/* Compliance Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-lg border flex items-start justify-between ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm opacity-70 mt-1">
                      {new Date(alert.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {alert.actionRequired && (
                  <GlassButton size="sm" variant="secondary">
                    Take Action
                  </GlassButton>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Category Performance</h3>
        <div className="space-y-4">
          {complianceData.map((metric, index) => {
            const StatusIcon = getStatusIcon(metric.status)
            const percentOfTarget = (metric.actual / metric.target) * 100
            
            return (
              <motion.div
                key={metric.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => setSelectedCategory(
                  selectedCategory === metric.category ? null : metric.category
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${getStatusColor(metric.status)}`} />
                    <h4 className="font-medium text-white">{metric.category}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${metric.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {metric.trend > 0 ? '+' : ''}{metric.trend}%
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {metric.actual}%
                    </span>
                  </div>
                </div>

                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full transition-all ${
                      metric.status === 'on-track' ? 'bg-emerald-400' :
                      metric.status === 'at-risk' ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(percentOfTarget, 100)}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-white"
                    style={{ left: '100%' }}
                  />
                </div>

                {selectedCategory === metric.category && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-white/10"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Total Contracts</p>
                        <p className="text-white font-medium">{metric.details.totalContracts}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Indigenous Contracts</p>
                        <p className="text-white font-medium">{metric.details.indigenousContracts}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Total Value</p>
                        <p className="text-white font-medium">
                          {formatCurrency(metric.details.totalValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60">Indigenous Value</p>
                        <p className="text-white font-medium">
                          {formatCurrency(metric.details.indigenousValue)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Trend Chart */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Compliance Trend</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/50 rounded-full" />
              <span className="text-sm text-white/60">Target (5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <span className="text-sm text-white/60">Actual</span>
            </div>
          </div>
        </div>
        
        <div className="h-64">
          {/* Chart would be rendered here using recharts */}
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <BarChart3 className="w-16 h-16" />
          </div>
        </div>
      </GlassPanel>
    </GlassPanel>
  )
}