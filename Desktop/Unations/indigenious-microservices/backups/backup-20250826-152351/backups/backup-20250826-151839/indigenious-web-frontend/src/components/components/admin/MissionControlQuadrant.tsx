import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionControlHeatMap } from './MissionControlHeatMap';
import { useSystemHealth } from '@/hooks/useSystemHealth';

interface QuadrantConfig {
  id: string;
  title: string;
  code: string;
  variant: 'performance' | 'security' | 'business' | 'infrastructure';
  color: string;
}

export function MissionControlQuadrant() {
  const { health } = useSystemHealth();
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState('NOMINAL');
  
  const quadrants: QuadrantConfig[] = [
    {
      id: 'performance',
      title: 'SYSTEM PERFORMANCE',
      code: 'SYS-PERF',
      variant: 'performance',
      color: '#00FF00'
    },
    {
      id: 'security',
      title: 'SECURITY MATRIX',
      code: 'SEC-MTX',
      variant: 'security',
      color: '#00FFFF'
    },
    {
      id: 'business',
      title: 'BUSINESS METRICS',
      code: 'BIZ-OPS',
      variant: 'business',
      color: '#FFD700'
    },
    {
      id: 'infrastructure',
      title: 'INFRASTRUCTURE',
      code: 'INFRA',
      variant: 'infrastructure',
      color: '#FF00FF'
    }
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check system status
  useEffect(() => {
    if (health) {
      const criticalCount = Object.values(health.systems).filter(
        (s) => s.status === 'error'
      ).length;
      const warningCount = Object.values(health.systems).filter(
        (s) => s.status === 'warning'
      ).length;
      
      if (criticalCount > 0) {
        setSystemStatus('CRITICAL');
      } else if (warningCount > 2) {
        setSystemStatus('DEGRADED');
      } else if (warningCount > 0) {
        setSystemStatus('CAUTION');
      } else {
        setSystemStatus('NOMINAL');
      }
    }
  }, [health]);

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'CRITICAL': return '#FF0000';
      case 'DEGRADED': return '#FF8C00';
      case 'CAUTION': return '#FFD700';
      default: return '#00FF00';
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono">
      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
          backgroundSize: '100% 4px',
          animation: 'scan 8s linear infinite'
        }} />
      </div>

      {/* Main header */}
      <div className="absolute top-0 left-0 right-0 h-20 border-b border-green-500/50 bg-black/90 z-20">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-8">
            <div>
              <div className="text-green-500 text-xs tracking-wider">INDIGENOUS PROCUREMENT PLATFORM</div>
              <div className="text-2xl font-bold tracking-wider" style={{ color: getStatusColor() }}>
                MISSION CONTROL
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-green-500">
                <div className="text-xs opacity-60">STATUS</div>
                <div className="text-lg font-bold" style={{ color: getStatusColor() }}>
                  {systemStatus}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <div className="text-xs text-green-500/60">UTC TIME</div>
              <div className="text-xl text-green-500 tabular-nums">
                {currentTime.toISOString().split('T')[1].split('.')[0]}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-500/60">DATE</div>
              <div className="text-xl text-green-500">
                {currentTime.toISOString().split('T')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="absolute top-20 bottom-0 left-0 right-0 p-4">
        <AnimatePresence mode="wait">
          {!activeQuadrant ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 grid-rows-2 gap-4 h-full"
            >
              {quadrants.map((quadrant, index) => (
                <motion.div
                  key={quadrant.id}
                  className="relative border-2 cursor-pointer overflow-hidden group"
                  style={{ 
                    borderColor: `${quadrant.color}40`,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                  }}
                  onClick={() => setActiveQuadrant(quadrant.id)}
                  whileHover={{ 
                    borderColor: quadrant.color,
                    transition: { duration: 0.2 }
                  }}
                >
                  {/* Quadrant header */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-12 border-b flex items-center justify-between px-4 z-10"
                    style={{ 
                      borderColor: `${quadrant.color}40`,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)'
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-xs opacity-60" style={{ color: quadrant.color }}>
                        [{quadrant.code}]
                      </div>
                      <div className="text-sm font-bold tracking-wider" style={{ color: quadrant.color }}>
                        {quadrant.title}
                      </div>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: quadrant.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="absolute top-12 bottom-0 left-0 right-0">
                    <MissionControlHeatMap 
                      data={health || { systems: {}, metrics: {} }} 
                      variant={quadrant.variant}
                    />
                  </div>

                  {/* Hover effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${quadrant.color}10 0%, transparent 70%)`
                    }}
                  />

                  {/* Corner decorations */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polyline 
                      points="0,20 0,0 20,0" 
                      fill="none" 
                      stroke={quadrant.color} 
                      strokeWidth="1" 
                      opacity="0.5"
                    />
                    <polyline 
                      points={`${100}%,20 ${100}%,0 calc(${100}% - 20),0`} 
                      fill="none" 
                      stroke={quadrant.color} 
                      strokeWidth="1" 
                      opacity="0.5"
                    />
                  </svg>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="single"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full"
            >
              {/* Full screen view */}
              <div 
                className="absolute inset-0 border-2"
                style={{ 
                  borderColor: quadrants.find(q => q.id === activeQuadrant)?.color || '#00FF00',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)'
                }}
              >
                {/* Header */}
                <div 
                  className="absolute top-0 left-0 right-0 h-16 border-b flex items-center justify-between px-6"
                  style={{ 
                    borderColor: `${quadrants.find(q => q.id === activeQuadrant)?.color}40`,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)'
                  }}
                >
                  <div className="flex items-center space-x-6">
                    <div 
                      className="text-xs opacity-60"
                      style={{ color: quadrants.find(q => q.id === activeQuadrant)?.color }}
                    >
                      [{quadrants.find(q => q.id === activeQuadrant)?.code}]
                    </div>
                    <div 
                      className="text-2xl font-bold tracking-wider"
                      style={{ color: quadrants.find(q => q.id === activeQuadrant)?.color }}
                    >
                      {quadrants.find(q => q.id === activeQuadrant)?.title}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveQuadrant(null)}
                    className="px-4 py-2 border text-xs tracking-wider hover:bg-white/10 transition-colors"
                    style={{ 
                      borderColor: quadrants.find(q => q.id === activeQuadrant)?.color,
                      color: quadrants.find(q => q.id === activeQuadrant)?.color
                    }}
                  >
                    [RETURN TO GRID]
                  </button>
                </div>

                {/* Full screen content */}
                <div className="absolute top-16 bottom-0 left-0 right-0">
                  {quadrants.find(q => q.id === activeQuadrant) && (
                    <MissionControlHeatMap 
                      data={health || { systems: {}, metrics: {} }}
                      variant={quadrants.find(q => q.id === activeQuadrant)!.variant}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-green-500/50 bg-black/90 flex items-center justify-between px-8 text-xs">
        <div className="flex items-center space-x-8">
          <div className="text-green-500">
            <span className="opacity-60">RESOLUTION:</span> 3840x2160 4K
          </div>
          <div className="text-green-500">
            <span className="opacity-60">REFRESH:</span> REAL-TIME
          </div>
          <div className="text-green-500">
            <span className="opacity-60">LATENCY:</span> &lt;10MS
          </div>
        </div>
        <div className="flex items-center space-x-8">
          <div style={{ color: getStatusColor() }}>
            <span className="opacity-60">ALERTS:</span> {
              health ? Object.values(health.systems).filter((s) => s.status === 'error').length : 0
            } CRITICAL
          </div>
          <div className="text-yellow-500">
            <span className="opacity-60">WARNINGS:</span> {
              health ? Object.values(health.systems).filter((s) => s.status === 'warning').length : 0
            }
          </div>
          <div className="text-green-500">
            <span className="opacity-60">MODE:</span> {activeQuadrant ? 'FOCUSED' : 'QUADRANT'}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4px);
          }
        }
      `}</style>
    </div>
  );
}