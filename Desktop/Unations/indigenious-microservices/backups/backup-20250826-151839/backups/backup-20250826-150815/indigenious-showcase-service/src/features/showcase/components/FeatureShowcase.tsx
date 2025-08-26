'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  Brain, Shield, Users, BarChart3, MessageSquare,
  Box, Sparkles, Camera, Download, ChevronRight,
  Grid3x3, List, Eye, X
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

// Import all feature components
import { AIBidAssistant } from '@/features/ai-bid-assistant/components/AIBidAssistant'
import { CollaborativeBidRoom } from '@/features/collaborative-bid/components/CollaborativeBidRoom'
import { ConsortiumMatcher } from '@/features/consortium-matching/components/ConsortiumMatcher'
import { ModelViewer3D, ModelGallery } from '@/features/model-viewer/components'
import { PredictiveAnalyticsDashboard } from '@/features/predictive-analytics/components/PredictiveAnalyticsDashboard'
import { ComplianceChecker } from '@/features/compliance-checker/components/ComplianceChecker'
import { VisualPipelineTracker } from '@/features/pipeline-tracker/components/VisualPipelineTracker'

interface Feature {
  id: string
  name: string
  description: string
  icon: React.ElementType
  component: React.ComponentType<unknown>
  props?: any
  backgroundColor?: string
}

export function FeatureShowcase() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFullscreen, setShowFullscreen] = useState(false)

  const features: Feature[] = [
    {
      id: 'ai-bid-assistant',
      name: 'AI Bid Writing Assistant',
      description: 'AI-powered bid generation with smart suggestions and compliance checking',
      icon: Brain,
      component: AIBidAssistant,
      props: {
        rfqId: 'rfq-2024-001',
        businessId: 'business-123'
      },
      backgroundColor: 'from-blue-600/20 to-purple-600/20'
    },
    {
      id: 'collaborative-bid',
      name: 'Collaborative Bid Room',
      description: 'Real-time collaboration with team presence and section locking',
      icon: MessageSquare,
      component: CollaborativeBidRoom,
      props: {
        bidId: 'bid-456'
      },
      backgroundColor: 'from-green-600/20 to-teal-600/20'
    },
    {
      id: 'consortium-matcher',
      name: 'Consortium Matching System',
      description: 'Find and form partnerships with complementary businesses',
      icon: Users,
      component: ConsortiumMatcher,
      props: {},
      backgroundColor: 'from-purple-600/20 to-pink-600/20'
    },
    {
      id: 'model-viewer',
      name: '3D Model Viewer',
      description: 'View and annotate 3D models without special software',
      icon: Box,
      component: ModelGallery,
      props: {
        projectId: 'proj-789'
      },
      backgroundColor: 'from-orange-600/20 to-red-600/20'
    },
    {
      id: 'predictive-analytics',
      name: 'Predictive Success Analytics',
      description: 'AI-powered bid success predictions and recommendations',
      icon: Sparkles,
      component: PredictiveAnalyticsDashboard,
      props: {
        businessId: 'business-123',
        rfqId: 'rfq-2024-001'
      },
      backgroundColor: 'from-indigo-600/20 to-blue-600/20'
    },
    {
      id: 'compliance-checker',
      name: 'Automated Compliance Checker',
      description: 'Ensure bids meet all requirements with auto-fix capabilities',
      icon: Shield,
      component: ComplianceChecker,
      props: {
        rfqId: 'rfq-2024-001',
        businessId: 'business-123'
      },
      backgroundColor: 'from-emerald-600/20 to-green-600/20'
    },
    {
      id: 'pipeline-tracker',
      name: 'Visual Pipeline Tracker',
      description: 'Track opportunities through stages with drag-and-drop management',
      icon: BarChart3,
      component: VisualPipelineTracker,
      props: {
        businessId: 'business-123'
      },
      backgroundColor: 'from-cyan-600/20 to-blue-600/20'
    }
  ]

  const captureScreenshot = async (featureId: string) => {
    // In a real implementation, this would use html2canvas or similar
    // to capture the component and download as PNG
    logger.info(`Capturing screenshot of ${featureId}`)
    
    // For now, we'll show a notification
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-400/50 text-green-400 px-4 py-2 rounded-lg z-50'
    notification.textContent = 'Screenshot captured! (In production, this would download a PNG)'
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  const renderFeatureCard = (feature: Feature) => (
    <motion.div
      key={feature.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <GlassPanel className="p-6 h-full flex flex-col hover:bg-white/5 transition-all cursor-pointer group">
        <div 
          className={`w-full h-48 rounded-lg bg-gradient-to-br ${feature.backgroundColor} mb-4 flex items-center justify-center relative overflow-hidden`}
        >
          <feature.icon className="w-24 h-24 text-white/20" />
          
          {/* Hover Actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFeature(feature)
                setShowFullscreen(true)
              }}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
              title="View Demo"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                captureScreenshot(feature.id)
              }}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
              title="Capture Screenshot"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
        <p className="text-sm text-white/60 flex-1">{feature.description}</p>
        
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => {
              setSelectedFeature(feature)
              setShowFullscreen(true)
            }}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View Demo
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              captureScreenshot(feature.id)
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </GlassPanel>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Indigenious Platform Features
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Explore our cutting-edge features designed to help Indigenous businesses win more government contracts
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => renderFeatureCard(feature))}
          </div>
        ) : (
          <div className="space-y-4">
            {features.map(feature => (
              <GlassPanel key={feature.id} className="p-6">
                <div className="flex items-center gap-6">
                  <div className={`w-24 h-24 rounded-lg bg-gradient-to-br ${feature.backgroundColor} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-12 h-12 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.name}</h3>
                    <p className="text-white/60">{feature.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassButton
                      onClick={() => {
                        setSelectedFeature(feature)
                        setShowFullscreen(true)
                      }}
                      size="sm"
                    >
                      View Demo
                    </GlassButton>
                    <button
                      onClick={() => captureScreenshot(feature.id)}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Camera className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 text-center">
          <p className="text-white/60">
            Click "View Demo" to see each feature in action, or use the camera icon to capture a screenshot
          </p>
          <p className="text-sm text-white/40 mt-2">
            Note: In production, screenshots would be automatically saved as PNG files
          </p>
        </div>
      </div>

      {/* Fullscreen Feature Demo */}
      {showFullscreen && selectedFeature && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 overflow-auto"
        >
          <div className="min-h-screen p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedFeature.name}</h2>
                  <p className="text-white/60">{selectedFeature.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => captureScreenshot(selectedFeature.id)}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    title="Capture Screenshot"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      setShowFullscreen(false)
                      setSelectedFeature(null)
                    }}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Component */}
            <div className="max-w-7xl mx-auto">
              <selectedFeature.component {...selectedFeature.props} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}