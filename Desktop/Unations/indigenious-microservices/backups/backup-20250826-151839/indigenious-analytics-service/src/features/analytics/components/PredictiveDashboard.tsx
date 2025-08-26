/**
 * Predictive Analytics Dashboard
 * ML-powered forecasting and insights for procurement trends
 */

'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Users,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  LineChart,
  Info
} from 'lucide-react'
import { analyticsEngine } from '@/lib/analytics/analytics-engine'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Radar } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PredictiveDashboardProps {
  organizationId?: string
  view?: 'organization' | 'market' | 'community'
}

interface Prediction {
  month: string
  value: number
  confidence: number
  upperBound?: number
  lowerBound?: number
}

interface MarketInsight {
  type: 'opportunity' | 'risk' | 'trend'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  timeframe: string
  confidence: number
}

export default function PredictiveDashboard({ 
  organizationId,
  view = 'organization'
}: PredictiveDashboardProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<'procurement' | 'compliance' | 'impact'>('procurement')
  const [timeHorizon, setTimeHorizon] = useState<3 | 6 | 12>(6)

  // Fetch predictions
  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true)
      try {
        if (organizationId) {
          const result = await analyticsEngine.predictProcurementTrends(
            organizationId,
            timeHorizon
          )
          
          // Add confidence intervals
          const predictionsWithBounds = result.predictions.map(pred => ({
            ...pred,
            upperBound: pred.value * (1 + (1 - pred.confidence) * 0.2),
            lowerBound: pred.value * (1 - (1 - pred.confidence) * 0.2)
          }))
          
          setPredictions(predictionsWithBounds)
          setInsights(result.insights)
          setRecommendations(result.recommendations)
        }

        // Generate market insights
        setMarketInsights(generateMarketInsights())
      } catch (error) {
        logger.error('Error fetching predictions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [organizationId, timeHorizon])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Brain className="h-12 w-12 text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-300">Analyzing patterns and generating predictions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Brain className="h-8 w-8 mr-3 text-purple-400" />
            Predictive Analytics
          </h1>
          <p className="text-gray-400">
            AI-powered insights and forecasting for strategic procurement decisions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="procurement">Procurement Forecast</option>
            <option value="compliance">Compliance Prediction</option>
            <option value="impact">Impact Analysis</option>
          </select>

          {/* Time Horizon */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {([3, 6, 12] as const).map(months => (
              <button
                key={months}
                onClick={() => setTimeHorizon(months)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeHorizon === months
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {months} months
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Predictions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PredictionCard
          title="Procurement Growth"
          value="+15.3%"
          subtitle="Next 6 months"
          trend="up"
          confidence={0.82}
          icon={TrendingUp}
          color="green"
        />
        <PredictionCard
          title="Compliance Risk"
          value="Low"
          subtitle="5.2% projected"
          trend="stable"
          confidence={0.78}
          icon={Target}
          color="blue"
        />
        <PredictionCard
          title="Market Opportunity"
          value="$2.4M"
          subtitle="Identified potential"
          trend="up"
          confidence={0.75}
          icon={Sparkles}
          color="purple"
        />
        <PredictionCard
          title="Supplier Capacity"
          value="87%"
          subtitle="Utilization rate"
          trend="down"
          confidence={0.85}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast Chart */}
        <GlassPanel className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <LineChart className="h-5 w-5 mr-2 text-purple-400" />
            {selectedModel === 'procurement' ? 'Procurement' : 
             selectedModel === 'compliance' ? 'Compliance' : 'Impact'} Forecast
          </h3>
          
          <div className="h-80">
            <Line
              data={{
                labels: predictions.map(p => p.month),
                datasets: [{
                  label: 'Predicted Value',
                  data: predictions.map(p => p.value),
                  borderColor: 'rgba(139, 92, 246, 1)',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointBackgroundColor: 'rgba(139, 92, 246, 1)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 4
                }, {
                  label: 'Upper Bound',
                  data: predictions.map(p => p.upperBound || p.value),
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  borderWidth: 1,
                  borderDash: [5, 5],
                  fill: false,
                  pointRadius: 0
                }, {
                  label: 'Lower Bound',
                  data: predictions.map(p => p.lowerBound || p.value),
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  borderWidth: 1,
                  borderDash: [5, 5],
                  fill: '-1',
                  backgroundColor: 'rgba(139, 92, 246, 0.05)',
                  pointRadius: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        if (context.dataset.label === 'Predicted Value') {
                          const confidence = predictions[context.dataIndex]?.confidence || 0
                          return [
                            `Value: ${formatCurrency(context.parsed.y)}`,
                            `Confidence: ${(confidence * 100).toFixed(0)}%`
                          ]
                        }
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    ticks: {
                      callback: (value) => `$${(value as number / 1000000).toFixed(1)}M`,
                      color: 'rgba(255, 255, 255, 0.6)'
                    }
                  },
                  x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                  }
                }
              }}
            />
          </div>

          {/* Confidence Indicator */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Model Accuracy</div>
              <div className="text-xl font-semibold text-white">92.3%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Data Points</div>
              <div className="text-xl font-semibold text-white">1.2K</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Last Updated</div>
              <div className="text-xl font-semibold text-white">2h ago</div>
            </div>
          </div>
        </GlassPanel>

        {/* AI Insights */}
        <GlassPanel>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
            AI Insights
          </h3>
          
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <Zap className="h-3 w-3 text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-300">{insight}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Model Performance
            </h4>
            <div className="space-y-2">
              <PerformanceMetric label="Precision" value={94} />
              <PerformanceMetric label="Recall" value={89} />
              <PerformanceMetric label="F1 Score" value={91} />
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Market Intelligence */}
      <GlassPanel>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-purple-400" />
          Market Intelligence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketInsights.map((insight, index) => (
            <MarketInsightCard key={index} {...insight} />
          ))}
        </div>
      </GlassPanel>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategic Recommendations */}
        <GlassPanel>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-400" />
            Strategic Recommendations
          </h3>
          
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <RecommendationCard
                key={index}
                recommendation={rec}
                priority={index < 2 ? 'high' : 'medium'}
                index={index}
              />
            ))}
          </div>
        </GlassPanel>

        {/* Risk Analysis */}
        <GlassPanel>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-400" />
            Risk Analysis
          </h3>

          <div className="h-64">
            <Radar
              data={{
                labels: [
                  'Supplier Risk',
                  'Market Volatility',
                  'Compliance Risk',
                  'Capacity Risk',
                  'Economic Risk',
                  'Seasonal Risk'
                ],
                datasets: [{
                  label: 'Current Risk Level',
                  data: [25, 40, 15, 35, 45, 60],
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 1)',
                  borderWidth: 2,
                  pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(239, 68, 68, 1)'
                }, {
                  label: 'Acceptable Threshold',
                  data: [50, 50, 50, 50, 50, 50],
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderColor: 'rgba(34, 197, 94, 0.5)',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  pointRadius: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: 'white', padding: 10 }
                  }
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      stepSize: 25,
                      color: 'rgba(255, 255, 255, 0.6)'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { 
                      color: 'white',
                      font: { size: 11 }
                    }
                  }
                }
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-400">Low Risk (&lt;30)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-gray-400">Medium Risk (30-50)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-400">High Risk (&gt;50)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-400">Critical (&gt;75)</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Opportunity Pipeline */}
      <GlassPanel>
        <h3 className="text-lg font-semibold text-white mb-6">
          Opportunity Pipeline
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Opportunity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Category</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Est. Value</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Probability</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Timeline</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Infrastructure Modernization',
                  category: 'Construction',
                  value: 850000,
                  probability: 78,
                  timeline: 'Q2 2025'
                },
                {
                  name: 'IT Services Consolidation',
                  category: 'Technology',
                  value: 420000,
                  probability: 85,
                  timeline: 'Q1 2025'
                },
                {
                  name: 'Supply Chain Optimization',
                  category: 'Logistics',
                  value: 320000,
                  probability: 65,
                  timeline: 'Q3 2025'
                },
                {
                  name: 'Professional Services',
                  category: 'Consulting',
                  value: 280000,
                  probability: 92,
                  timeline: 'Q1 2025'
                }
              ].map((opp, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="text-white font-medium">{opp.name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-400">{opp.category}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-white font-medium">{formatCurrency(opp.value)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-[100px] h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            opp.probability >= 80 ? 'bg-green-500' :
                            opp.probability >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${opp.probability}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-400">{opp.probability}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-400">{opp.timeline}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <GlassButton variant="secondary" size="sm">
                      <ArrowUpRight className="h-4 w-4" />
                    </GlassButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  )
}

// Helper Components

function PredictionCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  confidence, 
  icon: Icon, 
  color 
}: {
  title: string
  value: string
  subtitle: string
  trend: 'up' | 'down' | 'stable'
  confidence: number
  icon: any
  color: string
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/20'
  }

  const trendIcons = {
    up: ArrowUpRight,
    down: ArrowDownRight,
    stable: ArrowUpRight
  }

  const TrendIcon = trendIcons[trend]

  return (
    <GlassPanel>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`flex items-center text-sm ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          <TrendIcon className={`h-4 w-4 ${trend === 'stable' ? 'rotate-0' : ''}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400 mb-3">{subtitle}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Confidence</span>
        <div className="flex items-center">
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden mr-2">
            <div 
              className="h-full bg-purple-500"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-gray-400">{(confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </GlassPanel>
  )
}

function MarketInsightCard({ 
  type, 
  title, 
  description, 
  impact, 
  timeframe, 
  confidence 
}: MarketInsight) {
  const typeIcons = {
    opportunity: Sparkles,
    risk: AlertTriangle,
    trend: TrendingUp
  }

  const typeColors = {
    opportunity: 'text-green-400 bg-green-500/20',
    risk: 'text-red-400 bg-red-500/20',
    trend: 'text-blue-400 bg-blue-500/20'
  }

  const impactColors = {
    high: 'text-red-400',
    medium: 'text-amber-400',
    low: 'text-green-400'
  }

  const Icon = typeIcons[type]

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-purple-400/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${typeColors[type]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`text-xs font-medium ${impactColors[impact]}`}>
          {impact.toUpperCase()} IMPACT
        </span>
      </div>
      <h4 className="text-white font-medium mb-2">{title}</h4>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{timeframe}</span>
        <div className="flex items-center">
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mr-2">
            <div 
              className="h-full bg-purple-500"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-gray-400">{(confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ 
  recommendation, 
  priority, 
  index 
}: {
  recommendation: string
  priority: 'high' | 'medium' | 'low'
  index: number
}) {
  const priorityColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-green-500/20 text-green-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/10"
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${priorityColors[priority]}`}>
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-300">{recommendation}</p>
        <div className="flex items-center mt-2 text-xs text-gray-500">
          <Clock className="h-3 w-3 mr-1" />
          <span>Implement within {priority === 'high' ? '1 week' : priority === 'medium' ? '1 month' : '3 months'}</span>
        </div>
      </div>
    </motion.div>
  )
}

function PerformanceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center">
        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden mr-2">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs text-white font-medium">{value}%</span>
      </div>
    </div>
  )
}

// Generate mock market insights
function generateMarketInsights(): MarketInsight[] {
  return [
    {
      type: 'opportunity',
      title: 'Construction Boom Expected',
      description: 'Federal infrastructure spending will increase Indigenous construction opportunities by 40%',
      impact: 'high',
      timeframe: 'Next 6 months',
      confidence: 0.85
    },
    {
      type: 'risk',
      title: 'Supply Chain Constraints',
      description: 'Material shortages may impact delivery timelines for Q2 projects',
      impact: 'medium',
      timeframe: 'Q2 2025',
      confidence: 0.72
    },
    {
      type: 'trend',
      title: 'Digital Services Growth',
      description: 'IT and digital transformation projects growing 25% year-over-year',
      impact: 'high',
      timeframe: 'Ongoing',
      confidence: 0.90
    },
    {
      type: 'opportunity',
      title: 'Green Energy Transition',
      description: 'Clean energy projects prioritizing Indigenous partnerships',
      impact: 'high',
      timeframe: 'Next 12 months',
      confidence: 0.78
    },
    {
      type: 'risk',
      title: 'Seasonal Slowdown',
      description: 'Winter conditions may delay northern community projects',
      impact: 'low',
      timeframe: 'Dec-Mar',
      confidence: 0.95
    },
    {
      type: 'trend',
      title: 'Capacity Building Focus',
      description: 'Increased demand for training and development services',
      impact: 'medium',
      timeframe: 'Next 9 months',
      confidence: 0.82
    }
  ]
}