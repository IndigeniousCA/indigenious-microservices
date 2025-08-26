'use client'

import React, { useState } from 'react'
import { 
  Building2, Target, TrendingUp, Users, FileCheck, AlertTriangle,
  BarChart3, Calendar, Award, MapPin, DollarSign, CheckCircle2
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface GovernmentDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  department: string
}

export function GovernmentDashboard({ experience, department }: GovernmentDashboardProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')
  
  // 5% procurement target tracking
  const currentSpend = 3.2 // percentage
  const targetSpend = 5.0
  const targetProgress = (currentSpend / targetSpend) * 100
  
  const getQuickActions = () => {
    const actions = [
      { label: 'Post RFQ', icon: FileCheck, href: '/rfqs/new', color: 'blue' },
      { label: 'View Vendors', icon: Users, href: '/vendors', color: 'green' },
    ]
    
    if (experience !== 'beginner') {
      actions.push(
        { label: 'Analytics', icon: BarChart3, href: '/analytics', color: 'purple' },
        { label: 'Compliance', icon: Award, href: '/compliance', color: 'orange' }
      )
    }
    
    if (experience === 'advanced') {
      actions.push(
        { label: 'Reports', icon: FileCheck, href: '/reports', color: 'pink' },
        { label: 'Settings', icon: Building2, href: '/settings', color: 'yellow' }
      )
    }
    
    return actions
  }

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-blue-500/10 to-green-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {department || 'Public Services and Procurement Canada'}
            </h1>
            <p className="text-white/60">
              Government Procurement Dashboard
            </p>
          </div>
          <Building2 className="w-12 h-12 text-blue-400/20" />
        </div>
      </GlassPanel>

      {/* 5% Target Tracker - Always visible */}
      <GlassPanel className="p-6 border-yellow-400/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-yellow-400" />
            Indigenous Procurement Target
          </h2>
          <span className="text-sm text-white/60">Fiscal Year 2024-25</span>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Current: {currentSpend}%</span>
            <span className="text-white">Target: {targetSpend}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-1000"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-white/60">Total Contracts</p>
            <p className="text-xl font-bold text-white">$45.2M</p>
          </div>
          <div>
            <p className="text-white/60">Indigenous</p>
            <p className="text-xl font-bold text-yellow-400">$1.4M</p>
          </div>
          <div>
            <p className="text-white/60">Gap to Target</p>
            <p className="text-xl font-bold text-orange-400">$0.9M</p>
          </div>
          <div>
            <p className="text-white/60">Days Left</p>
            <p className="text-xl font-bold text-white">127</p>
          </div>
        </div>
        
        {targetProgress < 80 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
            <p className="text-sm text-yellow-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Below target pace. Consider prioritizing Indigenous vendors for upcoming contracts.
            </p>
          </div>
        )}
      </GlassPanel>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getQuickActions().map((action) => (
            <Link key={action.label} href={action.href}>
              <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
                <action.icon className={`w-8 h-8 text-${action.color}-400 mb-2 group-hover:scale-110 transition-transform`} />
                <p className="text-sm text-white">{action.label}</p>
              </GlassPanel>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active RFQs */}
        <GlassPanel className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active RFQs</h3>
            <button
              onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {viewMode === 'summary' ? 'Detailed view' : 'Summary view'}
            </button>
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">IT Infrastructure Modernization</h4>
                    <p className="text-sm text-white/60 mt-1">RFQ #2024-PSPC-{1000 + i}</p>
                    
                    {viewMode === 'detailed' && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/60">Budget:</span>
                          <span className="text-white">$250,000 - $500,000</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/60">Bids received:</span>
                          <span className="text-white">12 (7 Indigenous)</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/60">Indigenous participation:</span>
                          <span className="text-green-400">58%</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-blue-400">Closes in {5 + i} days</span>
                      {viewMode === 'summary' && (
                        <span className="text-white/40">12 bids received</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Active
                    </span>
                    {i === 1 && (
                      <div className="mt-2">
                        <CheckCircle2 className="w-4 h-4 text-yellow-400 mx-auto" />
                        <p className="text-xs text-yellow-400 mt-1">Indigenous</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Link href="/rfqs" className="block mt-4">
            <GlassButton variant="secondary" className="w-full">
              View All RFQs
            </GlassButton>
          </Link>
        </GlassPanel>

        {/* Compliance & Alerts */}
        <div className="space-y-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Compliance Alerts</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm">Quarterly Report Due</p>
                  <p className="text-white/60 text-xs">Submit Q3 Indigenous procurement report</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm">Policy Update</p>
                  <p className="text-white/60 text-xs">New accessibility requirements</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white text-sm">Certification Renewal</p>
                  <p className="text-white/60 text-xs">Department ISO certification</p>
                </div>
              </div>
            </div>
          </GlassPanel>
          
          {/* Regional Distribution */}
          {experience !== 'beginner' && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                Regional Distribution
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Atlantic</span>
                  <span className="text-white">18%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Quebec</span>
                  <span className="text-white">22%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Ontario</span>
                  <span className="text-white">35%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Prairies</span>
                  <span className="text-white">15%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">BC & North</span>
                  <span className="text-white">10%</span>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Advanced Analytics */}
      {experience === 'advanced' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Vendor Insights</h3>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">423 registered Indigenous vendors</p>
              <p className="text-white/80">67% have bid in last 90 days</p>
              <p className="text-white/80">Average contract value: $125K</p>
              <p className="text-white/80">Top sector: IT Services (34%)</p>
            </div>
          </GlassPanel>
          
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Process Efficiency</h3>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">Avg. time to award: 21 days</p>
              <p className="text-white/80">Digital submissions: 89%</p>
              <p className="text-white/80">Vendor satisfaction: 4.2/5</p>
              <p className="text-white/80">Dispute rate: 2.1%</p>
            </div>
          </GlassPanel>
          
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">• Host vendor day for remote communities</p>
              <p className="text-white/80">• Simplify RFQ templates</p>
              <p className="text-white/80">• Add French/Cree translations</p>
              <p className="text-white/80">• Increase sub-$25K contracts</p>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}