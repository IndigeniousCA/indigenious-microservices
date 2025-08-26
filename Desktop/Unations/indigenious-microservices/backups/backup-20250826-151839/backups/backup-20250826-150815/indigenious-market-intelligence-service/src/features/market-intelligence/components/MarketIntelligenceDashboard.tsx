// Market Intelligence Dashboard
// Main dashboard for market analytics and insights

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, BarChart3, Target, MapPin, AlertCircle,
  Lightbulb, Users, DollarSign, Calendar, Filter,
  Download, RefreshCw, Settings, Zap, Eye, ChevronRight
} from 'lucide-react'
import { AnalyticsOverview } from './AnalyticsOverview'
import { OpportunityRecommendations } from './OpportunityRecommendations'
import { MarketTrends } from './MarketTrends'
import { SectorAnalysis } from './SectorAnalysis'
import { GeographicHeatmap } from './GeographicHeatmap'
import { CompetitiveAnalysis } from './CompetitiveAnalysis'
import { PerformanceMetrics } from './PerformanceMetrics'
import { useMarketIntelligence } from '../hooks/useMarketIntelligence'

interface MarketIntelligenceDashboardProps {
  businessId: string
  userRole: 'business' | 'government' | 'admin'
}

export function MarketIntelligenceDashboard({ businessId, userRole }: MarketIntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'opportunities' | 'competition' | 'performance'>('overview')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('quarter')
  const [showFilters, setShowFilters] = useState(false)
  
  const {
    dashboardData,
    loading,
    refreshData,
    exportReport
  } = useMarketIntelligence(businessId, { timeRange })

  // Quick stats for header
  const quickStats = [
    {
      label: 'Market Size',
      value: `$${(dashboardData?.totalMarketSize || 0).toLocaleString()}M`,
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign
    },
    {
      label: 'Indigenous Share',
      value: `${(dashboardData?.indigenousParticipation || 0).toFixed(1)}%`,
      change: '+2.3%',
      trend: 'up' as const,
      icon: Users
    },
    {
      label: 'Opportunities',
      value: (dashboardData?.opportunityCount || 0).toLocaleString(),
      change: '+18.2%',
      trend: 'up' as const,
      icon: Target
    },
    {
      label: 'Win Rate',
      value: `${(dashboardData?.averageWinRate || 0).toFixed(1)}%`,
      change: '+5.1%',
      trend: 'up' as const,
      icon: TrendingUp
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trends', label: 'Market Trends', icon: TrendingUp },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'competition', label: 'Competition', icon: Users },
    { id: 'performance', label: 'Performance', icon: Zap }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Market Intelligence</h1>
            <p className="text-white/60">
              Advanced analytics and insights for Indigenous procurement markets
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as unknown)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="week" className="bg-gray-800">Last Week</option>
              <option value="month" className="bg-gray-800">Last Month</option>
              <option value="quarter" className="bg-gray-800">Last Quarter</option>
              <option value="year" className="bg-gray-800">Last Year</option>
            </select>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg transition-colors"
              title="Filters"
            >
              <Filter className="w-4 h-4 text-white" />
            </button>

            {/* Refresh */}
            <button
              onClick={refreshData}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>

            {/* Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => exportReport('pdf')}
              className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                transition-all duration-200 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </motion.button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-white/60" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <span className={`text-sm font-medium ${
                  stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {stat.change}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-100 mb-1">Market Alerts</h3>
              <div className="space-y-2">
                {dashboardData.alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between">
                    <p className="text-sm text-amber-100/80">{alert.message}</p>
                    {alert.actionUrl && (
                      <button className="text-xs text-amber-200 hover:text-amber-100 underline">
                        View Details
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as unknown)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 
              flex items-center justify-center ${
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <AnalyticsOverview 
                data={dashboardData}
                userRole={userRole}
              />
              
              {/* Quick Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Opportunity Recommendations */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-amber-400" />
                      Top Opportunities
                    </h3>
                    <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {dashboardData?.recommendations?.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white text-sm">{rec.title}</h4>
                          <span className="text-xs text-emerald-400 font-medium">
                            {rec.matchScore}% match
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">${rec.value.toLocaleString()}</span>
                          <span className="text-white/60">{rec.winProbability}% win rate</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                    Recent Activity
                  </h3>
                  
                  <div className="space-y-3">
                    {dashboardData?.recentActivity?.slice(0, 4).map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{activity.title}</p>
                          <p className="text-xs text-white/60">{activity.date}</p>
                        </div>
                        {activity.value && (
                          <span className="text-sm text-white/80">
                            ${activity.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              <MarketTrends 
                trends={dashboardData?.trends || []}
                timeRange={timeRange}
              />
              <SectorAnalysis 
                sectors={dashboardData?.sectors || []}
              />
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <OpportunityRecommendations 
                recommendations={dashboardData?.recommendations || []}
                businessId={businessId}
              />
              <GeographicHeatmap 
                regions={dashboardData?.regions || []}
              />
            </div>
          )}

          {activeTab === 'competition' && (
            <CompetitiveAnalysis 
              businessId={businessId}
              sectors={dashboardData?.sectors || []}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceMetrics 
              performance={dashboardData?.userPerformance}
              benchmarks={dashboardData?.benchmarks || []}
              businessId={businessId}
            />
          )}
        </div>
      )}

      {/* AI Insights Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border 
          border-purple-400/30 rounded-xl p-6"
      >
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-purple-100 mb-2">AI-Powered Insights</h3>
            <p className="text-sm text-purple-100/80 mb-3">
              Based on your performance and market trends, our AI recommends focusing on 
              infrastructure projects in Manitoba and Saskatchewan, where Indigenous 
              participation is below targets and competition is moderate.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-200 text-xs 
                rounded-full border border-purple-400/30">
                Infrastructure
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-200 text-xs 
                rounded-full border border-purple-400/30">
                Prairie Provinces
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-200 text-xs 
                rounded-full border border-purple-400/30">
                Low Competition
              </span>
            </div>
          </div>
          <button className="text-purple-300 hover:text-purple-200 transition-colors">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}