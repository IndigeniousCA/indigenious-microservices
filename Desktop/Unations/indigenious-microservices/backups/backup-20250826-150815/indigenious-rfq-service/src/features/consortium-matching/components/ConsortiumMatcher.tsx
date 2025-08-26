'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, Filter, Star, Shield, MapPin, 
  Briefcase, Award, TrendingUp, Calendar, Check,
  X, ChevronRight, Building, Zap, Heart, Globe,
  DollarSign, Clock, MessageSquare, FileText, Handshake
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

interface Business {
  id: string
  name: string
  logo?: string
  type: 'indigenous-sme' | 'indigenous-large' | 'partner'
  capabilities: string[]
  certifications: string[]
  location: string
  employees: number
  indigenousPercentage: number
  rating: number
  completedProjects: number
  revenue: string
  matchScore?: number
  complementarySkills?: string[]
  pastCollaborations?: number
  successRate?: number
}

interface ConsortiumRequest {
  projectType: string
  requiredCapabilities: string[]
  projectValue: string
  timeline: string
  location: string
}

interface MatchedConsortium {
  businesses: Business[]
  totalScore: number
  strengths: string[]
  gaps: string[]
  indigenousContent: number
  estimatedSuccessRate: number
}

export function ConsortiumMatcher() {
  const [activeTab, setActiveTab] = useState<'find' | 'create' | 'manage'>('find')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [showPartnerDetails, setShowPartnerDetails] = useState(false)
  
  // Mock data
  const potentialPartners: Business[] = [
    {
      id: '1',
      name: 'Northern Construction Ltd',
      type: 'indigenous-large',
      capabilities: ['Construction', 'Project Management', 'Heavy Equipment'],
      certifications: ['ISO 9001', 'Indigenous Business', 'LEED AP'],
      location: 'Thunder Bay, ON',
      employees: 150,
      indigenousPercentage: 100,
      rating: 4.8,
      completedProjects: 47,
      revenue: '$25M+',
      matchScore: 92,
      complementarySkills: ['Your IT expertise + Their construction'],
      pastCollaborations: 0,
      successRate: 85
    },
    {
      id: '2',
      name: 'Eagle Engineering Services',
      type: 'indigenous-sme',
      capabilities: ['Engineering', 'Design', 'Environmental Assessment'],
      certifications: ['P.Eng', 'Indigenous Business', 'ISO 14001'],
      location: 'Winnipeg, MB',
      employees: 35,
      indigenousPercentage: 100,
      rating: 4.9,
      completedProjects: 23,
      revenue: '$5-10M',
      matchScore: 87,
      complementarySkills: ['Your software + Their engineering'],
      pastCollaborations: 2,
      successRate: 91
    },
    {
      id: '3',
      name: 'Anishinaabe Tech Solutions',
      type: 'indigenous-sme',
      capabilities: ['IT Services', 'Cybersecurity', 'Cloud Solutions'],
      certifications: ['SOC 2', 'Indigenous Business', 'Microsoft Partner'],
      location: 'Ottawa, ON',
      employees: 20,
      indigenousPercentage: 100,
      rating: 4.7,
      completedProjects: 31,
      revenue: '$2-5M',
      matchScore: 78,
      complementarySkills: ['Combined IT capabilities for larger projects'],
      pastCollaborations: 1,
      successRate: 88
    }
  ]
  
  const consortiumRequest: ConsortiumRequest = {
    projectType: 'Infrastructure Modernization',
    requiredCapabilities: ['IT Services', 'Construction', 'Project Management'],
    projectValue: '$5-10M',
    timeline: '12-18 months',
    location: 'Ontario'
  }
  
  const suggestedConsortiums: MatchedConsortium[] = [
    {
      businesses: [potentialPartners[0], potentialPartners[1]],
      totalScore: 95,
      strengths: [
        'Complete capability coverage',
        '100% Indigenous owned',
        'Strong track records',
        'Geographic alignment'
      ],
      gaps: [],
      indigenousContent: 100,
      estimatedSuccessRate: 89
    },
    {
      businesses: [potentialPartners[0], potentialPartners[2]],
      totalScore: 88,
      strengths: [
        'IT + Construction combo',
        'Both have government experience',
        'Cost competitive'
      ],
      gaps: ['Engineering capabilities'],
      indigenousContent: 100,
      estimatedSuccessRate: 82
    }
  ]
  
  const handleCreateConsortium = (partners: Business[]) => {
    logger.info('Creating consortium with:', partners)
    // In production, this would create partnership agreements, set up communication channels, etc.
  }
  
  const renderFindPartners = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, capability, or location..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 transition-colors">
          <Filter className="w-5 h-5" />
          Advanced Filters
        </button>
      </div>
      
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {['Construction', 'IT Services', 'Engineering', 'Manufacturing', 'Consulting'].map(cap => (
          <button
            key={cap}
            onClick={() => setSelectedCapabilities(prev => 
              prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
            )}
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
              selectedCapabilities.includes(cap)
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {cap}
          </button>
        ))}
      </div>
      
      {/* AI Recommendations */}
      <GlassPanel className="p-6 border-purple-400/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              AI-Powered Consortium Recommendations
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Based on your upcoming project: <span className="text-white">{consortiumRequest.projectType}</span>
            </p>
            
            <div className="space-y-3">
              {suggestedConsortiums.map((consortium, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {consortium.businesses.map((biz, j) => (
                          <div
                            key={biz.id}
                            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-black"
                            style={{ zIndex: consortium.businesses.length - j }}
                          >
                            {biz.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {consortium.businesses.map(b => b.name).join(' + ')}
                        </p>
                        <p className="text-sm text-white/60">
                          Match Score: <span className="text-green-400">{consortium.totalScore}%</span>
                        </p>
                      </div>
                    </div>
                    <GlassButton size="sm">
                      Form Consortium
                    </GlassButton>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-white/60">Success Rate</p>
                      <p className="text-white font-medium">{consortium.estimatedSuccessRate}%</p>
                    </div>
                    <div>
                      <p className="text-white/60">Indigenous</p>
                      <p className="text-white font-medium">{consortium.indigenousContent}%</p>
                    </div>
                    <div>
                      <p className="text-white/60">Strengths</p>
                      <p className="text-green-400 font-medium">{consortium.strengths.length}</p>
                    </div>
                    <div>
                      <p className="text-white/60">Gaps</p>
                      <p className={`font-medium ${consortium.gaps.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {consortium.gaps.length || 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
      
      {/* Partner List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {potentialPartners.map(partner => (
          <GlassPanel 
            key={partner.id} 
            className="p-6 hover:bg-white/5 transition-all cursor-pointer"
            onClick={() => {
              setSelectedBusiness(partner)
              setShowPartnerDetails(true)
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                  {partner.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{partner.name}</h4>
                  <p className="text-sm text-white/60">{partner.location}</p>
                </div>
              </div>
              {partner.matchScore && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">{partner.matchScore}%</p>
                  <p className="text-xs text-white/60">Match</p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {/* Capabilities */}
              <div className="flex flex-wrap gap-1">
                {partner.capabilities.slice(0, 3).map(cap => (
                  <span key={cap} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                    {cap}
                  </span>
                ))}
                {partner.capabilities.length > 3 && (
                  <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                    +{partner.capabilities.length - 3} more
                  </span>
                )}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-white/60">Employees</p>
                  <p className="text-white font-medium">{partner.employees}</p>
                </div>
                <div>
                  <p className="text-white/60">Projects</p>
                  <p className="text-white font-medium">{partner.completedProjects}</p>
                </div>
                <div>
                  <p className="text-white/60">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-medium">{partner.rating}</span>
                  </div>
                </div>
              </div>
              
              {/* Complementary Skills */}
              {partner.complementarySkills && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {partner.complementarySkills[0]}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  )
  
  const renderCreateConsortium = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Create New Consortium
        </h3>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Consortium Name
            </label>
            <input
              type="text"
              placeholder="e.g., Northern Alliance Construction Group"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Target Project Types
            </label>
            <div className="flex flex-wrap gap-2">
              {['Infrastructure', 'IT Services', 'Construction', 'Engineering', 'Manufacturing'].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded bg-white/10 border-white/20" />
                  <span className="text-sm text-white/80">{type}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Revenue Sharing Model
            </label>
            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-400/50">
              <option>Equal split based on participation</option>
              <option>Percentage based on work allocation</option>
              <option>Fixed percentages (custom)</option>
              <option>Performance-based model</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Consortium Goals
            </label>
            <textarea
              placeholder="What do you hope to achieve together?"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>
        </form>
      </GlassPanel>
      
      {/* Partnership Agreement Templates */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Partnership Agreement Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left">
            <FileText className="w-8 h-8 text-blue-400 mb-2" />
            <h4 className="text-white font-medium">Standard Consortium</h4>
            <p className="text-sm text-white/60 mt-1">Equal partnership for project delivery</p>
          </button>
          <button className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left">
            <FileText className="w-8 h-8 text-green-400 mb-2" />
            <h4 className="text-white font-medium">Prime-Sub Agreement</h4>
            <p className="text-sm text-white/60 mt-1">Lead contractor with subcontractors</p>
          </button>
          <button className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left">
            <FileText className="w-8 h-8 text-purple-400 mb-2" />
            <h4 className="text-white font-medium">Joint Venture</h4>
            <p className="text-sm text-white/60 mt-1">Formal JV for large projects</p>
          </button>
          <button className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left">
            <FileText className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="text-white font-medium">Capacity Building</h4>
            <p className="text-sm text-white/60 mt-1">Mentorship and skill transfer focus</p>
          </button>
        </div>
      </GlassPanel>
    </div>
  )
  
  const renderManageConsortiums = () => (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            Active Consortiums
          </h3>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
            3 Active
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-medium">Northern Tech Alliance</h4>
                <p className="text-sm text-white/60">You + Eagle Engineering + Northern Construction</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-white/60">Projects Won</p>
                <p className="text-white font-medium">5</p>
              </div>
              <div>
                <p className="text-white/60">Total Value</p>
                <p className="text-white font-medium">$12.3M</p>
              </div>
              <div>
                <p className="text-white/60">Success Rate</p>
                <p className="text-green-400 font-medium">87%</p>
              </div>
              <div>
                <p className="text-white/60">Next Bid</p>
                <p className="text-white font-medium">Apr 15</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-white/5 text-white/60 rounded hover:bg-white/10 transition-colors text-sm">
                View Details
              </button>
              <button className="flex-1 py-2 bg-white/5 text-white/60 rounded hover:bg-white/10 transition-colors text-sm">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Team Chat
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">87%</span>
          </div>
          <p className="text-white font-medium">Win Rate</p>
          <p className="text-sm text-white/60">In consortiums vs 62% solo</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">3.2x</span>
          </div>
          <p className="text-white font-medium">Avg Contract Size</p>
          <p className="text-sm text-white/60">Compared to solo bids</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">12</span>
          </div>
          <p className="text-white font-medium">Partner Network</p>
          <p className="text-sm text-white/60">Trusted collaborators</p>
        </GlassPanel>
      </div>
    </div>
  )
  
  return (
    <div className="max-w-7xl mx-auto">
      <GlassPanel className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Handshake className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Consortium Builder
              </h2>
              <p className="text-sm text-white/60">
                Team up to win bigger contracts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-white/60">Community First</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-white/60">Verified Partners</span>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('find')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'find'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Find Partners
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Create Consortium
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'manage'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Manage
          </button>
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'find' && renderFindPartners()}
            {activeTab === 'create' && renderCreateConsortium()}
            {activeTab === 'manage' && renderManageConsortiums()}
          </motion.div>
        </AnimatePresence>
      </GlassPanel>
      
      {/* Partner Details Modal */}
      <AnimatePresence>
        {showPartnerDetails && selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPartnerDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    Partner Details
                  </h3>
                  <button
                    onClick={() => setShowPartnerDetails(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Business Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                      {selectedBusiness.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-white">
                        {selectedBusiness.name}
                      </h4>
                      <p className="text-white/60">{selectedBusiness.location}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white">{selectedBusiness.rating}</span>
                        </div>
                        <span className="text-white/60">•</span>
                        <span className="text-white/60">{selectedBusiness.employees} employees</span>
                        <span className="text-white/60">•</span>
                        <span className="text-white/60">{selectedBusiness.revenue} revenue</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Match Analysis */}
                  {selectedBusiness.matchScore && (
                    <div className="p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-green-400 font-medium">Match Analysis</h5>
                        <span className="text-2xl font-bold text-green-400">
                          {selectedBusiness.matchScore}% Match
                        </span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {selectedBusiness.complementarySkills?.map((skill, i) => (
                          <li key={i} className="flex items-start gap-2 text-white/80">
                            <Check className="w-4 h-4 text-green-400 mt-0.5" />
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Capabilities & Certifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-white font-medium mb-3">Capabilities</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.capabilities.map(cap => (
                          <span key={cap} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-3">Certifications</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.certifications.map(cert => (
                          <span key={cert} className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <GlassButton className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </GlassButton>
                    <GlassButton variant="primary" className="flex-1">
                      <Handshake className="w-4 h-4 mr-2" />
                      Propose Partnership
                    </GlassButton>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}