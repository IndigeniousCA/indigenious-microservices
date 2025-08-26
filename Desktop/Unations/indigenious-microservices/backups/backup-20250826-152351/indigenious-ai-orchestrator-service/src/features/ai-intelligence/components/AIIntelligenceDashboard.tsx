'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, Search, Globe, FileText, Users, Zap, 
  TrendingUp, Shield, Languages, Bot, Sparkles,
  BarChart3, Target, Clock, AlertCircle, CheckCircle,
  ArrowRight, Loader2, MessageSquare, Mic, Eye,
  Building2, Briefcase, Award, DollarSign
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { AIIntelligenceService } from '../services/AIIntelligenceService'

interface AIIntelligenceDashboardProps {
  businessId?: string
}

export function AIIntelligenceDashboard({ businessId }: AIIntelligenceDashboardProps) {
  const [aiService] = useState(() => new AIIntelligenceService())
  const [activeFeature, setActiveFeature] = useState<'search' | 'automation' | 'partnership' | 'compliance'>('search')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<unknown>(null)
  
  // RFQ Analysis state
  const [analyzedRFQ, setAnalyzedRFQ] = useState<unknown>(null)
  const [monitoringStatus, setMonitoringStatus] = useState<unknown>(null)
  
  // Partnership state
  const [partnerMatches, setPartnerMatches] = useState<any[]>([])
  
  // Translation state
  const [translationText, setTranslationText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState<'fr' | 'cr' | 'oj'>('fr')
  const [translation, setTranslation] = useState<unknown>(null)

  useEffect(() => {
    // Start monitoring procurement sites
    monitorProcurementSites()
  }, [])

  const monitorProcurementSites = async () => {
    const status = await aiService.monitorProcurementSites()
    setMonitoringStatus(status)
  }

  const handleSemanticSearch = async () => {
    setIsProcessing(true)
    try {
      const results = await aiService.semanticSearch(searchQuery)
      setSearchResults(results)
    } catch (error) {
      logger.error('Search failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const analysis = await aiService.analyzeRFQ(file)
      setAnalyzedRFQ(analysis)
    } catch (error) {
      logger.error('RFQ analysis failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTranslate = async () => {
    setIsProcessing(true)
    try {
      const result = await aiService.translateContent(translationText, targetLanguage)
      setTranslation(result)
    } catch (error) {
      logger.error('Translation failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const renderSearchFeature = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          AI-Powered Semantic Search
        </h3>
        
        <p className="text-white/60 mb-4">
          Ask questions in natural language to find RFQs, partners, and opportunities
        </p>

        <div className="flex gap-3">
          <GlassInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., Find construction RFQs in Northern Ontario requiring Indigenous partnerships"
            className="flex-1"
          />
          <GlassButton onClick={handleSemanticSearch} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </GlassButton>
        </div>

        {searchResults && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-400/50 rounded-lg">
              <p className="text-blue-400 text-sm mb-2">
                AI understood: "{searchResults.intent}"
              </p>
              <div className="flex flex-wrap gap-2">
                {searchResults.suggestedFilters.map((filter: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                    {filter}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {searchResults.results.map((result: unknown, i: number) => (
                <GlassPanel key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-medium">
                        {result.title || result.name}
                      </h4>
                      <p className="text-white/60 text-sm mt-1">
                        {result.snippet || `Match score: ${(result.relevance * 100).toFixed(0)}%`}
                      </p>
                      {result.indigenousRequirement && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Indigenous partnership required
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40" />
                  </div>
                </GlassPanel>
              ))}
            </div>

            <div>
              <p className="text-white/60 text-sm mb-2">Related searches:</p>
              <div className="flex flex-wrap gap-2">
                {searchResults.relatedQueries.map((query: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSearchQuery(query)}
                    className="text-blue-400 text-sm hover:text-blue-300"
                  >
                    {query} →
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* RFQ Intelligence */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-400" />
          RFQ Document Intelligence
        </h3>

        <p className="text-white/60 mb-4">
          Upload any RFQ document and AI will extract requirements, deadlines, and Indigenous content
        </p>

        <label className="block">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          <GlassButton as="span" className="cursor-pointer">
            <FileText className="w-4 h-4 mr-2" />
            Upload RFQ Document
          </GlassButton>
        </label>

        {analyzedRFQ && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm">Title</p>
                <p className="text-white font-medium">{analyzedRFQ.title}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Deadline</p>
                <p className="text-white font-medium">
                  {new Date(analyzedRFQ.deadline).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Value Range</p>
                <p className="text-white font-medium">
                  ${(analyzedRFQ.value.min / 1000000).toFixed(1)}M - ${(analyzedRFQ.value.max / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Indigenous Content</p>
                <p className="text-white font-medium">
                  {analyzedRFQ.indigenousContent.minimumContent}% minimum
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-400/50 rounded-lg">
              <h4 className="text-green-400 font-medium mb-2">Indigenous Requirements</h4>
              <ul className="space-y-1 text-sm text-white/80">
                <li>• Target Nations: {analyzedRFQ.indigenousContent.specificNations.join(', ')}</li>
                <li>• Employment: {analyzedRFQ.indigenousContent.employmentTargets[0].percentage}% in skilled trades</li>
                <li>• 100% Indigenous catering & security subcontractors</li>
              </ul>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  )

  const renderAutomationFeature = () => (
    <div className="space-y-6">
      {/* Procurement Monitoring */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Automated Procurement Monitoring
        </h3>

        <p className="text-white/60 mb-4">
          AI continuously monitors all government procurement sites for matching opportunities
        </p>

        {monitoringStatus && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(monitoringStatus.monitoringStatus).map(([site, status]: [string, any]) => (
                <div key={site} className="text-center">
                  <p className="text-white/60 text-sm">{site}</p>
                  <p className="text-2xl font-bold text-white">{status.rfqsFound}</p>
                  <p className="text-xs text-white/40">New RFQs</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-medium">Latest Matches</h4>
              {monitoringStatus.newRFQs.map((rfq: any, i: number) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{rfq.title}</p>
                      <p className="text-white/60 text-sm">
                        {rfq.source} • {rfq.value} • Due {new Date(rfq.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">
                        {(rfq.matchScore * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-white/60">Match</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      {rfq.indigenousContent}% Indigenous
                    </span>
                    <GlassButton size="sm" variant="secondary">
                      View Details
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Form Automation */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-400" />
          Intelligent Form Completion
        </h3>

        <p className="text-white/60 mb-4">
          AI automatically fills government forms using your business profile
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-white font-medium mb-2">Supported Forms</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Supplier Registration',
                'Security Clearance',
                'Indigenous Certification',
                'Vendor Performance'
              ].map(form => (
                <button
                  key={form}
                  className="p-3 bg-white/5 rounded hover:bg-white/10 transition-colors text-left"
                >
                  <p className="text-white text-sm">{form}</p>
                  <p className="text-white/40 text-xs">Auto-fill ready</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  )

  const renderPartnershipFeature = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-green-400" />
          AI Partnership Matching
        </h3>

        <p className="text-white/60 mb-4">
          Find the perfect partners for any project using AI compatibility analysis
        </p>

        <GlassButton onClick={() => setPartnerMatches([
          {
            partner: { name: 'Northern Construction Ltd.' },
            overall: 0.92,
            breakdown: {
              capabilities: 0.95,
              cultural: 0.88,
              geographic: 0.90,
              financial: 0.85,
              experience: 0.94,
              indigenous: 0.98
            },
            strengths: [
              'Strong presence in target community',
              'Complementary technical capabilities',
              'Established Indigenous partnerships'
            ]
          },
          {
            partner: { name: 'Eagle Engineering Services' },
            overall: 0.87,
            breakdown: {
              capabilities: 0.85,
              cultural: 0.92,
              geographic: 0.88,
              financial: 0.90,
              experience: 0.82,
              indigenous: 0.85
            },
            strengths: [
              'Excellent safety record',
              'Specialized equipment available',
              'Strong financial capacity'
            ]
          }
        ])}>
          <Users className="w-4 h-4 mr-2" />
          Find Compatible Partners
        </GlassButton>

        {partnerMatches.length > 0 && (
          <div className="mt-6 space-y-4">
            {partnerMatches.map((match, i) => (
              <GlassPanel key={i} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium">{match.partner.name}</h4>
                    <p className="text-green-400 font-medium">
                      {(match.overall * 100).toFixed(0)}% Compatibility
                    </p>
                  </div>
                  <Building2 className="w-5 h-5 text-white/40" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(match.breakdown).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-xs text-white/60 capitalize">{key}</p>
                      <p className="text-sm font-medium text-white">
                        {((value as number) * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {match.strengths.slice(0, 2).map((strength, j) => (
                    <p key={j} className="text-xs text-white/60 flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                      {strength}
                    </p>
                  ))}
                </div>

                <GlassButton size="sm" variant="secondary" className="mt-3 w-full">
                  View Full Analysis
                </GlassButton>
              </GlassPanel>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Cultural Intelligence */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6 text-purple-400" />
          Cultural Intelligence
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-purple-500/10 border border-purple-400/50 rounded-lg">
            <h4 className="text-purple-400 font-medium mb-2">Today's Awareness</h4>
            <p className="text-white/80 text-sm">
              National Indigenous Peoples Day preparations beginning.
              Consider ceremony schedules when planning June meetings.
            </p>
          </div>

          <div>
            <p className="text-white/60 text-sm mb-2">Protocol Guidance</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Business Protocols',
                'Meeting Etiquette',
                'Gift Giving',
                'Land Acknowledgments'
              ].map(protocol => (
                <button
                  key={protocol}
                  className="p-3 bg-white/5 rounded hover:bg-white/10 transition-colors text-left"
                >
                  <p className="text-white text-sm">{protocol}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  )

  const renderComplianceFeature = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-400" />
          AI Compliance Checker
        </h3>

        <p className="text-white/60 mb-4">
          Automatically verify your proposals meet all requirements before submission
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-400/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-green-400 font-medium">Last Compliance Check</h4>
              <span className="text-green-400 text-sm">85% Compliant</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Technical Requirements</span>
                <span className="text-white">92%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Financial Requirements</span>
                <span className="text-white">88%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Indigenous Content</span>
                <span className="text-white">95%</span>
              </div>
            </div>
          </div>

          <GlassButton className="w-full">
            <Shield className="w-4 h-4 mr-2" />
            Run Compliance Check
          </GlassButton>
        </div>
      </GlassPanel>

      {/* Multi-language Support */}
      <GlassPanel className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Languages className="w-6 h-6 text-blue-400" />
          Indigenous Language Translation
        </h3>

        <p className="text-white/60 mb-4">
          Translate content between English, French, and Indigenous languages
        </p>

        <div className="space-y-4">
          <GlassInput
            value={translationText}
            onChange={(e) => setTranslationText(e.target.value)}
            placeholder="Enter text to translate..."
            className="min-h-[80px]"
            as="textarea"
          />

          <div className="flex gap-3">
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as unknown)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="fr">French</option>
              <option value="cr">Cree</option>
              <option value="oj">Ojibwe</option>
            </select>
            <GlassButton onClick={handleTranslate} disabled={isProcessing}>
              <Languages className="w-4 h-4 mr-2" />
              Translate
            </GlassButton>
          </div>

          {translation && (
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-1">Translation:</p>
              <p className="text-white">{translation.translated}</p>
              {translation.culturalNotes.length > 0 && (
                <p className="text-yellow-400 text-sm mt-2">
                  ℹ️ {translation.culturalNotes[0]}
                </p>
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                AI Intelligence Center
              </h2>
              <p className="text-sm text-white/60">
                Powered by advanced AI inspired by Cohere & Adept
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white/60">AI Active</span>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {[
            { id: 'search', name: 'Smart Search', icon: Search },
            { id: 'automation', name: 'Automation', icon: Zap },
            { id: 'partnership', name: 'Partnerships', icon: Users },
            { id: 'compliance', name: 'Compliance', icon: Shield }
          ].map(feature => {
            const Icon = feature.icon
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id as unknown)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeFeature === feature.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {feature.name}
              </button>
            )
          })}
        </div>
      </GlassPanel>

      {/* Feature Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFeature}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeFeature === 'search' && renderSearchFeature()}
          {activeFeature === 'automation' && renderAutomationFeature()}
          {activeFeature === 'partnership' && renderPartnershipFeature()}
          {activeFeature === 'compliance' && renderComplianceFeature()}
        </motion.div>
      </AnimatePresence>

      {/* AI Insights Panel */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          AI-Generated Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-500/10 border border-green-400/50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-white font-medium">Partnership Success</p>
            <p className="text-white/60 text-sm mt-1">
              92% success rate when partnering with businesses from same territory
            </p>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-400/50 rounded-lg">
            <Target className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-white font-medium">Optimal Bid Range</p>
            <p className="text-white/60 text-sm mt-1">
              15-20% margin recommended for infrastructure projects
            </p>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-400/50 rounded-lg">
            <Clock className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-white font-medium">Submission Timing</p>
            <p className="text-white/60 text-sm mt-1">
              Submit 3-5 days before deadline for 23% higher success rate
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}