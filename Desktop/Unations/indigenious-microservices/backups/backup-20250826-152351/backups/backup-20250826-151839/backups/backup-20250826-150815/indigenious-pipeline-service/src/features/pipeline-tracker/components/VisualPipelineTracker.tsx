'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  BarChart3, Calendar, DollarSign, TrendingUp,
  AlertTriangle, Clock, Users, Filter, Plus,
  ChevronRight, MoreVertical, Tag, Flag,
  MessageSquare, Paperclip, Target, Activity,
  Eye, List, Grid3x3, PieChart, ArrowUp,
  ArrowDown, Minus, Search, Download, Settings
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { PipelineService } from '../services/PipelineService'
import { 
  Pipeline, Opportunity, PipelineStage, 
  ForecastData, VelocityMetric, StageMetrics,
  TeamPerformance, PipelineAlert
} from '../types'

interface VisualPipelineTrackerProps {
  businessId: string
  onOpportunityClick?: (opportunity: Opportunity) => void
  onCreateOpportunity?: () => void
}

export function VisualPipelineTracker({
  businessId,
  onOpportunityClick,
  onCreateOpportunity
}: VisualPipelineTrackerProps) {
  const [pipelineService] = useState(() => new PipelineService())
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'forecast' | 'analytics'>('kanban')
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [forecast, setForecast] = useState<ForecastData[]>([])
  const [velocity, setVelocity] = useState<VelocityMetric[]>([])
  const [stageMetrics, setStageMetrics] = useState<StageMetrics[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([])
  const [alerts, setAlerts] = useState<PipelineAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedOpportunity, setDraggedOpportunity] = useState<string | null>(null)

  useEffect(() => {
    loadPipelineData()
  }, [businessId])

  const loadPipelineData = async () => {
    setIsLoading(true)
    try {
      const [
        pipelineData,
        forecastData,
        velocityData,
        stageData,
        teamData,
        alertData
      ] = await Promise.all([
        pipelineService.getPipeline(businessId),
        pipelineService.getForecast(businessId),
        pipelineService.getVelocityMetrics(businessId),
        pipelineService.getStageMetrics(businessId),
        pipelineService.getTeamPerformance(businessId),
        pipelineService.getAlerts(businessId)
      ])

      setPipeline(pipelineData)
      setForecast(forecastData)
      setVelocity(velocityData)
      setStageMetrics(stageData)
      setTeamPerformance(teamData)
      setAlerts(alertData)
    } catch (error) {
      logger.error('Error loading pipeline data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, opportunityId: string) => {
    setDraggedOpportunity(opportunityId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (!draggedOpportunity || !pipeline) return

    const opportunity = pipeline.opportunities.find(o => o.id === draggedOpportunity)
    if (!opportunity || opportunity.stage === stageId) return

    // Update opportunity stage
    await pipelineService.moveOpportunity(draggedOpportunity, stageId, 'current-user')
    
    // Update local state
    setPipeline(prev => {
      if (!prev) return null
      return {
        ...prev,
        opportunities: prev.opportunities.map(o => 
          o.id === draggedOpportunity ? { ...o, stage: stageId } : o
        )
      }
    })

    setDraggedOpportunity(null)
  }

  const getStageOpportunities = (stageId: string) => {
    if (!pipeline) return []
    return pipeline.opportunities
      .filter(o => o.stage === stageId && o.status === 'active')
      .filter(o => {
        const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            o.client.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTags = selectedTags.length === 0 || 
                          selectedTags.some(tag => o.tags.includes(tag))
        return matchesSearch && matchesTags
      })
      .sort((a, b) => b.value - a.value)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-400/50'
      case 'high': return 'border-yellow-400/50'
      case 'medium': return 'border-blue-400/50'
      default: return 'border-gray-400/50'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const renderKanbanView = () => {
    if (!pipeline) return null

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map(stage => {
          const opportunities = getStageOpportunities(stage.id)
          const stageValue = opportunities.reduce((sum, o) => sum + o.value, 0)
          
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                    <span className="text-sm text-white/60">({opportunities.length})</span>
                  </h3>
                  <button className="p-1 hover:bg-white/10 rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <p className="text-sm text-white/60">{formatCurrency(stageValue)}</p>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {opportunities.map(opportunity => (
                    <motion.div
                      key={opportunity.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown, opportunity.id)}
                      whileDrag={{ scale: 1.05, rotate: 2 }}
                      className="cursor-move"
                    >
                      <GlassPanel 
                        className={`p-4 hover:bg-white/5 transition-all ${getPriorityColor(opportunity.priority)}`}
                        onClick={() => onOpportunityClick?.(opportunity)}
                      >
                        {/* Priority Flag */}
                        {opportunity.priority === 'critical' && (
                          <div className="absolute -top-1 -right-1">
                            <Flag className="w-4 h-4 text-red-400 fill-red-400" />
                          </div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium line-clamp-2 flex-1">
                            {opportunity.title}
                          </h4>
                          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" />
                        </div>

                        {/* Client */}
                        <p className="text-sm text-white/60 mb-3">{opportunity.client}</p>

                        {/* Value & Probability */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-semibold text-white">
                            {formatCurrency(opportunity.value)}
                          </span>
                          <span className="text-sm text-white/60">
                            {opportunity.probability}% probable
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                            style={{ width: `${opportunity.probability}%` }}
                          />
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {opportunity.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <div className="flex items-center gap-3">
                            {opportunity.dates.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.ceil((new Date(opportunity.dates.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                              </span>
                            )}
                            {opportunity.activities.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {opportunity.activities.length}
                              </span>
                            )}
                            {opportunity.documents && opportunity.documents.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {opportunity.documents.length}
                              </span>
                            )}
                          </div>
                          <div className="flex -space-x-2">
                            {opportunity.assignedTo.slice(0, 3).map((userId, i) => (
                              <div
                                key={userId}
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex items-center justify-center text-xs text-white"
                              >
                                {userId[0].toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Blockers */}
                        {opportunity.blockers && opportunity.blockers.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-1 text-xs text-yellow-400">
                              <AlertTriangle className="w-3 h-3" />
                              {opportunity.blockers[0].issue}
                            </div>
                          </div>
                        )}
                      </GlassPanel>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Opportunity Button */}
                <button
                  onClick={onCreateOpportunity}
                  className="w-full p-4 border-2 border-dashed border-white/20 rounded-lg text-white/40 hover:border-white/40 hover:text-white/60 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Opportunity
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderListView = () => {
    if (!pipeline) return null

    const allOpportunities = pipeline.opportunities
      .filter(o => o.status === 'active')
      .filter(o => {
        const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            o.client.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTags = selectedTags.length === 0 || 
                          selectedTags.some(tag => o.tags.includes(tag))
        return matchesSearch && matchesTags
      })
      .sort((a, b) => {
        // Sort by deadline, then by value
        if (a.dates.deadline && b.dates.deadline) {
          return new Date(a.dates.deadline).getTime() - new Date(b.dates.deadline).getTime()
        }
        return b.value - a.value
      })

    return (
      <GlassPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Opportunity</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Client</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Stage</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Value</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Probability</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Deadline</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Assigned</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allOpportunities.map(opp => {
                const stage = pipeline.stages.find(s => s.id === opp.stage)
                return (
                  <tr 
                    key={opp.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => onOpportunityClick?.(opp)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Flag className={`w-4 h-4 ${
                          opp.priority === 'critical' ? 'text-red-400' :
                          opp.priority === 'high' ? 'text-yellow-400' :
                          opp.priority === 'medium' ? 'text-blue-400' :
                          'text-gray-400'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{opp.title}</p>
                          <div className="flex gap-1 mt-1">
                            {opp.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-white/80">{opp.client}</td>
                    <td className="p-4">
                      <span 
                        className="inline-flex items-center gap-1 text-sm"
                        style={{ color: stage?.color }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage?.color }} />
                        {stage?.name}
                      </span>
                    </td>
                    <td className="p-4 text-white font-medium">{formatCurrency(opp.value)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-sm text-white/60">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {opp.dates.deadline ? (
                        <span className={`text-sm ${
                          Math.ceil((new Date(opp.dates.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) < 7
                            ? 'text-red-400'
                            : 'text-white/60'
                        }`}>
                          {new Date(opp.dates.deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex -space-x-2">
                        {opp.assignedTo.slice(0, 3).map((userId, i) => (
                          <div
                            key={userId}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex items-center justify-center text-xs text-white"
                          >
                            {userId[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <button 
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle actions
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    )
  }

  const renderForecastView = () => {
    if (!forecast.length) return null

    return (
      <div className="space-y-6">
        {/* Forecast Chart */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Forecast</h3>
          <div className="relative h-64">
            {/* Simple bar chart visualization */}
            <div className="absolute inset-0 flex items-end justify-between gap-2">
              {forecast.map((period, index) => (
                <div key={period.period} className="flex-1 flex flex-col items-center">
                  <div className="w-full space-y-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-green-500/20 rounded-t"
                      style={{ height: `${(period.committed / Math.max(...forecast.map(f => f.bestCase))) * 200}px` }}
                    />
                    <div 
                      className="w-full bg-blue-500/40 -mt-1"
                      style={{ height: `${((period.projected - period.committed) / Math.max(...forecast.map(f => f.bestCase))) * 200}px` }}
                    />
                    <div 
                      className="w-full bg-purple-500/20"
                      style={{ height: `${((period.bestCase - period.projected) / Math.max(...forecast.map(f => f.bestCase))) * 200}px` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-2">{period.period}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500/20 rounded" />
              <span className="text-xs text-white/60">Committed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500/40 rounded" />
              <span className="text-xs text-white/60">Projected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500/20 rounded" />
              <span className="text-xs text-white/60">Best Case</span>
            </div>
          </div>
        </GlassPanel>

        {/* Forecast Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(forecast.reduce((sum, f) => sum + f.committed, 0))}
            </p>
            <p className="text-sm text-white/60">Committed Revenue</p>
            <p className="text-xs text-white/40 mt-1">Next 6 months</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-blue-400" />
              <Activity className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(forecast.reduce((sum, f) => sum + f.projected, 0))}
            </p>
            <p className="text-sm text-white/60">Projected Revenue</p>
            <p className="text-xs text-white/40 mt-1">Based on probability</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <ArrowUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(forecast.reduce((sum, f) => sum + f.bestCase, 0))}
            </p>
            <p className="text-sm text-white/60">Best Case</p>
            <p className="text-xs text-white/40 mt-1">If all deals close</p>
          </GlassPanel>
        </div>
      </div>
    )
  }

  const renderAnalyticsView = () => {
    return (
      <div className="space-y-6">
        {/* Velocity Metrics */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pipeline Velocity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {velocity.slice(-4).map(v => (
              <div key={v.period} className="text-center">
                <p className="text-sm text-white/60 mb-2">{v.period}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Created</span>
                    <span className="text-white">{v.created}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Won</span>
                    <span className="text-green-400">{v.won}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Lost</span>
                    <span className="text-red-400">{v.lost}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Cycle</span>
                    <span className="text-white">{v.cycleTime}d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Stage Performance */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Stage Performance</h3>
          <div className="space-y-4">
            {stageMetrics.map(stage => (
              <div key={stage.stageName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">{stage.stageName}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white/60">
                      {stage.count} deals • {formatCurrency(stage.value)}
                    </span>
                    <span className="text-white/60">
                      {stage.conversionRate}% conversion
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                    style={{ width: `${stage.conversionRate}%` }}
                  />
                </div>
                {stage.bottlenecks.length > 0 && (
                  <p className="text-xs text-yellow-400">
                    ⚠ Bottlenecks: {stage.bottlenecks.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Team Performance */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Team Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamPerformance.map(member => (
              <div key={member.userId} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">{member.userName}</h4>
                  <div className="flex items-center gap-2">
                    {member.trends.winRate === 'improving' && (
                      <ArrowUp className="w-4 h-4 text-green-400" />
                    )}
                    {member.trends.winRate === 'declining' && (
                      <ArrowDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm text-white">{member.metrics.winRate}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/60">Opportunities</p>
                    <p className="text-white font-medium">{member.metrics.opportunities}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Total Value</p>
                    <p className="text-white font-medium">{formatCurrency(member.metrics.value)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Avg Deal Size</p>
                    <p className="text-white font-medium">{formatCurrency(member.metrics.averageDealSize)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Activities/Week</p>
                    <p className="text-white font-medium">{member.metrics.activitiesPerWeek}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-4"
        >
          <BarChart3 className="w-16 h-16 text-blue-400" />
        </motion.div>
        <p className="text-white/60">Loading pipeline data...</p>
      </div>
    )
  }

  if (!pipeline) return null

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Pipeline Tracker</h2>
              <p className="text-sm text-white/60">
                {pipeline.metrics.totalOpportunities} active opportunities • {formatCurrency(pipeline.metrics.weightedValue)} weighted value
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'kanban' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Kanban View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('forecast')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'forecast' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Forecast View"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'analytics' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
                }`}
                title="Analytics View"
              >
                <PieChart className="w-4 h-4" />
              </button>
            </div>

            <GlassButton onClick={onCreateOpportunity} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Opportunity
            </GlassButton>
          </div>
        </div>

        {/* Alerts */}
        {alerts.filter(a => !a.acknowledged && a.severity === 'critical').length > 0 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {alerts.filter(a => !a.acknowledged && a.severity === 'critical').length} critical alerts require attention
              </span>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>
          <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Tags */}
        {pipeline.opportunities.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white/60">Filter by tag:</span>
            {Array.from(new Set(pipeline.opportunities.flatMap(o => o.tags))).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev => 
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'kanban' && renderKanbanView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'forecast' && renderForecastView()}
          {viewMode === 'analytics' && renderAnalyticsView()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}