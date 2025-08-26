'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, ChevronRight, X, Zap, Lightbulb, 
  TrendingUp, MousePointer, AlertCircle 
} from 'lucide-react'
import { Suggestion } from '../types'
import { GlassPanel } from '@/components/ui/glass-panel'

interface SmartSuggestionsProps {
  suggestions: Suggestion[]
  onDismiss: (id: string) => void
}

export function SmartSuggestions({ suggestions, onDismiss }: SmartSuggestionsProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id))

  const getIcon = (type: string) => {
    switch (type) {
      case 'next_step': return <ChevronRight className="w-4 h-4" />
      case 'shortcut': return <Zap className="w-4 h-4" />
      case 'optimization': return <TrendingUp className="w-4 h-4" />
      case 'feature': return <Lightbulb className="w-4 h-4" />
      case 'correction': return <AlertCircle className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  const getColorClass = (type: string) => {
    switch (type) {
      case 'next_step': return 'text-blue-400 bg-blue-500/20'
      case 'shortcut': return 'text-yellow-400 bg-yellow-500/20'
      case 'optimization': return 'text-green-400 bg-green-500/20'
      case 'feature': return 'text-purple-400 bg-purple-500/20'
      case 'correction': return 'text-red-400 bg-red-500/20'
      default: return 'text-white bg-white/20'
    }
  }

  const handleDismiss = (id: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(id))
    onDismiss(id)
  }

  const handleAction = (suggestion: Suggestion) => {
    // Execute the suggestion action
    switch (suggestion.action.type) {
      case 'navigate':
        // Navigate to location
        logger.info('Navigating to:', suggestion.action.payload)
        break
      case 'execute':
        // Execute action
        logger.info('Executing:', suggestion.action.payload)
        break
      case 'learn':
        // Show learning content
        logger.info('Learning:', suggestion.action.payload)
        break
      case 'enable':
        // Enable feature
        logger.info('Enabling:', suggestion.action.payload)
        break
    }
    
    handleDismiss(suggestion.id)
  }

  if (visibleSuggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 right-6 z-40 max-w-sm"
    >
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-medium">Smart Suggestions</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <motion.div
                animate={{ rotate: isMinimized ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-white/60" />
              </motion.div>
            </button>
            <button
              onClick={() => visibleSuggestions.forEach(s => handleDismiss(s.id))}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {visibleSuggestions.slice(0, 3).map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <button
                    onClick={() => handleAction(suggestion)}
                    className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getColorClass(suggestion.type)}`}>
                        {getIcon(suggestion.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {suggestion.title}
                        </p>
                        <p className="text-white/60 text-xs mt-0.5">
                          {suggestion.description}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(suggestion.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-white/60" />
                      </button>
                    </div>
                    
                    {/* Confidence indicator */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${suggestion.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40">
                        {Math.round(suggestion.confidence * 100)}% relevant
                      </span>
                    </div>
                  </button>
                </motion.div>
              ))}

              {visibleSuggestions.length > 3 && (
                <p className="text-center text-xs text-white/40 py-2">
                  +{visibleSuggestions.length - 3} more suggestions
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  )
}