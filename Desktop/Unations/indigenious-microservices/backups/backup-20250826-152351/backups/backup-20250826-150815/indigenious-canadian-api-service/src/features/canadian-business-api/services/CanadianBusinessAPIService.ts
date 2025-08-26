// Canadian Business Directory API Service
import { 
  CanadianBusiness, CanadianBusinessSearchParams, IndustryType,
  PartnershipMatchingParams, PartnershipMatch, IndustryMarketplace,
  MarketOpportunity, IndustrySpecificData
} from '../types'

export class CanadianBusinessAPIService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.indigenious.ca'

  // Search Canadian businesses with advanced filters
  async searchBusinesses(
    params: CanadianBusinessSearchParams,
    apiKey: string
  ): Promise<{
    businesses: CanadianBusiness[]
    total: number
    facets: SearchFacets
  }> {
    // Mock implementation
    const mockBusinesses = this.getMockBusinesses()
    
    let filtered = [...mockBusinesses]
    
    // Apply industry filter
    if (params.industries && params.industries.length > 0) {
      filtered = filtered.filter(b => 
        params.industries!.includes(b.industry.primary) ||
        params.industries!.some(ind => b.industry.secondary.includes(ind))
      )
    }
    
    // Apply Indigenous partnership filter
    if (params.indigenousPartnerships?.required) {
      filtered = filtered.filter(b => b.indigenousPartnerships.hasPartnerships)
      
      if (params.indigenousPartnerships.minPartnershipLevel) {
        filtered = filtered.filter(b => {
          const totalPartnershipValue = b.indigenousPartnerships.partners.length * 100
          return totalPartnershipValue >= params.indigenousPartnerships!.minPartnershipLevel!
        })
      }
    }
    
    // Apply location filter
    if (params.location?.province) {
      filtered = filtered.filter(b => 
        b.businessInfo.headquarters.province === params.location!.province ||
        b.businessInfo.locations.some(l => l.province === params.location!.province)
      )
    }
    
    // Apply capability filters
    if (params.capabilities?.minEmployees) {
      filtered = filtered.filter(b => 
        b.businessInfo.employeeCount >= params.capabilities!.minEmployees!
      )
    }
    
    // Sort results
    if (params.sort === 'indigenous_partnerships') {
      filtered.sort((a, b) => 
        b.indigenousPartnerships.partners.length - a.indigenousPartnerships.partners.length
      )
    }
    
    // Generate facets for filtering
    const facets = this.generateFacets(filtered)
    
    // Paginate
    const page = params.page || 1
    const limit = params.limit || 20
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)
    
    return {
      businesses: paginated,
      total: filtered.length,
      facets
    }
  }

  // AI-powered partnership matching
  async findPartnershipMatches(
    params: PartnershipMatchingParams,
    apiKey: string
  ): Promise<PartnershipMatch[]> {
    const allBusinesses = this.getMockBusinesses()
    const requestingBusiness = allBusinesses.find(b => b.id === params.businessId)
    
    if (!requestingBusiness) {
      throw new Error('Business not found')
    }
    
    // Score potential partners
    const matches = allBusinesses
      .filter(b => b.id !== params.businessId)
      .map(partner => {
        const match = this.calculatePartnershipScore(
          requestingBusiness,
          partner,
          params
        )
        return match
      })
      .filter(match => match.matchScore > 0.5)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
    
    return matches
  }

  // Get industry-specific marketplace data
  async getIndustryMarketplace(
    industry: IndustryType,
    apiKey: string
  ): Promise<IndustryMarketplace> {
    const businesses = this.getMockBusinesses().filter(b => 
      b.industry.primary === industry || b.industry.secondary.includes(industry)
    )
    
    const opportunities = this.generateMarketOpportunities(industry)
    
    return {
      id: `marketplace-${industry.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${industry} Marketplace`,
      description: `Connect with verified ${industry.toLowerCase()} businesses and Indigenous partners`,
      
      stats: {
        totalBusinesses: businesses.length,
        verifiedBusinesses: businesses.filter(b => b.apiAccess.verificationStatus.verified).length,
        indigenousPartnerships: businesses.filter(b => b.indigenousPartnerships.hasPartnerships).length,
        totalContractValue: businesses.reduce((sum, b) => sum + b.performance.totalContractValue, 0),
        activeOpportunities: opportunities.length
      },
      
      opportunities: {
        government: opportunities.filter(o => o.client.includes('Government')).length,
        indigenous: opportunities.filter(o => o.indigenousRequirement).length,
        private: opportunities.filter(o => !o.client.includes('Government')).length,
        upcoming: opportunities.slice(0, 5)
      },
      
      topBusinesses: {
        bySize: businesses
          .sort((a, b) => b.businessInfo.employeeCount - a.businessInfo.employeeCount)
          .slice(0, 5),
        byPartnerships: businesses
          .sort((a, b) => b.indigenousPartnerships.partners.length - a.indigenousPartnerships.partners.length)
          .slice(0, 5),
        byExperience: businesses
          .sort((a, b) => b.performance.completedProjects - a.performance.completedProjects)
          .slice(0, 5)
      },
      
      indigenousMetrics: {
        totalPartnerships: businesses.reduce((sum, b) => sum + b.indigenousPartnerships.partners.length, 0),
        employmentCreated: businesses.reduce((sum, b) => sum + b.indigenousPartnerships.indigenousEmployment.count, 0),
        revenueShared: businesses.reduce((sum, b) => sum + b.indigenousPartnerships.communityInvestment, 0),
        communitiesImpacted: 47 // Mock data
      }
    }
  }

  // Calculate partnership compatibility score
  private calculatePartnershipScore(
    seeker: CanadianBusiness,
    partner: CanadianBusiness,
    params: PartnershipMatchingParams
  ): PartnershipMatch {
    let score = 0
    const reasons: string[] = []
    
    // Indigenous partnership score (highest weight)
    if (params.seekingType === 'Indigenous Partner' && partner.indigenousPartnerships.hasPartnerships) {
      score += 0.4
      reasons.push('Strong Indigenous partnerships')
      
      // Bonus for high Indigenous employment
      if (partner.indigenousPartnerships.indigenousEmployment.percentage > 50) {
        score += 0.1
        reasons.push(`${partner.indigenousPartnerships.indigenousEmployment.percentage}% Indigenous workforce`)
      }
    }
    
    // Geographic compatibility
    if (partner.businessInfo.headquarters.province === params.location ||
        partner.businessInfo.locations.some(l => l.province === params.location)) {
      score += 0.2
      reasons.push('Local presence')
    }
    
    // Capability match
    const capabilityMatch = params.requiredCapabilities.filter(cap =>
      partner.capabilities.coreCompetencies.includes(cap)
    ).length
    
    if (capabilityMatch > 0) {
      score += (capabilityMatch / params.requiredCapabilities.length) * 0.3
      reasons.push(`Matches ${capabilityMatch}/${params.requiredCapabilities.length} required capabilities`)
    }
    
    // Experience in project type
    if (partner.capabilities.projectTypes.includes(params.projectType)) {
      score += 0.1
      reasons.push(`Experience in ${params.projectType}`)
    }
    
    // Complementary capabilities
    const complementary = partner.capabilities.coreCompetencies.filter(cap =>
      !seeker.capabilities.coreCompetencies.includes(cap)
    )
    
    return {
      partner,
      matchScore: Math.min(score, 1),
      matchReasons: reasons,
      complementaryCapabilities: complementary.slice(0, 5),
      pastCollaborations: Math.floor(Math.random() * 5), // Mock data
      successRate: 85 + Math.floor(Math.random() * 15) // Mock data
    }
  }

  // Generate search facets for filtering
  private generateFacets(businesses: CanadianBusiness[]): SearchFacets {
    const facets: SearchFacets = {
      industries: {},
      provinces: {},
      certifications: {},
      capabilities: {},
      partnershipTypes: {},
      sizeRanges: {
        'Small (1-50)': 0,
        'Medium (51-200)': 0,
        'Large (201-500)': 0,
        'Enterprise (500+)': 0
      }
    }
    
    businesses.forEach(b => {
      // Industry facets
      facets.industries[b.industry.primary] = (facets.industries[b.industry.primary] || 0) + 1
      
      // Province facets
      const province = b.businessInfo.headquarters.province
      facets.provinces[province] = (facets.provinces[province] || 0) + 1
      
      // Size facets
      if (b.businessInfo.employeeCount <= 50) facets.sizeRanges['Small (1-50)']++
      else if (b.businessInfo.employeeCount <= 200) facets.sizeRanges['Medium (51-200)']++
      else if (b.businessInfo.employeeCount <= 500) facets.sizeRanges['Large (201-500)']++
      else facets.sizeRanges['Enterprise (500+)']++
      
      // Certification facets
      Object.values(b.certifications).flat().forEach((cert: unknown) => {
        const certType = cert.type || cert.standard || cert.name
        if (certType) {
          facets.certifications[certType] = (facets.certifications[certType] || 0) + 1
        }
      })
    })
    
    return facets
  }

  // Generate market opportunities
  private generateMarketOpportunities(industry: IndustryType): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = []
    
    const templates = {
      'Mining': [
        { title: 'Northern Ontario Gold Mine Development', value: '$250M-500M', client: 'Mining Corp & First Nations JV' },
        { title: 'Critical Minerals Exploration Program', value: '$50M-100M', client: 'Government of Canada' },
        { title: 'Mine Site Remediation Project', value: '$75M-150M', client: 'Provincial Government' }
      ],
      'Oil & Gas': [
        { title: 'Indigenous Pipeline Partnership', value: '$1B+', client: 'Energy Corp & Indigenous Coalition' },
        { title: 'LNG Facility Construction', value: '$500M-1B', client: 'Coastal First Nations & Energy Partners' },
        { title: 'Renewable Energy Transition', value: '$200M-400M', client: 'Federal Government' }
      ],
      'Infrastructure': [
        { title: 'Remote Community Infrastructure', value: '$100M-200M', client: 'Indigenous Services Canada' },
        { title: 'Northern Road Development', value: '$300M-500M', client: 'Provincial & Indigenous Governments' },
        { title: 'Water Treatment Facilities', value: '$50M-100M', client: 'First Nations Communities' }
      ],
      'Engineering': [
        { title: 'Resource Project Engineering', value: '$10M-25M', client: 'Various Mining Companies' },
        { title: 'Indigenous Community Planning', value: '$5M-15M', client: 'Band Councils' },
        { title: 'Environmental Assessments', value: '$2M-5M', client: 'Government Agencies' }
      ]
    }
    
    const industryOpportunities = templates[industry] || []
    
    industryOpportunities.forEach(template => {
      opportunities.push({
        id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: template.title,
        client: template.client,
        value: template.value,
        deadline: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within 90 days
        indigenousRequirement: Math.random() > 0.5,
        requiredCapabilities: this.getIndustryCapabilities(industry).slice(0, 3 + Math.floor(Math.random() * 3))
      })
    })
    
    return opportunities
  }

  // Get industry-specific capabilities
  private getIndustryCapabilities(industry: IndustryType): string[] {
    const capabilities = {
      'Mining': ['Drilling', 'Blasting', 'Ore Processing', 'Environmental Management', 'Camp Services', 'Equipment Operation'],
      'Oil & Gas': ['Pipeline Construction', 'Facility Operations', 'Environmental Monitoring', 'Safety Management', 'Indigenous Relations'],
      'Infrastructure': ['Civil Engineering', 'Project Management', 'Heavy Construction', 'Bridge Building', 'Road Construction'],
      'Engineering': ['Design Services', 'Technical Studies', 'Project Planning', 'Environmental Assessment', 'Permit Management'],
      'Legal Services': ['Indigenous Law', 'Resource Law', 'Contract Negotiation', 'Regulatory Compliance', 'Dispute Resolution']
    }
    
    return capabilities[industry] || ['General Services']
  }

  // Mock data generator
  private getMockBusinesses(): CanadianBusiness[] {
    return [
      // Mining Company with Strong Indigenous Partnerships
      {
        id: 'can-biz-001',
        businessName: 'Northern Resources Group',
        legalName: 'Northern Resources Group Inc.',
        businessNumber: '123456789RC0001',
        description: 'Leading Canadian mining company with strong Indigenous partnerships',
        website: 'https://northernresources.ca',
        email: 'info@northernresources.ca',
        phone: '1-800-MINE-NORTH',
        
        industry: {
          primary: 'Mining',
          secondary: ['Environmental Services'],
          naicsCode: ['212220', '213111'],
          services: ['Gold Mining', 'Exploration', 'Mine Development'],
          specializations: ['Remote Operations', 'Indigenous Partnerships']
        },
        
        businessInfo: {
          established: new Date('1995-01-01'),
          employeeCount: 850,
          revenue: { min: 100000000, max: 500000000, currency: 'CAD', verified: true },
          headquarters: {
            street: '100 Mining Way',
            city: 'Thunder Bay',
            province: 'ON',
            postalCode: 'P7B 1A1',
            country: 'Canada'
          },
          locations: [
            { type: 'Site', city: 'Red Lake', province: 'ON', country: 'Canada', employees: 400, street: '', postalCode: '' },
            { type: 'Site', city: 'Timmins', province: 'ON', country: 'Canada', employees: 300, street: '', postalCode: '' }
          ],
          ownership: { type: 'Public', indigenousOwnership: 15 },
          publiclyTraded: true,
          stockSymbol: 'NRG.TSX'
        },
        
        certifications: {
          iso: [
            {
              standard: 'ISO 14001:2015',
              scope: 'Environmental Management',
              issuer: 'SGS Canada',
              issueDate: new Date('2022-01-01'),
              expiryDate: new Date('2025-01-01')
            }
          ],
          professional: [],
          safety: [
            {
              type: 'OHSAS 18001',
              standard: 'Occupational Health and Safety',
              validUntil: new Date('2024-12-31')
            }
          ],
          environmental: [
            {
              type: 'Towards Sustainable Mining',
              level: 'Level A',
              scope: 'All Operations',
              validUntil: new Date('2025-06-30')
            }
          ],
          quality: [],
          indigenous: []
        },
        
        indigenousPartnerships: {
          hasPartnerships: true,
          partnershipType: [
            { type: 'Joint Venture', percentage: 49, description: 'Red Lake Mine JV' },
            { type: 'Impact Benefit Agreement', description: 'Multiple First Nations IBAs' }
          ],
          partners: [
            {
              name: 'Wabauskang First Nation',
              nation: 'Ojibway',
              partnershipType: 'Joint Venture',
              since: new Date('2018-01-01'),
              activeProjects: 2
            },
            {
              name: 'Lac Seul First Nation',
              nation: 'Ojibway',
              partnershipType: 'IBA',
              since: new Date('2020-01-01'),
              activeProjects: 1
            }
          ],
          benefitAgreements: [
            {
              community: 'Multiple First Nations',
              type: 'Revenue Sharing',
              value: 5000000,
              duration: '20 years',
              benefits: ['Employment', 'Training', 'Business Opportunities', 'Revenue Sharing']
            }
          ],
          communityInvestment: 15000000,
          indigenousEmployment: {
            count: 170,
            percentage: 20,
            positions: ['Equipment Operators', 'Environmental Monitors', 'Management', 'Technical']
          }
        },
        
        capabilities: {
          coreCompetencies: ['Open Pit Mining', 'Underground Mining', 'Mineral Processing', 'Environmental Management'],
          projectTypes: ['Greenfield Development', 'Brownfield Expansion', 'Mine Closure'],
          equipmentOwned: [
            { type: 'Haul Truck', make: 'Caterpillar', model: '797F', year: 2020, quantity: 15, condition: 'Excellent' },
            { type: 'Excavator', make: 'Komatsu', model: 'PC8000', year: 2019, quantity: 5, condition: 'Excellent' }
          ],
          maxProjectSize: '$500M+',
          geographicReach: {
            national: true,
            provinces: ['ON', 'MB', 'SK', 'BC', 'NT'],
            international: [],
            remoteAccess: true,
            flyInCapability: true
          },
          remoteCapability: true,
          winterRoadExperience: true
        },
        
        performance: {
          completedProjects: 45,
          totalContractValue: 2500000000,
          governmentContracts: 5,
          indigenousContracts: 12,
          avgProjectSize: 55000000,
          onTimeDelivery: 94,
          safetyRecord: {
            lastIncident: new Date('2023-01-15'),
            lostTimeInjuries: 2,
            totalRecordableIncidentRate: 0.8,
            certifications: ['COR Certified', 'ISO 45001']
          },
          clientReferences: [
            {
              organization: 'Ontario Ministry of Northern Development',
              contactName: 'Available upon request',
              projectType: 'Mine Development',
              value: 250000000,
              rating: 4.8,
              wouldRehire: true
            }
          ]
        },
        
        compliance: {
          wsib: true,
          liabilityInsurance: {
            general: 100000000,
            environmental: 50000000,
            professional: 25000000
          },
          bondingCapacity: 500000000,
          securityClearance: {
            level: 'Reliability',
            issuedDate: new Date('2022-01-01'),
            expiryDate: new Date('2027-01-01'),
            employees: 50
          },
          indigenousContentRequirements: true,
          environmentalCompliance: ['Federal Environmental Assessment', 'Provincial Permits']
        },
        
        apiAccess: {
          tier: 'premium',
          verificationStatus: {
            verified: true,
            verifiedDate: new Date('2023-01-01'),
            verifiedBy: 'Industry Canada',
            documents: [
              {
                type: 'Business Registration',
                fileName: 'incorporation.pdf',
                uploadDate: new Date('2023-01-01'),
                status: 'Valid'
              }
            ],
            nextReview: new Date('2024-01-01')
          },
          apiUsage: {
            tier: 'premium',
            monthlyRequests: 50000,
            dataAccessed: 10000,
            partnershipRequests: 200,
            lastActive: new Date()
          },
          dataQuality: {
            completeness: 95,
            accuracy: 98,
            recency: 100,
            overall: 97
          }
        }
      },
      
      // Engineering Firm Specializing in Indigenous Projects
      {
        id: 'can-biz-002',
        businessName: 'Boreal Engineering Partners',
        legalName: 'Boreal Engineering Partners Ltd.',
        businessNumber: '987654321RC0001',
        description: 'Engineering firm specializing in resource projects and Indigenous community infrastructure',
        website: 'https://borealengineering.ca',
        email: 'contact@borealengineering.ca',
        phone: '1-888-ENG-NORTH',
        
        industry: {
          primary: 'Engineering',
          secondary: ['Environmental Services', 'Project Management'],
          naicsCode: ['541330', '541620'],
          services: ['Civil Engineering', 'Environmental Engineering', 'Project Management'],
          specializations: ['Remote Infrastructure', 'Indigenous Community Projects']
        },
        
        businessInfo: {
          established: new Date('2005-01-01'),
          employeeCount: 125,
          revenue: { min: 10000000, max: 50000000, currency: 'CAD', verified: true },
          headquarters: {
            street: '500 Engineer Plaza',
            city: 'Winnipeg',
            province: 'MB',
            postalCode: 'R3B 1B1',
            country: 'Canada'
          },
          locations: [
            { type: 'Office', city: 'Thunder Bay', province: 'ON', country: 'Canada', employees: 25, street: '', postalCode: '' },
            { type: 'Office', city: 'Yellowknife', province: 'NT', country: 'Canada', employees: 15, street: '', postalCode: '' }
          ],
          ownership: { type: 'Private', indigenousOwnership: 0, womenOwnership: 40 },
          publiclyTraded: false
        },
        
        certifications: {
          iso: [
            {
              standard: 'ISO 9001:2015',
              scope: 'Quality Management',
              issuer: 'BSI Canada',
              issueDate: new Date('2021-06-01'),
              expiryDate: new Date('2024-06-01')
            }
          ],
          professional: [
            {
              name: 'Professional Engineers',
              issuer: 'Engineers Canada',
              holders: 45,
              types: ['P.Eng']
            }
          ],
          safety: [],
          environmental: [],
          quality: [],
          indigenous: [
            {
              type: 'CCAB',
              level: 'Silver',
              verifiedDate: new Date('2023-01-01'),
              expiryDate: new Date('2026-01-01')
            }
          ]
        },
        
        indigenousPartnerships: {
          hasPartnerships: true,
          partnershipType: [
            { type: 'Subcontractor', description: 'Preferred engineering partner' },
            { type: 'Joint Venture', percentage: 30, description: 'Community infrastructure projects' }
          ],
          partners: [
            {
              name: 'Peguis First Nation',
              nation: 'Ojibway',
              partnershipType: 'Strategic Partnership',
              since: new Date('2015-01-01'),
              activeProjects: 3
            },
            {
              name: 'Norway House Cree Nation',
              nation: 'Cree',
              partnershipType: 'Joint Venture',
              since: new Date('2018-01-01'),
              activeProjects: 2
            }
          ],
          benefitAgreements: [],
          communityInvestment: 2000000,
          indigenousEmployment: {
            count: 18,
            percentage: 14,
            positions: ['Engineers', 'Technicians', 'Project Coordinators']
          }
        },
        
        capabilities: {
          coreCompetencies: [
            'Infrastructure Design',
            'Environmental Assessment',
            'Water Treatment Systems',
            'Road Engineering',
            'Community Planning'
          ],
          projectTypes: [
            'Water/Wastewater',
            'Transportation',
            'Community Buildings',
            'Resource Projects'
          ],
          equipmentOwned: [],
          maxProjectSize: '$50M',
          geographicReach: {
            national: true,
            provinces: ['MB', 'ON', 'SK', 'NT', 'NU'],
            international: [],
            remoteAccess: true,
            flyInCapability: true
          },
          remoteCapability: true,
          winterRoadExperience: true
        },
        
        performance: {
          completedProjects: 230,
          totalContractValue: 185000000,
          governmentContracts: 85,
          indigenousContracts: 95,
          avgProjectSize: 800000,
          onTimeDelivery: 97,
          safetyRecord: {
            lastIncident: null,
            lostTimeInjuries: 0,
            totalRecordableIncidentRate: 0,
            certifications: []
          },
          clientReferences: []
        },
        
        compliance: {
          wsib: true,
          liabilityInsurance: {
            general: 10000000,
            professional: 5000000
          },
          bondingCapacity: 25000000,
          indigenousContentRequirements: true,
          environmentalCompliance: ['Professional Standards']
        },
        
        apiAccess: {
          tier: 'partner',
          verificationStatus: {
            verified: true,
            verifiedDate: new Date('2023-06-01'),
            verifiedBy: 'CCAB',
            documents: [],
            nextReview: new Date('2024-06-01')
          },
          apiUsage: {
            tier: 'partner',
            monthlyRequests: 5000,
            dataAccessed: 2000,
            partnershipRequests: 50,
            lastActive: new Date()
          },
          dataQuality: {
            completeness: 90,
            accuracy: 95,
            recency: 98,
            overall: 94
          }
        }
      }
    ]
  }
}

interface SearchFacets {
  industries: Record<string, number>
  provinces: Record<string, number>
  certifications: Record<string, number>
  capabilities: Record<string, number>
  partnershipTypes: Record<string, number>
  sizeRanges: Record<string, number>
}