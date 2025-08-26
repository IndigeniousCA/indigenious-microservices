'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useElemental } from '../contexts/ElementalContext'

export const VideoLivingBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme, performance } = useElemental()
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const [videoLoaded, setVideoLoaded] = useState(false)

  // Particle class for floating elements
  class Particle {
    x: number
    y: number
    size: number
    speedX: number
    speedY: number
    opacity: number
    hue: number
    glow: boolean

    constructor(width: number, height: number) {
      this.x = Math.random() * width
      this.y = Math.random() * height
      this.size = Math.random() * 4 + 2
      this.speedX = (Math.random() - 0.5) * 0.8
      this.speedY = Math.random() * 0.8 + 0.2
      this.opacity = Math.random() * 0.6 + 0.4
      this.hue = Math.random() * 60 + (theme.season === 'spring' ? 120 : 
                                        theme.season === 'summer' ? 60 :
                                        theme.season === 'fall' ? 30 : 200)
      this.glow = Math.random() > 0.7
    }

    update(width: number, height: number) {
      this.y -= this.speedY
      this.x += this.speedX
      
      // Sine wave motion
      this.x += Math.sin(Date.now() * 0.001 + this.y * 0.01) * 0.3
      
      if (this.y < -10) {
        this.y = height + 10
        this.x = Math.random() * width
      }
      
      if (this.x < -10) this.x = width + 10
      if (this.x > width + 10) this.x = -10
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      
      // Glow effect
      if (this.glow) {
        ctx.shadowBlur = 20
        ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, ${this.opacity})`
      }
      
      ctx.globalAlpha = this.opacity
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size)
      gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${this.opacity})`)
      gradient.addColorStop(1, `hsla(${this.hue}, 70%, 50%, 0)`)
      ctx.fillStyle = gradient
      
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
    color: string

    constructor(x: number, y: number, intensity: number) {
      this.x = x
      this.y = y
      this.radius = 0
      this.maxRadius = intensity * 150
      this.opacity = 0.8
      this.speed = 3
      this.color = `rgba(100, 200, 255, ${this.opacity})`
    }

    update() {
      this.radius += this.speed
      this.opacity = Math.max(0, 0.8 * (1 - this.radius / this.maxRadius))
      return this.opacity > 0
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalAlpha = this.opacity
      
      // Multiple rings for depth
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${this.opacity * (1 - i * 0.3)})`
        ctx.lineWidth = 2 - i * 0.5
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius - i * 10, 0, Math.PI * 2)
        ctx.stroke()
      }
      
      ctx.restore()
    }
  }

  // Initialize particles
  useEffect(() => {
    if (!performance.particles) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const particleCount = performance.mode === 'full-forest' ? 150 : 
                         performance.mode === 'flowing-river' ? 75 : 20
    
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

  // Video setup
  useEffect(() => {
    if (videoRef.current) {
      // Try to use a video URL or fallback to generated effect
      const videoSources = {
        water: 'https://www.w3schools.com/html/mov_bbb.mp4', // Replace with actual water video
        forest: '/assets/videos/forest-river.mp4',
        default: '/assets/videos/river-flow.mp4'
      }
      
      // For now, we'll use a placeholder or the design system endpoint
      videoRef.current.src = videoSources.water
      videoRef.current.play().catch(() => {
        console.log('Video autoplay blocked, user interaction required')
      })
      
      videoRef.current.onloadeddata = () => {
        setVideoLoaded(true)
      }
    }
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
      
      // Update and draw particles with glow
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

  const getSeasonalFilter = () => {
    const filters = {
      spring: 'hue-rotate(30deg) saturate(1.2)',
      summer: 'hue-rotate(-20deg) saturate(1.3) brightness(1.1)',
      fall: 'hue-rotate(60deg) saturate(1.4) sepia(0.2)',
      winter: 'hue-rotate(180deg) saturate(0.8) brightness(0.9)'
    }
    return filters[theme.season]
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Layer 0: Video Background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: getSeasonalFilter(),
            opacity: videoLoaded ? 0.3 : 0
          }}
          autoPlay
          loop
          muted
          playsInline
        />
        
        {/* Video overlay gradient */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Layer 1: Dynamic gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 70% 80%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.2) 0%, transparent 60%),
            linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)
          `,
          animation: performance.animations ? 'breathe 8s ease-in-out infinite' : 'none'
        }}
      />

      {/* Layer 2: Aurora borealis effect */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            linear-gradient(90deg, 
              transparent, 
              rgba(34, 197, 94, 0.2), 
              rgba(59, 130, 246, 0.3), 
              rgba(147, 51, 234, 0.2), 
              transparent
            )
          `,
          filter: 'blur(60px)',
          animation: performance.animations ? 'aurora 20s ease-in-out infinite alternate' : 'none',
          mixBlendMode: 'screen'
        }}
      />

      {/* Layer 3: Flowing river lines */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-10"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9333EA" stopOpacity="0.5" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {performance.animations && (
          <>
            <path
              d="M0,50 Q25,30 50,50 T100,50"
              stroke="url(#riverGradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#glow)"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-100 0"
                to="100 0"
                dur="15s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M0,150 Q25,130 50,150 T100,150"
              stroke="url(#riverGradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#glow)"
              opacity="0.3"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="100 0"
                to="-100 0"
                dur="20s"
                repeatCount="indefinite"
              />
            </path>
          </>
        )}
      </svg>

      {/* Layer 4: Mycelial network */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: performance.animations ? 'pulse 4s ease-in-out infinite' : 'none'
        }}
      />

      {/* Layer 5: Canvas for particles and ripples */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Layer 6: Mist effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            linear-gradient(180deg, transparent, rgba(255,255,255,0.02), transparent),
            radial-gradient(ellipse at top, transparent 0%, rgba(255,255,255,0.05) 100%)
          `,
          animation: performance.animations ? 'mist 30s linear infinite' : 'none'
        }}
      />

      {/* Layer 7: Vignette and depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%),
            linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.2) 100%)
          `,
          pointerEvents: 'none'
        }}
      />

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { 
            transform: scale(1) translateY(0); 
            opacity: 1;
          }
          50% { 
            transform: scale(1.05) translateY(-10px); 
            opacity: 0.8;
          }
        }
        
        @keyframes aurora {
          0% { 
            transform: translateX(-50%) rotate(0deg) scale(1);
          }
          25% {
            transform: translateX(0%) rotate(1deg) scale(1.1);
          }
          50% { 
            transform: translateX(50%) rotate(0deg) scale(1.2);
          }
          75% {
            transform: translateX(0%) rotate(-1deg) scale(1.1);
          }
          100% { 
            transform: translateX(-50%) rotate(0deg) scale(1);
          }
        }
        
        @keyframes mist {
          0% { 
            transform: translateX(-10%) translateY(0);
          }
          25% {
            transform: translateX(10%) translateY(-5%);
          }
          50% {
            transform: translateX(-5%) translateY(5%);
          }
          75% {
            transform: translateX(5%) translateY(-3%);
          }
          100% { 
            transform: translateX(-10%) translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}