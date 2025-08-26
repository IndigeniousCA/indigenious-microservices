import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementalConfig } from '../services/elemental-components.service';

interface ElementalCardProps {
  element: ElementalConfig;
  performanceMode: 'full-forest' | 'flowing-river' | 'still-pond';
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}

export const ElementalCard: React.FC<ElementalCardProps> = ({
  element,
  performanceMode,
  onClick,
  onHover
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  
  useEffect(() => {
    if (performanceMode === 'still-pond') return;
    
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 0.1) % (Math.PI * 2));
    }, 50);
    
    return () => clearInterval(interval);
  }, [performanceMode]);
  
  const getAnimationVariants = () => {
    if (performanceMode === 'still-pond') {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        hover: { scale: 1.02 }
      };
    }
    
    return {
      initial: { 
        opacity: 0,
        y: 20,
        scale: 0.95
      },
      animate: { 
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1]
        }
      },
      hover: {
        y: -5,
        scale: 1.02,
        transition: {
          duration: 0.3,
          ease: 'easeOut'
        }
      }
    };
  };
  
  const getGlowIntensity = () => {
    if (performanceMode === 'still-pond') return 0;
    if (performanceMode === 'flowing-river') return 0.5;
    return 0.8 + Math.sin(pulsePhase) * 0.2;
  };
  
  return (
    <motion.div
      className="elemental-card"
      variants={getAnimationVariants()}
      initial="initial"
      animate="animate"
      whileHover="hover"
      onClick={onClick}
      onHoverStart={() => {
        setIsHovered(true);
        onHover?.(true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
        onHover?.(false);
      }}
      style={{
        '--element-color': element.primaryColor,
        '--glow-intensity': getGlowIntensity(),
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: performanceMode !== 'still-pond' ? 'blur(20px) saturate(1.5)' : 'none',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '30px',
        paddingTop: '110px',
        cursor: 'pointer',
        overflow: 'hidden'
      } as React.CSSProperties}
    >
      {/* Periodic Table Box */}
      <motion.div
        className="element-symbol-box"
        animate={performanceMode !== 'still-pond' ? {
          boxShadow: [
            `0 0 20px ${element.primaryColor}33`,
            `0 0 40px ${element.primaryColor}66`,
            `0 0 20px ${element.primaryColor}33`
          ]
        } : {}}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70px',
          height: '70px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: performanceMode !== 'still-pond' ? 'blur(10px)' : 'none',
          border: `1px solid ${element.primaryColor}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          className="element-symbol"
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: element.primaryColor,
            lineHeight: 1
          }}
        >
          {element.symbol}
        </div>
        <div 
          className="element-weight"
          style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '2px'
          }}
        >
          {element.atomicWeight}
        </div>
        <div 
          className="element-ecosystem"
          style={{
            fontSize: '8px',
            color: element.primaryColor,
            opacity: 0.7,
            marginTop: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {element.ecosystem}
        </div>
      </motion.div>
      
      {/* Element Name */}
      <h3 
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'white',
          marginBottom: '8px',
          textAlign: 'center'
        }}
      >
        {element.name}
      </h3>
      
      {/* Ecosystem Role */}
      <div 
        style={{
          fontSize: '12px',
          color: element.primaryColor,
          textAlign: 'center',
          marginBottom: '16px',
          opacity: 0.8
        }}
      >
        {element.ecosystemRole}
      </div>
      
      {/* Description */}
      <p 
        style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)',
          lineHeight: '1.6',
          marginBottom: '16px'
        }}
      >
        {element.description}
      </p>
      
      {/* Traditional Wisdom */}
      <div 
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '12px',
          marginTop: 'auto'
        }}
      >
        <p 
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic',
            textAlign: 'center'
          }}
        >
          "{element.traditionalWisdom}"
        </p>
      </div>
      
      {/* Features Badge */}
      <div 
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)'
        }}
      >
        {element.featureIds.length} features
      </div>
      
      {/* Hover Effects */}
      <AnimatePresence>
        {isHovered && performanceMode !== 'still-pond' && (
          <>
            {/* Glow Effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at center, ${element.primaryColor}22 0%, transparent 70%)`,
                pointerEvents: 'none'
              }}
            />
            
            {/* Particle Effects */}
            {performanceMode === 'full-forest' && (
              <motion.div className="particles">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0,
                      y: 0,
                      x: Math.random() * 100 - 50
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      y: -100,
                      x: Math.random() * 100 - 50
                    }}
                    transition={{ 
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      width: '4px',
                      height: '4px',
                      background: element.primaryColor,
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }}
                  />
                ))}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
      
      {/* Animated Border */}
      {performanceMode === 'full-forest' && (
        <motion.div
          className="animated-border"
          animate={{
            background: [
              `linear-gradient(0deg, ${element.primaryColor}44 0%, transparent 50%, transparent 100%)`,
              `linear-gradient(90deg, ${element.primaryColor}44 0%, transparent 50%, transparent 100%)`,
              `linear-gradient(180deg, ${element.primaryColor}44 0%, transparent 50%, transparent 100%)`,
              `linear-gradient(270deg, ${element.primaryColor}44 0%, transparent 50%, transparent 100%)`,
              `linear-gradient(360deg, ${element.primaryColor}44 0%, transparent 50%, transparent 100%)`
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: '20px',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
      )}
    </motion.div>
  );
};

export default ElementalCard;