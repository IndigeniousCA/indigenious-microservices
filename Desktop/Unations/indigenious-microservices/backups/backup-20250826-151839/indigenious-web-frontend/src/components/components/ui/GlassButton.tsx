'use client';

import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  intensity?: 'subtle' | 'regular' | 'prominent';
  children: React.ReactNode;
}

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

export function GlassButton({ 
  variant = 'primary', 
  size = 'md',
  intensity = 'regular',
  className,
  children,
  disabled,
  ...props 
}: GlassButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<RippleProps[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  // Variant configurations with Liquid Glass aesthetics
  const variants = {
    primary: {
      base: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
      hover: 'hover:from-blue-500/30 hover:to-purple-500/30',
      border: 'border-blue-400/30',
      text: 'text-white',
      shadow: 'shadow-[0_4px_24px_rgba(59,130,246,0.2)]'
    },
    secondary: {
      base: 'bg-white/10',
      hover: 'hover:bg-white/15',
      border: 'border-white/20',
      text: 'text-white',
      shadow: 'shadow-[0_4px_24px_rgba(255,255,255,0.08)]'
    },
    ghost: {
      base: 'bg-transparent',
      hover: 'hover:bg-white/5',
      border: 'border-transparent hover:border-white/10',
      text: 'text-white/80 hover:text-white',
      shadow: ''
    }
  };

  // Size configurations
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-3xl'
  };

  // Intensity configurations for blur
  const intensityConfig = {
    subtle: 'backdrop-blur-[8px]',
    regular: 'backdrop-blur-[16px]',
    prominent: 'backdrop-blur-[24px]'
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = { x, y, size };
    setRipples([...ripples, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prevRipples) => prevRipples.slice(1));
    }, 600);
  };

  const config = variants[variant];

  return (
    <button
      ref={buttonRef}
      className={cn(
        // Base styles
        'relative overflow-hidden transition-all duration-300 ease-out',
        'border font-medium',
        'transform-gpu will-change-transform',
        
        // Size
        sizes[size],
        
        // Variant styles
        config.base,
        config.hover,
        config.border,
        config.text,
        config.shadow,
        
        // Intensity (blur)
        intensityConfig[intensity],
        
        // Interactive states
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-xl',
        
        // Pressed state
        isPressed && 'scale-[0.98] shadow-inner',
        
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        
        // Focus states
        'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent',
        
        className
      )}
      onMouseDown={(e) => {
        handleRipple(e);
        setIsPressed(true);
      }}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={disabled}
      {...props}
    >
      {/* Liquid gradient background that shifts on hover */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `
            radial-gradient(
              circle at 30% 20%,
              rgba(255, 255, 255, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 80%,
              rgba(255, 255, 255, 0.1) 0%,
              transparent 50%
            )
          `
        }}
      />
      
      {/* Ripple effects container */}
      <div className="absolute inset-0">
        {ripples.map((ripple, index) => (
          <span
            key={index}
            className="absolute animate-liquid-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          >
            <span className="block w-full h-full rounded-full bg-white/30" />
          </span>
        ))}
      </div>
      
      {/* Inner light edge for depth */}
      <div className="absolute inset-[1px] rounded-[inherit] border border-white/10" />
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      
      {/* Bottom highlight for liquid effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{
          transform: isPressed ? 'scaleX(0)' : 'scaleX(1)',
          transition: 'transform 0.3s ease-out'
        }}
      />
    </button>
  );
}