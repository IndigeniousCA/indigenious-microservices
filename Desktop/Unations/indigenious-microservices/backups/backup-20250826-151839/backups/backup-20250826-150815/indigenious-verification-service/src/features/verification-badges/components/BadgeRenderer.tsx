'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimalSpirit, BadgeStage, VisualBadge } from '../types';

interface BadgeRendererProps {
  badge: VisualBadge;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  showMetrics?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  small: { width: 100, height: 100 },
  medium: { width: 200, height: 200 },
  large: { width: 300, height: 300 }
};

export const BadgeRenderer: React.FC<BadgeRendererProps> = ({
  badge,
  size = 'medium',
  interactive = true,
  showMetrics = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'hover' | 'click'>('idle');
  const { width, height } = sizeMap[size];

  const handleClick = () => {
    if (!interactive) return;
    setAnimationState('click');
    onClick?.();
    setTimeout(() => setAnimationState('idle'), 500);
  };

  const getSpiritAnimalPath = (animal: AnimalSpirit): string => {
    // These would be actual SVG paths for each animal
    const animalPaths: Record<AnimalSpirit, string> = {
      [AnimalSpirit.BEAVER]: 'M50,20 C30,20 20,30 20,50 C20,70 30,80 50,80 C70,80 80,70 80,50 C80,30 70,20 50,20 Z',
      [AnimalSpirit.EAGLE]: 'M50,15 L35,30 L20,45 L20,60 L35,70 L50,85 L65,70 L80,60 L80,45 L65,30 Z',
      [AnimalSpirit.FOX]: 'M50,25 C35,25 25,35 25,50 C25,65 35,75 50,75 C65,75 75,65 75,50 C75,35 65,25 50,25 Z',
      [AnimalSpirit.WOLF]: 'M50,20 L30,35 L25,55 L30,70 L50,80 L70,70 L75,55 L70,35 Z',
      [AnimalSpirit.BEAR]: 'M50,25 C40,25 30,30 30,40 L30,60 C30,70 40,75 50,75 C60,75 70,70 70,60 L70,40 C70,30 60,25 50,25 Z',
      [AnimalSpirit.TURTLE]: 'M50,30 C35,30 25,40 25,50 C25,60 35,70 50,70 C65,70 75,60 75,50 C75,40 65,30 50,30 Z',
      [AnimalSpirit.OTTER]: 'M50,20 C35,20 25,30 25,45 L25,55 C25,70 35,80 50,80 C65,80 75,70 75,55 L75,45 C75,30 65,20 50,20 Z',
      [AnimalSpirit.WOLVERINE]: 'M50,25 L35,30 L25,45 L25,55 L35,70 L50,75 L65,70 L75,55 L75,45 L65,30 Z',
      [AnimalSpirit.MARTEN]: 'M50,20 C40,20 30,25 30,35 L30,65 C30,75 40,80 50,80 C60,80 70,75 70,65 L70,35 C70,25 60,20 50,20 Z'
    };
    return animalPaths[animal];
  };

  const getStageEffects = (stage: BadgeStage) => {
    switch (stage) {
      case BadgeStage.ENTRY:
        return {
          filter: 'none',
          animation: 'pulse 3s ease-in-out infinite'
        };
      case BadgeStage.AURORA:
        return {
          filter: 'drop-shadow(0 0 20px rgba(0, 255, 0, 0.7))',
          animation: 'aurora 4s ease-in-out infinite'
        };
      case BadgeStage.GOLDEN:
        return {
          filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.9))',
          animation: 'golden 3s ease-in-out infinite'
        };
      case BadgeStage.LEGENDARY:
        return {
          filter: 'drop-shadow(0 0 40px rgba(255, 0, 255, 0.9))',
          animation: 'legendary 2s ease-in-out infinite'
        };
    }
  };

  const stageEffects = getStageEffects(badge.stage);

  return (
    <motion.div
      className="relative inline-block"
      style={{ width, height }}
      onHoverStart={() => interactive && setIsHovered(true)}
      onHoverEnd={() => interactive && setIsHovered(false)}
      onClick={handleClick}
      whileHover={interactive ? { scale: 1.05 } : {}}
      whileTap={interactive ? { scale: 0.95 } : {}}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        className="cursor-pointer"
        style={{
          filter: stageEffects.filter,
          animation: stageEffects.animation
        }}
      >
        {/* Background circle with stage-specific gradient */}
        <defs>
          <radialGradient id={`gradient-${badge.animal}-${badge.stage}`}>
            <stop offset="0%" stopColor={badge.colors.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={badge.colors.primary} stopOpacity="0.3" />
          </radialGradient>
          
          {/* Aurora effect for stage 2+ */}
          {badge.stage >= BadgeStage.AURORA && (
            <filter id="aurora">
              <feTurbulence baseFrequency="0.02" numOctaves="3" />
              <feColorMatrix values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" />
              <feComposite operator="over" />
            </filter>
          )}
        </defs>

        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke={badge.colors.accent}
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Background */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={`url(#gradient-${badge.animal}-${badge.stage})`}
        />

        {/* Spirit Animal */}
        <motion.path
          d={getSpiritAnimalPath(badge.animal)}
          fill={badge.colors.primary}
          stroke={badge.colors.secondary}
          strokeWidth="1"
          animate={{
            scale: isHovered ? 1.1 : 1,
            rotate: animationState === 'click' ? 360 : 0
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Stage indicators */}
        {Array.from({ length: 4 }, (_, i) => (
          <circle
            key={i}
            cx={20 + i * 20}
            cy="90"
            r="3"
            fill={i < badge.stage ? badge.colors.accent : 'rgba(255,255,255,0.3)'}
          />
        ))}
      </svg>

      {/* Metrics overlay */}
      <AnimatePresence>
        {showMetrics && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-black/80 backdrop-blur-lg rounded-lg text-white text-sm whitespace-nowrap"
          >
            <div className="font-semibold mb-1">{badge.animal.toUpperCase()} Spirit</div>
            <div className="space-y-1 text-xs">
              <div>Procurement: {badge.metrics.procurementPercentage}%</div>
              <div>Indigenous Employment: {badge.metrics.indigenousEmployment}</div>
              <div>Community Investment: ${badge.metrics.communityInvestment.toLocaleString()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes aurora {
          0%, 100% { 
            filter: drop-shadow(0 0 20px rgba(0, 255, 0, 0.7)) hue-rotate(0deg);
          }
          50% { 
            filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.9)) hue-rotate(180deg);
          }
        }

        @keyframes golden {
          0%, 100% { 
            filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9));
            transform: scale(1);
          }
          50% { 
            filter: drop-shadow(0 0 40px rgba(255, 255, 0, 1));
            transform: scale(1.02);
          }
        }

        @keyframes legendary {
          0% { 
            filter: drop-shadow(0 0 40px rgba(255, 0, 255, 0.9)) hue-rotate(0deg);
          }
          100% { 
            filter: drop-shadow(0 0 40px rgba(0, 255, 255, 0.9)) hue-rotate(360deg);
          }
        }
      `}</style>
    </motion.div>
  );
};