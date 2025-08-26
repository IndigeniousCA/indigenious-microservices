// Data Classification Component
// Automated data sensitivity classification and labeling

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Database, Shield, Tag, AlertTriangle, CheckCircle, Clock,
  Eye, EyeOff, Lock, Unlock, Globe, Users, Crown, Flag,
  Search, Filter, Download, Upload, FileText, Image,
  Video, Music, Archive, Settings, Info, ChevronDown
} from 'lucide-react'

export type DataClassification = 
  | 'public' 
  | 'internal' 
  | 'confidential' 
  | 'restricted' 
  | 'indigenous_sensitive'
  | 'ceremonial_restricted'
  | 'top_secret'

export type DataCategory = 
  | 'personal_information'
  | 'financial_data'
  | 'health_records'
  | 'legal_documents'
  | 'business_intelligence'
  | 'technical_specifications'
  | 'indigenous_cultural'
  | 'sacred_knowledge'
  | 'community_profiles'
  | 'government_classified'

export interface ClassificationRule {
  id: string
  name: string
  description: string
  pattern: string | RegExp
  classification: DataClassification
  category: DataCategory
  priority: number
  culturalContext?: {
    indigenousRelevant: boolean
    communitySpecific?: string
    ceremonialContent?: boolean
    elderApprovalRequired?: boolean
    traditionalProtocols?: string[]
  }
  complianceFrameworks: string[]
  retentionPolicy: {
    period: string
    destruction: string
    legalHold: boolean
  }
  accessControls: {
    minimumClearance: string
    requiredRoles: string[]
    communityConsent?: boolean
    timeRestrictions?: string
  }
}

export interface ClassifiedData {
  id: string
  filename: string
  filepath: string
  fileType: string
  size: number
  classification: DataClassification
  category: DataCategory
  confidence: number
  detectedAt: string
  classifiedBy: 'system' | 'manual'
  rules: string[]
  culturalMarkers?: {
    language?: string
    community?: string
    ceremonies?: string[]
    traditionalKnowledge?: boolean
    sacredContent?: boolean
  }
  metadata: {
    creator: string
    lastModified: string
    accessCount: number
    lastAccessed?: string
    hash: string
  }
  tags: string[]
  notes?: string
}

interface DataClassificationProps {
  onClassificationChange?: (data: ClassifiedData) => void
}

export function DataClassification({ onClassificationChange }: DataClassificationProps) {
  const [selectedClassification, setSelectedClassification] = useState<DataClassification | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<DataCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedData, setSelectedData] = useState<ClassifiedData | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Mock classification rules
  const classificationRules: ClassificationRule[] = [
    {
      id: 'rule-001',
      name: 'Indigenous Community Names',
      description: 'Detects Indigenous community and nation names',
      pattern: /\b(Anishinaabe|Haudenosaunee|Mi\'kmaq|Inuit|Métis|Cree|Ojibwe|Cherokee|Mohawk|Onondaga)\b/i,
      classification: 'indigenous_sensitive',
      category: 'indigenous_cultural',
      priority: 1,
      culturalContext: {
        indigenousRelevant: true,
        elderApprovalRequired: true,
        traditionalProtocols: ['Community Consent', 'Elder Review']
      },
      complianceFrameworks: ['indigenous_sovereignty', 'pipeda'],
      retentionPolicy: {
        period: 'Indefinite with community approval',
        destruction: 'Community decision required',
        legalHold: true
      },
      accessControls: {
        minimumClearance: 'indigenous_data_steward',
        requiredRoles: ['indigenous_liaison', 'community_representative'],
        communityConsent: true
      }
    },
    {
      id: 'rule-002',
      name: 'Sacred Ceremonial Content',
      description: 'Identifies sacred and ceremonial information',
      pattern: /\b(ceremony|sacred|ritual|medicine wheel|smudging|pipe ceremony|sun dance|powwow|vision quest)\b/i,
      classification: 'ceremonial_restricted',
      category: 'sacred_knowledge',
      priority: 1,
      culturalContext: {
        indigenousRelevant: true,
        ceremonialContent: true,
        elderApprovalRequired: true,
        traditionalProtocols: ['Elder Council Approval', 'Ceremonial Protocols', 'Seasonal Restrictions']
      },
      complianceFrameworks: ['indigenous_sovereignty'],
      retentionPolicy: {
        period: 'Traditional governance decision',
        destruction: 'Elder council approval required',
        legalHold: true
      },
      accessControls: {
        minimumClearance: 'ceremonial_keeper',
        requiredRoles: ['elder', 'ceremonial_leader', 'knowledge_keeper'],
        communityConsent: true,
        timeRestrictions: 'Ceremonial seasons only'
      }
    },
    {
      id: 'rule-003',
      name: 'Government Classified',
      description: 'Detects government security classifications',
      pattern: /\b(PROTECTED [A-C]|CONFIDENTIAL|SECRET|TOP SECRET)\b/i,
      classification: 'top_secret',
      category: 'government_classified',
      priority: 1,
      complianceFrameworks: ['fedramp', 'cccs', 'treasury_board'],
      retentionPolicy: {
        period: '25 years',
        destruction: 'Government archives approval',
        legalHold: true
      },
      accessControls: {
        minimumClearance: 'secret',
        requiredRoles: ['security_officer', 'government_liaison'],
        communityConsent: false
      }
    },
    {
      id: 'rule-004',
      name: 'Personal Information',
      description: 'Identifies personally identifiable information',
      pattern: /\b(\d{3}-\d{3}-\d{4}|\d{9}|[A-Z]\d{8}|\w+@\w+\.\w+)\b/i,
      classification: 'confidential',
      category: 'personal_information',
      priority: 2,
      complianceFrameworks: ['pipeda', 'privacy_act'],
      retentionPolicy: {
        period: '7 years after last contact',
        destruction: 'Automated secure deletion',
        legalHold: false
      },
      accessControls: {
        minimumClearance: 'confidential',
        requiredRoles: ['data_steward', 'privacy_officer']
      }
    }
  ]

  // Mock classified data
  const classifiedData: ClassifiedData[] = [
    {
      id: 'data-001',
      filename: 'Six_Nations_Community_Profile.pdf',
      filepath: '/data/communities/six_nations/profile.pdf',
      fileType: 'PDF',
      size: 2048576,
      classification: 'indigenous_sensitive',
      category: 'community_profiles',
      confidence: 95,
      detectedAt: new Date().toISOString(),
      classifiedBy: 'system',
      rules: ['rule-001', 'rule-004'],
      culturalMarkers: {
        language: 'Mohawk',
        community: 'Six Nations of the Grand River',
        traditionalKnowledge: true,
        sacredContent: false
      },
      metadata: {
        creator: 'Community Relations Office',
        lastModified: new Date(Date.now() - 86400000).toISOString(),
        accessCount: 12,
        lastAccessed: new Date(Date.now() - 3600000).toISOString(),
        hash: 'sha256:a1b2c3d4e5f6...'
      },
      tags: ['community-data', 'six-nations', 'profile'],
      notes: 'Contains traditional governance structure information'
    },
    {
      id: 'data-002',
      filename: 'Ceremonial_Calendar_2024.xlsx',
      filepath: '/data/cultural/ceremonies/calendar_2024.xlsx',
      fileType: 'Excel',
      size: 512000,
      classification: 'ceremonial_restricted',
      category: 'sacred_knowledge',
      confidence: 98,
      detectedAt: new Date(Date.now() - 86400000).toISOString(),
      classifiedBy: 'manual',
      rules: ['rule-002'],
      culturalMarkers: {
        community: 'Anishinaabe Nation',
        ceremonies: ['Full Moon Ceremony', 'Seasonal Celebrations'],
        traditionalKnowledge: true,
        sacredContent: true
      },
      metadata: {
        creator: 'Elder Council',
        lastModified: new Date(Date.now() - 604800000).toISOString(),
        accessCount: 3,
        hash: 'sha256:f6e5d4c3b2a1...'
      },
      tags: ['ceremonial', 'calendar', 'sacred'],
      notes: 'Access restricted to ceremonial keepers only'
    },
    {
      id: 'data-003',
      filename: 'Infrastructure_Security_Assessment.docx',
      filepath: '/data/security/assessments/infrastructure_2024.docx',
      fileType: 'Word',
      size: 1536000,
      classification: 'top_secret',
      category: 'government_classified',
      confidence: 99,
      detectedAt: new Date(Date.now() - 172800000).toISOString(),
      classifiedBy: 'system',
      rules: ['rule-003'],
      metadata: {
        creator: 'CCCS Security Team',
        lastModified: new Date(Date.now() - 259200000).toISOString(),
        accessCount: 8,
        lastAccessed: new Date(Date.now() - 7200000).toISOString(),
        hash: 'sha256:123456789abc...'
      },
      tags: ['security', 'infrastructure', 'classified']
    }
  ]

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = classifiedData

    if (selectedClassification !== 'all') {
      filtered = filtered.filter(d => d.classification === selectedClassification)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory)
    }

    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.culturalMarkers?.community?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    return filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
  }, [classifiedData, selectedClassification, selectedCategory, searchQuery])

  // Get classification color
  const getClassificationColor = (classification: DataClassification) => {
    switch (classification) {
      case 'public': return 'emerald'
      case 'internal': return 'blue'
      case 'confidential': return 'yellow'
      case 'restricted': return 'orange'
      case 'indigenous_sensitive': return 'purple'
      case 'ceremonial_restricted': return 'indigo'
      case 'top_secret': return 'red'
      default: return 'gray'
    }
  }

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return FileText
      case 'word':
      case 'docx': return FileText
      case 'excel':
      case 'xlsx': return Database
      case 'image':
      case 'jpg':
      case 'png': return Image
      case 'video':
      case 'mp4': return Video
      case 'audio':
      case 'mp3': return Music
      default: return Archive
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  // Classification statistics
  const classificationStats = useMemo(() => {
    const total = classifiedData.length
    const byClassification = classifiedData.reduce((acc, data) => {
      acc[data.classification] = (acc[data.classification] || 0) + 1
      return acc
    }, {} as Record<DataClassification, number>)

    const indigenousData = classifiedData.filter(d => 
      d.classification === 'indigenous_sensitive' || d.classification === 'ceremonial_restricted'
    ).length

    const highRisk = classifiedData.filter(d => 
      ['top_secret', 'ceremonial_restricted', 'restricted'].includes(d.classification)
    ).length

    return { total, byClassification, indigenousData, highRisk }
  }, [classifiedData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Classification</h2>
          <p className="text-white/60 text-sm">
            Automated data sensitivity classification and Indigenous cultural protection
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Grid
            </button>
          </div>

          <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
            border-blue-400/50 rounded-lg text-blue-200 text-sm flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Classify Files
          </button>
        </div>
      </div>

      {/* Classification Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <Database className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{classificationStats.total}</div>
          <div className="text-white/60 text-sm">Total Files</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <Globe className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{classificationStats.indigenousData}</div>
          <div className="text-white/60 text-sm">Indigenous Data</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{classificationStats.highRisk}</div>
          <div className="text-white/60 text-sm">High Risk</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">99.2%</div>
          <div className="text-white/60 text-sm">Accuracy</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">Filter Classified Data</h3>
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center space-x-2 text-white/60 hover:text-white text-sm"
          >
            <span>Classification Rules</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showRules ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Classification Filter */}
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Classifications</option>
            <option value="public" className="bg-gray-800">Public</option>
            <option value="internal" className="bg-gray-800">Internal</option>
            <option value="confidential" className="bg-gray-800">Confidential</option>
            <option value="restricted" className="bg-gray-800">Restricted</option>
            <option value="indigenous_sensitive" className="bg-gray-800">Indigenous Sensitive</option>
            <option value="ceremonial_restricted" className="bg-gray-800">Ceremonial Restricted</option>
            <option value="top_secret" className="bg-gray-800">Top Secret</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as unknown)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Categories</option>
            <option value="personal_information" className="bg-gray-800">Personal Information</option>
            <option value="indigenous_cultural" className="bg-gray-800">Indigenous Cultural</option>
            <option value="sacred_knowledge" className="bg-gray-800">Sacred Knowledge</option>
            <option value="government_classified" className="bg-gray-800">Government Classified</option>
            <option value="community_profiles" className="bg-gray-800">Community Profiles</option>
          </select>
        </div>

        {/* Classification Rules */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <h4 className="font-medium text-white mb-4">Active Classification Rules</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {classificationRules.map((rule) => (
                  <div key={rule.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-white">{rule.name}</h5>
                      <div className={`px-2 py-1 bg-${getClassificationColor(rule.classification)}-500/20 
                        text-${getClassificationColor(rule.classification)}-300 rounded text-xs`}>
                        {rule.classification.replace('_', ' ')}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-2">{rule.description}</p>
                    <div className="text-xs text-white/60">
                      Priority: {rule.priority} | Category: {rule.category.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Classified Files ({filteredData.length})
        </h3>

        {viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredData.map((data) => {
              const FileIcon = getFileIcon(data.fileType)
              
              return (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedData(data)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                    hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg bg-${getClassificationColor(data.classification)}-500/20`}>
                        <FileIcon className={`w-5 h-5 text-${getClassificationColor(data.classification)}-400`} />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{data.filename}</h4>
                        <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                          <span>{data.fileType}</span>
                          <span>{formatFileSize(data.size)}</span>
                          <span>{data.confidence}% confidence</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 bg-${getClassificationColor(data.classification)}-500/20 
                        text-${getClassificationColor(data.classification)}-300 rounded text-sm font-medium`}>
                        {data.classification.replace('_', ' ')}
                      </div>
                      
                      {data.culturalMarkers?.sacredContent && (
                        <div className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                          Sacred
                        </div>
                      )}
                      
                      {data.culturalMarkers?.traditionalKnowledge && (
                        <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          Traditional Knowledge
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {data.culturalMarkers?.community && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2 text-sm text-white/70">
                        <Users className="w-4 h-4" />
                        <span>Community: {data.culturalMarkers.community}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((data) => {
              const FileIcon = getFileIcon(data.fileType)
              
              return (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedData(data)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 
                    hover:bg-white/15 transition-all cursor-pointer"
                >
                  <div className="text-center">
                    <div className={`p-4 rounded-lg bg-${getClassificationColor(data.classification)}-500/20 inline-block mb-4`}>
                      <FileIcon className={`w-8 h-8 text-${getClassificationColor(data.classification)}-400`} />
                    </div>
                    
                    <h4 className="font-medium text-white mb-2 truncate">{data.filename}</h4>
                    
                    <div className={`px-3 py-1 bg-${getClassificationColor(data.classification)}-500/20 
                      text-${getClassificationColor(data.classification)}-300 rounded text-sm font-medium mb-3 inline-block`}>
                      {data.classification.replace('_', ' ')}
                    </div>
                    
                    <div className="text-xs text-white/60 space-y-1">
                      <div>{formatFileSize(data.size)}</div>
                      <div>{data.confidence}% confidence</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Classified Data Found</h3>
            <p className="text-white/60">
              {searchQuery || selectedClassification !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'No classified data to display'
              }
            </p>
          </div>
        )}
      </div>

      {/* Cultural Data Protection Notice */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Globe className="w-5 h-5 text-purple-400" />
          <div className="text-purple-200 text-sm">
            <p className="font-medium mb-1">Indigenous Data Protection</p>
            <p className="text-purple-100/80">
              All Indigenous and ceremonial data is classified according to traditional governance protocols 
              and the CARE principles. Access requires appropriate cultural clearance and community consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}