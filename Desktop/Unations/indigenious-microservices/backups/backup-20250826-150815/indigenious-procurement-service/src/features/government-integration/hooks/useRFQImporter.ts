// RFQ Importer Hook
// Import and manage RFQs from government systems

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { GovernmentSystem, GovernmentRFQ } from '../types/integration.types'

export function useRFQImporter() {
  const [availableRFQs, setAvailableRFQs] = useState<GovernmentRFQ[]>([])
  const [importedRFQs, setImportedRFQs] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available RFQs on mount
  useEffect(() => {
    loadAvailableRFQs()
  }, [])

  const loadAvailableRFQs = async () => {
    setIsLoading(true)
    try {
      // In production, this would fetch from integrated systems
      const mockRFQs: GovernmentRFQ[] = [
        {
          id: 'gets-2024-001',
          sourceSystem: 'GETS',
          sourceId: 'PW-24-00001234',
          referenceNumber: 'PW-$MTL-001-12345',
          title: 'Indigenous IT Support Services - Montreal Region',
          description: 'Seeking qualified Indigenous-owned IT firms to provide comprehensive support services for federal departments in the Montreal region. This is a set-aside opportunity under PSIB.',
          issuingOrganization: {
            name: 'Public Services and Procurement Canada',
            department: 'PSPC',
            branch: 'IT Procurement',
            contactName: 'Sarah Johnson',
            contactEmail: 'sarah.johnson@tpsgc-pwgsc.gc.ca',
            contactPhone: '1-800-123-4567'
          },
          procurement: {
            method: 'open_bidding',
            type: 'services',
            estimatedValue: {
              min: 500000,
              max: 2000000,
              currency: 'CAD'
            },
            setAside: 'indigenous_business',
            securityClearance: 'reliability'
          },
          categories: {
            unspsc: ['81111500', '81111800'],
            gsin: ['N7260', 'N7030'],
            naics: ['541512', '541513'],
            keywords: ['IT support', 'help desk', 'network administration', 'Indigenous']
          },
          dates: {
            published: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            questionsDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            contractStartDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            contractEndDate: new Date(Date.now() + 425 * 24 * 60 * 60 * 1000).toISOString()
          },
          documents: [
            {
              id: 'doc-1',
              name: 'RFQ_Document.pdf',
              type: 'rfq_document',
              url: 'https://buyandsell.gc.ca/cds/public/2024/01/01/abc123/rfq.pdf',
              size: 2456789,
              language: 'bilingual',
              uploadedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              isMandatory: true
            },
            {
              id: 'doc-2',
              name: 'Statement_of_Work.pdf',
              type: 'statement_of_work',
              url: 'https://buyandsell.gc.ca/cds/public/2024/01/01/abc123/sow.pdf',
              size: 1234567,
              language: 'bilingual',
              uploadedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              isMandatory: true
            }
          ],
          amendments: [],
          requirements: {
            certifications: ['Indigenous Business Certification', 'ISO 9001'],
            insurance: [
              {
                type: 'General Liability',
                amount: 2000000,
                currency: 'CAD',
                validityPeriod: 'Contract duration'
              }
            ]
          },
          evaluation: {
            criteria: [
              {
                name: 'Technical Capability',
                description: 'Demonstrated experience in IT support',
                weight: 40,
                scoringMethod: 'Point-rated',
                subcriteria: []
              },
              {
                name: 'Indigenous Participation',
                description: 'Level of Indigenous employment and subcontracting',
                weight: 30,
                scoringMethod: 'Point-rated',
                subcriteria: []
              },
              {
                name: 'Price',
                description: 'Total cost for services',
                weight: 30,
                scoringMethod: 'Lowest compliant',
                subcriteria: []
              }
            ],
            scoringMethod: 'highest_score'
          },
          metadata: {
            importedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            syncVersion: 1
          }
        },
        {
          id: 'sap-2024-002',
          sourceSystem: 'SAP_ARIBA',
          sourceId: 'DOC123456789',
          referenceNumber: 'ISC-2024-CONST-001',
          title: 'Construction of Community Health Centre - Saskatchewan',
          description: 'Construction services for a new 5,000 sq ft health centre in Northern Saskatchewan. Preference given to Indigenous-owned construction firms.',
          issuingOrganization: {
            name: 'Indigenous Services Canada',
            department: 'ISC',
            branch: 'Infrastructure',
            contactName: 'Michael Thompson',
            contactEmail: 'michael.thompson@sac-isc.gc.ca'
          },
          procurement: {
            method: 'selective_tendering',
            type: 'construction',
            estimatedValue: {
              min: 3000000,
              max: 5000000,
              currency: 'CAD'
            },
            setAside: 'comprehensive_land_claim'
          },
          categories: {
            unspsc: ['72100000', '72101500'],
            naics: ['236220'],
            keywords: ['construction', 'health facility', 'Indigenous', 'Saskatchewan']
          },
          dates: {
            published: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            siteVisitDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          documents: [
            {
              id: 'doc-3',
              name: 'Construction_Plans.pdf',
              type: 'technical_requirements',
              url: 'https://sap.ariba.com/doc/123456',
              size: 15678901,
              language: 'en',
              uploadedDate: new Date().toISOString(),
              isMandatory: true
            }
          ],
          amendments: [],
          requirements: {
            mandatoryMeetings: [
              {
                type: 'site_visit',
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                time: '10:00 AM CST',
                location: 'Project Site, Northern Saskatchewan',
                isMandatory: true,
                registrationRequired: true,
                registrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            bonds: [
              {
                type: 'bid',
                percentage: 10,
                currency: 'CAD',
                validityPeriod: '90 days'
              },
              {
                type: 'performance',
                percentage: 50,
                currency: 'CAD',
                validityPeriod: 'Contract duration + 1 year'
              }
            ]
          },
          evaluation: {
            criteria: [],
            scoringMethod: 'lowest_price'
          },
          metadata: {
            importedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            syncVersion: 1
          }
        },
        {
          id: 'merx-2024-003',
          sourceSystem: 'MERX',
          sourceId: 'MERX-2024-45678',
          referenceNumber: 'EC-ENV-2024-001',
          title: 'Environmental Monitoring Services - Atlantic Canada',
          description: 'Environmental consulting and monitoring services for federal projects in Atlantic Canada. Indigenous knowledge and traditional ecological knowledge required.',
          issuingOrganization: {
            name: 'Environment and Climate Change Canada',
            department: 'ECCC',
            branch: 'Environmental Assessment',
            contactName: 'Lisa Chen',
            contactEmail: 'lisa.chen@ec.gc.ca'
          },
          procurement: {
            method: 'open_bidding',
            type: 'services',
            estimatedValue: {
              min: 250000,
              max: 750000,
              currency: 'CAD'
            },
            setAside: 'indigenous_business'
          },
          categories: {
            unspsc: ['77101500', '77101700'],
            gsin: ['R199D'],
            keywords: ['environmental', 'monitoring', 'Indigenous knowledge', 'Atlantic']
          },
          dates: {
            published: new Date().toISOString(),
            closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          documents: [],
          amendments: [],
          requirements: {},
          evaluation: {
            criteria: [],
            scoringMethod: 'value_for_money'
          },
          metadata: {
            importedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            syncVersion: 1
          }
        }
      ]

      setAvailableRFQs(mockRFQs)
    } catch (err) {
      setError('Failed to load RFQs')
      logger.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshRFQs = useCallback(async () => {
    await loadAvailableRFQs()
  }, [])

  const importRFQs = useCallback(async (rfqs: GovernmentRFQ[]) => {
    setIsLoading(true)
    try {
      // In production, this would save to database
      const rfqIds = rfqs.map(rfq => rfq.id)
      setImportedRFQs(prev => new Set([...prev, ...rfqIds]))
      
      // Remove imported RFQs from available list
      setAvailableRFQs(prev => prev.filter(rfq => !rfqIds.includes(rfq.id)))
      
      return true
    } catch (err) {
      setError('Failed to import RFQs')
      logger.error(err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSystemRFQs = useCallback((system: GovernmentSystem) => {
    return availableRFQs.filter(rfq => rfq.sourceSystem === system)
  }, [availableRFQs])

  const searchRFQs = useCallback((query: string) => {
    const searchLower = query.toLowerCase()
    return availableRFQs.filter(rfq => 
      rfq.title.toLowerCase().includes(searchLower) ||
      rfq.description.toLowerCase().includes(searchLower) ||
      rfq.referenceNumber.toLowerCase().includes(searchLower) ||
      rfq.categories.keywords.some(k => k.toLowerCase().includes(searchLower))
    )
  }, [availableRFQs])

  const getIndigenousSetAsides = useCallback(() => {
    return availableRFQs.filter(rfq => 
      rfq.procurement.setAside === 'indigenous_business' ||
      rfq.procurement.setAside === 'comprehensive_land_claim'
    )
  }, [availableRFQs])

  return {
    availableRFQs,
    importedRFQs,
    isLoading,
    error,
    refreshRFQs,
    importRFQs,
    getSystemRFQs,
    searchRFQs,
    getIndigenousSetAsides
  }
}