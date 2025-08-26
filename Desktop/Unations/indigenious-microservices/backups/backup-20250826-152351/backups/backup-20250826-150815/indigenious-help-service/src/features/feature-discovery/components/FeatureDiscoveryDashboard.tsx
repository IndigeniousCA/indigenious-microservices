'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, TrendingUp, Award, Target, BookOpen, 
  Users, Clock, Star, ChevronRight, Gift 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { FeatureGallery } from './FeatureGallery'
import { FeatureSpotlight } from './FeatureSpotlight'
import { DiscoveryPath } from './DiscoveryPath'
import { GamificationPanel } from './GamificationPanel'
import { FeatureDiscoveryService } from '../services/FeatureDiscoveryService'
import type { UserProfile } from '../types'

interface FeatureDiscoveryDashboardProps {
  userProfile: UserProfile
}

export function FeatureDiscoveryDashboard({ userProfile }: FeatureDiscoveryDashboardProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'path' | 'achievements'>('discover')
  const [spotlightFeature, setSpotlightFeature] = useState<string | null>(null)

  const discoveryService = useMemo(() => new FeatureDiscoveryService(), [])
  
  const personalizedDiscovery = useMemo(() => 
    discoveryService.personalizeExperience(userProfile), 
    [discoveryService, userProfile]
  )

  const successStories = useMemo(() => 
    discoveryService.getSuccessStories(), 
    [discoveryService]
  )

  const handleFeatureInteraction = (featureId: string, action: string) => {
    discoveryService.trackEngagement({
      userId: userProfile.id,
      featureId,
      timestamp: new Date(),
      type: action as unknown,
      source: 'dashboard',
      context: {
        page: 'feature-discovery-dashboard',
        session: 'demo-session'
      },
      outcome: {
        duration: 0,
        completed: true
      }
    })

    // Handle specific actions
    switch (action) {
      case 'spotlight':
        setSpotlightFeature(featureId)
        break
      case 'trial':
        // Navigate to feature trial
        window.open(`/features/${featureId}/trial`, '_blank')
        break
      case 'demo':
        // Open demo modal
        window.open(`/demos/${featureId}`, '_blank')
        break
    }
  }

  const tabs = [
    {
      id: 'discover' as const,
      label: 'Discover',
      icon: Sparkles,
      description: 'Find new features'
    },
    {
      id: 'path' as const,
      label: 'Your Path',
      icon: Target,
      description: 'Guided discovery'
    },
    {
      id: 'achievements' as const,
      label: 'Achievements',
      icon: Award,
      description: 'Your progress'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to Feature Discovery! 
              </h1>
              <p className="text-white/60 text-lg">
                Unlock the full potential of Indigenious with AI-powered recommendations
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {personalizedDiscovery.recommendations.length}
                </div>
                <div className="text-sm text-white/60">New for you</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {personalizedDiscovery.gamification.points}
                </div>
                <div className="text-sm text-white/60">Points earned</div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Quick Recommendations */}
        {personalizedDiscovery.recommendations.length > 0 && (
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">
                  Perfect for You Right Now
                </h2>
              </div>
              <GlassButton
                size="sm"
                onClick={() => setActiveTab('discover')}
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {personalizedDiscovery.recommendations.slice(0, 3).map((recommendation) => (
                <motion.div
                  key={recommendation.feature.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-lg cursor-pointer"
                  onClick={() => handleFeatureInteraction(recommendation.feature.id, 'spotlight')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white">
                      {recommendation.feature.name}
                    </h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                      {recommendation.score}% match
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-3">
                    {recommendation.reasoning.personalizedMessage}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Clock className="w-3 h-3" />
                      <span>{recommendation.impact.timeToValue}m to value</span>
                    </div>
                    <GlassButton size="sm">
                      Try Now
                    </GlassButton>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        )}

        {/* Success Story Highlight */}
        {successStories.length > 0 && (
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">
                Success Story
              </h2>
            </div>
            
            {successStories.slice(0, 1).map((story) => (
              <div key={story.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <blockquote className="text-lg text-white/80 italic mb-4">
                    "{story.content.quote}"
                  </blockquote>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {story.subject.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{story.subject.name}</p>
                      <p className="text-white/60 text-sm">
                        {story.subject.role} at {story.subject.company}
                      </p>
                    </div>
                    {story.subject.verified && (
                      <div className="ml-auto">
                        <Star className="w-5 h-5 text-yellow-400" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white/60">
                    {story.content.summary}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="text-lg font-bold text-green-400">
                      {story.impact.timeSaved}
                    </div>
                    <div className="text-sm text-white/60">Time Saved</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                    <div className="text-lg font-bold text-blue-400">
                      {story.impact.revenueImpact}
                    </div>
                    <div className="text-sm text-white/60">Revenue Impact</div>
                  </div>
                  
                  <GlassButton
                    className="w-full"
                    onClick={() => handleFeatureInteraction(story.featureId, 'learn')}
                  >
                    Learn About This Feature
                  </GlassButton>
                </div>
              </div>
            ))}
          </GlassPanel>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <GlassButton
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'secondary'}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1"
              >
                <Icon className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-80">{tab.description}</div>
                </div>
              </GlassButton>
            )
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'discover' && (
              <FeatureGallery 
                userProfile={userProfile}
                onFeatureInteraction={handleFeatureInteraction}
              />
            )}
            
            {activeTab === 'path' && (
              <DiscoveryPath 
                discoveryPath={personalizedDiscovery.discoveryPath}
                onFeatureInteraction={handleFeatureInteraction}
              />
            )}
            
            {activeTab === 'achievements' && (
              <GamificationPanel 
                gamificationState={personalizedDiscovery.gamification}
                userProfile={userProfile}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Feature Spotlight Modal */}
        <AnimatePresence>
          {spotlightFeature && (
            <FeatureSpotlight
              featureId={spotlightFeature}
              onClose={() => setSpotlightFeature(null)}
              onAction={handleFeatureInteraction}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}