// Bid Submission Manager Component
// Manage and submit bids to government systems

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, FileText, Shield, AlertCircle, CheckCircle,
  Upload, Clock, Building, DollarSign, Users,
  Paperclip, AlertTriangle, Loader, ExternalLink
} from 'lucide-react'
import { 
  GovernmentSystem, 
  GovernmentBidSubmission,
  BidSubmissionStatus,
  VendorSubmissionInfo 
} from '../types/integration.types'
import { useBidSubmission } from '../hooks/useBidSubmission'

interface BidSubmissionManagerProps {
  bidId: string
  rfqId: string
  targetSystem: GovernmentSystem
  onSubmissionComplete?: (submission: GovernmentBidSubmission) => void
}

export function BidSubmissionManager({
  bidId,
  rfqId,
  targetSystem,
  onSubmissionComplete
}: BidSubmissionManagerProps) {
  const {
    submission,
    validationErrors,
    submitBid,
    validateSubmission,
    updateSubmissionData,
    isSubmitting
  } = useBidSubmission(bidId, rfqId, targetSystem)

  const [activeStep, setActiveStep] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  // Submission steps
  const steps = [
    { id: 'vendor', label: 'Vendor Information', icon: Building },
    { id: 'technical', label: 'Technical Proposal', icon: FileText },
    { id: 'financial', label: 'Financial Proposal', icon: DollarSign },
    { id: 'documents', label: 'Supporting Documents', icon: Paperclip },
    { id: 'review', label: 'Review & Submit', icon: Send }
  ]

  // Handle submission
  const handleSubmit = async () => {
    const isValid = await validateSubmission()
    if (!isValid) {
      setActiveStep(0) // Go to first error
      return
    }

    const result = await submitBid()
    if (result) {
      onSubmissionComplete?.(result)
    }
  }

  // Get step status
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < activeStep) return 'completed'
    if (stepIndex === activeStep) return 'active'
    return 'pending'
  }

  // Get status color
  const getStatusColor = (status: BidSubmissionStatus) => {
    const colors: Record<BidSubmissionStatus, string> = {
      draft: 'gray',
      validating: 'blue',
      submitting: 'amber',
      submitted: 'emerald',
      acknowledged: 'green',
      rejected: 'red',
      withdrawn: 'gray'
    }
    return colors[status]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border 
        border-blue-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Submit Bid to {targetSystem}
            </h2>
            <p className="text-white/70">RFQ Reference: {rfqId}</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 bg-${getStatusColor(submission.status)}-500/20 
              border border-${getStatusColor(submission.status)}-400/30 rounded-full 
              text-${getStatusColor(submission.status)}-300 text-sm font-medium capitalize`}>
              {submission.status}
            </span>

            {submission.confirmationNumber && (
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 
                rounded-full text-emerald-300 text-sm">
                #{submission.confirmationNumber}
              </span>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const status = getStepStatus(index)

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg 
                    transition-all ${
                      status === 'active' 
                        ? 'bg-blue-500/20 border border-blue-400/50 text-blue-200'
                        : status === 'completed'
                        ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border border-white/20 text-white/50'
                    }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                </button>

                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    getStepStatus(index + 1) !== 'pending'
                      ? 'bg-blue-400/50'
                      : 'bg-white/20'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
        >
          {/* Vendor Information */}
          {activeStep === 0 && (
            <VendorInfoStep
              data={submission.submissionData.vendorInfo}
              errors={validationErrors.filter(e => e.field.startsWith('vendor'))}
              onChange={(data) => updateSubmissionData('vendorInfo', data)}
            />
          )}

          {/* Technical Proposal */}
          {activeStep === 1 && (
            <TechnicalProposalStep
              document={submission.submissionData.technicalProposal}
              errors={validationErrors.filter(e => e.field.startsWith('technical'))}
              onChange={(doc) => updateSubmissionData('technicalProposal', doc)}
            />
          )}

          {/* Financial Proposal */}
          {activeStep === 2 && (
            <FinancialProposalStep
              document={submission.submissionData.financialProposal}
              errors={validationErrors.filter(e => e.field.startsWith('financial'))}
              onChange={(doc) => updateSubmissionData('financialProposal', doc)}
            />
          )}

          {/* Supporting Documents */}
          {activeStep === 3 && (
            <SupportingDocumentsStep
              documents={submission.submissionData.supportingDocuments}
              certifications={submission.submissionData.certifications}
              errors={validationErrors.filter(e => e.field.startsWith('documents'))}
              onDocumentsChange={(docs) => updateSubmissionData('supportingDocuments', docs)}
              onCertificationsChange={(certs) => updateSubmissionData('certifications', certs)}
            />
          )}

          {/* Review & Submit */}
          {activeStep === 4 && (
            <ReviewSubmitStep
              submission={submission}
              validationErrors={validationErrors}
              onSubmit={handleSubmit}
              onPreview={() => setShowPreview(true)}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
          disabled={activeStep === 0}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
            rounded-lg text-white/80 disabled:opacity-50 disabled:cursor-not-allowed 
            transition-colors"
        >
          Previous
        </button>

        <div className="flex items-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === activeStep
                  ? 'bg-blue-400'
                  : index < activeStep
                  ? 'bg-emerald-400'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {activeStep < steps.length - 1 ? (
          <button
            onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-lg text-blue-200 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || validationErrors.length > 0}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
              border-emerald-400/50 rounded-lg text-emerald-200 font-medium 
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Bid</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Submission Timeline */}
      {submission.timeline.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Submission Timeline</h3>
          
          <div className="space-y-3">
            {submission.timeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/90">{event.event}</p>
                  <p className="text-white/60 text-sm">{event.description}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Step Components (simplified for brevity)

function VendorInfoStep({ data, errors, onChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Vendor Information</h3>
      
      {errors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
          {errors.map((error: Error | unknown, index: number) => (
            <p key={index} className="text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {error.message}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-white/80 text-sm mb-2 block">Business Number</label>
          <input
            type="text"
            value={data.businessNumber}
            onChange={(e) => onChange({ ...data, businessNumber: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white placeholder-white/50 focus:outline-none focus:ring-2 
              focus:ring-blue-400"
            placeholder="123456789RC0001"
          />
        </div>

        <div>
          <label className="text-white/80 text-sm mb-2 block">Legal Name</label>
          <input
            type="text"
            value={data.legalName}
            onChange={(e) => onChange({ ...data, legalName: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white placeholder-white/50 focus:outline-none focus:ring-2 
              focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Additional fields... */}
    </div>
  )
}

function TechnicalProposalStep({ document, errors, onChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Technical Proposal</h3>
      
      <div className="p-8 bg-white/5 border-2 border-dashed border-white/20 
        rounded-xl text-center">
        <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/80 mb-2">Upload your technical proposal</p>
        <p className="text-white/60 text-sm mb-4">PDF, DOCX up to 50MB</p>
        <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
          border border-blue-400/50 rounded-lg text-blue-200 transition-colors">
          Choose File
        </button>
      </div>
    </div>
  )
}

function FinancialProposalStep({ document, errors, onChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Financial Proposal</h3>
      
      <div className="p-8 bg-white/5 border-2 border-dashed border-white/20 
        rounded-xl text-center">
        <DollarSign className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/80 mb-2">Upload your financial proposal</p>
        <p className="text-white/60 text-sm mb-4">Sealed bid format required</p>
        <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
          border border-blue-400/50 rounded-lg text-blue-200 transition-colors">
          Choose File
        </button>
      </div>
    </div>
  )
}

function SupportingDocumentsStep({ documents, certifications, errors, onDocumentsChange, onCertificationsChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Supporting Documents</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-white/80 font-medium mb-2">Required Certifications</h4>
          <div className="space-y-2">
            {['Indigenous Business', 'Insurance', 'Security Clearance'].map((cert) => (
              <label key={cert} className="flex items-center space-x-3 p-3 bg-white/5 
                rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-white/80">{cert}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewSubmitStep({ submission, validationErrors, onSubmit, onPreview, isSubmitting }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Review & Submit</h3>
      
      {validationErrors.length > 0 ? (
        <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-red-300 font-medium mb-2">
            <AlertTriangle className="w-5 h-5 inline mr-1" />
            Please fix the following errors:
          </p>
          <ul className="space-y-1">
            {validationErrors.map((error: Error | unknown, index: number) => (
              <li key={index} className="text-red-300 text-sm">• {error.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
          <p className="text-emerald-300">
            <CheckCircle className="w-5 h-5 inline mr-1" />
            All requirements met. Your bid is ready for submission.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white/60">Target System</span>
          <span className="text-white font-medium">{submission.targetSystem}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white/60">RFQ Reference</span>
          <span className="text-white font-medium">{submission.rfqId}</span>
        </div>
      </div>
    </div>
  )
}