// Digital Twin Component
// Real-time 3D visualization of business metrics and operations

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Box, Activity, TrendingUp, AlertTriangle, CheckCircle,
  Settings, Maximize, Eye, Layers, Cpu, Gauge, BarChart3,
  Clock, Zap, Shield, Building, Package, Users, DollarSign,
  RefreshCw, Play, Pause, Download, Share, Info
} from 'lucide-react'
import { DigitalTwin, DataStream, TwinAlert, Prediction } from '../types/nextgen.types'

interface MetricCard {
  id: string
  title: string
  value: number | string
  unit: string
  trend: number
  status: 'good' | 'warning' | 'critical'
  icon: any
  color: string
}

export function DigitalTwinComponent() {
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'metrics' | 'predictions' | 'alerts'>('overview')
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Mock digital twin data
  const businessTwin: DigitalTwin = {
    id: 'twin-1',
    entityType: 'business',
    entityId: 'business-123',
    name: 'Cardinal Construction Operations',
    visualization: {
      type: '3d',
      model: '/models/business-operations.glb',
      realTimeData: true,
      overlays: [
        {
          type: 'gauge',
          dataStream: 'revenue-flow',
          position: { x: 2, y: 1, z: 0 },
          style: { color: '#10b981', size: 1, opacity: 0.8 }
        },
        {
          type: 'heatmap',
          dataStream: 'project-activity',
          position: { x: -2, y: 0, z: 1 },
          style: { color: '#f59e0b', size: 2, opacity: 0.6 }
        }
      ],
      viewpoints: [
        { name: 'Overview', position: { x: 0, y: 5, z: 10 }, rotation: { x: -30, y: 0, z: 0 }, isDefault: true },
        { name: 'Financial', position: { x: 5, y: 2, z: 5 }, rotation: { x: -15, y: 45, z: 0 }, isDefault: false },
        { name: 'Operations', position: { x: -5, y: 3, z: 5 }, rotation: { x: -20, y: -45, z: 0 }, isDefault: false }
      ]
    },
    dataStreams: [
      {
        id: 'revenue-flow',
        source: 'financial-system',
        metric: 'Daily Revenue',
        value: 125000,
        unit: 'CAD',
        timestamp: new Date().toISOString(),
        history: Array.from({ length: 24 }, (_, i) => ({
          value: 100000 + Math.random() * 50000,
          timestamp: new Date(Date.now() - i * 3600000).toISOString()
        }))
      },
      {
        id: 'active-projects',
        source: 'project-management',
        metric: 'Active Projects',
        value: 12,
        unit: 'projects',
        timestamp: new Date().toISOString(),
        history: []
      },
      {
        id: 'employee-utilization',
        source: 'hr-system',
        metric: 'Employee Utilization',
        value: 87,
        unit: '%',
        timestamp: new Date().toISOString(),
        history: []
      },
      {
        id: 'equipment-status',
        source: 'iot-sensors',
        metric: 'Equipment Health',
        value: 94,
        unit: '%',
        timestamp: new Date().toISOString(),
        history: []
      }
    ],
    alerts: [
      {
        id: 'alert-1',
        severity: 'warning',
        message: 'Project #A-234 is 2 days behind schedule',
        metric: 'project-timeline',
        threshold: 0,
        triggered: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false
      },
      {
        id: 'alert-2',
        severity: 'info',
        message: 'Equipment maintenance scheduled for tomorrow',
        metric: 'equipment-maintenance',
        threshold: 0,
        triggered: new Date(Date.now() - 7200000).toISOString(),
        acknowledged: true
      }
    ],
    predictions: [
      {
        type: 'demand',
        confidence: 85,
        timeframe: 'Next 30 days',
        recommendation: 'Increase workforce by 15% to meet projected demand',
        impact: 'Revenue increase of $450,000'
      },
      {
        type: 'maintenance',
        confidence: 92,
        timeframe: 'Within 2 weeks',
        recommendation: 'Schedule preventive maintenance for Excavator #3',
        impact: 'Prevent 3-day downtime'
      }
    ]
  }

  // Mock metric cards
  const metricCards: MetricCard[] = [
    {
      id: 'revenue',
      title: 'Revenue Flow',
      value: '$125K',
      unit: 'today',
      trend: 12.5,
      status: 'good',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      id: 'projects',
      title: 'Active Projects',
      value: 12,
      unit: 'ongoing',
      trend: 8.3,
      status: 'good',
      icon: Building,
      color: 'blue'
    },
    {
      id: 'utilization',
      title: 'Team Utilization',
      value: '87%',
      unit: 'capacity',
      trend: -2.1,
      status: 'warning',
      icon: Users,
      color: 'amber'
    },
    {
      id: 'equipment',
      title: 'Equipment Health',
      value: '94%',
      unit: 'operational',
      trend: 0,
      status: 'good',
      icon: Cpu,
      color: 'purple'
    }
  ]

  useEffect(() => {
    if (isLiveMode) {
      const interval = setInterval(() => {
        // Update data streams with random values
        // In production, this would fetch real data
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [isLiveMode])

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      default: return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Settings className="w-5 h-5 text-amber-400" />
      case 'demand': return <TrendingUp className="w-5 h-5 text-emerald-400" />
      case 'failure': return <AlertTriangle className="w-5 h-5 text-red-400" />
      default: return <Activity className="w-5 h-5 text-blue-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-md 
        border border-cyan-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <Box className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Digital Twin</h2>
              <p className="text-white/70">Real-time business operations visualization</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full
              ${isLiveMode 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm">{isLiveMode ? 'Live' : 'Paused'}</span>
            </div>
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg transition-colors"
            >
              {isLiveMode ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4
                hover:bg-white/15 transition-all cursor-pointer
                ${selectedMetric === metric.id ? 'ring-2 ring-cyan-400' : ''}`}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 text-${metric.color}-400`} />
                <div className={`flex items-center space-x-1 text-sm
                  ${metric.trend > 0 ? 'text-emerald-400' : metric.trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {metric.trend > 0 ? '+' : ''}{metric.trend}%
                  {metric.trend !== 0 && (
                    <TrendingUp className={`w-3 h-3 ${metric.trend < 0 ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className="text-white/60 text-sm">{metric.unit}</p>
            </motion.div>
          )
        })}
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['overview', 'metrics', 'predictions', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewMode(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                viewMode === tab
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 3D Viewer */}
            <div className="bg-black/50 backdrop-blur-md border border-white/20 rounded-xl 
              overflow-hidden" style={{ height: '500px' }}>
              <div className="relative h-full">
                {/* 3D Viewer Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-48 h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 
                        rounded-lg flex items-center justify-center mb-4 mx-auto"
                    >
                      <Building className="w-24 h-24 text-cyan-400/50" />
                    </motion.div>
                    <p className="text-white/60">Digital Twin 3D View</p>
                    <p className="text-white/40 text-sm">Real-time business operations</p>
                  </div>
                </div>

                {/* Controls Overlay */}
                <div className="absolute top-4 left-4 space-y-2">
                  <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                    rounded-lg transition-colors">
                    <Layers className="w-4 h-4 text-white" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                    rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                    rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Status Indicators */}
                <div className="absolute top-4 right-4 space-y-2">
                  {businessTwin.dataStreams.map(stream => (
                    <div key={stream.id} className="px-3 py-1.5 bg-white/10 backdrop-blur-md 
                      rounded-full flex items-center space-x-2">
                      <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span className="text-white text-xs">{stream.metric}</span>
                      <span className="text-cyan-300 text-xs font-medium">
                        {stream.value} {stream.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* View Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {businessTwin.visualization.viewpoints.map(viewpoint => (
                      <button
                        key={viewpoint.name}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors
                          ${viewpoint.isDefault
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                            : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {viewpoint.name}
                      </button>
                    ))}
                  </div>
                  
                  <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md 
                    rounded-lg transition-colors">
                    <Maximize className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>Live Performance</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60">Overall Efficiency</span>
                      <span className="text-white font-medium">92%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: '92%' }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60">Resource Utilization</span>
                      <span className="text-white font-medium">87%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-blue-400 transition-all" style={{ width: '87%' }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60">System Health</span>
                      <span className="text-white font-medium">94%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: '94%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Quick Actions</span>
                </h3>
                
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 
                    border border-white/20 rounded-lg text-white transition-colors 
                    flex items-center justify-between group">
                    <span className="flex items-center space-x-3">
                      <RefreshCw className="w-5 h-5 text-cyan-400" />
                      <span>Sync All Data Streams</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                  </button>
                  
                  <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 
                    border border-white/20 rounded-lg text-white transition-colors 
                    flex items-center justify-between group">
                    <span className="flex items-center space-x-3">
                      <Download className="w-5 h-5 text-blue-400" />
                      <span>Export Performance Report</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                  </button>
                  
                  <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 
                    border border-white/20 rounded-lg text-white transition-colors 
                    flex items-center justify-between group">
                    <span className="flex items-center space-x-3">
                      <Share className="w-5 h-5 text-purple-400" />
                      <span>Share Dashboard View</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'predictions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {businessTwin.predictions.map((prediction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    {getPredictionIcon(prediction.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {prediction.type} Prediction
                      </h3>
                      <p className="text-white/60 text-sm">{prediction.timeframe}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-300 font-medium">{prediction.confidence}% confidence</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <p className="text-white/80">{prediction.recommendation}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-white/60">Impact:</span>
                    <span className="text-emerald-300">{prediction.impact}</span>
                  </div>
                  
                  <button className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 
                    border border-cyan-400/50 rounded-lg text-cyan-200 transition-colors
                    flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Take Action</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {viewMode === 'alerts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {businessTwin.alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/10 backdrop-blur-md border rounded-xl p-4
                  ${alert.severity === 'critical' ? 'border-red-400/50' :
                    alert.severity === 'warning' ? 'border-amber-400/50' :
                    'border-blue-400/50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.severity)}
                    <div>
                      <p className="text-white">{alert.message}</p>
                      <p className="text-white/60 text-sm mt-1">
                        {new Date(alert.triggered).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 
                      border border-white/20 rounded-lg text-white text-sm transition-colors">
                      Acknowledge
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}