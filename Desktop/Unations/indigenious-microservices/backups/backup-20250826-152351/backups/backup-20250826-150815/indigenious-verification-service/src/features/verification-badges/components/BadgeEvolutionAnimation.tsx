'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { AnimalSpirit } from '../types';
import { SpiritAnimalSVGService } from '../services/SpiritAnimalSVGService';

interface BadgeEvolutionAnimationProps {
  fromSpirit: AnimalSpirit;
  toSpirit: AnimalSpirit;
  narrative: string;
  animationData: any;
  onComplete: () => void;
}

export const BadgeEvolutionAnimation: React.FC<BadgeEvolutionAnimationProps> = ({
  fromSpirit,
  toSpirit,
  narrative,
  animationData,
  onComplete
}) => {
  const [stage, setStage] = useState<'intro' | 'transformation' | 'celebration' | 'complete'>('intro');
  const [currentSpirit, setCurrentSpirit] = useState(fromSpirit);

  useEffect(() => {
    runEvolutionSequence();
  }, []);

  const runEvolutionSequence = async () => {
    // Intro phase
    await delay(1000);
    
    // Transformation phase
    setStage('transformation');
    await delay(animationData.duration * 0.5);
    setCurrentSpirit(toSpirit);
    
    // Celebration phase
    setStage('celebration');
    triggerCelebration();
    await delay(2000);
    
    // Complete
    setStage('complete');
    await delay(1000);
    onComplete();
  };

  const triggerCelebration = () => {
    // Confetti burst
    const count = 200;
    const defaults = {
      origin: { y: 0.5 },
      spread: 360,
      ticks: 100,
      gravity: 0.8,
      decay: 0.9,
      startVelocity: 30,
      colors: ['#FFD700', '#4B0082', '#00FF00', '#FF6347', '#4682B4']
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const getSpiritColors = (spirit: AnimalSpirit) => {
    const colors: Record<AnimalSpirit, { primary: string; glow: string }> = {
      [AnimalSpirit.BEAVER]: { primary: '#8B4513', glow: '#D2691E' },
      [AnimalSpirit.EAGLE]: { primary: '#FFD700', glow: '#FFA500' },
      [AnimalSpirit.FOX]: { primary: '#FF6347', glow: '#FF4500' },
      [AnimalSpirit.WOLF]: { primary: '#708090', glow: '#696969' },
      [AnimalSpirit.BEAR]: { primary: '#654321', glow: '#8B4513' },
      [AnimalSpirit.TURTLE]: { primary: '#228B22', glow: '#32CD32' },
      [AnimalSpirit.OTTER]: { primary: '#4682B4', glow: '#5F9EA0' },
      [AnimalSpirit.WOLVERINE]: { primary: '#2F4F4F', glow: '#483D8B' },
      [AnimalSpirit.MARTEN]: { primary: '#8B7355', glow: '#A0522D' },
      [AnimalSpirit.RAVEN]: { primary: '#000000', glow: '#4B0082' }
    };
    return colors[spirit];
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          {stage === 'transformation' && (
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)',
                  'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0) 70%)',
                  'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Spirit animation */}
          <div className="relative w-96 h-96 mx-auto mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSpirit}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  filter: stage === 'transformation' 
                    ? ['brightness(1)', 'brightness(2)', 'brightness(1)']
                    : 'brightness(1)'
                }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 1 }}
              >
                <svg
                  width="300"
                  height="300"
                  viewBox="0 0 100 100"
                  style={{
                    filter: `drop-shadow(0 0 30px ${getSpiritColors(currentSpirit).glow})`
                  }}
                >
                  <motion.path
                    d={getSpiritPath(currentSpirit)}
                    fill={getSpiritColors(currentSpirit).primary}
                    animate={stage === 'transformation' ? {
                      d: [
                        getSpiritPath(currentSpirit),
                        getMorphPath(),
                        getSpiritPath(currentSpirit)
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: stage === 'transformation' ? Infinity : 0 }}
                  />
                </svg>
              </motion.div>
            </AnimatePresence>

            {/* Particle effects */}
            {stage === 'transformation' && (
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    initial={{
                      x: 150,
                      y: 150,
                      opacity: 0
                    }}
                    animate={{
                      x: 150 + Math.cos(i * 18 * Math.PI / 180) * 150,
                      y: 150 + Math.sin(i * 18 * Math.PI / 180) * 150,
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {stage === 'intro' && (
              <h2 className="text-4xl font-bold text-white mb-4">
                Your Spirit Evolves...
              </h2>
            )}

            {stage === 'transformation' && (
              <motion.h2
                className="text-4xl font-bold text-white mb-4"
                animate={{ 
                  color: ['#ffffff', animationData.particles.color, '#ffffff']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Transforming...
              </motion.h2>
            )}

            {stage === 'celebration' && (
              <>
                <h2 className="text-5xl font-bold text-white mb-4">
                  {toSpirit.toUpperCase()} SPIRIT ACHIEVED!
                </h2>
                <p className="text-xl text-white/80 italic">
                  "{narrative}"
                </p>
              </>
            )}

            {stage === 'complete' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-3xl font-bold text-white mb-4">
                  Evolution Complete
                </h2>
                <p className="text-lg text-white/60">
                  Your journey continues as {toSpirit}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Skip button */}
        <motion.button
          className="absolute bottom-8 right-8 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Skip Animation
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper functions
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSpiritPath(spirit: AnimalSpirit): string {
  // Simplified paths - in production would use full SVG service
  const paths: Record<AnimalSpirit, string> = {
    [AnimalSpirit.BEAVER]: 'M50,25 C35,25 25,30 20,40 L15,50 C15,65 25,75 40,78 L50,85 L60,78 C75,75 85,65 85,50 L80,40 C75,30 65,25 50,25 Z',
    [AnimalSpirit.EAGLE]: 'M50,20 L35,40 L25,45 L20,55 L30,53 L40,50 L35,60 L30,70 L35,72 L45,65 L50,60 L55,65 L65,72 L70,70 L65,60 L60,50 L70,53 L80,55 L75,45 L65,40 Z',
    [AnimalSpirit.FOX]: 'M50,30 C45,25 40,25 35,28 L30,35 L28,45 L30,55 L35,65 L40,70 L50,75 L60,70 L65,65 L70,55 L72,45 L70,35 L65,28 C60,25 55,25 50,30 Z',
    [AnimalSpirit.WOLF]: 'M50,25 C45,20 40,20 35,23 L30,28 L25,35 L23,45 L25,55 L30,65 L35,70 L50,78 L65,70 L70,65 L75,55 L77,45 L75,35 L70,28 L65,23 C60,20 55,20 50,25 Z',
    [AnimalSpirit.BEAR]: 'M50,30 C40,30 30,35 25,45 L23,55 L25,65 L30,72 L40,77 L50,80 L60,77 L70,72 L75,65 L77,55 L75,45 C70,35 60,30 50,30 Z',
    [AnimalSpirit.TURTLE]: 'M50,30 C35,30 25,40 25,50 C25,60 35,70 50,70 C65,70 75,60 75,50 C75,40 65,30 50,30 Z',
    [AnimalSpirit.OTTER]: 'M50,25 C45,25 40,28 35,32 L30,40 L28,50 L30,60 L35,68 L40,72 L50,77 L60,72 L65,68 L70,60 L72,50 L70,40 L65,32 C60,28 55,25 50,25 Z',
    [AnimalSpirit.WOLVERINE]: 'M50,28 C45,25 40,25 35,28 L30,33 L25,40 L23,50 L25,60 L30,67 L35,72 L50,78 L65,72 L70,67 L75,60 L77,50 L75,40 L70,33 L65,28 C60,25 55,25 50,28 Z',
    [AnimalSpirit.MARTEN]: 'M50,30 C45,28 40,28 35,30 L32,35 L30,45 L32,55 L35,65 L40,70 L50,75 L60,70 L65,65 L68,55 L70,45 L68,35 L65,30 C60,28 55,28 50,30 Z',
    [AnimalSpirit.RAVEN]: 'M50,20 L40,25 L35,30 L30,42 L30,50 L35,65 L40,70 L50,75 L60,70 L65,65 L70,50 L70,42 L65,30 L60,25 Z'
  };
  return paths[spirit];
}

function getMorphPath(): string {
  // Intermediate morph shape
  return 'M50,50 m-25,0 a25,25 0 1,0 50,0 a25,25 0 1,0 -50,0';
}