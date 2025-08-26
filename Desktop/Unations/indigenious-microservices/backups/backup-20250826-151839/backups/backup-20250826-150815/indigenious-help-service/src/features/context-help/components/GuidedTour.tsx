'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react'
import { Tour, TourStep } from '../types'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

interface GuidedTourProps {
  tour: Tour
  onComplete: () => void
  onSkip: () => void
}

export function GuidedTour({ tour, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const step = tour.steps[currentStep]

  useEffect(() => {
    setProgress((currentStep / tour.steps.length) * 100)
  }, [currentStep, tour.steps.length])

  useEffect(() => {
    if (step.target) {
      highlightElement(step.target.selector)
    }
    
    return () => {
      removeHighlight()
    }
  }, [step])

  const highlightElement = (selector: string) => {
    const element = document.querySelector(selector)
    if (!element) return

    // Add highlight class
    element.classList.add('tour-highlight')
    
    // Dim background if requested
    if (step.target?.dim_background) {
      document.body.classList.add('tour-dim')
    }
    
    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const removeHighlight = () => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    document.body.classList.remove('tour-dim')
  }

  const handleNext = () => {
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepPosition = () => {
    if (!step.target || step.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const element = document.querySelector(step.target.selector)
    if (!element) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const rect = element.getBoundingClientRect()
    const styles: any = { position: 'fixed' }

    switch (step.position) {
      case 'top':
        styles.bottom = window.innerHeight - rect.top + 20
        styles.left = rect.left + rect.width / 2
        styles.transform = 'translateX(-50%)'
        break
      case 'bottom':
        styles.top = rect.bottom + 20
        styles.left = rect.left + rect.width / 2
        styles.transform = 'translateX(-50%)'
        break
      case 'left':
        styles.right = window.innerWidth - rect.left + 20
        styles.top = rect.top + rect.height / 2
        styles.transform = 'translateY(-50%)'
        break
      case 'right':
        styles.left = rect.right + 20
        styles.top = rect.top + rect.height / 2
        styles.transform = 'translateY(-50%)'
        break
    }

    return styles
  }

  return (
    <>
      {/* Background overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={tour.settings.skippable ? onSkip : undefined}
        />
      </AnimatePresence>

      {/* Tour step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={getStepPosition()}
          className="z-50 max-w-md"
        >
          <GlassPanel className="p-6">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/60">
                  Step {currentStep + 1} of {tour.steps.length}
                </p>
                {tour.settings.skippable && (
                  <button
                    onClick={onSkip}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Skip tour
                  </button>
                )}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-white mb-2">
              {step.title}
            </h3>
            <p className="text-white/80 mb-4">
              {step.content}
            </p>

            {/* Media */}
            {step.media && (
              <div className="mb-4">
                {step.media.image && (
                  <img 
                    src={step.media.image} 
                    alt="Tour illustration" 
                    className="rounded-lg w-full"
                  />
                )}
                {step.media.animation && (
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <p className="text-white/60 text-sm">Animation placeholder</p>
                  </div>
                )}
              </div>
            )}

            {/* Action required */}
            {step.action && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/50 rounded-lg">
                <p className="text-blue-400 text-sm">
                  Action required: {step.action.type}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </GlassButton>

              <GlassButton
                size="sm"
                onClick={handleNext}
              >
                {currentStep === tour.steps.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </GlassButton>
            </div>

            {/* Estimated time */}
            {tour.settings.estimated_time && currentStep === 0 && (
              <p className="text-center text-xs text-white/40 mt-3">
                Estimated time: {tour.settings.estimated_time} minutes
              </p>
            )}
          </GlassPanel>
        </motion.div>
      </AnimatePresence>

      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          animation: pulse 2s infinite;
        }
        
        .tour-dim .tour-highlight {
          background: white;
        }
        
        .tour-dim *:not(.tour-highlight) {
          opacity: 0.3;
          pointer-events: none;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
          }
          100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </>
  )
}