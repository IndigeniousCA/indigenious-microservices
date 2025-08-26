// Market Trends Component
// Visualize and analyze market trends and patterns

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, BarChart3, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, Info, Zap, DollarSign,
  Users, Building, MapPin, ChevronRight, Activity
} from 'lucide-react'
import type { MarketTrend } from '../types/market-intelligence.types'

interface MarketTrendsProps {
  trends: MarketTrend[]
  timeRange: 'week' | 'month' | 'quarter' | 'year'
}

export function MarketTrends({ trends, timeRange }: MarketTrendsProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // Mock trend data for visualization
  const trendData = [
    {
      sector: 'Infrastructure',
      currentValue: 125000000,
      previousValue: 98000000,
      growthRate: 27.5,
      opportunities: 156,
      seasonality: 'peak' as const,
      competitionLevel: 'medium' as const,
      data: [
        { period: 'Q1', value: 98000000, opportunities: 120 },
        { period: 'Q2', value: 115000000, opportunities: 145 },
        { period: 'Q3', value: 108000000, opportunities: 138 },
        { period: 'Q4', value: 125000000, opportunities: 156 }
      ]
    },
    {
      sector: 'Construction',
      currentValue: 85000000,
      previousValue: 78000000,
      growthRate: 8.9,
      opportunities: 98,
      seasonality: 'normal' as const,
      competitionLevel: 'high' as const,
      data: [
        { period: 'Q1', value: 78000000, opportunities: 85 },
        { period: 'Q2', value: 82000000, opportunities: 92 },
        { period: 'Q3', value: 79000000, opportunities: 88 },
        { period: 'Q4', value: 85000000, opportunities: 98 }
      ]
    },
    {
      sector: 'Professional Services',
      currentValue: 45000000,
      previousValue: 52000000,
      growthRate: -13.5,
      opportunities: 67,
      seasonality: 'low' as const,
      competitionLevel: 'low' as const,
      data: [
        { period: 'Q1', value: 52000000, opportunities: 78 },
        { period: 'Q2', value: 48000000, opportunities: 72 },
        { period: 'Q3', value: 42000000, opportunities: 62 },
        { period: 'Q4', value: 45000000, opportunities: 67 }
      ]
    },
    {
      sector: 'Technology',
      currentValue: 28000000,
      previousValue: 24000000,
      growthRate: 16.7,
      opportunities: 34,
      seasonality: 'peak' as const,
      competitionLevel: 'medium' as const,
      data: [
        { period: 'Q1', value: 24000000, opportunities: 28 },
        { period: 'Q2', value: 26000000, opportunities: 31 },
        { period: 'Q3', value: 25000000, opportunities: 29 },
        { period: 'Q4', value: 28000000, opportunities: 34 }
      ]
    }
  ]

  // Get growth color
  const getGrowthColor = (rate: number) => {
    if (rate > 15) return 'emerald'
    if (rate > 0) return 'blue'
    if (rate > -10) return 'amber'
    return 'red'
  }

  // Get seasonality color
  const getSeasonalityColor = (seasonality: string) => {
    switch (seasonality) {
      case 'peak': return 'emerald'
      case 'normal': return 'blue'
      case 'low': return 'amber'
      default: return 'gray'
    }
  }

  // Get competition color
  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'emerald'
      case 'medium': return 'amber'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
              Market Trends Analysis
            </h2>
            <p className="text-white/60">
              Track sector performance, growth patterns, and market dynamics
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />
                Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 mr-1 inline" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Quick Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Total Market</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">
              ${trendData.reduce((sum, t) => sum + t.currentValue, 0).toLocaleString()}
            </p>
            <p className="text-sm text-emerald-400 mt-1">+12.3% overall</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Growing Sectors</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {trendData.filter(t => t.growthRate > 0).length}
            </p>
            <p className="text-sm text-blue-400 mt-1">of {trendData.length} sectors</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Peak Season</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {trendData.filter(t => t.seasonality === 'peak').length}
            </p>
            <p className="text-sm text-amber-400 mt-1">sectors active</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Opportunities</span>
              <Building className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {trendData.reduce((sum, t) => sum + t.opportunities, 0)}
            </p>
            <p className="text-sm text-purple-400 mt-1">total active</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'chart' ? (
        <div className="space-y-6">
          {/* Sector Performance Chart */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Sector Performance</h3>
            
            <div className="h-80 relative">
              {/* Chart Background */}
              <div className="absolute inset-0 flex items-end justify-between px-4 pb-16">
                {trendData.map((sector, index) => {
                  const maxValue = Math.max(...trendData.map(s => s.currentValue))
                  const height = (sector.currentValue / maxValue) * 240
                  const growthColor = getGrowthColor(sector.growthRate)
                  
                  return (
                    <motion.div
                      key={sector.sector}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}px` }}
                      transition={{ delay: index * 0.1, duration: 0.8 }}
                      className="flex flex-col items-center cursor-pointer"
                      onClick={() => setSelectedSector(
                        selectedSector === sector.sector ? null : sector.sector
                      )}
                    >
                      {/* Bar */}
                      <div className={`w-16 bg-${growthColor}-500/40 border border-${growthColor}-400/60 
                        rounded-t-lg hover:bg-${growthColor}-500/60 transition-all duration-200 
                        relative group`}
                        style={{ height: `${height}px` }}
                      >
                        {/* Growth indicator */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className={`flex items-center px-2 py-1 bg-${growthColor}-500/20 
                            border border-${growthColor}-400/50 rounded text-xs text-${growthColor}-300`}>
                            {sector.growthRate > 0 ? (
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 mr-1" />
                            )}
                            {sector.growthRate.toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Value label */}
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 text-gray-900 px-2 py-1 rounded text-xs font-medium">
                            ${(sector.currentValue / 1000000).toFixed(0)}M
                          </div>
                        </div>
                      </div>
                      
                      {/* Sector label */}
                      <span className="text-xs text-white/60 mt-2 text-center max-w-16">
                        {sector.sector}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-white/40">
                <span>$150M</span>
                <span>$100M</span>
                <span>$50M</span>
                <span>$0</span>
              </div>
            </div>
          </div>

          {/* Sector Detail */}
          {selectedSector && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
            >
              {(() => {
                const sector = trendData.find(s => s.sector === selectedSector)!
                const growthColor = getGrowthColor(sector.growthRate)
                const seasonalityColor = getSeasonalityColor(sector.seasonality)
                const competitionColor = getCompetitionColor(sector.competitionLevel)
                
                return (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">
                        {selectedSector} Sector Analysis
                      </h3>
                      <button
                        onClick={() => setSelectedSector(null)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/60 mb-1">Current Value</p>
                        <p className="text-xl font-bold text-white">
                          ${(sector.currentValue / 1000000).toFixed(0)}M
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/60 mb-1">Growth Rate</p>
                        <p className={`text-xl font-bold text-${growthColor}-400 flex items-center`}>
                          {sector.growthRate > 0 ? (
                            <ArrowUpRight className="w-5 h-5 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 mr-1" />
                          )}
                          {sector.growthRate.toFixed(1)}%
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/60 mb-1">Seasonality</p>
                        <p className={`text-xl font-bold text-${seasonalityColor}-400 capitalize`}>
                          {sector.seasonality}
                        </p>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/60 mb-1">Competition</p>
                        <p className={`text-xl font-bold text-${competitionColor}-400 capitalize`}>
                          {sector.competitionLevel}
                        </p>
                      </div>
                    </div>
                    
                    {/* Quarterly trend */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-4">Quarterly Trend</h4>
                      <div className="flex items-end justify-between h-32">
                        {sector.data.map((quarter, index) => {
                          const maxQuarterValue = Math.max(...sector.data.map(q => q.value))
                          const height = (quarter.value / maxQuarterValue) * 100
                          
                          return (
                            <div key={quarter.period} className="flex flex-col items-center">
                              <div className="bg-blue-500/40 rounded-t w-12 transition-all duration-300"
                                style={{ height: `${height}px` }}>
                              </div>
                              <span className="text-xs text-white/60 mt-2">{quarter.period}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Sector</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Current Value</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Growth Rate</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-white/60">Opportunities</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-white/60">Seasonality</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-white/60">Competition</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-white/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((sector, index) => {
                  const growthColor = getGrowthColor(sector.growthRate)
                  const seasonalityColor = getSeasonalityColor(sector.seasonality)
                  const competitionColor = getCompetitionColor(sector.competitionLevel)
                  
                  return (
                    <motion.tr
                      key={sector.sector}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-t border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{sector.sector}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-white">
                          ${(sector.currentValue / 1000000).toFixed(0)}M
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`font-medium text-${growthColor}-400 flex items-center justify-end`}>
                          {sector.growthRate > 0 ? (
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 mr-1" />
                          )}
                          {sector.growthRate.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-medium text-white">{sector.opportunities}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          bg-${seasonalityColor}-500/20 text-${seasonalityColor}-300 capitalize`}>
                          {sector.seasonality}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          bg-${competitionColor}-500/20 text-${competitionColor}-300 capitalize`}>
                          {sector.competitionLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center mx-auto">
                          Analyze <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Insights */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border 
        border-blue-400/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-100 mb-2">Market Intelligence Insights</h3>
            <div className="space-y-2 text-sm text-blue-100/80">
              <p>• Infrastructure sector showing strongest growth at 27.5%, driven by federal investment programs</p>
              <p>• Professional Services experiencing temporary decline due to budget reassessments</p>
              <p>• Technology sector emerging as high-opportunity, low-competition space for Indigenous businesses</p>
              <p>• Q4 traditionally shows peak activity across most sectors - optimal time for major bids</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}