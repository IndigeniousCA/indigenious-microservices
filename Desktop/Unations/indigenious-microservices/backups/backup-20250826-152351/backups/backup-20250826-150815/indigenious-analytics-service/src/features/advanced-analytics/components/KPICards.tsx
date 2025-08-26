// KPI Cards Component
// Key Performance Indicator display cards

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Target, DollarSign, Users, Briefcase, Award, MapPin,
  Clock, Zap, Activity, BarChart3, Info
} from 'lucide-react'
import { AnalyticsMetric } from '../types/analytics.types'

interface KPICardsProps {
  metrics: AnalyticsMetric[]
  onCardClick?: (metric: AnalyticsMetric) => void
  layout?: 'grid' | 'row'
  showTrends?: boolean
  showTargets?: boolean
}

export function KPICards({
  metrics,
  onCardClick,
  layout = 'grid',
  showTrends = true,
  showTargets = true
}: KPICardsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Get icon for metric type
  const getMetricIcon = (metricId: string) => {
    const iconMap: Record<string, any> = {
      'total-procurement': DollarSign,
      'indigenous-spend': Award,
      'compliance-rate': Target,
      'active-suppliers': Briefcase,
      'jobs-created': Users,
      'communities-impacted': MapPin,
      'win-rate': TrendingUp,
      'contract-value': DollarSign,
      'response-time': Clock,
      'performance-score': Activity
    }
    return iconMap[metricId] || BarChart3
  }

  // Get metric color based on performance
  const getMetricColor = (metric: AnalyticsMetric) => {
    if (metric.target) {
      if (metric.value >= metric.target) return 'emerald'
      if (metric.value >= metric.target * 0.8) return 'amber'
      return 'red'
    }
    
    if (metric.trend) {
      if (metric.trend === 'up') return 'emerald'
      if (metric.trend === 'down') return 'red'
      return 'blue'
    }
    
    return 'purple'
  }

  // Format value based on unit
  const formatValue = (value: number, unit?: string) => {
    switch (unit) {
      case 'currency':
        if (value >= 1000000000) {
          return `$${(value / 1000000000).toFixed(1)}B`
        } else if (value >= 1000000) {
          return `$${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
          return `$${(value / 1000).toFixed(1)}K`
        }
        return `$${value.toLocaleString()}`
      
      case 'percentage':
        return `${value.toFixed(1)}%`
      
      case 'days':
        return `${value} ${value === 1 ? 'day' : 'days'}`
      
      default:
        return value.toLocaleString()
    }
  }

  // Calculate change percentage
  const calculateChangePercent = (current: number, previous?: number) => {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const containerClasses = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'flex space-x-4 overflow-x-auto pb-2'

  return (
    <div className={containerClasses}>
      {metrics.map((metric, index) => {
        const Icon = getMetricIcon(metric.id)
        const color = getMetricColor(metric)
        const changePercent = metric.changePercent || 
          calculateChangePercent(metric.value, metric.previousValue)
        const isPositiveChange = changePercent > 0
        const isTargetMet = metric.target ? metric.value >= metric.target : false
        
        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 
              backdrop-blur-md border border-${color}-400/30 rounded-xl p-6 
              hover:from-${color}-500/30 hover:to-${color}-600/30 
              transition-all cursor-pointer ${layout === 'row' ? 'min-w-[280px]' : ''}`}
            onMouseEnter={() => setHoveredCard(metric.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onCardClick?.(metric)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-${color}-500/20 rounded-xl`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
              </div>
              
              {showTrends && changePercent !== 0 && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${
                  isPositiveChange 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {isPositiveChange ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>{Math.abs(changePercent).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Metric Name */}
            <p className="text-white/70 text-sm mb-2">{metric.name}</p>

            {/* Value */}
            <div className="flex items-baseline space-x-2 mb-3">
              <p className={`text-3xl font-bold text-${color}-300`}>
                {formatValue(metric.value, metric.unit)}
              </p>
              
              {metric.previousValue && showTrends && (
                <p className="text-white/60 text-sm">
                  from {formatValue(metric.previousValue, metric.unit)}
                </p>
              )}
            </div>

            {/* Target Progress */}
            {showTargets && metric.target && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/60">Target</span>
                  <span className={`font-medium ${
                    isTargetMet ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {formatValue(metric.target, metric.unit)}
                  </span>
                </div>
                
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full transition-all ${
                      isTargetMet 
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                        : 'bg-gradient-to-r from-amber-400 to-amber-600'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.min((metric.value / metric.target) * 100, 100)}%` 
                    }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
                
                {isTargetMet && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 text-xs">Target achieved</span>
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            {metric.status && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  metric.status === 'on-track' ? 'bg-emerald-400' :
                  metric.status === 'at-risk' ? 'bg-amber-400' : 
                  'bg-red-400'
                }`} />
                <span className={`text-sm capitalize ${
                  metric.status === 'on-track' ? 'text-emerald-300' :
                  metric.status === 'at-risk' ? 'text-amber-300' : 
                  'text-red-300'
                }`}>
                  {metric.status.replace('-', ' ')}
                </span>
              </div>
            )}

            {/* Hover Information */}
            {hoveredCard === metric.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm 
                  rounded-xl p-4 flex flex-col justify-center border 
                  border-white/20"
              >
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium mb-2">Quick Stats</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Current:</span>
                        <span className="text-white">
                          {formatValue(metric.value, metric.unit)}
                        </span>
                      </div>
                      
                      {metric.previousValue && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Previous:</span>
                          <span className="text-white">
                            {formatValue(metric.previousValue, metric.unit)}
                          </span>
                        </div>
                      )}
                      
                      {metric.target && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Target:</span>
                          <span className="text-white">
                            {formatValue(metric.target, metric.unit)}
                          </span>
                        </div>
                      )}
                      
                      {changePercent !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Change:</span>
                          <span className={isPositiveChange ? 'text-emerald-300' : 'text-red-300'}>
                            {isPositiveChange ? '+' : ''}{changePercent.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-blue-300 text-xs mt-3">
                      Click for detailed analysis
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}