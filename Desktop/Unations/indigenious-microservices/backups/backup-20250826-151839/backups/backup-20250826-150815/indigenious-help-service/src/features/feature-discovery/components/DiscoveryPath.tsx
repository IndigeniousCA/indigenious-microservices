'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowRight, Clock, CheckCircle, Play, BookOpen, 
  Zap, Target, Star, Users 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import type { DiscoveryPath as DiscoveryPathType } from '../types'

interface DiscoveryPathProps {
  discoveryPath: DiscoveryPathType[]
  onFeatureInteraction: (featureId: string, action: string) => void
}

export function DiscoveryPath({ discoveryPath, onFeatureInteraction }: DiscoveryPathProps) {
  const totalTime = discoveryPath.reduce((sum, step) => sum + step.timeEstimate, 0)
  
  if (discoveryPath.length === 0) {
    return (
      <GlassPanel className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
          <Target className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          No Discovery Path Available
        </h2>
        <p className="text-white/60">
          Complete your profile and start exploring features to get personalized recommendations
        </p>
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-6">
      {/* Path Overview */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Your Personalized Discovery Path
            </h1>
            <p className="text-white/60">
              A curated journey through features that will transform your workflow
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {totalTime}
            </div>
            <div className="text-sm text-white/60">minutes total</div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-purple-400">
              {discoveryPath.length}
            </div>
            <div className="text-sm text-white/60">Features to explore</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-green-400">
              0
            </div>
            <div className="text-sm text-white/60">Completed</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-blue-400">
              {Math.round(totalTime / discoveryPath.length)}
            </div>
            <div className="text-sm text-white/60">Avg. time per step</div>
          </div>
        </div>
      </GlassPanel>

      {/* Discovery Steps */}
      <div className="space-y-4">
        {discoveryPath.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassPanel className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Step Number & Status */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border-2 border-blue-400/30">
                      <span className="text-lg font-bold text-white">
                        {step.step}
                      </span>
                    </div>
                    {index < discoveryPath.length - 1 && (
                      <div className="absolute top-12 left-6 w-0.5 h-8 bg-gradient-to-b from-blue-400/50 to-transparent" />
                    )}
                  </div>
                  
                  <div>
                    <div className="text-sm text-blue-400 font-medium mb-1">
                      Step {step.step}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <Clock className="w-3 h-3" />
                      <span>{step.timeEstimate} minutes</span>
                    </div>
                  </div>
                </div>

                {/* Feature Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {step.feature.name}
                      </h3>
                      <p className="text-white/60 text-sm mb-2">
                        {step.reason}
                      </p>
                      
                      {/* Feature Stats */}
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span>{step.feature.engagement.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{step.feature.engagement.adoptions} users</span>
                        </div>
                        <div className="capitalize">
                          {step.feature.metadata.complexity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 lg:justify-end">
                  <GlassButton
                    size="sm"
                    onClick={() => onFeatureInteraction(step.feature.id, 'trial')}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onFeatureInteraction(step.feature.id, 'learn')}
                  >
                    <BookOpen className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>

              {/* Prerequisites */}
              {step.dependencies.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-yellow-400 mb-2">
                    Prerequisites:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.dependencies.map((dep, depIndex) => (
                      <span
                        key={depIndex}
                        className="px-2 py-1 bg-yellow-500/10 text-yellow-300 rounded-full text-xs"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Benefits */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {step.feature.discovery.highlights.slice(0, 3).map((highlight, highlightIndex) => (
                    <div key={highlightIndex} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* Path Completion */}
      <GlassPanel className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
            <Target className="w-8 h-8 text-green-400" />
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-2">
            Complete Your Discovery Journey
          </h2>
          <p className="text-white/60 mb-4">
            Follow this path to unlock the full potential of Indigenious for your business
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-blue-400 mb-1">
                Efficiency
              </div>
              <div className="text-sm text-white/60">
                Save hours every week with automated workflows
              </div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-green-400 mb-1">
                Growth
              </div>
              <div className="text-sm text-white/60">
                Find more opportunities and win more bids
              </div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-purple-400 mb-1">
                Success
              </div>
              <div className="text-sm text-white/60">
                Join thousands of successful Indigenous businesses
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}