/**
 * Compliance Dashboard Component
 * Track and visualize 5% Indigenous procurement compliance
 */

'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileBarChart,
  Calendar,
  Download,
  Share2,
  Info,
  Award,
  Flag,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { analyticsEngine, ComplianceMetrics } from '@/lib/analytics/analytics-engine'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { formatCurrency, formatPercentage } from '@/lib/utils/format'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useCompliance } from '@/features/blockchain/hooks/useSmartContracts'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ComplianceDashboardProps {
  organizationId: string
  year?: number
}

export default function ComplianceDashboard({ 
  organizationId,
  year = new Date().getFullYear()
}: ComplianceDashboardProps) {
  const [compliance, setCompliance] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'details' | 'trends' | 'actions'>('overview')
  const [historicalData, setHistoricalData] = useState<ComplianceMetrics[]>([])
  
  // Blockchain compliance tracking
  const { complianceStatus, percentage: blockchainPercentage } = useCompliance()

  // Fetch compliance data
  useEffect(() => {
    const fetchCompliance = async () => {
      setLoading(true)
      try {
        // Get current year compliance
        const data = await analyticsEngine.getComplianceMetrics(organizationId, year)
        setCompliance(data)

        // Get historical data (last 5 years)
        const historical: ComplianceMetrics[] = []
        for (let i = 1; i <= 5; i++) {
          const yearData = await analyticsEngine.getComplianceMetrics(
            organizationId,
            year - i
          )
          historical.push(yearData)
        }
        setHistoricalData(historical.reverse())
      } catch (error) {
        logger.error('Error fetching compliance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompliance()
  }, [organizationId, year])

  if (loading || !compliance) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Target className="h-12 w-12 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-300">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  const complianceColor = compliance.percentage >= 5 
    ? 'text-green-400' 
    : compliance.percentage >= 3 
    ? 'text-amber-400' 
    : 'text-red-400'

  const complianceBg = compliance.percentage >= 5 
    ? 'bg-green-500/20' 
    : compliance.percentage >= 3 
    ? 'bg-amber-500/20' 
    : 'bg-red-500/20'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Procurement Compliance Dashboard
          </h1>
          <p className="text-gray-400">
            Tracking progress toward the 5% Indigenous procurement target
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => window.location.href = `?year=${e.target.value}`}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            {[0, 1, 2, 3, 4].map(offset => (
              <option key={offset} value={year - offset}>
                {year - offset}
              </option>
            ))}
          </select>

          <GlassButton variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </GlassButton>
          <GlassButton variant="secondary" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </GlassButton>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-2 border-b border-white/10 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: FileBarChart },
          { id: 'details', label: 'Details', icon: Building2 },
          { id: 'trends', label: 'Trends', icon: TrendingUp },
          { id: 'actions', label: 'Action Plan', icon: Target }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id as unknown)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              selectedView === tab.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Overview */}
        {selectedView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Compliance Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Compliance Score */}
              <GlassPanel className="lg:col-span-2">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Current Compliance Status
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Indigenous procurement as percentage of total
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${complianceBg} ${complianceColor}`}>
                    {compliance.compliance ? 'Compliant' : 'Non-Compliant'}
                  </div>
                </div>

                <div className="flex items-center justify-center h-64">
                  <div className="relative w-56 h-56">
                    <Doughnut
                      data={{
                        labels: ['Indigenous', 'Non-Indigenous'],
                        datasets: [{
                          data: [
                            compliance.indigenousProcurement,
                            compliance.totalProcurement - compliance.indigenousProcurement
                          ],
                          backgroundColor: [
                            compliance.percentage >= 5 
                              ? 'rgba(34, 197, 94, 0.8)'
                              : 'rgba(239, 68, 68, 0.8)',
                            'rgba(255, 255, 255, 0.1)'
                          ],
                          borderColor: [
                            compliance.percentage >= 5 
                              ? 'rgba(34, 197, 94, 1)'
                              : 'rgba(239, 68, 68, 1)',
                            'rgba(255, 255, 255, 0.2)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed as number
                                const percentage = ((value / compliance.totalProcurement) * 100).toFixed(1)
                                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
                              }
                            }
                          }
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`text-5xl font-bold ${complianceColor}`}>
                        {compliance.percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        of total procurement
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(compliance.totalProcurement)}
                    </div>
                    <div className="text-sm text-gray-400">Total Procurement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(compliance.indigenousProcurement)}
                    </div>
                    <div className="text-sm text-gray-400">Indigenous Procurement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      5%
                    </div>
                    <div className="text-sm text-gray-400">Target</div>
                  </div>
                </div>
              </GlassPanel>

              {/* Trend Indicator */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Performance Trend
                </h3>
                <div className="flex flex-col items-center justify-center h-72">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    compliance.trend === 'improving' 
                      ? 'bg-green-500/20 text-green-400'
                      : compliance.trend === 'declining'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {compliance.trend === 'improving' ? (
                      <TrendingUp className="h-8 w-8" />
                    ) : compliance.trend === 'declining' ? (
                      <TrendingDown className="h-8 w-8" />
                    ) : (
                      <ArrowUpRight className="h-8 w-8" />
                    )}
                  </div>
                  <div className="text-xl font-semibold text-white capitalize mb-2">
                    {compliance.trend}
                  </div>
                  <p className="text-gray-400 text-center text-sm">
                    {compliance.trend === 'improving'
                      ? 'Great progress! Keep up the momentum.'
                      : compliance.trend === 'declining'
                      ? 'Action needed to reverse the trend.'
                      : 'Performance has been consistent.'}
                  </p>
                  
                  {compliance.projectedCompliance !== undefined && (
                    <div className="mt-6 w-full">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Next Year Projection</span>
                          <span className={`text-lg font-semibold ${
                            compliance.projectedCompliance ? 'text-green-400' : 'text-amber-400'
                          }`}>
                            {compliance.projectedCompliance ? 'Likely Compliant' : 'At Risk'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>

            {/* Recommendations */}
            {compliance.recommendations.length > 0 && (
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-400" />
                  Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compliance.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-blue-400/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-300">{rec}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Blockchain Verification */}
            {blockchainPercentage > 0 && (
              <GlassPanel>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Blockchain Verified</h4>
                      <p className="text-sm text-gray-400">
                        Compliance data recorded on immutable ledger
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-400">
                      {blockchainPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">On-chain</div>
                  </div>
                </div>
              </GlassPanel>
            )}
          </motion.div>
        )}

        {/* Details View */}
        {selectedView === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Procurement Breakdown */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Procurement Breakdown by Category
              </h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: [
                      'Construction',
                      'Professional Services',
                      'IT & Technology',
                      'Supplies & Equipment',
                      'Transportation',
                      'Other Services'
                    ],
                    datasets: [{
                      label: 'Indigenous',
                      data: [450000, 320000, 280000, 150000, 120000, 80000],
                      backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      borderColor: 'rgba(34, 197, 94, 1)',
                      borderWidth: 1
                    }, {
                      label: 'Non-Indigenous',
                      data: [2100000, 1800000, 1500000, 900000, 600000, 400000],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { color: 'white' }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const value = context.parsed.y
                            const total = context.dataset.data.reduce((a: number, b: any) => a + b, 0)
                            const percentage = ((value / total) * 100).toFixed(1)
                            return `${context.dataset.label}: ${formatCurrency(value)} (${percentage}%)`
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        stacked: true,
                        ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                      },
                      y: {
                        stacked: true,
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          callback: (value) => `$${(value as number / 1000000).toFixed(1)}M`
                        }
                      }
                    }
                  }}
                />
              </div>
            </GlassPanel>

            {/* Top Indigenous Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Top Indigenous Suppliers
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Eagle Construction Ltd.', value: 320000, contracts: 12 },
                    { name: 'Northern Tech Solutions', value: 280000, contracts: 8 },
                    { name: 'Raven Consulting Group', value: 240000, contracts: 15 },
                    { name: 'Bear Claw Industries', value: 180000, contracts: 6 },
                    { name: 'Wolf Pack Logistics', value: 150000, contracts: 10 }
                  ].map((supplier, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">{supplier.name}</div>
                          <div className="text-xs text-gray-400">{supplier.contracts} contracts</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {formatCurrency(supplier.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Procurement by Region
                </h3>
                <div className="h-64">
                  <Doughnut
                    data={{
                      labels: [
                        'Atlantic',
                        'Quebec',
                        'Ontario',
                        'Prairies',
                        'British Columbia',
                        'Territories'
                      ],
                      datasets: [{
                        data: [180000, 240000, 380000, 320000, 220000, 60000],
                        backgroundColor: [
                          'rgba(239, 68, 68, 0.8)',
                          'rgba(245, 158, 11, 0.8)',
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(34, 197, 94, 0.8)',
                          'rgba(236, 72, 153, 0.8)'
                        ],
                        borderColor: [
                          'rgba(239, 68, 68, 1)',
                          'rgba(245, 158, 11, 1)',
                          'rgba(59, 130, 246, 1)',
                          'rgba(139, 92, 246, 1)',
                          'rgba(34, 197, 94, 1)',
                          'rgba(236, 72, 153, 1)'
                        ],
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { 
                            color: 'white',
                            padding: 10,
                            font: { size: 11 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed as number
                              const total = context.dataset.data.reduce((a: number, b: any) => a + b, 0)
                              const percentage = ((value / total) * 100).toFixed(1)
                              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </GlassPanel>
            </div>
          </motion.div>
        )}

        {/* Trends View */}
        {selectedView === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Historical Compliance Trend */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                5-Year Compliance Trend
              </h3>
              <div className="h-80">
                <Line
                  data={{
                    labels: historicalData.map(d => d.period),
                    datasets: [{
                      label: 'Compliance %',
                      data: historicalData.map(d => d.percentage),
                      borderColor: 'rgba(59, 130, 246, 1)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 2,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 4
                    }, {
                      label: 'Target (5%)',
                      data: historicalData.map(() => 5),
                      borderColor: 'rgba(34, 197, 94, 1)',
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
                        position: 'top',
                        labels: { color: 'white' }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            if (context.dataset.label === 'Target (5%)') {
                              return 'Target: 5%'
                            }
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                          callback: (value) => `${value}%`,
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
            </GlassPanel>

            {/* Quarterly Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Quarterly Progress
                </h3>
                <div className="space-y-4">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, index) => {
                    const value = [3.2, 4.1, 4.8, compliance.percentage][index]
                    const target = 5
                    const progress = (value / target) * 100

                    return (
                      <div key={quarter} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{quarter} {year}</span>
                          <span className={`font-medium ${
                            value >= target ? 'text-green-400' : 'text-white'
                          }`}>
                            {value.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`h-full ${
                              value >= target 
                                ? 'bg-gradient-to-r from-green-500 to-green-400'
                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassPanel>

              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Projected Path to Compliance
                </h3>
                <div className="h-64">
                  <Line
                    data={{
                      labels: ['Current', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
                      datasets: [{
                        label: 'Projected',
                        data: [compliance.percentage, 5.2, 5.5, 5.8, 6.1],
                        borderColor: 'rgba(139, 92, 246, 1)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: true,
                        tension: 0.4
                      }, {
                        label: 'Target',
                        data: [5, 5, 5, 5, 5],
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        pointRadius: 0
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { color: 'white' }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 8,
                          ticks: {
                            callback: (value) => `${value}%`,
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
              </GlassPanel>
            </div>
          </motion.div>
        )}

        {/* Action Plan */}
        {selectedView === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Strategic Action Plan
              </h3>

              <div className="space-y-6">
                {/* Immediate Actions */}
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <Flag className="h-5 w-5 mr-2 text-red-400" />
                    Immediate Actions (0-30 days)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Supplier Outreach',
                        description: 'Contact verified Indigenous businesses for upcoming opportunities',
                        impact: 'High',
                        effort: 'Low'
                      },
                      {
                        title: 'Policy Review',
                        description: 'Review procurement policies for potential barriers',
                        impact: 'Medium',
                        effort: 'Medium'
                      },
                      {
                        title: 'Training Sessions',
                        description: 'Train procurement officers on Indigenous business engagement',
                        impact: 'High',
                        effort: 'Low'
                      },
                      {
                        title: 'Set-aside Programs',
                        description: 'Identify contracts suitable for Indigenous set-asides',
                        impact: 'High',
                        effort: 'Medium'
                      }
                    ].map((action, index) => (
                      <ActionCard key={index} {...action} />
                    ))}
                  </div>
                </div>

                {/* Medium-term Actions */}
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-amber-400" />
                    Medium-term Actions (1-6 months)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Partnership Development',
                        description: 'Establish long-term partnerships with Indigenous suppliers',
                        impact: 'High',
                        effort: 'High'
                      },
                      {
                        title: 'Capacity Building',
                        description: 'Support Indigenous businesses in meeting requirements',
                        impact: 'High',
                        effort: 'Medium'
                      },
                      {
                        title: 'Joint Ventures',
                        description: 'Facilitate JVs between Indigenous and mainstream suppliers',
                        impact: 'Medium',
                        effort: 'High'
                      },
                      {
                        title: 'Procurement Calendar',
                        description: 'Share advance notice of opportunities with Indigenous businesses',
                        impact: 'Medium',
                        effort: 'Low'
                      }
                    ].map((action, index) => (
                      <ActionCard key={index} {...action} />
                    ))}
                  </div>
                </div>

                {/* Long-term Actions */}
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-green-400" />
                    Long-term Actions (6-12 months)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Supply Chain Integration',
                        description: 'Integrate Indigenous businesses into core supply chains',
                        impact: 'High',
                        effort: 'High'
                      },
                      {
                        title: 'Innovation Programs',
                        description: 'Co-develop innovative solutions with Indigenous partners',
                        impact: 'High',
                        effort: 'High'
                      }
                    ].map((action, index) => (
                      <ActionCard key={index} {...action} />
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Success Metrics */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-4">
                Success Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Supplier Base"
                  current={45}
                  target={100}
                  unit="businesses"
                  color="blue"
                />
                <MetricCard
                  label="Avg Contract Size"
                  current={85000}
                  target={150000}
                  unit="$"
                  color="purple"
                />
                <MetricCard
                  label="Success Rate"
                  current={68}
                  target={85}
                  unit="%"
                  color="green"
                />
                <MetricCard
                  label="Repeat Business"
                  current={42}
                  target={75}
                  unit="%"
                  color="amber"
                />
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components

function ActionCard({ 
  title, 
  description, 
  impact, 
  effort 
}: {
  title: string
  description: string
  impact: 'High' | 'Medium' | 'Low'
  effort: 'High' | 'Medium' | 'Low'
}) {
  const impactColors = {
    High: 'text-green-400 bg-green-500/20',
    Medium: 'text-amber-400 bg-amber-500/20',
    Low: 'text-gray-400 bg-gray-500/20'
  }

  const effortColors = {
    High: 'text-red-400',
    Medium: 'text-amber-400',
    Low: 'text-green-400'
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-blue-400/50 transition-colors">
      <h5 className="text-white font-medium mb-2">{title}</h5>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={`px-2 py-1 rounded ${impactColors[impact]}`}>
          Impact: {impact}
        </span>
        <span className={effortColors[effort]}>
          Effort: {effort}
        </span>
      </div>
    </div>
  )
}

function MetricCard({ 
  label, 
  current, 
  target, 
  unit, 
  color 
}: {
  label: string
  current: number
  target: number
  unit: string
  color: string
}) {
  const progress = (current / target) * 100
  const colorClasses = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    amber: 'text-amber-400'
  }

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]} mb-1`}>
        {unit === '$' ? formatCurrency(current) : `${current}${unit}`}
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Target: {unit === '$' ? formatCurrency(target) : `${target}${unit}`}
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-current ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}