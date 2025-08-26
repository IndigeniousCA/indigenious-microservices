// Evaluation Dashboard Component
// Main interface for evaluating and scoring bids

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Users, Award, TrendingUp, AlertCircle, 
  CheckCircle, Clock, Eye, EyeOff, Download, Filter,
  BarChart3, Shield, MessageSquare, ChevronRight
} from 'lucide-react'
import { BidEvaluationView } from './BidEvaluationView'
import { EvaluationMatrix } from './EvaluationMatrix'
import { ConsensusView } from './ConsensusView'
import { EvaluationSettings } from './EvaluationSettings'
import { useEvaluation } from '../hooks/useEvaluation'
import type { Evaluation, EvaluatedBid } from '../types/evaluation.types'

interface EvaluationDashboardProps {
  rfqId: string
  rfqDetails: {
    id: string
    title: string
    type: 'government' | 'band'
    evaluationCriteria: Record<string, number>
    deadline: string
    minimumIndigenousContent?: number
  }
  evaluatorRole: 'lead' | 'member' | 'observer'
}

export function EvaluationDashboard({ 
  rfqId, 
  rfqDetails,
  evaluatorRole 
}: EvaluationDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'individual' | 'matrix' | 'consensus'>('overview')
  const [selectedBid, setSelectedBid] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [filters, setFilters] = useState({
    showDisqualified: false,
    showOnlyRecommended: false,
    sortBy: 'score' as 'score' | 'price' | 'submission'
  })

  const {
    evaluation,
    loading,
    updateScore,
    disqualifyBid,
    completeEvaluation,
    exportResults
  } = useEvaluation(rfqId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading evaluation data...</p>
        </div>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Evaluation Found</h2>
          <p className="text-white/60">This RFQ has no bids to evaluate yet.</p>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const stats = {
    totalBids: evaluation.bids.length,
    evaluatedBids: evaluation.bids.filter(b => b.totalScore > 0).length,
    compliantBids: evaluation.bids.filter(b => b.isCompliant).length,
    averageScore: evaluation.bids.reduce((sum, b) => sum + b.normalizedScore, 0) / evaluation.bids.length || 0
  }

  // Filter and sort bids
  const filteredBids = evaluation.bids
    .filter(bid => {
      if (!filters.showDisqualified && !bid.isCompliant) return false
      if (filters.showOnlyRecommended && bid.recommendation === 'not_recommended') return false
      return true
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'score':
          return b.totalScore - a.totalScore
        case 'price':
          return a.scores.find(s => s.criterionName === 'Price')?.score || 0 -
                 b.scores.find(s => s.criterionName === 'Price')?.score || 0
        case 'submission':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Bid Evaluation</h1>
              <p className="text-lg text-white/60">{rfqDetails.title}</p>
            </div>
            <div className="flex items-center space-x-3">
              {evaluatorRole === 'lead' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                    rounded-xl text-white font-medium transition-all duration-200"
                >
                  Settings
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportResults}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                  rounded-xl text-white font-medium transition-all duration-200 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </motion.button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total Bids</p>
                <p className="text-2xl font-bold text-white">{stats.totalBids}</p>
              </div>
              <FileText className="w-8 h-8 text-white/20" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Evaluated</p>
                <p className="text-2xl font-bold text-white">
                  {stats.evaluatedBids}/{stats.totalBids}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-white/20" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Compliant</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.compliantBids}</p>
              </div>
              <Shield className="w-8 h-8 text-emerald-400/20" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Avg Score</p>
                <p className="text-2xl font-bold text-white">
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-white/20" />
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'overview'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('individual')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'individual'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Individual Scoring
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'matrix'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Comparison Matrix
          </button>
          {evaluation.settings.evaluationType !== 'individual' && (
            <button
              onClick={() => setActiveView('consensus')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeView === 'consensus'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Consensus
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={filters.showDisqualified}
                onChange={(e) => setFilters(prev => ({ ...prev, showDisqualified: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Show disqualified</span>
            </label>
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={filters.showOnlyRecommended}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyRecommended: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Recommended only</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/60">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as unknown }))}
              className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="score" className="bg-gray-800">Score</option>
              <option value="price" className="bg-gray-800">Price</option>
              <option value="submission" className="bg-gray-800">Submission Time</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BidOverview
                bids={filteredBids}
                evaluation={evaluation}
                onSelectBid={(bidId) => {
                  setSelectedBid(bidId)
                  setActiveView('individual')
                }}
              />
            </motion.div>
          )}

          {activeView === 'individual' && (
            <motion.div
              key="individual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BidEvaluationView
                evaluation={evaluation}
                selectedBidId={selectedBid}
                onSelectBid={setSelectedBid}
                onUpdateScore={updateScore}
                onDisqualify={disqualifyBid}
              />
            </motion.div>
          )}

          {activeView === 'matrix' && (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EvaluationMatrix
                evaluation={evaluation}
                bids={filteredBids}
              />
            </motion.div>
          )}

          {activeView === 'consensus' && (
            <motion.div
              key="consensus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ConsensusView
                evaluation={evaluation}
                onComplete={completeEvaluation}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        {showSettings && (
          <EvaluationSettings
            evaluation={evaluation}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  )
}

// Bid Overview Component
function BidOverview({ bids, evaluation, onSelectBid }: any) {
  return (
    <div className="space-y-4">
      {/* Ranked List */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Bid Ranking</h3>
        
        <div className="space-y-3">
          {bids.map((bid: EvaluatedBid, index: number) => (
            <motion.div
              key={bid.bidId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white/5 rounded-xl p-4 border cursor-pointer
                transition-all duration-200 hover:bg-white/10 ${
                  !bid.isCompliant 
                    ? 'border-red-400/30' 
                    : index === 0 
                    ? 'border-emerald-400/30' 
                    : 'border-white/10'
                }`}
              onClick={() => onSelectBid(bid.bidId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                    font-bold text-lg ${
                      !bid.isCompliant 
                        ? 'bg-red-500/20 text-red-400' 
                        : index === 0 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-white/10 text-white'
                    }`}>
                    {bid.isCompliant ? index + 1 : 'DQ'}
                  </div>
                  
                  {/* Bidder Info */}
                  <div>
                    <h4 className="font-medium text-white">
                      {evaluation.settings.blindEvaluation ? `Bidder ${bid.bidId.slice(-4)}` : bid.bidderName}
                    </h4>
                    {!evaluation.settings.blindEvaluation && bid.bidderOrganization && (
                      <p className="text-sm text-white/60">{bid.bidderOrganization}</p>
                    )}
                  </div>
                </div>

                {/* Scores */}
                <div className="flex items-center space-x-6">
                  {/* Price Score */}
                  <div className="text-center">
                    <p className="text-xs text-white/60">Price</p>
                    <p className="text-sm font-medium text-white">
                      {bid.scores.find(s => s.criterionName === 'Price')?.weightedScore.toFixed(1) || '-'}
                    </p>
                  </div>

                  {/* Technical Score */}
                  <div className="text-center">
                    <p className="text-xs text-white/60">Technical</p>
                    <p className="text-sm font-medium text-white">
                      {bid.scores.find(s => s.criterionName === 'Technical')?.weightedScore.toFixed(1) || '-'}
                    </p>
                  </div>

                  {/* Total Score */}
                  <div className="text-center">
                    <p className="text-xs text-white/60">Total</p>
                    <p className="text-lg font-bold text-white">
                      {bid.normalizedScore.toFixed(1)}%
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </div>

              {/* Compliance Issues */}
              {!bid.isCompliant && bid.disqualificationReason && (
                <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
                  <p className="text-sm text-red-300">
                    Disqualified: {bid.disqualificationReason}
                  </p>
                </div>
              )}

              {/* Recommendation Badge */}
              {bid.isCompliant && (
                <div className="mt-3 flex items-center justify-between">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm
                    ${bid.recommendation === 'highly_recommended' 
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : bid.recommendation === 'recommended'
                      ? 'bg-blue-500/20 text-blue-300'
                      : bid.recommendation === 'acceptable'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                    }`}>
                    {bid.recommendation.replace('_', ' ').toUpperCase()}
                  </div>

                  {/* Key Strengths */}
                  {bid.strengths.length > 0 && (
                    <p className="text-xs text-white/60">
                      Strengths: {bid.strengths.slice(0, 2).join(', ')}
                      {bid.strengths.length > 2 && ` +${bid.strengths.length - 2} more`}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Evaluation Progress */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Evaluation Progress</h3>
        
        <div className="space-y-3">
          {evaluation.criteria.map((criterion: unknown) => {
            const evaluatedCount = bids.filter((bid: EvaluatedBid) => 
              bid.scores.find(s => s.criterionId === criterion.id && s.score > 0)
            ).length

            return (
              <div key={criterion.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/80">{criterion.name}</span>
                  <span className="text-sm text-white/60">
                    {evaluatedCount}/{bids.length} evaluated
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(evaluatedCount / bids.length) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Complete Button */}
        {evaluation.status === 'in_progress' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-6 px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 
              border border-emerald-400/50 rounded-xl text-emerald-100 font-medium 
              transition-all duration-200"
          >
            Complete Evaluation
          </motion.button>
        )}
      </div>
    </div>
  )
}