// Performance Metrics Component
// Displays detailed performance metrics with trends and comparisons

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Minus, Info, Clock, 
  CheckCircle, DollarSign, MessageSquare, Shield, Users
} from 'lucide-react'
import type { VendorPerformance, PerformanceComparison } from '../types/performance.types'

interface PerformanceMetricsProps {
  performance: VendorPerformance
  comparison?: PerformanceComparison
  timeRange: 'all' | '12m' | '6m' | '3m'
}

export function PerformanceMetrics({ 
  performance, 
  comparison,
  timeRange 
}: PerformanceMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  const metrics = [
    {
      key: 'onTimeDelivery',
      label: 'On-Time Delivery',
      icon: Clock,
      color: 'blue',
      description: 'Percentage of projects completed on or before deadline'
    },
    {
      key: 'qualityOfWork',
      label: 'Quality of Work',
      icon: CheckCircle,
      color: 'emerald',
      description: 'Average quality rating from project reviews'
    },
    {
      key: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      color: 'purple',
      description: 'Responsiveness and clarity in project communications'
    },
    {
      key: 'budgetAdherence',
      label: 'Budget Adherence',
      icon: DollarSign,
      color: 'amber',
      description: 'Projects completed within agreed budget'
    },
    {
      key: 'safetyCompliance',
      label: 'Safety Compliance',
      icon: Shield,
      color: 'red',
      description: 'Safety record and compliance with regulations'
    },
    {
      key: 'indigenousEmployment',
      label: 'Indigenous Employment',
      icon: Users,
      color: 'indigo',
      description: 'Average percentage of Indigenous workforce'
    }
  ]

  const getMetricColor = (color: string, metric: any) => {
    const score = metric.score
    if (score >= 4.5) return `${color}-400`
    if (score >= 3.5) return `${color}-500`
    if (score >= 2.5) return 'amber-500'
    return 'red-500'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return <Minus className="w-4 h-4 text-blue-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metricDef) => {
          const metric = performance.metrics[metricDef.key as keyof typeof performance.metrics]
          const Icon = metricDef.icon
          const colorClass = getMetricColor(metricDef.color, metric)
          
          return (
            <motion.div
              key={metricDef.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMetric(metricDef.key)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                cursor-pointer transition-all duration-200 hover:bg-white/15"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${colorClass}/20 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${colorClass}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{metricDef.label}</h3>
                    <p className="text-xs text-white/60 mt-0.5">
                      {metric.dataPoints} projects assessed
                    </p>
                  </div>
                </div>
                {getTrendIcon(metric.trend)}
              </div>

              {/* Score Display */}
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold text-white">
                    {metric.score.toFixed(1)}
                  </span>
                  <span className="text-white/60">/5.0</span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(metric.score / 5) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={`h-full bg-${colorClass}`}
                  />
                </div>
              </div>

              {/* Percentile */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Industry Rank</span>
                <span className="text-white font-medium">
                  Top {100 - metric.percentile}%
                </span>
              </div>

              {/* Comparison if available */}
              {comparison && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Industry Avg</span>
                    <span className="text-white/60">
                      {comparison.industryAverage[metricDef.key as keyof typeof comparison.industryAverage].toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Detailed Metric View */}
      {selectedMetric && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {metrics.find(m => m.key === selectedMetric)?.label} Details
            </h3>
            <button
              onClick={() => setSelectedMetric(null)}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-white/60 mb-6">
            {metrics.find(m => m.key === selectedMetric)?.description}
          </p>

          {/* Trend Chart Placeholder */}
          <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center mb-6">
            <p className="text-white/40">Performance trend chart would go here</p>
          </div>

          {/* Breakdown by Project Type */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white mb-2">By Project Type</h4>
            {['Construction', 'IT Services', 'Consulting', 'Supply'].map(type => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${Math.random() * 40 + 60}%` }}
                    />
                  </div>
                  <span className="text-sm text-white font-medium">
                    {(Math.random() * 2 + 3).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Performance Summary */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Performance Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-3">Key Strengths</h4>
            <ul className="space-y-2">
              {Object.entries(performance.metrics)
                .filter(([_, metric]) => metric.score >= 4.0)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 3)
                .map(([key, metric]) => (
                  <li key={key} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-white">
                      {metrics.find(m => m.key === key)?.label}: {metric.score.toFixed(1)}/5.0
                    </span>
                  </li>
                ))
              }
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="text-sm font-medium text-amber-400 mb-3">Areas for Improvement</h4>
            <ul className="space-y-2">
              {Object.entries(performance.metrics)
                .filter(([_, metric]) => metric.score < 3.5)
                .sort((a, b) => a[1].score - b[1].score)
                .slice(0, 3)
                .map(([key, metric]) => (
                  <li key={key} className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-white">
                      {metrics.find(m => m.key === key)?.label}: {metric.score.toFixed(1)}/5.0
                    </span>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-white/80">
            <span className="font-medium text-white">Overall Assessment:</span> This vendor 
            demonstrates {performance.performanceTrend === 'improving' ? 'improving' : 
            performance.performanceTrend === 'stable' ? 'stable' : 'declining'} performance 
            across {performance.totalProjects} completed projects. With an overall rating of{' '}
            {performance.overallRating.toFixed(1)}/5.0, they rank in the top{' '}
            {100 - Math.round(Object.values(performance.metrics).reduce((sum, m) => sum + m.percentile, 0) / 6)}% 
            of vendors in their category.
          </p>
        </div>
      </div>

      {/* Industry Comparison */}
      {comparison && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Industry Comparison</h3>
          
          <div className="space-y-4">
            {metrics.map(metricDef => {
              const vendorScore = performance.metrics[metricDef.key as keyof typeof performance.metrics].score
              const industryAvg = comparison.industryAverage[metricDef.key as keyof typeof comparison.industryAverage]
              const topPerformer = comparison.topPerformers[metricDef.key as keyof typeof comparison.topPerformers]
              
              return (
                <div key={metricDef.key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{metricDef.label}</span>
                    <span className="text-sm text-white/60">
                      {vendorScore > industryAvg ? '+' : ''}{((vendorScore - industryAvg) / industryAvg * 100).toFixed(0)}% vs avg
                    </span>
                  </div>
                  
                  {/* Comparison bars */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/40 w-20">You</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${(vendorScore / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white font-medium w-10">
                        {vendorScore.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/40 w-20">Industry</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white/30"
                          style={{ width: `${(industryAvg / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/60 w-10">
                        {industryAvg.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/40 w-20">Top 10%</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500/50"
                          style={{ width: `${(topPerformer / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-emerald-400 w-10">
                        {topPerformer.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overall Ranking */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg text-center">
            <p className="text-sm text-white/60 mb-1">Overall Industry Ranking</p>
            <p className="text-2xl font-bold text-white">
              #{comparison.rank.overall} <span className="text-base font-normal text-white/60">
                of {comparison.rank.totalVendors}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}