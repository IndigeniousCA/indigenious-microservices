// Risk Analysis Component
// Analyzes and displays vendor risk factors

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, AlertTriangle, TrendingUp, TrendingDown, 
  Clock, DollarSign, AlertCircle, CheckCircle,
  FileX, UserX, HardHat, MessageSquareX, Info
} from 'lucide-react'
import type { RiskFactor, CompletedProject, RiskType } from '../types/performance.types'

interface RiskAnalysisProps {
  riskProfile: {
    level: 'low' | 'medium' | 'high'
    factors: RiskFactor[]
  }
  projects: CompletedProject[]
  isOwnProfile: boolean
}

export function RiskAnalysis({ riskProfile, projects, isOwnProfile }: RiskAnalysisProps) {
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null)
  const [showMitigation, setShowMitigation] = useState(true)

  // Calculate risk metrics from projects
  const calculateRiskMetrics = () => {
    const totalProjects = projects.length
    const delayedProjects = projects.filter(p => !p.performance.onTimeDelivery).length
    const overBudgetProjects = projects.filter(p => !p.performance.withinBudget).length
    const projectsWithIssues = projects.filter(p => p.issues.length > 0).length
    const majorIssues = projects.flatMap(p => p.issues).filter(i => i.severity === 'major').length

    return {
      delayRate: (delayedProjects / totalProjects * 100) || 0,
      budgetOverrunRate: (overBudgetProjects / totalProjects * 100) || 0,
      issueRate: (projectsWithIssues / totalProjects * 100) || 0,
      majorIssueCount: majorIssues,
      averageQualityScore: projects.reduce((sum, p) => sum + p.performance.qualityScore, 0) / totalProjects || 0
    }
  }

  const metrics = calculateRiskMetrics()

  // Get risk type icon
  const getRiskIcon = (type: RiskType) => {
    switch (type) {
      case 'late_deliveries':
        return Clock
      case 'budget_overruns':
        return DollarSign
      case 'quality_issues':
        return FileX
      case 'safety_incidents':
        return HardHat
      case 'contract_disputes':
        return UserX
      case 'financial_instability':
        return TrendingDown
      case 'compliance_violations':
        return Shield
      case 'negative_reviews':
        return MessageSquareX
      default:
        return AlertTriangle
    }
  }

  // Get risk color
  const getRiskColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'red'
      case 'medium':
        return 'amber'
      default:
        return 'yellow'
    }
  }

  // Get mitigation suggestions
  const getMitigationSuggestions = (type: RiskType): string[] => {
    const suggestions: Record<RiskType, string[]> = {
      late_deliveries: [
        'Implement better project scheduling and tracking',
        'Add buffer time to project timelines',
        'Improve resource allocation and planning',
        'Regular progress monitoring and early warning systems'
      ],
      budget_overruns: [
        'Enhance cost estimation processes',
        'Implement strict change order management',
        'Regular financial reviews during projects',
        'Build contingency into budgets'
      ],
      quality_issues: [
        'Strengthen quality control processes',
        'Implement regular inspections and testing',
        'Invest in staff training and certification',
        'Create standardized quality checklists'
      ],
      safety_incidents: [
        'Update safety protocols and training',
        'Regular safety audits and inspections',
        'Invest in proper safety equipment',
        'Create a safety-first culture'
      ],
      contract_disputes: [
        'Clear and detailed contract documentation',
        'Regular client communication and updates',
        'Document all project changes and approvals',
        'Consider mediation or arbitration clauses'
      ],
      financial_instability: [
        'Diversify client base and revenue streams',
        'Maintain adequate cash reserves',
        'Regular financial health monitoring',
        'Consider lines of credit for stability'
      ],
      compliance_violations: [
        'Regular compliance audits',
        'Stay updated on regulatory changes',
        'Implement compliance tracking systems',
        'Invest in compliance training'
      ],
      negative_reviews: [
        'Improve customer service processes',
        'Address issues promptly and professionally',
        'Request feedback during projects',
        'Implement client satisfaction surveys'
      ]
    }
    return suggestions[type] || []
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Risk Assessment</h3>
            <p className="text-white/60">
              Based on {projects.length} completed projects
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg border text-lg font-semibold ${
            riskProfile.level === 'low'
              ? 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
              : riskProfile.level === 'medium'
              ? 'text-amber-400 bg-amber-500/20 border-amber-400/30'
              : 'text-red-400 bg-red-500/20 border-red-400/30'
          }`}>
            {riskProfile.level.toUpperCase()} RISK
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-white/40" />
              <span className={`text-sm font-medium ${
                metrics.delayRate > 20 ? 'text-red-400' : 
                metrics.delayRate > 10 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {metrics.delayRate.toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-white">Delay Rate</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-white/40" />
              <span className={`text-sm font-medium ${
                metrics.budgetOverrunRate > 20 ? 'text-red-400' : 
                metrics.budgetOverrunRate > 10 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {metrics.budgetOverrunRate.toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-white">Budget Overruns</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-white/40" />
              <span className={`text-sm font-medium ${
                metrics.majorIssueCount > 5 ? 'text-red-400' : 
                metrics.majorIssueCount > 2 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {metrics.majorIssueCount}
              </span>
            </div>
            <p className="text-sm text-white">Major Issues</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-5 h-5 text-white/40" />
              <span className={`text-sm font-medium ${
                metrics.averageQualityScore < 3 ? 'text-red-400' : 
                metrics.averageQualityScore < 4 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {metrics.averageQualityScore.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-white">Avg Quality</p>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Risk Factors</h3>
          {isOwnProfile && (
            <label className="flex items-center space-x-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showMitigation}
                onChange={(e) => setShowMitigation(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show mitigation steps</span>
            </label>
          )}
        </div>

        {riskProfile.factors.length > 0 ? (
          <div className="space-y-4">
            {riskProfile.factors.map((factor, index) => {
              const Icon = getRiskIcon(factor.type)
              const color = getRiskColor(factor.severity)
              const isExpanded = selectedFactor === factor.type
              
              return (
                <motion.div
                  key={factor.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white/10 backdrop-blur-md border rounded-xl overflow-hidden ${
                    factor.severity === 'high' 
                      ? 'border-red-400/30'
                      : factor.severity === 'medium'
                      ? 'border-amber-400/30'
                      : 'border-yellow-400/30'
                  }`}
                >
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => setSelectedFactor(isExpanded ? null : factor.type)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 bg-${color}-500/20 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${color}-400`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white capitalize">
                            {factor.type.replace('_', ' ')}
                          </h4>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              factor.severity === 'high' 
                                ? 'text-red-400 bg-red-500/20'
                                : factor.severity === 'medium'
                                ? 'text-amber-400 bg-amber-500/20'
                                : 'text-yellow-400 bg-yellow-500/20'
                            }`}>
                              {factor.severity.toUpperCase()}
                            </span>
                            {factor.mitigationStatus && (
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                factor.mitigationStatus === 'addressed' 
                                  ? 'text-emerald-400 bg-emerald-500/20'
                                  : factor.mitigationStatus === 'pending'
                                  ? 'text-blue-400 bg-blue-500/20'
                                  : 'text-red-400 bg-red-500/20'
                              }`}>
                                {factor.mitigationStatus.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-white/80">{factor.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mitigation Steps */}
                  {showMitigation && isOwnProfile && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-6 bg-white/5">
                        <h5 className="text-sm font-medium text-white mb-4">
                          Recommended Mitigation Steps
                        </h5>
                        <ul className="space-y-2">
                          {getMitigationSuggestions(factor.type).map((suggestion, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                              <span className="text-sm text-white/80">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-emerald-100 mb-2">
              Excellent Risk Profile
            </h4>
            <p className="text-emerald-100/80">
              No significant risk factors identified. Keep up the great work!
            </p>
          </div>
        )}
      </div>

      {/* Risk Trend Analysis */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Risk Trend Analysis</h3>
        </div>
        
        <div className="space-y-4">
          {/* Placeholder for trend chart */}
          <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center">
            <p className="text-white/40">Risk trend chart would go here</p>
          </div>
          
          {/* Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-white/60 mb-1">6 Months Ago</p>
              <p className="text-lg font-semibold text-amber-400">MEDIUM</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 mb-1">Current</p>
              <p className="text-lg font-semibold text-white uppercase">{riskProfile.level}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 mb-1">Trend</p>
              <div className="flex items-center justify-center space-x-1">
                {riskProfile.level === 'low' ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Improving</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400">Needs Attention</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Plan */}
      {isOwnProfile && riskProfile.level !== 'low' && (
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-100">
              Risk Mitigation Plan Available
            </h3>
          </div>
          <p className="text-blue-100/80 mb-4">
            Based on your risk profile, we've prepared a customized mitigation plan to help 
            improve your performance and reduce risk factors.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-xl text-blue-100 font-medium 
              transition-all duration-200"
          >
            View Mitigation Plan
          </motion.button>
        </div>
      )}
    </div>
  )
}