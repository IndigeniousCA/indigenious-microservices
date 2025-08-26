'use client';

import { useState } from 'react';
import { HeatMapVisualization } from '@/components/admin/HeatMapVisualization';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { Activity, Shield, DollarSign, Server } from 'lucide-react';

export default function HeatMapDashboardPage() {
  const { health, loading } = useSystemHealth();
  const [activeView, setActiveView] = useState<'performance' | 'security' | 'business' | 'infrastructure'>('performance');

  const views = [
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'business', label: 'Business', icon: DollarSign },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-4xl">Loading heat map data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-black to-transparent p-8">
        <h1 className="text-6xl font-bold text-white mb-8">System Heat Map</h1>
        
        {/* View Switcher */}
        <div className="flex space-x-4">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as 'infrastructure' | 'business' | 'security' | 'performance')}
              className={`
                px-8 py-4 rounded-xl flex items-center space-x-3 transition-all
                ${activeView === view.id 
                  ? 'bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
                }
              `}
            >
              <view.icon className="w-6 h-6" />
              <span className="text-xl font-medium">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Heat Map */}
      <div className="h-[calc(100vh-200px)]">
        <HeatMapVisualization 
          data={health || { systems: {}, metrics: {} }} 
          variant={activeView}
        />
      </div>
    </div>
  );
}