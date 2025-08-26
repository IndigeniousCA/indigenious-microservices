// Analytics Overview Component
// High-level market analytics and key insights

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target,
  BarChart3, PieChart, Calendar, MapPin, Building,
  ArrowUpRight, ArrowDownRight, Info, ChevronRight
} from 'lucide-react'
import type { MarketDashboardData } from '../types/market-intelligence.types'

interface AnalyticsOverviewProps {
  data: MarketDashboardData | null
  userRole: 'business' | 'government' | 'admin'
}

export function AnalyticsOverview({ data, userRole }: AnalyticsOverviewProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  if (!data) return null

  // Key performance indicators
  const kpis = [
    {
      id: 'market_growth',
      label: 'Market Growth',
      value: `${data.marketGrowth?.toFixed(1) || 0}%`,
      change: '+2.3%',
      trend: 'up' as const,
      icon: TrendingUp,
      description: 'Year-over-year market growth rate',
      color: 'emerald'
    },
    {
      id: 'indigenous_participation',
      label: 'Indigenous Participation',
      value: `${data.indigenousParticipation?.toFixed(1) || 0}%`,
      change: '+1.8%',
      trend: 'up' as const,
      icon: Users,
      description: 'Indigenous business market share',
      color: 'purple'
    },
    {
      id: 'avg_win_rate',
      label: 'Average Win Rate',
      value: `${data.averageWinRate?.toFixed(1) || 0}%`,
      change: '+5.2%',
      trend: 'up' as const,
      icon: Target,
      description: 'Success rate across all bids',
      color: 'blue'
    },
    {
      id: 'opportunity_volume',
      label: 'Active Opportunities',
      value: data.opportunityCount?.toLocaleString() || '0',
      change: '+12.4%',
      trend: 'up' as const,
      icon: Building,
      description: 'Current open procurement opportunities',
      color: 'amber'
    }
  ]

  // Chart data for market trends
  const marketTrendData = [
    { month: 'Jan', value: 85, indigenous: 12 },
    { month: 'Feb', value: 92, indigenous: 14 },
    { month: 'Mar', value: 78, indigenous: 11 },
    { month: 'Apr', value: 105, indigenous: 18 },
    { month: 'May', value: 118, indigenous: 22 },
    { month: 'Jun', value: 125, indigenous: 24 }
  ]

  // Sector distribution
  const sectorData = [
    { sector: 'Infrastructure', value: 45, color: 'blue' },
    { sector: 'Construction', value: 28, color: 'emerald' },
    { sector: 'Professional Services', value: 15, color: 'purple' },
    { sector: 'Technology', value: 8, color: 'amber' },
    { sector: 'Other', value: 4, color: 'gray' }
  ]

  // Regional breakdown
  const regionalData = [
    { region: 'Western Canada', opportunities: 145, value: 42.5 },
    { region: 'Central Canada', opportunities: 132, value: 38.2 },
    { region: 'Eastern Canada', opportunities: 89, value: 24.8 },
    { region: 'Northern Territories', opportunities: 34, value: 12.1 }
  ]

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedMetric(kpi.id)}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
              cursor-pointer hover:bg-white/15 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-${kpi.color}-500/20`}>
                <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
              </div>
              <span className={`text-sm font-medium flex items-center ${
                kpi.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {kpi.change}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-1">{kpi.value}</h3>
            <p className="text-sm text-white/60">{kpi.label}</p>
            
            {selectedMetric === kpi.id && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-white/50 mt-2 pt-2 border-t border-white/10"
              >
                {kpi.description}
              </motion.p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Market Trends Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
              Market Activity Trends
            </h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center">
              View Details <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {/* Chart placeholder with data visualization */}
          <div className="h-64 relative">
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-8">
              {marketTrendData.map((item, index) => (
                <div key={item.month} className="flex flex-col items-center">
                  {/* Total market bar */}
                  <div className="w-8 bg-blue-500/30 rounded-t mb-1 relative"
                    style={{ height: `${(item.value / 125) * 160}px` }}>
                    {/* Indigenous portion */}
                    <div className="absolute bottom-0 w-full bg-purple-500/60 rounded-t"
                      style={{ height: `${(item.indigenous / item.value) * 100}%` }}>
                    </div>
                  </div>
                  <span className="text-xs text-white/60 mt-2">{item.month}</span>
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="absolute top-0 right-0 flex space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500/30 rounded mr-2"></div>
                <span className="text-white/60">Total Market</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500/60 rounded mr-2"></div>
                <span className="text-white/60">Indigenous</span>
              </div>
            </div>
          </div>
          
          {/* Insight */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-100/80">
              <Info className="w-4 h-4 inline mr-1" />
              Indigenous participation has grown 85% over the past 6 months, 
              with strongest growth in infrastructure and construction sectors.
            </p>
          </div>
        </div>

        {/* Sector Distribution */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-emerald-400" />
              Sector Distribution
            </h3>
            <button className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center">
              Analyze <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {/* Sector breakdown */}
          <div className="space-y-3">
            {sectorData.map((sector) => (
              <div key={sector.sector} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded bg-${sector.color}-500`}></div>
                  <span className="text-white text-sm">{sector.sector}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${sector.color}-500 rounded-full`}
                      style={{ width: `${sector.value}%` }}
                    ></div>
                  </div>
                  <span className="text-white/60 text-sm w-8">{sector.value}%</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Top sector insight */}
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 mt-6">
            <p className="text-sm text-emerald-100/80">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Infrastructure leads with 45% of total opportunities, 
              showing consistent 15% quarterly growth.
            </p>
          </div>
        </div>
      </div>

      {/* Regional Analysis */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-amber-400" />
            Regional Market Activity
          </h3>
          <button className="text-amber-400 hover:text-amber-300 text-sm flex items-center">
            View Map <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {regionalData.map((region, index) => (
            <motion.div
              key={region.region}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <h4 className="font-medium text-white mb-2">{region.region}</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Opportunities</span>
                  <span className="text-white">{region.opportunities}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total Value</span>
                  <span className="text-white">${region.value}M</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Avg. Size</span>
                  <span className="text-white">
                    ${(region.value / region.opportunities * 1000000).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Market Insights */}
      {userRole === 'business' && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border 
          border-purple-400/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Market Insights for Your Business
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-900/20 rounded-lg p-4">
              <h4 className="font-medium text-purple-200 mb-2">Growth Opportunity</h4>
              <p className="text-sm text-purple-100/80">
                Infrastructure sector showing 28% growth. Your experience in this area 
                positions you well for upcoming opportunities.
              </p>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-200 mb-2">Competitive Edge</h4>
              <p className="text-sm text-blue-100/80">
                Your Indigenous content percentage (85%) is above market average (67%), 
                giving you advantage in government contracts.
              </p>
            </div>
            
            <div className="bg-emerald-900/20 rounded-lg p-4">
              <h4 className="font-medium text-emerald-200 mb-2">Market Position</h4>
              <p className="text-sm text-emerald-100/80">
                You're in the top 15% of performers in your sector. Focus on scaling 
                capacity to capture larger opportunities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}