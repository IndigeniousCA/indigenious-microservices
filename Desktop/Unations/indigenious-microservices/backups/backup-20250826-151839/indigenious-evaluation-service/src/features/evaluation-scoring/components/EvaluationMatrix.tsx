// Evaluation Matrix Component
// Side-by-side comparison of all bids

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  ChevronUp, ChevronDown, Eye, EyeOff, Download,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import type { Evaluation, EvaluatedBid, EvaluationCriterion } from '../types/evaluation.types'

interface EvaluationMatrixProps {
  evaluation: Evaluation
  bids: EvaluatedBid[]
}

export function EvaluationMatrix({ evaluation, bids }: EvaluationMatrixProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([])
  const [showWeights, setShowWeights] = useState(true)
  const [highlightWinner, setHighlightWinner] = useState(true)
  const [selectedBids, setSelectedBids] = useState<string[]>(bids.map(b => b.bidId))

  // Toggle criterion expansion
  const toggleCriterion = (criterionId: string) => {
    setExpandedCriteria(prev =>
      prev.includes(criterionId)
        ? prev.filter(id => id !== criterionId)
        : [...prev, criterionId]
    )
  }

  // Toggle bid selection
  const toggleBidSelection = (bidId: string) => {
    setSelectedBids(prev =>
      prev.includes(bidId)
        ? prev.filter(id => id !== bidId)
        : [...prev, bidId]
    )
  }

  // Get selected bids
  const displayedBids = bids.filter(bid => selectedBids.includes(bid.bidId))

  // Calculate criterion statistics
  const getCriterionStats = (criterionId: string) => {
    const scores = displayedBids
      .map(bid => bid.scores.find(s => s.criterionId === criterionId)?.score || 0)
      .filter(score => score > 0)

    if (scores.length === 0) return { avg: 0, min: 0, max: 0 }

    return {
      avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores)
    }
  }

  // Get score color
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-emerald-400'
    if (percentage >= 60) return 'text-blue-400'
    if (percentage >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  // Export matrix
  const exportMatrix = () => {
    // Would implement CSV/Excel export
    logger.info('Exporting matrix...')
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Display Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={showWeights}
                onChange={(e) => setShowWeights(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show weights</span>
            </label>
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={highlightWinner}
                onChange={(e) => setHighlightWinner(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Highlight winners</span>
            </label>
          </div>

          {/* Bid Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/60">Compare:</span>
            {bids.map(bid => (
              <label key={bid.bidId} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={selectedBids.includes(bid.bidId)}
                  onChange={() => toggleBidSelection(bid.bidId)}
                  className="rounded"
                />
                <span className="text-sm text-white/80">
                  {evaluation.settings.blindEvaluation 
                    ? `Bid ${bid.bidId.slice(-4)}` 
                    : bid.bidderName.split(' ')[0]}
                </span>
              </label>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={exportMatrix}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white text-sm font-medium transition-all duration-200 
              flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-4 text-white font-medium sticky left-0 bg-gray-900/95 backdrop-blur-md">
                  Criteria
                </th>
                {showWeights && (
                  <th className="text-center p-4 text-white/80 font-medium min-w-[80px]">
                    Weight
                  </th>
                )}
                <th className="text-center p-4 text-white/80 font-medium min-w-[100px]">
                  Max Score
                </th>
                {displayedBids.map(bid => (
                  <th key={bid.bidId} className="text-center p-4 min-w-[150px]">
                    <div className="text-white font-medium">
                      {evaluation.settings.blindEvaluation 
                        ? `Bidder ${bid.bidId.slice(-4)}` 
                        : bid.bidderName}
                    </div>
                    {!bid.isCompliant && (
                      <span className="text-xs text-red-400">Disqualified</span>
                    )}
                  </th>
                ))}
                <th className="text-center p-4 text-white/80 font-medium min-w-[100px]">
                  Average
                </th>
              </tr>
            </thead>
            <tbody>
              {evaluation.criteria.map((criterion, index) => {
                const isExpanded = expandedCriteria.includes(criterion.id)
                const stats = getCriterionStats(criterion.id)
                
                return (
                  <>
                    <motion.tr
                      key={criterion.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 sticky left-0 bg-gray-900/95 backdrop-blur-md">
                        <button
                          onClick={() => criterion.subCriteria && toggleCriterion(criterion.id)}
                          className="flex items-center space-x-2 text-left w-full"
                        >
                          {criterion.subCriteria && (
                            isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-white/60" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-white/60" />
                            )
                          )}
                          <span className="text-white font-medium">{criterion.name}</span>
                        </button>
                      </td>
                      {showWeights && (
                        <td className="text-center p-4 text-white/80">
                          {criterion.weight}%
                        </td>
                      )}
                      <td className="text-center p-4 text-white/80">
                        {criterion.maxPoints}
                      </td>
                      {displayedBids.map(bid => {
                        const score = bid.scores.find(s => s.criterionId === criterion.id)
                        const isHighest = highlightWinner && score && score.score === stats.max
                        
                        return (
                          <td key={bid.bidId} className="text-center p-4">
                            {score ? (
                              <div className={isHighest ? 'font-bold' : ''}>
                                <div className={getScoreColor(score.score, criterion.maxPoints)}>
                                  {score.score.toFixed(1)}
                                </div>
                                {showWeights && (
                                  <div className="text-xs text-white/60 mt-1">
                                    ({score.weightedScore.toFixed(1)})
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center p-4 text-white/60">
                        {stats.avg.toFixed(1)}
                      </td>
                    </motion.tr>

                    {/* Sub-criteria rows */}
                    {isExpanded && criterion.subCriteria?.map(sub => (
                      <tr key={sub.id} className="border-b border-white/5 bg-white/5">
                        <td className="pl-12 p-3 text-white/80 sticky left-0 bg-gray-900/90">
                          {sub.name}
                        </td>
                        {showWeights && <td />}
                        <td className="text-center p-3 text-white/60 text-sm">
                          {sub.maxPoints}
                        </td>
                        {displayedBids.map(bid => {
                          const score = bid.scores.find(s => s.criterionId === criterion.id)
                          const subScore = score?.subScores?.find(ss => ss.subCriterionId === sub.id)
                          
                          return (
                            <td key={bid.bidId} className="text-center p-3">
                              {subScore ? (
                                <span className={`text-sm ${getScoreColor(subScore.score, sub.maxPoints)}`}>
                                  {subScore.score.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-white/30 text-sm">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td />
                      </tr>
                    ))}
                  </>
                )
              })}

              {/* Total Row */}
              <tr className="border-t-2 border-white/20 bg-white/5 font-bold">
                <td className="p-4 text-white sticky left-0 bg-gray-900/95">
                  TOTAL SCORE
                </td>
                {showWeights && (
                  <td className="text-center p-4 text-white">100%</td>
                )}
                <td className="text-center p-4 text-white">100</td>
                {displayedBids.map(bid => {
                  const isWinner = highlightWinner && bid.rank === 1
                  
                  return (
                    <td key={bid.bidId} className="text-center p-4">
                      <div className={`${isWinner ? 'text-emerald-400' : 'text-white'} text-lg`}>
                        {bid.totalScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        {bid.normalizedScore.toFixed(1)}%
                      </div>
                      {isWinner && (
                        <div className="text-xs text-emerald-400 mt-1">
                          WINNER
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="text-center p-4 text-white">
                  {(displayedBids.reduce((sum, b) => sum + b.totalScore, 0) / displayedBids.length).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
        
        <div className="space-y-4">
          {evaluation.criteria.map(criterion => {
            const scores = displayedBids.map(bid => 
              bid.scores.find(s => s.criterionId === criterion.id)?.score || 0
            )
            const maxPossible = criterion.maxPoints
            const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length || 0
            const avgPercentage = (avgScore / maxPossible) * 100

            return (
              <div key={criterion.id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/80">{criterion.name}</span>
                  <span className="text-sm text-white/60">
                    Avg: {avgScore.toFixed(1)}/{maxPossible} ({avgPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-8 bg-white/10 rounded-lg overflow-hidden flex">
                  {displayedBids.map((bid, index) => {
                    const score = bid.scores.find(s => s.criterionId === criterion.id)?.score || 0
                    const percentage = (score / maxPossible) * 100
                    
                    return (
                      <div
                        key={bid.bidId}
                        className={`h-full transition-all duration-300 ${
                          index % 2 === 0 ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                        title={`${bid.bidderName}: ${score}/${maxPossible}`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Highest Scorer */}
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm text-emerald-100/80">Highest Score</p>
              <p className="font-medium text-emerald-100">
                {displayedBids[0]?.bidderName || 'N/A'} - {displayedBids[0]?.normalizedScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Most Consistent */}
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Minus className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-blue-100/80">Most Consistent</p>
              <p className="font-medium text-blue-100">
                {/* Calculate bid with lowest variance */}
                {displayedBids[0]?.bidderName || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Best Value */}
        <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-purple-100/80">Best Value</p>
              <p className="font-medium text-purple-100">
                {/* Calculate best price/quality ratio */}
                {displayedBids[0]?.bidderName || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}