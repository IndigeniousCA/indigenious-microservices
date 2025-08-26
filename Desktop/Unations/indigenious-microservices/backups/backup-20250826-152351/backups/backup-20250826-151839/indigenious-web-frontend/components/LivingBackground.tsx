'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useElemental } from '../contexts/ElementalContext'

export const LivingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme, performance } = useElemental()
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const ripplesRef = useRef<Ripple[]>([])

  // Particle class for floating elements
  class Particle {
    x: number
    y: number
    size: number
    speedX: number
    speedY: number
    opacity: number
    hue: number

    constructor(width: number, height: number) {
      this.x = Math.random() * width
      this.y = Math.random() * height
      this.size = Math.random() * 3 + 1
      this.speedX = (Math.random() - 0.5) * 0.5
      this.speedY = Math.random() * 0.5 + 0.1
      this.opacity = Math.random() * 0.5 + 0.3
      this.hue = Math.random() * 60 + (theme.season === 'spring' ? 120 : 
                                        theme.season === 'summer' ? 60 :
                                        theme.season === 'fall' ? 30 : 200)
    }

    update(width: number, height: number) {
      this.y -= this.speedY
      this.x += this.speedX
      
      if (this.y < -10) {
        this.y = height + 10
        this.x = Math.random() * width
      }
      
      if (this.x < -10) this.x = width + 10
      if (this.x > width + 10) this.x = -10
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = this.opacity
      ctx.fillStyle = `hsla(${this.hue}, 70%, 50%, ${this.opacity})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // Ripple class for interactive water effects
  class Ripple {
    x: number
    y: number
    radius: number
    maxRadius: number
    opacity: number
    speed: number

    constructor(x: number, y: number, intensity: number) {
      this.x = x
      this.y = y
      this.radius = 0
      this.maxRadius = intensity * 100
      this.opacity = 0.6
      this.speed = 2
    }

    update() {
      this.radius += this.speed
      this.opacity = Math.max(0, 0.6 * (1 - this.radius / this.maxRadius))
      return this.opacity > 0
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = this.opacity
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Initialize particles
  useEffect(() => {
    if (!performance.particles) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const particleCount = performance.mode === 'full-forest' ? 100 : 
                         performance.mode === 'flowing-river' ? 50 : 0
    
    particlesRef.current = Array.from({ length: particleCount }, 
      () => new Particle(canvas.width, canvas.height))
  }, [performance])

  // Listen for ripple events
  useEffect(() => {
    const handleRipple = (event: CustomEvent) => {
      const { x, y, intensity } = event.detail
      ripplesRef.current.push(new Ripple(x, y, intensity))
    }

    window.addEventListener('elemental-ripple' as any, handleRipple)
    return () => window.removeEventListener('elemental-ripple' as any, handleRipple)
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw particles
      if (performance.particles) {
        particlesRef.current.forEach(particle => {
          particle.update(canvas.width, canvas.height)
          particle.draw(ctx)
        })
      }
      
      // Update and draw ripples
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        const alive = ripple.update()
        if (alive) ripple.draw(ctx)
        return alive
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    if (performance.animations) {
      animate()
    }

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [performance, theme])

  const getSeasonalGradient = () => {
    const gradients = {
      spring: 'from-green-900 via-emerald-800 to-teal-900',
      summer: 'from-yellow-900 via-orange-800 to-amber-900',
      fall: 'from-orange-900 via-red-800 to-amber-900',
      winter: 'from-blue-900 via-indigo-800 to-purple-900'
    }
    return gradients[theme.season]
  }

  const getTimeOfDayOpacity = () => {
    const opacities = {
      dawn: 'opacity-30',
      morning: 'opacity-20',
      afternoon: 'opacity-10',
      evening: 'opacity-40',
      night: 'opacity-60'
    }
    return opacities[theme.timeOfDay]
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Layer 1: Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getSeasonalGradient()} ${getTimeOfDayOpacity()}`} />
      
      {/* Layer 2: Animated water (CSS) */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-blue-600/20 animate-pulse" />
        <div 
          className="absolute inset-0" 
          style={{
            background: `radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.2) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)`,
            animation: performance.animations ? 'float 20s ease-in-out infinite' : 'none'
          }}
        />
      </div>

      {/* Layer 3: Aurora effect */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-color-dodge"
        style={{
          background: `linear-gradient(45deg, ${theme.aurora.color}40 0%, transparent 70%)`,
          filter: 'blur(40px)',
          animation: performance.animations ? 'aurora 15s ease-in-out infinite alternate' : 'none'
        }}
      />

      {/* Layer 4: Topographic lines */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-5"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="50" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>

      {/* Layer 5: Moving mist */}
      {performance.animations && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'mist 10s linear infinite'
          }}
        />
      )}

      {/* Layer 6: Canvas for particles and ripples */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Layer 7: Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* Layer 8: Seasonal overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: theme.season === 'winter' 
            ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-opacity=\'0.03\'%3E%3Cpolygon fill=\'white\' points=\'50 15, 60 35, 50 25\'/%3E%3C/g%3E%3C/svg%3E")'
            : theme.season === 'fall'
            ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-opacity=\'0.03\'%3E%3Ccircle fill=\'orange\' cx=\'50\' cy=\'50\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")'
            : 'none'
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        
        @keyframes aurora {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-50px) scale(1.1); }
          100% { transform: translateY(0) scale(1); }
        }
        
        @keyframes mist {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}