'use client'

import React from 'react'
import { 
  Briefcase, Clock, DollarSign, Users, FileText, CheckCircle,
  AlertTriangle, Calendar, TrendingUp, BarChart3, Target, Zap
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface ProjectManagerDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  name: string
  company: string
}

export function ProjectManagerDashboard({ experience, name, company }: ProjectManagerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* PM Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {name || 'Sarah Mitchell, PMP'}
            </h1>
            <p className="text-white/60">
              Senior Project Manager • {company || 'Infrastructure Canada'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Active Projects</p>
            <p className="text-2xl font-bold text-white">8</p>
            <p className="text-sm text-green-400">$12.4M total value</p>
          </div>
        </div>
      </GlassPanel>

      {/* Project Portfolio Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">On Track</p>
          <p className="text-xl font-bold text-white">5</p>
          <p className="text-xs text-white/40">63% of portfolio</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm text-white/60">At Risk</p>
          <p className="text-xl font-bold text-white">2</p>
          <p className="text-xs text-white/40">Need attention</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Clock className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-sm text-white/60">Behind Schedule</p>
          <p className="text-xl font-bold text-white">1</p>
          <p className="text-xs text-white/40">Recovery plan active</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <DollarSign className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Budget Health</p>
          <p className="text-xl font-bold text-white">92%</p>
          <p className="text-xs text-green-400">Under budget</p>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/projects/status-update">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <FileText className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Update Status</p>
          </GlassPanel>
        </Link>
        <Link href="/vendors/evaluate">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Users className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Evaluate Vendors</p>
          </GlassPanel>
        </Link>
        <Link href="/projects/timeline">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Calendar className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">View Timeline</p>
          </GlassPanel>
        </Link>
        <Link href="/reports/generate">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <BarChart3 className="w-8 h-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Reports</p>
          </GlassPanel>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects */}
        <GlassPanel className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Priority Projects</h3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Northern Highway Extension</h4>
                  <p className="text-sm text-white/60 mt-1">Phase 3 - Indigenous community access road</p>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">72%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: '72%' }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-white/60">Budget: <span className="text-white">$3.2M</span></span>
                    <span className="text-white/60">Vendor: <span className="text-blue-400">Eagle Construction</span></span>
                    <span className="text-white/60">Due: <span className="text-white">May 15</span></span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  On Track
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg border border-yellow-400/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Water Treatment Facility</h4>
                  <p className="text-sm text-white/60 mt-1">Equipment installation - Weather delays</p>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">45%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-white/60">Budget: <span className="text-white">$5.1M</span></span>
                    <span className="text-white/60">Vendor: <span className="text-blue-400">Northern Waters Ltd</span></span>
                    <span className="text-white/60">Due: <span className="text-yellow-400">June 30</span></span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  At Risk
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Vendor Performance */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Vendors</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Eagle Construction</p>
                <p className="text-white/60 text-xs">Indigenous-owned • 98% on-time</p>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 h-6 rounded-full ${
                    i <= 5 ? 'bg-green-400' : 'bg-white/20'
                  }`} />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Northern Waters Ltd</p>
                <p className="text-white/60 text-xs">Local hire 85% • 4 projects</p>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 h-6 rounded-full ${
                    i <= 4 ? 'bg-blue-400' : 'bg-white/20'
                  }`} />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">TechNation Inc</p>
                <p className="text-white/60 text-xs">IT specialist • Under budget</p>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 h-6 rounded-full ${
                    i <= 4 ? 'bg-blue-400' : 'bg-white/20'
                  }`} />
                ))}
              </div>
            </div>
          </div>
          
          <Link href="/vendors" className="block mt-4">
            <GlassButton variant="secondary" size="sm" className="w-full">
              View All Vendors
            </GlassButton>
          </Link>
        </GlassPanel>
      </div>

      {/* Upcoming Milestones */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Upcoming Milestones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">Site Inspection</p>
                <p className="text-white/60 text-xs">Highway Extension - April 5</p>
                <p className="text-white/40 text-xs mt-1">Elder blessing ceremony included</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">Progress Report Due</p>
                <p className="text-white/60 text-xs">Q1 Summary - April 10</p>
                <p className="text-white/40 text-xs mt-1">Include Indigenous employment metrics</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">Vendor Review Meeting</p>
                <p className="text-white/60 text-xs">Performance evaluation - April 15</p>
                <p className="text-white/40 text-xs mt-1">With community representatives</p>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Advanced Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Analysis</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Weather delays</span>
                <span className="text-yellow-400">Medium risk</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Supply chain</span>
                <span className="text-green-400">Low risk</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Labor shortage</span>
                <span className="text-orange-400">Medium risk</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Budget overrun</span>
                <span className="text-green-400">Low risk</span>
              </div>
            </div>
          </GlassPanel>
          
          {experience === 'advanced' && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                AI Recommendations
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">• Accelerate Phase 3 by parallel tasking</p>
                <p className="text-white/80">• Add 2 more Indigenous subcontractors</p>
                <p className="text-white/80">• Pre-order winter materials now</p>
                <p className="text-white/80">• Schedule elder consultations early</p>
              </div>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  )
}