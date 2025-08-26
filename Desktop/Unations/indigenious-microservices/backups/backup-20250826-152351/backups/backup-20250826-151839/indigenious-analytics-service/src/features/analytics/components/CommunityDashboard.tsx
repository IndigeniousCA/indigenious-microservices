/**
 * Community Dashboard Component
 * Community-specific analytics and insights
 */

'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Building,
  GraduationCap,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Filter,
  Download,
  Share2,
  ChevronRight,
  Star,
  Target,
  Zap,
  Heart,
  Globe
} from 'lucide-react'
import { analyticsEngine, CommunityDashboard as CommunityData } from '@/lib/analytics/analytics-engine'
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
import { Line, Bar, Doughnut } from 'react-chartjs-2'

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

interface CommunityDashboardProps {
  communityId: string
  compareToCommunities?: string[]
}

export default function CommunityDashboard({ 
  communityId,
  compareToCommunities = []
}: CommunityDashboardProps) {
  const [dashboard, setDashboard] = useState<CommunityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'businesses' | 'performance' | 'insights'>('overview')
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('quarter')

  // Fetch community data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await analyticsEngine.getCommunityDashboard(communityId)
        setDashboard(data)
      } catch (error) {
        logger.error('Error fetching community dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [communityId])

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-300">Loading community data...</p>
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
            <MapPin className="h-8 w-8 mr-3 text-blue-400" />
            {dashboard.communityName}
          </h1>
          <p className="text-gray-400">
            Community procurement analytics and business performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex bg-white/10 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

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
          { id: 'businesses', label: 'Businesses', icon: Building },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
          { id: 'insights', label: 'Insights', icon: Zap }
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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Active Businesses"
                value={dashboard.metrics.activeBusinesses}
                icon={Building}
                color="blue"
                trend={dashboard.trends.contractGrowth[dashboard.trends.contractGrowth.length - 1]}
                subtitle="Registered & verified"
              />
              <MetricCard
                title="Total Contracts"
                value={dashboard.metrics.totalContracts}
                icon={Briefcase}
                color="purple"
                trend={15.2}
                subtitle="Won this period"
              />
              <MetricCard
                title="Contract Value"
                value={formatCurrency(dashboard.metrics.contractValue)}
                icon={DollarSign}
                color="green"
                trend={dashboard.metrics.economicGrowth}
                subtitle="Total revenue"
              />
              <MetricCard
                title="Employment Rate"
                value={`${dashboard.metrics.employmentRate}%`}
                icon={Users}
                color="amber"
                trend={3.5}
                subtitle="Community employment"
              />
            </div>

            {/* Performance Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Economic Growth Trend
                </h3>
                <div className="h-64">
                  <Line
                    data={{
                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [{
                        label: 'Contract Value',
                        data: dashboard.trends.revenueGrowth.map((growth, i) => 
                          1000000 + (i * 100000) * (1 + growth / 100)
                        ),
                        borderColor: 'rgba(34, 197, 94, 1)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                      }, {
                        label: 'Employment',
                        data: dashboard.trends.employmentGrowth.map((growth, i) => 
                          200 + (i * 10) * (1 + growth / 100)
                        ),
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { color: 'white' }
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          ticks: {
                            callback: (value) => `$${(value as number / 1000000).toFixed(1)}M`,
                            color: 'rgba(255, 255, 255, 0.6)'
                          }
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          grid: {
                            drawOnChartArea: false
                          },
                          ticks: {
                            callback: (value) => `${value} jobs`,
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

              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Youth Engagement
                </h3>
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="relative w-48 h-48">
                    <Doughnut
                      data={{
                        labels: ['Employed', 'In Training', 'Seeking'],
                        datasets: [{
                          data: [
                            dashboard.metrics.youthEngagement,
                            20,
                            100 - dashboard.metrics.youthEngagement - 20
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(156, 163, 175, 0.3)'
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(59, 130, 246, 1)',
                            'rgba(156, 163, 175, 0.5)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-white">
                        {dashboard.metrics.youthEngagement}%
                      </div>
                      <div className="text-sm text-gray-400">Engaged</div>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400">Employed</div>
                      <div className="text-sm font-semibold text-white">
                        {dashboard.metrics.youthEngagement}%
                      </div>
                    </div>
                    <div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400">Training</div>
                      <div className="text-sm font-semibold text-white">20%</div>
                    </div>
                    <div>
                      <div className="w-3 h-3 bg-gray-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400">Seeking</div>
                      <div className="text-sm font-semibold text-white">
                        {100 - dashboard.metrics.youthEngagement - 20}%
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Community Impact Score */}
            <GlassPanel>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Community Impact Score
                </h3>
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-400" />
                  <span className="text-2xl font-bold text-white">87</span>
                  <span className="text-gray-400">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImpactCategory
                  label="Economic"
                  score={92}
                  icon={DollarSign}
                  color="green"
                />
                <ImpactCategory
                  label="Social"
                  score={85}
                  icon={Users}
                  color="blue"
                />
                <ImpactCategory
                  label="Cultural"
                  score={88}
                  icon={Award}
                  color="purple"
                />
                <ImpactCategory
                  label="Environmental"
                  score={82}
                  icon={Globe}
                  color="emerald"
                />
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Businesses View */}
        {selectedView === 'businesses' && (
          <motion.div
            key="businesses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Top Businesses */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Top Performing Businesses
              </h3>
              
              <div className="space-y-4">
                {dashboard.rankings.topBusinesses.map((business, index) => (
                  <BusinessCard
                    key={business.id}
                    rank={index + 1}
                    name={business.name}
                    value={business.value}
                    contracts={Math.floor(Math.random() * 20) + 5}
                    employees={Math.floor(Math.random() * 50) + 10}
                    growth={Math.random() * 40 - 10}
                  />
                ))}
              </div>
            </GlassPanel>

            {/* Sector Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Business Distribution by Sector
                </h3>
                <div className="h-80">
                  <Doughnut
                    data={{
                      labels: dashboard.rankings.topSectors.map(s => s.sector),
                      datasets: [{
                        data: dashboard.rankings.topSectors.map(s => s.value),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(236, 72, 153, 0.8)',
                          'rgba(251, 146, 60, 0.8)',
                          'rgba(34, 197, 94, 0.8)'
                        ],
                        borderColor: [
                          'rgba(59, 130, 246, 1)',
                          'rgba(139, 92, 246, 1)',
                          'rgba(236, 72, 153, 1)',
                          'rgba(251, 146, 60, 1)',
                          'rgba(34, 197, 94, 1)'
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
                          labels: { 
                            color: 'white',
                            padding: 15,
                            font: { size: 12 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const sector = dashboard.rankings.topSectors[context.dataIndex]
                              return [
                                `${context.label}: ${formatCurrency(context.parsed)}`,
                                `${sector.count} businesses`
                              ]
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </GlassPanel>

              <GlassPanel>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Business Growth Metrics
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">New Registrations</span>
                      <span className="text-xl font-semibold text-white">+12</span>
                    </div>
                    <div className="text-sm text-green-400">↑ 24% from last quarter</div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Average Revenue</span>
                      <span className="text-xl font-semibold text-white">
                        {formatCurrency(285000)}
                      </span>
                    </div>
                    <div className="text-sm text-green-400">↑ 18% growth</div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Success Rate</span>
                      <span className="text-xl font-semibold text-white">72%</span>
                    </div>
                    <div className="text-sm text-amber-400">↑ 5% improvement</div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Avg Employees</span>
                      <span className="text-xl font-semibold text-white">24</span>
                    </div>
                    <div className="text-sm text-green-400">↑ 12% increase</div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                      Certification Status
                    </h4>
                    <div className="space-y-2">
                      <CertificationBar label="ISO 9001" value={65} />
                      <CertificationBar label="Indigenous Verified" value={92} />
                      <CertificationBar label="Environmental" value={48} />
                      <CertificationBar label="Safety" value={78} />
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </motion.div>
        )}

        {/* Performance View */}
        {selectedView === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Contract Performance */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Contract Performance Analysis
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Monthly Contract Values
                  </h4>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                          label: 'Won',
                          data: [420000, 380000, 510000, 450000, 620000, 580000],
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 1
                        }, {
                          label: 'Bid',
                          data: [680000, 620000, 750000, 720000, 890000, 820000],
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
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `$${(value as number / 1000).toFixed(0)}K`,
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
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Win Rate by Category
                  </h4>
                  <div className="space-y-3">
                    {[
                      { category: 'Construction', rate: 68, count: 45 },
                      { category: 'Professional Services', rate: 75, count: 62 },
                      { category: 'Technology', rate: 72, count: 28 },
                      { category: 'Manufacturing', rate: 58, count: 15 },
                      { category: 'Transportation', rate: 64, count: 20 }
                    ].map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">
                            {item.category} ({item.count} bids)
                          </span>
                          <span className="text-white font-medium">{item.rate}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.rate}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`h-full ${
                              item.rate >= 70 
                                ? 'bg-gradient-to-r from-green-500 to-green-400'
                                : item.rate >= 60
                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Top Buyers */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Major Procurement Partners
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Organization</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Total Spending</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Contracts</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Avg Value</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.rankings.topBuyers.map((buyer, index) => (
                      <tr key={buyer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-semibold">
                              {index + 1}
                            </div>
                            <span className="text-white font-medium">{buyer.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-white font-semibold">
                            {formatCurrency(buyer.spending)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-400">
                            {Math.floor(buyer.spending / 80000)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-400">
                            {formatCurrency(80000)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1 text-green-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">+12%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Insights View */}
        {selectedView === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* AI-Generated Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.insights.map((insight, index) => (
                <InsightCard key={index} {...insight} index={index} />
              ))}
            </div>

            {/* Strategic Opportunities */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-400" />
                Strategic Opportunities
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OpportunityCard
                  title="Federal Infrastructure Program"
                  description="$12M in construction contracts opening for northern communities"
                  value="$2.4M"
                  timeline="Q2 2025"
                  probability={78}
                  requirements={[
                    'Bonding capacity $500K+',
                    'Safety certification',
                    'Equipment availability'
                  ]}
                />
                <OpportunityCard
                  title="Digital Transformation Initiative"
                  description="IT services and training for government modernization"
                  value="$850K"
                  timeline="Q1 2025"
                  probability={85}
                  requirements={[
                    'Cloud expertise',
                    'Security clearance',
                    'Bilingual staff'
                  ]}
                />
              </div>
            </GlassPanel>

            {/* Community Strengths */}
            <GlassPanel>
              <h3 className="text-lg font-semibold text-white mb-6">
                Community Competitive Advantages
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StrengthCard
                  title="Geographic Advantage"
                  description="Strategic location for northern supply chain"
                  icon={MapPin}
                  score={92}
                />
                <StrengthCard
                  title="Skilled Workforce"
                  description="High concentration of certified trades"
                  icon={GraduationCap}
                  score={88}
                />
                <StrengthCard
                  title="Cultural Expertise"
                  description="Deep understanding of regional needs"
                  icon={Heart}
                  score={95}
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

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  subtitle 
}: {
  title: string
  value: string | number
  icon: any
  color: string
  trend: number
  subtitle: string
}) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    green: 'text-green-400 bg-green-500/20',
    amber: 'text-amber-400 bg-amber-500/20'
  }

  return (
    <GlassPanel>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`flex items-center text-sm ${
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
        }`}>
          <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </GlassPanel>
  )
}

function ImpactCategory({ 
  label, 
  score, 
  icon: Icon, 
  color 
}: {
  label: string
  score: number
  icon: any
  color: string
}) {
  const colorClasses = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400'
  }

  return (
    <div className="text-center">
      <Icon className={`h-8 w-8 mx-auto mb-2 ${colorClasses[color as keyof typeof colorClasses]}`} />
      <div className="text-2xl font-bold text-white">{score}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}

function BusinessCard({ 
  rank, 
  name, 
  value, 
  contracts, 
  employees, 
  growth 
}: {
  rank: number
  name: string
  value: number
  contracts: number
  employees: number
  growth: number
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-semibold">
          {rank}
        </div>
        <div>
          <div className="text-white font-medium">{name}</div>
          <div className="text-sm text-gray-400">
            {contracts} contracts • {employees} employees
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-semibold text-white">
          {formatCurrency(value)}
        </div>
        <div className={`text-sm flex items-center justify-end ${
          growth > 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          <TrendingUp className={`h-3 w-3 mr-1 ${growth < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(growth).toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

function CertificationBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function InsightCard({ 
  type, 
  title, 
  description, 
  impact, 
  index 
}: {
  type: 'opportunity' | 'risk' | 'achievement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  index: number
}) {
  const typeColors = {
    opportunity: 'bg-green-500/20 text-green-400 border-green-400/50',
    risk: 'bg-red-500/20 text-red-400 border-red-400/50',
    achievement: 'bg-blue-500/20 text-blue-400 border-blue-400/50'
  }

  const typeIcons = {
    opportunity: Zap,
    risk: AlertTriangle,
    achievement: Award
  }

  const Icon = typeIcons[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border ${typeColors[type]}`}
    >
      <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-300">{description}</p>
          <div className="mt-2 text-xs">
            Impact: <span className="font-medium capitalize">{impact}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function OpportunityCard({ 
  title, 
  description, 
  value, 
  timeline, 
  probability, 
  requirements 
}: {
  title: string
  description: string
  value: string
  timeline: string
  probability: number
  requirements: string[]
}) {
  return (
    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500">Potential Value</div>
          <div className="text-xl font-semibold text-green-400">{value}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Timeline</div>
          <div className="text-xl font-semibold text-white">{timeline}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Success Probability</span>
          <span className="text-white">{probability}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
            style={{ width: `${probability}%` }}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">Key Requirements</div>
        <ul className="space-y-1">
          {requirements.map((req, index) => (
            <li key={index} className="text-xs text-gray-400 flex items-center">
              <ChevronRight className="h-3 w-3 mr-1 text-blue-400" />
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StrengthCard({ 
  title, 
  description, 
  icon: Icon, 
  score 
}: {
  title: string
  description: string
  icon: any
  score: number
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
        <Icon className="h-8 w-8 text-purple-400" />
      </div>
      <h4 className="text-white font-medium mb-2">{title}</h4>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <div className="flex items-center justify-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(score / 20) 
                ? 'text-amber-400 fill-amber-400' 
                : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 ml-2">{score}/100</span>
      </div>
    </div>
  )
}