// Regional Dashboard Component
// Geographic analytics and regional insights

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, TrendingUp, Users, Briefcase, DollarSign,
  BarChart3, PieChart, Target, Award, AlertCircle,
  CheckCircle, Info, Download, Filter, Calendar,
  Feather, Building, Globe, Wifi, Car
} from 'lucide-react'
import { Territory, Community, RegionalMetrics } from '../types/geographic.types'
import { useTerritory } from '../hooks/useTerritory'
import { useCommunityData } from '../hooks/useCommunityData'

interface RegionalDashboardProps {
  selectedRegion?: string
  onRegionSelect?: (region: string) => void
  onCommunityClick?: (community: Community) => void
}

export function RegionalDashboard({
  selectedRegion = 'all',
  onRegionSelect,
  onCommunityClick
}: RegionalDashboardProps) {
  const { territories } = useTerritory()
  const { communities } = useCommunityData()
  
  const [viewMode, setViewMode] = useState<'overview' | 'economic' | 'infrastructure' | 'compliance'>('overview')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [showOnlyActive, setShowOnlyActive] = useState(false)

  // Calculate regional metrics
  const regionalMetrics = useMemo(() => {
    const provinces = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'NL', 'NT', 'YT', 'NU']
    const metrics: Record<string, RegionalMetrics> = {}

    provinces.forEach(province => {
      const provinceCommunities = communities.filter(c => c.location.province === province)
      const provinceTerritories = territories.filter(t => 
        t.communities.some(cId => 
          provinceCommunities.some(c => c.id === cId)
        )
      )

      metrics[province] = {
        region: province,
        boundingBox: [0, 0, 0, 0], // Would calculate actual bounds
        territories: provinceTerritories.map(t => t.id),
        communities: provinceCommunities.length,
        population: provinceCommunities.reduce((sum, c) => sum + c.population.total, 0),
        businesses: provinceCommunities.reduce((sum, c) => sum + c.economic.businesses, 0),
        opportunities: {
          total: Math.floor(Math.random() * 100) + 20, // Mock data
          value: Math.floor(Math.random() * 50000000) + 5000000,
          awarded: Math.floor(Math.random() * 50) + 10,
          indigenous: Math.floor(Math.random() * 30) + 5
        },
        economicImpact: {
          totalSpend: Math.floor(Math.random() * 100000000) + 10000000,
          indigenousSpend: Math.floor(Math.random() * 50000000) + 5000000,
          percentageIndigenous: Math.floor(Math.random() * 20) + 5,
          jobsCreated: Math.floor(Math.random() * 500) + 100
        },
        infrastructure: {
          connectedCommunities: provinceCommunities.filter(c => 
            ['fiber', 'broadband'].includes(c.infrastructure.internetSpeed || '')
          ).length,
          limitedAccess: provinceCommunities.filter(c => 
            c.infrastructure.roadAccess !== 'year-round'
          ).length,
          seasonalAccess: provinceCommunities.filter(c => 
            c.infrastructure.roadAccess === 'seasonal'
          ).length
        }
      }
    })

    // National totals
    metrics['all'] = {
      region: 'Canada',
      boundingBox: [-141, 42, -52, 83],
      territories: territories.map(t => t.id),
      communities: communities.length,
      population: communities.reduce((sum, c) => sum + c.population.total, 0),
      businesses: communities.reduce((sum, c) => sum + c.economic.businesses, 0),
      opportunities: {
        total: Object.values(metrics).reduce((sum, m) => sum + m.opportunities.total, 0),
        value: Object.values(metrics).reduce((sum, m) => sum + m.opportunities.value, 0),
        awarded: Object.values(metrics).reduce((sum, m) => sum + m.opportunities.awarded, 0),
        indigenous: Object.values(metrics).reduce((sum, m) => sum + m.opportunities.indigenous, 0)
      },
      economicImpact: {
        totalSpend: Object.values(metrics).reduce((sum, m) => sum + m.economicImpact.totalSpend, 0),
        indigenousSpend: Object.values(metrics).reduce((sum, m) => sum + m.economicImpact.indigenousSpend, 0),
        percentageIndigenous: 12.5,
        jobsCreated: Object.values(metrics).reduce((sum, m) => sum + m.economicImpact.jobsCreated, 0)
      },
      infrastructure: {
        connectedCommunities: communities.filter(c => 
          ['fiber', 'broadband'].includes(c.infrastructure.internetSpeed || '')
        ).length,
        limitedAccess: communities.filter(c => 
          c.infrastructure.roadAccess !== 'year-round'
        ).length,
        seasonalAccess: communities.filter(c => 
          c.infrastructure.roadAccess === 'seasonal'
        ).length
      }
    }

    return metrics
  }, [communities, territories])

  const currentMetrics = regionalMetrics[selectedRegion] || regionalMetrics['all']
  const filteredCommunities = selectedRegion === 'all' 
    ? communities 
    : communities.filter(c => c.location.province === selectedRegion)

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toLocaleString()}`
  }

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  // Get compliance status
  const getComplianceStatus = (percentage: number) => {
    if (percentage >= 5) return { status: 'compliant', color: 'emerald', icon: CheckCircle }
    if (percentage >= 3) return { status: 'approaching', color: 'amber', icon: AlertCircle }
    return { status: 'non-compliant', color: 'red', icon: AlertCircle }
  }

  const complianceStatus = getComplianceStatus(currentMetrics.economicImpact.percentageIndigenous)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Regional Analytics</h2>
          <p className="text-white/70">
            Geographic insights and performance metrics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Region Selector */}
          <select
            value={selectedRegion}
            onChange={(e) => onRegionSelect?.(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all" className="bg-gray-800">All Canada</option>
            <optgroup label="Provinces" className="bg-gray-800">
              <option value="ON" className="bg-gray-800">Ontario</option>
              <option value="BC" className="bg-gray-800">British Columbia</option>
              <option value="AB" className="bg-gray-800">Alberta</option>
              <option value="SK" className="bg-gray-800">Saskatchewan</option>
              <option value="MB" className="bg-gray-800">Manitoba</option>
              <option value="QC" className="bg-gray-800">Quebec</option>
              <option value="NB" className="bg-gray-800">New Brunswick</option>
              <option value="NS" className="bg-gray-800">Nova Scotia</option>
              <option value="NL" className="bg-gray-800">Newfoundland</option>
            </optgroup>
            <optgroup label="Territories" className="bg-gray-800">
              <option value="NT" className="bg-gray-800">Northwest Territories</option>
              <option value="YT" className="bg-gray-800">Yukon</option>
              <option value="NU" className="bg-gray-800">Nunavut</option>
            </optgroup>
          </select>

          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
            border border-purple-400/50 rounded-lg text-purple-200 
            transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['overview', 'economic', 'infrastructure', 'compliance'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                viewMode === mode
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Overview Metrics */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 
              backdrop-blur-md border border-purple-400/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <Feather className="w-8 h-8 text-purple-400" />
              <Map className="w-5 h-5 text-purple-300" />
            </div>
            <p className="text-white/70 text-sm">Communities</p>
            <p className="text-3xl font-bold text-white mt-1">
              {currentMetrics.communities}
            </p>
            <p className="text-purple-300 text-sm mt-2">
              {currentMetrics.territories.length} territories
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 
              backdrop-blur-md border border-blue-400/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <TrendingUp className="w-5 h-5 text-blue-300" />
            </div>
            <p className="text-white/70 text-sm">Population</p>
            <p className="text-3xl font-bold text-white mt-1">
              {currentMetrics.population.toLocaleString()}
            </p>
            <p className="text-blue-300 text-sm mt-2">
              Indigenous peoples
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 
              backdrop-blur-md border border-emerald-400/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <Briefcase className="w-8 h-8 text-emerald-400" />
              <BarChart3 className="w-5 h-5 text-emerald-300" />
            </div>
            <p className="text-white/70 text-sm">Businesses</p>
            <p className="text-3xl font-bold text-white mt-1">
              {currentMetrics.businesses}
            </p>
            <p className="text-emerald-300 text-sm mt-2">
              Indigenous-owned
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 
              backdrop-blur-md border border-amber-400/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <DollarSign className="w-8 h-8 text-amber-400" />
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <p className="text-white/70 text-sm">Opportunities</p>
            <p className="text-3xl font-bold text-white mt-1">
              {currentMetrics.opportunities.total}
            </p>
            <p className="text-amber-300 text-sm mt-2">
              {formatCurrency(currentMetrics.opportunities.value)}
            </p>
          </motion.div>
        </div>
      )}

      {/* Economic Impact View */}
      {viewMode === 'economic' && (
        <div className="space-y-6">
          {/* Economic Summary */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 
            backdrop-blur-md border border-emerald-400/30 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Economic Impact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-white/70 text-sm">Total Procurement</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(currentMetrics.economicImpact.totalSpend)}
                </p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Indigenous Spend</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(currentMetrics.economicImpact.indigenousSpend)}
                </p>
                <p className="text-emerald-300 text-sm">
                  {formatPercentage(currentMetrics.economicImpact.percentageIndigenous)}
                </p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Jobs Created</p>
                <p className="text-2xl font-bold text-white">
                  {currentMetrics.economicImpact.jobsCreated}
                </p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Avg per Community</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(
                    currentMetrics.economicImpact.indigenousSpend / 
                    (currentMetrics.communities || 1)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Top Communities by Economic Activity */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Top Communities by Economic Activity
            </h3>
            
            <div className="space-y-3">
              {filteredCommunities
                .sort((a, b) => b.economic.businesses - a.economic.businesses)
                .slice(0, 5)
                .map((community, index) => (
                  <div
                    key={community.id}
                    onClick={() => onCommunityClick?.(community)}
                    className="flex items-center justify-between p-3 bg-white/5 
                      rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full 
                        flex items-center justify-center">
                        <span className="text-purple-300 font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{community.name}</p>
                        <p className="text-white/60 text-sm">{community.nation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {community.economic.businesses} businesses
                      </p>
                      <p className="text-white/60 text-sm">
                        {community.economic.employmentRate}% employment
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Infrastructure View */}
      {viewMode === 'infrastructure' && (
        <div className="space-y-6">
          {/* Infrastructure Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Wifi className="w-6 h-6 text-blue-400" />
                <span className="text-emerald-300 text-sm">
                  {Math.round(
                    (currentMetrics.infrastructure.connectedCommunities / 
                     currentMetrics.communities) * 100
                  )}%
                </span>
              </div>
              <p className="text-white/70 text-sm">High-Speed Internet</p>
              <p className="text-2xl font-bold text-white">
                {currentMetrics.infrastructure.connectedCommunities}
              </p>
              <p className="text-white/60 text-sm">communities connected</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Car className="w-6 h-6 text-purple-400" />
                <span className="text-amber-300 text-sm">
                  {currentMetrics.infrastructure.limitedAccess}
                </span>
              </div>
              <p className="text-white/70 text-sm">Limited Access</p>
              <p className="text-2xl font-bold text-white">
                {currentMetrics.infrastructure.seasonalAccess}
              </p>
              <p className="text-white/60 text-sm">seasonal roads only</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Building className="w-6 h-6 text-amber-400" />
                <Info className="w-5 h-5 text-white/40" />
              </div>
              <p className="text-white/70 text-sm">Infrastructure Gap</p>
              <p className="text-2xl font-bold text-white">
                ${Math.round(currentMetrics.infrastructure.limitedAccess * 2.5)}M
              </p>
              <p className="text-white/60 text-sm">estimated investment needed</p>
            </div>
          </div>

          {/* Infrastructure by Community */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Infrastructure Status by Community
            </h3>
            
            <div className="space-y-2">
              {filteredCommunities.slice(0, 10).map(community => (
                <div
                  key={community.id}
                  className="flex items-center justify-between p-3 bg-white/5 
                    rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="space-y-1">
                      <p className="text-white font-medium">{community.name}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`flex items-center space-x-1 ${
                          ['fiber', 'broadband'].includes(community.infrastructure.internetSpeed || '')
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }`}>
                          <Wifi className="w-3 h-3" />
                          <span className="capitalize">
                            {community.infrastructure.internetSpeed}
                          </span>
                        </span>
                        <span className={`flex items-center space-x-1 ${
                          community.infrastructure.roadAccess === 'year-round'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }`}>
                          <Car className="w-3 h-3" />
                          <span className="capitalize">
                            {community.infrastructure.roadAccess.replace(/-/g, ' ')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compliance View */}
      {viewMode === 'compliance' && (
        <div className="space-y-6">
          {/* Federal Compliance Status */}
          <div className={`bg-gradient-to-r from-${complianceStatus.color}-500/20 
            to-${complianceStatus.color}-600/20 backdrop-blur-md 
            border border-${complianceStatus.color}-400/30 rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <complianceStatus.icon className={`w-8 h-8 text-${complianceStatus.color}-400`} />
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Federal Procurement Target
                  </h3>
                  <p className="text-white/70">
                    5% Indigenous procurement requirement
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-white">
                  {formatPercentage(currentMetrics.economicImpact.percentageIndigenous)}
                </p>
                <p className={`text-${complianceStatus.color}-300 capitalize`}>
                  {complianceStatus.status}
                </p>
              </div>
            </div>

            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-${complianceStatus.color}-400 
                  to-${complianceStatus.color}-600 transition-all`}
                style={{ 
                  width: `${Math.min(
                    (currentMetrics.economicImpact.percentageIndigenous / 5) * 100, 
                    100
                  )}%` 
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/60 text-sm">Total Contracts</p>
                <p className="text-white font-medium">
                  {currentMetrics.opportunities.total}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Indigenous Awards</p>
                <p className="text-white font-medium">
                  {currentMetrics.opportunities.indigenous}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Gap to Target</p>
                <p className="text-white font-medium">
                  {currentMetrics.economicImpact.percentageIndigenous >= 5
                    ? 'Target Met'
                    : `${(5 - currentMetrics.economicImpact.percentageIndigenous).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Regional Compliance Breakdown */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Compliance by Department
            </h3>
            
            <div className="space-y-3">
              {[
                { name: 'Public Services and Procurement', percentage: 7.2, contracts: 45 },
                { name: 'Indigenous Services Canada', percentage: 15.8, contracts: 23 },
                { name: 'Natural Resources Canada', percentage: 4.5, contracts: 18 },
                { name: 'Environment and Climate Change', percentage: 3.2, contracts: 12 },
                { name: 'Transport Canada', percentage: 2.8, contracts: 8 }
              ].map(dept => {
                const status = getComplianceStatus(dept.percentage)
                return (
                  <div key={dept.name} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{dept.name}</p>
                      <div className="flex items-center space-x-2">
                        <status.icon className={`w-4 h-4 text-${status.color}-400`} />
                        <span className={`text-${status.color}-300 font-medium`}>
                          {formatPercentage(dept.percentage)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-${status.color}-400 
                          to-${status.color}-600`}
                        style={{ width: `${Math.min((dept.percentage / 5) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                      {dept.contracts} contracts
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-200 font-medium mb-1">
              Regional Data Collection
            </p>
            <p className="text-blue-100/80 text-sm">
              This dashboard aggregates data from {currentMetrics.communities} Indigenous 
              communities across {currentMetrics.territories.length} territories. Metrics 
              are updated monthly to track progress toward federal procurement targets and 
              community economic development goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}