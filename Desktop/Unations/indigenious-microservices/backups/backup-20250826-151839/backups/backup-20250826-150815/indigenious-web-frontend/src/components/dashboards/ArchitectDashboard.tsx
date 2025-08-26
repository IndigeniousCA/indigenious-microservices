'use client'

import React from 'react'
import { 
  Ruler, Building, FileText, Camera, Palette, TreePine,
  Calculator, Users, Award, Clock, Shield, Zap
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface ArchitectDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  name: string
  firm: string
}

export function ArchitectDashboard({ experience, name, firm }: ArchitectDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Architect Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {name || 'David Chen, M.Arch'}
            </h1>
            <p className="text-white/60">
              Principal Architect • {firm || 'Northern Design Collaborative'}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-white/40">LEED AP • OAA Member • 15 years experience</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Active Projects</p>
            <p className="text-2xl font-bold text-white">6</p>
            <p className="text-sm text-green-400">2 with Indigenous communities</p>
          </div>
        </div>
      </GlassPanel>

      {/* Design Portfolio Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <Building className="w-6 h-6 text-indigo-400 mb-2" />
          <p className="text-sm text-white/60">Projects Completed</p>
          <p className="text-xl font-bold text-white">47</p>
          <p className="text-xs text-white/40">12 Indigenous</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <TreePine className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Sustainable Design</p>
          <p className="text-xl font-bold text-white">94%</p>
          <p className="text-xs text-white/40">LEED certified</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Award className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm text-white/60">Awards</p>
          <p className="text-xl font-bold text-white">8</p>
          <p className="text-xs text-white/40">3 for cultural design</p>
        </GlassPanel>
        
        <GlassPanel className="p-4">
          <Users className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Team Size</p>
          <p className="text-xl font-bold text-white">12</p>
          <p className="text-xs text-white/40">4 Indigenous designers</p>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/projects/new-design">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Ruler className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">New Design</p>
          </GlassPanel>
        </Link>
        <Link href="/projects/submissions">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <FileText className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Submissions</p>
          </GlassPanel>
        </Link>
        <Link href="/projects/3d-viewer">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Camera className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">3D Models</p>
          </GlassPanel>
        </Link>
        <Link href="/projects/cultural-review">
          <GlassPanel className="p-4 hover:bg-white/10 transition-all cursor-pointer group">
            <Palette className="w-8 h-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Cultural Review</p>
          </GlassPanel>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Projects */}
        <GlassPanel className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Active Design Projects</h3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg border border-purple-400/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Cree Cultural Center</h4>
                  <p className="text-sm text-white/60 mt-1">Traditional meeting space with modern amenities</p>
                  
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Phase</p>
                      <p className="text-white">Design Development</p>
                    </div>
                    <div>
                      <p className="text-white/60">Size</p>
                      <p className="text-white">12,000 sq ft</p>
                    </div>
                    <div>
                      <p className="text-white/60">Budget</p>
                      <p className="text-white">$4.5M</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                      Elder Approved
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      LEED Gold Target
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      Traditional Materials
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Northern Health Clinic</h4>
                  <p className="text-sm text-white/60 mt-1">Remote community health facility</p>
                  
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Phase</p>
                      <p className="text-white">Construction Docs</p>
                    </div>
                    <div>
                      <p className="text-white/60">Size</p>
                      <p className="text-white">8,500 sq ft</p>
                    </div>
                    <div>
                      <p className="text-white/60">Budget</p>
                      <p className="text-white">$3.2M</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Design Principles */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Cultural Design Principles
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-white text-sm mb-1">Four Directions</p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <p className="text-white text-sm mb-1">Natural Materials</p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-green-400 rounded-full" style={{ width: '95%' }} />
              </div>
            </div>
            <div>
              <p className="text-white text-sm mb-1">Community Input</p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <p className="text-white text-sm mb-1">Sacred Geometry</p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
            <p className="text-sm text-purple-400">
              All designs reviewed by Indigenous cultural advisors
            </p>
          </div>
        </GlassPanel>
      </div>

      {/* Design Tools & Resources */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Design Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-white/60 mb-2">CAD/BIM Files</p>
            <div className="space-y-2">
              <Link href="/resources/templates" className="text-sm text-blue-400 hover:text-blue-300">
                • Cultural center templates
              </Link>
              <Link href="/resources/materials" className="text-sm text-blue-400 hover:text-blue-300">
                • Traditional material library
              </Link>
              <Link href="/resources/symbols" className="text-sm text-blue-400 hover:text-blue-300">
                • Indigenous design symbols
              </Link>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Sustainability</p>
            <div className="space-y-2">
              <p className="text-sm text-white">• Passive solar optimization</p>
              <p className="text-sm text-white">• Local material sourcing</p>
              <p className="text-sm text-white">• Net-zero calculators</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-2">Compliance</p>
            <div className="space-y-2">
              <p className="text-sm text-white">• Building code updates</p>
              <p className="text-sm text-white">• Accessibility standards</p>
              <p className="text-sm text-white">• Cultural protocols</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Advanced Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cost Optimization</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Material costs vs budget</span>
                <span className="text-green-400">-8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Local supplier usage</span>
                <span className="text-white">78%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Value engineering savings</span>
                <span className="text-white">$380K</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Life-cycle cost score</span>
                <span className="text-green-400">A+</span>
              </div>
            </div>
          </GlassPanel>
          
          {experience === 'advanced' && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                AI Design Assistant
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">• Optimize for northern climate zones</p>
                <p className="text-white/80">• Generate culturally appropriate patterns</p>
                <p className="text-white/80">• Calculate embodied carbon</p>
                <p className="text-white/80">• Suggest traditional material alternatives</p>
              </div>
              <GlassButton variant="secondary" size="sm" className="mt-4">
                Launch AI Assistant
              </GlassButton>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  )
}