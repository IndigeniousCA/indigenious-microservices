'use client'

import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Users, Brain } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { aiRegistry, type AIModel, type AIGovernanceReport } from '@/lib/ai/governance/ai-registry'

export function AIGovernanceDashboard() {
  const [report, setReport] = useState<AIGovernanceReport | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'principles'>('overview')

  useEffect(() => {
    // Load initial data
    loadData()

    // Listen for updates
    const handleUpdate = () => loadData()
    aiRegistry.on('model-registered', handleUpdate)
    aiRegistry.on('model-reviewed', handleUpdate)
    
    return () => {
      aiRegistry.off('model-registered', handleUpdate)
      aiRegistry.off('model-reviewed', handleUpdate)
    }
  }, [])

  const loadData = () => {
    setReport(aiRegistry.generateGovernanceReport())
    setModels(aiRegistry.getAllModels())
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'production': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'testing': return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'development': return <Brain className="w-5 h-5 text-blue-400" />
      default: return <Shield className="w-5 h-5 text-gray-400" />
    }
  }

  if (!report) return <div>Loading AI governance data...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              AI Governance Dashboard
            </h2>
            <p className="text-white/60 mt-1">
              Foundation for ISO 42001 certification
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Last updated</p>
            <p className="text-white">{new Date(report.lastUpdated).toLocaleString()}</p>
          </div>
        </div>
      </GlassPanel>

      {/* Tabs */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'models'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          AI Models ({report.totalModels})
        </button>
        <button
          onClick={() => setActiveTab('principles')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'principles'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Cultural Principles ({report.principles})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Model Status */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Model Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Production</span>
                <span className="text-green-400">{report.byStatus.production}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Testing</span>
                <span className="text-yellow-400">{report.byStatus.testing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Development</span>
                <span className="text-blue-400">{report.byStatus.development}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Retired</span>
                <span className="text-gray-400">{report.byStatus.retired}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Risk Overview */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Levels</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">High Risk</span>
                <span className="text-red-400">{report.byRisk.high}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Medium Risk</span>
                <span className="text-yellow-400">{report.byRisk.medium}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Low Risk</span>
                <span className="text-green-400">{report.byRisk.low}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Indigenous Data */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Indigenous Data
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Using Indigenous Data</span>
                <span className="text-blue-400">{report.indigenousData.modelsUsingIndigenousData}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Using Sacred Data</span>
                <span className="text-purple-400">{report.indigenousData.modelsUsingSacredData}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Elder Oversight</span>
                <span className="text-green-400">{report.indigenousData.withElderOversight}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Compliance Status */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Compliance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Reviews Overdue</span>
                <span className={report.compliance.reviewsOverdue > 0 ? 'text-red-400' : 'text-green-400'}>
                  {report.compliance.reviewsOverdue}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Cultural Reviews</span>
                <span className="text-green-400">{report.compliance.culturalReviewsConducted}</span>
              </div>
            </div>
          </GlassPanel>

          {/* Decision Tracking */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Decisions</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Total Logged</span>
                <span className="text-white">{report.decisions.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Human Overrides</span>
                <span className="text-yellow-400">{report.decisions.overridden}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Elder Consulted</span>
                <span className="text-purple-400">{report.decisions.elderConsulted}</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          {models.map((model) => (
            <GlassPanel key={model.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(model.status)}
                    <h3 className="text-lg font-semibold text-white">{model.name}</h3>
                    <span className={`text-sm ${getRiskColor(model.riskLevel)}`}>
                      {model.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className="text-white/60 mt-1">{model.purpose}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-white/40">Type:</span>
                      <span className="text-white/80 ml-2">{model.type}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Owner:</span>
                      <span className="text-white/80 ml-2">{model.owner}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Next Review:</span>
                      <span className="text-white/80 ml-2">
                        {new Date(model.nextReview).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Data flags */}
                  <div className="flex gap-2 mt-3">
                    {model.personalData && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                        Personal Data
                      </span>
                    )}
                    {model.indigenousData && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Indigenous Data
                      </span>
                    )}
                    {model.sacredData && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                        Sacred Data
                      </span>
                    )}
                    {model.elderOversight && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                        Elder Oversight
                      </span>
                    )}
                  </div>

                  {/* Cultural review */}
                  {model.culturalReview.conducted && (
                    <div className="mt-4 p-3 bg-white/5 rounded">
                      <p className="text-sm text-white/60">
                        Cultural Review by {model.culturalReview.reviewer} on{' '}
                        {new Date(model.culturalReview.date!).toLocaleDateString()}
                      </p>
                      {model.culturalReview.elderGuidance && (
                        <p className="text-sm text-purple-400 mt-1">
                          Elder Guidance: {model.culturalReview.elderGuidance}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Principles Tab */}
      {activeTab === 'principles' && (
        <div className="space-y-4">
          {aiRegistry.getPrinciples().map((principle) => (
            <GlassPanel key={principle.id} className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {principle.principle}
                  </h3>
                  <p className="text-white/60 mt-2">{principle.rationale}</p>
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium text-white/80 mb-2">Implementation:</p>
                    <ul className="space-y-1">
                      {principle.implementation.map((impl, i) => (
                        <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{impl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-white/80 mb-2">Examples:</p>
                    <ul className="space-y-1">
                      {principle.examples.map((example, i) => (
                        <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                          <span className="text-green-400 mt-1">→</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {principle.elderEndorsed && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-purple-400">Elder Endorsed</span>
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}