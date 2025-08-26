'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ContextHelpService } from '../services/ContextHelpService'
import { UserContext, HelpContext, Tooltip, Tour, Suggestion } from '../types'
import { HelpTooltip } from './HelpTooltip'
import { GuidedTour } from './GuidedTour'
import { SmartSuggestions } from './SmartSuggestions'
import { HelpAssistant } from './HelpAssistant'
import { usePathname } from 'next/navigation'

interface ContextualHelpContextValue {
  showTooltip: (element: HTMLElement) => void
  hideTooltip: (elementId: string) => void
  startTour: (tourId: string) => void
  showAssistant: () => void
  hideAssistant: () => void
  suggestions: Suggestion[]
  activeTour: Tour | null
  isAssistantOpen: boolean
}

const ContextualHelpContext = createContext<ContextualHelpContextValue | null>(null)

export function useContextualHelp() {
  const context = useContext(ContextualHelpContext)
  if (!context) {
    throw new Error('useContextualHelp must be used within ContextualHelpProvider')
  }
  return context
}

interface ContextualHelpProviderProps {
  children: React.ReactNode
  userId: string
  userType: 'indigenous_business' | 'canadian_business' | 'government' | 'admin'
  userExperience: 'beginner' | 'intermediate' | 'expert'
}

export function ContextualHelpProvider({ 
  children, 
  userId, 
  userType, 
  userExperience 
}: ContextualHelpProviderProps) {
  const pathname = usePathname()
  const [helpService] = useState(() => new ContextHelpService())
  const [activeTooltips, setActiveTooltips] = useState<Map<string, Tooltip>>(new Map())
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [userContext, setUserContext] = useState<UserContext | null>(null)

  // Build user context
  useEffect(() => {
    const context: UserContext = {
      page: pathname,
      component: '',
      user: {
        id: userId,
        type: userType,
        experience: userExperience,
        role: 'user',
        preferences: {
          help_level: 'standard',
          show_tips: true,
          auto_tours: userExperience === 'beginner',
          video_quality: 'auto',
          language: 'en',
          accessibility: {
            high_contrast: false,
            large_text: false,
            screen_reader: false,
            keyboard_navigation: true,
            reduced_motion: false
          }
        }
      },
      session: {
        duration: 0,
        actionsCount: 0,
        errorsCount: 0,
        previousPages: []
      },
      features: {
        used: [],
        unused: [
          'ai-bid-assistant',
          'partnership-matching',
          'compliance-checker',
          'visual-pipeline'
        ],
        frequently: []
      },
      environment: {
        device: 'desktop',
        browser: 'chrome',
        screenSize: '1920x1080',
        connection: 'fast'
      }
    }
    
    setUserContext(context)
    
    // Generate initial suggestions
    generateSuggestions(context)
  }, [pathname, userId, userType, userExperience])

  // Generate suggestions based on context
  const generateSuggestions = useCallback(async (context: UserContext) => {
    const newSuggestions = await helpService.generateSuggestions(context)
    setSuggestions(newSuggestions)
  }, [helpService])

  // Show tooltip for an element
  const showTooltip = useCallback((element: HTMLElement) => {
    if (!userContext) return
    
    const tooltip = helpService.showTooltip(element, userContext)
    setActiveTooltips(prev => new Map(prev).set(element.id || 'unknown', tooltip))
  }, [helpService, userContext])

  // Hide tooltip
  const hideTooltip = useCallback((elementId: string) => {
    setActiveTooltips(prev => {
      const newMap = new Map(prev)
      newMap.delete(elementId)
      return newMap
    })
  }, [])

  // Start a guided tour
  const startTour = useCallback((tourId: string) => {
    if (!userContext) return
    
    const tour = helpService.startTour(tourId, userContext)
    setActiveTour(tour)
  }, [helpService, userContext])

  // Show/hide assistant
  const showAssistant = useCallback(() => {
    setIsAssistantOpen(true)
  }, [])

  const hideAssistant = useCallback(() => {
    setIsAssistantOpen(false)
  }, [])

  // Auto-start tour for new users
  useEffect(() => {
    if (userExperience === 'beginner' && !activeTour && pathname === '/') {
      startTour('welcome-tour')
    }
  }, [userExperience, activeTour, pathname, startTour])

  const value: ContextualHelpContextValue = {
    showTooltip,
    hideTooltip,
    startTour,
    showAssistant,
    hideAssistant,
    suggestions,
    activeTour,
    isAssistantOpen
  }

  return (
    <ContextualHelpContext.Provider value={value}>
      {children}
      
      {/* Render active tooltips */}
      {Array.from(activeTooltips.values()).map(tooltip => (
        <HelpTooltip
          key={tooltip.id}
          tooltip={tooltip}
          onClose={() => hideTooltip(tooltip.id)}
        />
      ))}
      
      {/* Render active tour */}
      {activeTour && (
        <GuidedTour
          tour={activeTour}
          onComplete={() => setActiveTour(null)}
          onSkip={() => setActiveTour(null)}
        />
      )}
      
      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <SmartSuggestions
          suggestions={suggestions}
          onDismiss={(id) => setSuggestions(prev => prev.filter(s => s.id !== id))}
        />
      )}
      
      {/* Help assistant */}
      {isAssistantOpen && userContext && (
        <HelpAssistant
          context={userContext}
          onClose={hideAssistant}
        />
      )}
    </ContextualHelpContext.Provider>
  )
}