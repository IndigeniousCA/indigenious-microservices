import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Grid3X3, Activity, Shield, DollarSign, Server } from 'lucide-react';
import { HeatMapVisualization } from './HeatMapVisualization';
import { useSystemHealth } from '@/hooks/useSystemHealth';

interface ComponentProps {
  data: any;
  variant?: 'performance' | 'security' | 'business' | 'infrastructure';
}

interface QuadrantConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  component: React.ComponentType<ComponentProps>;
  variant?: 'performance' | 'security' | 'business' | 'infrastructure';
}

export function QuadrantDashboard() {
  const { health } = useSystemHealth();
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  
  const quadrants: QuadrantConfig[] = [
    {
      id: 'performance',
      title: 'Performance Metrics',
      icon: Activity,
      component: HeatMapVisualization,
      variant: 'performance'
    },
    {
      id: 'security',
      title: 'Security Dashboard',
      icon: Shield,
      component: HeatMapVisualization,
      variant: 'security'
    },
    {
      id: 'business',
      title: 'Business Intelligence',
      icon: DollarSign,
      component: HeatMapVisualization,
      variant: 'business'
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure Health',
      icon: Server,
      component: HeatMapVisualization,
      variant: 'infrastructure'
    }
  ];

  // Auto-rotate through quadrants every 30 seconds
  useEffect(() => {
    if (!activeQuadrant) {
      const timer = setInterval(() => {
        setRotation(prev => (prev + 1) % 4);
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [activeQuadrant]);

  const handleQuadrantClick = (quadrantId: string) => {
    setActiveQuadrant(activeQuadrant === quadrantId ? null : quadrantId);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 4K Resolution Container (3840x2160) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-[3840px] max-h-[2160px]">
          
          {/* Grid Layout for 4 Quadrants */}
          <AnimatePresence mode="wait">
            {!activeQuadrant ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 grid-rows-2 gap-8 p-8 h-full"
              >
                {quadrants.map((quadrant, index) => {
                  const Component = quadrant.component;
                  const isActive = rotation === index;
                  
                  return (
                    <motion.div
                      key={quadrant.id}
                      className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                        isActive ? 'ring-4 ring-blue-500 shadow-[0_0_100px_rgba(59,130,246,0.5)]' : ''
                      }`}
                      onClick={() => handleQuadrantClick(quadrant.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      animate={{
                        opacity: isActive ? 1 : 0.7,
                        filter: isActive ? 'brightness(1.1)' : 'brightness(0.9)'
                      }}
                    >
                      {/* Glass Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl" />
                      
                      {/* Animated Border */}
                      <motion.div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                          background: `linear-gradient(45deg, transparent 30%, ${
                            isActive ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'
                          } 50%, transparent 70%)`,
                          backgroundSize: '200% 200%'
                        }}
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                        }}
                        transition={{
                          duration: 10,
                          repeat: Infinity,
                          ease: 'linear'
                        }}
                      />
                      
                      {/* Header */}
                      <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/80 to-transparent">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {React.createElement(quadrant.icon, { className: "w-10 h-10 text-white" })}
                            <h2 className="text-3xl font-bold text-white">{quadrant.title}</h2>
                          </div>
                          <Maximize2 className="w-8 h-8 text-white/60" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="absolute inset-0 pt-24">
                        <Component data={health || { systems: {}, metrics: {} }} variant={quadrant.variant} />
                      </div>
                      
                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute bottom-6 right-6 bg-blue-500 text-white px-4 py-2 rounded-full text-lg font-medium"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          LIVE
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="single"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative h-full rounded-3xl overflow-hidden"
              >
                {/* Full Screen View */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl" />
                
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 p-8 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      {(() => {
                        const quadrant = quadrants.find(q => q.id === activeQuadrant);
                        const Icon = quadrant?.icon;
                        return Icon ? React.createElement(Icon, { className: "w-16 h-16 text-white" }) : null;
                      })()}
                      <h1 className="text-6xl font-bold text-white">
                        {quadrants.find(q => q.id === activeQuadrant)?.title}
                      </h1>
                    </div>
                    <button
                      onClick={() => setActiveQuadrant(null)}
                      className="p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Grid3X3 className="w-12 h-12 text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Full Screen Content */}
                <div className="absolute inset-0 pt-32">
                  {(() => {
                    const quadrant = quadrants.find(q => q.id === activeQuadrant);
                    if (!quadrant) return null;
                    const Component = quadrant.component;
                    return (
                      <Component 
                        data={health || { systems: {}, metrics: {} }}
                        variant={quadrant.variant}
                      />
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Corner Indicators */}
          <div className="absolute top-8 left-8 text-white/60">
            <div className="text-sm">RESOLUTION</div>
            <div className="text-2xl font-bold">4K ULTRA HD</div>
          </div>
          
          <div className="absolute top-8 right-8 text-white/60 text-right">
            <div className="text-sm">REFRESH RATE</div>
            <div className="text-2xl font-bold">REAL-TIME</div>
          </div>
          
          <div className="absolute bottom-8 left-8 text-white/60">
            <div className="text-sm">DISPLAY</div>
            <div className="text-2xl font-bold">140" MICROLED</div>
          </div>
          
          <div className="absolute bottom-8 right-8 text-white/60 text-right">
            <div className="text-sm">MODE</div>
            <div className="text-2xl font-bold">{activeQuadrant ? 'FOCUSED' : 'QUADRANT'}</div>
          </div>
          
          {/* Auto-rotation indicator */}
          {!activeQuadrant && (
            <div className="absolute bottom-1/2 left-8 transform translate-y-1/2">
              <div className="flex flex-col space-y-4">
                {quadrants.map((_, index) => (
                  <motion.div
                    key={index}
                    className="w-2 h-12 rounded-full overflow-hidden bg-white/20"
                    animate={{
                      backgroundColor: rotation === index ? 'rgb(59, 130, 246)' : 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: rotation === index ? 1 : 0 }}
                      transition={{ duration: 30 }}
                      style={{ transformOrigin: 'bottom' }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Ambient Glow Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-[200px]" />
      </div>
    </div>
  );
}