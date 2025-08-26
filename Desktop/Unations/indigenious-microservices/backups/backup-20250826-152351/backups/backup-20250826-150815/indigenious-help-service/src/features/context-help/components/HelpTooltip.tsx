'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react'
import { Tooltip } from '../types'

interface HelpTooltipProps {
  tooltip: Tooltip
  onClose: () => void
}

export function HelpTooltip({ tooltip, onClose }: HelpTooltipProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show tooltip after a short delay
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const getIcon = () => {
    switch (tooltip.type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'tip': return <Lightbulb className="w-4 h-4 text-green-400" />
      default: return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const getColorClasses = () => {
    switch (tooltip.type) {
      case 'warning': return 'border-yellow-400/50 bg-yellow-500/10'
      case 'error': return 'border-red-400/50 bg-red-500/10'
      case 'tip': return 'border-green-400/50 bg-green-500/10'
      default: return 'border-blue-400/50 bg-blue-500/10'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed z-50 max-w-sm p-4 rounded-lg backdrop-blur-md border ${getColorClasses()}`}
          style={{ left: position.x, top: position.y }}
        >
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <p className="text-white text-sm">{tooltip.content}</p>
              
              {tooltip.media && (
                <div className="mt-2">
                  {tooltip.media.image && (
                    <img 
                      src={tooltip.media.image} 
                      alt="Help illustration" 
                      className="rounded-lg max-w-full"
                    />
                  )}
                  {tooltip.media.gif && (
                    <img 
                      src={tooltip.media.gif} 
                      alt="Help animation" 
                      className="rounded-lg max-w-full"
                    />
                  )}
                </div>
              )}
              
              {tooltip.actions && (
                <div className="mt-3 flex gap-2">
                  {tooltip.actions.primary && (
                    <button className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30 transition-colors">
                      {tooltip.actions.primary.label}
                    </button>
                  )}
                  {tooltip.actions.secondary?.map((action, i) => (
                    <button 
                      key={i}
                      className="px-3 py-1 bg-white/10 text-white/80 text-xs rounded hover:bg-white/20 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {tooltip.dismissible && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            )}
          </div>
          
          {tooltip.neverShowAgain && (
            <label className="flex items-center gap-2 mt-3 text-xs text-white/60">
              <input type="checkbox" className="rounded" />
              Don't show this again
            </label>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}