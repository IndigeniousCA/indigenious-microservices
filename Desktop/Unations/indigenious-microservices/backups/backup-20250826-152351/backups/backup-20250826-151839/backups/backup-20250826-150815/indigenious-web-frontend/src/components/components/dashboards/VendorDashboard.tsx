'use client'

import React from 'react'
import { 
  Package, Truck, DollarSign, Star, FileCheck, Clock,
  TrendingUp, Users, Award, BarChart3, Shield, Zap
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface VendorDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  company: string
}

export function VendorDashboard({ experience, company }: VendorDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Vendor Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {company || 'Northern Supply Co.'}
            </h1>
            <p className="text-white/60">
              Verified Vendor • Construction Materials
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${
                    i <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'
                  }`} />
                ))}
                <span className="text-sm text-white/60 ml-2">4.8 rating</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Active Since</p>
            <p className="text-xl font-bold text-white">2019</p>
            <p className="text-sm text-green-400">5 years on platform</p>
          </div>
        </div>
      </GlassPanel>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <Package className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Orders Fulfilled</p>
          <p className="text-xl font-bold text-white">243</p>
          <p className="text-xs text-green-400">+15% this quarter</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Clock className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-sm text-white/60">On-Time Delivery</p>
          <p className="text-xl font-bold text-white">96%</p>
          <p className="text-xs text-white/40">Industry avg: 87%</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Users className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Active Clients</p>
          <p className="text-xl font-bold text-white">47</p>
          <p className="text-xs text-white/40">12 government</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <DollarSign className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm text-white/60">Revenue YTD</p>
          <p className="text-xl font-bold text-white">$2.4M</p>
          <p className="text-xs text-green-400">+22% YoY</p>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/orders">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Truck className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Manage Orders</p>
          </GlassPanel>
        </Link>
        <Link href="/catalog">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Package className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Update Catalog</p>
          </GlassPanel>
        </Link>
        <Link href="/contracts">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <FileCheck className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">View Contracts</p>
          </GlassPanel>
        </Link>
        <Link href="/analytics">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <BarChart3 className="w-8 h-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Analytics</p>
          </GlassPanel>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <GlassPanel className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Concrete Mix - 500 units</h4>
                  <p className="text-sm text-white/60 mt-1">Northern Highway Extension Project</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-400">Eagle Construction</span>
                    <span className="text-white/40">Order #2024-089</span>
                    <span className="text-blue-400">$45,000</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Delivered
                  </span>
                  <p className="text-xs text-white/40 mt-1">Mar 28</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Steel Beams - Custom Order</h4>
                  <p className="text-sm text-white/60 mt-1">Cree Cultural Center</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-purple-400">Northern Design</span>
                    <span className="text-white/40">Order #2024-090</span>
                    <span className="text-blue-400">$72,000</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    In Transit
                  </span>
                  <p className="text-xs text-white/40 mt-1">ETA Apr 2</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Insulation Materials</h4>
                  <p className="text-sm text-white/60 mt-1">Elder Care Facility</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-400">Community Council</span>
                    <span className="text-white/40">Order #2024-091</span>
                    <span className="text-blue-400">$28,500</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                    Processing
                  </span>
                  <p className="text-xs text-white/40 mt-1">Ships Apr 5</p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Client Ratings */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Client Feedback</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Quality</span>
                <span className="text-white">4.9/5</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-green-400 rounded-full" style={{ width: '98%' }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Delivery</span>
                <span className="text-white">4.8/5</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '96%' }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Communication</span>
                <span className="text-white">4.7/5</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Value</span>
                <span className="text-white">4.6/5</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
            <p className="text-sm text-green-400">
              Top 10% vendor on platform
            </p>
          </div>
        </GlassPanel>
      </div>

      {/* Certifications & Compliance */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Certifications & Compliance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Award className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-white">ISO 9001</p>
            <p className="text-xs text-white/60">Quality Management</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-white">WSIB</p>
            <p className="text-xs text-white/60">Safety Certified</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-white">Indigenous</p>
            <p className="text-xs text-white/60">Partnership Verified</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-white">ESG</p>
            <p className="text-xs text-white/60">A+ Rating</p>
          </div>
        </div>
      </GlassPanel>

      {/* Advanced Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Market Insights</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Your market share</span>
                <span className="text-white">12.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Growth opportunity</span>
                <span className="text-green-400">+$1.2M potential</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Competitor avg price</span>
                <span className="text-white">+5% higher</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Demand forecast</span>
                <span className="text-green-400">↑ Strong</span>
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
                <p className="text-white/80">• Expand concrete mix offerings</p>
                <p className="text-white/80">• Partner with 2 more Indigenous firms</p>
                <p className="text-white/80">• Optimize Northern Ontario delivery</p>
                <p className="text-white/80">• Add winter-grade materials</p>
              </div>
              <GlassButton variant="secondary" size="sm" className="mt-4">
                View Full Analysis
              </GlassButton>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  )
}