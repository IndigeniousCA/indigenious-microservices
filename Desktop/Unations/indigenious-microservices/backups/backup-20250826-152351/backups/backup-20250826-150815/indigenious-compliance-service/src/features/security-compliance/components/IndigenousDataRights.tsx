// Indigenous Data Rights Component
// CARE Principles implementation and traditional governance integration

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Users, Crown, Heart, Shield, CheckCircle, AlertTriangle,
  Calendar, Clock, MapPin, Feather, Star, Sun, Moon,
  User, UserCheck, UserX, FileText, Settings, Info,
  Search, Filter, Download, Eye, EyeOff, Lock, Unlock
} from 'lucide-react'

export interface CommunityConsent {
  id: string
  communityName: string
  nationAffiliation: string
  dataType: string
  purpose: string
  requestedBy: string
  requestDate: string
  status: 'pending' | 'approved' | 'denied' | 'conditional' | 'expired'
  approvedBy?: string
  approvalDate?: string
  conditions?: string[]
  expiryDate?: string
  culturalProtocols: {
    seasonalRestrictions?: string[]
    ceremonialConsiderations?: string[]
    elderApproval: boolean
    traditionalCouncilReview: boolean
    communityMeetingRequired?: boolean
  }
  careCompliance: {
    collective: boolean // Collective benefit
    authority: boolean // Authority to control
    responsibility: boolean // Responsibility
    ethics: boolean // Ethics
  }
  accessLog: Array<{
    timestamp: string
    userId: string
    action: string
    purpose: string
  }>
}

export interface TraditionalGovernance {
  id: string
  nationName: string
  governanceStructure: string
  traditionalLaws: string[]
  dataProtocols: {
    accessRules: string[]
    sharingProtocols: string[]
    retentionPolicies: string[]
    destructionCeremonies: string[]
  }
  leadership: {
    chiefs: string[]
    elders: string[]
    knowledgeKeepers: string[]
    dataStewars: string[]
  }
  culturalCalendar: {
    ceremonies: Array<{
      name: string
      season: string
      dataRestrictions: string[]
    }>
    protectedPeriods: Array<{
      name: string
      startDate: string
      endDate: string
      restrictions: string[]
    }>
  }
  languageProtection: {
    indigenousLanguages: string[]
    translationRequirements: boolean
    culturalContextRequired: boolean
  }
}

export interface DataSovereigntyReport {
  period: string
  communityCompliance: {
    totalRequests: number
    approvedRequests: number
    deniedRequests: number
    pendingRequests: number
    averageProcessingTime: number
  }
  careMetrics: {
    collectiveScore: number
    authorityScore: number
    responsibilityScore: number
    ethicsScore: number
    overallScore: number
  }
  culturalProtection: {
    sacredDataProtected: number
    ceremonialRestrictionsEnforced: number
    languagePreservationActions: number
    elderInvolvement: number
  }
  violations: Array<{
    type: string
    description: string
    resolution: string
    preventiveMeasures: string[]
  }>
}

interface IndigenousDataRightsProps {
  userRole: string
  communityAffiliation?: string
}

export function IndigenousDataRights({ userRole, communityAffiliation }: IndigenousDataRightsProps) {
  const [activeTab, setActiveTab] = useState<'consent' | 'governance' | 'care' | 'reports'>('consent')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all')
  const [selectedConsent, setSelectedConsent] = useState<CommunityConsent | null>(null)
  const [showProtocols, setShowProtocols] = useState(false)

  // Mock community consent data
  const communityConsents: CommunityConsent[] = [
    {
      id: 'consent-001',
      communityName: 'Six Nations of the Grand River',
      nationAffiliation: 'Haudenosaunee Confederacy',
      dataType: 'Community demographic and economic data',
      purpose: 'Government procurement program development',
      requestedBy: 'Treasury Board Secretariat',
      requestDate: new Date().toISOString(),
      status: 'approved',
      approvedBy: 'Traditional Council',
      approvalDate: new Date(Date.now() - 86400000).toISOString(),
      conditions: [
        'Data use limited to procurement program only',
        'No sharing with third parties without consent',
        'Annual reporting on program outcomes required',
        'Community receives 5% of contract values'
      ],
      expiryDate: new Date(Date.now() + 31536000000).toISOString(), // 1 year
      culturalProtocols: {
        seasonalRestrictions: ['No access during Midwinter Ceremony (January)'],
        ceremonialConsiderations: ['Respect for clan mothers\' decisions'],
        elderApproval: true,
        traditionalCouncilReview: true,
        communityMeetingRequired: true
      },
      careCompliance: {
        collective: true,
        authority: true,
        responsibility: true,
        ethics: true
      },
      accessLog: [
        {
          timestamp: new Date().toISOString(),
          userId: 'gov-user-001',
          action: 'data_access',
          purpose: 'Quarterly report generation'
        }
      ]
    },
    {
      id: 'consent-002',
      communityName: 'Anishinaabe Nation',
      nationAffiliation: 'Three Fires Confederacy',
      dataType: 'Traditional ecological knowledge',
      purpose: 'Environmental assessment for infrastructure project',
      requestedBy: 'Infrastructure Canada',
      requestDate: new Date(Date.now() - 172800000).toISOString(),
      status: 'conditional',
      approvedBy: 'Elder Council',
      approvalDate: new Date(Date.now() - 86400000).toISOString(),
      conditions: [
        'Knowledge used only for environmental protection',
        'Traditional land use patterns must be respected',
        'Community consultation required for any changes',
        'Sacred sites information excluded from sharing'
      ],
      culturalProtocols: {
        seasonalRestrictions: ['No access during fasting periods'],
        ceremonialConsiderations: ['Full moon ceremonies take precedence'],
        elderApproval: true,
        traditionalCouncilReview: true
      },
      careCompliance: {
        collective: true,
        authority: true,
        responsibility: true,
        ethics: false // Pending ethics review
      },
      accessLog: []
    },
    {
      id: 'consent-003',
      communityName: 'Mi\'kmaq First Nation',
      nationAffiliation: 'Wabanaki Confederacy',
      dataType: 'Health and wellness program data',
      purpose: 'Provincial health research study',
      requestedBy: 'Health Canada Research Division',
      requestDate: new Date(Date.now() - 432000000).toISOString(),
      status: 'denied',
      culturalProtocols: {
        elderApproval: false,
        traditionalCouncilReview: true
      },
      careCompliance: {
        collective: false,
        authority: true,
        responsibility: false,
        ethics: false
      },
      accessLog: []
    }
  ]

  // Mock traditional governance data
  const traditionalGovernance: TraditionalGovernance[] = [
    {
      id: 'gov-001',
      nationName: 'Six Nations of the Grand River',
      governanceStructure: 'Traditional Council of Chiefs and Clan Mothers',
      traditionalLaws: [
        'Great Law of Peace',
        'Clan Mother authority over data decisions',
        'Seven generations principle for data impact',
        'Consensus decision-making for significant data sharing'
      ],
      dataProtocols: {
        accessRules: [
          'Community consent required for all external access',
          'Clan mother approval for ceremonial data',
          'Elder council review for traditional knowledge',
          'Youth council input for future impact assessment'
        ],
        sharingProtocols: [
          'Nation-to-nation agreements only',
          'No commercial use without explicit consent',
          'Cultural context must be preserved',
          'Attribution to community required'
        ],
        retentionPolicies: [
          'Sacred knowledge held by designated keepers',
          'Community data stored on sovereign infrastructure',
          'Regular community review of data holdings',
          'Traditional backup methods maintained'
        ],
        destructionCeremonies: [
          'Sacred fire ceremony for sensitive data destruction',
          'Community witness required',
          'Spiritual cleansing of storage media',
          'Documentation of destruction in traditional records'
        ]
      },
      leadership: {
        chiefs: ['Chief Alan Staats', 'Chief Darren Walker'],
        elders: ['Grandmother Mary', 'Elder Joseph Johnson'],
        knowledgeKeepers: ['Dr. Susan Hill', 'Tom Porter'],
        dataStewars: ['Sarah Johnson', 'Michael Thompson']
      },
      culturalCalendar: {
        ceremonies: [
          {
            name: 'Midwinter Ceremony',
            season: 'Winter',
            dataRestrictions: ['No data access during ceremony period', 'Community focus required']
          },
          {
            name: 'Green Corn Ceremony',
            season: 'Late Summer',
            dataRestrictions: ['Limited data processing', 'Thanksgiving protocols observed']
          }
        ],
        protectedPeriods: [
          {
            name: 'Strawberry Moon Ceremony',
            startDate: '2024-06-15',
            endDate: '2024-06-20',
            restrictions: ['No commercial data activities', 'Traditional knowledge sharing only']
          }
        ]
      },
      languageProtection: {
        indigenousLanguages: ['Mohawk', 'Cayuga', 'Onondaga', 'Oneida', 'Seneca', 'Tuscarora'],
        translationRequirements: true,
        culturalContextRequired: true
      }
    }
  ]

  // Filter consents
  const filteredConsents = useMemo(() => {
    let filtered = communityConsents

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.communityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dataType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.purpose.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
  }, [communityConsents, statusFilter, searchQuery])

  // Calculate CARE metrics
  const careMetrics = useMemo(() => {
    const totalConsents = communityConsents.length
    if (totalConsents === 0) return { collective: 0, authority: 0, responsibility: 0, ethics: 0, overall: 0 }

    const collective = (communityConsents.filter(c => c.careCompliance.collective).length / totalConsents) * 100
    const authority = (communityConsents.filter(c => c.careCompliance.authority).length / totalConsents) * 100
    const responsibility = (communityConsents.filter(c => c.careCompliance.responsibility).length / totalConsents) * 100
    const ethics = (communityConsents.filter(c => c.careCompliance.ethics).length / totalConsents) * 100
    const overall = (collective + authority + responsibility + ethics) / 4

    return {
      collective: Math.round(collective),
      authority: Math.round(authority),
      responsibility: Math.round(responsibility),
      ethics: Math.round(ethics),
      overall: Math.round(overall)
    }
  }, [communityConsents])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'emerald'
      case 'conditional': return 'yellow'
      case 'pending': return 'blue'
      case 'denied': return 'red'
      case 'expired': return 'gray'
      default: return 'gray'
    }
  }

  // CARE principle icons
  const careIcons = {
    collective: Users,
    authority: Crown,
    responsibility: Shield,
    ethics: Heart
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Globe className="w-6 h-6 mr-3 text-purple-400" />
            Indigenous Data Rights & Sovereignty
          </h2>
          <p className="text-white/60 text-sm mt-1">
            CARE Principles implementation and traditional governance integration
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border 
            border-purple-400/50 rounded-lg text-purple-200 text-sm flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Sovereignty Report
          </button>
        </div>
      </div>

      {/* CARE Principles Overview */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-200 mb-4">CARE Principles Compliance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(careMetrics).filter(([key]) => key !== 'overall').map(([principle, score]) => {
            const Icon = careIcons[principle as keyof typeof careIcons]
            return (
              <div key={principle} className="text-center">
                <div className="bg-purple-500/20 rounded-lg p-4 mb-2">
                  <Icon className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-200">{score}%</div>
                  <div className="text-purple-100/80 text-sm capitalize">{principle}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-200 font-medium">Overall CARE Compliance</span>
            <span className="text-2xl font-bold text-purple-200">{careMetrics.overall}%</span>
          </div>
          <div className="w-full bg-purple-500/20 rounded-full h-2">
            <div 
              className="bg-purple-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${careMetrics.overall}%` }}
            />
          </div>
        </div>

        <div className="mt-4 text-purple-100/80 text-sm">
          <p className="mb-2"><strong>CARE Principles:</strong></p>
          <ul className="space-y-1 text-xs">
            <li><strong>Collective:</strong> Data practices benefit Indigenous communities</li>
            <li><strong>Authority:</strong> Indigenous peoples control data about them</li>
            <li><strong>Responsibility:</strong> Data use is responsible and ethical</li>
            <li><strong>Ethics:</strong> Rights and wellbeing of Indigenous peoples are prioritized</li>
          </ul>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
        {[
          { id: 'consent', label: 'Community Consent', icon: Users },
          { id: 'governance', label: 'Traditional Governance', icon: Crown },
          { id: 'care', label: 'CARE Principles', icon: Heart },
          { id: 'reports', label: 'Sovereignty Reports', icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as unknown)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'consent' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search consents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                        text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                      focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all" className="bg-gray-800">All Status</option>
                    <option value="approved" className="bg-gray-800">Approved</option>
                    <option value="pending" className="bg-gray-800">Pending</option>
                    <option value="conditional" className="bg-gray-800">Conditional</option>
                    <option value="denied" className="bg-gray-800">Denied</option>
                  </select>
                </div>

                <div className="text-white/60 text-sm">
                  {filteredConsents.length} consent{filteredConsents.length !== 1 ? 's' : ''} found
                </div>
              </div>

              {/* Community Consents List */}
              <div className="space-y-4">
                {filteredConsents.map((consent) => (
                  <motion.div
                    key={consent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedConsent(consent)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                      hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <Globe className="w-5 h-5 text-purple-400" />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{consent.communityName}</h4>
                          <p className="text-white/60 text-sm">{consent.nationAffiliation}</p>
                          <p className="text-white/80 text-sm mt-2">{consent.dataType}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 bg-${getStatusColor(consent.status)}-500/20 
                          text-${getStatusColor(consent.status)}-300 rounded text-sm font-medium capitalize`}>
                          {consent.status}
                        </div>
                        
                        <div className="flex space-x-1">
                          {Object.entries(consent.careCompliance).map(([principle, compliant]) => {
                            const Icon = careIcons[principle as keyof typeof careIcons]
                            return (
                              <div
                                key={principle}
                                className={`p-1 rounded ${compliant ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                                title={`${principle}: ${compliant ? 'Compliant' : 'Non-compliant'}`}
                              >
                                <Icon className={`w-3 h-3 ${compliant ? 'text-emerald-400' : 'text-red-400'}`} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Purpose:</span>
                        <span className="text-white ml-2">{consent.purpose}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Requested by:</span>
                        <span className="text-white ml-2">{consent.requestedBy}</span>
                      </div>
                    </div>

                    {consent.culturalProtocols.elderApproval && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center space-x-2 text-sm text-purple-300">
                          <Star className="w-4 h-4" />
                          <span>Elder approval obtained</span>
                          {consent.culturalProtocols.traditionalCouncilReview && (
                            <>
                              <span className="text-white/40">•</span>
                              <span>Traditional council reviewed</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {filteredConsents.length === 0 && (
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Consents Found</h3>
                  <p className="text-white/60">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'No community consents to display'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-6">
              {traditionalGovernance.map((governance) => (
                <div key={governance.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <Crown className="w-6 h-6 text-amber-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{governance.nationName}</h3>
                      <p className="text-white/60 text-sm">{governance.governanceStructure}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-white mb-3">Traditional Laws</h4>
                        <ul className="space-y-2">
                          {governance.traditionalLaws.map((law, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm text-white/80">
                              <Feather className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                              <span>{law}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-white mb-3">Leadership</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-white/60">Chiefs:</span>
                            <span className="text-white ml-2">{governance.leadership.chiefs.join(', ')}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Elders:</span>
                            <span className="text-white ml-2">{governance.leadership.elders.join(', ')}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Knowledge Keepers:</span>
                            <span className="text-white ml-2">{governance.leadership.knowledgeKeepers.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-white mb-3">Data Protocols</h4>
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-white/80 text-sm font-medium">Access Rules</h5>
                            <ul className="mt-1 space-y-1">
                              {governance.dataProtocols.accessRules.slice(0, 2).map((rule, index) => (
                                <li key={index} className="text-xs text-white/60 flex items-start space-x-1">
                                  <span className="text-purple-400">•</span>
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="text-white/80 text-sm font-medium">Sharing Protocols</h5>
                            <ul className="mt-1 space-y-1">
                              {governance.dataProtocols.sharingProtocols.slice(0, 2).map((protocol, index) => (
                                <li key={index} className="text-xs text-white/60 flex items-start space-x-1">
                                  <span className="text-purple-400">•</span>
                                  <span>{protocol}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-white mb-3">Cultural Calendar</h4>
                        <div className="space-y-2">
                          {governance.culturalCalendar.ceremonies.map((ceremony, index) => (
                            <div key={index} className="bg-white/5 rounded p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <Sun className="w-4 h-4 text-yellow-400" />
                                <span className="text-white text-sm font-medium">{ceremony.name}</span>
                                <span className="text-white/60 text-xs">({ceremony.season})</span>
                              </div>
                              <p className="text-white/60 text-xs">{ceremony.dataRestrictions.join(', ')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'care' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(careIcons).map(([principle, Icon]) => {
                  const score = careMetrics[principle as keyof typeof careMetrics]
                  return (
                    <div key={principle} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                          <Icon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white capitalize">{principle}</h3>
                          <div className="text-2xl font-bold text-purple-300">{score}%</div>
                        </div>
                      </div>

                      <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                        <div 
                          className="bg-purple-400 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${score}%` }}
                        />
                      </div>

                      <div className="text-white/70 text-sm">
                        {principle === 'collective' && 'Data ecosystems enable Indigenous communities to derive benefit from their data'}
                        {principle === 'authority' && 'Indigenous peoples have rights and interests in their data and the right to control it'}
                        {principle === 'responsibility' && 'Data governance must be responsible and responsive to Indigenous worldviews'}
                        {principle === 'ethics' && 'Data governance must be grounded in Indigenous ethical frameworks'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Data Sovereignty Reports
              </h3>
              <p className="text-white/60 mb-6">
                Comprehensive reporting on Indigenous data rights compliance and traditional governance integration.
              </p>
              <button className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border 
                border-purple-400/50 rounded-lg text-purple-200">
                Generate Sovereignty Report
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Consent Detail Modal */}
      <AnimatePresence>
        {selectedConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedConsent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Community Consent Details</h3>
                <button
                  onClick={() => setSelectedConsent(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Community Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Community:</span>
                        <span className="text-white ml-2">{selectedConsent.communityName}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Nation:</span>
                        <span className="text-white ml-2">{selectedConsent.nationAffiliation}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Data Type:</span>
                        <span className="text-white ml-2">{selectedConsent.dataType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Request Details</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Requested by:</span>
                        <span className="text-white ml-2">{selectedConsent.requestedBy}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Purpose:</span>
                        <span className="text-white ml-2">{selectedConsent.purpose}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Status:</span>
                        <span className={`ml-2 px-2 py-1 bg-${getStatusColor(selectedConsent.status)}-500/20 
                          text-${getStatusColor(selectedConsent.status)}-300 rounded text-xs capitalize`}>
                          {selectedConsent.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARE Compliance */}
                <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                  <h4 className="font-medium text-purple-200 mb-3">CARE Principles Compliance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(selectedConsent.careCompliance).map(([principle, compliant]) => {
                      const Icon = careIcons[principle as keyof typeof careIcons]
                      return (
                        <div key={principle} className="flex items-center space-x-2">
                          <Icon className={`w-5 h-5 ${compliant ? 'text-emerald-400' : 'text-red-400'}`} />
                          <span className={`text-sm capitalize ${compliant ? 'text-emerald-300' : 'text-red-300'}`}>
                            {principle}
                          </span>
                          <CheckCircle className={`w-4 h-4 ${compliant ? 'text-emerald-400' : 'text-red-400'}`} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Conditions */}
                {selectedConsent.conditions && selectedConsent.conditions.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Consent Conditions</h4>
                    <ul className="space-y-2">
                      {selectedConsent.conditions.map((condition, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-white/80">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cultural Protocols */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Cultural Protocols</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-white/80">Elder Approval:</span>
                        <span className={selectedConsent.culturalProtocols.elderApproval ? 'text-emerald-300' : 'text-red-300'}>
                          {selectedConsent.culturalProtocols.elderApproval ? 'Required' : 'Not Required'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-white/80">Traditional Council:</span>
                        <span className={selectedConsent.culturalProtocols.traditionalCouncilReview ? 'text-emerald-300' : 'text-red-300'}>
                          {selectedConsent.culturalProtocols.traditionalCouncilReview ? 'Reviewed' : 'Not Reviewed'}
                        </span>
                      </div>
                    </div>
                    <div>
                      {selectedConsent.culturalProtocols.seasonalRestrictions && (
                        <div>
                          <span className="text-white/80">Seasonal Restrictions:</span>
                          <ul className="mt-1 space-y-1">
                            {selectedConsent.culturalProtocols.seasonalRestrictions.map((restriction, index) => (
                              <li key={index} className="text-white/60 text-xs">• {restriction}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cultural Acknowledgment */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Feather className="w-5 h-5 text-indigo-400" />
          <div className="text-indigo-200 text-sm">
            <p className="font-medium mb-1">Traditional Territory Acknowledgment</p>
            <p className="text-indigo-100/80">
              We acknowledge that Indigenous data sovereignty is fundamental to self-determination 
              and that all data governance must respect traditional laws, customs, and protocols 
              of Indigenous peoples and their territories.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}