'use client'

import React, { useEffect, useRef } from 'react'

export const ExactLivingBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5 // Slow motion for subtlety
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Subtle video background - exactly as in your HTML */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/90 to-purple-900/80" />
      
      {/* Subtle animated gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 20% 80%, transparent 0%, rgba(59, 130, 246, 0.1) 50%)',
          animation: 'drift 20s ease-in-out infinite'
        }}
      />

      <style jsx>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, -30px); }
        }
      `}</style>
    </div>
  )
}