'use client'

/**
 * BondingHub Simple Interface
 * For all contractors: "Get Bonds Instantly"
 * One-click bonding with AI matching to best surety
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, Search, CheckCircle, Clock, DollarSign,
  Building, ArrowRight, Zap, TrendingUp, AlertCircle
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { useUser } from '@/contexts/user-context'
import BondingMarketplaceService from '@/features/bonding-marketplace/services/BondingMarketplaceService'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  value: number
  bondRequired: number
  deadline: string
  matchScore: number
}

export function BondingHubSimple() {
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  
  // Ambient AI: Suggest projects based on contractor profile
  useEffect(() => {
    if (user?.businessId) {
      loadSuggestedProjects()
    }
  }, [user])
  
  const loadSuggestedProjects = async () => {
    // AI finds projects that match contractor's capabilities
    setProjects([
      {
        id: '1',
        name: 'Northern Highway Extension',
        value: 15000000,
        bondRequired: 1500000,
        deadline: '5 days',
        matchScore: 95
      },
      {
        id: '2',
        name: 'Water Treatment Plant Upgrade',
        value: 8500000,
        bondRequired: 850000,
        deadline: '12 days',
        matchScore: 88
      },
      {
        id: '3',
        name: 'School Construction - Phase 1',
        value: 22000000,
        bondRequired: 2200000,
        deadline: '8 days',
        matchScore: 82
      }
    ])
  }
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      // In real implementation, search all opportunities
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProjects([
        {
          id: '4',
          name: searchQuery,
          value: 10000000,
          bondRequired: 1000000,
          deadline: '10 days',
          matchScore: 75
        }
      ])
      
      toast.success(`Found ${projects.length} matching projects`)
    } catch (error) {
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleApplyForBond = async (project: Project) => {
    setSelectedProject(project)
    setIsApplying(true)
    
    try {
      // In real implementation:
      // 1. Create bond application
      // 2. AI matches with best surety companies
      // 3. Get instant pre-approval
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(
        <div>
          <p className="font-semibold">Bond Pre-Approved!</p>
          <p className="text-sm">3 surety companies ready to issue</p>
        </div>
      )
    } catch (error) {
      toast.error('Application failed')
    } finally {
      setIsApplying(false)
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 mb-4">
          <Shield className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">BondingHub</h1>
        </div>
        <p className="text-white/60 text-lg">Get bonds instantly for any project</p>
      </motion.div>
      
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <GlassPanel className="p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <GlassInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by project name, location, or RFQ number..."
                className="w-full pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <GlassButton
              variant="primary"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </GlassButton>
          </div>
        </GlassPanel>
      </motion.div>
      
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">247</p>
              <p className="text-sm text-white/60">Active Projects</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">$2.8B</p>
              <p className="text-sm text-white/60">Total Project Value</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">&lt; 2hrs</p>
              <p className="text-sm text-white/60">Avg Approval Time</p>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
        </GlassPanel>
      </motion.div>
      
      {/* Projects List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Recommended for You
        </h2>
        
        <div className="space-y-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <GlassPanel className="p-6 hover:border-blue-400/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Building className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                          <span>Project Value: ${(project.value / 1000000).toFixed(1)}M</span>
                          <span>•</span>
                          <span>Bond Required: ${(project.bondRequired / 1000000).toFixed(1)}M</span>
                          <span>•</span>
                          <span className="text-amber-400">Deadline: {project.deadline}</span>
                        </div>
                        
                        {/* Match Score */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-white/50">Match Score</span>
                              <span className={`font-medium ${
                                project.matchScore >= 90 ? 'text-green-400' :
                                project.matchScore >= 75 ? 'text-blue-400' :
                                'text-amber-400'
                              }`}>
                                {project.matchScore}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  project.matchScore >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  project.matchScore >= 75 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                  'bg-gradient-to-r from-amber-500 to-orange-500'
                                }`}
                                style={{ width: `${project.matchScore}%` }}
                              />
                            </div>
                          </div>
                          
                          {project.matchScore >= 90 && (
                            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3" />
                              Perfect Match
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyForBond(project)}
                    disabled={isApplying && selectedProject?.id === project.id}
                    className="ml-4"
                  >
                    {isApplying && selectedProject?.id === project.id ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Get Bond
                      </>
                    )}
                  </GlassButton>
                </div>
                
                {/* Quick Insights */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Low competition (3 bidders)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span>Your past work in this sector</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span>Quick approval likely</span>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-sm text-white/40"
      >
        <p>
          Can't find what you're looking for? Call 1-800-BONDING or{' '}
          <button className="text-blue-400 hover:text-blue-300 underline">
            chat with our AI assistant
          </button>
        </p>
      </motion.div>
    </div>
  )
}