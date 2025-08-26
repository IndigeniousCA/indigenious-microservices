// Community Hub Component
// Central interface for all community and governance features

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageSquare, GraduationCap, Calendar, Vote,
  BookOpen, Handshake, Award, TrendingUp, ChevronRight,
  Bell, Search, Filter, Globe, Heart, Shield, Feather,
  Building, Sparkles, BarChart3, Clock, Star
} from 'lucide-react'
import { ForumBoard } from './ForumBoard'
import { ElderCouncil } from './ElderCouncil'
import { VotingSystem } from './VotingSystem'
import { MentorshipPortal } from './MentorshipPortal'
import { KnowledgeBase } from './KnowledgeBase'
import { EventCalendar } from './EventCalendar'
import { GovernanceBoard } from './GovernanceBoard'
import { ResourceExchange } from './ResourceExchange'
import { useCommunity } from '../hooks/useCommunity'

interface CommunityHubProps {
  userId: string
  businessId: string
}

export function CommunityHub({ userId, businessId }: CommunityHubProps) {
  const { member, stats, notifications, isLoading } = useCommunity(userId, businessId)
  
  const [activeSection, setActiveSection] = useState<
    'overview' | 'forums' | 'elders' | 'voting' | 'mentorship' | 
    'knowledge' | 'events' | 'governance' | 'resources'
  >('overview')

  const sections = [
    {
      id: 'forums',
      title: 'Community Forums',
      description: 'Connect and share with fellow Indigenous businesses',
      icon: MessageSquare,
      color: 'blue',
      stats: { active: stats?.activeDiscussions || 0, label: 'Active Discussions' }
    },
    {
      id: 'elders',
      title: 'Elder Council',
      description: 'Cultural guidance and traditional wisdom',
      icon: Feather,
      color: 'purple',
      stats: { active: stats?.eldersAvailable || 0, label: 'Elders Available' }
    },
    {
      id: 'voting',
      title: 'Community Voting',
      description: 'Shape the platform through democratic decisions',
      icon: Vote,
      color: 'emerald',
      stats: { active: stats?.activeProposals || 0, label: 'Active Proposals' }
    },
    {
      id: 'mentorship',
      title: 'Mentorship Program',
      description: 'Learn from experienced Indigenous entrepreneurs',
      icon: GraduationCap,
      color: 'amber',
      stats: { active: stats?.mentorshipsActive || 0, label: 'Active Mentorships' }
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base',
      description: 'Resources, guides, and best practices',
      icon: BookOpen,
      color: 'indigo',
      stats: { active: stats?.totalResources || 0, label: 'Resources' }
    },
    {
      id: 'events',
      title: 'Community Events',
      description: 'Workshops, networking, and celebrations',
      icon: Calendar,
      color: 'pink',
      stats: { active: stats?.upcomingEvents || 0, label: 'Upcoming Events' }
    },
    {
      id: 'governance',
      title: 'Governance',
      description: 'Transparent leadership and decision-making',
      icon: Shield,
      color: 'teal',
      stats: { active: stats?.boardMembers || 0, label: 'Board Members' }
    },
    {
      id: 'resources',
      title: 'Resource Exchange',
      description: 'Share equipment, skills, and services',
      icon: Handshake,
      color: 'orange',
      stats: { active: stats?.availableResources || 0, label: 'Available Resources' }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Community Hub</h1>
                <p className="text-white/70 mt-1">
                  Connect, learn, and grow with {stats?.totalMembers || 0} Indigenous businesses
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search community..."
                  className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white placeholder-white/50 focus:outline-none focus:ring-2 
                    focus:ring-purple-400 w-64"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 bg-white/10 hover:bg-white/20 border 
                border-white/20 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-white" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 
                    text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'overview' ? (
          <>
            {/* Welcome Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md 
                border border-purple-400/30 rounded-2xl p-8 mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome back, {member?.userName}!
                  </h2>
                  <p className="text-white/80 mb-4">
                    Your contributions help strengthen our community of Indigenous entrepreneurs.
                  </p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="text-white/70">
                        Reputation: <span className="text-white font-medium">{member?.reputation || 0}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span className="text-white/70">
                        Contributions: <span className="text-white font-medium">
                          {member?.contributions.posts + member?.contributions.comments || 0}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:block">
                  <Sparkles className="w-24 h-24 text-purple-400/30" />
                </div>
              </div>
            </motion.div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-6 h-6 text-blue-400" />
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats?.totalMembers || 0}</p>
                <p className="text-white/60 text-sm">Active Members</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                  <span className="text-xs text-emerald-300">+12%</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.weeklyPosts || 0}</p>
                <p className="text-white/60 text-sm">Weekly Posts</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <GraduationCap className="w-6 h-6 text-amber-400" />
                  <Clock className="w-4 h-4 text-white/40" />
                </div>
                <p className="text-3xl font-bold text-white">{stats?.mentorshipHours || 0}</p>
                <p className="text-white/60 text-sm">Mentorship Hours</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <Handshake className="w-6 h-6 text-emerald-400" />
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats?.successfulConnections || 0}</p>
                <p className="text-white/60 text-sm">Connections Made</p>
              </motion.div>
            </div>

            {/* Community Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sections.map((section, index) => {
                const Icon = section.icon
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setActiveSection(section.id as unknown)}
                    className={`bg-white/10 backdrop-blur-md border border-white/20 
                      rounded-xl p-6 hover:bg-white/15 transition-all cursor-pointer 
                      hover:scale-105 hover:border-${section.color}-400/50`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 bg-${section.color}-500/20 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${section.color}-400`} />
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {section.title}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {section.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className={`text-${section.color}-300 text-2xl font-bold`}>
                        {section.stats.active}
                      </span>
                      <span className="text-white/60 text-xs">
                        {section.stats.label}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Community Activity</h3>
              
              <div className="space-y-4">
                {/* Mock activity items */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      <span className="font-medium">Sarah Johnson</span> posted in 
                      <span className="text-blue-300"> Procurement Tips</span>
                    </p>
                    <p className="text-white/60 text-sm">5 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      <span className="font-medium">Michael Red Eagle</span> completed mentorship with 
                      <span className="text-amber-300"> Jane Smith</span>
                    </p>
                    <p className="text-white/60 text-sm">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Vote className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      New proposal: <span className="text-emerald-300">Add Cree language support</span>
                    </p>
                    <p className="text-white/60 text-sm">Yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>
            {/* Back Button */}
            <button
              onClick={() => setActiveSection('overview')}
              className="mb-6 flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back to Overview</span>
            </button>

            {/* Section Content */}
            <AnimatePresence mode="wait">
              {activeSection === 'forums' && <ForumBoard />}
              {activeSection === 'elders' && <ElderCouncil />}
              {activeSection === 'voting' && <VotingSystem />}
              {activeSection === 'mentorship' && <MentorshipPortal />}
              {activeSection === 'knowledge' && <KnowledgeBase />}
              {activeSection === 'events' && <EventCalendar />}
              {activeSection === 'governance' && <GovernanceBoard />}
              {activeSection === 'resources' && <ResourceExchange />}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}