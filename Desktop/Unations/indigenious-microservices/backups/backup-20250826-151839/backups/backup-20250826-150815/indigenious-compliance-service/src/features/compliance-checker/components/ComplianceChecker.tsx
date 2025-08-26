'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, AlertTriangle, CheckCircle, XCircle,
  FileText, Award, Users, Clock, Zap,
  Download, RefreshCw, Settings, ChevronRight,
  Info, AlertCircle, FileCheck, Timer,
  Sparkles, TrendingUp, BarChart3
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { ComplianceService } from '../services/ComplianceService'
import { 
  ComplianceCheck, RequirementCheck, DocumentCheck,
  CertificationCheck, ComplianceRecommendation
} from '../types'

interface ComplianceCheckerProps {
  rfqId: string
  businessId: string
  bidContent?: any
  documents?: unknown[]
  certifications?: unknown[]
  onAutoFix?: (fixes: string[]) => void
  onReportGenerate?: (format: string) => void
}

export function ComplianceChecker({
  rfqId,
  businessId,
  bidContent = {},
  documents = [],
  certifications = [],
  onAutoFix,
  onReportGenerate
}: ComplianceCheckerProps) {
  const [complianceService] = useState(() => new ComplianceService())
  const [complianceCheck, setComplianceCheck] = useState<ComplianceCheck | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'requirements' | 'documents' | 'recommendations'>('overview')
  const [showAutoFix, setShowAutoFix] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  useEffect(() => {
    runComplianceCheck()
  }, [rfqId, bidContent])

  const runComplianceCheck = async () => {
    setIsChecking(true)
    try {
      const check = await complianceService.checkCompliance(
        rfqId,
        businessId,
        bidContent,
        documents,
        certifications
      )
      setComplianceCheck(check)
    } catch (error) {
      logger.error('Compliance check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'met':
      case 'valid':
      case 'eligible':
      case 'complete':
      case 'correct':
      case 'provided':
        return 'text-green-400'
      case 'warning':
      case 'partial':
      case 'conditional':
      case 'incomplete':
        return 'text-yellow-400'
      case 'fail':
      case 'not-met':
      case 'expired':
      case 'missing':
      case 'invalid':
      case 'not-eligible':
      case 'incorrect':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'met':
      case 'valid':
      case 'eligible':
      case 'complete':
      case 'correct':
      case 'provided':
        return <CheckCircle className="w-5 h-5" />
      case 'warning':
      case 'partial':
      case 'conditional':
      case 'incomplete':
        return <AlertCircle className="w-5 h-5" />
      case 'fail':
      case 'not-met':
      case 'expired':
      case 'missing':
      case 'invalid':
      case 'not-eligible':
      case 'incorrect':
        return <XCircle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const applySelectedFixes = async () => {
    if (selectedFixes.length === 0) return
    
    const fixes = await complianceService.applyAutoFixes(
      complianceCheck!.id,
      selectedFixes
    )
    
    // Update compliance check with applied fixes
    setComplianceCheck(prev => prev ? {
      ...prev,
      autoFixesApplied: [...prev.autoFixesApplied, ...fixes]
    } : null)
    
    // Clear selection and close modal
    setSelectedFixes([])
    setShowAutoFix(false)
    
    // Notify parent
    onAutoFix?.(selectedFixes)
    
    // Re-run compliance check
    runComplianceCheck()
  }

  const renderOverviewTab = () => {
    if (!complianceCheck) return null

    const criticalIssues = complianceCheck.recommendations.filter(r => r.priority === 'critical').length
    const highIssues = complianceCheck.recommendations.filter(r => r.priority === 'high').length

    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className={`w-8 h-8 ${getStatusColor(complianceCheck.overallStatus)}`} />
              <span className={`text-sm px-2 py-1 rounded ${
                complianceCheck.overallStatus === 'pass' ? 'bg-green-500/20 text-green-400' :
                complianceCheck.overallStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {complianceCheck.overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{complianceCheck.score}%</p>
            <p className="text-sm text-white/60">Compliance Score</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span className="text-xs text-white/60">Issues</span>
            </div>
            <p className="text-3xl font-bold text-white">{criticalIssues}</p>
            <p className="text-sm text-white/60">Critical Issues</p>
            <p className="text-xs text-white/40 mt-1">{highIssues} high priority</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
              <Timer className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold text-white">4-6</p>
            <p className="text-sm text-white/60">Hours to Fix</p>
            <p className="text-xs text-white/40 mt-1">Estimated time</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-blue-400" />
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                Available
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {complianceCheck.recommendations.filter(r => r.automatable).length}
            </p>
            <p className="text-sm text-white/60">Auto-Fixes</p>
            <button
              onClick={() => setShowAutoFix(true)}
              className="text-xs text-blue-400 hover:text-blue-300 mt-1"
              disabled={!complianceCheck.autoFixAvailable}
            >
              Apply fixes →
            </button>
          </GlassPanel>
        </div>

        {/* Quick Summary */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance Summary</h3>
          
          {/* Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Mandatory Requirements</span>
                <span className="text-sm text-white">
                  {complianceCheck.requirements.filter(r => r.category === 'mandatory' && r.status === 'met').length}/
                  {complianceCheck.requirements.filter(r => r.category === 'mandatory').length}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(complianceCheck.requirements.filter(r => r.category === 'mandatory' && r.status === 'met').length / 
                            complianceCheck.requirements.filter(r => r.category === 'mandatory').length) * 100}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Required Documents</span>
                <span className="text-sm text-white">
                  {complianceCheck.documents.filter(d => d.status === 'provided').length}/
                  {complianceCheck.documents.length}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(complianceCheck.documents.filter(d => d.status === 'provided').length / 
                            complianceCheck.documents.length) * 100}%` 
                  }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Certifications</span>
                <span className="text-sm text-white">
                  {complianceCheck.certifications.filter(c => c.status === 'valid').length}/
                  {complianceCheck.certifications.length}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(complianceCheck.certifications.filter(c => c.status === 'valid').length / 
                            complianceCheck.certifications.length) * 100}%` 
                  }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Key Issues */}
        {criticalIssues > 0 && (
          <GlassPanel className="p-6 border-red-400/50">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Critical Issues Requiring Immediate Attention</h3>
            </div>
            <div className="space-y-3">
              {complianceCheck.recommendations
                .filter(r => r.priority === 'critical')
                .slice(0, 3)
                .map(rec => (
                  <div key={rec.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{rec.issue}</p>
                      <p className="text-sm text-white/60 mt-1">{rec.recommendation}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span>Impact: {rec.impact}</span>
                        <span>Time: {rec.timeEstimate}</span>
                        {rec.automatable && (
                          <span className="text-blue-400">Auto-fixable</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </GlassPanel>
        )}
      </div>
    )
  }

  const renderRequirementsTab = () => {
    if (!complianceCheck) return null

    const mandatoryReqs = complianceCheck.requirements.filter(r => r.category === 'mandatory')
    const ratedReqs = complianceCheck.requirements.filter(r => r.category === 'rated')

    return (
      <div className="space-y-6">
        {/* Mandatory Requirements */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Mandatory Requirements</h3>
          <div className="space-y-3">
            {mandatoryReqs.map(req => (
              <div key={req.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className={getStatusColor(req.status)}>
                  {getStatusIcon(req.status)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{req.requirement}</p>
                  {req.evidence && (
                    <p className="text-sm text-white/60 mt-1">{req.evidence}</p>
                  )}
                  {req.suggestion && (
                    <p className="text-sm text-yellow-400 mt-2">
                      → {req.suggestion}
                    </p>
                  )}
                </div>
                {req.autoFixable && (
                  <button className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30 transition-colors">
                    Auto-fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Rated Requirements */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Rated Requirements</h3>
          <div className="space-y-3">
            {ratedReqs.map(req => (
              <div key={req.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className={getStatusColor(req.status)}>
                  {getStatusIcon(req.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{req.requirement}</p>
                    <span className="text-sm text-white">
                      {req.score}/{req.maxScore} points
                    </span>
                  </div>
                  {req.evidence && (
                    <p className="text-sm text-white/60">{req.evidence}</p>
                  )}
                  <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      style={{ width: `${(req.score! / req.maxScore!) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Eligibility */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Eligibility Criteria</h3>
          <div className="space-y-3">
            {complianceCheck.eligibility.map(elig => (
              <div key={elig.id} className="flex items-start gap-3">
                <div className={getStatusColor(elig.status)}>
                  {getStatusIcon(elig.status)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{elig.criteria}</p>
                  {elig.evidence && (
                    <p className="text-sm text-white/60 mt-1">{elig.evidence}</p>
                  )}
                  {elig.status === 'conditional' && elig.reason && (
                    <p className="text-sm text-yellow-400 mt-2">
                      ⚠ {elig.reason}
                      {elig.waiverProcess && (
                        <span className="block mt-1">→ {elig.waiverProcess}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    )
  }

  const renderDocumentsTab = () => {
    if (!complianceCheck) return null

    return (
      <div className="space-y-6">
        {/* Required Documents */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Required Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceCheck.documents.map(doc => (
              <div key={doc.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${getStatusColor(doc.status)}`} />
                    <h4 className="text-white font-medium">{doc.documentType}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.status === 'provided' ? 'bg-green-500/20 text-green-400' :
                    doc.status === 'invalid' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                
                {doc.fileName && (
                  <p className="text-sm text-white/60 mb-2">{doc.fileName}</p>
                )}
                
                {doc.issues.length > 0 && (
                  <div className="space-y-2">
                    {doc.issues.map((issue, i) => (
                      <div key={i} className="text-sm">
                        <p className={`${
                          issue.severity === 'critical' ? 'text-red-400' :
                          issue.severity === 'major' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {issue.description}
                        </p>
                        <p className="text-white/60 text-xs mt-1">
                          → {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Certifications */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Required Certifications</h3>
          <div className="space-y-4">
            {complianceCheck.certifications.map(cert => (
              <div key={cert.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Award className={`w-6 h-6 ${getStatusColor(cert.status)}`} />
                    <div>
                      <h4 className="text-white font-medium">{cert.certificationType}</h4>
                      {cert.certificationNumber && (
                        <p className="text-sm text-white/60">#{cert.certificationNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-2 py-1 rounded ${
                      cert.status === 'valid' ? 'bg-green-500/20 text-green-400' :
                      cert.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {cert.status}
                    </span>
                    {cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry > 0 && (
                      <p className="text-xs text-white/60 mt-1">
                        Expires in {cert.daysUntilExpiry} days
                      </p>
                    )}
                  </div>
                </div>
                
                {cert.issuer && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-sm">
                    <p className="text-white/60">
                      Issued by: <span className="text-white">{cert.issuer}</span>
                    </p>
                    {cert.expiryDate && (
                      <p className="text-white/60">
                        Valid until: <span className="text-white">
                          {new Date(cert.expiryDate).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                  </div>
                )}
                
                {cert.status !== 'valid' && cert.renewalLink && (
                  <a
                    href={cert.renewalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Renew certification
                    <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Formatting */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Formatting Requirements</h3>
          <div className="space-y-2">
            {complianceCheck.formatting.map(fmt => (
              <div key={fmt.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(fmt.status)}>
                    {getStatusIcon(fmt.status)}
                  </div>
                  <div>
                    <p className="text-white">{fmt.element}</p>
                    <p className="text-sm text-white/60">{fmt.requirement}</p>
                  </div>
                </div>
                {fmt.example && (
                  <code className="text-xs bg-white/10 px-2 py-1 rounded text-blue-400">
                    {fmt.example}
                  </code>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    )
  }

  const renderRecommendationsTab = () => {
    if (!complianceCheck) return null

    const groupedRecs = complianceCheck.recommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) acc[rec.priority] = []
      acc[rec.priority].push(rec)
      return acc
    }, {} as Record<string, ComplianceRecommendation[]>)

    return (
      <div className="space-y-6">
        {/* Priority Recommendations */}
        {['critical', 'high', 'medium', 'low'].map(priority => {
          const recs = groupedRecs[priority]
          if (!recs || recs.length === 0) return null

          const priorityColors = {
            critical: 'border-red-400/50',
            high: 'border-yellow-400/50',
            medium: 'border-blue-400/50',
            low: 'border-gray-400/50'
          }

          return (
            <GlassPanel key={priority} className={`p-6 ${priorityColors[priority]}`}>
              <h3 className="text-lg font-semibold text-white mb-4 capitalize">
                {priority} Priority Issues ({recs.length})
              </h3>
              <div className="space-y-4">
                {recs.map(rec => (
                  <div key={rec.id} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{rec.issue}</h4>
                      {rec.automatable && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Auto-fixable
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-white/80 mb-3">{rec.recommendation}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {rec.impact}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rec.timeEstimate}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {rec.effort} effort
                      </span>
                    </div>
                    
                    {rec.resources && rec.resources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-white/60 mb-1">Resources:</p>
                        {rec.resources.map((resource, i) => (
                          <a
                            key={i}
                            href={resource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 block"
                          >
                            {resource}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassPanel>
          )
        })}

        {/* Section Completeness */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Section Completeness</h3>
          <div className="space-y-3">
            {complianceCheck.completeness.map(section => (
              <div key={section.section} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-medium">{section.section}</h4>
                    {section.required && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <span className={`text-sm ${getStatusColor(section.status)}`}>
                    {section.completionPercentage}% complete
                  </span>
                </div>
                
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full ${
                      section.completionPercentage === 100 ? 'bg-green-500' :
                      section.completionPercentage >= 75 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${section.completionPercentage}%` }}
                  />
                </div>
                
                {section.missingElements.length > 0 && (
                  <div className="text-sm">
                    <p className="text-white/60 mb-1">Missing elements:</p>
                    <ul className="list-disc list-inside text-yellow-400">
                      {section.missingElements.map((element, i) => (
                        <li key={i}>{element}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {section.wordCount && (
                  <p className="text-xs text-white/60 mt-2">
                    Word count: {section.wordCount.current}
                    {section.wordCount.minimum && ` (min: ${section.wordCount.minimum})`}
                    {section.wordCount.maximum && ` (max: ${section.wordCount.maximum})`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    )
  }

  if (isChecking) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-4"
        >
          <Shield className="w-16 h-16 text-blue-400" />
        </motion.div>
        <p className="text-white/60">Running compliance check...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Automated Compliance Checker
              </h2>
              <p className="text-sm text-white/60">
                Ensure your bid meets all requirements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {complianceCheck?.autoFixAvailable && (
              <GlassButton
                onClick={() => setShowAutoFix(true)}
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Auto-Fix Issues
              </GlassButton>
            )}
            <button
              onClick={runComplianceCheck}
              className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => onReportGenerate?.('pdf')}
              className="p-2 bg-white/10 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {(['overview', 'requirements', 'documents', 'recommendations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                selectedTab === tab
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {selectedTab === 'overview' && renderOverviewTab()}
          {selectedTab === 'requirements' && renderRequirementsTab()}
          {selectedTab === 'documents' && renderDocumentsTab()}
          {selectedTab === 'recommendations' && renderRecommendationsTab()}
        </motion.div>
      </AnimatePresence>

      {/* Auto-Fix Modal */}
      <AnimatePresence>
        {showAutoFix && complianceCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAutoFix(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Available Auto-Fixes</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {complianceCheck.recommendations
                    .filter(r => r.automatable)
                    .map(rec => (
                      <label
                        key={rec.id}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFixes.includes(rec.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFixes([...selectedFixes, rec.id])
                            } else {
                              setSelectedFixes(selectedFixes.filter(id => id !== rec.id))
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{rec.issue}</p>
                          <p className="text-sm text-white/60 mt-1">{rec.recommendation}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                            <span>Time saved: {rec.timeEstimate}</span>
                            <span className="text-green-400">Safe to apply</span>
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <GlassButton
                    onClick={applySelectedFixes}
                    disabled={selectedFixes.length === 0}
                    className="flex-1"
                  >
                    Apply {selectedFixes.length} Fix{selectedFixes.length !== 1 ? 'es' : ''}
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    onClick={() => setShowAutoFix(false)}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}