// Hook for managing vendor performance data
// Handles fetching, filtering, and comparison logic

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '@/core/providers/data-provider'
import type { 
  VendorPerformance, 
  PerformanceComparison,
  CompletedProject,
  VendorReview,
  Certification,
  Award,
  RiskFactor
} from '../types/performance.types'

interface UseVendorPerformanceOptions {
  timeRange?: 'all' | '12m' | '6m' | '3m'
  compareTo?: string[]
}

export function useVendorPerformance(
  vendorId: string, 
  options: UseVendorPerformanceOptions = {}
) {
  const [performance, setPerformance] = useState<VendorPerformance | null>(null)
  const [comparison, setComparison] = useState<PerformanceComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const provider = useDataProvider()

  const { timeRange = 'all', compareTo = [] } = options

  // Load vendor performance data
  useEffect(() => {
    loadPerformanceData()
  }, [vendorId, timeRange])

  // Load comparison data if needed
  useEffect(() => {
    if (compareTo.length > 0 && performance) {
      loadComparisonData()
    }
  }, [compareTo, performance])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock performance data
      const mockPerformance: VendorPerformance = {
        vendorId,
        vendorName: 'Eagle Construction Inc.',
        vendorType: 'indigenous_sme',
        communityAffiliation: {
          nation: 'Cree Nation',
          territory: 'Treaty 6',
          bandNumber: 'CN-123'
        },
        
        overallRating: 4.3,
        totalReviews: 27,
        totalProjects: 45,
        totalContractValue: 12500000,
        
        metrics: {
          onTimeDelivery: {
            score: 4.2,
            trend: 'up',
            percentile: 78,
            dataPoints: 45
          },
          qualityOfWork: {
            score: 4.5,
            trend: 'stable',
            percentile: 85,
            dataPoints: 45
          },
          communication: {
            score: 4.1,
            trend: 'up',
            percentile: 72,
            dataPoints: 27
          },
          budgetAdherence: {
            score: 3.8,
            trend: 'down',
            percentile: 65,
            dataPoints: 45
          },
          safetyCompliance: {
            score: 4.7,
            trend: 'stable',
            percentile: 92,
            dataPoints: 38
          },
          indigenousEmployment: {
            score: 4.4,
            trend: 'up',
            percentile: 88,
            dataPoints: 45
          }
        },
        
        projects: generateMockProjects(timeRange),
        reviews: generateMockReviews(),
        certifications: generateMockCertifications(),
        awards: generateMockAwards(),
        
        riskProfile: {
          level: 'medium',
          factors: [
            {
              type: 'budget_overruns',
              severity: 'medium',
              description: '18% of projects exceeded budget by more than 10%',
              mitigationStatus: 'pending'
            },
            {
              type: 'late_deliveries',
              severity: 'low',
              description: '8% of projects delivered late in the past 12 months',
              mitigationStatus: 'addressed'
            }
          ]
        },
        
        performanceTrend: 'improving',
        lastUpdated: new Date().toISOString()
      }

      setPerformance(mockPerformance)
    } catch (err) {
      setError('Failed to load performance data')
      logger.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadComparisonData = async () => {
    try {
      // Mock comparison data
      const mockComparison: PerformanceComparison = {
        vendorId,
        industryAverage: {
          onTimeDelivery: 3.8,
          qualityScore: 3.9,
          budgetAdherence: 3.7,
          clientSatisfaction: 3.8,
          indigenousEmployment: 3.2
        },
        topPerformers: {
          onTimeDelivery: 4.7,
          qualityScore: 4.8,
          budgetAdherence: 4.6,
          clientSatisfaction: 4.7,
          indigenousEmployment: 4.5
        },
        vendorMetrics: {
          onTimeDelivery: performance?.metrics.onTimeDelivery.score || 0,
          qualityScore: performance?.metrics.qualityOfWork.score || 0,
          budgetAdherence: performance?.metrics.budgetAdherence.score || 0,
          clientSatisfaction: performance?.overallRating || 0,
          indigenousEmployment: performance?.metrics.indigenousEmployment.score || 0
        },
        rank: {
          overall: 127,
          totalVendors: 892,
          percentile: 86
        }
      }

      setComparison(mockComparison)
    } catch (err) {
      logger.error('Failed to load comparison data:', err)
    }
  }

  // Generate mock projects
  function generateMockProjects(range: string): CompletedProject[] {
    const projects: CompletedProject[] = [
      {
        id: 'proj-1',
        projectName: 'Community Center Renovation',
        projectType: 'construction',
        clientName: 'Saskatchewan Indigenous Development',
        clientType: 'government',
        contractValue: 2500000,
        startDate: '2023-03-01',
        completionDate: '2023-11-15',
        performance: {
          onTimeDelivery: true,
          withinBudget: true,
          qualityScore: 4.8,
          clientSatisfaction: 4.7
        },
        indigenousContent: {
          percentage: 75,
          employmentHours: 12000,
          subcontractingValue: 450000
        },
        issues: [],
        achievements: ['Completed 2 weeks early', '15% under budget', '100% safety record'],
        testimonial: 'Excellent work and great community engagement throughout the project.'
      },
      {
        id: 'proj-2',
        projectName: 'Water Treatment Plant Upgrade',
        projectType: 'construction',
        clientName: 'Onion Lake Cree Nation',
        clientType: 'band_council',
        contractValue: 3800000,
        startDate: '2023-01-15',
        completionDate: '2023-09-30',
        performance: {
          onTimeDelivery: false,
          withinBudget: false,
          qualityScore: 4.2,
          clientSatisfaction: 3.9
        },
        indigenousContent: {
          percentage: 82,
          employmentHours: 18000,
          subcontractingValue: 680000
        },
        issues: [
          {
            type: 'delay',
            description: 'Material shortages due to supply chain issues',
            severity: 'moderate',
            resolved: true,
            resolutionDate: '2023-08-15',
            impactOnProject: '3-week delay'
          }
        ],
        achievements: ['Exceeded Indigenous employment targets', 'Zero safety incidents']
      },
      {
        id: 'proj-3',
        projectName: 'Highway 16 Bridge Repair',
        projectType: 'construction',
        clientName: 'Alberta Transportation',
        clientType: 'government',
        contractValue: 1200000,
        startDate: '2023-05-01',
        completionDate: '2023-08-15',
        performance: {
          onTimeDelivery: true,
          withinBudget: true,
          qualityScore: 4.5,
          clientSatisfaction: 4.6
        },
        indigenousContent: {
          percentage: 68,
          employmentHours: 5500,
          subcontractingValue: 180000
        },
        issues: [],
        achievements: ['Minimal traffic disruption', 'Excellent safety record'],
        photos: ['bridge-1.jpg', 'bridge-2.jpg', 'bridge-3.jpg']
      }
    ]

    // Filter by time range
    if (range !== 'all') {
      const monthsAgo = parseInt(range)
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo)
      return projects.filter(p => new Date(p.completionDate) >= cutoffDate)
    }

    return projects
  }

  // Generate mock reviews
  function generateMockReviews(): VendorReview[] {
    return [
      {
        id: 'review-1',
        projectId: 'proj-1',
        projectName: 'Community Center Renovation',
        reviewerId: 'reviewer-1',
        reviewerName: 'Sarah Johnson',
        reviewerOrganization: 'Saskatchewan Indigenous Development',
        reviewerRole: 'Project Manager',
        reviewDate: '2023-12-01',
        ratings: {
          overall: 4.7,
          onTimeDelivery: 5.0,
          qualityOfWork: 4.8,
          communication: 4.5,
          valueForMoney: 4.6,
          wouldRecommend: true
        },
        headline: 'Outstanding work and community engagement',
        positives: 'The team went above and beyond to ensure community input was incorporated throughout the project. Excellent quality of work and ahead of schedule.',
        improvements: 'Minor communication delays during the initial phase, but quickly resolved.',
        detailedReview: 'Eagle Construction delivered an exceptional renovation of our community center. Their commitment to Indigenous employment and local subcontracting was evident throughout the project. The quality of work exceeded our expectations, and they completed the project two weeks early.',
        verified: true,
        verificationMethod: 'contract',
        helpfulCount: 23,
        notHelpfulCount: 2
      },
      {
        id: 'review-2',
        projectId: 'proj-2',
        projectName: 'Water Treatment Plant Upgrade',
        reviewerId: 'reviewer-2',
        reviewerName: 'Chief Robert Cardinal',
        reviewerOrganization: 'Onion Lake Cree Nation',
        reviewerRole: 'Band Chief',
        reviewDate: '2023-10-15',
        ratings: {
          overall: 3.9,
          onTimeDelivery: 3.0,
          qualityOfWork: 4.2,
          communication: 4.0,
          valueForMoney: 3.8,
          wouldRecommend: true
        },
        headline: 'Good quality despite delays',
        positives: 'High quality work and excellent Indigenous employment rates. The team was responsive to our community needs.',
        improvements: 'Project delays due to supply chain issues could have been better managed with more proactive communication.',
        detailedReview: 'Despite facing significant supply chain challenges, Eagle Construction delivered a quality water treatment plant upgrade. They maintained strong Indigenous employment throughout and worked closely with our community.',
        verified: true,
        verificationMethod: 'site_visit',
        vendorResponse: {
          date: '2023-10-20',
          message: 'Thank you for your feedback. We acknowledge the communication gaps during the supply chain disruptions and have since implemented new protocols for proactive client updates. We appreciate your recognition of our commitment to Indigenous employment.'
        },
        helpfulCount: 18,
        notHelpfulCount: 3
      }
    ]
  }

  // Generate mock certifications
  function generateMockCertifications(): Certification[] {
    return [
      {
        id: 'cert-1',
        name: 'Certified Aboriginal Business',
        issuingBody: 'Canadian Council for Aboriginal Business',
        issueDate: '2020-06-15',
        expiryDate: '2025-06-15',
        status: 'active',
        category: 'indigenous_business',
        verified: true
      },
      {
        id: 'cert-2',
        name: 'ISO 9001:2015',
        issuingBody: 'International Organization for Standardization',
        issueDate: '2022-03-01',
        expiryDate: '2025-03-01',
        status: 'active',
        category: 'quality',
        verified: true
      },
      {
        id: 'cert-3',
        name: 'COR Safety Certification',
        issuingBody: 'Alberta Construction Safety Association',
        issueDate: '2021-09-15',
        expiryDate: '2024-09-15',
        status: 'active',
        category: 'safety',
        verified: true
      },
      {
        id: 'cert-4',
        name: 'ISO 14001:2015',
        issuingBody: 'International Organization for Standardization',
        issueDate: '2022-11-01',
        status: 'active',
        category: 'environmental',
        verified: true
      }
    ]
  }

  // Generate mock awards
  function generateMockAwards(): Award[] {
    return [
      {
        id: 'award-1',
        name: 'Indigenous Business of the Year',
        issuingOrganization: 'Canadian Council for Aboriginal Business',
        year: 2023,
        category: 'Business Excellence',
        description: 'Recognized for outstanding growth, community impact, and commitment to Indigenous employment',
        significance: 'national'
      },
      {
        id: 'award-2',
        name: 'Excellence in Construction Safety',
        issuingOrganization: 'Saskatchewan Construction Association',
        year: 2023,
        category: 'Safety',
        description: 'Zero incidents across 12 major projects over 24 months',
        significance: 'regional'
      },
      {
        id: 'award-3',
        name: 'Community Partnership Award',
        issuingOrganization: 'Treaty 6 Development Corporation',
        year: 2022,
        category: 'Community Engagement',
        description: 'Exceptional collaboration with local First Nations communities',
        significance: 'regional'
      }
    ]
  }

  // Refresh data
  const refreshData = () => {
    loadPerformanceData()
    if (compareTo.length > 0) {
      loadComparisonData()
    }
  }

  return {
    performance,
    comparison,
    loading,
    error,
    refreshData
  }
}