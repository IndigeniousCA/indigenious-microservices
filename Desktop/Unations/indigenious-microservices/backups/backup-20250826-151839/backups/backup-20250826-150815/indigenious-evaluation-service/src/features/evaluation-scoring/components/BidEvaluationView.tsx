// Individual Bid Evaluation View
// Interface for scoring individual bids

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Star, AlertCircle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, MessageSquare, Save,
  Flag, Award, Shield, Lightbulb, AlertTriangle,
  Download, Eye
} from 'lucide-react'
import type { Evaluation, EvaluatedBid, BidScore } from '../types/evaluation.types'

interface BidEvaluationViewProps {
  evaluation: Evaluation
  selectedBidId: string | null
  onSelectBid: (bidId: string) => void
  onUpdateScore: (bidId: string, criterionId: string, score: number, justification?: string) => void
  onDisqualify: (bidId: string, reason: string) => void
}

export function BidEvaluationView({
  evaluation,
  selectedBidId,
  onSelectBid,
  onUpdateScore,
  onDisqualify
}: BidEvaluationViewProps) {
  const [activeCriterion, setActiveCriterion] = useState(evaluation.criteria[0]?.id)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState('')
  const [notes, setNotes] = useState({
    strengths: [] as string[],
    weaknesses: [] as string[],
    risks: [] as string[],
    general: ''
  })

  // Get current bid
  const currentBid = evaluation.bids.find(b => b.bidId === selectedBidId)
  const currentBidIndex = evaluation.bids.findIndex(b => b.bidId === selectedBidId)
  
  // Get current criterion
  const currentCriterion = evaluation.criteria.find(c => c.id === activeCriterion)
  
  // Get current score
  const currentScore = currentBid?.scores.find(s => s.criterionId === activeCriterion)

  // Navigation functions
  const goToPreviousBid = () => {
    if (currentBidIndex > 0) {
      onSelectBid(evaluation.bids[currentBidIndex - 1].bidId)
    }
  }

  const goToNextBid = () => {
    if (currentBidIndex < evaluation.bids.length - 1) {
      onSelectBid(evaluation.bids[currentBidIndex + 1].bidId)
    }
  }

  const goToPreviousCriterion = () => {
    const currentIndex = evaluation.criteria.findIndex(c => c.id === activeCriterion)
    if (currentIndex > 0) {
      setActiveCriterion(evaluation.criteria[currentIndex - 1].id)
    }
  }

  const goToNextCriterion = () => {
    const currentIndex = evaluation.criteria.findIndex(c => c.id === activeCriterion)
    if (currentIndex < evaluation.criteria.length - 1) {
      setActiveCriterion(evaluation.criteria[currentIndex + 1].id)
    }
  }

  // Handle score update
  const handleScoreUpdate = (score: number, justification?: string) => {
    if (currentBid && currentCriterion) {
      onUpdateScore(currentBid.bidId, currentCriterion.id, score, justification)
      setUnsavedChanges(true)
    }
  }

  // Handle disqualification
  const handleDisqualify = () => {
    if (currentBid && disqualifyReason) {
      onDisqualify(currentBid.bidId, disqualifyReason)
      setShowDisqualifyModal(false)
      setDisqualifyReason('')
    }
  }

  // Save evaluation
  const saveEvaluation = () => {
    // Would save notes and other changes
    setUnsavedChanges(false)
  }

  if (!currentBid) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
        <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Select a Bid to Evaluate</h3>
        <p className="text-white/60">Choose a bid from the list to begin evaluation</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          {/* Bid Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousBid}
              disabled={currentBidIndex === 0}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 
                disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">
                {evaluation.settings.blindEvaluation 
                  ? `Bidder ${currentBid.bidId.slice(-4)}` 
                  : currentBid.bidderName}
              </h3>
              <p className="text-sm text-white/60">
                Bid {currentBidIndex + 1} of {evaluation.bids.length}
              </p>
            </div>
            
            <button
              onClick={goToNextBid}
              disabled={currentBidIndex === evaluation.bids.length - 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 
                disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            {!currentBid.isCompliant && (
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium">
                DISQUALIFIED
              </span>
            )}
            {unsavedChanges && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveEvaluation}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                  border-blue-400/50 rounded-lg text-blue-100 font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDisqualifyModal(true)}
              disabled={!currentBid.isCompliant}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border 
                border-red-400/50 rounded-lg text-red-100 font-medium 
                transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Disqualify
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Criteria List */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Evaluation Criteria</h4>
            
            <div className="space-y-2">
              {evaluation.criteria.map(criterion => {
                const score = currentBid.scores.find(s => s.criterionId === criterion.id)
                const isComplete = score && score.score > 0
                const isCurrent = criterion.id === activeCriterion
                
                return (
                  <motion.button
                    key={criterion.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveCriterion(criterion.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      isCurrent 
                        ? 'bg-white/20 border border-white/30' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                        )}
                        <div>
                          <p className="font-medium text-white">{criterion.name}</p>
                          <p className="text-xs text-white/60">Weight: {criterion.weight}%</p>
                        </div>
                      </div>
                      {score && (
                        <span className="text-sm font-medium text-white">
                          {score.score}/{criterion.maxPoints}
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Progress */}
            <div className="mt-6 p-3 bg-white/5 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/60">Progress</span>
                <span className="text-sm text-white">
                  {currentBid.scores.filter(s => s.score > 0).length}/{evaluation.criteria.length}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ 
                    width: `${(currentBid.scores.filter(s => s.score > 0).length / evaluation.criteria.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Scoring Interface */}
        <div className="lg:col-span-2">
          {currentCriterion && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              {/* Criterion Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-semibold text-white">{currentCriterion.name}</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousCriterion}
                      disabled={evaluation.criteria[0].id === activeCriterion}
                      className="p-1 rounded hover:bg-white/10 disabled:opacity-30 
                        disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={goToNextCriterion}
                      disabled={evaluation.criteria[evaluation.criteria.length - 1].id === activeCriterion}
                      className="p-1 rounded hover:bg-white/10 disabled:opacity-30 
                        disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                {currentCriterion.description && (
                  <p className="text-white/60">{currentCriterion.description}</p>
                )}
                <div className="mt-2 flex items-center space-x-4 text-sm">
                  <span className="text-white/60">Max Points: <span className="text-white font-medium">{currentCriterion.maxPoints}</span></span>
                  <span className="text-white/60">Weight: <span className="text-white font-medium">{currentCriterion.weight}%</span></span>
                </div>
              </div>

              {/* Scoring Guide */}
              {currentCriterion.scoringGuide && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-white/80 mb-3">Scoring Guide</h5>
                  <div className="space-y-2">
                    {currentCriterion.scoringGuide.map((guide, index) => (
                      <div key={index} className="flex items-start space-x-3 p-2 bg-white/5 rounded-lg">
                        <span className="text-white font-medium min-w-[40px]">{guide.score}</span>
                        <div className="flex-1">
                          <p className="text-sm text-white/80">{guide.description}</p>
                          {guide.examples && (
                            <ul className="mt-1 text-xs text-white/60 list-disc list-inside">
                              {guide.examples.map((example, i) => (
                                <li key={i}>{example}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">Score</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="0"
                    max={currentCriterion.maxPoints}
                    step="0.5"
                    value={currentScore?.score || 0}
                    onChange={(e) => handleScoreUpdate(parseFloat(e.target.value))}
                    className="w-32 px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white placeholder-white/40 focus:border-blue-400/50 
                      focus:outline-none transition-colors"
                  />
                  <span className="text-white/60">/ {currentCriterion.maxPoints} points</span>
                  <div className="flex-1" />
                  <div className="text-right">
                    <p className="text-sm text-white/60">Weighted Score</p>
                    <p className="text-lg font-semibold text-white">
                      {((currentScore?.score || 0) * currentCriterion.weight / 100).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Visual Score Slider */}
                <div className="mt-4">
                  <input
                    type="range"
                    min="0"
                    max={currentCriterion.maxPoints}
                    step="0.5"
                    value={currentScore?.score || 0}
                    onChange={(e) => handleScoreUpdate(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer 
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                      [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-white/40">0</span>
                    <span className="text-xs text-white/40">{currentCriterion.maxPoints}</span>
                  </div>
                </div>
              </div>

              {/* Sub-criteria if any */}
              {currentCriterion.subCriteria && currentCriterion.subCriteria.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-white/80 mb-3">Sub-criteria Breakdown</h5>
                  <div className="space-y-3">
                    {currentCriterion.subCriteria.map(sub => {
                      const subScore = currentScore?.subScores?.find(s => s.subCriterionId === sub.id)
                      
                      return (
                        <div key={sub.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white">{sub.name}</span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max={sub.maxPoints}
                                step="0.5"
                                value={subScore?.score || 0}
                                onChange={(e) => {
                                  // Would update sub-score
                                }}
                                className="w-20 px-2 py-1 bg-white/10 border border-white/20 
                                  rounded text-white text-sm focus:border-blue-400/50 
                                  focus:outline-none"
                              />
                              <span className="text-sm text-white/60">/ {sub.maxPoints}</span>
                            </div>
                          </div>
                          {sub.description && (
                            <p className="text-xs text-white/60">{sub.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Justification */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Justification / Comments
                </label>
                <textarea
                  value={currentScore?.justification || ''}
                  onChange={(e) => handleScoreUpdate(currentScore?.score || 0, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:border-blue-400/50 
                    focus:outline-none transition-colors resize-none"
                  placeholder="Provide rationale for the score..."
                />
              </div>

              {/* Related Documents */}
              <div className="mt-4 flex items-center justify-between">
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors 
                  flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  View Bid Documents
                </button>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors 
                  flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  Download Attachments
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Evaluation Notes */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Overall Evaluation Notes</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Strengths */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <label className="text-sm font-medium text-white">Key Strengths</label>
            </div>
            <textarea
              value={notes.strengths.join('\n')}
              onChange={(e) => setNotes(prev => ({ ...prev, strengths: e.target.value.split('\n').filter(s => s) }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:border-emerald-400/50 
                focus:outline-none transition-colors resize-none text-sm"
              placeholder="List key strengths..."
            />
          </div>

          {/* Weaknesses */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-medium text-white">Areas of Concern</label>
            </div>
            <textarea
              value={notes.weaknesses.join('\n')}
              onChange={(e) => setNotes(prev => ({ ...prev, weaknesses: e.target.value.split('\n').filter(s => s) }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:border-amber-400/50 
                focus:outline-none transition-colors resize-none text-sm"
              placeholder="List concerns or weaknesses..."
            />
          </div>

          {/* Risks */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-red-400" />
              <label className="text-sm font-medium text-white">Risk Factors</label>
            </div>
            <textarea
              value={notes.risks.join('\n')}
              onChange={(e) => setNotes(prev => ({ ...prev, risks: e.target.value.split('\n').filter(s => s) }))}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/40 focus:border-red-400/50 
                focus:outline-none transition-colors resize-none text-sm"
              placeholder="Identify potential risks..."
            />
          </div>
        </div>

        {/* General Notes */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <label className="text-sm font-medium text-white">General Comments</label>
          </div>
          <textarea
            value={notes.general}
            onChange={(e) => setNotes(prev => ({ ...prev, general: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white placeholder-white/40 focus:border-blue-400/50 
              focus:outline-none transition-colors resize-none text-sm"
            placeholder="Additional comments or observations..."
          />
        </div>

        {/* Recommendation */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-white mb-2">Recommendation</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['highly_recommended', 'recommended', 'acceptable', 'not_recommended'].map(rec => (
              <button
                key={rec}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                  currentBid.recommendation === rec
                    ? rec === 'highly_recommended' 
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                      : rec === 'recommended'
                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-100'
                      : rec === 'acceptable'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-100'
                      : 'bg-red-500/20 border-red-400/50 text-red-100'
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                }`}
              >
                {rec.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disqualify Modal */}
      <AnimatePresence>
        {showDisqualifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDisqualifyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Disqualify Bid</h3>
              </div>

              <p className="text-white/60 mb-4">
                Are you sure you want to disqualify this bid? This action cannot be undone.
              </p>

              <label className="block text-sm font-medium text-white mb-2">
                Reason for Disqualification
              </label>
              <textarea
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:border-red-400/50 
                  focus:outline-none transition-colors resize-none mb-4"
                placeholder="Provide a clear reason for disqualification..."
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDisqualifyModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white font-medium 
                    transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisqualify}
                  disabled={!disqualifyReason}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                    border border-red-400/50 rounded-lg text-red-100 font-medium 
                    transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Disqualify
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}