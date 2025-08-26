'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, FileText, Brain, Check, AlertCircle, 
  ChevronRight, Download, Share2, Clock, Target,
  TrendingUp, Edit3, RefreshCw, Languages, Users,
  Zap, Award, BookOpen, MessageSquare
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { BidAssistantService } from '../services/BidAssistantService'
import { 
  BidContext, BidDraft, BidAnalysis, BidSuggestion,
  AIBidRequest, BidTemplate
} from '../types'

interface AIBidAssistantProps {
  rfqId: string
  businessId: string
  onSaveDraft?: (draft: BidDraft) => void
  existingDraft?: BidDraft
}

export function AIBidAssistant({ rfqId, businessId, onSaveDraft, existingDraft }: AIBidAssistantProps) {
  const [bidService] = useState(() => new BidAssistantService())
  const [currentStep, setCurrentStep] = useState<'setup' | 'generate' | 'review' | 'improve'>('setup')
  const [draft, setDraft] = useState<BidDraft | null>(existingDraft || null)
  const [analysis, setAnalysis] = useState<BidAnalysis | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [tone, setTone] = useState<'formal' | 'professional' | 'conversational'>('professional')
  const [length, setLength] = useState<'concise' | 'standard' | 'detailed'>('standard')
  const [language, setLanguage] = useState<'en' | 'fr' | 'cr'>('en')
  const [includeIndigenous, setIncludeIndigenous] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  
  // Mock context - in production would fetch from API
  const context: BidContext = {
    businessId,
    businessProfile: {
      name: 'TechNation Inc',
      capabilities: ['IT Services', 'Software Development', 'Cloud Solutions'],
      certifications: ['ISO 27001', 'SOC 2', 'Indigenous Business Certified'],
      pastPerformance: [
        {
          projectName: 'Federal Cloud Migration',
          client: 'Government of Canada',
          value: 500000,
          completionDate: new Date('2023-12-01'),
          rating: 4.8
        }
      ],
      teamSize: 25,
      indigenousPercentage: 100,
      locations: ['Ottawa', 'Winnipeg']
    },
    rfqDetails: {
      id: rfqId,
      title: 'IT Infrastructure Modernization',
      category: 'it-services',
      budget: '$250,000 - $500,000',
      deadline: new Date('2024-12-15'),
      evaluationCriteria: [
        { name: 'Technical Approach', weight: 30, description: 'Quality of proposed solution', scoringGuide: [] },
        { name: 'Experience', weight: 25, description: 'Relevant past performance', scoringGuide: [] },
        { name: 'Price', weight: 20, description: 'Value for money', scoringGuide: [] },
        { name: 'Indigenous Benefits', weight: 15, description: 'Community impact', scoringGuide: [] },
        { name: 'Timeline', weight: 10, description: 'Realistic schedule', scoringGuide: [] }
      ],
      mandatoryRequirements: [
        'Valid security clearance',
        'Minimum $2M liability insurance',
        'ISO 27001 certification'
      ],
      scopeOfWork: 'Modernize IT infrastructure including cloud migration, security upgrades, and training.'
    }
  }
  
  const handleGenerateBid = async () => {
    setIsGenerating(true)
    setCurrentStep('generate')
    
    try {
      const request: AIBidRequest = {
        context,
        template: selectedTemplate,
        sections: selectedSections,
        tone,
        length,
        language,
        includeIndigenousContent: includeIndigenous
      }
      
      const generatedDraft = await bidService.generateBid(request)
      setDraft(generatedDraft)
      
      // Analyze the draft
      const bidAnalysis = await bidService.analyzeBid(generatedDraft, context)
      setAnalysis(bidAnalysis)
      
      setCurrentStep('review')
    } catch (error) {
      logger.error('Error generating bid:', error)
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleImproveSection = async (sectionId: string, improvementType: 'clarity' | 'compliance' | 'persuasion') => {
    if (!draft) return
    
    const section = draft.sections.find(s => s.sectionId === sectionId)
    if (!section) return
    
    try {
      const improvement = await bidService.improveBidText(
        section.content,
        improvementType,
        context
      )
      
      // Update the draft with improved content
      const updatedSections = draft.sections.map(s => 
        s.sectionId === sectionId 
          ? { ...s, content: improvement.improved, humanEdited: true }
          : s
      )
      
      const updatedDraft = { ...draft, sections: updatedSections, lastUpdated: new Date() }
      setDraft(updatedDraft)
      
      // Re-analyze
      const newAnalysis = await bidService.analyzeBid(updatedDraft, context)
      setAnalysis(newAnalysis)
    } catch (error) {
      logger.error('Error improving section:', error)
    }
  }
  
  const renderSetupStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Bid Configuration</h3>
        
        {/* Template Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-2">
            Choose Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedTemplate('it-standard')}
              className={`p-4 rounded-lg border transition-all ${
                selectedTemplate === 'it-standard'
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              <FileText className="w-6 h-6 mb-2" />
              <p className="font-medium">IT Services Standard</p>
              <p className="text-xs mt-1">Best for technology projects</p>
            </button>
            <button
              onClick={() => setSelectedTemplate('custom')}
              className={`p-4 rounded-lg border transition-all ${
                selectedTemplate === 'custom'
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              <Edit3 className="w-6 h-6 mb-2" />
              <p className="font-medium">Custom Template</p>
              <p className="text-xs mt-1">Build from scratch</p>
            </button>
          </div>
        </div>
        
        {/* Tone Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-2">
            Writing Tone
          </label>
          <div className="flex gap-2">
            {(['formal', 'professional', 'conversational'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-2 rounded-lg capitalize transition-all ${
                  tone === t
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        
        {/* Length Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/80 mb-2">
            Content Length
          </label>
          <div className="flex gap-2">
            {(['concise', 'standard', 'detailed'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLength(l)}
                className={`px-4 py-2 rounded-lg capitalize transition-all ${
                  length === l
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        
        {/* Language and Indigenous Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Language
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-2 rounded-lg transition-all ${
                  language === 'en'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-3 py-2 rounded-lg transition-all ${
                  language === 'fr'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLanguage('cr')}
                className={`px-3 py-2 rounded-lg transition-all ${
                  language === 'cr'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                ᓀᐦᐃᔭᐍᐏᐣ
              </button>
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIndigenous}
                onChange={(e) => setIncludeIndigenous(e.target.checked)}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-blue-400 focus:ring-blue-400"
              />
              <div>
                <span className="text-sm font-medium text-white/80">
                  Emphasize Indigenous Values
                </span>
                <p className="text-xs text-white/60">
                  Include cultural elements and community benefits
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <GlassButton
        onClick={handleGenerateBid}
        className="w-full"
        size="lg"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Generate AI Bid
      </GlassButton>
    </div>
  )
  
  const renderGeneratingStep = () => (
    <div className="text-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 mx-auto mb-6"
      >
        <Brain className="w-16 h-16 text-blue-400" />
      </motion.div>
      <h3 className="text-xl font-semibold text-white mb-2">
        AI is writing your bid...
      </h3>
      <p className="text-white/60">
        Analyzing requirements and crafting compelling content
      </p>
      <div className="mt-6 space-y-2 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-sm text-white/60"
        >
          <Check className="w-4 h-4 text-green-400" />
          Understanding project requirements
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-2 text-sm text-white/60"
        >
          <Check className="w-4 h-4 text-green-400" />
          Matching your capabilities
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="flex items-center gap-2 text-sm text-white/60"
        >
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          Writing compelling content...
        </motion.div>
      </div>
    </div>
  )
  
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Score Overview */}
      {analysis && (
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              AI Bid Analysis
            </h3>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{analysis.score}%</p>
              <p className="text-sm text-white/60">Overall Score</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-white/60">Compliance</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white">{analysis.complianceIssues.length === 0 ? 'Pass' : 'Issues'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-white/60">Readability</p>
              <p className="text-white">{analysis.readabilityScore}%</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Technical</p>
              <p className="text-white">{analysis.technicalAccuracy}%</p>
            </div>
          </div>
          
          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-green-400 mb-2">Strengths</p>
              <ul className="space-y-1">
                {analysis.strengths.slice(0, 3).map((strength, i) => (
                  <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                    <Check className="w-3 h-3 text-green-400 mt-0.5" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-400 mb-2">Areas to Improve</p>
              <ul className="space-y-1">
                {analysis.weaknesses.slice(0, 3).map((weakness, i) => (
                  <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassPanel>
      )}
      
      {/* Bid Content */}
      {draft && (
        <div className="space-y-4">
          {draft.sections.map((section, index) => (
            <GlassPanel key={section.sectionId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    Section {index + 1}: {section.sectionId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-white/60">
                      {section.content.split(' ').length} words
                    </span>
                    {section.aiGenerated && (
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </span>
                    )}
                    {section.humanEdited && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        Edited
                      </span>
                    )}
                    <span className="text-xs text-white/60">
                      Confidence: {Math.round(section.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImproveSection(section.sectionId, 'clarity')}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Improve clarity"
                  >
                    <BookOpen className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={() => handleImproveSection(section.sectionId, 'persuasion')}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Make more persuasive"
                  >
                    <TrendingUp className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={() => handleImproveSection(section.sectionId, 'compliance')}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Enhance compliance"
                  >
                    <Award className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-white/80 whitespace-pre-wrap">
                  {section.content.substring(0, 300)}...
                </p>
              </div>
              
              <button className="text-sm text-blue-400 hover:text-blue-300 mt-3">
                Read full section →
              </button>
            </GlassPanel>
          ))}
        </div>
      )}
      
      {/* Suggestions */}
      {analysis && analysis.suggestions.length > 0 && (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            AI Suggestions
          </h3>
          <div className="space-y-3">
            {analysis.suggestions.slice(0, 5).map((suggestion, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  suggestion.priority === 'critical' ? 'bg-red-400' :
                  suggestion.priority === 'high' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-white/80">{suggestion.suggestion}</p>
                  <p className="text-xs text-white/60 mt-1">
                    {suggestion.section} • {suggestion.priority} priority
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
      
      {/* Actions */}
      <div className="flex gap-4">
        <GlassButton
          onClick={() => onSaveDraft?.(draft!)}
          variant="primary"
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Save Draft
        </GlassButton>
        <GlassButton
          variant="secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </GlassButton>
        <GlassButton
          variant="secondary"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </GlassButton>
      </div>
    </div>
  )
  
  return (
    <div className="max-w-6xl mx-auto">
      <GlassPanel className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                AI Bid Assistant
              </h2>
              <p className="text-sm text-white/60">
                Powered by advanced AI trained on winning bids
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-white/60">Win Rate: <span className="text-white">73%</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-white/60">Avg Time: <span className="text-white">45 min</span></span>
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {['setup', 'generate', 'review', 'improve'].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                currentStep === step
                  ? 'bg-blue-500 text-white'
                  : i < ['setup', 'generate', 'review', 'improve'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/40'
              }`}>
                {i < ['setup', 'generate', 'review', 'improve'].indexOf(currentStep) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${
                  i < ['setup', 'generate', 'review', 'improve'].indexOf(currentStep)
                    ? 'bg-green-500'
                    : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'setup' && renderSetupStep()}
            {currentStep === 'generate' && renderGeneratingStep()}
            {currentStep === 'review' && renderReviewStep()}
          </motion.div>
        </AnimatePresence>
      </GlassPanel>
      
      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
        <p className="text-sm text-blue-400 flex items-start gap-2">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Pro Tip:</strong> The AI learns from every bid. The more you use it, 
            the better it gets at matching your company's voice and winning style.
          </span>
        </p>
      </div>
    </div>
  )
}