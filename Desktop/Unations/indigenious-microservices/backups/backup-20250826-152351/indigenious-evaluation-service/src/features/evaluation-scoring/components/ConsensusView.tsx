// Consensus View Component
// Interface for building consensus among multiple evaluators

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, MessageSquare, AlertCircle, CheckCircle, 
  TrendingUp, TrendingDown, Minus, Flag, Eye,
  ThumbsUp, ThumbsDown, MessageCircle, Lock
} from 'lucide-react'
import type { Evaluation, ConsensusEvaluation, ConsensusScore, DiscussionNote } from '../types/evaluation.types'

interface ConsensusViewProps {
  evaluation: Evaluation
  onComplete: (consensusData: unknown) => void
}

export function ConsensusView({ evaluation, onComplete }: ConsensusViewProps) {
  const [activeTab, setActiveTab] = useState<'scores' | 'discussion' | 'ranking'>('scores')
  const [selectedBid, setSelectedBid] = useState(evaluation.bids[0]?.bidId)
  const [selectedCriterion, setSelectedCriterion] = useState(evaluation.criteria[0]?.id)
  const [discussionNotes, setDiscussionNotes] = useState<DiscussionNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [showVarianceOnly, setShowVarianceOnly] = useState(false)
  const [consensusReached, setConsensusReached] = useState(false)

  // Mock evaluator data
  const evaluators = [
    { id: '1', name: 'John Smith', role: 'Technical Lead', weight: 1.2 },
    { id: '2', name: 'Jane Doe', role: 'Project Manager', weight: 1.0 },
    { id: '3', name: 'Bob Johnson', role: 'Finance', weight: 0.8 },
    { id: '4', name: 'Sarah Wilson', role: 'Indigenous Relations', weight: 1.0 }
  ]

  // Calculate consensus scores
  const calculateConsensus = (scores: number[], weights: number[]) => {
    const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    return weightedSum / totalWeight
  }

  // Calculate variance
  const calculateVariance = (scores: number[]) => {
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    return Math.sqrt(variance)
  }

  // Get mock individual scores
  const getIndividualScores = (bidId: string, criterionId: string) => {
    // In real implementation, would fetch from database
    return evaluators.map(evaluator => ({
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      score: Math.random() * 10, // Mock score
      weight: evaluator.weight
    }))
  }

  // Add discussion note
  const addDiscussionNote = () => {
    if (!newNote.trim()) return

    const note: DiscussionNote = {
      id: Date.now().toString(),
      bidId: selectedBid || '',
      criterionId: selectedCriterion,
      note: newNote,
      addedBy: 'Current User',
      addedAt: new Date().toISOString(),
      resolved: false
    }

    setDiscussionNotes([...discussionNotes, note])
    setNewNote('')
  }

  // Toggle note resolution
  const toggleNoteResolution = (noteId: string) => {
    setDiscussionNotes(prev =>
      prev.map(note =>
        note.id === noteId ? { ...note, resolved: !note.resolved } : note
      )
    )
  }

  // Complete consensus evaluation
  const handleComplete = () => {
    const consensusData = {
      consensusReached,
      discussionNotes,
      finalRanking: evaluation.bids.map((bid, index) => ({
        rank: index + 1,
        bidId: bid.bidId,
        bidderName: bid.bidderName,
        consensusScore: bid.totalScore
      }))
    }
    onComplete(consensusData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Consensus Building</h3>
            <p className="text-white/60">Reconcile evaluator scores and reach agreement</p>
          </div>
          <div className="flex items-center space-x-3">
            {consensusReached ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/20 
                border border-emerald-400/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-100 font-medium">Consensus Reached</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-amber-500/20 
                border border-amber-400/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-amber-100 font-medium">Consensus Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Evaluator List */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {evaluators.map(evaluator => (
            <div key={evaluator.id} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xs text-blue-300 font-medium">
                    {evaluator.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{evaluator.name}</p>
                  <p className="text-xs text-white/60">{evaluator.role}</p>
                </div>
              </div>
              {evaluator.weight !== 1.0 && (
                <p className="text-xs text-blue-400 mt-1">Weight: {evaluator.weight}x</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('scores')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'scores'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Score Comparison
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 
            flex items-center justify-center ${
            activeTab === 'discussion'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Discussion
          {discussionNotes.filter(n => !n.resolved).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 
              text-xs rounded-full">
              {discussionNotes.filter(n => !n.resolved).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'ranking'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Final Ranking
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'scores' && (
          <motion.div
            key="scores"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ScoreComparisonView
              evaluation={evaluation}
              evaluators={evaluators}
              selectedBid={selectedBid}
              selectedCriterion={selectedCriterion}
              showVarianceOnly={showVarianceOnly}
              onSelectBid={setSelectedBid}
              onSelectCriterion={setSelectedCriterion}
              onToggleVariance={() => setShowVarianceOnly(!showVarianceOnly)}
              getIndividualScores={getIndividualScores}
            />
          </motion.div>
        )}

        {activeTab === 'discussion' && (
          <motion.div
            key="discussion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DiscussionView
              evaluation={evaluation}
              discussionNotes={discussionNotes}
              newNote={newNote}
              selectedBid={selectedBid}
              onSelectBid={setSelectedBid}
              onNoteChange={setNewNote}
              onAddNote={addDiscussionNote}
              onToggleResolution={toggleNoteResolution}
            />
          </motion.div>
        )}

        {activeTab === 'ranking' && (
          <motion.div
            key="ranking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FinalRankingView
              evaluation={evaluation}
              consensusReached={consensusReached}
              onToggleConsensus={() => setConsensusReached(!consensusReached)}
              onComplete={handleComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Score Comparison Component
function ScoreComparisonView({ 
  evaluation, 
  evaluators, 
  selectedBid,
  selectedCriterion,
  showVarianceOnly,
  onSelectBid,
  onSelectCriterion,
  onToggleVariance,
  getIndividualScores
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Bid/Criterion Selection */}
      <div className="lg:col-span-1 space-y-4">
        {/* Bid Selection */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">Select Bid</h4>
          <div className="space-y-2">
            {evaluation.bids.map((bid: unknown) => (
              <button
                key={bid.bidId}
                onClick={() => onSelectBid(bid.bidId)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  selectedBid === bid.bidId
                    ? 'bg-white/20 border border-white/30'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <p className="font-medium text-white">
                  {evaluation.settings.blindEvaluation 
                    ? `Bidder ${bid.bidId.slice(-4)}` 
                    : bid.bidderName}
                </p>
                <p className="text-sm text-white/60">Score: {bid.totalScore.toFixed(1)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Criterion Selection */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">Select Criterion</h4>
          <div className="space-y-2">
            {evaluation.criteria.map((criterion: unknown) => (
              <button
                key={criterion.id}
                onClick={() => onSelectCriterion(criterion.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  selectedCriterion === criterion.id
                    ? 'bg-white/20 border border-white/30'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <p className="font-medium text-white">{criterion.name}</p>
                <p className="text-sm text-white/60">Weight: {criterion.weight}%</p>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <label className="flex items-center space-x-2 text-white">
            <input
              type="checkbox"
              checked={showVarianceOnly}
              onChange={onToggleVariance}
              className="rounded"
            />
            <span className="text-sm">Show high variance only</span>
          </label>
        </div>
      </div>

      {/* Right: Score Details */}
      <div className="lg:col-span-2">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Individual Scores</h4>
          
          {selectedBid && selectedCriterion && (
            <>
              {/* Score Visualization */}
              <div className="mb-6">
                {(() => {
                  const scores = getIndividualScores(selectedBid, selectedCriterion)
                  const scoreValues = scores.map((s: unknown) => s.score)
                  const weights = scores.map((s: unknown) => s.weight)
                  const consensus = calculateConsensus(scoreValues, weights)
                  const variance = calculateVariance(scoreValues)
                  const maxScore = 10 // Assuming max score of 10
                  
                  return (
                    <>
                      {/* Consensus Score */}
                      <div className="mb-4 p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white/60">Consensus Score</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-white">
                              {consensus.toFixed(1)}
                            </span>
                            <span className="text-white/60">/ {maxScore}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${(consensus / maxScore) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Variance Indicator */}
                      <div className={`p-3 rounded-lg mb-4 ${
                        variance > 2 
                          ? 'bg-red-500/10 border border-red-400/30' 
                          : variance > 1
                          ? 'bg-amber-500/10 border border-amber-400/30'
                          : 'bg-emerald-500/10 border border-emerald-400/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {variance > 2 ? (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            ) : variance > 1 ? (
                              <Minus className="w-5 h-5 text-amber-400" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            )}
                            <span className="text-sm font-medium text-white">
                              {variance > 2 
                                ? 'High Variance - Discussion Needed' 
                                : variance > 1
                                ? 'Moderate Variance'
                                : 'Good Agreement'}
                            </span>
                          </div>
                          <span className="text-sm text-white/60">
                            σ = {variance.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Individual Scores */}
                      <div className="space-y-3">
                        {scores.map((score: unknown) => (
                          <div key={score.evaluatorId} className="flex items-center space-x-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-white">
                                  {score.evaluatorName}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-semibold text-white">
                                    {score.score.toFixed(1)}
                                  </span>
                                  {score.weight !== 1.0 && (
                                    <span className="text-xs text-blue-400">
                                      (×{score.weight})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    Math.abs(score.score - consensus) > 2
                                      ? 'bg-red-500'
                                      : Math.abs(score.score - consensus) > 1
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${(score.score / maxScore) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 
                  border border-white/20 rounded-lg text-white font-medium 
                  transition-all duration-200 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Add Discussion Note
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-100 font-medium 
                  transition-all duration-200 flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Accept Consensus
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Discussion View Component
function DiscussionView({ 
  evaluation, 
  discussionNotes, 
  newNote,
  selectedBid,
  onSelectBid,
  onNoteChange,
  onAddNote,
  onToggleResolution
}: any) {
  const bidNotes = discussionNotes.filter((n: DiscussionNote) => 
    !selectedBid || n.bidId === selectedBid
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Bid Filter */}
      <div className="lg:col-span-1">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">Filter by Bid</h4>
          <div className="space-y-2">
            <button
              onClick={() => onSelectBid(null)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                !selectedBid
                  ? 'bg-white/20 border border-white/30'
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <p className="font-medium text-white">All Bids</p>
              <p className="text-sm text-white/60">
                {discussionNotes.length} notes
              </p>
            </button>
            {evaluation.bids.map((bid: unknown) => {
              const noteCount = discussionNotes.filter((n: DiscussionNote) => 
                n.bidId === bid.bidId
              ).length
              
              return (
                <button
                  key={bid.bidId}
                  onClick={() => onSelectBid(bid.bidId)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    selectedBid === bid.bidId
                      ? 'bg-white/20 border border-white/30'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <p className="font-medium text-white">
                    {evaluation.settings.blindEvaluation 
                      ? `Bidder ${bid.bidId.slice(-4)}` 
                      : bid.bidderName}
                  </p>
                  <p className="text-sm text-white/60">{noteCount} notes</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Discussion Thread */}
      <div className="lg:col-span-2 space-y-4">
        {/* Add Note */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">Add Discussion Note</h4>
          <div className="space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:border-blue-400/50 
                focus:outline-none transition-colors resize-none"
              placeholder="Share your thoughts or concerns..."
            />
            <button
              onClick={onAddNote}
              disabled={!newNote.trim()}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                border-blue-400/50 rounded-lg text-blue-100 font-medium 
                transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {bidNotes.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 
              rounded-xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No discussion notes yet</p>
            </div>
          ) : (
            bidNotes.map((note: DiscussionNote) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/10 backdrop-blur-md border rounded-xl p-4 ${
                  note.resolved 
                    ? 'border-emerald-400/30 opacity-60' 
                    : 'border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{note.addedBy}</p>
                    <p className="text-xs text-white/60">
                      {new Date(note.addedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleResolution(note.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium 
                      transition-all duration-200 ${
                      note.resolved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                        : 'bg-white/10 text-white/60 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {note.resolved ? 'Resolved' : 'Mark Resolved'}
                  </button>
                </div>
                <p className="text-white/80">{note.note}</p>
                {note.criterionId && (
                  <p className="text-sm text-blue-400 mt-2">
                    Re: {evaluation.criteria.find((c: unknown) => c.id === note.criterionId)?.name}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Final Ranking View Component
function FinalRankingView({ 
  evaluation, 
  consensusReached,
  onToggleConsensus,
  onComplete
}: any) {
  return (
    <div className="space-y-6">
      {/* Consensus Status */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Evaluation Summary</h4>
            <p className="text-white/60">
              Review the final ranking and confirm consensus has been reached
            </p>
          </div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consensusReached}
              onChange={onToggleConsensus}
              className="w-5 h-5 rounded"
            />
            <span className="text-white font-medium">Consensus Reached</span>
          </label>
        </div>
      </div>

      {/* Final Ranking */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Final Ranking</h4>
        
        <div className="space-y-3">
          {evaluation.bids.map((bid: any, index: number) => (
            <motion.div
              key={bid.bidId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border ${
                index === 0 && bid.isCompliant
                  ? 'bg-emerald-500/10 border-emerald-400/30'
                  : !bid.isCompliant
                  ? 'bg-red-500/10 border-red-400/30'
                  : 'bg-white/5 border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center
                    font-bold text-lg ${
                      index === 0 && bid.isCompliant
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : !bid.isCompliant
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/10 text-white'
                    }`}>
                    {bid.isCompliant ? index + 1 : 'DQ'}
                  </div>
                  
                  {/* Bidder Info */}
                  <div>
                    <h5 className="font-medium text-white">
                      {evaluation.settings.blindEvaluation 
                        ? `Bidder ${bid.bidId.slice(-4)}` 
                        : bid.bidderName}
                    </h5>
                    <p className="text-sm text-white/60">
                      {bid.isCompliant 
                        ? `Score: ${bid.totalScore.toFixed(1)} (${bid.normalizedScore.toFixed(1)}%)`
                        : `Disqualified: ${bid.disqualificationReason}`}
                    </p>
                  </div>
                </div>

                {/* Recommendation */}
                {bid.isCompliant && (
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    index === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                      : 'bg-white/10 text-white/60 border border-white/20'
                  }`}>
                    {index === 0 ? 'RECOMMENDED' : `Rank ${index + 1}`}
                  </div>
                )}
              </div>

              {/* Key Points */}
              {bid.isCompliant && index < 3 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60 mb-1">Strengths:</p>
                      <ul className="list-disc list-inside text-white/80">
                        {bid.strengths.slice(0, 2).map((strength: string, i: number) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-white/60 mb-1">Concerns:</p>
                      <ul className="list-disc list-inside text-white/80">
                        {bid.weaknesses.slice(0, 2).map((weakness: string, i: number) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Complete Evaluation */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          disabled={!consensusReached}
          className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border 
            border-emerald-400/50 rounded-xl text-emerald-100 font-medium 
            transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
            flex items-center"
        >
          <Lock className="w-5 h-5 mr-2" />
          Complete Evaluation
        </motion.button>
      </div>
    </div>
  )
}