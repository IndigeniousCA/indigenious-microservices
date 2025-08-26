'use client'

import React, { useState } from 'react'
import { 
  Home, Search, FileText, BarChart3, DollarSign, Award,
  Users, Calendar, TrendingUp, Package, AlertCircle, CheckCircle
} from 'lucide-react'
import { LiquidGlass, LiquidGlassButton, LiquidGlassCard } from '@/components/ui/LiquidGlass'
import Link from 'next/link'

interface DashboardProps {
  businessType: 'indigenous-sme' | 'indigenous-large' | 'canadian'
  experience: 'beginner' | 'intermediate' | 'advanced'
}

export function BusinessDashboard({ businessType, experience }: DashboardProps) {
  const [showAllMetrics, setShowAllMetrics] = useState(false)
  
  // Progressive content based on experience
  const getQuickActions = () => {
    const basic = [
      { label: 'Browse RFQs', icon: Search, href: '/rfqs', color: 'blue' },
      { label: 'My Bids', icon: FileText, href: '/bids', color: 'green' },
    ]
    
    if (experience === 'intermediate' || experience === 'advanced') {
      basic.push(
        { label: 'Documents', icon: Package, href: '/documents', color: 'purple' },
        { label: 'Analytics', icon: BarChart3, href: '/analytics', color: 'orange' }
      )
    }
    
    if (experience === 'advanced') {
      basic.push(
        { label: 'Vendor Network', icon: Users, href: '/vendors', color: 'pink' },
        { label: 'Financial Tools', icon: DollarSign, href: '/financial', color: 'yellow' }
      )
    }
    
    return basic
  }
  
  const getMetrics = () => {
    const metrics = [
      { label: 'Active Bids', value: '3', trend: '+2', status: 'active' },
      { label: 'Win Rate', value: '78%', trend: '+5%', status: 'good' },
    ]
    
    if (experience !== 'beginner' || showAllMetrics) {
      metrics.push(
        { label: 'Revenue YTD', value: '$245K', trend: '+12%', status: 'good' },
        { label: 'Compliance Score', value: '98%', trend: '0%', status: 'good' }
      )
    }
    
    if (experience === 'advanced' || showAllMetrics) {
      metrics.push(
        { label: 'Partner Network', value: '12', trend: '+3', status: 'active' },
        { label: 'Contract Pipeline', value: '$1.2M', trend: '+25%', status: 'good' }
      )
    }
    
    return metrics
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <LiquidGlass variant="aurora" intensity="medium" className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, TechNation Inc
            </h1>
            <p className="text-white/60">
              {businessType === 'indigenous-sme' && 'Indigenous Small Business Dashboard'}
              {businessType === 'indigenous-large' && 'Indigenous Enterprise Dashboard'}
              {businessType === 'canadian' && 'Canadian Business Partner Dashboard'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Certification Status</p>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400">Verified</span>
            </div>
          </div>
        </div>
      </LiquidGlass>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getQuickActions().map((action) => (
            <Link key={action.label} href={action.href}>
              <LiquidGlass 
                variant="clear" 
                intensity="light"
                className="p-4 hover:scale-105 transition-all cursor-pointer group"
              >
                <action.icon className={`w-8 h-8 text-${action.color}-400 mb-2 group-hover:scale-110 transition-transform`} />
                <p className="text-sm text-white">{action.label}</p>
              </LiquidGlass>
            </Link>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Key Metrics</h2>
          {experience === 'beginner' && !showAllMetrics && (
            <button
              onClick={() => setShowAllMetrics(true)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Show more metrics
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getMetrics().map((metric) => (
            <LiquidGlass 
              key={metric.label} 
              variant="frost"
              intensity="light"
              className="p-4"
            >
              <p className="text-sm text-white/60 mb-1">{metric.label}</p>
              <p className="text-xl font-bold text-white mb-1">{metric.value}</p>
              <p className={`text-sm ${
                metric.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                {metric.trend}
              </p>
            </LiquidGlass>
          ))}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Opportunities */}
        <LiquidGlassCard variant="clear" className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Active Opportunities</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">IT Infrastructure Upgrade</h4>
                    <p className="text-sm text-white/60 mt-1">Government of Canada - PSPC</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-blue-400">$125,000 - $250,000</span>
                      <span className="text-white/40">Closes in 5 days</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    In Progress
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/rfqs" className="block mt-4">
            <LiquidGlassButton className="w-full">
              View All Opportunities
            </LiquidGlassButton>
          </Link>
        </LiquidGlassCard>

        {/* Upcoming Deadlines */}
        <LiquidGlassCard variant="frost">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-400 mt-0.5" />
              <div>
                <p className="text-white text-sm">Bid Submission</p>
                <p className="text-white/60 text-xs">Tomorrow at 4:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-white text-sm">Certificate Renewal</p>
                <p className="text-white/60 text-xs">In 15 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-white text-sm">Quarterly Report</p>
                <p className="text-white/60 text-xs">In 30 days</p>
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Progressive Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LiquidGlassCard variant="clear">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Performance Insights
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">Your win rate has improved by 5% this quarter</p>
              <p className="text-white/80">Average bid response time: 2.3 days (Industry: 4.1 days)</p>
              <p className="text-white/80">Strongest category: IT Services (85% win rate)</p>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard variant="frost">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Recommendations
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-white/80">• Add ISO 27001 certification to unlock 12 more RFQs</p>
              <p className="text-white/80">• Complete your sustainability profile</p>
              <p className="text-white/80">• Join the Construction vendor network</p>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {/* Business Type Specific Features */}
      {businessType === 'canadian' && (
        <LiquidGlass variant="aurora" intensity="medium" className="p-6 border-2 border-yellow-400/50">
          <h3 className="text-lg font-semibold text-white mb-4">Partnership Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-white/60">Indigenous Content</p>
              <p className="text-xl font-bold text-yellow-400">33%</p>
              <p className="text-xs text-white/40">Minimum required</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Partner Status</p>
              <p className="text-xl font-bold text-green-400">Active</p>
              <p className="text-xs text-white/40">3 verified partners</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Next Review</p>
              <p className="text-xl font-bold text-white">Q2 2025</p>
              <p className="text-xs text-white/40">Annual verification</p>
            </div>
          </div>
        </LiquidGlass>
      )}
    </div>
  )
}