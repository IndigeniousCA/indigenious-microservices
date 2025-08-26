'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Play, BookOpen, ExternalLink, Clock, Users, Star, 
  CheckCircle, Zap, Award, TrendingUp 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { FeatureDiscoveryService } from '../services/FeatureDiscoveryService'

interface FeatureSpotlightProps {
  featureId: string
  onClose: () => void
  onAction: (featureId: string, action: string) => void
}

export function FeatureSpotlight({ featureId, onClose, onAction }: FeatureSpotlightProps) {
  const discoveryService = useMemo(() => new FeatureDiscoveryService(), [])
  const feature = discoveryService.getFeature(featureId)
  const demo = discoveryService.getFeatureDemo(featureId)
  const successStories = discoveryService.getSuccessStories(featureId)

  if (!feature) return null

  const handleAction = (action: string) => {
    onAction(featureId, action)
    if (action === 'trial' || action === 'demo') {
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel className="p-0 overflow-hidden">
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="pr-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {feature.name}
                  </h1>
                  <p className="text-blue-300">
                    {feature.discovery.tagline}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{feature.engagement.rating} rating</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Users className="w-4 h-4 text-green-400" />
                  <span>{feature.engagement.adoptions} active users</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{feature.metadata.timeToValue} minutes to value</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassButton
                className="flex-1 p-4 h-auto"
                onClick={() => handleAction('trial')}
              >
                <div className="text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <div className="font-semibold">Try It Now</div>
                  <div className="text-xs text-white/60">Start using immediately</div>
                </div>
              </GlassButton>

              {demo && (
                <GlassButton
                  variant="secondary"
                  className="flex-1 p-4 h-auto"
                  onClick={() => handleAction('demo')}
                >
                  <div className="text-center">
                    <Play className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <div className="font-semibold">Watch Demo</div>
                    <div className="text-xs text-white/60">{demo.duration / 60} min interactive demo</div>
                  </div>
                </GlassButton>
              )}

              <GlassButton
                variant="secondary"
                className="flex-1 p-4 h-auto"
                onClick={() => handleAction('learn')}
              >
                <div className="text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <div className="font-semibold">Learn More</div>
                  <div className="text-xs text-white/60">Documentation & guides</div>
                </div>
              </GlassButton>
            </div>

            {/* Feature Description */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">
                What does this feature do?
              </h2>
              <p className="text-white/80 leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Key Benefits */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">
                Key Benefits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feature.value.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {benefit.description}
                      </p>
                      {benefit.quantified && (
                        <p className="text-green-400 text-sm font-medium mt-1">
                          {benefit.quantified}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            {feature.value.useCases.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  How You'll Use It
                </h2>
                <div className="space-y-4">
                  {feature.value.useCases.map((useCase, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">
                          {useCase.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          useCase.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                          useCase.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {useCase.difficulty}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mb-2">
                        {useCase.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-white/80 font-medium">Scenario: </span>
                          <span className="text-white/60">{useCase.scenario}</span>
                        </div>
                        <div>
                          <span className="text-white/80 font-medium">Outcome: </span>
                          <span className="text-white/60">{useCase.outcome}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Value Metrics */}
            {feature.value.metrics.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Impact Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {feature.value.metrics.map((metric, index) => (
                    <div key={index} className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {metric.value}{metric.unit}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {metric.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {metric.context}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Stories */}
            {successStories.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Success Stories
                </h2>
                {successStories.map((story, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-400/30 rounded-lg">
                    <blockquote className="text-white/80 italic mb-3">
                      "{story.content.quote}"
                    </blockquote>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {story.subject.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {story.subject.name}
                          </p>
                          <p className="text-white/60 text-xs">
                            {story.subject.role}, {story.subject.company}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-sm">
                          {story.impact.revenueImpact}
                        </div>
                        <div className="text-white/60 text-xs">revenue impact</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prerequisites */}
            {feature.requirements.prerequisites.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Prerequisites
                </h2>
                <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-300 text-sm mb-2">
                    Before using this feature, make sure you have:
                  </p>
                  <ul className="space-y-1">
                    {feature.requirements.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-center gap-2 text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}