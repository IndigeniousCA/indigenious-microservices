// Compliance Tracker Component
// Federal Indigenous procurement target monitoring

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, TrendingUp, TrendingDown, Minus, AlertCircle,
  CheckCircle, Info, Download, Filter, Calendar,
  Building, DollarSign, Award, ChevronRight, ArrowUpRight,
  ArrowDownRight, BarChart3, Clock, Shield
} from 'lucide-react'
import { ComplianceMetrics, DepartmentCompliance, ComplianceTrend } from '../types/analytics.types'

interface ComplianceTrackerProps {
  compliance?: ComplianceMetrics | null
  onDrillDown?: (department: DepartmentCompliance) => void
  onExport?: () => void
}

export function ComplianceTracker({
  compliance,
  onDrillDown,
  onExport
}: ComplianceTrackerProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortBy, setSortBy] = useState<'compliance' | 'spend' | 'contracts'>('compliance')
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non-compliant'>('all')

  // Get compliance status color and icon
  const getComplianceStatus = (rate: number) => {
    if (rate >= 5) {
      return {
        status: 'Compliant',
        color: 'emerald',
        icon: CheckCircle,
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-400/30'
      }
    } else if (rate >= 3) {
      return {
        status: 'Approaching',
        color: 'amber',
        icon: AlertCircle,
        bg: 'bg-amber-500/20',
        border: 'border-amber-400/30'
      }
    } else {
      return {
        status: 'Non-Compliant',
        color: 'red',
        icon: AlertCircle,
        bg: 'bg-red-500/20',
        border: 'border-red-400/30'
      }
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return { icon: TrendingUp, color: 'emerald' }
      case 'declining':
        return { icon: TrendingDown, color: 'red' }
      default:
        return { icon: Minus, color: 'gray' }
    }
  }

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

  // Filter and sort departments
  const filteredDepartments = compliance?.departments
    ?.filter(dept => {
      if (filterStatus === 'all') return true
      if (filterStatus === 'compliant') return dept.complianceRate >= 5
      return dept.complianceRate < 5
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case 'spend':
          return b.indigenousSpend - a.indigenousSpend
        case 'contracts':
          return b.indigenousContractCount - a.indigenousContractCount
        default:
          return b.complianceRate - a.complianceRate
      }
    }) || []

  const overallStatus = getComplianceStatus(compliance?.overallCompliance || 0)

  return (
    <div className="space-y-6">
      {/* Overall Compliance Status */}
      <div className={`${overallStatus.bg} backdrop-blur-md ${overallStatus.border} 
        border rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 bg-${overallStatus.color}-500/20 rounded-xl`}>
              <Shield className={`w-8 h-8 text-${overallStatus.color}-400`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Federal Compliance Dashboard
              </h2>
              <p className="text-white/70">
                5% Indigenous Procurement Target Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onExport}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Current Compliance */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Current Rate</p>
            <p className={`text-4xl font-bold text-${overallStatus.color}-300`}>
              {compliance?.overallCompliance.toFixed(2)}%
            </p>
            <p className={`text-${overallStatus.color}-300 text-sm mt-1`}>
              {overallStatus.status}
            </p>
          </div>

          {/* Target */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Federal Target</p>
            <p className="text-4xl font-bold text-white">5.0%</p>
            <p className="text-white/60 text-sm mt-1">Required</p>
          </div>

          {/* Gap */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Gap to Target</p>
            <p className="text-4xl font-bold text-white">
              {(compliance?.overallCompliance ?? 0) >= 5
                ? 'Met'
                : `${(5 - (compliance?.overallCompliance ?? 0)).toFixed(2)}%`}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {(compliance?.overallCompliance ?? 0) >= 5 ? 'Target Achieved' : 'Remaining'}
            </p>
          </div>

          {/* Indigenous Spend */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Indigenous Spend</p>
            <p className="text-3xl font-bold text-purple-300">
              {formatCurrency(compliance?.indigenousProcurement || 0)}
            </p>
            <p className="text-white/60 text-sm mt-1">This Period</p>
          </div>

          {/* Projected */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">Year-End Projection</p>
            <p className={`text-3xl font-bold ${
              (compliance?.projectedCompliance ?? 0) >= 5
                ? 'text-emerald-300'
                : 'text-amber-300'
            }`}>
              {(compliance?.projectedCompliance ?? 0).toFixed(2)}%
            </p>
            <p className="text-white/60 text-sm mt-1">Estimated</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-6 bg-white/10 rounded-full overflow-hidden relative">
            <div
              className={`h-full bg-gradient-to-r from-${overallStatus.color}-400 
                to-${overallStatus.color}-600 transition-all duration-1000`}
              style={{ 
                width: `${Math.min(
                  ((compliance?.overallCompliance ?? 0) / 5) * 100, 
                  100
                )}%` 
              }}
            />
            <div 
              className="absolute top-0 h-full w-0.5 bg-white/60"
              style={{ left: '100%' }}
            >
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/80 
                text-sm font-medium whitespace-nowrap">
                5% Target
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'compliant' | 'non-compliant')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all" className="bg-gray-800">All Departments</option>
            <option value="compliant" className="bg-gray-800">Compliant Only</option>
            <option value="non-compliant" className="bg-gray-800">Non-Compliant</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'contracts' | 'compliance' | 'spend')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="compliance" className="bg-gray-800">Sort by Compliance</option>
            <option value="spend" className="bg-gray-800">Sort by Spend</option>
            <option value="contracts" className="bg-gray-800">Sort by Contracts</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${
              viewMode === 'list'
                ? 'bg-purple-500/20 text-purple-200'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid'
                ? 'bg-purple-500/20 text-purple-200'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Department Compliance */}
      {viewMode === 'list' ? (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/80 font-medium">Department</th>
                <th className="text-center px-6 py-4 text-white/80 font-medium">Compliance</th>
                <th className="text-center px-6 py-4 text-white/80 font-medium">Indigenous Spend</th>
                <th className="text-center px-6 py-4 text-white/80 font-medium">Contracts</th>
                <th className="text-center px-6 py-4 text-white/80 font-medium">Trend</th>
                <th className="text-center px-6 py-4 text-white/80 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map(dept => {
                const status = getComplianceStatus(dept.complianceRate)
                const trend = getTrendIcon(dept.trend)
                
                return (
                  <motion.tr
                    key={dept.departmentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors 
                      cursor-pointer"
                    onClick={() => onDrillDown?.(dept)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-white/60" />
                        <div>
                          <p className="text-white font-medium">{dept.departmentName}</p>
                          <p className="text-white/60 text-sm">
                            {dept.contractCount} total contracts
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <p className={`text-xl font-bold text-${status.color}-300`}>
                          {dept.complianceRate.toFixed(2)}%
                        </p>
                        {dept.complianceRate >= 5 && (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <p className="text-white font-medium">
                        {formatCurrency(dept.indigenousSpend)}
                      </p>
                      <p className="text-white/60 text-sm">
                        of {formatCurrency(dept.totalSpend)}
                      </p>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <p className="text-white font-medium">
                        {dept.indigenousContractCount}
                      </p>
                      <p className="text-white/60 text-sm">
                        Indigenous
                      </p>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <trend.icon className={`w-5 h-5 text-${trend.color}-400`} />
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 ${status.bg} ${status.border} 
                          border rounded-full text-${status.color}-300 text-sm`}>
                          {status.status}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => {
            const status = getComplianceStatus(dept.complianceRate)
            const trend = getTrendIcon(dept.trend)
            const TrendIcon = trend.icon
            
            return (
              <motion.div
                key={dept.departmentId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${status.bg} ${status.border} border rounded-xl p-6 
                  hover:scale-105 transition-all cursor-pointer`}
                onClick={() => onDrillDown?.(dept)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <Building className={`w-6 h-6 text-${status.color}-400`} />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold line-clamp-1">
                        {dept.departmentName}
                      </h4>
                      <p className="text-white/60 text-sm">
                        {dept.contractCount} contracts
                      </p>
                    </div>
                  </div>
                  
                  <TrendIcon className={`w-5 h-5 text-${trend.color}-400`} />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60 text-sm">Compliance Rate</span>
                      <span className={`text-2xl font-bold text-${status.color}-300`}>
                        {dept.complianceRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-${status.color}-400 
                          to-${status.color}-600 transition-all`}
                        style={{ width: `${Math.min((dept.complianceRate / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Indigenous Spend</span>
                      <span className="text-white font-medium">
                        {formatCurrency(dept.indigenousSpend)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Indigenous Contracts</span>
                      <span className="text-white font-medium">
                        {dept.indigenousContractCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2 py-1 ${status.bg} border ${status.border} 
                    rounded-full text-${status.color}-300 text-xs`}>
                    {status.status}
                  </span>
                  
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Historical Trend */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Compliance Trend (Last 12 Months)
        </h3>
        
        {/* Trend chart would go here */}
        <div className="h-64 flex items-center justify-center text-white/40">
          <BarChart3 className="w-8 h-8 mr-2" />
          <span>Historical compliance chart</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-200 font-medium mb-1">
              About the 5% Target
            </p>
            <p className="text-blue-100/80 text-sm">
              The Government of Canada has committed to ensuring a minimum of 5% of the total 
              value of contracts is awarded to Indigenous businesses. This dashboard tracks 
              real-time progress toward this mandatory target across all federal departments 
              and agencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}