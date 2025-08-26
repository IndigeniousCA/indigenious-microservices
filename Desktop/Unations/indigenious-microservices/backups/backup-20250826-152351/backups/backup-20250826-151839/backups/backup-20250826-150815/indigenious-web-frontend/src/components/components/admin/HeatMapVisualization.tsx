import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface HeatMapCell {
  x: number;
  y: number;
  value: number;
  label: string;
  system: string;
}

interface HeatMapProps {
  data: {
    systems: Record<string, any>;
    metrics: Record<string, number>;
  };
  variant?: 'performance' | 'security' | 'business' | 'infrastructure';
}

export function HeatMapVisualization({ data, variant = 'performance' }: HeatMapProps) {
  const heatMapData = useMemo(() => {
    const cells: HeatMapCell[] = [];
    
    // Define grid layouts for different variants
    const layouts = {
      performance: [
        { key: 'responseTime', label: 'API Response', target: 200, inverse: true },
        { key: 'errorRate', label: 'Error Rate', target: 1, inverse: true },
        { key: 'uptime', label: 'Uptime', target: 99.9 },
        { key: 'deploymentSuccess', label: 'Deploy Success', target: 100 },
        { key: 'cacheHitRate', label: 'Cache Hits', target: 90 },
        { key: 'cpuUsage', label: 'CPU Usage', target: 70, inverse: true },
        { key: 'memoryUsage', label: 'Memory', target: 80, inverse: true },
        { key: 'throughput', label: 'Throughput', target: 1000 },
        { key: 'queueDepth', label: 'Queue Depth', target: 100, inverse: true },
        { key: 'activeConnections', label: 'Connections', target: 80, inverse: true },
        { key: 'latency', label: 'Latency', target: 50, inverse: true },
        { key: 'availability', label: 'Availability', target: 99.99 }
      ],
      security: [
        { key: 'blockedAttacks', label: 'Threats Blocked', target: 0, inverse: true },
        { key: 'sslGrade', label: 'SSL Grade', target: 100 },
        { key: 'vulnerabilities', label: 'Vulnerabilities', target: 0, inverse: true },
        { key: 'patchStatus', label: 'Patches Applied', target: 100 },
        { key: 'authFailures', label: 'Auth Failures', target: 5, inverse: true },
        { key: 'encryptionStrength', label: 'Encryption', target: 256 },
        { key: 'firewallRules', label: 'Firewall Rules', target: 100 },
        { key: 'intrusions', label: 'Intrusions', target: 0, inverse: true },
        { key: 'compliance', label: 'Compliance', target: 100 },
        { key: 'auditScore', label: 'Audit Score', target: 95 },
        { key: 'dataLeaks', label: 'Data Leaks', target: 0, inverse: true },
        { key: 'accessControl', label: 'Access Control', target: 100 }
      ],
      business: [
        { key: 'activeUsers', label: 'Active Users', target: 5000 },
        { key: 'revenue', label: 'Revenue', target: 100000 },
        { key: 'rfqsToday', label: 'RFQs', target: 50 },
        { key: 'bidsToday', label: 'Bids', target: 200 },
        { key: 'conversion', label: 'Conversion', target: 25 },
        { key: 'satisfaction', label: 'Satisfaction', target: 90 },
        { key: 'growth', label: 'Growth Rate', target: 10 },
        { key: 'retention', label: 'Retention', target: 95 },
        { key: 'engagement', label: 'Engagement', target: 80 },
        { key: 'nps', label: 'NPS Score', target: 70 },
        { key: 'support', label: 'Support Tickets', target: 10, inverse: true },
        { key: 'community', label: 'Community', target: 100 }
      ],
      infrastructure: [
        { key: 'kubernetes', label: 'K8s Health', target: 100 },
        { key: 'database', label: 'Database', target: 100 },
        { key: 'redis', label: 'Redis', target: 100 },
        { key: 'cdn', label: 'CDN', target: 100 },
        { key: 'storage', label: 'Storage', target: 50, inverse: true },
        { key: 'network', label: 'Network', target: 100 },
        { key: 'dns', label: 'DNS', target: 100 },
        { key: 'loadBalancer', label: 'Load Balancer', target: 100 },
        { key: 'certificates', label: 'Certificates', target: 30 },
        { key: 'backup', label: 'Backups', target: 100 },
        { key: 'monitoring', label: 'Monitoring', target: 100 },
        { key: 'logging', label: 'Logging', target: 100 }
      ]
    };

    const layout = layouts[variant];
    const gridSize = 4; // 4x3 grid for 12 metrics

    layout.forEach((metric, index) => {
      const x = index % gridSize;
      const y = Math.floor(index / gridSize);
      
      // Get actual value from data
      let value = data.metrics[metric.key] || 0;
      
      // For system health statuses
      if (!value && data.systems[metric.key]) {
        const status = data.systems[metric.key].status;
        value = status === 'healthy' ? 100 : status === 'warning' ? 50 : 0;
      }
      
      // Calculate intensity (0-100)
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
        system: `${value}${metric.key.includes('Rate') || metric.key.includes('percentage') ? '%' : ''}`
      });
    });

    return cells;
  }, [data, variant]);

  // Color interpolation based on value
  const getColor = (value: number) => {
    if (value >= 80) return 'rgb(34, 197, 94)'; // green-500
    if (value >= 60) return 'rgb(132, 204, 22)'; // lime-500
    if (value >= 40) return 'rgb(250, 204, 21)'; // yellow-400
    if (value >= 20) return 'rgb(251, 146, 60)'; // orange-400
    return 'rgb(239, 68, 68)'; // red-500
  };

  const getTextColor = (value: number) => {
    return value < 50 ? 'white' : 'black';
  };

  return (
    <div className="relative w-full h-full p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-4 gap-4 w-full h-full"
      >
        {heatMapData.map((cell, index) => (
          <motion.div
            key={`${cell.x}-${cell.y}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: getColor(cell.value),
              boxShadow: `0 0 40px ${getColor(cell.value)}40`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            
            {/* Animated background pattern */}
            <motion.div
              className="absolute inset-0"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              style={{
                backgroundImage: `radial-gradient(circle at center, transparent 30%, ${getColor(cell.value)}20 70%)`,
                backgroundSize: '50px 50px'
              }}
            />
            
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <motion.div
                className="text-6xl font-bold mb-2"
                style={{ color: getTextColor(cell.value) }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {Math.round(cell.value)}%
              </motion.div>
              <div 
                className="text-xl font-medium text-center"
                style={{ color: getTextColor(cell.value) }}
              >
                {cell.label}
              </div>
              <div 
                className="text-lg opacity-80 mt-1"
                style={{ color: getTextColor(cell.value) }}
              >
                {cell.system}
              </div>
            </div>

            {/* Pulse effect for critical values */}
            {cell.value < 20 && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(239, 68, 68, 0.7)',
                    '0 0 0 20px rgba(239, 68, 68, 0)',
                  ]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 bg-black/80 backdrop-blur-xl px-8 py-4 rounded-full">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-green-500" />
          <span className="text-white text-lg">Excellent (80-100%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-lime-500" />
          <span className="text-white text-lg">Good (60-80%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-yellow-400" />
          <span className="text-white text-lg">Warning (40-60%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-orange-400" />
          <span className="text-white text-lg">Poor (20-40%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-red-500" />
          <span className="text-white text-lg">Critical (0-20%)</span>
        </div>
      </div>
    </div>
  );
}