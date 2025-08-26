'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter, Grid, List, Search, Star, Zap, Clock, Users, 
  Brain, Shield, Eye, Sparkles, TrendingUp, Award 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { FeatureCard } from './FeatureCard'
import { FeatureDiscoveryService } from '../services/FeatureDiscoveryService'
import type { 
  Feature, FeatureCategory, FeatureRecommendation, 
  UserProfile, PersonalizedDiscovery 
} from '../types'

interface FeatureGalleryProps {
  userProfile: UserProfile
  onFeatureInteraction?: (featureId: string, action: string) => void
}

export function FeatureGallery({ userProfile, onFeatureInteraction }: FeatureGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'newest'>('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const discoveryService = useMemo(() => new FeatureDiscoveryService(), [])
  
  const personalizedDiscovery = useMemo(() => 
    discoveryService.personalizeExperience(userProfile), 
    [discoveryService, userProfile]
  )
  
  const categories = useMemo(() => 
    discoveryService.getFeatureCategories(), 
    [discoveryService]
  )
  
  const allFeatures = useMemo(() => 
    discoveryService.getAllFeatures(), 
    [discoveryService]
  )

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let features = allFeatures

    // Apply search filter
    if (searchQuery) {
      features = features.filter(feature =>
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.discovery.tagline.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      features = features.filter(feature => feature.category === selectedCategory)
    }

    // Apply sorting
    switch (sortBy) {
      case 'relevance':
        // Sort by recommendation score if available
        const recommendationMap = new Map(
          personalizedDiscovery.recommendations.map(rec => [rec.feature.id, rec.score])
        )
        features.sort((a, b) => {
          const scoreA = recommendationMap.get(a.id) || 0
          const scoreB = recommendationMap.get(b.id) || 0
          return scoreB - scoreA
        })
        break
      case 'popularity':
        features.sort((a, b) => b.engagement.adoptions - a.engagement.adoptions)
        break
      case 'newest':
        features.sort((a, b) => b.metadata.releaseDate.getTime() - a.metadata.releaseDate.getTime())
        break
    }

    return features
  }, [allFeatures, searchQuery, selectedCategory, sortBy, personalizedDiscovery.recommendations])

  const categoryIcons = {
    'ai-powered': Brain,
    'partnerships': Users,
    'compliance': Shield,
    'visualization': Eye
  }

  const handleFeatureAction = (featureId: string, action: string) => {
    discoveryService.trackEngagement({
      userId: userProfile.id,
      featureId,
      timestamp: new Date(),
      type: action as unknown,
      source: 'gallery',
      context: {
        page: 'feature-discovery',
        session: 'demo-session'
      },
      outcome: {
        duration: 0,
        completed: true
      }
    })
    
    onFeatureInteraction?.(featureId, action)
  }

  return (
    <div className="space-y-6">
      {/* Header with personalized insights */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Discover New Features
            </h1>
            <p className="text-white/60">
              AI-curated features designed for your workflow
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {personalizedDiscovery.gamification.level}
              </div>
              <div className="text-xs text-white/60">Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {personalizedDiscovery.gamification.points}
              </div>
              <div className="text-xs text-white/60">Points</div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {personalizedDiscovery.recommendations.length}
            </div>
            <div className="text-sm text-white/60">Recommended</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {allFeatures.length - personalizedDiscovery.recommendations.length}
            </div>
            <div className="text-sm text-white/60">Available</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {personalizedDiscovery.gamification.achievements.length}
            </div>
            <div className="text-sm text-white/60">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {personalizedDiscovery.gamification.streak}
            </div>
            <div className="text-sm text-white/60">Day Streak</div>
          </div>
        </div>
      </GlassPanel>

      {/* Top Recommendations */}
      {personalizedDiscovery.recommendations.length > 0 && (
        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">
              Recommended for You
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {personalizedDiscovery.recommendations.slice(0, 2).map((recommendation) => (
              <FeatureCard
                key={recommendation.feature.id}
                feature={recommendation.feature}
                recommendation={recommendation}
                onAction={handleFeatureAction}
                variant="recommendation"
              />
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Search and Filters */}
      <GlassPanel className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <GlassInput
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="relevance">Most Relevant</option>
            <option value="popularity">Most Popular</option>
            <option value="newest">Newest</option>
          </select>

          {/* View Mode */}
          <div className="flex gap-2">
            <GlassButton
              variant={viewMode === 'grid' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </GlassButton>
            <GlassButton
              variant={viewMode === 'list' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </GlassButton>
          </div>
        </div>

        {/* Active Filters */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="flex gap-2 mt-4">
            {searchQuery && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                Search: "{searchQuery}"
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                Category: {categories.find(c => c.id === selectedCategory)?.name}
              </span>
            )}
          </div>
        )}
      </GlassPanel>

      {/* Feature Categories */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map(category => {
          const Icon = categoryIcons[category.id as keyof typeof categoryIcons] || Star
          return (
            <GlassPanel 
              key={category.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedCategory === category.id 
                  ? 'ring-2 ring-blue-400 bg-blue-500/10' 
                  : 'hover:bg-white/5'
              }`}
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? 'all' : category.id
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-${category.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${category.color}-400`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{category.name}</h3>
                  <p className="text-xs text-white/60">{category.metrics.totalFeatures} features</p>
                </div>
              </div>
              <p className="text-sm text-white/60">{category.description}</p>
            </GlassPanel>
          )
        })}
      </div>

      {/* Feature Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${sortBy}-${selectedCategory}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredFeatures.map(feature => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onAction={handleFeatureAction}
              variant={viewMode === 'list' ? 'list' : 'card'}
              recommendation={personalizedDiscovery.recommendations.find(
                rec => rec.feature.id === feature.id
              )}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {filteredFeatures.length === 0 && (
        <GlassPanel className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No features found
          </h3>
          <p className="text-white/60 mb-4">
            Try adjusting your search or filters
          </p>
          <GlassButton
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
          >
            Clear Filters
          </GlassButton>
        </GlassPanel>
      )}
    </div>
  )
}