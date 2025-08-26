// Mentorship Portal Component
// Connect experienced entrepreneurs with emerging businesses

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Users, Calendar, MessageSquare, Target,
  Award, Clock, CheckCircle, Star, Search, Filter,
  ChevronRight, Video, Phone, Mail, Globe, Shield,
  Briefcase, TrendingUp, Heart, Sparkles, User,
  BookOpen, BarChart3, Zap, Coffee, Mountain
} from 'lucide-react'
import { Mentorship, MentorshipProgram, MentorshipStatus } from '../types/community.types'

interface Mentor {
  id: string
  name: string
  title: string
  company: string
  nation: string
  expertise: string[]
  experience: string
  bio: string
  photoUrl?: string
  rating: number
  totalMentees: number
  successStories: number
  availability: {
    programs: MentorshipProgram[]
    hours: string
    timezone: string
    preferredMeeting: 'video' | 'phone' | 'message'
  }
  badges: string[]
}

export function MentorshipPortal() {
  const [activeTab, setActiveTab] = useState<'find' | 'my-mentorships' | 'become'>('find')
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<MentorshipProgram | null>(null)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all')

  // Mock mentors
  const mentors: Mentor[] = [
    {
      id: 'mentor-1',
      name: 'Lisa White Feather',
      title: 'CEO & Founder',
      company: 'Indigenous Tech Solutions',
      nation: 'Mohawk Nation',
      expertise: ['Technology', 'Government Contracts', 'Scaling Business'],
      experience: '15+ years',
      bio: 'Lisa has grown her tech company from 2 to 50 employees, winning major government contracts. She specializes in helping Indigenous businesses navigate procurement.',
      rating: 4.9,
      totalMentees: 32,
      successStories: 28,
      availability: {
        programs: ['quick_connect', 'short_term', 'standard'],
        hours: 'Evenings & weekends',
        timezone: 'EST',
        preferredMeeting: 'video'
      },
      badges: ['Top Mentor 2023', 'Procurement Expert', 'Community Leader']
    },
    {
      id: 'mentor-2',
      name: 'Robert Standing Bear',
      title: 'Business Development Director',
      company: 'First Nations Construction Group',
      nation: 'Cree Nation',
      expertise: ['Construction', 'Project Management', 'Joint Ventures'],
      experience: '20+ years',
      bio: 'Robert has led over $100M in construction projects and specializes in forming successful partnerships between Indigenous and non-Indigenous businesses.',
      rating: 4.8,
      totalMentees: 45,
      successStories: 38,
      availability: {
        programs: ['standard', 'extended', 'peer_circle'],
        hours: 'Flexible schedule',
        timezone: 'CST',
        preferredMeeting: 'phone'
      },
      badges: ['Veteran Mentor', 'Partnership Builder', 'Industry Expert']
    },
    {
      id: 'mentor-3',
      name: 'Sarah Cardinal',
      title: 'Financial Advisor',
      company: 'Indigenous Wealth Management',
      nation: 'Mi\'kmaq',
      expertise: ['Financial Planning', 'Grant Writing', 'Investment'],
      experience: '12+ years',
      bio: 'Sarah helps Indigenous businesses secure funding and manage finances for sustainable growth. Expert in government grants and impact investment.',
      rating: 5.0,
      totalMentees: 27,
      successStories: 24,
      availability: {
        programs: ['quick_connect', 'short_term'],
        hours: 'Business hours',
        timezone: 'AST',
        preferredMeeting: 'video'
      },
      badges: ['Finance Expert', 'Grant Specialist', '100% Success Rate']
    }
  ]

  // Mock active mentorships
  const activeMentorships: Mentorship[] = [
    {
      id: 'ment-1',
      mentorId: 'mentor-1',
      mentorName: 'Lisa White Feather',
      menteeId: 'user-1',
      menteeName: 'John Smith',
      programType: 'standard',
      status: 'active',
      startDate: '2024-01-01',
      goals: [
        {
          id: 'goal-1',
          goal: 'Win first government contract',
          targetDate: '2024-06-01',
          status: 'in_progress',
          progress: 60
        }
      ],
      sessions: [],
      feedback: [],
      matchScore: 92,
      matchReason: ['Industry alignment', 'Geographic proximity', 'Goal compatibility']
    }
  ]

  const programInfo = {
    quick_connect: {
      name: 'Quick Connect',
      duration: 'One-time session',
      description: 'Single 1-hour session for specific questions',
      icon: Zap,
      color: 'amber'
    },
    short_term: {
      name: 'Short Term',
      duration: '3 months',
      description: 'Weekly sessions for focused goals',
      icon: Clock,
      color: 'blue'
    },
    standard: {
      name: 'Standard',
      duration: '6 months',
      description: 'Bi-weekly sessions for comprehensive growth',
      icon: Target,
      color: 'emerald'
    },
    extended: {
      name: 'Extended',
      duration: '12 months',
      description: 'Monthly sessions for long-term transformation',
      icon: TrendingUp,
      color: 'purple'
    },
    peer_circle: {
      name: 'Peer Circle',
      duration: 'Ongoing',
      description: 'Group mentoring with 4-6 peers',
      icon: Users,
      color: 'pink'
    }
  }

  const filteredMentors = mentors.filter(mentor => {
    if (searchTerm && !mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !mentor.expertise.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    if (expertiseFilter !== 'all' && !mentor.expertise.includes(expertiseFilter)) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md 
        border border-amber-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <GraduationCap className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mentorship Program</h2>
              <p className="text-white/70">Learn from experienced Indigenous entrepreneurs</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <Mountain className="w-6 h-6 text-amber-400/40" />
            <Coffee className="w-6 h-6 text-orange-400/40" />
            <Sparkles className="w-6 h-6 text-yellow-400/40" />
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-amber-400" />
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">127</p>
          <p className="text-white/60 text-sm">Active Mentors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">892</p>
          <p className="text-white/60 text-sm">Success Stories</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-emerald-300">+45%</span>
          </div>
          <p className="text-2xl font-bold text-white">$12M</p>
          <p className="text-white/60 text-sm">Contracts Won</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">4.8</p>
          <p className="text-white/60 text-sm">Avg Rating</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['find', 'my-mentorships', 'become'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab === 'find' && 'Find a Mentor'}
            {tab === 'my-mentorships' && 'My Mentorships'}
            {tab === 'become' && 'Become a Mentor'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'find' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search and Filter */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or expertise..."
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <select
                  value={expertiseFilter}
                  onChange={(e) => setExpertiseFilter(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="all" className="bg-gray-800">All Expertise</option>
                  <option value="Technology" className="bg-gray-800">Technology</option>
                  <option value="Construction" className="bg-gray-800">Construction</option>
                  <option value="Financial Planning" className="bg-gray-800">Financial Planning</option>
                  <option value="Government Contracts" className="bg-gray-800">Government Contracts</option>
                  <option value="Project Management" className="bg-gray-800">Project Management</option>
                </select>

                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                  border-white/20 rounded-lg text-white transition-colors 
                  flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>More Filters</span>
                </button>
              </div>
            </div>

            {/* Mentor Programs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(programInfo).map(([key, info]) => {
                const Icon = info.icon
                return (
                  <div
                    key={key}
                    className={`bg-${info.color}-500/10 border border-${info.color}-400/30 
                      rounded-lg p-3 text-center`}
                  >
                    <Icon className={`w-6 h-6 text-${info.color}-400 mx-auto mb-2`} />
                    <p className="text-white text-sm font-medium">{info.name}</p>
                    <p className="text-white/60 text-xs">{info.duration}</p>
                  </div>
                )
              })}
            </div>

            {/* Mentors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor, index) => (
                <motion.div
                  key={mentor.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                    hover:bg-white/15 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 
                        rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{mentor.name}</h3>
                        <p className="text-amber-300 text-sm">{mentor.title}</p>
                        <p className="text-white/60 text-xs">{mentor.company}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-white text-sm">{mentor.rating}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Nation</p>
                    <p className="text-white/80">{mentor.nation}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {mentor.expertise.map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-4 line-clamp-3">{mentor.bio}</p>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{mentor.totalMentees}</p>
                      <p className="text-white/60 text-xs">Mentees</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{mentor.successStories}</p>
                      <p className="text-white/60 text-xs">Success</p>
                    </div>
                    <div>
                      <p className="text-white text-sm">{mentor.experience}</p>
                      <p className="text-white/60 text-xs">Experience</p>
                    </div>
                  </div>

                  {mentor.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {mentor.badges.map(badge => (
                        <span
                          key={badge}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs 
                            rounded-full flex items-center space-x-1"
                        >
                          <Award className="w-3 h-3" />
                          <span>{badge}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedMentor(mentor)}
                    className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 
                      border border-amber-400/50 rounded-lg text-amber-200 transition-colors
                      flex items-center justify-center space-x-2"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'my-mentorships' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {activeMentorships.map((mentorship) => (
              <div
                key={mentorship.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Mentorship with {mentorship.mentorName}
                    </h3>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                        {programInfo[mentorship.programType].name}
                      </span>
                      <span className="text-white/60">
                        Started {new Date(mentorship.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full capitalize">
                    {mentorship.status}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Goals</h4>
                    {mentorship.goals.map(goal => (
                      <div key={goal.id} className="bg-white/5 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/80">{goal.goal}</p>
                          <span className="text-white/60 text-sm">
                            Due {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                      border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                      flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Schedule Session</span>
                    </button>
                    <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                      border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                      flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-6 text-center">
              <GraduationCap className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Find Your Mentor</h3>
              <p className="text-white/70 mb-4">
                Connect with experienced entrepreneurs who can guide your journey
              </p>
              <button
                onClick={() => setActiveTab('find')}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 
                  border border-amber-400/50 rounded-lg text-amber-200 transition-colors"
              >
                Browse Mentors
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'become' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md 
              border border-purple-400/30 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Heart className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Give Back to Your Community</h3>
                  <p className="text-white/70">Share your knowledge and help others succeed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <Award className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Recognition</p>
                  <p className="text-white/60 text-sm">Earn badges and community respect</p>
                </div>
                <div className="text-center">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Network</p>
                  <p className="text-white/60 text-sm">Connect with emerging businesses</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Impact</p>
                  <p className="text-white/60 text-sm">Help grow the Indigenous economy</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Mentor Requirements</h4>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-white">5+ years of business experience</p>
                    <p className="text-white/60 text-sm">
                      Proven track record in your industry
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-white">Active Indigenous business owner or leader</p>
                    <p className="text-white/60 text-sm">
                      Currently running or leading a verified business
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-white">Commitment to community growth</p>
                    <p className="text-white/60 text-sm">
                      Minimum 2 hours per month availability
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-white">Background check and references</p>
                    <p className="text-white/60 text-sm">
                      Ensuring safe and trusted relationships
                    </p>
                  </div>
                </li>
              </ul>

              <button
                onClick={() => setShowApplicationModal(true)}
                className="w-full mt-6 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                  flex items-center justify-center space-x-2"
              >
                <Shield className="w-5 h-5" />
                <span>Apply to Become a Mentor</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mentor Profile Modal */}
      <AnimatePresence>
        {selectedMentor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMentor(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 
                    rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white">{selectedMentor.name}</h3>
                    <p className="text-amber-300">{selectedMentor.title}</p>
                    <p className="text-white/60">{selectedMentor.company}</p>
                    <p className="text-white/60 text-sm mt-1">{selectedMentor.nation}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedMentor(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white/60 rotate-90" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="text-2xl font-bold text-white">{selectedMentor.rating}</span>
                    </div>
                    <p className="text-white/60 text-sm">Rating</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-white">{selectedMentor.totalMentees}</p>
                    <p className="text-white/60 text-sm">Total Mentees</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-white">{selectedMentor.successStories}</p>
                    <p className="text-white/60 text-sm">Success Stories</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">About</h4>
                  <p className="text-white/80">{selectedMentor.bio}</p>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Areas of Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMentor.expertise.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Available Programs</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedMentor.availability.programs.map(program => {
                      const info = programInfo[program]
                      const Icon = info.icon
                      return (
                        <button
                          key={program}
                          onClick={() => setSelectedProgram(program)}
                          className={`p-3 rounded-lg border transition-all text-left
                            ${selectedProgram === program
                              ? `bg-${info.color}-500/20 border-${info.color}-400/50`
                              : 'bg-white/10 border-white/20 hover:bg-white/15'}`}
                        >
                          <Icon className={`w-5 h-5 text-${info.color}-400 mb-2`} />
                          <p className="text-white font-medium">{info.name}</p>
                          <p className="text-white/60 text-sm">{info.duration}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Availability</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Schedule</span>
                      <span className="text-white">{selectedMentor.availability.hours}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Timezone</span>
                      <span className="text-white">{selectedMentor.availability.timezone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Preferred Meeting</span>
                      <span className="text-white capitalize flex items-center space-x-1">
                        {selectedMentor.availability.preferredMeeting === 'video' && <Video className="w-4 h-4" />}
                        {selectedMentor.availability.preferredMeeting === 'phone' && <Phone className="w-4 h-4" />}
                        {selectedMentor.availability.preferredMeeting === 'message' && <Mail className="w-4 h-4" />}
                        <span>{selectedMentor.availability.preferredMeeting}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setSelectedMentor(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                      border-white/20 rounded-lg text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    disabled={!selectedProgram}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 
                      border border-amber-400/50 rounded-lg text-amber-200 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Request Mentorship</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}