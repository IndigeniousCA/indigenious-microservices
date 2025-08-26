'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, TrendingUp, AlertTriangle, CheckCircle,
  Users, DollarSign, Calendar, BarChart3, PieChart,
  ArrowUp, ArrowDown, ChevronRight, Download, Bell,
  Lightbulb, Shield, Award, MapPin, Filter, Search,
  Brain, Sparkles, AlertCircle, Info, Clock, Zap
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { C5ComplianceService } from '../services/C5ComplianceService'
import type {
  C5ComplianceData,
  ComplianceMetrics,
  SupplierDiversity,
  ComplianceAlert,
  CategoryBreakdown
} from '../types'
import { useUser } from '@/contexts/user-context'
import { toast } from 'sonner'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface C5ComplianceDashboardProps {
  organizationId?: string;
  fiscalYear?: number;
  onExport?: (data: unknown) => void;
}

export function C5ComplianceDashboard({
  organizationId,
  fiscalYear = new Date().getFullYear(),
  onExport
}: C5ComplianceDashboardProps) {
  const { user } = useUser()
  const [complianceService] = useState(() => new C5ComplianceService())
  
  // State
  const [dashboardData, setDashboardData] = useState<C5ComplianceData | null>(null)
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [diversity, setDiversity] = useState<SupplierDiversity | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showProjections, setShowProjections] = useState(true)
  const [showOpportunities, setShowOpportunities] = useState(true)
  
  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!organizationId && !user?.businessId) return
      
      setIsLoading(true)
      try {
        const orgId = organizationId || user?.businessId || 'default'
        
        // Load all data in parallel
        const [dashboard, metricsData, diversityData, alertsData] = await Promise.all([
          complianceService.getComplianceDashboard(orgId, fiscalYear),
          complianceService.getComplianceMetrics(orgId),
          complianceService.getSupplierDiversity(orgId),
          complianceService.generateComplianceAlerts(orgId)
        ])
        
        setDashboardData(dashboard)
        setMetrics(metricsData)
        setDiversity(diversityData)
        setAlerts(alertsData)
      } catch (error) {
        logger.error('Error loading compliance data:', error)
        toast.error('Failed to load compliance data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [organizationId, fiscalYear, user, complianceService])
  
  // Loading state
  if (isLoading || !dashboardData || !metrics || !diversity) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-blue-400/20 animate-pulse" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-blue-400 animate-spin" />
            <Shield className="w-10 h-10 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white/80">Loading compliance data...</p>
        </div>
      </div>
    )
  }
  
  // Render compliance status badge
  const renderComplianceStatus = () => {
    const { status, compliancePercentage, targetPercentage } = dashboardData
    
    const statusConfig = {
      'compliant': { color: 'green', icon: CheckCircle, text: 'Compliant' },
      'exceeding': { color: 'blue', icon: Award, text: 'Exceeding Target' },
      'at-risk': { color: 'amber', icon: AlertTriangle, text: 'At Risk' },
      'non-compliant': { color: 'red', icon: AlertCircle, text: 'Non-Compliant' }
    }
    
    const config = statusConfig[status]
    const Icon = config.icon
    
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl bg-${config.color}-500/10 border border-${config.color}-400/30`}>
        <Icon className={`w-8 h-8 text-${config.color}-400`} />
        <div>
          <p className={`text-lg font-semibold text-${config.color}-300`}>{config.text}</p>
          <p className="text-sm text-white/60">
            {compliancePercentage.toFixed(1)}% / {targetPercentage}% target
          </p>
        </div>
      </div>
    )
  }
  
  // Render key metrics
  const renderKeyMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Target className="w-8 h-8 text-blue-400" />
          <span className={`text-sm font-medium ${
            metrics.currentCompliance >= 5 ? 'text-green-400' : 'text-amber-400'
          }`}>
            {metrics.currentCompliance >= 5 ? 'On Target' : 'Below Target'}
          </span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {metrics.currentCompliance.toFixed(1)}%
        </p>
        <p className="text-sm text-white/60">Current Compliance</p>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Target</span>
            <span className="text-white/70">{metrics.targetCompliance}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                metrics.currentCompliance >= 5 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${(metrics.currentCompliance / metrics.targetCompliance) * 100}%` }}
            />
          </div>
        </div>
      </GlassPanel>
      
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <DollarSign className="w-8 h-8 text-green-400" />
          <div className="flex items-center gap-1 text-sm">
            {metrics.yoyGrowth > 0 ? (
              <>
                <ArrowUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400">+{metrics.yoyGrowth.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 text-red-400" />
                <span className="text-red-400">{metrics.yoyGrowth.toFixed(1)}%</span>
              </>
            )}
          </div>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          ${(dashboardData.indigenousProcurement / 1000000).toFixed(1)}M
        </p>
        <p className="text-sm text-white/60">Indigenous Spend</p>
        <p className="text-xs text-white/40 mt-2">
          of ${(dashboardData.totalProcurement / 1000000).toFixed(1)}M total
        </p>
      </GlassPanel>
      
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Users className="w-8 h-8 text-purple-400" />
          <span className="text-sm text-purple-400">
            {((diversity.indigenousSuppliers / diversity.totalSuppliers) * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {diversity.indigenousSuppliers}
        </p>
        <p className="text-sm text-white/60">Indigenous Suppliers</p>
        <p className="text-xs text-white/40 mt-2">
          +{diversity.newIndigenousSuppliers} new this quarter
        </p>
      </GlassPanel>
      
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Brain className="w-8 h-8 text-blue-400" />
          <span className="text-sm text-blue-400">AI Projection</span>
        </div>
        <p className="text-3xl font-bold text-white mb-1">
          {metrics.projectedYearEnd.toFixed(1)}%
        </p>
        <p className="text-sm text-white/60">Year-End Forecast</p>
        <p className={`text-xs mt-2 ${
          metrics.projectedYearEnd >= 5 ? 'text-green-400' : 'text-amber-400'
        }`}>
          {metrics.projectedYearEnd >= 5 
            ? 'On track to meet target'
            : `${(5 - metrics.projectedYearEnd).toFixed(1)}% short of target`}
        </p>
      </GlassPanel>
    </div>
  )
  
  // Render compliance timeline chart
  const renderTimelineChart = () => {
    const chartData = {
      labels: dashboardData.timeline.map(t => 
        new Date(t.date).toLocaleDateString('en-US', { month: 'short' })
      ),
      datasets: [
        {
          label: 'Compliance %',
          data: dashboardData.timeline.map(t => t.percentage),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Target',
          data: dashboardData.timeline.map(() => dashboardData.targetPercentage),
          borderColor: 'rgb(34, 197, 94)',
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    }
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { color: 'rgba(255, 255, 255, 0.8)' }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          callbacks: {
            label: (context: unknown) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              if (label === 'Compliance %') {
                const point = dashboardData.timeline[context.dataIndex]
                return [
                  `${label}: ${value.toFixed(1)}%`,
                  `Spend: $${(point.indigenousSpend / 1000000).toFixed(1)}M`
                ]
              }
              return `${label}: ${value.toFixed(1)}%`
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          ticks: { 
            color: 'rgba(255, 255, 255, 0.6)',
            callback: (value: unknown) => `${value}%`
          },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
    
    return (
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Compliance Timeline
          </h3>
          {showProjections && dashboardData.projections.length > 0 && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowProjections(!showProjections)}
            >
              {showProjections ? 'Hide' : 'Show'} Projections
            </GlassButton>
          )}
        </div>
        
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
        
        {/* AI Projections */}
        {showProjections && dashboardData.projections.length > 0 && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-400/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-blue-300">AI Projections</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dashboardData.projections.slice(0, 3).map((proj, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/70">{proj.month}</span>
                    <span className={`font-medium ${
                      proj.projectedPercentage >= 5 ? 'text-green-400' : 'text-amber-400'
                    }`}>
                      {proj.projectedPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-white/50 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {proj.confidenceLevel} confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    )
  }
  
  // Render category breakdown
  const renderCategoryBreakdown = () => {
    const filteredCategories = selectedCategory === 'all'
      ? dashboardData.categories
      : dashboardData.categories.filter(c => c.category === selectedCategory)
    
    return (
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            Category Analysis
          </h3>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-sm text-white"
          >
            <option value="all">All Categories</option>
            {dashboardData.categories.map(cat => (
              <option key={cat.category} value={cat.category}>
                {cat.category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{category.category}</p>
                  <p className="text-xs text-white/60">
                    {category.indigenousSupplierCount} of {category.supplierCount} suppliers
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${
                    category.percentage >= 5 ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    {category.percentage.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    {category.trend === 'increasing' ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : category.trend === 'decreasing' ? (
                      <ArrowDown className="w-3 h-3 text-red-400" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-white/40" />
                    )}
                    <span className={
                      category.trend === 'increasing' ? 'text-green-400' :
                      category.trend === 'decreasing' ? 'text-red-400' :
                      'text-white/40'
                    }>
                      {category.trend}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    category.percentage >= 5
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(category.percentage * 20, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">
                  ${(category.indigenousSpend / 1000000).toFixed(1)}M of ${(category.totalSpend / 1000000).toFixed(1)}M
                </span>
                {category.opportunities > 0 && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {category.opportunities} opportunities
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    )
  }
  
  // Render alerts
  const renderAlerts = () => {
    if (alerts.length === 0) return null
    
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          Compliance Alerts
        </h3>
        
        {alerts.slice(0, 3).map((alert) => {
          const icons = {
            warning: AlertTriangle,
            opportunity: Lightbulb,
            achievement: Award,
            deadline: Clock
          }
          const colors = {
            warning: 'amber',
            opportunity: 'green',
            achievement: 'blue',
            deadline: 'red'
          }
          
          const Icon = icons[alert.type]
          const color = colors[alert.type]
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <GlassPanel className={`p-4 border-l-4 border-${color}-400`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 text-${color}-400 mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{alert.title}</p>
                    <p className="text-sm text-white/60 mt-1">{alert.message}</p>
                    {alert.actionRequired && (
                      <p className="text-sm text-white/80 mt-2">
                        <strong>Action:</strong> {alert.actionRequired}
                      </p>
                    )}
                    {alert.potentialImpact && (
                      <p className="text-xs text-white/50 mt-1">
                        Impact: ${(alert.potentialImpact / 1000).toFixed(0)}K
                      </p>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )
        })}
        
        {alerts.length > 3 && (
          <GlassButton variant="secondary" size="sm" className="w-full">
            View All {alerts.length} Alerts
          </GlassButton>
        )}
      </div>
    )
  }
  
  // Render opportunities
  const renderOpportunities = () => {
    if (!showOpportunities || dashboardData.opportunities.length === 0) return null
    
    const quickWins = dashboardData.opportunities.filter(o => o.quickWin)
    const otherOpps = dashboardData.opportunities.filter(o => !o.quickWin)
    
    return (
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Compliance Opportunities
          </h3>
          <span className="text-sm text-white/60">
            ${(dashboardData.opportunities.reduce((sum, o) => sum + o.potentialValue, 0) / 1000000).toFixed(1)}M potential
          </span>
        </div>
        
        {quickWins.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-yellow-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quick Wins
            </p>
            <div className="space-y-3">
              {quickWins.map((opp) => (
                <div key={opp.id} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-400/20">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-medium">{opp.title}</p>
                    <span className="text-sm text-yellow-400">
                      ${(opp.potentialValue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{opp.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">
                      {opp.indigenousSuppliers} suppliers available
                    </span>
                    <GlassButton variant="primary" size="xs">
                      Take Action
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {otherOpps.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-300 mb-3">
              Strategic Opportunities
            </p>
            <div className="space-y-3">
              {otherOpps.slice(0, 2).map((opp) => (
                <div key={opp.id} className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-medium">{opp.title}</p>
                  <p className="text-sm text-white/60 mt-1">{opp.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/50">
                      {opp.implementationSteps.length} steps
                    </span>
                    <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            C-5 Compliance Dashboard
          </h2>
          <p className="text-white/60">
            Track your organization's Indigenous procurement compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {renderComplianceStatus()}
          <GlassButton
            variant="secondary"
            onClick={() => {
              complianceService.generateComplianceReport(
                organizationId || user?.businessId || 'default',
                'monthly'
              ).then(report => {
                toast.success('Report generated')
                onExport?.(report)
              })
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
        </div>
      </div>
      
      {/* Key Metrics */}
      {renderKeyMetrics()}
      
      {/* Timeline Chart */}
      {renderTimelineChart()}
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2">
          {renderCategoryBreakdown()}
        </div>
        
        {/* Alerts */}
        <div className="space-y-6">
          {renderAlerts()}
        </div>
      </div>
      
      {/* Opportunities */}
      {renderOpportunities()}
      
      {/* Gaps Analysis */}
      {dashboardData.gaps.length > 0 && (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Compliance Gaps
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.gaps.slice(0, 4).map((gap) => (
              <div key={gap.id} className="p-4 bg-red-500/10 rounded-lg border border-red-400/20">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-medium">{gap.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    gap.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                    gap.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {gap.severity}
                  </span>
                </div>
                <p className="text-sm text-white/60 mb-3">{gap.description}</p>
                {gap.recommendations.length > 0 && (
                  <div className="text-xs text-white/50">
                    {gap.recommendations.length} recommendations available
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}