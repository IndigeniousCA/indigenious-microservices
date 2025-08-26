'use client'

import React, { useEffect, useRef } from 'react'

export const IndigenousBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Create network nodes
    const networkLayer = document.getElementById('networkLayer')
    if (networkLayer && networkLayer.children.length === 0) {
      for (let i = 0; i < 20; i++) {
        const node = document.createElement('div')
        node.className = 'network-node'
        node.style.left = Math.random() * 100 + '%'
        node.style.top = Math.random() * 100 + '%'
        node.style.animationDelay = Math.random() * 4 + 's'
        networkLayer.appendChild(node)
      }

      // Create network connections
      for (let i = 0; i < 12; i++) {
        const connection = document.createElement('div')
        connection.className = 'network-connection'
        const x1 = Math.random() * 100
        const y1 = Math.random() * 100
        const length = Math.random() * 200 + 100
        const angle = Math.random() * 360
        
        connection.style.cssText = `
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.3), transparent);
          animation: connectionFlow 6s linear infinite;
          left: ${x1}%;
          top: ${y1}%;
          width: ${length}px;
          transform: rotate(${angle}deg);
          animation-delay: ${Math.random() * 6}s;
        `
        networkLayer.appendChild(connection)
      }
    }

    // Create floating particles
    const particleContainer = document.getElementById('particleContainer')
    if (particleContainer && particleContainer.children.length === 0) {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.left = Math.random() * 100 + '%'
        particle.style.animationDelay = Math.random() * 20 + 's'
        particle.style.animationDuration = (15 + Math.random() * 10) + 's'
        particleContainer.appendChild(particle)
      }
    }

    // Animated water canvas effect
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        
        let time = 0
        
        function drawWaterEffect() {
          if (!ctx || !canvas) return
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Create flowing water lines
          for (let i = 0; i < 5; i++) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - i * 0.02})`
            ctx.lineWidth = 2
            
            for (let x = 0; x < canvas.width; x += 20) {
              const y = canvas.height / 2 + 
                       Math.sin((x * 0.01) + time + (i * 0.5)) * 50 + 
                       i * 30
              if (x === 0) {
                ctx.moveTo(x, y)
              } else {
                ctx.lineTo(x, y)
              }
            }
            ctx.stroke()
          }
          
          time += 0.02
          requestAnimationFrame(drawWaterEffect)
        }
        
        drawWaterEffect()
        
        // Resize canvas on window resize
        const handleResize = () => {
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
        }
        window.addEventListener('resize', handleResize)
        
        return () => {
          window.removeEventListener('resize', handleResize)
        }
      }
    }

    // Handle ripple effects on click
    const handleClick = (e: MouseEvent) => {
      // Don't create ripples on interactive elements
      if ((e.target as HTMLElement).closest('.element-card, button, a, input')) {
        return
      }

      // Create main ripple
      const ripple = document.createElement('div')
      ripple.className = 'ripple'
      ripple.style.left = e.clientX + 'px'
      ripple.style.top = e.clientY + 'px'
      document.body.appendChild(ripple)

      // Create inner ripple for depth
      const rippleInner = document.createElement('div')
      rippleInner.className = 'ripple-inner'
      rippleInner.style.cssText = `
        position: fixed;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, transparent 60%);
        pointer-events: none;
        z-index: 999;
        animation: rippleExpandInner 1.5s ease-out;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
      `
      document.body.appendChild(rippleInner)

      // Remove ripples after animation
      setTimeout(() => {
        ripple.remove()
        rippleInner.remove()
      }, 1500)

      // Create smaller secondary ripples
      setTimeout(() => {
        const ripple2 = document.createElement('div')
        ripple2.className = 'ripple'
        ripple2.style.left = (e.clientX + 20) + 'px'
        ripple2.style.top = (e.clientY + 20) + 'px'
        ripple2.style.animationDuration = '1s'
        document.body.appendChild(ripple2)
        
        setTimeout(() => ripple2.remove(), 1000)
      }, 200)
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <>
      {/* Video background */}
      <div className="video-background">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          loop 
          playsInline
        >
          <source src="https://cdn.pixabay.com/video/2020/05/09/38669-418268988_large.mp4" type="video/mp4" />
          <source src="https://cdn.coverr.co/videos/coverr-calm-river-flow-1573991956758-JYS4W5kZD9/1080p.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
        
        {/* Canvas for water reflection effect */}
        <canvas 
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.3,
            mixBlendMode: 'screen',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Ecosystem background layers */}
      <div className="ecosystem-background">
        <div className="topographic-layer"></div>
        <div className="water-flow"></div>
        <div className="river-current"></div>
        <div className="aurora-layer"></div>
        <div className="network-layer" id="networkLayer"></div>
        <div id="particleContainer"></div>
        <div className="mist-layer"></div>
      </div>

      <style jsx>{`
        @keyframes connectionFlow {
          0% { opacity: 0; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }

        @keyframes rippleExpandInner {
          0% {
            width: 5px;
            height: 5px;
            opacity: 1;
            transform: translate(-50%, -50%) scale(0);
          }
          100% {
            width: 150px;
            height: 150px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  )
}