// Model Performance Component
// AI model health monitoring and performance metrics

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, TrendingUp, Activity, CheckCircle, AlertTriangle,
  Clock, Cpu, Database, Zap, BarChart3, Info, Settings,
  RefreshCw, Download, Calendar, Target, Award
} from 'lucide-react'
import { useAI } from '../hooks/useAI'

interface ModelPerformanceProps {
  userId: string
  userRole: string
}

interface ModelMetric {
  label: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
}

export function ModelPerformance({ userId, userRole }: ModelPerformanceProps) {
  const [selectedModel, setSelectedModel] = useState<string>('bid-matcher')
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [showDetails, setShowDetails] = useState(false)

  const { modelPerformance } = useAI({ userId })

  // Get performance for selected model
  const performance = modelPerformance.get(selectedModel)

  // Model information
  const modelInfo = {
    'bid-matcher': {
      name: 'Bid Matcher',
      description: 'Matches RFQs with qualified businesses using deep learning',
      version: 'v2.1.0',
      type: 'Neural Network',
      lastUpdated: '2024-01-15'
    },
    'price-optimizer': {
      name: 'Price Optimizer',
      description: 'Optimizes bid pricing using market analysis',
      version: 'v1.8.2',
      type: 'XGBoost',
      lastUpdated: '2024-01-10'
    },
    'document-analyzer': {
      name: 'Document Analyzer',
      description: 'NLP model for document processing and entity extraction',
      version: 'v3.0.1',
      type: 'BERT-based',
      lastUpdated: '2024-01-20'
    },
    'anomaly-detector': {
      name: 'Anomaly Detector',
      description: 'Detects unusual patterns in bidding and pricing',
      version: 'v1.5.0',
      type: 'Isolation Forest',
      lastUpdated: '2024-01-12'
    }
  }

  // Calculate performance metrics
  const metrics = useMemo(() => {
    if (!performance) return []

    const metrics: ModelMetric[] = [
      {
        label: 'Accuracy',
        value: Math.round(performance.metrics.accuracy * 100),
        unit: '%',
        trend: performance.metrics.accuracy > 0.85 ? 'up' : 'down',
        status: performance.metrics.accuracy > 0.85 ? 'good' : 
                performance.metrics.accuracy > 0.75 ? 'warning' : 'critical'
      },
      {
        label: 'Precision',
        value: Math.round(performance.metrics.precision * 100),
        unit: '%',
        trend: performance.metrics.precision > 0.80 ? 'up' : 'down',
        status: performance.metrics.precision > 0.80 ? 'good' : 'warning'
      },
      {
        label: 'Recall',
        value: Math.round(performance.metrics.recall * 100),
        unit: '%',
        trend: performance.metrics.recall > 0.82 ? 'up' : 'down',
        status: performance.metrics.recall > 0.82 ? 'good' : 'warning'
      },
      {
        label: 'F1 Score',
        value: Math.round(performance.metrics.f1Score * 100),
        unit: '%',
        trend: 'stable',
        status: performance.metrics.f1Score > 0.80 ? 'good' : 'warning'
      },
      {
        label: 'Latency',
        value: performance.usage.avgLatency,
        unit: 'ms',
        trend: performance.usage.avgLatency < 150 ? 'down' : 'up',
        status: performance.usage.avgLatency < 150 ? 'good' : 
                performance.usage.avgLatency < 300 ? 'warning' : 'critical'
      },
      {
        label: 'Predictions',
        value: performance.usage.predictions,
        unit: '',
        trend: 'up',
        status: 'good'
      }
    ]

    return metrics
  }, [performance])

  // Get metric color
  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'emerald'
      case 'warning': return 'amber'
      case 'critical': return 'red'
      default: return 'gray'
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑'
      case 'down': return '↓'
      default: return '→'
    }
  }

  // Mock training history
  const trainingHistory = [
    { date: '2024-01-15', accuracy: 87, loss: 0.23 },
    { date: '2024-01-10', accuracy: 85, loss: 0.28 },
    { date: '2024-01-05', accuracy: 82, loss: 0.35 },
    { date: '2023-12-28', accuracy: 78, loss: 0.42 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border 
        border-blue-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Model Performance Monitor</h2>
              <p className="text-white/60">AI system health and performance metrics</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
              {['24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as unknown)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    timeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white/60 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(modelInfo).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedModel(key)}
              className={`p-3 rounded-lg border transition-all ${
                selectedModel === key
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                  : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
              }`}
            >
              <p className="font-medium text-sm">{info.name}</p>
              <p className="text-xs opacity-80">{info.version}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Model Details */}
      {selectedModel && modelInfo[selectedModel] && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {modelInfo[selectedModel].name}
              </h3>
              <p className="text-white/70 text-sm mb-3">
                {modelInfo[selectedModel].description}
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-white/60">Type:</span>
                  <span className="text-white ml-2">{modelInfo[selectedModel].type}</span>
                </div>
                <div>
                  <span className="text-white/60">Version:</span>
                  <span className="text-white ml-2">{modelInfo[selectedModel].version}</span>
                </div>
                <div>
                  <span className="text-white/60">Updated:</span>
                  <span className="text-white ml-2">{modelInfo[selectedModel].lastUpdated}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Info className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-white/80 font-medium mb-2">Model Architecture</h4>
                  <ul className="space-y-1 text-white/60">
                    <li>• Input Features: 24 dimensions</li>
                    <li>• Hidden Layers: 3 (256, 128, 64 neurons)</li>
                    <li>• Output: Binary classification / Regression</li>
                    <li>• Activation: ReLU with dropout (0.3)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white/80 font-medium mb-2">Training Configuration</h4>
                  <ul className="space-y-1 text-white/60">
                    <li>• Dataset: 50,000 samples</li>
                    <li>• Training Time: 4.2 hours</li>
                    <li>• Hardware: GPU (Tesla V100)</li>
                    <li>• Framework: TensorFlow 2.10</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">{metric.label}</span>
                <span className={`text-${getMetricColor(metric.status)}-400 text-sm`}>
                  {getTrendIcon(metric.trend)}
                </span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className={`text-2xl font-bold text-${getMetricColor(metric.status)}-400`}>
                  {metric.value}
                </span>
                <span className="text-white/60 text-sm">{metric.unit}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Usage Statistics */}
      {performance && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-white/80 text-sm font-medium mb-3">Predictions</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Total Predictions</span>
                  <span className="text-white font-medium">{performance.usage.predictions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Errors</span>
                  <span className="text-red-400 font-medium">{performance.usage.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Success Rate</span>
                  <span className="text-emerald-400 font-medium">
                    {((1 - performance.usage.errors / performance.usage.predictions) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white/80 text-sm font-medium mb-3">Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Avg Latency</span>
                  <span className="text-white font-medium">{performance.usage.avgLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">P95 Latency</span>
                  <span className="text-amber-400 font-medium">{Math.round(performance.usage.avgLatency * 1.5)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Throughput</span>
                  <span className="text-blue-400 font-medium">
                    {Math.round(1000 / performance.usage.avgLatency)}/sec
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white/80 text-sm font-medium mb-3">User Feedback</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Positive</span>
                  <span className="text-emerald-400 font-medium">{performance.usage.feedback.positive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Negative</span>
                  <span className="text-red-400 font-medium">{performance.usage.feedback.negative}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Corrected</span>
                  <span className="text-amber-400 font-medium">{performance.usage.feedback.corrected}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Drift Detection */}
      {performance && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Model Health</h3>
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
              performance.drift.detected
                ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
            }`}>
              {performance.drift.detected ? 'Drift Detected' : 'Healthy'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white/80 text-sm font-medium mb-3">Performance Trend</h4>
              <div className="space-y-2">
                {trainingHistory.map((history, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/60 text-sm">{history.date}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-emerald-400 text-sm">{history.accuracy}%</span>
                      <span className="text-red-400 text-sm">Loss: {history.loss}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white/80 text-sm font-medium mb-3">Recommendations</h4>
              <div className="space-y-2">
                {performance.drift.detected ? (
                  <>
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                      <p className="text-white/70 text-sm">
                        Model performance has degraded. Consider retraining with recent data.
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                      <p className="text-white/70 text-sm">
                        Feature distribution has shifted by {performance.drift.magnitude || 5}%.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                      <p className="text-white/70 text-sm">
                        Model is performing within expected parameters.
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                      <p className="text-white/70 text-sm">
                        Next scheduled retraining in 14 days.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {userRole === 'admin' && (
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center space-x-3">
              <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                border-blue-400/50 rounded-lg text-blue-200 text-sm flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>Retrain Model</span>
              </button>
              <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border 
                border-purple-400/50 rounded-lg text-purple-200 text-sm flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Update Dataset</span>
              </button>
              <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                border-emerald-400/50 rounded-lg text-emerald-200 text-sm flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}