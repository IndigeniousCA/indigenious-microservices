'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useElemental } from '../contexts/ElementalContext'

interface CarbonCrime {
  distance: number
  co2Kg: number
  treesNeeded: number
  dollarCost: number
  severity: 'low' | 'medium' | 'high' | 'extreme'
}

export const CarbonCrimeCalculator: React.FC = () => {
  const { emitRipple } = useElemental()
  const [isOpen, setIsOpen] = useState(false)
  const [distance, setDistance] = useState('')
  const [crime, setCrime] = useState<CarbonCrime | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const smokePArticlesRef = useRef<SmokeParticle[]>([])

  // Smoke particle class
  class SmokeParticle {
    x: number
    y: number
    size: number
    speedX: number
    speedY: number
    opacity: number
    color: string
    life: number

    constructor(x: number, y: number, severity: string) {
      this.x = x
      this.y = y
      this.size = Math.random() * 20 + 10
      this.speedX = (Math.random() - 0.5) * 2
      this.speedY = -Math.random() * 2 - 1
      this.opacity = 0.8
      this.life = 100
      
      // Color based on severity
      const colors = {
        low: 'rgba(100, 100, 100',
        medium: 'rgba(150, 50, 50',
        high: 'rgba(200, 0, 0',
        extreme: 'rgba(139, 0, 0'
      }
      this.color = colors[severity as keyof typeof colors] || colors.medium
    }

    update() {
      this.x += this.speedX
      this.y += this.speedY
      this.size += 0.3
      this.opacity = (this.life / 100) * 0.8
      this.life -= 2
      this.speedY -= 0.05 // Float upward
      return this.life > 0
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = this.opacity
      ctx.fillStyle = `${this.color}, ${this.opacity})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // Calculate carbon crime
  const calculateCrime = () => {
    const dist = parseFloat(distance)
    if (isNaN(dist) || dist <= 0) return

    // CO2 emissions calculation (kg per km for driving)
    const co2PerKm = 0.12 // Average car emissions
    const co2Kg = dist * co2PerKm
    
    // Trees needed to offset (1 tree absorbs ~22kg CO2/year)
    const treesNeeded = Math.ceil(co2Kg / 22)
    
    // Dollar cost (carbon credit price ~$50/tonne)
    const dollarCost = (co2Kg / 1000) * 50
    
    // Determine severity
    let severity: CarbonCrime['severity'] = 'low'
    if (dist > 1000) severity = 'extreme'
    else if (dist > 500) severity = 'high'
    else if (dist > 100) severity = 'medium'
    
    const newCrime: CarbonCrime = {
      distance: dist,
      co2Kg,
      treesNeeded,
      dollarCost,
      severity
    }
    
    setCrime(newCrime)
    
    // Add smoke particles based on severity
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const centerX = canvasRef.current.width / 2
      const centerY = canvasRef.current.height / 2
      
      const particleCount = severity === 'extreme' ? 20 : 
                           severity === 'high' ? 15 : 
                           severity === 'medium' ? 10 : 5
      
      for (let i = 0; i < particleCount; i++) {
        smokePArticlesRef.current.push(
          new SmokeParticle(centerX, centerY, severity)
        )
      }
    }
    
    // Emit ripple effect
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      emitRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, 2)
    }
  }

  // Animation loop for smoke
  useEffect(() => {
    if (!isOpen) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw smoke particles
      smokePArticlesRef.current = smokePArticlesRef.current.filter(particle => {
        const alive = particle.update()
        if (alive) particle.draw(ctx)
        return alive
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isOpen])

  const getSeverityColor = () => {
    if (!crime) return 'text-gray-400'
    const colors = {
      low: 'text-yellow-500',
      medium: 'text-orange-500',
      high: 'text-red-500',
      extreme: 'text-red-700'
    }
    return colors[crime.severity]
  }

  const getSeverityMessage = () => {
    if (!crime) return ''
    const messages = {
      low: 'Minor violation of natural law',
      medium: 'Significant harm to Mother Earth',
      high: 'Severe damage to the ecosystem',
      extreme: 'EXTREME CARBON CRIME AGAINST NATURE!'
    }
    return messages[crime.severity]
  }

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 left-8 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-40 flex items-center space-x-2 group"
          aria-label="Open Carbon Crime Calculator"
        >
          <span className="text-lg">🔥</span>
          <span className="font-semibold">Carbon Crime Calculator</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        </button>
      )}

      {/* Calculator modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4">
            {/* Smoke effect canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: -1 }}
            />

            <div className="bg-gradient-to-br from-gray-900 to-red-900/50 rounded-2xl p-6 border border-red-500/30 shadow-2xl backdrop-blur-md">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-2">🔥</span>
                  Carbon Crime Calculator
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Close calculator"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-white/80 mb-6">
                Calculate the environmental crime of forcing Indigenous peoples to travel unnecessary distances.
              </p>

              {/* Input */}
              <div className="mb-6">
                <label htmlFor="distance" className="block text-sm font-medium text-white/80 mb-2">
                  Distance Forced to Travel (km)
                </label>
                <div className="flex space-x-2">
                  <input
                    id="distance"
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter kilometers..."
                    min="0"
                    step="10"
                  />
                  <button
                    onClick={calculateCrime}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                  >
                    Calculate Crime
                  </button>
                </div>
              </div>

              {/* Results */}
              {crime && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Severity indicator */}
                  <div className={`text-center py-3 px-4 rounded-lg bg-black/30 border ${crime.severity === 'extreme' ? 'border-red-500 animate-pulse' : 'border-white/20'}`}>
                    <p className={`font-bold text-lg ${getSeverityColor()}`}>
                      {getSeverityMessage()}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60 mb-1">CO₂ Emissions</p>
                      <p className="text-xl font-bold text-white">{crime.co2Kg.toFixed(2)} kg</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60 mb-1">Trees Needed</p>
                      <p className="text-xl font-bold text-white">{crime.treesNeeded} 🌲</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60 mb-1">Carbon Credit Cost</p>
                      <p className="text-xl font-bold text-white">${crime.dollarCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60 mb-1">Distance Crime</p>
                      <p className="text-xl font-bold text-white">{crime.distance} km</p>
                    </div>
                  </div>

                  {/* Visual representation */}
                  <div className="mt-4">
                    <p className="text-xs text-white/60 mb-2">Environmental Damage Level</p>
                    <div className="w-full bg-black/30 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          crime.severity === 'extreme' ? 'bg-gradient-to-r from-red-600 to-red-800 animate-pulse' :
                          crime.severity === 'high' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                          crime.severity === 'medium' ? 'bg-gradient-to-r from-yellow-600 to-orange-600' :
                          'bg-gradient-to-r from-green-600 to-yellow-600'
                        }`}
                        style={{ width: `${Math.min((crime.co2Kg / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action message */}
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-200">
                      <strong>Solution:</strong> Support local Indigenous businesses and services to eliminate this carbon crime.
                    </p>
                  </div>
                </div>
              )}

              {/* Examples */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/60 mb-2">Common carbon crimes:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDistance('50')}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors"
                  >
                    50km (city travel)
                  </button>
                  <button
                    onClick={() => setDistance('200')}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors"
                  >
                    200km (regional)
                  </button>
                  <button
                    onClick={() => setDistance('1000')}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors"
                  >
                    1000km (provincial)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </>
  )
}