'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  BarChart3, PieChart, TrendingUp, DollarSign, Users, 
  Package, Building, MapPin, Clock, AlertCircle, Target,
  Download, Filter, Calendar
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import type { BOQ, BOQAnalytics } from '../types'
import { boqService } from '../services/BOQService'

interface BOQAnalyticsProps {
  boq: BOQ
  onExport?: (format: 'pdf' | 'excel') => void
}

interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
  }>
}

export function BOQAnalytics({ boq, onExport }: BOQAnalyticsProps) {
  const [analytics, setAnalytics] = useState<BOQAnalytics | null>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'cost' | 'indigenous' | 'revisions'>('cost')

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      try {
        const data = await boqService.generateAnalytics(boq)
        setAnalytics(data)
      } catch (error) {
        logger.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [boq])

  // Calculate Indigenous content metrics
  const indigenousMetrics = boqService.calculateIndigenousContent(boq)

  // Prepare chart data
  const costBreakdownData: ChartData = {
    labels: analytics?.costBreakdown.bySection.map(s => s.section) || [],
    datasets: [{
      label: 'Cost by Section',
      data: analytics?.costBreakdown.bySection.map(s => s.amount) || [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)',
        'rgba(139, 92, 246, 0.5)',
        'rgba(16, 185, 129, 0.5)',
        'rgba(245, 158, 11, 0.5)',
        'rgba(239, 68, 68, 0.5)',
        'rgba(236, 72, 153, 0.5)'
      ]
    }]
  }

  const indigenousBreakdownData: ChartData = {
    labels: indigenousMetrics.bySection.map(s => s.section),
    datasets: [{
      label: 'Indigenous Content %',
      data: indigenousMetrics.bySection.map(s => s.percentage),
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: 'rgba(16, 185, 129, 1)'
    }]
  }

  // Render metric card
  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trend?: { value: number; positive: boolean },
    subtitle?: string
  ) => (
    <GlassPanel className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-white/50 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${
          trend.positive ? 'text-green-400' : 'text-red-400'
        }`}>
          <TrendingUp className={`w-4 h-4 ${!trend.positive && 'rotate-180'}`} />
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-white/60">vs last revision</span>
        </div>
      )}
    </GlassPanel>
  )

  // Render section breakdown
  const renderSectionBreakdown = () => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Cost Breakdown by Section</h3>
        <GlassButton size="sm" variant="secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </GlassButton>
      </div>

      <div className="space-y-3">
        {analytics?.costBreakdown.bySection.map((section, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">{section.section}</span>
              <span className="text-sm font-semibold text-white">
                ${section.amount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${section.percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{section.percentage.toFixed(1)}% of total</span>
              {indigenousMetrics.bySection[index] && (
                <span className="text-green-400">
                  {indigenousMetrics.bySection[index].percentage.toFixed(1)}% Indigenous
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )

  // Render Indigenous content analysis
  const renderIndigenousAnalysis = () => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Indigenous Content Analysis</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Target:</span>
          <span className="text-sm font-semibold text-green-400">
            {boq.metadata.project.indigenousContentTarget}%
          </span>
        </div>
      </div>

      {/* Progress towards target */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/80">Overall Progress</span>
          <span className="text-lg font-semibold text-white">
            {indigenousMetrics.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="relative">
          <div className="w-full bg-white/10 rounded-full h-4">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${indigenousMetrics.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Target indicator */}
          <div
            className="absolute top-0 h-full w-0.5 bg-yellow-400"
            style={{ left: `${boq.metadata.project.indigenousContentTarget}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-yellow-400 whitespace-nowrap">
              Target
            </div>
          </div>
        </div>
      </div>

      {/* By section */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white/60 mb-2">By Section</p>
        {indigenousMetrics.bySection.map((section, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-sm text-white/80">{section.section}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/60">
                ${section.amount.toLocaleString()}
              </span>
              <span className={`text-sm font-semibold ${
                section.percentage >= boq.metadata.project.indigenousContentTarget!
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}>
                {section.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {indigenousMetrics.percentage < boq.metadata.project.indigenousContentTarget! && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400">
                Below Target
              </p>
              <p className="text-xs text-white/60 mt-1">
                Consider increasing Indigenous suppliers in sections with low percentages
                to meet your {boq.metadata.project.indigenousContentTarget}% target.
              </p>
            </div>
          </div>
        </div>
      )}
    </GlassPanel>
  )

  // Render revision metrics
  const renderRevisionMetrics = () => (
    <GlassPanel className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Revision History</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {analytics?.revisionMetrics.totalRevisions || 0}
          </p>
          <p className="text-sm text-white/60">Total Revisions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {analytics?.revisionMetrics.averageChangesPerRevision.toFixed(1) || 0}
          </p>
          <p className="text-sm text-white/60">Avg Changes/Revision</p>
        </div>
      </div>

      {/* Most changed items */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white/60 mb-2">Most Changed Items</p>
        {analytics?.revisionMetrics.mostChangedItems.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-sm text-white/80">Item {item.itemId.slice(0, 8)}...</span>
            <span className="text-sm text-white/60">{item.changeCount} changes</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  )

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">BOQ Analytics</h1>
            <p className="text-white/60 mt-1">
              Performance insights and metrics for {boq.projectName}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as unknown)}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
            
            {onExport && (
              <GlassButton variant="secondary" onClick={() => onExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </GlassButton>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          'Total Project Value',
          `$${boq.summary.totalAmount.toLocaleString()}`,
          <DollarSign className="w-6 h-6 text-blue-400" />,
          { value: 5.2, positive: true }
        )}
        
        {renderMetricCard(
          'Indigenous Content',
          `${indigenousMetrics.percentage.toFixed(1)}%`,
          <Target className="w-6 h-6 text-green-400" />,
          undefined,
          `Target: ${boq.metadata.project.indigenousContentTarget}%`
        )}
        
        {renderMetricCard(
          'Total Items',
          boq.summary.totalItems,
          <Package className="w-6 h-6 text-purple-400" />,
          { value: 12, positive: true }
        )}
        
        {renderMetricCard(
          'Active Collaborators',
          analytics.collaborationMetrics.activeUsers,
          <Users className="w-6 h-6 text-orange-400" />
        )}
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric selector */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 p-1 bg-white/10 rounded-lg w-fit">
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedMetric === 'cost' ? 'bg-white/20 text-white' : 'text-white/60'
              }`}
              onClick={() => setSelectedMetric('cost')}
            >
              Cost Analysis
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedMetric === 'indigenous' ? 'bg-white/20 text-white' : 'text-white/60'
              }`}
              onClick={() => setSelectedMetric('indigenous')}
            >
              Indigenous Content
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedMetric === 'revisions' ? 'bg-white/20 text-white' : 'text-white/60'
              }`}
              onClick={() => setSelectedMetric('revisions')}
            >
              Revision History
            </button>
          </div>
        </div>

        {/* Content based on selected metric */}
        {selectedMetric === 'cost' && (
          <>
            <div className="lg:col-span-2">
              {renderSectionBreakdown()}
            </div>
            <div>
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-white/60">Largest Section</p>
                    <p className="text-lg font-semibold text-white">
                      {analytics.costBreakdown.bySection[0]?.section}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Average Item Cost</p>
                    <p className="text-lg font-semibold text-white">
                      ${(boq.summary.totalAmount / boq.summary.totalItems).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Cost Variance</p>
                    <p className="text-lg font-semibold text-green-400">
                      {analytics.revisionMetrics.costVariance.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </>
        )}

        {selectedMetric === 'indigenous' && (
          <div className="lg:col-span-3">
            {renderIndigenousAnalysis()}
          </div>
        )}

        {selectedMetric === 'revisions' && (
          <div className="lg:col-span-3">
            {renderRevisionMetrics()}
          </div>
        )}
      </div>

      {/* Collaboration Metrics */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Collaboration Activity</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {analytics.collaborationMetrics.totalUsers}
            </p>
            <p className="text-sm text-white/60">Total Users</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {analytics.collaborationMetrics.totalComments}
            </p>
            <p className="text-sm text-white/60">Comments</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {boq.collaboration.approvals.length}
            </p>
            <p className="text-sm text-white/60">Approvals</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {analytics.collaborationMetrics.averageApprovalTime}h
            </p>
            <p className="text-sm text-white/60">Avg Approval Time</p>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}