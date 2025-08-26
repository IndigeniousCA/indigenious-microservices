// Indigenous Impact Dashboard Component
// Track and visualize economic impact on Indigenous communities

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Feather, Users, Building, Target, TrendingUp,
  MapPin, Calendar, Award, Briefcase, Heart,
  BookOpen, Globe, Shield, BarChart3, PieChart,
  Info, Download, Share2, CheckCircle, AlertCircle, DollarSign
} from 'lucide-react'
import { formatCurrency, formatPercentage, formatNumber } from '../utils/formatters'

interface IndigenousImpactDashboardProps {
  projectId?: string
  onGenerateReport?: () => void
}

interface CommunityImpact {
  communityName: string
  nation: string
  province: string
  totalSpend: number
  jobsCreated: number
  businessesEngaged: number
  youthTrained: number
  lastEngagement: string
}

interface ImpactMetric {
  label: string
  value: number | string
  change?: number
  target?: number
  unit?: string
  icon?: any
  color?: string
}

export function IndigenousImpactDashboard({ 
  projectId, 
  onGenerateReport 
}: IndigenousImpactDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('quarter')
  const [selectedMetric, setSelectedMetric] = useState<'economic' | 'social' | 'cultural'>('economic')

  // Mock data - in production, fetch from API
  const impactData = {
    totalProcurement: 4875000,
    percentageOfSpend: 12.3,
    federalTarget: 5,
    indigenousBusinesses: 47,
    communities: 12,
    jobsCreated: 156,
    youthTrained: 89,
    eldersEngaged: 24,
    culturalEvents: 18,
    languagePreservation: 6,
    traditionalPractices: 15
  }

  // Community breakdown
  const communities: CommunityImpact[] = [
    {
      communityName: "Six Nations of the Grand River",
      nation: "Haudenosaunee",
      province: "Ontario",
      totalSpend: 1250000,
      jobsCreated: 45,
      businessesEngaged: 12,
      youthTrained: 23,
      lastEngagement: "2024-01-15"
    },
    {
      communityName: "Tyendinaga Mohawk Territory",
      nation: "Mohawk",
      province: "Ontario",
      totalSpend: 875000,
      jobsCreated: 28,
      businessesEngaged: 8,
      youthTrained: 15,
      lastEngagement: "2024-01-20"
    },
    {
      communityName: "Mi'kmaq First Nation",
      nation: "Mi'kmaq",
      province: "Nova Scotia",
      totalSpend: 650000,
      jobsCreated: 22,
      businessesEngaged: 6,
      youthTrained: 12,
      lastEngagement: "2024-01-10"
    },
    {
      communityName: "Cree Nation of Mistissini",
      nation: "Cree",
      province: "Quebec",
      totalSpend: 520000,
      jobsCreated: 18,
      businessesEngaged: 5,
      youthTrained: 10,
      lastEngagement: "2024-01-18"
    }
  ]

  // Impact metrics by category
  const metrics: Record<string, ImpactMetric[]> = {
    economic: [
      {
        label: "Total Indigenous Procurement",
        value: impactData.totalProcurement,
        change: 15.5,
        unit: "currency",
        icon: DollarSign,
        color: "emerald"
      },
      {
        label: "% of Total Spend",
        value: impactData.percentageOfSpend,
        target: impactData.federalTarget,
        unit: "percentage",
        icon: Target,
        color: "blue"
      },
      {
        label: "Indigenous Businesses",
        value: impactData.indigenousBusinesses,
        change: 23,
        unit: "count",
        icon: Building,
        color: "purple"
      },
      {
        label: "Communities Engaged",
        value: impactData.communities,
        change: 8,
        unit: "count",
        icon: Users,
        color: "amber"
      }
    ],
    social: [
      {
        label: "Jobs Created",
        value: impactData.jobsCreated,
        change: 18,
        unit: "count",
        icon: Briefcase,
        color: "blue"
      },
      {
        label: "Youth Trained",
        value: impactData.youthTrained,
        change: 32,
        unit: "count",
        icon: BookOpen,
        color: "pink"
      },
      {
        label: "Elders Engaged",
        value: impactData.eldersEngaged,
        change: 12,
        unit: "count",
        icon: Heart,
        color: "red"
      },
      {
        label: "Capacity Building Hours",
        value: 1240,
        change: 45,
        unit: "hours",
        icon: TrendingUp,
        color: "emerald"
      }
    ],
    cultural: [
      {
        label: "Cultural Events Supported",
        value: impactData.culturalEvents,
        change: 20,
        unit: "count",
        icon: Calendar,
        color: "purple"
      },
      {
        label: "Language Programs",
        value: impactData.languagePreservation,
        unit: "count",
        icon: Globe,
        color: "indigo"
      },
      {
        label: "Traditional Practices",
        value: impactData.traditionalPractices,
        change: 15,
        unit: "count",
        icon: Feather,
        color: "amber"
      },
      {
        label: "Sacred Site Protection",
        value: 8,
        unit: "count",
        icon: Shield,
        color: "red"
      }
    ]
  }

  // Calculate compliance status
  const complianceStatus = useMemo(() => {
    const isCompliant = impactData.percentageOfSpend >= impactData.federalTarget
    const surplus = impactData.percentageOfSpend - impactData.federalTarget
    
    return {
      isCompliant,
      surplus,
      level: isCompliant ? 
        (surplus > 5 ? 'excellent' : 'good') : 
        (impactData.percentageOfSpend > 3 ? 'approaching' : 'needs_improvement')
    }
  }, [impactData])

  // Format metric value
  const formatMetricValue = (metric: ImpactMetric): string => {
    switch (metric.unit) {
      case 'currency':
        return formatCurrency(metric.value as number, 'CAD')
      case 'percentage':
        return formatPercentage(metric.value as number)
      case 'hours':
        return `${formatNumber(metric.value as number)} hrs`
      default:
        return formatNumber(metric.value as number)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Feather className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Indigenous Economic Impact
            </h2>
            <p className="text-white/70">
              Tracking community benefits and reconciliation metrics
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="month" className="bg-gray-800">This Month</option>
            <option value="quarter" className="bg-gray-800">This Quarter</option>
            <option value="year" className="bg-gray-800">This Year</option>
          </select>

          <button
            onClick={onGenerateReport}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
              border border-purple-400/50 rounded-lg text-purple-200 
              font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Impact Report</span>
          </button>
        </div>
      </div>

      {/* Compliance Banner */}
      <div className={`p-6 rounded-xl border ${
        complianceStatus.isCompliant
          ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-400/30'
          : 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {complianceStatus.isCompliant ? (
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-400" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                Federal Procurement Target: {complianceStatus.isCompliant ? 'Exceeded' : 'In Progress'}
              </h3>
              <p className="text-white/80">
                Current: {formatPercentage(impactData.percentageOfSpend)} | 
                Target: {formatPercentage(impactData.federalTarget)} | 
                Surplus: {formatPercentage(complianceStatus.surplus)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {formatPercentage(impactData.percentageOfSpend)}
            </div>
            <p className="text-white/60 text-sm">Indigenous procurement</p>
          </div>
        </div>

        <div className="mt-4 h-3 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              complianceStatus.isCompliant
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                : 'bg-gradient-to-r from-amber-400 to-amber-600'
            }`}
            style={{ width: `${Math.min((impactData.percentageOfSpend / 20) * 100, 100)}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/60">0%</span>
          <div className="flex items-center space-x-4">
            <span className="text-white/80 flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>5% Federal Target</span>
            </span>
            <span className="text-purple-300 flex items-center space-x-1">
              <Award className="w-4 h-4" />
              <span>10% Best Practice</span>
            </span>
          </div>
          <span className="text-white/60">20%</span>
        </div>
      </div>

      {/* Metric Categories */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['economic', 'social', 'cultural'] as const).map(category => (
          <button
            key={category}
            onClick={() => setSelectedMetric(category)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedMetric === category
                ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)} Impact
          </button>
        ))}
      </div>

      {/* Impact Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics[selectedMetric].map((metric, index) => {
          const Icon = metric.icon
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br from-${metric.color}-500/20 to-${metric.color}-600/20 
                backdrop-blur-md border border-${metric.color}-400/30 rounded-xl p-6`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 bg-${metric.color}-500/20 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center space-x-1 text-sm ${
                    metric.change > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                    <span>{Math.abs(metric.change)}%</span>
                  </div>
                )}
              </div>

              <p className="text-white/70 text-sm mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-white">
                {formatMetricValue(metric)}
              </p>

              {metric.target && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/50">Target</span>
                    <span className="text-white/70">{metric.target}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        (metric.value as number) >= metric.target
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                      style={{ 
                        width: `${Math.min(((metric.value as number) / metric.target) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Community Impact Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Community Breakdown</h3>
          <button className="text-purple-300 hover:text-purple-200 text-sm 
            flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>View Map</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Community</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Nation</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Total Spend</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Jobs</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Businesses</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Youth</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Impact Score</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community, index) => {
                const impactScore = Math.round(
                  (community.totalSpend / 1000000) * 20 +
                  community.jobsCreated * 2 +
                  community.businessesEngaged * 3 +
                  community.youthTrained * 1.5
                )

                return (
                  <tr
                    key={index}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{community.communityName}</p>
                        <p className="text-white/60 text-sm">{community.province}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-white/80">{community.nation}</td>
                    <td className="py-4 px-4 text-right text-white font-medium">
                      {formatCurrency(community.totalSpend, 'CAD')}
                    </td>
                    <td className="py-4 px-4 text-center text-white/80">
                      {community.jobsCreated}
                    </td>
                    <td className="py-4 px-4 text-center text-white/80">
                      {community.businessesEngaged}
                    </td>
                    <td className="py-4 px-4 text-center text-white/80">
                      {community.youthTrained}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="flex space-x-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-8 rounded-full ${
                                i < Math.ceil(impactScore / 20)
                                  ? 'bg-purple-400'
                                  : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-white/60 text-sm">{impactScore}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {formatCurrency(communities.reduce((sum, c) => sum + c.totalSpend, 0), 'CAD')}
            </p>
            <p className="text-white/60 text-sm">Direct Investment</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {communities.reduce((sum, c) => sum + c.jobsCreated, 0)}
            </p>
            <p className="text-white/60 text-sm">Total Jobs</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {communities.reduce((sum, c) => sum + c.businessesEngaged, 0)}
            </p>
            <p className="text-white/60 text-sm">Partner Businesses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {communities.reduce((sum, c) => sum + c.youthTrained, 0)}
            </p>
            <p className="text-white/60 text-sm">Future Leaders</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 
        backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-5 h-5 text-purple-400" />
          <h4 className="text-lg font-medium text-white">
            Strengthening Indigenous Partnerships
          </h4>
        </div>
        <p className="text-white/80 mb-4">
          Your organization is making significant progress in Indigenous economic reconciliation. 
          Continue building these vital partnerships to create lasting positive change in communities.
        </p>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
            border border-purple-400/50 rounded-lg text-purple-200 
            transition-colors flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Find More Partners</span>
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 
            border border-white/20 rounded-lg text-white/80 
            transition-colors flex items-center space-x-2">
            <Share2 className="w-4 h-4" />
            <span>Share Success Stories</span>
          </button>
        </div>
      </div>
    </div>
  )
}