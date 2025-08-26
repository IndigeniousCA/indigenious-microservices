'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingDown, DollarSign, BarChart3, Calendar,
  MapPin, AlertCircle, Info, ArrowDown, ArrowUp,
  Building, HardHat, Briefcase, Zap, Eye, EyeOff,
  ChevronRight, Download, Share2, Bell, Target,
  Brain, TrendingUp, Shield, Sparkles
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { Line, Bar, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { PriceTransparencyService, PriceTrend, PriceInsight, MarketCompression } from '../services/PriceTransparencyService'
import { useUser } from '@/contexts/user-context'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PriceData {
  category: string;
  currentAvg: number;
  previousAvg: number;
  change: number;
  winRate: number;
  volume: number;
  trend: number[];
}

interface MarketInsight {
  type: 'warning' | 'opportunity' | 'trend';
  message: string;
  impact: string;
  action?: string;
}

const mockPriceData: PriceData[] = [
  {
    category: 'Residential Construction',
    currentAvg: 242,
    previousAvg: 280,
    change: -13.6,
    winRate: 87,
    volume: 156,
    trend: [280, 275, 268, 260, 252, 248, 242]
  },
  {
    category: 'Commercial Construction',
    currentAvg: 315,
    previousAvg: 340,
    change: -7.4,
    winRate: 82,
    volume: 89,
    trend: [340, 335, 330, 325, 320, 318, 315]
  },
  {
    category: 'Legal Services',
    currentAvg: 285,
    previousAvg: 350,
    change: -18.6,
    winRate: 91,
    volume: 234,
    trend: [350, 340, 320, 310, 300, 290, 285]
  },
  {
    category: 'Engineering Services',
    currentAvg: 175,
    previousAvg: 195,
    change: -10.3,
    winRate: 85,
    volume: 112,
    trend: [195, 190, 185, 182, 180, 178, 175]
  }
]

const mockInsights: MarketInsight[] = [
  {
    type: 'opportunity',
    message: 'Residential construction prices trending down 2.3% weekly',
    impact: 'Perfect time to launch housing projects',
    action: 'View residential contractors'
  },
  {
    type: 'warning',
    message: 'Your recent bid was 15% above winning average',
    impact: 'Reduce by $35/sqft to improve win rate',
    action: 'Adjust pricing strategy'
  },
  {
    type: 'trend',
    message: '3 communities bundling projects for 18% savings',
    impact: 'Volume discounts becoming standard',
    action: 'Explore bundling options'
  }
]

interface PriceTransparencyDashboardProps {
  userType?: 'buyer' | 'supplier' | 'both';
  category?: string;
  onPriceAlert?: (threshold: number) => void;
}

export function PriceTransparencyDashboard({
  userType = 'both',
  category,
  onPriceAlert
}: PriceTransparencyDashboardProps) {
  const { user } = useUser()
  const [selectedCategory, setSelectedCategory] = useState(category || 'all')
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const [showDetails, setShowDetails] = useState(true)
  const [priceAlertThreshold, setPriceAlertThreshold] = useState<number | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'volume' | 'winRate'>('price')
  
  // AI-powered states
  const [priceService] = useState(() => new PriceTransparencyService())
  const [aiPriceData, setAiPriceData] = useState<Record<string, PriceTrend>>({})
  const [marketCompressions, setMarketCompressions] = useState<MarketCompression[]>([])
  const [aiInsights, setAiInsights] = useState<PriceInsight[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Fetch AI-powered price data
  useEffect(() => {
    const fetchAIPriceData = async () => {
      setIsLoadingAI(true)
      try {
        // Fetch data for all categories
        const categories = ['Residential Construction', 'Commercial Construction', 'Legal Services', 'Engineering Services']
        const pricePromises = categories.map(cat => 
          priceService.getPriceAnalysis(cat, undefined, timeRange)
        )
        const compressionPromises = categories.map(cat =>
          priceService.calculateMarketCompression(cat, timeRange)
        )
        
        const [priceResults, compressionResults] = await Promise.all([
          Promise.all(pricePromises),
          Promise.all(compressionPromises)
        ])
        
        // Map results
        const priceDataMap: Record<string, PriceTrend> = {}
        priceResults.forEach((result, index) => {
          priceDataMap[categories[index]] = result
        })
        
        setAiPriceData(priceDataMap)
        setMarketCompressions(compressionResults)
        
        // Collect all insights
        const allInsights = priceResults.flatMap(r => r.insights)
        setAiInsights(allInsights.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }))
      } catch (error) {
        logger.error('Error fetching AI price data:', error)
      } finally {
        setIsLoadingAI(false)
      }
    }
    
    fetchAIPriceData()
  }, [timeRange, priceService])

  // Calculate total savings from AI data
  const totalSavings = marketCompressions.reduce((acc, compression) => {
    return acc + compression.savedAmount
  }, 0) || mockPriceData.reduce((acc, data) => {
    const savings = (data.previousAvg - data.currentAvg) * data.volume
    return acc + savings
  }, 0)

  // Chart data for price trends
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: mockPriceData.map((data, index) => ({
      label: data.category,
      data: data.trend,
      borderColor: `hsl(${index * 90}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 90}, 70%, 50%, 0.1)`,
      fill: true,
      tension: 0.4
    }))
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: (context: unknown) => {
            return `${context.dataset.label}: $${context.parsed.y}/sqft`
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
          callback: (value: unknown) => `$${value}`
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  }

  const renderPricingCard = (data: PriceData) => {
    const aiData = aiPriceData[data.category]
    const hasAIData = aiData && !isLoadingAI
    const displayData = hasAIData ? {
      ...data,
      currentAvg: Math.round(aiData.currentAverage),
      previousAvg: Math.round(aiData.previousAverage),
      change: aiData.changePercent
    } : data
    
    const isPositive = displayData.change < 0 // Negative change means prices going down (good for buyers)
    
    return (
      <GlassPanel key={data.category} className="p-6 relative overflow-hidden">
        {hasAIData && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400">AI-Powered</span>
          </div>
        )}
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {displayData.category}
            </h3>
            <p className="text-sm text-white/60">
              {data.volume} active projects
              {hasAIData && aiData.volatility !== 'low' && (
                <span className="ml-2 text-amber-400">
                  • {aiData.volatility} volatility
                </span>
              )}
            </p>
          </div>
          <div className={`flex items-center gap-1 ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            {isPositive ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            <span className="font-semibold">{Math.abs(displayData.change).toFixed(1)}%</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Average Price */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold text-white">
                ${displayData.currentAvg}
              </span>
              <span className="text-sm text-white/50">per sq ft</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">Previously:</span>
              <span className="text-white/40 line-through">${displayData.previousAvg}</span>
              <span className="text-green-400">
                Save ${displayData.previousAvg - displayData.currentAvg}/sqft
              </span>
            </div>
          </div>
          
          {/* AI Predictions */}
          {hasAIData && aiData.predictions.length > 0 && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">AI Prediction</span>
              </div>
              {aiData.predictions.slice(0, 1).map(pred => (
                <div key={pred.timeframe} className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">{pred.timeframe} forecast:</span>
                    <span className={`font-semibold ${
                      pred.predictedPrice > displayData.currentAvg ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      ${pred.predictedPrice.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {(pred.confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Win Rate Indicator */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/60">Win rate at this price</span>
              <span className="text-white font-medium">{data.winRate}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                style={{ width: `${data.winRate}%` }}
              />
            </div>
          </div>

          {/* Mini Trend Chart */}
          <div className="h-16">
            <Line
              data={{
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                  data: data.trend,
                  borderColor: 'rgba(59, 130, 246, 0.8)',
                  borderWidth: 2,
                  pointRadius: 0,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: false },
                  y: { display: false }
                }
              }}
            />
          </div>

          {/* Actions */}
          {userType !== 'buyer' && (
            <GlassButton
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => handleSetPriceAlert(data.category, displayData.currentAvg)}
            >
              <Bell className="w-3 h-3 mr-1" />
              Set Price Alert
            </GlassButton>
          )}
        </div>
      </GlassPanel>
    )
  }

  const renderInsights = () => {
    const displayInsights = aiInsights.length > 0 ? aiInsights : mockInsights
    
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {aiInsights.length > 0 ? (
            <>
              <Brain className="w-5 h-5 text-blue-400" />
              AI Market Intelligence
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-yellow-400" />
              Market Insights
            </>
          )}
        </h3>
        
        {displayInsights.slice(0, 5).map((insight, index) => {
        const icons = {
          warning: AlertCircle,
          opportunity: Target,
          trend: TrendingDown,
          anomaly: Shield
        }
        const colors = {
          warning: 'amber',
          opportunity: 'green',
          trend: 'blue',
          anomaly: 'purple'
        }
        
        const Icon = icons[insight.type] || AlertCircle
        const color = colors[insight.type] || 'blue'
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassPanel className={`p-4 border-l-4 border-${color}-400`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 text-${color}-400 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-white font-medium mb-1">{insight.title || insight.message}</p>
                  <p className="text-sm text-white/60 mb-2">{insight.description || insight.impact}</p>
                  {(insight.recommendations || insight.action) && (
                    <div className="space-y-1">
                      {insight.recommendations ? (
                        insight.recommendations.slice(0, 2).map((rec, idx) => (
                          <button key={idx} className={`text-sm text-${color}-400 hover:text-${color}-300 
                            flex items-center gap-1 transition-colors block`}>
                            {rec}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ))
                      ) : (
                        <button className={`text-sm text-${color}-400 hover:text-${color}-300 
                          flex items-center gap-1 transition-colors`}>
                          {insight.action}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )
      })}
      </div>
    )
  }

  const renderSavingsImpact = () => (
    <GlassPanel className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Platform Impact</h3>
        <span className="text-xs text-white/60">Since launch</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">
            ${(totalSavings / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-white/60">Total Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">17.5%</p>
          <p className="text-sm text-white/60">Avg Cost Reduction</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">12K+</p>
          <p className="text-sm text-white/60">Active Suppliers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-400">3.2x</p>
          <p className="text-sm text-white/60">Bid Competition</p>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <p className="text-sm text-white/80 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Transparent pricing has created a fair, competitive market where quality 
            and efficiency win, not information asymmetry.
          </span>
        </p>
      </div>
    </GlassPanel>
  )

  const handleSetPriceAlert = async (category: string, threshold: number) => {
    if (!user?.id) return
    
    try {
      await priceService.setPriceAlert(
        user.id,
        category,
        threshold,
        threshold > aiPriceData[category]?.currentAverage ? 'above' : 'below'
      )
      onPriceAlert?.(threshold)
    } catch (error) {
      logger.error('Error setting price alert:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            Price Transparency Dashboard
            {isLoadingAI && (
              <div className="inline-flex items-center gap-2 text-sm text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                <span>AI analyzing markets...</span>
              </div>
            )}
          </h2>
          <p className="text-white/60">
            Real-time market pricing across {mockPriceData.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton variant="secondary" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </GlassButton>
          <GlassButton variant="secondary" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </GlassButton>
          <GlassButton variant="primary" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Set Alerts
          </GlassButton>
        </div>
      </div>

      {/* Savings Impact */}
      {renderSavingsImpact()}
      
      {/* AI Market Compression Metrics */}
      {marketCompressions.length > 0 && (
        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">AI Market Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketCompressions.map((compression, index) => (
              <div key={index} className="text-center p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-1">{compression.category}</p>
                <p className="text-2xl font-bold text-blue-400">
                  {compression.compressionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-white/50">price compression</p>
                <p className="text-sm text-green-400 mt-2">
                  ${(compression.savedAmount / 1000000).toFixed(1)}M saved
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
            <p className="text-sm text-white/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
              <span>
                AI analysis shows price transparency has compressed market spreads by an average of{' '}
                {(marketCompressions.reduce((acc, c) => acc + c.compressionRate, 0) / marketCompressions.length).toFixed(1)}%,
                creating a more efficient and fair marketplace for all participants.
              </span>
            </p>
          </div>
        </GlassPanel>
      )}

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['1M', '3M', '6M', '1Y'] as const).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg transition-all ${
              timeRange === range
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Price Trends by Category
        </h3>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </GlassPanel>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockPriceData.map(renderPricingCard)}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {renderInsights()}
        </div>
        
        {/* Quick Stats */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Your Performance
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-white/60 mb-1">Avg vs Market</p>
              <p className="text-2xl font-bold text-green-400">-12.3%</p>
              <p className="text-xs text-white/50">Below market average</p>
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-blue-400">78%</p>
              <p className="text-xs text-white/50">15% above average</p>
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Total Saved</p>
              <p className="text-2xl font-bold text-purple-400">$347K</p>
              <p className="text-xs text-white/50">This year</p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}