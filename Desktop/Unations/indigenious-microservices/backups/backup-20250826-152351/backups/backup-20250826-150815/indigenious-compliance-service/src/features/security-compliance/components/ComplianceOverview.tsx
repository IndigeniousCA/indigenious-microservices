// Compliance Overview Component
// Multi-framework compliance monitoring and reporting

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, CheckCircle, AlertTriangle, Clock, TrendingUp,
  FileText, Users, Globe, Flag, Download, Calendar,
  BarChart3, Target, Award, BookOpen, Info, ArrowRight
} from 'lucide-react'
import type { ComplianceStatus, ComplianceFramework } from '../types/security.types'

interface ComplianceOverviewProps {
  compliance: ComplianceStatus[]
  timeRange: '1h' | '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void
  userRole: string
}

export function ComplianceOverview({ 
  compliance, 
  timeRange, 
  onTimeRangeChange, 
  userRole 
}: ComplianceOverviewProps) {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null)
  const [activeView, setActiveView] = useState<'overview' | 'frameworks' | 'gaps' | 'reports'>('overview')

  // Compliance statistics
  const complianceStats = useMemo(() => {
    const total = compliance.length
    const compliant = compliance.filter(c => c.status === 'compliant').length
    const partial = compliance.filter(c => c.status === 'partial').length
    const nonCompliant = compliance.filter(c => c.status === 'non_compliant').length
    const avgScore = total > 0 
      ? compliance.reduce((sum, c) => sum + c.percentage, 0) / total 
      : 0

    const totalGaps = compliance.reduce((sum, c) => sum + c.gaps.length, 0)
    const openGaps = compliance.reduce((sum, c) => 
      sum + c.gaps.filter(g => g.status === 'open').length, 0)

    return {
      total,
      compliant,
      partial,
      nonCompliant,
      avgScore: Math.round(avgScore),
      totalGaps,
      openGaps
    }
  }, [compliance])

  // Framework information
  const frameworkInfo: Record<ComplianceFramework, { 
    name: string
    description: string
    authority: string
    icon: any
    color: string
  }> = {
    fedramp: {
      name: 'FedRAMP',
      description: 'Federal Risk and Authorization Management Program',
      authority: 'US General Services Administration',
      icon: Shield,
      color: 'blue'
    },
    pipeda: {
      name: 'PIPEDA',
      description: 'Personal Information Protection and Electronic Documents Act',
      authority: 'Office of the Privacy Commissioner of Canada',
      icon: FileText,
      color: 'emerald'
    },
    cccs: {
      name: 'CCCS',
      description: 'Canadian Centre for Cyber Security Guidelines',
      authority: 'Communications Security Establishment Canada',
      icon: Target,
      color: 'purple'
    },
    treasury_board: {
      name: 'Treasury Board',
      description: 'Government of Canada IT Security Standards',
      authority: 'Treasury Board of Canada Secretariat',
      icon: Flag,
      color: 'amber'
    },
    indigenous_sovereignty: {
      name: 'Indigenous Data Sovereignty',
      description: 'CARE Principles and Traditional Governance',
      authority: 'Indigenous Communities and Nations',
      icon: Globe,
      color: 'indigo'
    }
  }

  // Get compliance status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'emerald'
      case 'partial': return 'yellow'
      case 'non_compliant': return 'red'
      default: return 'gray'
    }
  }

  // Compliance framework card
  const FrameworkCard = ({ framework }: { framework: ComplianceStatus }) => {
    const info = frameworkInfo[framework.framework]
    const Icon = info.icon
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSelectedFramework(framework.framework)}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
          hover:bg-white/15 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${info.color}-500/20`}>
              <Icon className={`w-5 h-5 text-${info.color}-400`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{info.name}</h3>
              <p className="text-white/60 text-sm">{framework.version}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{framework.percentage}%</div>
            <div className={`text-xs text-${getStatusColor(framework.status)}-300 capitalize`}>
              {framework.status.replace('_', ' ')}
            </div>
          </div>
        </div>

        <p className="text-white/80 text-sm mb-4">{info.description}</p>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-4">
          <motion.div
            className={`bg-${getStatusColor(framework.status)}-400 h-2 rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${framework.percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60">Controls:</span>
            <span className="text-white ml-2">{framework.score}/{framework.maxScore}</span>
          </div>
          <div>
            <span className="text-white/60">Gaps:</span>
            <span className="text-white ml-2">{framework.gaps.length}</span>
          </div>
        </div>

        {/* Last Assessment */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-white/60">
            <Calendar className="w-3 h-3" />
            <span>Last assessed: {new Date(framework.lastAssessment).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  // Compliance gap card
  const GapCard = ({ gap, framework }: { gap: any, framework: ComplianceFramework }) => {
    const info = frameworkInfo[framework]
    
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${info.color}-500/20`}>
              <info.icon className={`w-4 h-4 text-${info.color}-400`} />
            </div>
            <div>
              <h4 className="font-medium text-white">{gap.control}</h4>
              <p className="text-white/60 text-sm">{info.name}</p>
            </div>
          </div>
          
          <div className={`px-2 py-1 bg-${gap.risk === 'critical' ? 'red' : 
            gap.risk === 'high' ? 'orange' : 
            gap.risk === 'medium' ? 'yellow' : 'blue'}-500/20 
            text-${gap.risk === 'critical' ? 'red' : 
            gap.risk === 'high' ? 'orange' : 
            gap.risk === 'medium' ? 'yellow' : 'blue'}-300 
            rounded text-xs font-medium capitalize`}>
            {gap.risk} Risk
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-white/60">Requirement:</span>
            <p className="text-white mt-1">{gap.requirement}</p>
          </div>
          
          <div>
            <span className="text-white/60">Current State:</span>
            <p className="text-white mt-1">{gap.current}</p>
          </div>
          
          <div>
            <span className="text-white/60">Gap:</span>
            <p className="text-white mt-1">{gap.gap}</p>
          </div>
          
          <div>
            <span className="text-white/60">Remediation:</span>
            <p className="text-white mt-1">{gap.remediation}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-white/60">Owner: {gap.owner}</span>
              <span className="text-white/60">Timeline: {gap.timeline}</span>
            </div>
            <div className={`px-2 py-1 bg-${gap.status === 'open' ? 'red' : 
              gap.status === 'in_progress' ? 'yellow' : 'emerald'}-500/20 
              text-${gap.status === 'open' ? 'red' : 
              gap.status === 'in_progress' ? 'yellow' : 'emerald'}-300 
              rounded capitalize`}>
              {gap.status.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Compliance Overview</h2>
          <p className="text-white/60 text-sm">Multi-framework compliance monitoring and reporting</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range as unknown)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          {userRole === 'admin' && (
            <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
              border-emerald-400/50 rounded-lg text-emerald-200 text-sm flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          )}
        </div>
      </div>

      {/* Overall Compliance Status */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">{complianceStats.avgScore}%</div>
            <div className="text-white/60 text-sm">Overall Compliance</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div 
                className={`bg-${complianceStats.avgScore >= 90 ? 'emerald' : 
                  complianceStats.avgScore >= 70 ? 'yellow' : 'red'}-400 h-2 rounded-full`}
                style={{ width: `${complianceStats.avgScore}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-2">{complianceStats.compliant}</div>
            <div className="text-white/60 text-sm">Compliant Frameworks</div>
            <div className="text-white/40 text-xs mt-1">{complianceStats.total} total</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{complianceStats.partial}</div>
            <div className="text-white/60 text-sm">Partial Compliance</div>
            <div className="text-white/40 text-xs mt-1">needs attention</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">{complianceStats.openGaps}</div>
            <div className="text-white/60 text-sm">Open Gaps</div>
            <div className="text-white/40 text-xs mt-1">{complianceStats.totalGaps} total</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'frameworks', label: 'Frameworks', icon: Shield },
          { id: 'gaps', label: 'Compliance Gaps', icon: AlertTriangle },
          { id: 'reports', label: 'Reports', icon: FileText }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as unknown)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
              activeView === view.id
                ? 'bg-blue-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <view.icon className="w-4 h-4" />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'frameworks' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {compliance.map((framework) => (
                <FrameworkCard key={framework.framework} framework={framework} />
              ))}
            </div>
          )}

          {activeView === 'gaps' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Compliance Gaps ({complianceStats.openGaps} open)
              </h3>
              
              <div className="space-y-4">
                {compliance.map((framework) =>
                  framework.gaps
                    .filter(gap => gap.status !== 'closed')
                    .map((gap, index) => (
                      <GapCard 
                        key={`${framework.framework}-${index}`} 
                        gap={gap} 
                        framework={framework.framework} 
                      />
                    ))
                )}
              </div>
              
              {complianceStats.openGaps === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Open Gaps</h3>
                  <p className="text-white/60">All compliance requirements are being met</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Compliance Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compliance.map((framework) => {
                  const info = frameworkInfo[framework.framework]
                  const Icon = info.icon
                  
                  return (
                    <div key={framework.framework} className="bg-white/10 backdrop-blur-md border 
                      border-white/20 rounded-xl p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 rounded-lg bg-${info.color}-500/20`}>
                          <Icon className={`w-5 h-5 text-${info.color}-400`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{info.name}</h4>
                          <p className="text-white/60 text-sm">Compliance Report</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-white/60">Status:</span>
                          <span className={`text-${getStatusColor(framework.status)}-300 capitalize`}>
                            {framework.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Score:</span>
                          <span className="text-white">{framework.percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Last Assessment:</span>
                          <span className="text-white">
                            {new Date(framework.lastAssessment).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                        border border-blue-400/50 rounded-lg text-blue-200 text-sm 
                        flex items-center justify-center">
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Indigenous Data Sovereignty Highlight */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-indigo-200">
            Indigenous Data Sovereignty Compliance
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-300">100%</div>
            <div className="text-indigo-100/80 text-sm">CARE Principles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-300">24</div>
            <div className="text-indigo-100/80 text-sm">Nation Agreements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-300">0</div>
            <div className="text-indigo-100/80 text-sm">Protocol Violations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-300">95%</div>
            <div className="text-indigo-100/80 text-sm">Community Satisfaction</div>
          </div>
        </div>
        
        <div className="mt-4 text-indigo-100/80 text-sm">
          <p>
            All Indigenous community data is managed according to traditional governance 
            protocols and the CARE principles (Collective benefit, Authority to control, 
            Responsibility, Ethics).
          </p>
        </div>
      </div>
    </div>
  )
}