import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface HeatMapCell {
  x: number;
  y: number;
  value: number;
  label: string;
  system: string;
  alert?: boolean;
}

interface MissionControlHeatMapProps {
  data: {
    systems: Record<string, any>;
    metrics: Record<string, number>;
  };
  variant?: 'performance' | 'security' | 'business' | 'infrastructure';
}

export function MissionControlHeatMap({ data, variant = 'performance' }: MissionControlHeatMapProps) {
  const heatMapData = useMemo(() => {
    const cells: HeatMapCell[] = [];
    
    const layouts = {
      performance: [
        { key: 'responseTime', label: 'API RESPONSE', target: 200, inverse: true, unit: 'MS' },
        { key: 'errorRate', label: 'ERROR RATE', target: 1, inverse: true, unit: '%' },
        { key: 'uptime', label: 'UPTIME', target: 99.9, unit: '%' },
        { key: 'deploymentSuccess', label: 'DEPLOY SUCCESS', target: 100, unit: '%' },
        { key: 'cacheHitRate', label: 'CACHE HITS', target: 90, unit: '%' },
        { key: 'cpuUsage', label: 'CPU USAGE', target: 70, inverse: true, unit: '%' },
        { key: 'memoryUsage', label: 'MEMORY', target: 80, inverse: true, unit: '%' },
        { key: 'throughput', label: 'THROUGHPUT', target: 1000, unit: 'RPS' },
        { key: 'queueDepth', label: 'QUEUE DEPTH', target: 100, inverse: true, unit: '' },
        { key: 'activeConnections', label: 'CONNECTIONS', target: 80, inverse: true, unit: '' },
        { key: 'latency', label: 'LATENCY', target: 50, inverse: true, unit: 'MS' },
        { key: 'availability', label: 'AVAILABILITY', target: 99.99, unit: '%' }
      ],
      security: [
        { key: 'blockedAttacks', label: 'THREATS BLOCKED', target: 0, inverse: true, unit: '' },
        { key: 'sslGrade', label: 'SSL GRADE', target: 100, unit: 'SCORE' },
        { key: 'vulnerabilities', label: 'VULNERABILITIES', target: 0, inverse: true, unit: '' },
        { key: 'patchStatus', label: 'PATCHES', target: 100, unit: '%' },
        { key: 'authFailures', label: 'AUTH FAILURES', target: 5, inverse: true, unit: '/HR' },
        { key: 'encryptionStrength', label: 'ENCRYPTION', target: 256, unit: 'BIT' },
        { key: 'firewallRules', label: 'FIREWALL', target: 100, unit: 'RULES' },
        { key: 'intrusions', label: 'INTRUSIONS', target: 0, inverse: true, unit: '' },
        { key: 'compliance', label: 'COMPLIANCE', target: 100, unit: '%' },
        { key: 'auditScore', label: 'AUDIT SCORE', target: 95, unit: '%' },
        { key: 'dataLeaks', label: 'DATA LEAKS', target: 0, inverse: true, unit: '' },
        { key: 'accessControl', label: 'ACCESS CTRL', target: 100, unit: '%' }
      ],
      business: [
        { key: 'activeUsers', label: 'ACTIVE USERS', target: 5000, unit: '' },
        { key: 'revenue', label: 'REVENUE', target: 100000, unit: '$' },
        { key: 'rfqsToday', label: 'RFQs TODAY', target: 50, unit: '' },
        { key: 'bidsToday', label: 'BIDS TODAY', target: 200, unit: '' },
        { key: 'conversion', label: 'CONVERSION', target: 25, unit: '%' },
        { key: 'satisfaction', label: 'SATISFACTION', target: 90, unit: '%' },
        { key: 'growth', label: 'GROWTH RATE', target: 10, unit: '%' },
        { key: 'retention', label: 'RETENTION', target: 95, unit: '%' },
        { key: 'engagement', label: 'ENGAGEMENT', target: 80, unit: '%' },
        { key: 'nps', label: 'NPS SCORE', target: 70, unit: '' },
        { key: 'support', label: 'SUPPORT TKT', target: 10, inverse: true, unit: '' },
        { key: 'community', label: 'COMMUNITY', target: 100, unit: 'SCORE' }
      ],
      infrastructure: [
        { key: 'kubernetes', label: 'K8S HEALTH', target: 100, unit: '%' },
        { key: 'database', label: 'DATABASE', target: 100, unit: '%' },
        { key: 'redis', label: 'REDIS', target: 100, unit: '%' },
        { key: 'cdn', label: 'CDN STATUS', target: 100, unit: '%' },
        { key: 'storage', label: 'STORAGE', target: 50, inverse: true, unit: '%' },
        { key: 'network', label: 'NETWORK', target: 100, unit: '%' },
        { key: 'dns', label: 'DNS HEALTH', target: 100, unit: '%' },
        { key: 'loadBalancer', label: 'LOAD BAL', target: 100, unit: '%' },
        { key: 'certificates', label: 'SSL CERTS', target: 30, unit: 'DAYS' },
        { key: 'backup', label: 'BACKUPS', target: 100, unit: '%' },
        { key: 'monitoring', label: 'MONITORING', target: 100, unit: '%' },
        { key: 'logging', label: 'LOGGING', target: 100, unit: '%' }
      ]
    };

    const layout = layouts[variant];
    const gridSize = 4;

    layout.forEach((metric, index) => {
      const x = index % gridSize;
      const y = Math.floor(index / gridSize);
      
      let value = data.metrics[metric.key] || 0;
      
      if (!value && data.systems[metric.key]) {
        const status = data.systems[metric.key].status;
        value = status === 'healthy' ? 100 : status === 'warning' ? 50 : 0;
      }
      
      let intensity = (value / metric.target) * 100;
      if (metric.inverse) {
        intensity = 100 - intensity;
      }
      intensity = Math.max(0, Math.min(100, intensity));
      
      cells.push({
        x,
        y,
        value: intensity,
        label: metric.label,
        system: `${value}${metric.unit}`,
        alert: intensity < 20
      });
    });

    return cells;
  }, [data, variant]);

  const getStatusColor = (value: number) => {
    if (value >= 80) return '#00FF00'; // Bright green
    if (value >= 60) return '#ADFF2F'; // Yellow-green
    if (value >= 40) return '#FFD700'; // Gold
    if (value >= 20) return '#FF8C00'; // Dark orange
    return '#FF0000'; // Bright red
  };

  const getBorderColor = (value: number) => {
    if (value >= 80) return 'rgba(0, 255, 0, 0.6)';
    if (value >= 60) return 'rgba(173, 255, 47, 0.6)';
    if (value >= 40) return 'rgba(255, 215, 0, 0.6)';
    if (value >= 20) return 'rgba(255, 140, 0, 0.6)';
    return 'rgba(255, 0, 0, 0.8)';
  };

  return (
    <div className="relative w-full h-full bg-black p-6">
      {/* Scan lines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
          backgroundSize: '100% 4px'
        }} />
      </div>

      {/* Grid container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-4 gap-3 w-full h-full relative z-10"
      >
        {heatMapData.map((cell, index) => (
          <motion.div
            key={`${cell.x}-${cell.y}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="relative aspect-square"
          >
            {/* Main container */}
            <div 
              className="absolute inset-0 border-2 transition-all duration-300"
              style={{
                borderColor: getBorderColor(cell.value),
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                boxShadow: `
                  inset 0 0 20px ${getBorderColor(cell.value)},
                  0 0 20px ${getBorderColor(cell.value)}
                `
              }}
            >
              {/* Grid pattern background */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`grid-${cell.x}-${cell.y}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke={getStatusColor(cell.value)} strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#grid-${cell.x}-${cell.y})`} />
                </svg>
              </div>

              {/* Status indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: getStatusColor(cell.value) }} />

              {/* Label */}
              <div className="absolute top-2 left-2 right-2">
                <div className="text-xs font-mono tracking-wider opacity-60" style={{ color: getStatusColor(cell.value) }}>
                  {cell.label}
                </div>
              </div>

              {/* Main value display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    className="text-5xl font-mono font-bold tabular-nums"
                    style={{ 
                      color: getStatusColor(cell.value),
                      textShadow: `0 0 20px ${getStatusColor(cell.value)}`
                    }}
                    animate={cell.alert ? {
                      opacity: [1, 0.3, 1],
                    } : {}}
                    transition={cell.alert ? {
                      duration: 1,
                      repeat: Infinity,
                    } : {}}
                  >
                    {Math.round(cell.value)}
                  </motion.div>
                  <div className="text-sm font-mono mt-1" style={{ color: getStatusColor(cell.value) }}>
                    {cell.system}
                  </div>
                </div>
              </div>

              {/* Alert indicator */}
              {cell.alert && (
                <>
                  <motion.div
                    className="absolute top-2 right-2"
                    animate={{
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 border-2 border-red-500 pointer-events-none"
                    animate={{
                      opacity: [0, 0.5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </>
              )}

              {/* Corner indicators */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polyline points="0,10 0,0 10,0" fill="none" stroke={getBorderColor(cell.value)} strokeWidth="2" />
                <polyline points={`${100},10 ${100},0 ${90},0`} fill="none" stroke={getBorderColor(cell.value)} strokeWidth="2" />
                <polyline points={`0,${90} 0,${100} 10,${100}`} fill="none" stroke={getBorderColor(cell.value)} strokeWidth="2" />
                <polyline points={`${100},${90} ${100},${100} ${90},${100}`} fill="none" stroke={getBorderColor(cell.value)} strokeWidth="2" />
              </svg>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Status legend */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 bg-black/90 px-6 py-2 border border-green-500/30">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3" style={{ backgroundColor: '#00FF00' }} />
          <span className="text-green-500 text-xs font-mono">OPTIMAL</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3" style={{ backgroundColor: '#ADFF2F' }} />
          <span className="text-green-400 text-xs font-mono">GOOD</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3" style={{ backgroundColor: '#FFD700' }} />
          <span className="text-yellow-500 text-xs font-mono">WARNING</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3" style={{ backgroundColor: '#FF8C00' }} />
          <span className="text-orange-500 text-xs font-mono">DEGRADED</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3" style={{ backgroundColor: '#FF0000' }} />
          <span className="text-red-500 text-xs font-mono">CRITICAL</span>
        </div>
      </div>
    </div>
  );
}