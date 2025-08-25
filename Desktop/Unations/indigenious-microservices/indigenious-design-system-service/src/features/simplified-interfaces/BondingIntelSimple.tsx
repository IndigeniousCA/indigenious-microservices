'use client'

/**
 * BondingIntel Simple Interface
 * For surety companies: "Never miss an opportunity"
 * Shows them curated opportunities with one-click to issue bonds
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, DollarSign, Bell, Filter, CheckCircle,
  AlertCircle, Building, MapPin, Calendar, ArrowRight,
  Zap, Shield, Award, BarChart3
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { useUser } from '@/contexts/user-context'
import BondingMarketplaceService from '@/features/bonding-marketplace/services/BondingMarketplaceService'
import { toast } from 'sonner'

interface Opportunity {
  id: string
  projectName: string
  contractor: string
  contractorType: 'indigenous' | 'general'
  projectValue: number
  bondAmount: number
  location: string
  deadline: string
  riskScore: number
  profitPotential: number
  isExclusive?: boolean
}

export function BondingIntelSimple() {
  const { user } = useUser()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filter, setFilter] = useState<'all' | 'exclusive' | 'indigenous'>('all')
  const [stats, setStats] = useState({
    newToday: 12,
    totalValue: 458000000,
    avgPremium: 2.1,
    successRate: 94
  })
  
  useEffect(() => {
    loadOpportunities()
  }, [filter])
  
  const loadOpportunities = async () => {
    // In real implementation, fetch from BondingMarketplaceService
    const mockOpportunities: Opportunity[] = [
      {
        id: '1',
        projectName: 'Ring of Fire Access Road',
        contractor: 'Northern Construction Ltd.',
        contractorType: 'indigenous',
        projectValue: 285000000,
        bondAmount: 28500000,
        location: 'Northern Ontario',
        deadline: '3 days',
        riskScore: 0.15,
        profitPotential: 598500,
        isExclusive: true
      },
      {
        id: '2',
        projectName: 'LNG Pipeline - Section 4',
        contractor: 'Coastal Indigenous Services',
        contractorType: 'indigenous',
        projectValue: 125000000,
        bondAmount: 12500000,
        location: 'British Columbia',
        deadline: '5 days',
        riskScore: 0.22,
        profitPotential: 262500
      },
      {
        id: '3',
        projectName: 'Smart Grid Infrastructure',
        contractor: 'TechBuild Solutions',
        contractorType: 'general',
        projectValue: 78000000,
        bondAmount: 7800000,
        location: 'Manitoba',
        deadline: '7 days',
        riskScore: 0.18,
        profitPotential: 163800
      }
    ]
    
    // Apply filters
    let filtered = mockOpportunities
    if (filter === 'exclusive') {
      filtered = filtered.filter(o => o.isExclusive)
    } else if (filter === 'indigenous') {
      filtered = filtered.filter(o => o.contractorType === 'indigenous')
    }
    
    setOpportunities(filtered)
  }
  
  const handleIssueBond = async (opportunity: Opportunity) => {
    try {
      // In real implementation:
      // 1. Run final underwriting checks
      // 2. Generate bond documents
      // 3. Process payment
      // 4. Issue bond
      
      toast.success(
        <div>
          <p className="font-semibold">Bond Issued!</p>
          <p className="text-sm">Premium collected: ${opportunity.profitPotential.toLocaleString()}</p>
        </div>
      )
    } catch (error) {
      toast.error('Failed to issue bond')
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Good morning, Intact Insurance
        </h1>
        <p className="text-white/60">
          {stats.newToday} new opportunities matching your criteria
        </p>
      </motion.div>
      
      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Bell className="w-8 h-8 text-blue-400" />
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
              +15%
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.newToday}</p>
          <p className="text-sm text-white/60">New Today</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-400" />
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${(stats.totalValue / 1000000).toFixed(0)}M
          </p>
          <p className="text-sm text-white/60">Total Bond Value</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgPremium}%</p>
          <p className="text-sm text-white/60">Avg Premium Rate</p>
        </GlassPanel>
        
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
          <p className="text-sm text-white/60">Success Rate</p>
        </GlassPanel>
      </motion.div>
      
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 mb-6"
      >
        <Filter className="w-5 h-5 text-white/60" />
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
              : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
          }`}
        >
          All Opportunities
        </button>
        <button
          onClick={() => setFilter('exclusive')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            filter === 'exclusive'
              ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300'
              : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          Exclusive Access
        </button>
        <button
          onClick={() => setFilter('indigenous')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            filter === 'indigenous'
              ? 'bg-green-500/20 border border-green-400/50 text-green-300'
              : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          C-5 Eligible
        </button>
      </motion.div>
      
      {/* Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {opportunities.map((opp, index) => (
          <motion.div
            key={opp.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <GlassPanel className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      opp.isExclusive ? 'bg-purple-500/20' : 'bg-blue-500/20'
                    }`}>
                      <Building className={`w-6 h-6 ${
                        opp.isExclusive ? 'text-purple-400' : 'text-blue-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {opp.projectName}
                          </h3>
                          <p className="text-sm text-white/60 mb-3">
                            {opp.contractor}
                            {opp.contractorType === 'indigenous' && (
                              <span className="ml-2 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                                Indigenous-owned
                              </span>
                            )}
                          </p>
                        </div>
                        
                        {opp.isExclusive && (
                          <div className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">
                            <Zap className="w-3 h-3" />
                            Exclusive
                          </div>
                        )}
                      </div>
                      
                      {/* Key Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-white/50 mb-1">Project Value</p>
                          <p className="text-sm font-medium text-white">
                            ${(opp.projectValue / 1000000).toFixed(0)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 mb-1">Bond Amount</p>
                          <p className="text-sm font-medium text-white">
                            ${(opp.bondAmount / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 mb-1">Location</p>
                          <p className="text-sm font-medium text-white flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {opp.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 mb-1">Deadline</p>
                          <p className="text-sm font-medium text-amber-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {opp.deadline}
                          </p>
                        </div>
                      </div>
                      
                      {/* Risk & Profit */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">Risk Score:</span>
                          <div className="flex items-center gap-1">
                            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  opp.riskScore < 0.2 ? 'bg-green-500' :
                                  opp.riskScore < 0.4 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${opp.riskScore * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              opp.riskScore < 0.2 ? 'text-green-400' :
                              opp.riskScore < 0.4 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {(opp.riskScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">Est. Profit:</span>
                          <span className="text-sm font-semibold text-green-400">
                            ${opp.profitPotential.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-6 flex flex-col gap-2">
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleIssueBond(opp)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Issue Bond
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    size="sm"
                  >
                    View Details
                  </GlassButton>
                </div>
              </div>
              
              {/* AI Insights */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  AI Insights
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-400">
                    ✓ Contractor completed 12 similar projects
                  </span>
                  <span className="text-blue-400">
                    ✓ Low competition (2 other bidders)
                  </span>
                  <span className="text-purple-400">
                    ✓ Government funding secured
                  </span>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Load More */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <GlassButton variant="secondary">
          Load More Opportunities
          <ArrowRight className="w-4 h-4 ml-2" />
        </GlassButton>
      </motion.div>
    </div>
  )
}