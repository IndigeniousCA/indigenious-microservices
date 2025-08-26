// Governance Board Component
// Platform leadership, transparency, and decision-making

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, FileText, Calendar, ChevronRight, BarChart3,
  Gavel, Globe, Heart, TrendingUp, AlertCircle, CheckCircle,
  Clock, Eye, Download, Share, MessageSquare, Vote,
  Building, Map, Award, Target, Info, Lock
} from 'lucide-react'
import { BoardMember, Committee, BoardMeeting, Policy, GovernanceReport } from '../types/community.types'

export function GovernanceBoard() {
  const [activeTab, setActiveTab] = useState<'board' | 'committees' | 'meetings' | 'policies' | 'reports'>('board')
  const [selectedMember, setSelectedMember] = useState<BoardMember | null>(null)
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<BoardMeeting | null>(null)

  // Mock board members
  const boardMembers: BoardMember[] = [
    {
      id: 'board-1',
      userId: 'user-1',
      name: 'Chief Rebecca Morning Star',
      position: 'chair',
      region: 'Atlantic Canada',
      term: {
        startDate: '2023-01-01',
        endDate: '2025-12-31',
        termNumber: 2
      },
      bio: 'Former Chief of Membertou First Nation with 20+ years in economic development',
      committees: ['Executive', 'Finance', 'Culture'],
      photoUrl: '/images/board1.jpg'
    },
    {
      id: 'board-2',
      userId: 'user-2',
      name: 'Michael Eagle Feather',
      position: 'vice_chair',
      region: 'Western Canada',
      term: {
        startDate: '2023-01-01',
        endDate: '2025-12-31',
        termNumber: 1
      },
      bio: 'Entrepreneur and advocate for Indigenous business development',
      committees: ['Technology', 'Ethics'],
      photoUrl: '/images/board2.jpg'
    },
    {
      id: 'board-3',
      userId: 'user-3',
      name: 'Sarah White Cloud',
      position: 'treasurer',
      region: 'Central Canada',
      term: {
        startDate: '2024-01-01',
        endDate: '2026-12-31',
        termNumber: 1
      },
      bio: 'CPA with expertise in Indigenous financial governance',
      committees: ['Finance', 'Education'],
      photoUrl: '/images/board3.jpg'
    }
  ]

  // Mock committees
  const committees: Committee[] = [
    {
      id: 'comm-1',
      name: 'Technology Committee',
      mandate: 'Guide platform development and digital innovation',
      chair: 'Michael Eagle Feather',
      members: ['board-2', 'board-4', 'board-5'],
      meetingSchedule: 'Monthly, second Tuesday',
      responsibilities: [
        'Review and approve platform features',
        'Ensure data sovereignty principles',
        'Guide technology roadmap',
        'Monitor cybersecurity'
      ],
      currentProjects: ['AI Integration', 'Mobile App Development', 'Blockchain Pilot']
    },
    {
      id: 'comm-2',
      name: 'Finance Committee',
      mandate: 'Oversee financial management and sustainability',
      chair: 'Sarah White Cloud',
      members: ['board-3', 'board-1', 'board-6'],
      meetingSchedule: 'Quarterly',
      responsibilities: [
        'Budget review and approval',
        'Financial risk management',
        'Investment oversight',
        'Audit coordination'
      ],
      currentProjects: ['2024 Budget Planning', 'Revenue Model Review']
    },
    {
      id: 'comm-3',
      name: 'Culture Committee',
      mandate: 'Ensure cultural integrity and traditional values',
      chair: 'Chief Rebecca Morning Star',
      members: ['board-1', 'board-7', 'board-8'],
      meetingSchedule: 'Monthly',
      responsibilities: [
        'Cultural protocol guidance',
        'Language preservation initiatives',
        'Elder council coordination',
        'Traditional knowledge protection'
      ],
      currentProjects: ['Language Integration', 'Cultural Training Program']
    }
  ]

  // Mock meetings
  const recentMeetings: BoardMeeting[] = [
    {
      id: 'meet-1',
      date: '2024-01-15',
      type: 'regular',
      attendees: ['board-1', 'board-2', 'board-3', 'board-4', 'board-5'],
      agenda: [
        'Q4 2023 Financial Review',
        'Platform Roadmap 2024',
        'Community Feedback Review',
        'Policy Updates'
      ],
      minutes: 'Meeting minutes available...',
      decisions: [
        {
          id: 'dec-1',
          title: 'Approve 2024 Budget',
          description: 'Approved operating budget of $2.5M for 2024',
          votingRecord: {
            inFavor: ['board-1', 'board-2', 'board-3', 'board-4'],
            against: [],
            abstain: ['board-5']
          },
          passed: true,
          implementationDate: '2024-02-01'
        }
      ],
      isPublic: true,
      recordingUrl: 'https://recordings.example.com/meet-1'
    }
  ]

  // Mock policies
  const policies: Policy[] = [
    {
      id: 'pol-1',
      title: 'Community Code of Conduct',
      category: 'community',
      content: 'Detailed policy content...',
      version: '2.0',
      effectiveDate: '2023-06-01',
      approvedBy: 'Board of Directors',
      approvedDate: '2023-05-15',
      reviewDate: '2024-06-01'
    },
    {
      id: 'pol-2',
      title: 'Data Sovereignty Policy',
      category: 'platform',
      content: 'Indigenous data sovereignty principles...',
      version: '1.0',
      effectiveDate: '2023-01-01',
      approvedBy: 'Board of Directors',
      approvedDate: '2022-12-15',
      reviewDate: '2024-01-01'
    }
  ]

  const getPositionTitle = (position: string) => {
    const titles = {
      chair: 'Board Chair',
      vice_chair: 'Vice Chair',
      secretary: 'Secretary',
      treasurer: 'Treasurer',
      member: 'Board Member'
    }
    return titles[position as keyof typeof titles] || position
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-md 
        border border-teal-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-500/20 rounded-xl">
              <Shield className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Governance</h2>
              <p className="text-white/70">Transparent leadership and decision-making</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{boardMembers.length}</p>
              <p className="text-white/60">Board Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{committees.length}</p>
              <p className="text-white/60">Committees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-white/60">Transparency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Principles */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-md 
        border border-indigo-400/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Heart className="w-5 h-5 text-indigo-400" />
          <span>Our Governance Principles</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-medium">Transparency</p>
            <p className="text-white/60 text-sm">Open decisions & reporting</p>
          </div>
          <div className="text-center">
            <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-medium">Representation</p>
            <p className="text-white/60 text-sm">All regions & nations</p>
          </div>
          <div className="text-center">
            <Target className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-white font-medium">Accountability</p>
            <p className="text-white/60 text-sm">Community-driven goals</p>
          </div>
          <div className="text-center">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-medium">Excellence</p>
            <p className="text-white/60 text-sm">High standards & ethics</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg overflow-x-auto">
        {(['board', 'committees', 'meetings', 'policies', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap
              transition-all ${
                activeTab === tab
                  ? 'bg-teal-500/20 text-teal-200 border border-teal-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab === 'board' && 'Board Members'}
            {tab === 'committees' && 'Committees'}
            {tab === 'meetings' && 'Board Meetings'}
            {tab === 'policies' && 'Policies'}
            {tab === 'reports' && 'Reports'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'board' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {boardMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all"
              >
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 
                    rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                    <p className="text-teal-300 text-sm">{getPositionTitle(member.position)}</p>
                    <p className="text-white/60 text-sm">{member.region}</p>
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-4">{member.bio}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Term</p>
                    <p className="text-white text-sm">
                      {new Date(member.term.startDate).getFullYear()} - {new Date(member.term.endDate).getFullYear()}
                      <span className="text-white/60 ml-1">(Term {member.term.termNumber})</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Committees</p>
                    <div className="flex flex-wrap gap-1">
                      {member.committees.map(committee => (
                        <span
                          key={committee}
                          className="px-2 py-1 bg-teal-500/20 text-teal-300 text-xs rounded-full"
                        >
                          {committee}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMember(member)}
                  className="w-full mt-4 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 
                    border border-teal-400/50 rounded-lg text-teal-200 transition-colors
                    flex items-center justify-center space-x-2"
                >
                  <span>View Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'committees' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {committees.map((committee, index) => (
              <motion.div
                key={committee.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{committee.name}</h3>
                    <p className="text-white/70">{committee.mandate}</p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedCommittee(committee)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Chair</p>
                    <p className="text-white">{committee.chair}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Members</p>
                    <p className="text-white">{committee.members.length} members</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Meeting Schedule</p>
                    <p className="text-white">{committee.meetingSchedule}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <span className="flex items-center space-x-2 text-white/60">
                    <Target className="w-4 h-4" />
                    <span>{committee.responsibilities.length} responsibilities</span>
                  </span>
                  <span className="flex items-center space-x-2 text-white/60">
                    <TrendingUp className="w-4 h-4" />
                    <span>{committee.currentProjects.length} active projects</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'meetings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {recentMeetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {meeting.type === 'regular' ? 'Regular Board Meeting' : 
                         meeting.type === 'special' ? 'Special Board Meeting' : 
                         'Annual General Meeting'}
                      </h3>
                      {meeting.isPublic ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">
                          Public
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-white/60">
                      {new Date(meeting.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedMeeting(meeting)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-6 text-sm text-white/60">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{meeting.attendees.length} attendees</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Gavel className="w-4 h-4" />
                      <span>{meeting.decisions.length} decisions</span>
                    </span>
                    {meeting.recordingUrl && (
                      <span className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>Recording available</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-white/60 text-sm mb-2">Key Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {meeting.agenda.slice(0, 3).map((item, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                      {meeting.agenda.length > 3 && (
                        <span className="text-white/50 text-xs">
                          +{meeting.agenda.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-200 font-medium mb-1">Meeting Transparency</p>
                  <p className="text-blue-100/80 text-sm">
                    All regular board meetings are open to community members. 
                    Minutes and recordings are published within 48 hours.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'policies' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {policies.map((policy, index) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{policy.title}</h3>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full capitalize">
                        {policy.category}
                      </span>
                      <span className="text-white/60">Version {policy.version}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Share className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-white/60 mb-1">Effective Date</p>
                    <p className="text-white">{new Date(policy.effectiveDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 mb-1">Approved By</p>
                    <p className="text-white">{policy.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-white/60 mb-1">Next Review</p>
                    <p className="text-white">{new Date(policy.reviewDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-6 text-center">
                <BarChart3 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">Annual Report 2023</h4>
                <p className="text-white/60 text-sm mb-4">
                  Comprehensive review of platform impact and financials
                </p>
                <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                  border border-emerald-400/50 rounded-lg text-emerald-200 transition-colors">
                  Download PDF
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6 text-center">
                <TrendingUp className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">Q4 2023 Report</h4>
                <p className="text-white/60 text-sm mb-4">
                  Quarterly update on platform growth and community impact
                </p>
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors">
                  View Report
                </button>
              </div>

              <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6 text-center">
                <FileText className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">Impact Report</h4>
                <p className="text-white/60 text-sm mb-4">
                  Economic impact on Indigenous communities
                </p>
                <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 transition-colors">
                  Read More
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">2024 Goals & Priorities</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-amber-300 font-medium mb-2">Platform Growth</h5>
                  <ul className="space-y-1">
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                      <span>10,000 registered businesses</span>
                    </li>
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                      <span>$100M in contracts facilitated</span>
                    </li>
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                      <span>National coverage across Canada</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-amber-300 font-medium mb-2">Community Impact</h5>
                  <ul className="space-y-1">
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                      <span>1,000 successful mentorships</span>
                    </li>
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                      <span>Support 5% procurement target</span>
                    </li>
                    <li className="text-white/80 text-sm flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                      <span>Launch youth entrepreneur program</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}