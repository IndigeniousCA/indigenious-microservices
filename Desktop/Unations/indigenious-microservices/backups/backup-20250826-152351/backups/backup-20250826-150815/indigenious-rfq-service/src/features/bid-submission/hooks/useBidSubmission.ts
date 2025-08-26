// Hook for managing bid submission process
// Handles form validation, draft saving, and submission

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '@/core/providers/data-provider'
import type { Bid, BidFormData, BidStatus } from '../types/bid.types'

export function useBidSubmission(rfqId: string) {
  const [bid, setBid] = useState<Bid | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const provider = useDataProvider()

  // Load existing bid (if any)
  useEffect(() => {
    loadExistingBid()
  }, [rfqId])

  const loadExistingBid = async () => {
    try {
      // Check if user has an existing bid for this RFQ
      // In real implementation, would query the database
      const existingBid = localStorage.getItem(`bid-${rfqId}`)
      if (existingBid) {
        setBid(JSON.parse(existingBid))
      }
    } catch (err) {
      logger.error('Error loading bid:', err)
    }
  }

  // Save draft
  const saveDraft = async (formData: Partial<BidFormData>) => {
    try {
      setLoading(true)
      
      const draftBid: Partial<Bid> = {
        id: bid?.id || generateId(),
        rfqId,
        status: 'draft',
        isDraft: true,
        lastSavedAt: new Date().toISOString(),
        version: (bid?.version || 0) + 1,
        ...transformFormDataToBid(formData)
      }

      // Save to localStorage for now
      localStorage.setItem(`bid-${rfqId}`, JSON.stringify(draftBid))
      setBid(draftBid as Bid)

      return draftBid
    } catch (err) {
      setError('Failed to save draft')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Submit bid
  const submitBid = async (formData: BidFormData): Promise<Bid> => {
    try {
      setLoading(true)
      setError(null)

      // Validate all sections
      const allErrors = await validateAllSections(formData)
      if (allErrors.length > 0) {
        throw new Error('Please complete all required fields')
      }

      const submittedBid: Bid = {
        id: bid?.id || generateId(),
        rfqId,
        rfqTitle: 'RFQ Title', // Would come from RFQ details
        bidderId: 'current-user-id',
        bidderName: 'Your Company',
        bidderOrganization: 'Your Organization',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        isDraft: false,
        lastSavedAt: new Date().toISOString(),
        version: (bid?.version || 0) + 1,
        ...transformFormDataToBid(formData),
        attachments: [] // Would handle file uploads
      }

      // In real implementation, would submit to backend
      localStorage.setItem(`bid-${rfqId}`, JSON.stringify(submittedBid))
      localStorage.setItem(`bid-submitted-${rfqId}`, 'true')
      
      setBid(submittedBid)
      return submittedBid
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Validate section
  const validateSection = async (section: string, data: unknown): Promise<string[]> => {
    const errors: string[] = []

    switch (section) {
      case 'summary':
        if (!data.executiveSummary?.understanding?.trim()) {
          errors.push('Understanding of requirements is required')
        }
        if (!data.executiveSummary?.keyBenefits?.length) {
          errors.push('At least one key benefit is required')
        }
        if (!data.executiveSummary?.uniqueValue?.trim()) {
          errors.push('Unique value proposition is required')
        }
        break

      case 'pricing':
        if (!data.pricing?.breakdown?.length) {
          errors.push('Price breakdown is required')
        }
        if (!data.pricing?.totalAmount || data.pricing.totalAmount <= 0) {
          errors.push('Valid total amount is required')
        }
        if (!data.pricing?.paymentTerms) {
          errors.push('Payment terms are required')
        }
        break

      case 'technical':
        if (!data.technical?.methodology?.trim()) {
          errors.push('Technical methodology is required')
        }
        if (!data.technical?.timeline?.milestones?.length) {
          errors.push('Project timeline with milestones is required')
        }
        break

      case 'team':
        if (!data.resources?.teamLead) {
          errors.push('Team lead information is required')
        }
        if (!data.resources?.keyPersonnel?.length) {
          errors.push('At least one key team member is required')
        }
        break

      case 'indigenous':
        if (data.indigenousContent?.totalPercentage < data.minimumRequired) {
          errors.push(`Indigenous content must be at least ${data.minimumRequired}%`)
        }
        break

      case 'compliance':
        const unaddressed = Object.entries(data.compliance?.mandatoryChecks || {})
          .filter(([_, checked]) => !checked)
        if (unaddressed.length > 0) {
          errors.push('All mandatory requirements must be addressed')
        }
        break
    }

    return errors
  }

  // Validate all sections
  const validateAllSections = async (formData: BidFormData): Promise<string[]> => {
    const allErrors: string[] = []
    const sections = ['summary', 'pricing', 'technical', 'team', 'compliance']
    
    for (const section of sections) {
      const errors = await validateSection(section, formData)
      allErrors.push(...errors)
    }

    return allErrors
  }

  // Calculate Indigenous content
  const calculateIndigenousContent = (data: unknown) => {
    const ownership = data.indigenousContent?.ownershipPercentage || 0
    const employment = data.indigenousContent?.employmentPercentage || 0
    const subcontracting = data.indigenousContent?.subcontractingPercentage || 0
    const procurement = data.indigenousContent?.procurementPercentage || 0

    return {
      total: ownership + employment + subcontracting + procurement,
      breakdown: {
        ownership,
        employment,
        subcontracting,
        procurement
      }
    }
  }

  // Withdraw bid
  const withdrawBid = async (reason?: string) => {
    if (!bid || bid.status !== 'submitted') {
      throw new Error('Can only withdraw submitted bids')
    }

    try {
      setLoading(true)
      
      const withdrawnBid: Bid = {
        ...bid,
        status: 'withdrawn',
        withdrawnAt: new Date().toISOString()
      }

      localStorage.setItem(`bid-${rfqId}`, JSON.stringify(withdrawnBid))
      setBid(withdrawnBid)

      return withdrawnBid
    } catch (err) {
      setError('Failed to withdraw bid')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    bid,
    loading,
    error,
    saveDraft,
    submitBid,
    validateSection,
    validateAllSections,
    calculateIndigenousContent,
    withdrawBid
  }
}

// Helper functions
function generateId(): string {
  return `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function transformFormDataToBid(formData: Partial<BidFormData>): Partial<Bid> {
  return {
    pricing: formData.pricing ? {
      totalAmount: formData.pricing.totalAmount || 0,
      currency: 'CAD',
      breakdown: formData.pricing.breakdown || [],
      paymentTerms: formData.pricing.paymentTerms || '',
      validUntil: new Date(Date.now() + (formData.pricing.validityPeriod || 30) * 24 * 60 * 60 * 1000).toISOString()
    } : undefined,
    
    technicalProposal: formData.technical ? {
      approach: formData.technical.methodology || '',
      timeline: formData.technical.timeline || { startDate: '', endDate: '', milestones: [] },
      team: formData.resources?.keyPersonnel || [],
      equipment: formData.resources?.equipment || [],
      subcontractors: []
    } : undefined,

    indigenousContent: formData.indigenousContent ? {
      percentage: formData.indigenousContent.totalPercentage || 0,
      breakdown: [
        {
          category: 'ownership',
          description: 'Indigenous ownership',
          percentage: formData.indigenousContent.ownershipPercentage || 0,
          value: 0
        },
        {
          category: 'employment',
          description: 'Indigenous employment',
          percentage: formData.indigenousContent.employmentPercentage || 0,
          value: 0
        },
        {
          category: 'subcontracting',
          description: 'Indigenous subcontracting',
          percentage: formData.indigenousContent.subcontractingPercentage || 0,
          value: 0
        },
        {
          category: 'procurement',
          description: 'Indigenous procurement',
          percentage: formData.indigenousContent.procurementPercentage || 0,
          value: 0
        }
      ]
    } : undefined,

    compliance: formData.compliance ? {
      mandatoryRequirements: Object.entries(formData.compliance.mandatoryChecks || {}).map(([req, checked]) => ({
        id: req,
        requirement: req,
        response: checked ? 'compliant' : 'non_compliant'
      })),
      certifications: formData.compliance.certifications || [],
      insurance: formData.compliance.insurance || []
    } : undefined
  }
}