'use client'

/**
 * Investment Dashboard
 * Real-time view of how platform intelligence converts to 10-100x returns
 * Shows the money machine in action
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, DollarSign, Activity, Brain,
  Zap, Target, PieChart, BarChart3, 
  ArrowUpRight, Clock, Shield, AlertTriangle,
  CheckCircle, Info, ChevronRight, Eye
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { CashflowReinvestmentService } from '../services/CashflowReinvestmentService'
import { IntelligenceInvestmentService } from '../services/IntelligenceInvestmentService'
import { toast } from 'sonner'

interface DashboardMetrics {
  cashflow: {
    available: number
    reserved: number
    deployed: number
    pending: number
  }
  portfolio: {
    totalValue: number
    totalCost: number
    unrealizedGains: number
    realizedGains: number
    averageMultiple: number
  }
  opportunities: {
    identified: number
    inDueDiligence: number
    approved: number
    totalPotential: number
  }
  performance: {
    monthlyReturn: number
    yearlyReturn: number
    successRate: number
    bestPerformer: {
      name: string
      multiple: number
    }
  }
}

export function InvestmentDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    cashflow: {
      available: 2500000,
      reserved: 3000000, // 6 months runway
      deployed: 12000000,
      pending: 800000
    },
    portfolio: {
      totalValue: 85000000,
      totalCost: 12000000,
      unrealizedGains: 73000000,
      realizedGains: 15000000,
      averageMultiple: 7.1
    },
    opportunities: {
      identified: 23,
      inDueDiligence: 5,
      approved: 2,
      totalPotential: 180000000
    },
    performance: {
      monthlyReturn: 28.5,
      yearlyReturn: 608,
      successRate: 0.89,
      bestPerformer: {
        name: 'Northern Mining Corp',
        multiple: 47.3
      }
    }
  })
  
  const [selectedView, setSelectedView] = useState<'overview' | 'opportunities' | 'portfolio' | 'cashflow'>('overview')
  const [autoInvestEnabled, setAutoInvestEnabled] = useState(true)
  
  // Real-time opportunity feed
  const [liveOpportunities, setLiveOpportunities] = useState([
    {
      id: '1',
      source: 'Escrow Intelligence',
      target: 'Clearwater Construction',
      thesis: 'Won $180M Ring of Fire contract (not public)',
      multiple: '15-20x',
      confidence: 0.92,
      timeWindow: '2-3 weeks',
      status: 'analyzing'
    },
    {
      id: '2',
      source: 'Bonding Pattern',
      target: 'Land parcel near James Bay',
      thesis: 'Major infrastructure announcement imminent',
      multiple: '25-40x',
      confidence: 0.85,
      timeWindow: '4-6 weeks',
      status: 'approved'
    }
  ])
  
  // Portfolio composition chart
  const portfolioChart = {
    labels: ['Mining Equity', 'Land', 'Indigenous JVs', 'Contractor Equity', 'Debt', 'Cash'],
    datasets: [{
      data: [35, 25, 20, 10, 5, 5],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderWidth: 0
    }]
  }
  
  // Returns over time
  const returnsChart = {
    labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Portfolio Value',
      data: [12, 18, 28, 42, 65, 85],
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      fill: true
    }, {
      label: 'Invested Capital',
      data: [12, 12, 12, 12, 12, 12],
      borderColor: 'rgb(156, 163, 175)',
      borderDash: [5, 5],
      tension: 0
    }]
  }
  
  const handleAutoInvest = async () => {
    setAutoInvestEnabled(!autoInvestEnabled)
    toast.success(
      autoInvestEnabled 
        ? 'Auto-investment paused' 
        : 'Auto-investment enabled - AI will deploy capital automatically'
    )
  }
  
  const handleExecuteOpportunity = async (oppId: string) => {
    const opp = liveOpportunities.find(o => o.id === oppId)
    if (!opp) return
    
    toast.success(
      <div>
        <p className="font-semibold">Investment Executing</p>
        <p className="text-sm">{opp.target} - Expected {opp.multiple} return</p>
      </div>
    )
    
    // Update status
    setLiveOpportunities(prev => 
      prev.map(o => o.id === oppId ? { ...o, status: 'executing' } : o)
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Strategic Investment Command Center
            </h1>
            <p className="text-white/60">
              Converting platform intelligence into exponential returns
            </p>
          </div>
          
          <GlassButton
            variant={autoInvestEnabled ? 'primary' : 'secondary'}
            onClick={handleAutoInvest}
          >
            <Brain className="w-5 h-5 mr-2" />
            {autoInvestEnabled ? 'Auto-Invest ON' : 'Auto-Invest OFF'}
          </GlassButton>
        </div>
      </motion.div>
      
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-green-400" />
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
              +{metrics.portfolio.averageMultiple.toFixed(1)}x
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            ${(metrics.portfolio.totalValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-white/60">Portfolio Value</p>
          <div className="mt-2 text-xs text-green-400">
            ${(metrics.portfolio.unrealizedGains / 1000000).toFixed(1)}M unrealized
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-blue-400" />
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.performance.monthlyReturn}%
          </p>
          <p className="text-sm text-white/60">Monthly Return</p>
          <div className="mt-2 text-xs text-blue-400">
            {metrics.performance.yearlyReturn}% annualized
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-purple-400" />
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.opportunities.identified}
          </p>
          <p className="text-sm text-white/60">Live Opportunities</p>
          <div className="mt-2 text-xs text-purple-400">
            ${(metrics.opportunities.totalPotential / 1000000).toFixed(0)}M potential
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/30">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl">🚀</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.performance.bestPerformer.multiple}x
          </p>
          <p className="text-sm text-white/60">Best Performer</p>
          <div className="mt-2 text-xs text-yellow-400">
            {metrics.performance.bestPerformer.name}
          </div>
        </GlassPanel>
      </motion.div>
      
      {/* View Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 mb-6"
      >
        {(['overview', 'opportunities', 'portfolio', 'cashflow'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`px-4 py-2 rounded-lg capitalize transition-all ${
              selectedView === view
                ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {view}
          </button>
        ))}
      </motion.div>
      
      {/* Main Content */}
      {selectedView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Portfolio Performance */}
          <GlassPanel className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Portfolio Performance
            </h2>
            <div className="h-64">
              <Line 
                data={returnsChart} 
                options={{
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
                }}
              />
            </div>
          </GlassPanel>
          
          {/* Portfolio Composition */}
          <GlassPanel className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Portfolio Composition
            </h2>
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48">
                <Doughnut 
                  data={portfolioChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    }
                  }}
                />
              </div>
              <div className="ml-8 space-y-2">
                {portfolioChart.labels.map((label, index) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: portfolioChart.datasets[0].backgroundColor[index] }}
                    />
                    <span className="text-white/80">{label}</span>
                    <span className="text-white font-medium ml-auto">
                      {portfolioChart.datasets[0].data[index]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}
      
      {selectedView === 'opportunities' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Intelligence-Driven Opportunities
            </h2>
            <span className="text-sm text-white/60">
              Real-time from platform data
            </span>
          </div>
          
          {liveOpportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <GlassPanel className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        opp.status === 'approved' ? 'bg-green-500/20' :
                        opp.status === 'executing' ? 'bg-blue-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        <Brain className={`w-6 h-6 ${
                          opp.status === 'approved' ? 'text-green-400' :
                          opp.status === 'executing' ? 'text-blue-400' :
                          'text-purple-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {opp.target}
                            </h3>
                            <p className="text-sm text-white/60">
                              Source: {opp.source}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-400">
                              {opp.multiple}
                            </p>
                            <p className="text-xs text-white/60">Expected Return</p>
                          </div>
                        </div>
                        
                        <p className="text-white/80 mb-3">
                          {opp.thesis}
                        </p>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                style={{ width: `${opp.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-white/60">
                              {(opp.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>{opp.timeWindow}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    {opp.status === 'analyzing' && (
                      <GlassButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleExecuteOpportunity(opp.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Execute
                      </GlassButton>
                    )}
                    {opp.status === 'approved' && (
                      <div className="text-center">
                        <div className="text-green-400 mb-2">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-green-400">Approved</span>
                      </div>
                    )}
                    {opp.status === 'executing' && (
                      <div className="text-center">
                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs text-blue-400">Executing</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Intelligence Details */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                    <Info className="w-3 h-3" />
                    Intelligence Breakdown
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-white/50 text-xs mb-1">Data Points</p>
                      <p className="text-white">
                        {opp.source === 'Escrow Intelligence' ? '12 contracts' : '47 bonds'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-1">Pattern Match</p>
                      <p className="text-white">
                        {opp.confidence > 0.9 ? 'Strong' : 'Moderate'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-1">Risk Level</p>
                      <p className={opp.confidence > 0.85 ? 'text-green-400' : 'text-yellow-400'}>
                        {opp.confidence > 0.85 ? 'Low' : 'Medium'}
                      </p>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {selectedView === 'cashflow' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassPanel className="p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              Cashflow Reinvestment Engine
            </h2>
            
            {/* Cashflow Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-3 relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="16"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#gradient-cash)"
                      strokeWidth="16"
                      strokeDasharray={`${2 * Math.PI * 56 * 0.7} ${2 * Math.PI * 56}`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient-cash">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <p className="text-2xl font-bold text-white">70%</p>
                      <p className="text-xs text-white/60">Deployed</p>
                    </div>
                  </div>
                </div>
                <p className="text-white font-medium">Fee Reinvestment</p>
                <p className="text-sm text-white/60 mt-1">
                  ${(metrics.cashflow.deployed / 1000000).toFixed(1)}M deployed
                </p>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <ArrowUpRight className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{metrics.portfolio.averageMultiple.toFixed(1)}x</p>
                  <p className="text-sm text-white/60">Average Return</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-3 relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="16"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#gradient-returns)"
                      strokeWidth="16"
                      strokeDasharray={`${2 * Math.PI * 56 * 0.89} ${2 * Math.PI * 56}`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient-returns">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <p className="text-2xl font-bold text-white">89%</p>
                      <p className="text-xs text-white/60">Success</p>
                    </div>
                  </div>
                </div>
                <p className="text-white font-medium">Hit Rate</p>
                <p className="text-sm text-white/60 mt-1">
                  {Math.floor(metrics.performance.successRate * 100)}% profitable
                </p>
              </div>
            </div>
            
            {/* Reinvestment Rules */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Active Reinvestment Rules
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-white/80">Deploy 70% of excess cash above 6-month reserve</span>
                  </div>
                  <span className="text-xs text-green-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-white/80">Max 15% portfolio concentration per investment</span>
                  </div>
                  <span className="text-xs text-green-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-white/80">Take profit at 10x, stop loss at -50%</span>
                  </div>
                  <span className="text-xs text-green-400">Active</span>
                </div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  )
}