'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, MessageCircle, Book, PlayCircle, Users } from 'lucide-react'
import { useContextualHelp } from './ContextualHelpProvider'
import { GlassPanel } from '@/components/ui/glass-panel'

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { showAssistant, startTour } = useContextualHelp()

  const helpOptions = [
    {
      icon: MessageCircle,
      label: 'Chat with Assistant',
      description: 'Get instant help',
      action: () => {
        showAssistant()
        setIsOpen(false)
      }
    },
    {
      icon: PlayCircle,
      label: 'Take a Tour',
      description: 'Learn the basics',
      action: () => {
        startTour('feature-tour')
        setIsOpen(false)
      }
    },
    {
      icon: Book,
      label: 'Help Center',
      description: 'Browse articles',
      action: () => {
        window.open('/help', '_blank')
        setIsOpen(false)
      }
    },
    {
      icon: Users,
      label: 'Community',
      description: 'Ask the community',
      action: () => {
        window.open('/community', '_blank')
        setIsOpen(false)
      }
    }
  ]

  return (
    <>
      {/* Floating help button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-lg z-40 flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-7 h-7 text-white" />
        <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </motion.button>

      {/* Help menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-24 right-6 z-40"
            >
              <GlassPanel className="p-4 w-64">
                <h3 className="text-white font-semibold mb-3">How can we help?</h3>
                
                <div className="space-y-2">
                  {helpOptions.map((option, index) => {
                    const Icon = option.icon
                    return (
                      <motion.button
                        key={index}
                        onClick={option.action}
                        className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <Icon className="w-5 h-5 text-white/80" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {option.label}
                            </p>
                            <p className="text-white/60 text-xs">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 text-center">
                    Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">?</kbd> for keyboard shortcuts
                  </p>
                </div>
              </GlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}