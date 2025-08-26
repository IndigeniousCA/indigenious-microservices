'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useElemental } from '../contexts/ElementalContext'

interface WheelSection {
  direction: string
  label: string
  color: string
  path: string
  icon: string
  meaning: string
}

export const MedicineWheel: React.FC = () => {
  const router = useRouter()
  const { theme, emitRipple } = useElemental()
  const [rotation, setRotation] = useState(0)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const sections: WheelSection[] = [
    {
      direction: 'East',
      label: 'New Beginnings',
      color: 'from-yellow-400 to-yellow-600',
      path: '/rfqs',
      icon: '🌅',
      meaning: 'RFQs & Opportunities'
    },
    {
      direction: 'South',
      label: 'Growth',
      color: 'from-green-400 to-green-600',
      path: '/analytics',
      icon: '🌱',
      meaning: 'Analytics & Insights'
    },
    {
      direction: 'West',
      label: 'Reflection',
      color: 'from-blue-400 to-blue-600',
      path: '/reports',
      icon: '🌊',
      meaning: 'Reports & History'
    },
    {
      direction: 'North',
      label: 'Wisdom',
      color: 'from-purple-400 to-purple-600',
      path: '/ai-insights',
      icon: '❄️',
      meaning: 'AI & Predictions'
    }
  ]

  // Handle wheel rotation on scroll
  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (!isExpanded) return
      
      e.preventDefault()
      setRotation(prev => prev + e.deltaY * 0.5)
    }

    const wheelElement = wheelRef.current
    if (wheelElement) {
      wheelElement.addEventListener('wheel', handleScroll, { passive: false })
    }

    return () => {
      if (wheelElement) {
        wheelElement.removeEventListener('wheel', handleScroll)
      }
    }
  }, [isExpanded])

  // Touch handling for mobile
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isExpanded) return
    
    const touch = e.touches[0]
    const target = e.currentTarget as HTMLDivElement
    const centerX = target.getBoundingClientRect().left + target.offsetWidth / 2
    const centerY = target.getBoundingClientRect().top + target.offsetHeight / 2
    
    const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX)
    setRotation(angle * (180 / Math.PI))
  }

  const handleSectionClick = (section: WheelSection, index: number) => {
    setSelectedSection(section.direction)
    
    // Emit ripple effect
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect()
      emitRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, 1)
    }
    
    // Rotate wheel to selected section
    const targetRotation = -index * 90
    setRotation(targetRotation)
    
    setTimeout(() => {
      router.push(section.path)
    }, 500)
  }

  const getSeasonalColors = () => {
    const colors = {
      spring: 'border-green-400',
      summer: 'border-yellow-400',
      fall: 'border-orange-400',
      winter: 'border-blue-400'
    }
    return colors[theme.season]
  }

  return (
    <>
      {/* Collapsed state - floating button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
          aria-label="Open Medicine Wheel Navigation"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
            <span className="text-2xl">☸️</span>
          </div>
        </button>
      )}

      {/* Expanded state - full wheel */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close Medicine Wheel"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            ref={wheelRef}
            className="relative w-96 h-96"
            onTouchMove={handleTouchMove}
          >
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-4 ${getSeasonalColors()} opacity-50 animate-pulse`} />
            
            {/* Inner wheel */}
            <div
              className="absolute inset-4 rounded-full overflow-hidden transform transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {sections.map((section, index) => (
                <div
                  key={section.direction}
                  className={`absolute inset-0 origin-center cursor-pointer`}
                  style={{
                    transform: `rotate(${index * 90}deg)`,
                    clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)'
                  }}
                  onClick={() => handleSectionClick(section, index)}
                >
                  <div className={`w-full h-full bg-gradient-to-br ${section.color} opacity-80 hover:opacity-100 transition-opacity relative`}>
                    <div
                      className="absolute top-1/4 right-1/4 transform -translate-x-1/2 -translate-y-1/2"
                      style={{ transform: `rotate(${-rotation - index * 90}deg)` }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">{section.icon}</div>
                        <div className="text-white font-bold text-sm">{section.direction}</div>
                        <div className="text-white/80 text-xs">{section.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Center circle */}
            <div className="absolute inset-1/3 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-2xl mb-1">☸️</div>
                <div className="text-xs font-semibold">Medicine</div>
                <div className="text-xs">Wheel</div>
              </div>
            </div>

            {/* Selected section indicator */}
            {selectedSection && (
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-white text-center">
                <div className="font-bold text-lg">{selectedSection}</div>
                <div className="text-sm opacity-80">
                  {sections.find(s => s.direction === selectedSection)?.meaning}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 text-sm text-center">
            <p>Scroll or swipe to rotate • Click to navigate</p>
          </div>
        </div>
      )}
    </>
  )
}