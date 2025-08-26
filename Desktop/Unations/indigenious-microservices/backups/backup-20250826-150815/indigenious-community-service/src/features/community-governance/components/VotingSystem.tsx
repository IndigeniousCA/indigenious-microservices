// Voting System Component
// Democratic decision-making interface for community proposals

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Vote, TrendingUp, Clock, Users, ChevronRight, AlertCircle,
  CheckCircle, XCircle, BarChart3, Calendar, MessageSquare,
  Shield, Info, ThumbsUp, ThumbsDown, Minus, Filter,
  Download, Share, Bell, Lock, Unlock, Award, Target
} from 'lucide-react'
import { Proposal, VotingResult, ProposalStatus } from '../types/community.types'

export function VotingSystem() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'upcoming'>('active')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [userVote, setUserVote] = useState<'yes' | 'no' | 'abstain' | null>(null)

  // Mock proposals
  const proposals: Proposal[] = [
    {
      id: 'prop-1',
      title: 'Implement Cree Language Support',
      description: 'Add full Cree language translation for the platform interface and all documentation',
      category: 'feature',
      authorId: 'user-1',
      authorName: 'Sarah Cardinal',
      createdAt: '2024-01-10T10:00:00Z',
      status: 'voting',
      votingStartDate: '2024-01-15T00:00:00Z',
      votingEndDate: '2024-01-22T23:59:59Z',
      discussion: {
        forumTopicId: 'topic-123',
        commentCount: 45
      },
      impact: {
        scope: 'platform',
        estimatedCost: 25000,
        estimatedTime: '3 months',
        affectedUsers: 1500
      }
    },
    {
      id: 'prop-2',
      title: 'Community Investment Fund',
      description: 'Establish a $100,000 fund to support Indigenous startups on the platform',
      category: 'budget',
      authorId: 'user-2',
      authorName: 'Michael Littlebear',
      createdAt: '2024-01-08T14:00:00Z',
      status: 'voting',
      votingStartDate: '2024-01-15T00:00:00Z',
      votingEndDate: '2024-01-22T23:59:59Z',
      discussion: {
        forumTopicId: 'topic-124',
        commentCount: 78
      },
      impact: {
        scope: 'community',
        estimatedCost: 100000,
        estimatedTime: '12 months',
        affectedUsers: 500
      }
    },
    {
      id: 'prop-3',
      title: 'Mandatory Cultural Awareness Training',
      description: 'Require all platform users to complete cultural awareness training',
      category: 'policy',
      authorId: 'user-3',
      authorName: 'Elder Mary Standing Bear',
      createdAt: '2024-01-05T09:00:00Z',
      status: 'approved',
      votingStartDate: '2024-01-01T00:00:00Z',
      votingEndDate: '2024-01-08T23:59:59Z',
      discussion: {
        forumTopicId: 'topic-122',
        commentCount: 123
      },
      impact: {
        scope: 'policy',
        estimatedCost: 15000,
        estimatedTime: '1 month',
        affectedUsers: 5000
      }
    }
  ]

  // Mock voting results
  const votingResults: Record<string, VotingResult> = {
    'prop-1': {
      proposalId: 'prop-1',
      totalVotes: 342,
      yesVotes: 267,
      noVotes: 45,
      abstainVotes: 30,
      percentageYes: 78,
      percentageNo: 13,
      percentageAbstain: 9,
      quorumMet: true,
      passed: false // Still voting
    },
    'prop-2': {
      proposalId: 'prop-2',
      totalVotes: 298,
      yesVotes: 189,
      noVotes: 87,
      abstainVotes: 22,
      percentageYes: 63,
      percentageNo: 29,
      percentageAbstain: 8,
      quorumMet: true,
      passed: false // Still voting
    },
    'prop-3': {
      proposalId: 'prop-3',
      totalVotes: 512,
      yesVotes: 423,
      noVotes: 56,
      abstainVotes: 33,
      percentageYes: 83,
      percentageNo: 11,
      percentageAbstain: 6,
      quorumMet: true,
      passed: true,
      certifiedAt: '2024-01-09T10:00:00Z',
      certifiedBy: 'Board Secretary'
    }
  }

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case 'voting': return 'blue'
      case 'approved': return 'emerald'
      case 'rejected': return 'red'
      case 'implementing': return 'amber'
      case 'completed': return 'green'
      default: return 'gray'
    }
  }

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days} days left`
    return `${hours} hours left`
  }

  const filteredProposals = proposals.filter(proposal => {
    if (filterCategory !== 'all' && proposal.category !== filterCategory) return false
    
    switch (activeTab) {
      case 'active':
        return proposal.status === 'voting' || proposal.status === 'discussion'
      case 'completed':
        return proposal.status === 'approved' || proposal.status === 'rejected' || proposal.status === 'completed'
      case 'upcoming':
        return proposal.status === 'draft' || proposal.status === 'review'
      default:
        return true
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-md 
        border border-emerald-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Community Voting</h2>
            <p className="text-white/70">
              Shape the future of the platform through democratic decisions
            </p>
          </div>
          
          <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
            border border-emerald-400/50 rounded-lg text-emerald-200 transition-colors 
            flex items-center space-x-2">
            <Vote className="w-4 h-4" />
            <span>Submit Proposal</span>
          </button>
        </div>
      </div>

      {/* Voting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Vote className="w-5 h-5 text-emerald-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">5</p>
          <p className="text-white/60 text-sm">Active Proposals</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-emerald-300">89%</span>
          </div>
          <p className="text-2xl font-bold text-white">1,234</p>
          <p className="text-white/60 text-sm">Active Voters</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">78%</p>
          <p className="text-white/60 text-sm">Approval Rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-purple-400" />
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">23</p>
          <p className="text-white/60 text-sm">Implemented</p>
        </motion.div>
      </div>

      {/* Filters and Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
            {(['active', 'completed', 'upcoming'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all" className="bg-gray-800">All Categories</option>
            <option value="feature" className="bg-gray-800">Features</option>
            <option value="policy" className="bg-gray-800">Policies</option>
            <option value="budget" className="bg-gray-800">Budget</option>
            <option value="governance" className="bg-gray-800">Governance</option>
            <option value="partnership" className="bg-gray-800">Partnerships</option>
          </select>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.map((proposal, index) => {
          const results = votingResults[proposal.id]
          const color = getStatusColor(proposal.status)
          
          return (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                hover:bg-white/15 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-3 py-1 bg-${color}-500/20 text-${color}-300 
                      text-xs rounded-full capitalize`}>
                      {proposal.status}
                    </span>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 
                      text-xs rounded-full capitalize">
                      {proposal.category}
                    </span>
                    {proposal.status === 'voting' && (
                      <span className="flex items-center space-x-1 text-amber-300 text-sm">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeRemaining(proposal.votingEndDate!)}</span>
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2">{proposal.title}</h3>
                  <p className="text-white/70 mb-3">{proposal.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span>by {proposal.authorName}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{proposal.discussion.commentCount} comments</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{proposal.impact.affectedUsers} affected</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedProposal(proposal)}
                  className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {results && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Current Results</span>
                    <span className="text-white/80">{results.totalVotes} votes cast</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <ThumbsUp className="w-4 h-4 text-emerald-400" />
                      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 transition-all"
                          style={{ width: `${results.percentageYes}%` }}
                        />
                      </div>
                      <span className="text-white/80 text-sm w-12 text-right">
                        {results.percentageYes}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ThumbsDown className="w-4 h-4 text-red-400" />
                      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-red-400 transition-all"
                          style={{ width: `${results.percentageNo}%` }}
                        />
                      </div>
                      <span className="text-white/80 text-sm w-12 text-right">
                        {results.percentageNo}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Minus className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gray-400 transition-all"
                          style={{ width: `${results.percentageAbstain}%` }}
                        />
                      </div>
                      <span className="text-white/80 text-sm w-12 text-right">
                        {results.percentageAbstain}%
                      </span>
                    </div>
                  </div>

                  {proposal.status === 'voting' && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        {results.quorumMet ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300 text-sm">Quorum met</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-300 text-sm">Quorum not met</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProposal(proposal)
                          setShowVoteModal(true)
                        }}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                          border border-emerald-400/50 rounded-lg text-emerald-200 
                          transition-colors text-sm"
                      >
                        Cast Your Vote
                      </button>
                    </div>
                  )}

                  {proposal.status === 'approved' && results.certifiedAt && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 text-sm">
                          Certified by {results.certifiedBy}
                        </span>
                      </div>
                      <span className="text-white/60 text-sm">
                        {new Date(results.certifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {proposal.implementation && proposal.status === 'implementing' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">Implementation Progress</span>
                    <span className="text-amber-300 text-sm">In Progress</span>
                  </div>
                  {proposal.implementation.updates.length > 0 && (
                    <p className="text-white/80 text-sm">
                      Latest: {proposal.implementation.updates[0].update}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Proposal Detail Modal */}
      <AnimatePresence>
        {selectedProposal && !showVoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProposal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {selectedProposal.title}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 bg-${getStatusColor(selectedProposal.status)}-500/20 
                      text-${getStatusColor(selectedProposal.status)}-300 text-xs rounded-full capitalize`}>
                      {selectedProposal.status}
                    </span>
                    <span className="text-white/60">by {selectedProposal.authorName}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-medium mb-2">Description</h4>
                  <p className="text-white/80">{selectedProposal.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h5 className="text-white/60 text-sm mb-1">Impact Scope</h5>
                    <p className="text-white font-medium capitalize">{selectedProposal.impact.scope}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h5 className="text-white/60 text-sm mb-1">Estimated Cost</h5>
                    <p className="text-white font-medium">
                      ${selectedProposal.impact.estimatedCost?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h5 className="text-white/60 text-sm mb-1">Timeline</h5>
                    <p className="text-white font-medium">{selectedProposal.impact.estimatedTime}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                    border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                    flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Join Discussion ({selectedProposal.discussion.commentCount})</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Download className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Share className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Bell className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote Modal */}
      <AnimatePresence>
        {showVoteModal && selectedProposal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowVoteModal(false)
              setUserVote(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Cast Your Vote</h3>
              
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-2">{selectedProposal.title}</h4>
                <p className="text-white/70 text-sm">{selectedProposal.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setUserVote('yes')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between
                    ${userVote === 'yes' 
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/15'}`}
                >
                  <span className="flex items-center space-x-3">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-medium">Yes, I support this proposal</span>
                  </span>
                  {userVote === 'yes' && <CheckCircle className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setUserVote('no')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between
                    ${userVote === 'no' 
                      ? 'bg-red-500/20 border-red-400/50 text-red-200' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/15'}`}
                >
                  <span className="flex items-center space-x-3">
                    <ThumbsDown className="w-5 h-5" />
                    <span className="font-medium">No, I oppose this proposal</span>
                  </span>
                  {userVote === 'no' && <CheckCircle className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setUserVote('abstain')}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center justify-between
                    ${userVote === 'abstain' 
                      ? 'bg-gray-500/20 border-gray-400/50 text-gray-200' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/15'}`}
                >
                  <span className="flex items-center space-x-3">
                    <Minus className="w-5 h-5" />
                    <span className="font-medium">Abstain from voting</span>
                  </span>
                  {userVote === 'abstain' && <CheckCircle className="w-5 h-5" />}
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 mb-6">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-400 mt-0.5" />
                  <p className="text-amber-200 text-sm">
                    Your vote is final and cannot be changed once submitted. 
                    All votes are anonymous but verifiable.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowVoteModal(false)
                    setUserVote(null)
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!userVote}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                    border border-emerald-400/50 rounded-lg text-emerald-200 
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Vote
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}