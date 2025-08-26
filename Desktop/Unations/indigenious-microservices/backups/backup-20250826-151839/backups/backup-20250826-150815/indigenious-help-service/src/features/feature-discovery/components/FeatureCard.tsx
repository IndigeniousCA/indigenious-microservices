'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Star, Clock, Users, Zap, Play, BookOpen, Heart, 
  ExternalLink, Award, TrendingUp, CheckCircle, AlertCircle 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import type { Feature, FeatureRecommendation } from '../types'

interface FeatureCardProps {
  feature: Feature
  recommendation?: FeatureRecommendation
  onAction: (featureId: string, action: string) => void
  variant?: 'card' | 'list' | 'recommendation'
}

export function FeatureCard({ 
  feature, 
  recommendation, 
  onAction, 
  variant = 'card' 
}: FeatureCardProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleAction = (action: string) => {
    onAction(feature.id, action)
  }

  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
    handleAction(isFavorited ? 'unfavorite' : 'favorite')
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-400/50'
      case 'high': return 'text-orange-400 border-orange-400/50'
      case 'medium': return 'text-yellow-400 border-yellow-400/50'
      default: return 'text-blue-400 border-blue-400/50'
    }
  }

  const getMaturityBadge = (maturity: string) => {
    const badges = {
      'beta': { color: 'bg-orange-500/20 text-orange-400', label: 'Beta' },
      'stable': { color: 'bg-green-500/20 text-green-400', label: 'Stable' },
      'mature': { color: 'bg-blue-500/20 text-blue-400', label: 'Mature' }
    }
    return badges[maturity as keyof typeof badges] || badges.stable
  }

  const getComplexityColor = (complexity: string) => {
    const colors = {
      'simple': 'text-green-400',
      'moderate': 'text-yellow-400',
      'advanced': 'text-red-400'
    }
    return colors[complexity as keyof typeof colors] || colors.simple
  }

  if (variant === 'list') {
    return (
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
      >
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Feature Icon/Image */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">
                    {feature.name}
                  </h3>
                  {recommendation && (
                    <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority} priority
                    </span>
                  )}
                </div>
                
                <p className="text-white/60 text-sm mb-2">
                  {feature.discovery.tagline}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {feature.engagement.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {feature.engagement.adoptions} users
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {feature.metadata.timeToValue}m to value
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <GlassButton
                size="sm"
                onClick={() => handleAction('preview')}
              >
                <Play className="w-4 h-4 mr-1" />
                Try
              </GlassButton>
              <button
                onClick={handleFavorite}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'text-red-400 fill-current' : 'text-white/40'}`} />
              </button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      className="group"
    >
      <GlassPanel className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                {feature.name}
              </h3>
              {recommendation && (
                <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(recommendation.priority)}`}>
                  {recommendation.priority}
                </span>
              )}
            </div>
            
            <p className="text-white/60 text-sm leading-relaxed">
              {feature.discovery.tagline}
            </p>
          </div>

          <button
            onClick={handleFavorite}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-2"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'text-red-400 fill-current' : 'text-white/40'}`} />
          </button>
        </div>

        {/* Feature Image/Preview */}
        <div className="relative mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 aspect-video">
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-12 h-12 text-blue-400/50" />
          </div>
          
          {/* Overlay on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <GlassButton
              size="sm"
              onClick={() => handleAction('preview')}
            >
              <Play className="w-4 h-4 mr-1" />
              Preview
            </GlassButton>
          </motion.div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {feature.metadata.maturity === 'beta' && (
              <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">
                Beta
              </span>
            )}
            {feature.metadata.releaseDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
              <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                New
              </span>
            )}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-4">
          <div className="text-sm text-white/80 space-y-1">
            {feature.discovery.highlights.slice(0, 2).map((highlight, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{feature.engagement.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{feature.engagement.adoptions} users</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{feature.metadata.timeToValue}m</span>
          </div>
          <div className={`flex items-center gap-1 ${getComplexityColor(feature.metadata.complexity)}`}>
            <AlertCircle className="w-3 h-3" />
            <span className="capitalize">{feature.metadata.complexity}</span>
          </div>
        </div>

        {/* Recommendation Reasoning */}
        {recommendation && variant === 'recommendation' && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
            <p className="text-sm text-blue-300">
              {recommendation.reasoning.personalizedMessage}
            </p>
            {recommendation.impact.timeToValue && (
              <p className="text-xs text-white/50 mt-1">
                Expected value in {recommendation.impact.timeToValue} minutes
              </p>
            )}
          </div>
        )}

        {/* Value Metrics */}
        {feature.value.metrics.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {feature.value.metrics.slice(0, 2).map((metric, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-bold text-white">
                    {metric.value}{metric.unit}
                  </div>
                  <div className="text-xs text-white/60">{metric.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <GlassButton
              className="flex-1"
              onClick={() => handleAction('trial')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Try Now
            </GlassButton>
            {feature.discovery.demoUrl && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleAction('demo')}
              >
                <Play className="w-4 h-4" />
              </GlassButton>
            )}
          </div>
          
          <div className="flex gap-2">
            <GlassButton
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => handleAction('learn')}
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Learn More
            </GlassButton>
            {feature.discovery.tutorialUrl && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleAction('tutorial')}
              >
                <ExternalLink className="w-4 h-4" />
              </GlassButton>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}