'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, 
  FileCheck, Sparkles, Download, RefreshCw,
  ChevronRight, Info, Zap, TrendingUp,
  Users, FileText, DollarSign, Lock
} from 'lucide-react'
import { ComplianceEngine, ComplianceReport, ComplianceIssue } from '../services/compliance-engine'

interface ComplianceDashboardProps {
  submissionId?: string
  rfqId: string
  businessId: string
  onAutoFix?: (fixedData: unknown) => void
}

export function ComplianceDashboard({ 
  submissionId, 
  rfqId, 
  businessId,
  onAutoFix 
}: ComplianceDashboardProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'requirements' | 'suggestions'>('overview')
  const [isAutoFixing, setIsAutoFixing] = useState(false)
  const [fixProgress, setFixProgress] = useState(0)
  
  const complianceEngine = new ComplianceEngine()

  useEffect(() => {
    if (submissionId) {
      validateSubmission()
    }
  }, [submissionId])

  const validateSubmission = async () => {
    setIsLoading(true)
    try {
      // Mock submission data - in real app, fetch from database
      const submission = {
        businessId,
        rfqId,
        businessNumber: '123456789RC0001',
        businessRegistration: true,
        contractValue: 750000,
        contractDuration: 12,
        totalEmployees: 25,
        indigenousEmployees: 18,
        indigenousOwnership: 75,
        certificationNumber: 'CCAB-2024-1234',
        indigenousCertification: {
          number: 'CCAB-2024-1234',
          expiryDate: '2025-12-31'
        },
        insuranceCoverage: {
          amount: 5000000,
          expiryDate: '2025-06-30'
        },
        contractEndDate: '2025-03-31',
        employmentPlan: {
          targetPercentage: 80,
          currentPercentage: 72,
          growthPlan: true
        },
        financialStatements: {
          currentAssets: 500000,
          currentLiabilities: 150000
        },
        technicalProposal: {
          responses: {
            'REQ-001': true,
            'REQ-002': true,
            'REQ-003': true
          }
        },
        rfq: {
          mandatoryRequirements: [
            { id: 'REQ-001', title: 'Technical Capability' },
            { id: 'REQ-002', title: 'Project Experience' },
            { id: 'REQ-003', title: 'Quality Standards' }
          ],
          securityLevel: 'reliability'
        },
        securityClearances: {
          level: 'reliability'
        },
        subcontractors: [
          { name: 'Northern Tech', value: 200000, isIndigenous: true },
          { name: 'Eagle Electric', value: 150000, isIndigenous: true },
          { name: 'Standard Supplies', value: 100000, isIndigenous: false }
        ],
        certifications: ['ISO 9001', 'CCAB PAR Gold'],
        localHiring: true,
        communityInvestment: true,
        skillsTraining: true,
        youthPrograms: true,
        environmentalCommitments: true
      }

      const validationReport = await complianceEngine.validateSubmission(submission)
      setReport(validationReport)
    } catch (error) {
      logger.error('Validation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoFix = async () => {
    if (!report) return
    
    setIsAutoFixing(true)
    setFixProgress(0)
    
    const fixableIssues = report.criticalIssues.filter(issue => issue.autoFixAvailable)
    
    try {
      // Simulate progressive auto-fixing
      for (let i = 0; i < fixableIssues.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setFixProgress(((i + 1) / fixableIssues.length) * 100)
      }
      
      // In real app, would call complianceEngine.autoFixIssues()
      onAutoFix?.({})
      
      // Revalidate after fixes
      await validateSubmission()
    } finally {
      setIsAutoFixing(false)
      setFixProgress(0)
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-400'
    if (score >= 80) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'needs-review':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />
      default:
        return <XCircle className="w-6 h-6 text-red-400" />
    }
  }

  const renderOverview = () => {
    if (!report) return null

    return (
      <div className="space-y-6">
        {/* Compliance Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LiquidGlassCard variant="clear">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
              {getStatusIcon(report.status)}
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              {report.overallScore.toFixed(0)}%
            </h3>
            <p className="text-sm text-white/60">Overall Compliance Score</p>
            <div className="mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${
                    report.overallScore >= 95 ? 'from-green-400 to-green-600' :
                    report.overallScore >= 80 ? 'from-yellow-400 to-yellow-600' :
                    'from-red-400 to-red-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${report.overallScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="frost">
            <div className="flex items-center justify-between mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
              {report.criticalIssues.length > 0 && (
                <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs">
                  Action Required
                </span>
              )}
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              {report.criticalIssues.length}
            </h3>
            <p className="text-sm text-white/60">Critical Issues</p>
            {report.criticalIssues.filter(i => i.autoFixAvailable).length > 0 && (
              <LiquidGlassButton
                onClick={handleAutoFix}
                disabled={isAutoFixing}
                className="mt-4 w-full text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Auto-fix {report.criticalIssues.filter(i => i.autoFixAvailable).length} issues
              </LiquidGlassButton>
            )}
          </LiquidGlassCard>

          <LiquidGlassCard variant="aurora">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              {report.indigenousRequirements.communityBenefitScore}%
            </h3>
            <p className="text-sm text-white/60">Community Benefit Score</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white/70">{report.indigenousRequirements.ownershipPercentage}% owned</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-white/70">Certified</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LiquidGlass variant="clear" intensity="light" className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">
                {report.criticalIssues.filter(i => i.severity === 'documentation').length}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-2">Doc Issues</p>
          </LiquidGlass>

          <LiquidGlass variant="clear" intensity="light" className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {report.criticalIssues.filter(i => i.severity === 'financial').length}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-2">Financial</p>
          </LiquidGlass>

          <LiquidGlass variant="clear" intensity="light" className="p-4">
            <div className="flex items-center justify-between">
              <Lock className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-bold text-white">
                {report.warnings.length}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-2">Warnings</p>
          </LiquidGlass>

          <LiquidGlass variant="clear" intensity="light" className="p-4">
            <div className="flex items-center justify-between">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {report.suggestions.length}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-2">Suggestions</p>
          </LiquidGlass>
        </div>

        {/* Auto-fix Progress */}
        {isAutoFixing && (
          <LiquidGlassCard variant="frost">
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </motion.div>
              <h3 className="font-semibold text-white">Auto-fixing compliance issues...</h3>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                animate={{ width: `${fixProgress}%` }}
              />
            </div>
          </LiquidGlassCard>
        )}
      </div>
    )
  }

  const renderIssues = () => {
    if (!report) return null

    return (
      <div className="space-y-6">
        {/* Critical Issues */}
        {report.criticalIssues.length > 0 && (
          <LiquidGlassCard variant="clear">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Critical Issues ({report.criticalIssues.length})
            </h3>
            <div className="space-y-3">
              {report.criticalIssues.map((issue, index) => (
                <motion.div
                  key={issue.ruleId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{issue.ruleName}</h4>
                      <p className="text-sm text-white/70">{issue.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-white/50">ID: {issue.ruleId}</span>
                        {issue.autoFixAvailable && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            Auto-fix available
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </motion.div>
              ))}
            </div>
          </LiquidGlassCard>
        )}

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <LiquidGlassCard variant="frost">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Warnings ({report.warnings.length})
            </h3>
            <div className="space-y-3">
              {report.warnings.map((warning, index) => (
                <motion.div
                  key={warning.ruleId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg"
                >
                  <h4 className="font-medium text-white mb-1">{warning.ruleName}</h4>
                  <p className="text-sm text-white/70">{warning.message}</p>
                </motion.div>
              ))}
            </div>
          </LiquidGlassCard>
        )}
      </div>
    )
  }

  const renderRequirements = () => {
    if (!report) return null

    return (
      <div className="space-y-6">
        <LiquidGlassCard variant="aurora">
          <h3 className="text-lg font-semibold text-white mb-6">
            Indigenous Procurement Requirements
          </h3>
          
          <div className="space-y-4">
            {/* Ownership */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  report.indigenousRequirements.ownershipPercentage >= 51 
                    ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {report.indigenousRequirements.ownershipPercentage >= 51 
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-white">Indigenous Ownership</p>
                  <p className="text-sm text-white/60">Minimum 51% required</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">
                {report.indigenousRequirements.ownershipPercentage}%
              </span>
            </div>

            {/* Certification */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  report.indigenousRequirements.certificationValid 
                    ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {report.indigenousRequirements.certificationValid 
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-white">Business Certification</p>
                  <p className="text-sm text-white/60">CCAB, CAMSC, or equivalent</p>
                </div>
              </div>
              <span className="text-sm text-green-400">
                {report.indigenousRequirements.certificationValid ? 'Valid' : 'Invalid'}
              </span>
            </div>

            {/* Employment */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  report.indigenousRequirements.employmentCommitments 
                    ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  {report.indigenousRequirements.employmentCommitments 
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-white">Employment Commitments</p>
                  <p className="text-sm text-white/60">Indigenous hiring targets</p>
                </div>
              </div>
              <span className="text-sm text-white/70">
                {report.indigenousRequirements.employmentCommitments ? 'Met' : 'Review'}
              </span>
            </div>

            {/* Subcontracting */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  report.indigenousRequirements.subcontractingCompliant 
                    ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  {report.indigenousRequirements.subcontractingCompliant 
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-white">Subcontracting</p>
                  <p className="text-sm text-white/60">33% to Indigenous businesses</p>
                </div>
              </div>
              <span className="text-sm text-white/70">
                {report.indigenousRequirements.subcontractingCompliant ? 'Compliant' : 'Below target'}
              </span>
            </div>
          </div>

          {/* Community Benefit Score */}
          <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
            <h4 className="font-medium text-white mb-3">Community Benefit Score</h4>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Overall Impact</span>
              <span className="text-2xl font-bold text-purple-400">
                {report.indigenousRequirements.communityBenefitScore}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-white/70">Local hiring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-white/70">Skills training</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-white/70">Youth programs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-white/70">Environmental</span>
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    )
  }

  const renderSuggestions = () => {
    if (!report) return null

    return (
      <div className="space-y-6">
        {report.suggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <LiquidGlassCard variant="frost">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  suggestion.impact === 'high' ? 'bg-purple-500/20' :
                  suggestion.impact === 'medium' ? 'bg-blue-500/20' :
                  'bg-gray-500/20'
                }`}>
                  <Sparkles className={`w-6 h-6 ${
                    suggestion.impact === 'high' ? 'text-purple-400' :
                    suggestion.impact === 'medium' ? 'text-blue-400' :
                    'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{suggestion.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      suggestion.impact === 'high' ? 'bg-purple-500/20 text-purple-300' :
                      suggestion.impact === 'medium' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {suggestion.impact} impact
                    </span>
                  </div>
                  <p className="text-white/70 mb-3">{suggestion.description}</p>
                  
                  {suggestion.examples && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white/80">Examples:</p>
                      <ul className="space-y-1">
                        {suggestion.examples.map((example, i) => (
                          <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mt-4 text-xs text-white/50">
                    <span>Est. time: {suggestion.estimatedTime}</span>
                    <LiquidGlassButton className="text-xs px-3 py-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Implement
                    </LiquidGlassButton>
                  </div>
                </div>
              </div>
            </LiquidGlassCard>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <LiquidGlass variant="aurora" intensity="strong" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Compliance Engine
                </h1>
                <p className="text-sm text-white/60">
                  Automated validation for government requirements
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LiquidGlassButton
                onClick={validateSubmission}
                disabled={isLoading}
                className="px-4 py-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Revalidate
              </LiquidGlassButton>
              <LiquidGlassButton className="px-4 py-2">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </LiquidGlassButton>
            </div>
          </div>
        </LiquidGlass>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: FileCheck },
            { id: 'issues', label: 'Issues', icon: AlertTriangle, count: report?.criticalIssues.length },
            { id: 'requirements', label: 'Indigenous Requirements', icon: Users },
            { id: 'suggestions', label: 'Suggestions', icon: Sparkles, count: report?.suggestions.length }
          ].map(tab => (
            <LiquidGlassButton
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeTab === tab.id ? 'border-2 border-blue-400/50' : ''
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </LiquidGlassButton>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <Shield className="w-16 h-16 text-blue-400" />
            </motion.div>
            <p className="text-white/60">Validating compliance...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'issues' && renderIssues()}
              {activeTab === 'requirements' && renderRequirements()}
              {activeTab === 'suggestions' && renderSuggestions()}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}