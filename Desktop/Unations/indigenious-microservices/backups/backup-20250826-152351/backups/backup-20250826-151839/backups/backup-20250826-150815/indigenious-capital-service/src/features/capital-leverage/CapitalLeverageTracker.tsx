'use client'

/**
 * Capital Leverage Tracker
 * Shows how government dollars unlock private capital
 * The key metric for Mark Carney pitch: "Turn billions into trillions"
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, DollarSign, Building2, Banknote,
  ArrowUpRight, BarChart3, PieChart, Activity,
  Globe, Zap, Award, ChevronRight
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger'

interface LeverageMetrics {
  totalGovernmentFunding: number
  totalPrivateCapital: number
  leverageRatio: number
  projectCount: number
  
  bySource: {
    banks: number
    pensionFunds: number
    privateEquity: number
    ventureCaptial: number
    other: number
  }
  
  byProject: Array<{
    name: string
    location: string
    governmentFunding: number
    privateCapital: number
    ratio: number
    status: 'active' | 'completed'
  }>
  
  trends: {
    monthly: Array<{
      month: string
      government: number
      private: number
      ratio: number
    }>
  }
}

export function CapitalLeverageTracker() {
  const [metrics, setMetrics] = useState<LeverageMetrics>({
    totalGovernmentFunding: 125000000,
    totalPrivateCapital: 687500000,
    leverageRatio: 5.5,
    projectCount: 47,
    
    bySource: {
      banks: 412500000,
      pensionFunds: 137500000,
      privateEquity: 87500000,
      ventureCaptial: 37500000,
      other: 12500000
    },
    
    byProject: [
      {
        name: 'Ring of Fire Infrastructure',
        location: 'Northern Ontario',
        governmentFunding: 50000000,
        privateCapital: 350000000,
        ratio: 7.0,
        status: 'active'
      },
      {
        name: 'Six Nations Solar Farm',
        location: 'Southern Ontario',
        governmentFunding: 15000000,
        privateCapital: 75000000,
        ratio: 5.0,
        status: 'active'
      },
      {
        name: 'Coastal LNG Terminal',
        location: 'British Columbia',
        governmentFunding: 35000000,
        privateCapital: 175000000,
        ratio: 5.0,
        status: 'completed'
      }
    ],
    
    trends: {
      monthly: [
        { month: 'Oct', government: 10, private: 35, ratio: 3.5 },
        { month: 'Nov', government: 15, private: 60, ratio: 4.0 },
        { month: 'Dec', government: 20, private: 90, ratio: 4.5 },
        { month: 'Jan', government: 25, private: 125, ratio: 5.0 },
        { month: 'Feb', government: 30, private: 165, ratio: 5.5 },
        { month: 'Mar', government: 35, private: 210, ratio: 6.0 }
      ]
    }
  })
  
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '1Y'>('3M')
  
  // Chart configurations
  const leverageTrendChart = {
    labels: metrics.trends.monthly.map(t => t.month),
    datasets: [
      {
        label: 'Government Funding',
        data: metrics.trends.monthly.map(t => t.government),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Private Capital',
        data: metrics.trends.monthly.map(t => t.private),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  }
  
  const sourceBreakdownChart = {
    labels: ['Banks', 'Pension Funds', 'Private Equity', 'Venture Capital', 'Other'],
    datasets: [{
      data: Object.values(metrics.bySource),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderWidth: 0
    }]
  }
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: 'rgba(255, 255, 255, 0.8)' }
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
          callback: (value: unknown) => `$${value}M`
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  }
  
  // Log to blockchain for transparency
  useEffect(() => {
    const logLeverageMetrics = async () => {
      await indigenousLedger.log(
        'capital.leverage.tracked',
        'info',
        'Capital leverage metrics updated',
        {
          governmentFunding: metrics.totalGovernmentFunding,
          privateCapital: metrics.totalPrivateCapital,
          ratio: metrics.leverageRatio,
          timestamp: new Date()
        }
      )
    }
    
    logLeverageMetrics()
  }, [metrics])
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Capital Leverage Dashboard
        </h1>
        <p className="text-white/60">
          Tracking how public investment unlocks private capital
        </p>
      </motion.div>
      
      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Banknote className="w-8 h-8 text-blue-400" />
            <span className="text-xs text-white/50">Government</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            ${(metrics.totalGovernmentFunding / 1000000).toFixed(0)}M
          </p>
          <p className="text-sm text-white/60">Public Investment</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-green-400" />
            <span className="text-xs text-white/50">Private</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            ${(metrics.totalPrivateCapital / 1000000).toFixed(0)}M
          </p>
          <p className="text-sm text-white/60">Capital Unlocked</p>
        </GlassPanel>
        
        <GlassPanel className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/30">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {metrics.leverageRatio.toFixed(1)}x
          </p>
          <p className="text-sm text-white/60">Leverage Ratio</p>
          <div className="mt-2 text-xs text-purple-300">
            Every $1 attracts ${metrics.leverageRatio.toFixed(1)}
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-amber-400" />
            <span className="text-xs text-white/50">Active</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {metrics.projectCount}
          </p>
          <p className="text-sm text-white/60">Projects</p>
        </GlassPanel>
      </motion.div>
      
      {/* Leverage Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        <div className="lg:col-span-2">
          <GlassPanel className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Leverage Trend
              </h2>
              <div className="flex gap-2">
                {(['1M', '3M', '1Y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedTimeframe(period)}
                    className={`px-3 py-1 text-xs rounded-lg transition-all ${
                      selectedTimeframe === period
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-64">
              <Line data={leverageTrendChart} options={chartOptions} />
            </div>
            
            {/* Trend Summary */}
            <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-300">
                    Leverage Increasing
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    From 3.5x to 6.0x in {selectedTimeframe}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    +71%
                  </p>
                  <p className="text-xs text-white/60">Growth</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
        
        {/* Capital Sources */}
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Capital Sources
          </h2>
          
          <div className="h-48 mb-4">
            <Doughnut 
              data={sourceBreakdownChart} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    display: false
                  }
                }
              }} 
            />
          </div>
          
          <div className="space-y-2">
            {Object.entries(metrics.bySource).map(([source, amount], index) => {
              const colors = [
                'blue', 'green', 'purple', 'yellow', 'gray'
              ]
              const labels = [
                'Banks', 'Pension Funds', 'Private Equity', 'VC', 'Other'
              ]
              
              return (
                <div key={source} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${colors[index]}-400`} />
                    <span className="text-white/80">{labels[index]}</span>
                  </div>
                  <span className="text-white font-medium">
                    ${(amount / 1000000).toFixed(0)}M
                  </span>
                </div>
              )
            })}
          </div>
        </GlassPanel>
      </motion.div>
      
      {/* Top Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          Top Leveraged Projects
        </h2>
        
        <div className="space-y-3">
          {metrics.byProject.map((project, index) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <GlassPanel className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-white">
                          {project.name}
                        </h3>
                        <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                          <Globe className="w-3 h-3" />
                          {project.location}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-white/50 text-xs">Government</p>
                        <p className="text-white font-medium">
                          ${(project.governmentFunding / 1000000).toFixed(0)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Private</p>
                        <p className="text-white font-medium">
                          ${(project.privateCapital / 1000000).toFixed(0)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Leverage</p>
                        <p className="text-purple-400 font-bold">
                          {project.ratio.toFixed(1)}x
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/40 ml-4" />
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* The Pitch */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <GlassPanel className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-400/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                The Carney Opportunity
              </h3>
              <p className="text-white/80 mb-3">
                Current platform demonstrates {metrics.leverageRatio.toFixed(1)}x leverage on government 
                investment. Scaled nationally, $10B in public funding could unlock $50-70B in private 
                capital for Indigenous-led development.
              </p>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="text-white/50">Current Impact</p>
                  <p className="text-xl font-bold text-green-400">
                    ${((metrics.totalGovernmentFunding + metrics.totalPrivateCapital) / 1000000).toFixed(0)}M
                  </p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-white/40" />
                <div className="text-sm">
                  <p className="text-white/50">Potential at Scale</p>
                  <p className="text-xl font-bold text-purple-400">
                    $80B+
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  )
}