// Executive Dashboard Component
// High-level analytics view for C-suite and ministers

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Award, Users, DollarSign, Target,
  BarChart3, PieChart, Activity, Calendar, Download,
  AlertCircle, CheckCircle, Info, ArrowUpRight, ArrowDownRight,
  Briefcase, MapPin, Clock, Shield, Feather, ChevronRight
} from 'lucide-react'
import { ComplianceMetrics, AnalyticsMetric, CommunityImpact, Insight } from '../types/analytics.types'
import { useAnalytics } from '../hooks/useAnalytics'
import { KPICards } from './KPICards'
import { ComplianceTracker } from './ComplianceTracker'
import { InsightsFeed } from './InsightsFeed'

interface ExecutiveDashboardProps {
  dateRange?: { start: string; end: string }
  onDrillDown?: (metric: string, data: unknown) => void
  onExport?: () => void
}

export function ExecutiveDashboard({
  dateRange,
  onDrillDown,
  onExport
}: ExecutiveDashboardProps) {
  const { metrics, compliance, insights, isLoading } = useAnalytics({ dateRange })
  
  const [selectedView, setSelectedView] = useState<'overview' | 'compliance' | 'impact' | 'trends'>('overview')
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)

  // Key performance indicators
  const kpis = useMemo(() => [
    {
      id: 'total-procurement',
      name: 'Total Procurement Value',
      value: metrics?.totalProcurement || 0,
      previousValue: metrics?.previousProcurement || 0,
      unit: 'currency' as const,
      icon: DollarSign,
      color: 'blue'
    },
    {
      id: 'indigenous-spend',
      name: 'Indigenous Business Spend',
      value: metrics?.indigenousSpend || 0,
      previousValue: metrics?.previousIndigenousSpend || 0,
      unit: 'currency' as const,
      icon: Feather,
      color: 'purple'
    },
    {
      id: 'compliance-rate',
      name: 'Federal Compliance Rate',
      value: compliance?.overallCompliance || 0,
      target: 5,
      unit: 'percentage' as const,
      icon: Target,
      color: (compliance?.overallCompliance ?? 0) >= 5 ? 'emerald' : 'amber'
    },
    {
      id: 'active-suppliers',
      name: 'Active Indigenous Suppliers',
      value: metrics?.activeSuppliers || 0,
      previousValue: metrics?.previousSuppliers || 0,
      unit: 'count' as const,
      icon: Briefcase,
      color: 'indigo'
    },
    {
      id: 'jobs-created',
      name: 'Jobs Created/Sustained',
      value: metrics?.totalJobs || 0,
      previousValue: metrics?.previousJobs || 0,
      unit: 'count' as const,
      icon: Users,
      color: 'emerald'
    },
    {
      id: 'communities-impacted',
      name: 'Communities Impacted',
      value: metrics?.communitiesImpacted || 0,
      previousValue: metrics?.previousCommunities || 0,
      unit: 'count' as const,
      icon: MapPin,
      color: 'amber'
    }
  ], [metrics, compliance])

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toLocaleString()}`
  }

  // Calculate change percentage
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Executive Dashboard</h1>
          <p className="text-white/70">
            Federal Indigenous Procurement Performance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExport}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          
          <div className="px-4 py-2 bg-purple-500/20 border border-purple-400/30 
            rounded-lg text-purple-200 flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-xl">
        {(['overview', 'compliance', 'impact', 'trends'] as const).map(view => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                selectedView === view
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map(kpi => {
              const change = calculateChange(kpi.value, kpi.previousValue || kpi.value)
              const Icon = kpi.icon
              
              return (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-br from-${kpi.color}-500/20 to-${kpi.color}-600/20 
                    backdrop-blur-md border border-${kpi.color}-400/30 rounded-xl p-6
                    hover:from-${kpi.color}-500/30 hover:to-${kpi.color}-600/30 
                    transition-all cursor-pointer`}
                  onClick={() => onDrillDown?.(kpi.id, kpi)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <Icon className={`w-8 h-8 text-${kpi.color}-400`} />
                    {change !== 0 && (
                      <div className={`flex items-center space-x-1 text-sm ${
                        change > 0 ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {change > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{Math.abs(change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white/70 text-sm mb-1">{kpi.name}</p>
                  <p className="text-3xl font-bold text-white">
                    {kpi.unit === 'currency' 
                      ? formatCurrency(kpi.value)
                      : kpi.unit === 'percentage'
                      ? `${kpi.value.toFixed(1)}%`
                      : kpi.value.toLocaleString()
                    }
                  </p>
                  
                  {kpi.target && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Target</span>
                        <span className={`font-medium ${
                          kpi.value >= kpi.target ? 'text-emerald-300' : 'text-amber-300'
                        }`}>
                          {kpi.target}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            kpi.value >= kpi.target
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Performing Departments
              </h3>
              
              <div className="space-y-3">
                {compliance?.departments
                  .sort((a, b) => b.complianceRate - a.complianceRate)
                  .slice(0, 5)
                  .map((dept, index) => (
                    <div
                      key={dept.departmentId}
                      className="flex items-center justify-between p-3 bg-white/5 
                        rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center 
                          justify-center text-sm font-medium ${
                            dept.complianceRate >= 5
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">{dept.departmentName}</p>
                          <p className="text-white/60 text-sm">
                            {dept.indigenousContractCount} Indigenous contracts
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          dept.complianceRate >= 5 ? 'text-emerald-300' : 'text-amber-300'
                        }`}>
                          {dept.complianceRate.toFixed(1)}%
                        </p>
                        <p className="text-white/60 text-xs">
                          {formatCurrency(dept.indigenousSpend)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent Insights */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Key Insights
              </h3>
              
              <div className="space-y-3">
                {insights?.slice(0, 4).map(insight => {
                  const Icon = insight.severity === 'positive' ? CheckCircle :
                               insight.severity === 'warning' ? AlertCircle : Info
                  const color = insight.severity === 'positive' ? 'emerald' :
                               insight.severity === 'warning' ? 'amber' : 'blue'
                  
                  return (
                    <div
                      key={insight.id}
                      className="p-3 bg-white/5 rounded-lg hover:bg-white/10 
                        transition-colors cursor-pointer"
                      onClick={() => setExpandedInsight(
                        expandedInsight === insight.id ? null : insight.id
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`w-5 h-5 text-${color}-400 mt-0.5`} />
                        <div className="flex-1">
                          <p className="text-white font-medium">{insight.title}</p>
                          <AnimatePresence>
                            {expandedInsight === insight.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <p className="text-white/70 text-sm mt-2">
                                  {insight.description}
                                </p>
                                {insight.recommendation && (
                                  <p className="text-blue-300 text-sm mt-2">
                                    Recommendation: {insight.recommendation}
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${
                          expandedInsight === insight.id ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Compliance Summary */}
          <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 
            backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Federal 5% Target Progress
                </h3>
                <p className="text-white/70">
                  Indigenous procurement across all departments
                </p>
              </div>
              
              <Shield className={`w-12 h-12 ${
                (compliance?.overallCompliance ?? 0) >= 5
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-white/60 text-sm">Current Rate</p>
                <p className={`text-3xl font-bold ${
                  (compliance?.overallCompliance ?? 0) >= 5
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }`}>
                  {compliance?.overallCompliance.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Gap to Target</p>
                <p className="text-2xl font-bold text-white">
                  {(compliance?.overallCompliance ?? 0) >= 5
                    ? 'Target Met'
                    : `${(5 - (compliance?.overallCompliance ?? 0)).toFixed(2)}%`}
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Compliant Departments</p>
                <p className="text-2xl font-bold text-white">
                  {compliance?.departments.filter(d => d.complianceRate >= 5).length} / {compliance?.departments.length}
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Projected EOY</p>
                <p className={`text-2xl font-bold ${
                  (compliance?.projectedCompliance ?? 0) >= 5
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }`}>
                  {compliance?.projectedCompliance.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance View */}
      {selectedView === 'compliance' && (
        <ComplianceTracker 
          compliance={compliance} 
          onDrillDown={(department) => onDrillDown?.('compliance', department)} 
        />
      )}

      {/* Impact View */}
      {selectedView === 'impact' && (
        <div className="space-y-6">
          {/* Community Impact Overview */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 
            backdrop-blur-md border border-emerald-400/30 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Community Economic Impact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-white/60 text-sm">Total Economic Flow</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(metrics?.totalCommunityRevenue || 0)}
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Jobs Created</p>
                <p className="text-2xl font-bold text-emerald-300">
                  {metrics?.jobsCreated?.toLocaleString() || 0}
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Economic Multiplier</p>
                <p className="text-2xl font-bold text-white">
                  {metrics?.economicMultiplier || 2.3}x
                </p>
              </div>
              
              <div>
                <p className="text-white/60 text-sm">Communities Benefited</p>
                <p className="text-2xl font-bold text-white">
                  {metrics?.communitiesImpacted || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Top Impacted Communities */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Top Beneficiary Communities
            </h3>
            
            <div className="space-y-3">
              {(Array.isArray(metrics?.topCommunities) ? metrics.topCommunities : []).map((community: CommunityImpact, index: number) => (
                <div
                  key={community.communityId}
                  className="flex items-center justify-between p-4 bg-white/5 
                    rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full 
                      flex items-center justify-center">
                      <span className="text-purple-300 font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{community.communityName}</p>
                      <p className="text-white/60 text-sm">{community.nation}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {formatCurrency(community.totalRevenue)}
                    </p>
                    <p className="text-emerald-300 text-sm">
                      {community.employmentCreated} jobs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Procurement Trends
            </h3>
            
            {/* Trend visualization would go here */}
            <div className="h-64 flex items-center justify-center text-white/40">
              <Activity className="w-8 h-8 mr-2" />
              <span>Trend charts visualization</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}