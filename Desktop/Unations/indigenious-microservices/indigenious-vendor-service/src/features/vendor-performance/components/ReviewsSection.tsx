// Reviews Section Component
// Displays and manages vendor reviews

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Star, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle,
  Filter, ChevronDown, ChevronUp, Building, Calendar,
  AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react'
import type { VendorReview } from '../types/performance.types'

interface ReviewsSectionProps {
  reviews: VendorReview[]
  overallRating: number
  vendorId: string
  isOwnProfile: boolean
}

export function ReviewsSection({ 
  reviews, 
  overallRating, 
  vendorId,
  isOwnProfile 
}: ReviewsSectionProps) {
  const [filter, setFilter] = useState({
    rating: 'all',
    verified: false,
    sortBy: 'recent'
  })
  const [expandedReviews, setExpandedReviews] = useState<string[]>([])
  const [showAddResponse, setShowAddResponse] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  // Calculate rating distribution
  const ratingDistribution = {
    5: reviews.filter(r => r.ratings.overall >= 4.5).length,
    4: reviews.filter(r => r.ratings.overall >= 3.5 && r.ratings.overall < 4.5).length,
    3: reviews.filter(r => r.ratings.overall >= 2.5 && r.ratings.overall < 3.5).length,
    2: reviews.filter(r => r.ratings.overall >= 1.5 && r.ratings.overall < 2.5).length,
    1: reviews.filter(r => r.ratings.overall < 1.5).length
  }

  // Calculate aspect ratings
  const aspectRatings = {
    onTimeDelivery: reviews.reduce((sum, r) => sum + r.ratings.onTimeDelivery, 0) / reviews.length || 0,
    qualityOfWork: reviews.reduce((sum, r) => sum + r.ratings.qualityOfWork, 0) / reviews.length || 0,
    communication: reviews.reduce((sum, r) => sum + r.ratings.communication, 0) / reviews.length || 0,
    valueForMoney: reviews.reduce((sum, r) => sum + r.ratings.valueForMoney, 0) / reviews.length || 0
  }

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(r => {
      if (filter.rating === 'all') return true
      const rating = parseInt(filter.rating)
      return r.ratings.overall >= rating && r.ratings.overall < rating + 1
    })
    .filter(r => !filter.verified || r.verified)
    .sort((a, b) => {
      switch (filter.sortBy) {
        case 'helpful':
          return b.helpfulCount - a.helpfulCount
        case 'rating-high':
          return b.ratings.overall - a.ratings.overall
        case 'rating-low':
          return a.ratings.overall - b.ratings.overall
        default: // recent
          return new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
      }
    })

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev =>
      prev.includes(reviewId)
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const handleVoteHelpful = (reviewId: string, isHelpful: boolean) => {
    // In real implementation, would update the database
    logger.info(`Voted ${isHelpful ? 'helpful' : 'not helpful'} for review ${reviewId}`)
  }

  const handleSubmitResponse = (reviewId: string) => {
    // In real implementation, would save to database
    logger.info(`Response for review ${reviewId}: ${responseText}`)
    setShowAddResponse(null)
    setResponseText('')
  }

  const getStarDisplay = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'text-amber-400 fill-amber-400'
            : i < rating
            ? 'text-amber-400 fill-amber-400/50'
            : 'text-white/20'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Rating */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Overall Rating</h3>
            <div className="flex items-center space-x-4 mb-6">
              <div>
                <p className="text-5xl font-bold text-white">{overallRating.toFixed(1)}</p>
                <div className="flex items-center mt-2">
                  {getStarDisplay(overallRating)}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/60">Based on {reviews.length} reviews</p>
                <p className="text-sm text-white/60 mt-1">
                  {reviews.filter(r => r.ratings.wouldRecommend).length} would recommend
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {Object.entries(ratingDistribution).reverse().map(([rating, count]) => (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm text-white/60 w-4">{rating}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / reviews.length) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full bg-amber-400"
                    />
                  </div>
                  <span className="text-sm text-white/60 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aspect Ratings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Rating Breakdown</h3>
            <div className="space-y-4">
              {[
                { key: 'onTimeDelivery', label: 'On-Time Delivery', icon: Calendar },
                { key: 'qualityOfWork', label: 'Quality of Work', icon: CheckCircle },
                { key: 'communication', label: 'Communication', icon: MessageSquare },
                { key: 'valueForMoney', label: 'Value for Money', icon: TrendingUp }
              ].map(aspect => (
                <div key={aspect.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <aspect.icon className="w-5 h-5 text-white/60" />
                    <span className="text-sm text-white">{aspect.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {getStarDisplay(aspectRatings[aspect.key as keyof typeof aspectRatings])}
                    </div>
                    <span className="text-sm text-white/60 ml-2">
                      {aspectRatings[aspect.key as keyof typeof aspectRatings].toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Highlights */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">Common Mentions</h4>
              <div className="flex flex-wrap gap-2">
                {['Professional', 'On-time', 'Quality work', 'Good communication', 'Fair pricing'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-white/60" />
            
            {/* Rating Filter */}
            <select
              value={filter.rating}
              onChange={(e) => setFilter(prev => ({ ...prev, rating: e.target.value }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Ratings</option>
              <option value="5" className="bg-gray-800">5 Stars</option>
              <option value="4" className="bg-gray-800">4 Stars</option>
              <option value="3" className="bg-gray-800">3 Stars</option>
              <option value="2" className="bg-gray-800">2 Stars</option>
              <option value="1" className="bg-gray-800">1 Star</option>
            </select>

            {/* Verified Filter */}
            <label className="flex items-center space-x-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={filter.verified}
                onChange={(e) => setFilter(prev => ({ ...prev, verified: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Verified only</span>
            </label>
          </div>

          {/* Sort Options */}
          <select
            value={filter.sortBy}
            onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value }))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
              focus:border-blue-400/50 focus:outline-none appearance-none"
          >
            <option value="recent" className="bg-gray-800">Most Recent</option>
            <option value="helpful" className="bg-gray-800">Most Helpful</option>
            <option value="rating-high" className="bg-gray-800">Highest Rating</option>
            <option value="rating-low" className="bg-gray-800">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
          >
            {/* Review Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex">{getStarDisplay(review.ratings.overall)}</div>
                  <span className="text-lg font-semibold text-white">{review.headline}</span>
                  {review.verified && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 
                      text-xs rounded-full flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <span>{review.reviewerName}</span>
                  <span>•</span>
                  <span>{review.reviewerOrganization}</span>
                  <span>•</span>
                  <span>{new Date(review.reviewDate).toLocaleDateString()}</span>
                </div>
              </div>
              {review.ratings.wouldRecommend && (
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg 
                  text-sm font-medium">
                  Would Recommend
                </div>
              )}
            </div>

            {/* Project Info */}
            <div className="flex items-center space-x-2 mb-4 text-sm">
              <Building className="w-4 h-4 text-white/40" />
              <span className="text-white/60">Project: {review.projectName}</span>
            </div>

            {/* Review Content */}
            <div className="space-y-3 mb-4">
              {/* Brief Review */}
              <div>
                <p className="text-sm font-medium text-emerald-400 mb-1">What went well:</p>
                <p className="text-white/80">{review.positives}</p>
              </div>
              
              {review.improvements && (
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-1">Areas for improvement:</p>
                  <p className="text-white/80">{review.improvements}</p>
                </div>
              )}

              {/* Detailed Review (expandable) */}
              {review.detailedReview && (
                <div>
                  <button
                    onClick={() => toggleReviewExpansion(review.id)}
                    className="flex items-center space-x-2 text-sm text-blue-400 
                      hover:text-blue-300 transition-colors"
                  >
                    {expandedReviews.includes(review.id) ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Show less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Read full review</span>
                      </>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedReviews.includes(review.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-3"
                      >
                        <p className="text-white/80">{review.detailedReview}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Aspect Ratings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-white/5 rounded-lg">
              {[
                { key: 'onTimeDelivery', label: 'On-Time' },
                { key: 'qualityOfWork', label: 'Quality' },
                { key: 'communication', label: 'Communication' },
                { key: 'valueForMoney', label: 'Value' }
              ].map(aspect => (
                <div key={aspect.key} className="text-center">
                  <p className="text-xs text-white/60 mb-1">{aspect.label}</p>
                  <p className="text-sm font-medium text-white">
                    {review.ratings[aspect.key as keyof typeof review.ratings]}/5
                  </p>
                </div>
              ))}
            </div>

            {/* Vendor Response */}
            {review.vendorResponse && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <p className="text-sm font-medium text-blue-300 mb-2">Vendor Response</p>
                <p className="text-sm text-white/80">{review.vendorResponse.message}</p>
                <p className="text-xs text-white/60 mt-2">
                  {new Date(review.vendorResponse.date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Add Response (for vendor) */}
            {isOwnProfile && !review.vendorResponse && (
              <>
                {showAddResponse === review.id ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg 
                        text-white placeholder-white/40 focus:border-blue-400/50 
                        focus:outline-none transition-colors resize-none"
                      placeholder="Write your response..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSubmitResponse(review.id)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                          border-blue-400/50 rounded-lg text-blue-100 font-medium 
                          transition-all duration-200"
                      >
                        Submit Response
                      </button>
                      <button
                        onClick={() => {
                          setShowAddResponse(null)
                          setResponseText('')
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                          border-white/20 rounded-lg text-white font-medium 
                          transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddResponse(review.id)}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Add Response
                  </button>
                )}
              </>
            )}

            {/* Helpful Votes */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <span className="text-sm text-white/60">Was this review helpful?</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleVoteHelpful(review.id, true)}
                  className="flex items-center space-x-2 px-3 py-1 bg-white/10 hover:bg-white/20 
                    border border-white/20 rounded-lg text-white transition-all duration-200"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-sm">{review.helpfulCount}</span>
                </button>
                <button
                  onClick={() => handleVoteHelpful(review.id, false)}
                  className="flex items-center space-x-2 px-3 py-1 bg-white/10 hover:bg-white/20 
                    border border-white/20 rounded-lg text-white transition-all duration-200"
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span className="text-sm">{review.notHelpfulCount}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No reviews found matching your filters</p>
        </div>
      )}
    </div>
  )
}