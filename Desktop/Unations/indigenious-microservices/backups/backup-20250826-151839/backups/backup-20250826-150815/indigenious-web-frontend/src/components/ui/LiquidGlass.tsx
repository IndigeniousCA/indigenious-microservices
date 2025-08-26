/**
 * Liquid Glass Component - Beat Apple at Their Own Game!
 * Dynamic, physics-based glass material that responds to movement and context
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'strong';
  variant?: 'clear' | 'frost' | 'aurora';
  interactive?: boolean;
  edgeDistortion?: boolean;
  specularHighlight?: boolean;
}

export function LiquidGlass({
  children,
  className,
  intensity = 'medium',
  variant = 'clear',
  interactive = true,
  edgeDistortion = true,
  specularHighlight = true,
}: LiquidGlassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // Motion values for interaction
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring physics for smooth movement
  const springConfig = { damping: 25, stiffness: 700 };
  const highlightX = useSpring(mouseX, springConfig);
  const highlightY = useSpring(mouseY, springConfig);
  
  // Transform values for 3D effect
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);
  
  // Dynamic blur based on movement
  const [blurValue, setBlurValue] = useState(10);
  
  useEffect(() => {
    const unsubscribeX = mouseX.on("change", (x) => {
      const y = mouseY.get();
      const distance = Math.sqrt(x * x + y * y);
      setBlurValue(Math.min(20, 10 + distance * 0.02));
    });
    
    const unsubscribeY = mouseY.on("change", (y) => {
      const x = mouseX.get();
      const distance = Math.sqrt(x * x + y * y);
      setBlurValue(Math.min(20, 10 + distance * 0.02));
    });
    
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY]);

  // Track mouse/touch movement
  useEffect(() => {
    if (!interactive || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma && e.beta) {
        mouseX.set(e.gamma * 5);
        mouseY.set(e.beta * 5);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [interactive, mouseX, mouseY]);

  // Intensity-based styles
  const intensityStyles = {
    light: {
      background: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      blur: 8,
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      blur: 12,
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      blur: 16,
    },
  };

  // Variant-based gradients
  const variantGradients = {
    clear: 'radial-gradient(ellipse at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
    frost: 'radial-gradient(ellipse at var(--mouse-x) var(--mouse-y), rgba(147, 197, 253, 0.3) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
    aurora: 'conic-gradient(from var(--angle) at var(--mouse-x) var(--mouse-y), rgba(34, 211, 238, 0.3), rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(34, 211, 238, 0.3))',
  };

  const style = intensityStyles[intensity];

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300',
        'before:absolute before:inset-0 before:rounded-2xl',
        edgeDistortion && 'before:backdrop-blur-[2px]', // Edge distortion
        className
      )}
      style={{
        backgroundColor: style.background,
        backdropFilter: `blur(${style.blur}px)`,
        WebkitBackdropFilter: `blur(${style.blur}px)`,
        border: `1px solid ${style.borderColor}`,
        transform: 'translateZ(0)', // Force hardware acceleration
        // @ts-ignore - CSS custom properties
        '--mouse-x': `${highlightX.get()}px`,
        '--mouse-y': `${highlightY.get()}px`,
        '--angle': `${Math.atan2(highlightY.get(), highlightX.get())}rad`,
      }}
      animate={{
        rotateX: interactive ? rotateX.get() : 0,
        rotateY: interactive ? rotateY.get() : 0,
      }}
      transition={{ type: 'spring', ...springConfig }}
    >
      {/* Chromatic aberration effect */}
      <div 
        className="absolute inset-0 opacity-30 mix-blend-screen"
        style={{
          background: 'linear-gradient(45deg, rgba(255, 0, 0, 0.1) 0%, transparent 50%, rgba(0, 255, 0, 0.1) 100%)',
          filter: 'blur(20px)',
          transform: `translate(${highlightX.get() * 0.02}px, ${highlightY.get() * 0.02}px)`,
        }}
      />

      {/* Specular highlight */}
      {specularHighlight && (
        <motion.div
          ref={highlightRef}
          className="absolute pointer-events-none"
          style={{
            width: '40%',
            height: '40%',
            background: variantGradients[variant],
            filter: 'blur(40px)',
            opacity: 0.6,
            x: highlightX,
            y: highlightY,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Rim lighting effect */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(255, 255, 255, 0.1) 100%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Edge lensing effect */}
      {edgeDistortion && (
        <>
          <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/10 to-transparent blur-sm" />
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white/10 to-transparent blur-sm" />
          <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white/10 to-transparent blur-sm" />
          <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white/10 to-transparent blur-sm" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Liquid Glass Button variant
export function LiquidGlassButton({
  children,
  onClick,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <LiquidGlass
      className={cn(
        'cursor-pointer select-none',
        'transition-all duration-200',
        isPressed ? 'scale-95' : 'hover:scale-105',
        className
      )}
      intensity="medium"
      variant="clear"
    >
      <button
        className="px-6 py-3 text-white font-medium w-full h-full"
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    </LiquidGlass>
  );
}

// Liquid Glass Card for content
export function LiquidGlassCard({
  children,
  className,
  variant = 'frost',
  ...props
}: LiquidGlassProps) {
  return (
    <LiquidGlass
      className={cn('p-6', className)}
      variant={variant}
      {...props}
    >
      {children}
    </LiquidGlass>
  );
}