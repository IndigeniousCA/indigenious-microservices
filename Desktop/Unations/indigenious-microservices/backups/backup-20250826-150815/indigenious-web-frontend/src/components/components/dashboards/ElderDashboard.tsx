'use client'

import React from 'react'
import { 
  Heart, Calendar, Users, Shield, TreePine, BookOpen,
  AlertCircle, CheckCircle, Star, Feather, Sun, Moon
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import Link from 'next/link'

interface ElderDashboardProps {
  experience: 'beginner' | 'intermediate' | 'advanced'
  name: string
  community: string
}

export function ElderDashboard({ experience, name, community }: ElderDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Elder Header */}
      <GlassPanel className="p-6 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-purple-400/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <Feather className="w-8 h-8 text-purple-400" />
              {name || 'Elder Mary Whiteduck'}
            </h1>
            <p className="text-white/60">
              Cultural Advisor • {community || 'Kitigan Zibi Anishinabeg'}
            </p>
            <p className="text-sm text-purple-300 mt-2">
              Guiding the path between tradition and progress
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Years of Wisdom</p>
            <p className="text-2xl font-bold text-purple-400">42</p>
          </div>
        </div>
      </GlassPanel>

      {/* Sacred Oversight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4 border-purple-400/30">
          <Shield className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-sm text-white/60">Projects Reviewed</p>
          <p className="text-xl font-bold text-white">23</p>
          <p className="text-xs text-green-400">All culturally aligned</p>
        </GlassPanel>
        
        <GlassPanel className="p-4 border-purple-400/30">
          <Calendar className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-sm text-white/60">Ceremonies Protected</p>
          <p className="text-xl font-bold text-white">8</p>
          <p className="text-xs text-white/40">This season</p>
        </GlassPanel>
        
        <GlassPanel className="p-4 border-purple-400/30">
          <Users className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Youth Mentored</p>
          <p className="text-xl font-bold text-white">34</p>
          <p className="text-xs text-white/40">Active learners</p>
        </GlassPanel>
        
        <GlassPanel className="p-4 border-purple-400/30">
          <TreePine className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-sm text-white/60">Land Protected</p>
          <p className="text-xl font-bold text-white">100%</p>
          <p className="text-xs text-green-400">Sacred sites safe</p>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/cultural-review">
          <GlassPanel className="p-4 hover:bg-purple-500/10 transition-all cursor-pointer group border-purple-400/30">
            <BookOpen className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Review Projects</p>
          </GlassPanel>
        </Link>
        <Link href="/ceremony-calendar">
          <GlassPanel className="p-4 hover:bg-purple-500/10 transition-all cursor-pointer group border-purple-400/30">
            <Sun className="w-8 h-8 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Sacred Calendar</p>
          </GlassPanel>
        </Link>
        <Link href="/teachings">
          <GlassPanel className="p-4 hover:bg-purple-500/10 transition-all cursor-pointer group border-purple-400/30">
            <Heart className="w-8 h-8 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">Share Teachings</p>
          </GlassPanel>
        </Link>
        <Link href="/ai-governance">
          <GlassPanel className="p-4 hover:bg-purple-500/10 transition-all cursor-pointer group border-purple-400/30">
            <Shield className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-white">AI Oversight</p>
          </GlassPanel>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Requiring Guidance */}
        <GlassPanel className="p-6 lg:col-span-2 border-purple-400/30">
          <h3 className="text-lg font-semibold text-white mb-4">Projects Requiring Cultural Guidance</h3>
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-400/30">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">Cree Cultural Center Design</h4>
                  <p className="text-sm text-white/60 mt-1">Architect seeks guidance on sacred geometry</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-purple-400">David Chen, Northern Design</span>
                    <span className="text-white/40">Submitted 2 days ago</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Pending Review
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">AI Model for Language Preservation</h4>
                  <p className="text-sm text-white/60 mt-1">Ensure respectful use of traditional stories</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-400">Tech Team</span>
                    <span className="text-white/40">Scheduled for tomorrow</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  Scheduled
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">Spring Ceremony Site Protection</h4>
                  <p className="text-sm text-white/60 mt-1">Construction timing near sacred grounds</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-400">Infrastructure Canada</span>
                    <span className="text-white/40">Reviewed & approved</span>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  Approved
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Sacred Calendar */}
        <GlassPanel className="p-6 border-purple-400/30">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" />
            Sacred Times
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-purple-500/10 rounded border border-purple-400/30">
              <p className="text-white text-sm font-medium">Spring Ceremony</p>
              <p className="text-white/60 text-xs">April 15-18</p>
              <p className="text-purple-400 text-xs mt-1">⚠️ No business during this time</p>
            </div>
            
            <div className="p-3 bg-white/5 rounded">
              <p className="text-white text-sm font-medium">Full Moon Gathering</p>
              <p className="text-white/60 text-xs">April 23</p>
              <p className="text-white/40 text-xs mt-1">Evening ceremony</p>
            </div>
            
            <div className="p-3 bg-white/5 rounded">
              <p className="text-white text-sm font-medium">Elder Council</p>
              <p className="text-white/60 text-xs">Every Tuesday</p>
              <p className="text-white/40 text-xs mt-1">9 AM - Traditional time</p>
            </div>
          </div>
          
          <Link href="/ceremony-calendar" className="block mt-4">
            <GlassButton variant="secondary" size="sm" className="w-full">
              View Full Calendar
            </GlassButton>
          </Link>
        </GlassPanel>
      </div>

      {/* Cultural Principles Dashboard */}
      <GlassPanel className="p-6 border-purple-400/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Seven Sacred Teachings in Business
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {[
            { teaching: 'Love', symbol: '❤️', application: 'Community care in all decisions' },
            { teaching: 'Respect', symbol: '🤝', application: 'Honor all stakeholders' },
            { teaching: 'Courage', symbol: '🦅', application: 'Stand for what is right' },
            { teaching: 'Honesty', symbol: '🦞', application: 'Transparent business practices' },
            { teaching: 'Wisdom', symbol: '🦉', application: 'Learn from elders and youth' },
            { teaching: 'Humility', symbol: '🌾', application: 'Success serves community' },
            { teaching: 'Truth', symbol: '☀️', application: 'Align with natural law' }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{item.symbol}</div>
              <p className="text-white font-medium text-sm">{item.teaching}</p>
              <p className="text-white/60 text-xs mt-1">{item.application}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Advanced Features */}
      {experience !== 'beginner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel className="p-6 border-purple-400/30">
            <h3 className="text-lg font-semibold text-white mb-4">Cultural Impact Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Projects aligned with teachings</span>
                <span className="text-purple-400">100%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Sacred sites protected</span>
                <span className="text-green-400">All</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Youth engaged in culture</span>
                <span className="text-white">78%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Language preservation</span>
                <span className="text-white">Active</span>
              </div>
            </div>
          </GlassPanel>
          
          {experience === 'advanced' && (
            <GlassPanel className="p-6 border-purple-400/30">
              <h3 className="text-lg font-semibold text-white mb-4">AI Ethics Oversight</h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">• 3 AI models under review</p>
                <p className="text-white/80">• Sacred data exclusion verified</p>
                <p className="text-white/80">• Ceremony awareness implemented</p>
                <p className="text-white/80">• Community benefit confirmed</p>
              </div>
              <Link href="/admin/ai-governance">
                <GlassButton variant="secondary" size="sm" className="mt-4">
                  Review AI Systems
                </GlassButton>
              </Link>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  )
}