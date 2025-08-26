// Vendor Performance Dashboard Component
// Main interface for viewing vendor performance metrics and history

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Minus, Star, Award, AlertTriangle,
  Calendar, DollarSign, Users, Shield, BarChart3, FileText,
  ChevronRight, Download, Share2, Building
} from 'lucide-react'
import { PerformanceMetrics } from './PerformanceMetrics'
import { ProjectHistory } from './ProjectHistory'
import { ReviewsSection } from './ReviewsSection'
import { CertificationsAwards } from './CertificationsAwards'
import { RiskAnalysis } from './RiskAnalysis'
import { useVendorPerformance } from '../hooks/useVendorPerformance'
import type { VendorPerformance } from '../types/performance.types'

interface VendorPerformanceDashboardProps {
  vendorId: string
  isOwnProfile?: boolean // Vendor viewing their own profile
  compareTo?: string[] // Other vendor IDs for comparison
}

export function VendorPerformanceDashboard({ 
  vendorId, 
  isOwnProfile = false,
  compareTo = []
}: VendorPerformanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'reviews' | 'certifications' | 'risk'>('overview')
  const [timeRange, setTimeRange] = useState<'all' | '12m' | '6m' | '3m'>('12m')
  const [showComparison, setShowComparison] = useState(false)
  
  const {
    performance,
    loading,
    error,
    comparison,
    refreshData
  } = useVendorPerformance(vendorId, { timeRange, compareTo })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (error || !performance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Performance Data</h2>
          <p className="text-white/60">{error || 'Please try again later'}</p>
        </div>
      </div>
    )
  }

  // Calculate key metrics
  const performanceColor = performance.performanceTrend === 'improving' 
    ? 'text-emerald-400'
    : performance.performanceTrend === 'declining'
    ? 'text-red-400'
    : 'text-blue-400'

  const riskColor = performance.riskProfile.level === 'low'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30'
    : performance.riskProfile.level === 'medium'
    ? 'text-amber-400 bg-amber-500/10 border-amber-400/30'
    : 'text-red-400 bg-red-500/10 border-red-400/30'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{performance.vendorName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {performance.communityAffiliation && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                    {performance.communityAffiliation.nation}
                  </span>
                )}
                <span className="text-white/60">
                  {performance.vendorType.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`flex items-center ${performanceColor}`}>
                  {performance.performanceTrend === 'improving' && <TrendingUp className="w-4 h-4 mr-1" />}
                  {performance.performanceTrend === 'declining' && <TrendingDown className="w-4 h-4 mr-1" />}
                  {performance.performanceTrend === 'stable' && <Minus className="w-4 h-4 mr-1" />}
                  Performance {performance.performanceTrend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {/* Open improvement plan */}}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-xl text-blue-100 font-medium 
                    transition-all duration-200"
                >
                  Improvement Plan
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {/* Export report */}}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                  rounded-xl text-white font-medium transition-all duration-200 
                  flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {/* Share */}}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
                  rounded-xl text-white transition-all duration-200"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Overall Rating */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Overall Rating</span>
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">
                {performance.overallRating.toFixed(1)}
              </span>
              <span className="text-white/60">/5.0</span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              from {performance.totalReviews} reviews
            </p>
          </div>

          {/* Total Projects */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Projects Completed</span>
              <Building className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{performance.totalProjects}</p>
            <p className="text-xs text-white/40 mt-1">
              ${(performance.totalContractValue / 1000000).toFixed(1)}M total value
            </p>
          </div>

          {/* On-Time Delivery */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">On-Time Delivery</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">
                {(performance.metrics.onTimeDelivery.score * 20).toFixed(0)}%
              </span>
              {performance.metrics.onTimeDelivery.trend === 'up' && (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              )}
              {performance.metrics.onTimeDelivery.trend === 'down' && (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-white/40 mt-1">
              {performance.metrics.onTimeDelivery.percentile}th percentile
            </p>
          </div>

          {/* Indigenous Employment */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Indigenous Employment</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">
                {(performance.metrics.indigenousEmployment.score * 20).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              workforce average
            </p>
          </div>

          {/* Risk Level */}
          <div className={`backdrop-blur-md border rounded-xl p-4 ${riskColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Risk Level</span>
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold capitalize">
              {performance.riskProfile.level}
            </p>
            <p className="text-xs opacity-80 mt-1">
              {performance.riskProfile.factors.length} factors
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
            {(['all', '12m', '6m', '3m'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {range === 'all' ? 'All Time' : `Last ${range}`}
              </button>
            ))}
          </div>

          {compareTo.length > 0 && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-xl text-white font-medium transition-all duration-200 
                flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showComparison ? 'Hide' : 'Show'} Comparison
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Projects ({performance.projects.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Reviews ({performance.totalReviews})
          </button>
          <button
            onClick={() => setActiveTab('certifications')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap ${
              activeTab === 'certifications'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Certifications
          </button>
          {(isOwnProfile || performance.riskProfile.level !== 'low') && (
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                whitespace-nowrap flex items-center ${
                activeTab === 'risk'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Risk Analysis
              {performance.riskProfile.level !== 'low' && (
                <span className={`ml-2 w-2 h-2 rounded-full ${
                  performance.riskProfile.level === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
              )}
            </button>
          )}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PerformanceMetrics 
                performance={performance}
                comparison={showComparison ? comparison : undefined}
                timeRange={timeRange}
              />
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProjectHistory 
                projects={performance.projects}
                vendorName={performance.vendorName}
                timeRange={timeRange}
              />
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ReviewsSection 
                reviews={performance.reviews}
                overallRating={performance.overallRating}
                vendorId={vendorId}
                isOwnProfile={isOwnProfile}
              />
            </motion.div>
          )}

          {activeTab === 'certifications' && (
            <motion.div
              key="certifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CertificationsAwards 
                certifications={performance.certifications}
                awards={performance.awards}
                isOwnProfile={isOwnProfile}
              />
            </motion.div>
          )}

          {activeTab === 'risk' && (
            <motion.div
              key="risk"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <RiskAnalysis 
                riskProfile={performance.riskProfile}
                projects={performance.projects}
                isOwnProfile={isOwnProfile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-white/40">
          Last updated: {new Date(performance.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}