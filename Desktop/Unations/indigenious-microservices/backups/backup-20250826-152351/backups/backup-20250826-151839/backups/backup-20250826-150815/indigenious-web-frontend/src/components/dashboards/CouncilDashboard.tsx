'use client'

import React from 'react'
import { 
  Users, Building, MapPin, Calendar, FileText, DollarSign,
  Briefcase, TrendingUp, Shield, AlertCircle, Award, Heart
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface CouncilDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  councilName: string
  territory: string
}

export function CouncilDashboard({ experience, councilName, territory }: CouncilDashboardProps) {
  const memberBusinesses = 47
  const activeProjects = 12
  const communityFund = 2.3 // millions
  
  return (
    <div className="space-y-6">
      {/* Council Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {councilName || 'Cree Nation Government'}
            </h1>
            <p className="text-white/60">
              Band Council Project Dashboard • {territory || 'Eeyou Istchee'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Community Members</p>
            <p className="text-2xl font-bold text-white">3,847</p>
          </div>
        </div>
      </GlassPanel>

      {/* Community Economic Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <Users className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Member Businesses</p>
          <p className="text-xl font-bold text-white">{memberBusinesses}</p>
          <p className="text-xs text-green-400">+5 this quarter</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Briefcase className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-sm text-white/60">Active Projects</p>
          <p className="text-xl font-bold text-white">{activeProjects}</p>
          <p className="text-xs text-white/40">$4.2M total value</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <DollarSign className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Community Fund</p>
          <p className="text-xl font-bold text-white">${communityFund}M</p>
          <p className="text-xs text-white/40">Available for projects</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <TrendingUp className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm text-white/60">Employment Rate</p>
          <p className="text-xl font-bold text-white">78%</p>
          <p className="text-xs text-green-400">+3% YoY</p>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Project Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/projects/new">
            <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
              <FileText className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-white">Post Project</p>
            </GlassPanel>
          </Link>
          <Link href="/projects">
            <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
              <Briefcase className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-white">View Projects</p>
            </GlassPanel>
          </Link>
          <Link href="/businesses">
            <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
              <Users className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-white">Local Vendors</p>
            </GlassPanel>
          </Link>
          <Link href="/reports">
            <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
              <Award className="w-8 h-8 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-white">Reports</p>
            </GlassPanel>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Projects */}
        <GlassPanel className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Current Community Projects</h3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">Community Center Renovation</h4>
                  <p className="text-sm text-white/60 mt-1">Phase 2 - Interior upgrades</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-400">$450,000</span>
                    <span className="text-white/40">3 local contractors bidding</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Evaluation
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">Elder Care Facility Expansion</h4>
                  <p className="text-sm text-white/60 mt-1">Adding 20 new units</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-400">$1.2M</span>
                    <span className="text-white/40">Construction starting Q2</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  Approved
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">Traditional Crafts Workshop</h4>
                  <p className="text-sm text-white/60 mt-1">Youth skills development program</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-400">$75,000</span>
                    <span className="text-white/40">Seeking instructors</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  Planning
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Community Priorities */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Community Priorities
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">Housing</span>
                <span className="text-white/60">85%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-red-400 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">Healthcare</span>
                <span className="text-white/60">78%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">Education</span>
                <span className="text-white/60">72%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-green-400 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">Infrastructure</span>
                <span className="text-white/60">65%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Cultural Considerations */}
      <GlassPanel className="p-6 border-purple-400/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Cultural Calendar & Considerations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-white/60 mb-2">Upcoming Ceremonies</p>
            <div className="space-y-2">
              <p className="text-sm text-white">• Spring Ceremony - April 15-18</p>
              <p className="text-sm text-white">• Goose Break - April 22-29</p>
              <p className="text-sm text-orange-400">⚠️ No meetings during these periods</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Elder Advisory</p>
            <div className="space-y-2">
              <p className="text-sm text-white">Council meets Tuesdays</p>
              <p className="text-sm text-white">4 elders on project committee</p>
              <p className="text-sm text-green-400">✓ All projects elder-approved</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Language Support</p>
            <div className="space-y-2">
              <p className="text-sm text-white">Cree: Primary (85%)</p>
              <p className="text-sm text-white">English: Secondary (95%)</p>
              <p className="text-sm text-white">French: Available (40%)</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Advanced Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Economic Impact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Jobs created this year</span>
                <span className="text-white">127</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Local procurement rate</span>
                <span className="text-green-400">82%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Youth employed</span>
                <span className="text-white">43</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Revenue to community</span>
                <span className="text-white">$8.7M</span>
              </div>
            </div>
          </GlassPanel>
          
          {experience === 'advanced' && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sustainability Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Green projects</span>
                  <span className="text-white">7 of 12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Traditional methods used</span>
                  <span className="text-purple-400">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Land impact assessment</span>
                  <span className="text-green-400">Completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Carbon neutral target</span>
                  <span className="text-white">2030</span>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  )
}