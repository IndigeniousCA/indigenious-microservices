// Main Bid Submission Portal Component
// Handles the complete bid creation and submission process

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, DollarSign, Users, Shield, Award, 
  AlertCircle, Save, Send, ChevronRight, ChevronLeft,
  Clock, CheckCircle, XCircle, Paperclip, Plus
} from 'lucide-react'
import { BidPricingForm } from './BidPricingForm'
import { BidTechnicalForm } from './BidTechnicalForm'
import { BidTeamForm } from './BidTeamForm'
import { BidComplianceForm } from './BidComplianceForm'
import { BidReviewSubmit } from './BidReviewSubmit'
import { useBidSubmission } from '../hooks/useBidSubmission'
import type { Bid, BidFormData } from '../types/bid.types'

interface BidSubmissionPortalProps {
  rfqId: string
  rfqDetails: {
    id: string
    title: string
    type: 'government' | 'band'
    deadline: string
    minimumIndigenousContent?: number
    evaluationCriteria: Record<string, number>
    mandatoryRequirements: string[]
  }
  existingBid?: Bid
  onComplete: (bid: Bid) => void
}

export function BidSubmissionPortal({
  rfqId,
  rfqDetails,
  existingBid,
  onComplete
}: BidSubmissionPortalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<BidFormData>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  
  const {
    bid,
    saveDraft,
    submitBid,
    validateSection,
    calculateIndigenousContent,
    loading,
    error
  } = useBidSubmission(rfqId)

  // Steps configuration
  const steps = [
    { 
      id: 'summary', 
      title: 'Executive Summary', 
      icon: FileText,
      description: 'Introduce your proposal and key benefits'
    },
    { 
      id: 'pricing', 
      title: 'Pricing', 
      icon: DollarSign,
      description: 'Detailed cost breakdown and payment terms'
    },
    { 
      id: 'technical', 
      title: 'Technical Approach', 
      icon: FileText,
      description: 'Methodology, timeline, and deliverables'
    },
    { 
      id: 'team', 
      title: 'Team & Resources', 
      icon: Users,
      description: 'Key personnel and equipment'
    },
    { 
      id: 'compliance', 
      title: 'Compliance', 
      icon: Shield,
      description: 'Certifications and mandatory requirements'
    },
    { 
      id: 'review', 
      title: 'Review & Submit', 
      icon: CheckCircle,
      description: 'Final review before submission'
    }
  ]

  // Add Indigenous Content step for government RFQs
  if (rfqDetails.type === 'government' && rfqDetails.minimumIndigenousContent) {
    steps.splice(4, 0, {
      id: 'indigenous',
      title: 'Indigenous Content',
      icon: Award,
      description: 'Indigenous participation breakdown'
    })
  }

  // Calculate deadline status
  const getDeadlineStatus = () => {
    const now = new Date()
    const deadline = new Date(rfqDetails.deadline)
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft < 0) return { status: 'expired', text: 'Deadline passed', color: 'text-red-400' }
    if (hoursLeft < 24) return { status: 'urgent', text: `${Math.floor(hoursLeft)} hours left`, color: 'text-amber-400' }
    if (hoursLeft < 72) return { status: 'soon', text: `${Math.floor(hoursLeft / 24)} days left`, color: 'text-yellow-400' }
    return { status: 'normal', text: `${Math.floor(hoursLeft / 24)} days left`, color: 'text-white/60' }
  }

  const deadlineStatus = getDeadlineStatus()

  // Auto-save draft
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        saveDraft(formData)
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [formData])

  // Handle step navigation
  const handleNext = async () => {
    const currentStepId = steps[currentStep].id
    const errors = await validateSection(currentStepId, formData)
    
    if (errors.length > 0) {
      setValidationErrors({ [currentStepId]: errors })
      return
    }

    setValidationErrors({})
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Final submission
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleStepClick = (index: number) => {
    // Allow navigation to completed steps only
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  const handleSubmit = async () => {
    try {
      const submittedBid = await submitBid(formData as BidFormData)
      onComplete(submittedBid)
    } catch (error) {
      logger.error('Submission error:', error)
    }
  }

  // Update form data
  const updateFormData = (section: string, data: unknown) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }))
  }

  // Render current step component
  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'summary':
        return (
          <ExecutiveSummaryForm
            data={formData.executiveSummary}
            rfqDetails={rfqDetails}
            onChange={(data) => updateFormData('executiveSummary', data)}
            errors={validationErrors.summary}
          />
        )
      case 'pricing':
        return (
          <BidPricingForm
            data={formData.pricing}
            onChange={(data) => updateFormData('pricing', data)}
            errors={validationErrors.pricing}
          />
        )
      case 'technical':
        return (
          <BidTechnicalForm
            data={formData.technical}
            onChange={(data) => updateFormData('technical', data)}
            errors={validationErrors.technical}
          />
        )
      case 'team':
        return (
          <BidTeamForm
            data={formData.resources}
            onChange={(data) => updateFormData('resources', data)}
            errors={validationErrors.team}
          />
        )
      case 'indigenous':
        return (
          <IndigenousContentForm
            data={formData.indigenousContent}
            minimumRequired={rfqDetails.minimumIndigenousContent!}
            onChange={(data) => updateFormData('indigenousContent', data)}
            errors={validationErrors.indigenous}
          />
        )
      case 'compliance':
        return (
          <BidComplianceForm
            data={formData.compliance}
            mandatoryRequirements={rfqDetails.mandatoryRequirements}
            onChange={(data) => updateFormData('compliance', data)}
            errors={validationErrors.compliance}
          />
        )
      case 'review':
        return (
          <BidReviewSubmit
            formData={formData as BidFormData}
            rfqDetails={rfqDetails}
            onEdit={(stepId) => {
              const stepIndex = steps.findIndex(s => s.id === stepId)
              setCurrentStep(stepIndex)
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Bid Submission</h1>
              <p className="text-lg text-white/60">{rfqDetails.title}</p>
            </div>
            <div className="text-right">
              <div className={`text-sm ${deadlineStatus.color} mb-1`}>
                <Clock className="inline w-4 h-4 mr-1" />
                {deadlineStatus.text}
              </div>
              <button
                onClick={() => saveDraft(formData)}
                className="text-sm text-blue-300 hover:text-blue-200"
              >
                <Save className="inline w-4 h-4 mr-1" />
                Save Draft
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              const isClickable = index <= currentStep

              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <button
                    onClick={() => isClickable && handleStepClick(index)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isCompleted 
                          ? 'rgba(34, 197, 94, 0.3)' 
                          : isActive 
                          ? 'rgba(59, 130, 246, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                      }}
                      className={`w-12 h-12 rounded-xl backdrop-blur-md border flex items-center justify-center mb-2
                        ${isCompleted 
                          ? 'border-emerald-400/50' 
                          : isActive 
                          ? 'border-blue-400/50' 
                          : 'border-white/20'}`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Icon className={`w-6 h-6 ${
                          isActive ? 'text-blue-400' : 'text-white/50'
                        }`} />
                      )}
                    </motion.div>
                    <span className={`text-xs ${
                      isActive ? 'text-white' : 'text-white/60'
                    }`}>{step.title}</span>
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep 
                        ? 'bg-emerald-400/50' 
                        : 'bg-white/10'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
          {/* Step Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-white/60">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-6 bg-red-500/10 border border-red-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-100 mb-2">
                    Please fix the following errors:
                  </p>
                  <ul className="text-sm text-red-100/80 space-y-1">
                    {Object.entries(validationErrors).map(([section, errors]) => 
                      errors.map((error, index) => (
                        <li key={`${section}-${index}`}>• {error}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-xl text-white font-medium transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </motion.button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/60">
                Step {currentStep + 1} of {steps.length}
              </span>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                disabled={loading || deadlineStatus.status === 'expired'}
                className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
                  rounded-xl text-blue-100 font-medium transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Bid
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Tips Panel */}
        <div className="mt-6 bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
          <h3 className="font-medium text-blue-100 mb-2">💡 Tips for {steps[currentStep].title}</h3>
          <p className="text-sm text-blue-100/80">
            {getStepTips(steps[currentStep].id)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function for step tips
function getStepTips(stepId: string): string {
  const tips: Record<string, string> = {
    summary: 'Clearly demonstrate your understanding of the requirements and highlight what makes your proposal unique.',
    pricing: 'Provide transparent, competitive pricing with clear breakdowns. Include any assumptions or exclusions.',
    technical: 'Detail your methodology and approach. Be specific about deliverables and timelines.',
    team: 'Showcase your team\'s qualifications and experience. Highlight relevant past projects.',
    indigenous: 'Accurately calculate and document Indigenous participation across all categories.',
    compliance: 'Ensure all mandatory requirements are addressed with supporting documentation.',
    review: 'Double-check all sections before submission. Once submitted, changes cannot be made.'
  }
  return tips[stepId] || ''
}

// Executive Summary Form Component
function ExecutiveSummaryForm({ data, rfqDetails, onChange, errors }: any) {
  const [understanding, setUnderstanding] = useState(data?.understanding || '')
  const [keyBenefits, setKeyBenefits] = useState(data?.keyBenefits || [''])
  const [uniqueValue, setUniqueValue] = useState(data?.uniqueValue || '')

  const addBenefit = () => {
    setKeyBenefits([...keyBenefits, ''])
  }

  const updateBenefit = (index: number, value: string) => {
    const updated = [...keyBenefits]
    updated[index] = value
    setKeyBenefits(updated)
  }

  const removeBenefit = (index: number) => {
    setKeyBenefits(keyBenefits.filter((_, i) => i !== index))
  }

  useEffect(() => {
    onChange({
      understanding,
      keyBenefits: keyBenefits.filter(b => b.trim()),
      uniqueValue
    })
  }, [understanding, keyBenefits, uniqueValue])

  return (
    <div className="space-y-6">
      {/* Understanding of Requirements */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Understanding of Requirements <span className="text-red-400">*</span>
        </label>
        <textarea
          value={understanding}
          onChange={(e) => setUnderstanding(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
            focus:outline-none transition-all duration-200"
          placeholder="Demonstrate your understanding of the project requirements, objectives, and challenges..."
        />
        <p className="mt-1 text-xs text-white/60">
          Tip: Reference specific requirements from the RFQ to show thorough analysis
        </p>
      </div>

      {/* Key Benefits */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Key Benefits <span className="text-red-400">*</span>
        </label>
        <div className="space-y-2">
          {keyBenefits.map((benefit, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl 
                  backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
                  focus:outline-none transition-all duration-200"
                placeholder={`Benefit ${index + 1}`}
              />
              {keyBenefits.length > 1 && (
                <button
                  onClick={() => removeBenefit(index)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addBenefit}
            className="text-sm text-blue-300 hover:text-blue-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add another benefit
          </button>
        </div>
      </div>

      {/* Unique Value Proposition */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Unique Value Proposition <span className="text-red-400">*</span>
        </label>
        <textarea
          value={uniqueValue}
          onChange={(e) => setUniqueValue(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
            focus:outline-none transition-all duration-200"
          placeholder="What makes your proposal stand out? Why should you be selected?"
        />
      </div>

      {/* Government RFQ Notice */}
      {rfqDetails.type === 'government' && (
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-100">Indigenous Procurement Requirements</h4>
              <p className="text-sm text-blue-100/80 mt-1">
                This government RFQ requires a minimum of {rfqDetails.minimumIndigenousContent}% Indigenous content. 
                Make sure to highlight your Indigenous partnerships and participation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Indigenous Content Form Component
function IndigenousContentForm({ data, minimumRequired, onChange, errors }: any) {
  const [ownership, setOwnership] = useState(data?.ownershipPercentage || 0)
  const [employment, setEmployment] = useState(data?.employmentPercentage || 0)
  const [subcontracting, setSubcontracting] = useState(data?.subcontractingPercentage || 0)
  const [procurement, setProcurement] = useState(data?.procurementPercentage || 0)

  const total = ownership + employment + subcontracting + procurement
  const meetsRequirement = total >= minimumRequired

  useEffect(() => {
    onChange({
      ownershipPercentage: ownership,
      employmentPercentage: employment,
      subcontractingPercentage: subcontracting,
      procurementPercentage: procurement,
      totalPercentage: total
    })
  }, [ownership, employment, subcontracting, procurement])

  return (
    <div className="space-y-6">
      {/* Total Progress */}
      <div className={`p-4 rounded-xl border ${
        meetsRequirement 
          ? 'bg-emerald-500/10 border-emerald-400/30' 
          : 'bg-amber-500/10 border-amber-400/30'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white">Total Indigenous Content</span>
          <span className={`text-2xl font-bold ${
            meetsRequirement ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {total}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              meetsRequirement ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/60 mt-2">
          Minimum required: {minimumRequired}% • 
          {meetsRequirement ? ' ✓ Requirement met' : ` Need ${minimumRequired - total}% more`}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        {/* Ownership */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Indigenous Ownership
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={ownership}
              onChange={(e) => setOwnership(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 text-center">
              <input
                type="number"
                min="0"
                max="100"
                value={ownership}
                onChange={(e) => setOwnership(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                  text-white text-center focus:border-blue-400/50 focus:outline-none"
              />
            </div>
            <span className="text-white">%</span>
          </div>
        </div>

        {/* Employment */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Indigenous Employment
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={employment}
              onChange={(e) => setEmployment(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 text-center">
              <input
                type="number"
                min="0"
                max="100"
                value={employment}
                onChange={(e) => setEmployment(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                  text-white text-center focus:border-blue-400/50 focus:outline-none"
              />
            </div>
            <span className="text-white">%</span>
          </div>
        </div>

        {/* Subcontracting */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Indigenous Subcontracting
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={subcontracting}
              onChange={(e) => setSubcontracting(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 text-center">
              <input
                type="number"
                min="0"
                max="100"
                value={subcontracting}
                onChange={(e) => setSubcontracting(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                  text-white text-center focus:border-blue-400/50 focus:outline-none"
              />
            </div>
            <span className="text-white">%</span>
          </div>
        </div>

        {/* Procurement */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Indigenous Procurement
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={procurement}
              onChange={(e) => setProcurement(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 text-center">
              <input
                type="number"
                min="0"
                max="100"
                value={procurement}
                onChange={(e) => setProcurement(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded 
                  text-white text-center focus:border-blue-400/50 focus:outline-none"
              />
            </div>
            <span className="text-white">%</span>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Supporting Documentation
        </label>
        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
          <Paperclip className="w-8 h-8 text-white/40 mx-auto mb-2" />
          <p className="text-sm text-white/60 mb-2">
            Upload verification documents for Indigenous content
          </p>
          <button className="text-sm text-blue-300 hover:text-blue-200">
            Browse Files
          </button>
        </div>
      </div>
    </div>
  )
}