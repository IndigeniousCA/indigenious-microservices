// Test Reporter Component
// Display test results and execution history

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, CheckCircle, XCircle, AlertCircle, Clock,
  TrendingUp, TrendingDown, BarChart3, Calendar, Filter,
  Download, Search, ChevronRight, ChevronDown, Play,
  Eye, Code, Video, Image, Terminal, Bug, GitBranch,
  User, Tag, Layers, Zap, Shield, Globe
} from 'lucide-react'
import { TestRun, TestResult, TestStatus, TestCategory } from '../types/testing.types'
import { useTestResults } from '../hooks/useTestResults'

interface TestReporterProps {
  testRunId?: string
  onViewDetails?: (result: TestResult) => void
  onRerun?: (testIds: string[]) => void
  onExport?: (format: 'pdf' | 'csv' | 'json') => void
}

export function TestReporter({
  testRunId,
  onViewDetails,
  onRerun,
  onExport
}: TestReporterProps) {
  const { testRuns, currentRun, isLoading } = useTestResults(testRunId)
  
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<TestStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'category' | 'status'>('timeline')

  // Filter results
  const filteredResults = useMemo(() => {
    if (!currentRun?.results) return []
    
    let filtered = currentRun.results

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(result => 
        result.testName.toLowerCase().includes(selectedCategory)
      )
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(result => result.status === selectedStatus)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(result =>
        result.testName.toLowerCase().includes(search) ||
        result.error?.message.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [currentRun, selectedCategory, selectedStatus, searchTerm])

  // Get status color
  const getStatusColor = (status: TestStatus) => {
    const colorMap = {
      passed: 'emerald',
      failed: 'red',
      skipped: 'gray',
      flaky: 'amber',
      running: 'blue',
      pending: 'purple'
    }
    return colorMap[status] || 'gray'
  }

  // Get status icon
  const getStatusIcon = (status: TestStatus) => {
    const iconMap = {
      passed: CheckCircle,
      failed: XCircle,
      skipped: AlertCircle,
      flaky: AlertCircle,
      running: Clock,
      pending: Clock
    }
    return iconMap[status] || AlertCircle
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconMap = {
      authentication: Shield,
      registration: User,
      'rfq-management': FileText,
      bidding: Tag,
      messaging: Terminal,
      payment: GitBranch,
      analytics: BarChart3,
      admin: Layers,
      security: Shield,
      performance: Zap,
      accessibility: Globe
    }
    return iconMap[category as keyof typeof iconMap] || FileText
  }

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!currentRun) return null
    
    const total = currentRun.results.length
    const passed = currentRun.results.filter(r => r.status === 'passed').length
    const failed = currentRun.results.filter(r => r.status === 'failed').length
    const skipped = currentRun.results.filter(r => r.status === 'skipped').length
    const flaky = currentRun.results.filter(r => r.status === 'flaky').length
    
    return {
      total,
      passed,
      failed,
      skipped,
      flaky,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      duration: currentRun.duration || 0
    }
  }, [currentRun])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Test Results</h2>
          <p className="text-white/70">
            {currentRun ? (
              <>
                Run #{currentRun.id.slice(-6)} • 
                {new Date(currentRun.startTime).toLocaleString()}
              </>
            ) : (
              'Select a test run to view results'
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {currentRun && (
            <>
              <button
                onClick={() => onRerun?.(filteredResults.map(r => r.testId))}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                  border-white/20 rounded-lg text-white transition-colors 
                  flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Rerun Tests</span>
              </button>
              
              <button
                onClick={() => onExport?.('pdf')}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 
                  transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </>
          )}
        </div>
      </div>

      {currentRun && summaryStats && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-white/60 text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{summaryStats.total}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-white/60 text-sm">Passed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-300">{summaryStats.passed}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-white/60 text-sm">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-300">{summaryStats.failed}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <span className="text-white/60 text-sm">Skipped</span>
              </div>
              <p className="text-2xl font-bold text-gray-300">{summaryStats.skipped}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span className="text-white/60 text-sm">Pass Rate</span>
              </div>
              <p className="text-2xl font-bold text-purple-300">
                {summaryStats.passRate.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-white/60 text-sm">Duration</span>
              </div>
              <p className="text-2xl font-bold text-amber-300">
                {formatDuration(summaryStats.duration)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tests..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white placeholder-white/50 focus:outline-none 
                    focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as unknown)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all" className="bg-gray-800">All Categories</option>
                <option value="authentication" className="bg-gray-800">Authentication</option>
                <option value="registration" className="bg-gray-800">Registration</option>
                <option value="rfq-management" className="bg-gray-800">RFQ Management</option>
                <option value="bidding" className="bg-gray-800">Bidding</option>
                <option value="messaging" className="bg-gray-800">Messaging</option>
                <option value="payment" className="bg-gray-800">Payment</option>
                <option value="analytics" className="bg-gray-800">Analytics</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as unknown)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all" className="bg-gray-800">All Status</option>
                <option value="passed" className="bg-gray-800">Passed</option>
                <option value="failed" className="bg-gray-800">Failed</option>
                <option value="skipped" className="bg-gray-800">Skipped</option>
                <option value="flaky" className="bg-gray-800">Flaky</option>
              </select>

              {/* View Mode */}
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
                {(['timeline', 'category', 'status'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                      viewMode === mode
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'text-white/60 hover:text-white/80'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            {filteredResults.map(result => {
              const StatusIcon = getStatusIcon(result.status)
              const statusColor = getStatusColor(result.status)
              const isExpanded = expandedTest === result.testId
              
              return (
                <motion.div
                  key={result.testId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/10 backdrop-blur-md border rounded-xl p-4 
                    hover:bg-white/15 transition-all cursor-pointer ${
                      result.status === 'failed' 
                        ? 'border-red-400/30' 
                        : 'border-white/20'
                    }`}
                  onClick={() => setExpandedTest(isExpanded ? null : result.testId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <StatusIcon className={`w-5 h-5 text-${statusColor}-400`} />
                      
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{result.testName}</h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-white/60">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(result.duration)}</span>
                          </span>
                          {result.retries > 0 && (
                            <span className="flex items-center space-x-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{result.retries} retries</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {result.artifacts.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {result.artifacts.some(a => a.type === 'screenshot') && (
                            <Image className="w-4 h-4 text-white/60" />
                          )}
                          {result.artifacts.some(a => a.type === 'video') && (
                            <Video className="w-4 h-4 text-white/60" />
                          )}
                        </div>
                      )}
                      
                      <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        {/* Error Details */}
                        {result.error && (
                          <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                            <h5 className="text-red-300 font-medium mb-2">Error Details</h5>
                            <p className="text-red-200/80 text-sm font-mono">
                              {result.error.message}
                            </p>
                            {result.error.stack && (
                              <details className="mt-2">
                                <summary className="text-red-300/60 text-xs cursor-pointer">
                                  Stack trace
                                </summary>
                                <pre className="mt-2 text-red-200/60 text-xs overflow-x-auto">
                                  {result.error.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}

                        {/* Test Steps */}
                        <div className="mb-4">
                          <h5 className="text-white font-medium mb-2">Test Steps</h5>
                          <div className="space-y-2">
                            {result.steps.map((step, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-3 text-sm"
                              >
                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center 
                                  justify-center text-xs ${
                                    step.status === 'passed' 
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : step.status === 'failed'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-gray-500/20 text-gray-300'
                                  }`}>
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-white/80">{step.step.action}</p>
                                  {step.error && (
                                    <p className="text-red-300 text-xs mt-1">{step.error}</p>
                                  )}
                                </div>
                                <span className="text-white/60 text-xs">
                                  {formatDuration(step.duration)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Artifacts */}
                        {result.artifacts.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-white font-medium mb-2">Artifacts</h5>
                            <div className="flex flex-wrap gap-2">
                              {result.artifacts.map((artifact, index) => (
                                <button
                                  key={index}
                                  className="px-3 py-1 bg-white/10 hover:bg-white/20 
                                    border border-white/20 rounded text-white/80 text-sm 
                                    transition-colors flex items-center space-x-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Handle artifact view
                                  }}
                                >
                                  {artifact.type === 'screenshot' && <Image className="w-3 h-3" />}
                                  {artifact.type === 'video' && <Video className="w-3 h-3" />}
                                  {artifact.type === 'log' && <Terminal className="w-3 h-3" />}
                                  <span>{artifact.type}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewDetails?.(result)
                            }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 
                              border border-white/20 rounded text-white/80 text-sm 
                              transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Details</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRerun?.([result.testId])
                            }}
                            className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 
                              border border-purple-400/50 rounded text-purple-200 text-sm 
                              transition-colors flex items-center space-x-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Rerun</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Coverage Report */}
          {currentRun.coverage && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Code Coverage</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Lines</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${currentRun.coverage.overall.lines.percentage}%` }}
                      />
                    </div>
                    <span className="text-white text-sm">
                      {currentRun.coverage.overall.lines.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-white/60 text-sm mb-1">Statements</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${currentRun.coverage.overall.statements.percentage}%` }}
                      />
                    </div>
                    <span className="text-white text-sm">
                      {currentRun.coverage.overall.statements.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-white/60 text-sm mb-1">Functions</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${currentRun.coverage.overall.functions.percentage}%` }}
                      />
                    </div>
                    <span className="text-white text-sm">
                      {currentRun.coverage.overall.functions.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-white/60 text-sm mb-1">Branches</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${currentRun.coverage.overall.branches.percentage}%` }}
                      />
                    </div>
                    <span className="text-white text-sm">
                      {currentRun.coverage.overall.branches.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}