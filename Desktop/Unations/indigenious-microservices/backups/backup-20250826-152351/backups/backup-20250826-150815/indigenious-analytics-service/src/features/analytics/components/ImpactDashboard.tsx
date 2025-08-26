/**
 * Impact Dashboard Component
 * Comprehensive view of economic, social, and environmental impact
 */

'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Users,
  DollarSign,
  Briefcase,
  Globe,
  TreePine,
  Building,
  GraduationCap,
  Heart,
  BarChart3,
  PieChart,
  LineChart,
  Map,
  Calendar,
  Download,
  Share2,
  Filter,
  Award,
  Target,
  Zap
} from 'lucide-react'
import { analyticsEngine, ImpactMetrics } from '@/lib/analytics/analytics-engine'
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
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2'

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

interface ImpactDashboardProps {
  communityId?: string
  dateRange?: { start: Date; end: Date }
}

export default function ImpactDashboard({ 
  communityId, 
  dateRange 
}: ImpactDashboardProps) {
  const [impact, setImpact] = useState<ImpactMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'economic' | 'social' | 'environmental'>('overview')
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('quarter')

  // Fetch impact data
  useEffect(() => {
    const fetchImpact = async () => {
      setLoading(true)
      try {
        const endDate = dateRange?.end || new Date()
        const startDate = dateRange?.start || new Date(
          endDate.getFullYear(),
          endDate.getMonth() - (timeframe === 'month' ? 1 : timeframe === 'quarter' ? 3 : 12),
          endDate.getDate()
        )

        const data = await analyticsEngine.getImpactMetrics(
          startDate,
          endDate,
          communityId
        )
        setImpact(data)
      } catch (error) {
        logger.error('Error fetching impact metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchImpact()
  }, [communityId, dateRange, timeframe])

  if (loading || !impact) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-300">Loading impact data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Impact Dashboard</h1>
          <p className="text-gray-400">
            Measuring the real-world impact of Indigenous procurement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                  timeframe === period
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Actions */}
          <GlassButton variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'economic', label: 'Economic', icon: DollarSign },
          { id: 'social', label: 'Social', icon: Users },
          { id: 'environmental', label: 'Environmental', icon: TreePine }
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <ImpactCard
              title="Total Economic Impact"
              value={formatCurrency(impact.economicImpact.totalContractValue)}
              change={12.5}
              icon={DollarSign}
              color="green"
              subtitle={`${impact.economicImpact.economicMultiplier.toFixed(1)}x multiplier effect`}
            />

            <ImpactCard
              title="Jobs Created"
              value={formatNumber(
                impact.employmentImpact.directJobs + 
                impact.employmentImpact.indirectJobs
              )}
              change={8.3}
              icon={Briefcase}
              color="blue"
              subtitle={`${impact.employmentImpact.directJobs} direct, ${impact.employmentImpact.indirectJobs} indirect`}
            />

            <ImpactCard
              title="Businesses Supported"
              value={formatNumber(impact.socialImpact.businessesSupported)}
              change={15.2}
              icon={Building}
              color="purple"
              subtitle="Indigenous-owned enterprises"
            />

            <ImpactCard
              title="Carbon Reduction"
              value={`${formatNumber(impact.environmentalImpact.carbonReduction)} tons`}
              change={-23.1}
              icon={TreePine}
              color="emerald"
              subtitle="CO₂ equivalent reduced"
            />
          </motion.div>
        )}

        {/* Economic Impact */}
        {selectedView === 'economic' && (
          <motion.div
            key="economic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Economic Breakdown */}
              <GlassPanel className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Economic Impact Breakdown
                </h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: [
                        'Contract Value',
                        'Local Spending',
                        'Community Revenue',
                        'Tax Revenue'
                      ],
                      datasets: [{
                        label: 'Economic Impact ($)',
                        data: [
                          impact.economicImpact.totalContractValue,
                          impact.economicImpact.localSpending,
                          impact.economicImpact.communityRevenue,
                          impact.economicImpact.taxRevenue
                        ],
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.5)',
                          'rgba(16, 185, 129, 0.5)',
                          'rgba(139, 92, 246, 0.5)',
                          'rgba(251, 146, 60, 0.5)'
                        ],
                        borderColor: [
                          'rgba(59, 130, 246, 1)',
                          'rgba(16, 185, 129, 1)',
                          'rgba(139, 92, 246, 1)',
                          'rgba(251, 146, 60, 1)'
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `$${context.parsed.y.toLocaleString()}`
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => `$${(value as number).toLocaleString()}`
                          }
                        }
                      }
                    }}
                  />
                </div>
              </GlassPanel>

              {/* Economic Multiplier */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Economic Multiplier Effect
                </h3>
                <div className="flex flex-col items-center justify-center h-72">
                  <div className="text-6xl font-bold text-blue-400 mb-2">
                    {impact.economicImpact.economicMultiplier.toFixed(1)}x
                  </div>
                  <p className="text-gray-400 text-center">
                    Every $1 spent generates ${impact.economicImpact.economicMultiplier.toFixed(2)} 
                    in economic activity
                  </p>
                  <div className="mt-6 w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Direct Impact</span>
                      <span className="text-white">$1.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Indirect Impact</span>
                      <span className="text-white">
                        ${(impact.economicImpact.economicMultiplier - 1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Monthly Trend */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-4">
                Economic Impact Trend
              </h3>
              <div className="h-64">
                <Line
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Contract Value',
                      data: [1200000, 1400000, 1300000, 1600000, 1800000, 2100000],
                      borderColor: 'rgba(59, 130, 246, 1)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.4
                    }, {
                      label: 'Local Spending',
                      data: [800000, 900000, 850000, 1100000, 1200000, 1400000],
                      borderColor: 'rgba(16, 185, 129, 1)',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      fill: true,
                      tension: 0.4
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
            </GlassPanel>
          </motion.div>
        )}

        {/* Social Impact */}
        {selectedView === 'social' && (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Employment Stats */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-400" />
                  Employment Impact
                </h3>
                <div className="space-y-4">
                  <MetricRow
                    label="Direct Jobs"
                    value={impact.employmentImpact.directJobs}
                    total={impact.employmentImpact.directJobs + impact.employmentImpact.indirectJobs}
                  />
                  <MetricRow
                    label="Indirect Jobs"
                    value={impact.employmentImpact.indirectJobs}
                    total={impact.employmentImpact.directJobs + impact.employmentImpact.indirectJobs}
                  />
                  <MetricRow
                    label="Training Positions"
                    value={impact.employmentImpact.trainingPositions}
                    showBar={false}
                  />
                  <MetricRow
                    label="Youth Employment"
                    value={impact.employmentImpact.youthEmployment}
                    showBar={false}
                  />
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Average Wage</span>
                      <span className="text-xl font-semibold text-white">
                        {formatCurrency(impact.employmentImpact.averageWage)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* Capacity Building */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2 text-purple-400" />
                  Capacity Building
                </h3>
                <div className="h-64">
                  <Doughnut
                    data={{
                      labels: [
                        'Skills Transferred',
                        'Business Support',
                        'Community Projects',
                        'Cultural Programs'
                      ],
                      datasets: [{
                        data: [
                          impact.socialImpact.skillsTransferred,
                          impact.socialImpact.businessesSupported,
                          impact.socialImpact.communityProjects,
                          impact.socialImpact.culturalPreservation
                        ],
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(236, 72, 153, 0.8)',
                          'rgba(251, 146, 60, 0.8)'
                        ],
                        borderColor: [
                          'rgba(59, 130, 246, 1)',
                          'rgba(139, 92, 246, 1)',
                          'rgba(236, 72, 153, 1)',
                          'rgba(251, 146, 60, 1)'
                        ],
                        borderWidth: 2
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
                      }
                    }}
                  />
                </div>
              </GlassPanel>

              {/* Community Impact Score */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-red-400" />
                  Community Impact Score
                </h3>
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="16"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="url(#gradient)"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - 0.82)}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-white">82</div>
                      <div className="text-sm text-gray-400">/ 100</div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-center mt-4">
                    Excellent community impact across all metrics
                  </p>
                </div>
              </GlassPanel>
            </div>

            {/* Social Programs Impact */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-4">
                Social Programs Impact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SocialProgramCard
                  icon={Users}
                  title="Elder Programs"
                  value="15"
                  description="Cultural knowledge transfer initiatives"
                  color="blue"
                />
                <SocialProgramCard
                  icon={GraduationCap}
                  title="Youth Training"
                  value="127"
                  description="Young people in apprenticeships"
                  color="purple"
                />
                <SocialProgramCard
                  icon={Heart}
                  title="Community Events"
                  value="42"
                  description="Cultural and business events hosted"
                  color="pink"
                />
                <SocialProgramCard
                  icon={Award}
                  title="Awards Given"
                  value="23"
                  description="Excellence recognitions distributed"
                  color="amber"
                />
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Environmental Impact */}
        {selectedView === 'environmental' && (
          <motion.div
            key="environmental"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Environmental Metrics */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Environmental Impact Metrics
                </h3>
                <div className="space-y-6">
                  <EnvironmentalMetric
                    icon={TreePine}
                    label="Carbon Reduction"
                    value={`${formatNumber(impact.environmentalImpact.carbonReduction)} tons`}
                    description="CO₂ equivalent reduced through sustainable practices"
                    progress={75}
                    color="emerald"
                  />
                  <EnvironmentalMetric
                    icon={Globe}
                    label="Sustainable Projects"
                    value={impact.environmentalImpact.sustainableProjects}
                    description="Projects meeting environmental standards"
                    progress={90}
                    color="blue"
                  />
                  <EnvironmentalMetric
                    icon={Map}
                    label="Land Protected"
                    value={`${formatNumber(impact.environmentalImpact.landProtected)} hectares`}
                    description="Traditional territories preserved"
                    progress={60}
                    color="green"
                  />
                  <EnvironmentalMetric
                    icon={Zap}
                    label="Water Conserved"
                    value={`${formatNumber(impact.environmentalImpact.waterConserved)} liters`}
                    description="Through efficient resource management"
                    progress={80}
                    color="cyan"
                  />
                </div>
              </GlassPanel>

              {/* Sustainability Score */}
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Sustainability Performance
                </h3>
                <div className="h-80">
                  <Radar
                    data={{
                      labels: [
                        'Carbon Footprint',
                        'Resource Efficiency',
                        'Waste Reduction',
                        'Biodiversity',
                        'Water Management',
                        'Energy Use'
                      ],
                      datasets: [{
                        label: 'Current Performance',
                        data: [85, 78, 82, 90, 75, 88],
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(16, 185, 129, 1)'
                      }, {
                        label: 'Target',
                        data: [90, 85, 85, 95, 80, 90],
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: 'rgba(59, 130, 246, 0.5)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: 'white' }
                        }
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            stepSize: 20,
                            color: 'rgba(255, 255, 255, 0.6)'
                          },
                          grid: { color: 'rgba(255, 255, 255, 0.1)' },
                          pointLabels: { color: 'white' }
                        }
                      }
                    }}
                  />
                </div>
              </GlassPanel>
            </div>

            {/* Environmental Projects */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-4">
                Featured Environmental Projects
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProjectCard
                  title="Solar Installation Program"
                  description="Installing solar panels in 15 remote communities"
                  impact="2,500 tons CO₂ reduced annually"
                  status="In Progress"
                  completion={65}
                />
                <ProjectCard
                  title="Water Treatment Upgrade"
                  description="Modern water treatment for 8 communities"
                  impact="10M liters clean water daily"
                  status="Completed"
                  completion={100}
                />
                <ProjectCard
                  title="Forest Restoration"
                  description="Replanting traditional territories"
                  impact="50,000 trees planted"
                  status="Planning"
                  completion={15}
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

function ImpactCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  subtitle 
}: {
  title: string
  value: string
  change: number
  icon: any
  color: string
  subtitle?: string
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20'
  }

  return (
    <GlassPanel>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`flex items-center text-sm ${
          change > 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          <TrendingUp className={`h-4 w-4 mr-1 ${change < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-2">{subtitle}</div>
      )}
    </GlassPanel>
  )
}

function MetricRow({ 
  label, 
  value, 
  total, 
  showBar = true 
}: {
  label: string
  value: number
  total?: number
  showBar?: boolean
}) {
  const percentage = total ? (value / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{formatNumber(value)}</span>
      </div>
      {showBar && total && (
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      )}
    </div>
  )
}

function SocialProgramCard({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  color 
}: {
  icon: any
  title: string
  value: string
  description: string
  color: string
}) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    pink: 'text-pink-400 bg-pink-500/20',
    amber: 'text-amber-400 bg-amber-500/20'
  }

  return (
    <div className="text-center">
      <div className={`inline-flex p-3 rounded-lg mb-3 ${
        colorClasses[color as keyof typeof colorClasses]
      }`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-300 mb-1">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  )
}

function EnvironmentalMetric({ 
  icon: Icon, 
  label, 
  value, 
  description, 
  progress, 
  color 
}: {
  icon: any
  label: string
  value: string | number
  description: string
  progress: number
  color: string
}) {
  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    cyan: 'text-cyan-400'
  }

  return (
    <div className="flex items-start space-x-4">
      <div className={`p-2 rounded-lg bg-white/10 ${
        colorClasses[color as keyof typeof colorClasses]
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-lg font-semibold text-white">{value}</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${colorClasses[color as keyof typeof colorClasses]}`}
            style={{ backgroundColor: 'currentColor' }}
          />
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ 
  title, 
  description, 
  impact, 
  status, 
  completion 
}: {
  title: string
  description: string
  impact: string
  status: string
  completion: number
}) {
  const statusColors = {
    'Completed': 'text-green-400 bg-green-500/20',
    'In Progress': 'text-blue-400 bg-blue-500/20',
    'Planning': 'text-amber-400 bg-amber-500/20'
  }

  return (
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-white">{title}</h4>
        <span className={`text-xs px-2 py-1 rounded-full ${
          statusColors[status as keyof typeof statusColors]
        }`}>
          {status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <div className="text-xs text-blue-400 mb-3">{impact}</div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Completion</span>
          <span className="text-gray-400">{completion}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </div>
  )
}