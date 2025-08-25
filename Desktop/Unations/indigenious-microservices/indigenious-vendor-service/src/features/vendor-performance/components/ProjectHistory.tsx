// Project History Component
// Displays detailed history of completed projects

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building, Calendar, DollarSign, Users, CheckCircle, 
  XCircle, AlertCircle, ChevronRight, Filter, Download,
  MapPin, Award, Camera, FileText, TrendingUp
} from 'lucide-react'
import type { CompletedProject } from '../types/performance.types'

interface ProjectHistoryProps {
  projects: CompletedProject[]
  vendorName: string
  timeRange: 'all' | '12m' | '6m' | '3m'
}

export function ProjectHistory({ projects, vendorName, timeRange }: ProjectHistoryProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    projectType: 'all',
    clientType: 'all',
    performance: 'all'
  })
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'rating'>('date')

  // Filter projects by time range
  const filterByTimeRange = (project: CompletedProject) => {
    if (timeRange === 'all') return true
    const monthsAgo = parseInt(timeRange)
    const projectDate = new Date(project.completionDate)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo)
    return projectDate >= cutoffDate
  }

  // Apply filters
  const filteredProjects = projects
    .filter(filterByTimeRange)
    .filter(p => filter.projectType === 'all' || p.projectType === filter.projectType)
    .filter(p => filter.clientType === 'all' || p.clientType === filter.clientType)
    .filter(p => {
      if (filter.performance === 'all') return true
      if (filter.performance === 'excellent') return p.performance.qualityScore >= 4.5
      if (filter.performance === 'good') return p.performance.qualityScore >= 3.5
      return p.performance.qualityScore < 3.5
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.contractValue - a.contractValue
        case 'rating':
          return b.performance.qualityScore - a.performance.qualityScore
        default:
          return new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
      }
    })

  // Calculate statistics
  const stats = {
    totalProjects: filteredProjects.length,
    totalValue: filteredProjects.reduce((sum, p) => sum + p.contractValue, 0),
    avgRating: filteredProjects.reduce((sum, p) => sum + p.performance.qualityScore, 0) / filteredProjects.length || 0,
    onTimeRate: (filteredProjects.filter(p => p.performance.onTimeDelivery).length / filteredProjects.length * 100) || 0,
    avgIndigenousContent: filteredProjects.reduce((sum, p) => sum + p.indigenousContent.percentage, 0) / filteredProjects.length || 0
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
    if (score >= 3.5) return 'text-blue-400 bg-blue-500/20 border-blue-400/30'
    if (score >= 2.5) return 'text-amber-400 bg-amber-500/20 border-amber-400/30'
    return 'text-red-400 bg-red-500/20 border-red-400/30'
  }

  const getPerformanceLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent'
    if (score >= 3.5) return 'Good'
    if (score >= 2.5) return 'Fair'
    return 'Poor'
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Projects</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${(stats.totalValue / 1000000).toFixed(1)}M
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Avg Rating</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}/5</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">On-Time Rate</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.onTimeRate.toFixed(0)}%</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Indigenous Content</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.avgIndigenousContent.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-white/60" />
            
            {/* Project Type Filter */}
            <select
              value={filter.projectType}
              onChange={(e) => setFilter(prev => ({ ...prev, projectType: e.target.value }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="construction" className="bg-gray-800">Construction</option>
              <option value="services" className="bg-gray-800">Services</option>
              <option value="supply" className="bg-gray-800">Supply</option>
              <option value="consulting" className="bg-gray-800">Consulting</option>
            </select>

            {/* Client Type Filter */}
            <select
              value={filter.clientType}
              onChange={(e) => setFilter(prev => ({ ...prev, clientType: e.target.value }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Clients</option>
              <option value="government" className="bg-gray-800">Government</option>
              <option value="band_council" className="bg-gray-800">Band Council</option>
              <option value="private" className="bg-gray-800">Private</option>
            </select>

            {/* Performance Filter */}
            <select
              value={filter.performance}
              onChange={(e) => setFilter(prev => ({ ...prev, performance: e.target.value }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Performance</option>
              <option value="excellent" className="bg-gray-800">Excellent</option>
              <option value="good" className="bg-gray-800">Good</option>
              <option value="needsImprovement" className="bg-gray-800">Needs Improvement</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/60">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as unknown)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="date" className="bg-gray-800">Recent First</option>
              <option value="value" className="bg-gray-800">Contract Value</option>
              <option value="rating" className="bg-gray-800">Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
          >
            {/* Project Header */}
            <div 
              className="p-6 cursor-pointer"
              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {project.projectName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-white/60">
                          {project.clientName} ({project.clientType.replace('_', ' ')})
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">
                          ${(project.contractValue / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">
                          {new Date(project.completionDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Performance Badge */}
                  <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium 
                    ${getPerformanceColor(project.performance.qualityScore)}`}>
                    {getPerformanceLabel(project.performance.qualityScore)}
                  </div>

                  {/* Expand Icon */}
                  <motion.div
                    animate={{ rotate: selectedProject === project.id ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </motion.div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  {project.performance.onTimeDelivery ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm text-white/80">
                    {project.performance.onTimeDelivery ? 'On Time' : 'Delayed'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {project.performance.withinBudget ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-sm text-white/80">
                    {project.performance.withinBudget ? 'Within Budget' : 'Over Budget'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white/80">
                    {project.indigenousContent.percentage}% Indigenous
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-white/80">
                    {project.performance.clientSatisfaction.toFixed(1)}/5.0 Satisfaction
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {selectedProject === project.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-white/10"
                >
                  <div className="p-6 space-y-6">
                    {/* Project Timeline */}
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Project Timeline</h4>
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <p className="text-white/60">Start Date</p>
                          <p className="text-white">{new Date(project.startDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex-1 h-0.5 bg-white/20" />
                        <div className="text-right">
                          <p className="text-white/60">Completion Date</p>
                          <p className="text-white">{new Date(project.completionDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Indigenous Content Breakdown */}
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Indigenous Content Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-white/60 mb-1">Employment Hours</p>
                          <p className="text-lg font-semibold text-white">
                            {project.indigenousContent.employmentHours.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-white/60 mb-1">Subcontracting Value</p>
                          <p className="text-lg font-semibold text-white">
                            ${(project.indigenousContent.subcontractingValue / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-white/60 mb-1">Overall Percentage</p>
                          <p className="text-lg font-semibold text-white">
                            {project.indigenousContent.percentage}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Issues & Achievements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Issues */}
                      {project.issues.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-amber-400 mb-3">Issues Encountered</h4>
                          <ul className="space-y-2">
                            {project.issues.map((issue, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm text-white">{issue.description}</p>
                                  <p className="text-xs text-white/60">
                                    {issue.severity} • {issue.resolved ? 'Resolved' : 'Unresolved'}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Achievements */}
                      {project.achievements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-emerald-400 mb-3">Key Achievements</h4>
                          <ul className="space-y-2">
                            {project.achievements.map((achievement, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5" />
                                <p className="text-sm text-white">{achievement}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Testimonial */}
                    {project.testimonial && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/80 italic">"{project.testimonial}"</p>
                        <p className="text-xs text-white/60 mt-2">- {project.clientName}</p>
                      </div>
                    )}

                    {/* Evidence */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {project.photos && project.photos.length > 0 && (
                          <button className="flex items-center space-x-2 text-sm text-blue-400 
                            hover:text-blue-300 transition-colors">
                            <Camera className="w-4 h-4" />
                            <span>{project.photos.length} Photos</span>
                          </button>
                        )}
                        <button className="flex items-center space-x-2 text-sm text-blue-400 
                          hover:text-blue-300 transition-colors">
                          <FileText className="w-4 h-4" />
                          <span>View Contract</span>
                        </button>
                      </div>
                      <button className="flex items-center space-x-2 text-sm text-white/60 
                        hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                        <span>Export Details</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
          <Building className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No projects found matching your filters</p>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 
            rounded-xl text-white font-medium transition-all duration-200 
            flex items-center"
        >
          <Download className="w-5 h-5 mr-2" />
          Export Project History
        </motion.button>
      </div>
    </div>
  )
}