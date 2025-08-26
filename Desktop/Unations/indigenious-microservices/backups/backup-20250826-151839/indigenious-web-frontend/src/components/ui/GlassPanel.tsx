'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'regular' | 'prominent' | 'intense';
  interactive?: boolean;
  floating?: boolean;
}

export function GlassPanel({ 
  children, 
  className,
  intensity = 'regular',
  interactive = true,
  floating = false
}: GlassPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Intensity configurations matching Apple's Liquid Glass
  const intensityConfig = {
    subtle: {
      blur: 'backdrop-blur-[8px]',
      bg: 'bg-white/[0.04]',
      border: 'border-white/[0.15]',
      shadow: 'shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
    },
    regular: {
      blur: 'backdrop-blur-[16px]',
      bg: 'bg-white/[0.08]',
      border: 'border-white/[0.18]',
      shadow: 'shadow-[0_8px_40px_rgba(0,0,0,0.16)]'
    },
    prominent: {
      blur: 'backdrop-blur-[24px]',
      bg: 'bg-white/[0.12]',
      border: 'border-white/[0.22]',
      shadow: 'shadow-[0_12px_48px_rgba(0,0,0,0.20)]'
    },
    intense: {
      blur: 'backdrop-blur-[32px]',
      bg: 'bg-white/[0.16]',
      border: 'border-white/[0.25]',
      shadow: 'shadow-[0_16px_56px_rgba(0,0,0,0.24)]'
    }
  };

  const config = intensityConfig[intensity];

  useEffect(() => {
    if (!interactive || !panelRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = panelRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    };

    const panel = panelRef.current;
    panel.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      panel.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interactive]);

  return (
    <div
      ref={panelRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Base styles
        'relative rounded-2xl transition-all duration-600 ease-out',
        config.blur,
        config.bg,
        config.border,
        config.shadow,
        
        // Floating animation
        floating && 'animate-liquid-float',
        
        // Interactive hover effects
        interactive && 'hover:scale-[1.02] hover:shadow-2xl',
        
        // Noise texture overlay
        'before:absolute before:inset-0 before:rounded-2xl before:opacity-[0.015]',
        'before:bg-[url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")]',
        
        className
      )}
      style={{
        // Dynamic gradient overlay based on mouse position
        background: interactive && isHovered ? `
          radial-gradient(
            circle at ${mousePosition.x}% ${mousePosition.y}%,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%
          ),
          ${intensity === 'subtle' ? 'rgba(255, 255, 255, 0.04)' :
            intensity === 'regular' ? 'rgba(255, 255, 255, 0.08)' :
            intensity === 'prominent' ? 'rgba(255, 255, 255, 0.12)' :
            'rgba(255, 255, 255, 0.16)'}
        ` : undefined,
        
        // Transform for depth
        transform: isHovered && interactive 
          ? `perspective(1000px) rotateX(${(mousePosition.y - 50) * 0.1}deg) rotateY(${(mousePosition.x - 50) * 0.1}deg)`
          : undefined,
      }}
    >
      {/* Specular highlight */}
      {interactive && (
        <div 
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.4 : 0,
            background: `
              radial-gradient(
                circle at ${mousePosition.x}% ${mousePosition.y}%,
                rgba(255, 255, 255, 0.2) 0%,
                transparent 40%
              )
            `
          }}
        />
      )}
      
      {/* Inner border for depth */}
      <div className="absolute inset-[1px] rounded-[calc(1rem-1px)] border border-white/10" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}