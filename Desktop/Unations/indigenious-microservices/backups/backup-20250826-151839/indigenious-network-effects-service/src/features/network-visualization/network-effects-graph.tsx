'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Building, Briefcase, Shield, TrendingUp, Zap, Globe } from 'lucide-react';

interface NetworkNode {
  id: string;
  type: 'business' | 'government' | 'professional' | 'mining' | 'platform';
  label: string;
  x?: number;
  y?: number;
  connections: string[];
  value: number;
  growth: number;
}

interface NetworkStats {
  totalNodes: number;
  totalConnections: number;
  networkValue: number;
  growthRate: number;
  activeTransactions: number;
}

const mockNodes: NetworkNode[] = [
  {
    id: 'platform',
    type: 'platform',
    label: 'Indigenious',
    connections: ['gov1', 'gov2', 'biz1', 'biz2', 'biz3', 'pro1', 'mining1'],
    value: 45000000,
    growth: 45,
  },
  {
    id: 'gov1',
    type: 'government',
    label: 'Public Services Canada',
    connections: ['platform', 'biz1', 'biz2'],
    value: 12000000,
    growth: 22,
  },
  {
    id: 'gov2',
    type: 'government',
    label: 'DND',
    connections: ['platform', 'biz3', 'pro1'],
    value: 8500000,
    growth: 18,
  },
  {
    id: 'biz1',
    type: 'business',
    label: 'Lightning Construction',
    connections: ['platform', 'gov1', 'pro1', 'biz2'],
    value: 2100000,
    growth: 67,
  },
  {
    id: 'biz2',
    type: 'business',
    label: 'Northern Tech',
    connections: ['platform', 'gov1', 'biz1', 'biz3'],
    value: 1800000,
    growth: 89,
  },
  {
    id: 'biz3',
    type: 'business',
    label: 'Eagle Environmental',
    connections: ['platform', 'gov2', 'biz2', 'mining1'],
    value: 3200000,
    growth: 112,
  },
  {
    id: 'pro1',
    type: 'professional',
    label: 'Strategic Advisory Group',
    connections: ['platform', 'gov2', 'biz1'],
    value: 750000,
    growth: 34,
  },
  {
    id: 'mining1',
    type: 'mining',
    label: 'Northern Mining Corp',
    connections: ['platform', 'biz3'],
    value: 5500000,
    growth: 28,
  },
];

const mockStats: NetworkStats = {
  totalNodes: 12453,
  totalConnections: 45678,
  networkValue: 2340000000, // $2.34B
  growthRate: 45,
  activeTransactions: 3421,
};

export default function NetworkEffectsGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [stats] = useState<NetworkStats>(mockStats);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    
    // Position nodes in a circle
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    const radius = Math.min(centerX, centerY) - 60;
    
    mockNodes.forEach((node, index) => {
      if (node.id === 'platform') {
        node.x = centerX;
        node.y = centerY;
      } else {
        const angle = (index - 1) * (2 * Math.PI / (mockNodes.length - 1));
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
      }
    });
    
    let time = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      time += 0.01;
      
      // Draw connections
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.lineWidth = 2;
      
      mockNodes.forEach(node => {
        node.connections.forEach(targetId => {
          const target = mockNodes.find(n => n.id === targetId);
          if (target && node.x && node.y && target.x && target.y) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            
            // Add some curve to the lines
            const cpx = (node.x + target.x) / 2 + Math.sin(time) * 20;
            const cpy = (node.y + target.y) / 2 + Math.cos(time) * 20;
            ctx.quadraticCurveTo(cpx, cpy, target.x, target.y);
            
            // Animate the connection
            const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
            gradient.addColorStop(0.5 + Math.sin(time) * 0.3, 'rgba(99, 102, 241, 0.5)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
            ctx.strokeStyle = gradient;
            
            ctx.stroke();
          }
        });
      });
      
      // Draw nodes
      mockNodes.forEach(node => {
        if (!node.x || !node.y) return;
        
        const nodeSize = node.id === 'platform' ? 30 : 15 + Math.log(node.value) * 0.5;
        const pulseSize = nodeSize + Math.sin(time * 2) * 3;
        
        // Node glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseSize * 2);
        glowGradient.addColorStop(0, `rgba(${getNodeColor(node.type)}, 0.3)`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Node circle
        ctx.fillStyle = `rgb(${getNodeColor(node.type)})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, hoveredNode === node.id ? pulseSize : nodeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Node icon
        ctx.fillStyle = 'white';
        ctx.font = `${nodeSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getNodeIcon(node.type), node.x, node.y);
        
        // Growth indicator
        if (node.growth > 50) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
          ctx.beginPath();
          ctx.arc(node.x + nodeSize, node.y - nodeSize, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hoveredNode]);
  
  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'platform': return '99, 102, 241'; // Indigo
      case 'government': return '59, 130, 246'; // Blue
      case 'business': return '34, 197, 94'; // Green
      case 'professional': return '168, 85, 247'; // Purple
      case 'mining': return '251, 146, 60'; // Orange
      default: return '107, 114, 128'; // Gray
    }
  };
  
  const getNodeIcon = (type: string): string => {
    switch (type) {
      case 'platform': return '🌐';
      case 'government': return '🏛️';
      case 'business': return '🏢';
      case 'professional': return '👔';
      case 'mining': return '⛏️';
      default: return '•';
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Effects in Action</h2>
        <p className="text-gray-600">
          Every connection makes the entire network more valuable. Watch as businesses, government, 
          and service providers create an unstoppable ecosystem.
        </p>
      </div>
      
      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-gray-600">Total Nodes</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.totalNodes.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-600">Connections</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.totalConnections.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Network Value</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            ${(stats.networkValue / 1000000000).toFixed(2)}B
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Growth Rate</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            +{stats.growthRate}%
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">Active Now</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.activeTransactions.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Network Visualization */}
      <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            let hovered: string | null = null;
            mockNodes.forEach(node => {
              if (node.x && node.y) {
                const dist = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
                if (dist < 30) {
                  hovered = node.id;
                }
              }
            });
            
            setHoveredNode(hovered);
          }}
          onMouseLeave={() => setHoveredNode(null)}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Network Participants</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Platform (Hub)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Indigenous Businesses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Government</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Professionals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Corporations</span>
            </div>
          </div>
        </div>
        
        {/* Hovered Node Info */}
        {hoveredNode && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
            {(() => {
              const node = mockNodes.find(n => n.id === hoveredNode);
              if (!node) return null;
              return (
                <>
                  <h4 className="font-semibold text-gray-900">{node.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Value: ${(node.value / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-green-600">
                    Growth: +{node.growth}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {node.connections.length} connections
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </div>
      
      {/* Network Effects Explanation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <h3 className="font-semibold text-indigo-900 mb-2">Direct Network Effects</h3>
          <p className="text-sm text-indigo-800">
            Each new Indigenous business makes the platform more valuable for government buyers.
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Cross-Side Effects</h3>
          <p className="text-sm text-green-800">
            More government contracts attract more businesses, creating a virtuous cycle.
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Data Network Effects</h3>
          <p className="text-sm text-purple-800">
            Every transaction improves our AI, making the platform smarter for everyone.
          </p>
        </div>
      </div>
    </div>
  );
}