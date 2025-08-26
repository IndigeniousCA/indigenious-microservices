'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { GlassPanel } from './GlassPanel';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'regular' | 'prominent' | 'intense';
  floating?: boolean;
  delay?: number;
  glowColor?: 'blue' | 'purple' | 'green' | 'amber' | 'pink';
  interactive?: boolean;
}

export function GlassCard({ 
  children, 
  className,
  intensity = 'regular',
  floating = true,
  delay = 0,
  glowColor = 'blue',
  interactive = true
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // Glow color configurations
  const glowColors = {
    blue: 'from-blue-500/20 to-cyan-500/20',
    purple: 'from-purple-500/20 to-pink-500/20',
    green: 'from-green-500/20 to-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/20',
    pink: 'from-pink-500/20 to-rose-500/20'
  };

  // Intersection Observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  // Parallax effect on scroll
  useEffect(() => {
    if (!interactive) return;

    const handleScroll = () => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const centerY = rect.top + rect.height / 2;
      const distanceFromCenter = centerY - windowHeight / 2;
      
      // Calculate parallax offset
      const maxOffset = 20;
      const offsetY = (distanceFromCenter / windowHeight) * maxOffset;
      const offsetX = Math.sin(distanceFromCenter * 0.002) * 10;
      
      setParallaxOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [interactive]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative transition-all duration-1000 ease-out',
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        transform: interactive ? `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` : undefined,
      }}
    >
      {/* Background glow effect */}
      <div 
        className={cn(
          'absolute -inset-4 rounded-3xl bg-gradient-to-br opacity-50 blur-xl',
          glowColors[glowColor],
          floating && 'animate-liquid-glow'
        )} 
      />
      
      {/* Main card content */}
      <GlassPanel 
        intensity={intensity} 
        interactive={interactive}
        floating={floating}
        className="relative h-full"
      >
        {/* Specular highlight that moves */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        >
          <div 
            className="absolute -inset-full opacity-30 animate-specular-sweep"
            style={{
              background: `linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 60%
              )`,
            }}
          />
        </div>
        
        {/* Content with proper z-index */}
        <div className="relative z-10">
          {children}
        </div>
      </GlassPanel>
    </div>
  );
}