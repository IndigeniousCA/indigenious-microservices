// Bid Submission Hook
// Manage bid submissions to government systems

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { 
  GovernmentSystem, 
  GovernmentBidSubmission, 
  BidSubmissionStatus,
  SubmissionError,
  VendorSubmissionInfo 
} from '../types/integration.types'

export function useBidSubmission(
  bidId: string,
  rfqId: string,
  targetSystem: GovernmentSystem
) {
  const [submission, setSubmission] = useState<GovernmentBidSubmission>({
    id: bidId,
    rfqId,
    targetSystem,
    submissionData: {
      vendorInfo: {
        businessNumber: '',
        legalName: '',
        contactPerson: {
          name: '',
          title: '',
          email: '',
          phone: ''
        },
        address: {
          street: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'Canada'
        }
      },
      technicalProposal: null as unknown,
      financialProposal: null as unknown,
      supportingDocuments: [],
      certifications: []
    },
    status: 'draft',
    errors: [],
    timeline: [{
      timestamp: new Date().toISOString(),
      event: 'Draft Created',
      description: 'Bid submission draft initialized'
    }]
  })

  const [validationErrors, setValidationErrors] = useState<SubmissionError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load saved draft if exists
  useEffect(() => {
    loadDraft()
  }, [bidId])

  const loadDraft = async () => {
    try {
      // In production, load from API/database
      const savedDraft = localStorage.getItem(`bid_draft_${bidId}`)
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        setSubmission(draft)
      }
    } catch (err) {
      logger.error('Failed to load draft:', err)
    }
  }

  // Save draft automatically
  useEffect(() => {
    const saveDraft = () => {
      try {
        localStorage.setItem(`bid_draft_${bidId}`, JSON.stringify(submission))
      } catch (err) {
        logger.error('Failed to save draft:', err)
      }
    }

    const debounceTimer = setTimeout(saveDraft, 1000)
    return () => clearTimeout(debounceTimer)
  }, [submission, bidId])

  // Update submission data
  const updateSubmissionData = useCallback((field: string, value: unknown) => {
    setSubmission(prev => ({
      ...prev,
      submissionData: {
        ...prev.submissionData,
        [field]: value
      },
      timeline: [
        ...prev.timeline,
        {
          timestamp: new Date().toISOString(),
          event: `Updated ${field}`,
          description: `Modified ${field} information`
        }
      ]
    }))
  }, [])

  // Validate submission
  const validateSubmission = useCallback(async (): Promise<boolean> => {
    const errors: SubmissionError[] = []

    // Validate vendor info
    const { vendorInfo } = submission.submissionData
    if (!vendorInfo.businessNumber) {
      errors.push({
        field: 'vendor.businessNumber',
        message: 'Business number is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      })
    }
    if (!vendorInfo.legalName) {
      errors.push({
        field: 'vendor.legalName',
        message: 'Legal name is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      })
    }
    if (!vendorInfo.contactPerson.email) {
      errors.push({
        field: 'vendor.contactEmail',
        message: 'Contact email is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      })
    }

    // Validate documents
    if (!submission.submissionData.technicalProposal) {
      errors.push({
        field: 'technical',
        message: 'Technical proposal is required',
        code: 'REQUIRED_DOCUMENT',
        severity: 'error'
      })
    }
    if (!submission.submissionData.financialProposal) {
      errors.push({
        field: 'financial',
        message: 'Financial proposal is required',
        code: 'REQUIRED_DOCUMENT',
        severity: 'error'
      })
    }

    // System-specific validation
    if (targetSystem === 'GETS' || targetSystem === 'SAP_ARIBA') {
      if (!vendorInfo.supplierNumber) {
        errors.push({
          field: 'vendor.supplierNumber',
          message: `Supplier number required for ${targetSystem}`,
          code: 'SYSTEM_REQUIREMENT',
          severity: 'warning'
        })
      }
    }

    if (targetSystem === 'PSIB' && !vendorInfo.psibNumber) {
      errors.push({
        field: 'vendor.psibNumber',
        message: 'PSIB registration number required',
        code: 'SYSTEM_REQUIREMENT',
        severity: 'error'
      })
    }

    setValidationErrors(errors)
    setSubmission(prev => ({ ...prev, errors }))

    return errors.filter(e => e.severity === 'error').length === 0
  }, [submission, targetSystem])

  // Submit bid
  const submitBid = useCallback(async (): Promise<GovernmentBidSubmission | null> => {
    setIsSubmitting(true)
    
    try {
      // Update status
      setSubmission(prev => ({
        ...prev,
        status: 'validating',
        timeline: [
          ...prev.timeline,
          {
            timestamp: new Date().toISOString(),
            event: 'Submission Started',
            description: 'Beginning bid submission process'
          }
        ]
      }))

      // Validate
      const isValid = await validateSubmission()
      if (!isValid) {
        setSubmission(prev => ({ ...prev, status: 'draft' }))
        setIsSubmitting(false)
        return null
      }

      // Update to submitting
      setSubmission(prev => ({
        ...prev,
        status: 'submitting',
        timeline: [
          ...prev.timeline,
          {
            timestamp: new Date().toISOString(),
            event: 'Validation Passed',
            description: 'All requirements validated successfully'
          }
        ]
      }))

      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Success
      const submittedBid: GovernmentBidSubmission = {
        ...submission,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        confirmationNumber: `${targetSystem}-${Date.now()}`,
        timeline: [
          ...submission.timeline,
          {
            timestamp: new Date().toISOString(),
            event: 'Submission Complete',
            description: `Successfully submitted to ${targetSystem}`,
            systemResponse: {
              confirmationNumber: `${targetSystem}-${Date.now()}`,
              receiptUrl: `https://${targetSystem.toLowerCase()}.gc.ca/receipt/12345`
            }
          }
        ]
      }

      setSubmission(submittedBid)
      
      // Clear draft
      localStorage.removeItem(`bid_draft_${bidId}`)
      
      return submittedBid
    } catch (err) {
      // Handle error
      setSubmission(prev => ({
        ...prev,
        status: 'draft',
        errors: [
          ...prev.errors,
          {
            field: 'submission',
            message: 'Failed to submit bid. Please try again.',
            code: 'SUBMISSION_FAILED',
            severity: 'error'
          }
        ],
        timeline: [
          ...prev.timeline,
          {
            timestamp: new Date().toISOString(),
            event: 'Submission Failed',
            description: err instanceof Error ? err.message : 'Unknown error'
          }
        ]
      }))
      
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [submission, targetSystem, validateSubmission, bidId])

  // Withdraw bid
  const withdrawBid = useCallback(async (reason: string) => {
    try {
      setSubmission(prev => ({
        ...prev,
        status: 'withdrawn',
        timeline: [
          ...prev.timeline,
          {
            timestamp: new Date().toISOString(),
            event: 'Bid Withdrawn',
            description: reason
          }
        ]
      }))

      // In production, notify the government system
      return true
    } catch (err) {
      logger.error('Failed to withdraw bid:', err)
      return false
    }
  }, [])

  // Get submission progress
  const getProgress = useCallback(() => {
    const steps = ['vendorInfo', 'technicalProposal', 'financialProposal', 'supportingDocuments']
    const completed = steps.filter(step => {
      const value = submission.submissionData[step as keyof typeof submission.submissionData]
      if (Array.isArray(value)) return value.length > 0
      return !!value
    }).length

    return {
      completed,
      total: steps.length,
      percentage: Math.round((completed / steps.length) * 100)
    }
  }, [submission])

  return {
    submission,
    validationErrors,
    isSubmitting,
    updateSubmissionData,
    validateSubmission,
    submitBid,
    withdrawBid,
    getProgress
  }
}