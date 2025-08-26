'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Network, 
  TrendingUp, 
  AlertCircle,
  Zap,
  Users,
  BarChart3,
  Activity,
  Shield,
  Sparkles,
  Bot,
  Eye,
  Layers,
  Globe,
  MessageSquare,
  Heart,
  Map
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { 
  NetworkEffectType,
  AINetworkHealth,
  NetworkEffectMetrics,
  AIInterventionAlert
} from '../types/network-effects.types';

interface NetworkHealthDashboardProps {
  className?: string;
}

export default function NetworkHealthDashboard({ className }: NetworkHealthDashboardProps) {
  const [networkHealth, setNetworkHealth] = useState<AINetworkHealth | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<NetworkEffectType | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAIInsights, setShowAIInsights] = useState(true);

  useEffect(() => {
    fetchNetworkHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchNetworkHealth, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchNetworkHealth = async () => {
    try {
      const response = await fetch('/api/admin/network-health');
      const data = await response.json();
      setNetworkHealth(data);
    } catch (error) {
      logger.error('Failed to fetch network health:', error);
    }
  };

  const getNetworkEffectIcon = (type: NetworkEffectType) => {
    const icons: Record<NetworkEffectType, any> = {
      [NetworkEffectType.DIRECT]: Users,
      [NetworkEffectType.TWO_SIDED]: BarChart3,
      [NetworkEffectType.DATA]: Brain,
      [NetworkEffectType.SOCIAL]: Network,
      [NetworkEffectType.PROTOCOL]: Shield,
      [NetworkEffectType.PLATFORM]: Layers,
      [NetworkEffectType.LANGUAGE]: Globe,
      [NetworkEffectType.PERSONAL_UTILITY]: Users,
      [NetworkEffectType.PERSONAL]: Users,
      [NetworkEffectType.MARKET_NETWORK]: Network,
      [NetworkEffectType.ASYMPTOTIC]: TrendingUp,
      [NetworkEffectType.EXPERTISE]: Brain,
      [NetworkEffectType.INSTANT_MESSAGING]: MessageSquare,
      [NetworkEffectType.BELIEF]: Heart,
      [NetworkEffectType.BANDWAGON]: TrendingUp,
      [NetworkEffectType.PHYSICAL]: Map
    };
    return icons[type] || Network;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className={className}>
      {/* Header */}
      <GlassPanel className="mb-6">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Network Health Monitor</h1>
              <p className="text-white/60">AI-Powered Prosperity Optimization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAIInsights(!showAIInsights)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              <Bot className="w-4 h-4" />
              <span className="text-sm">AI Insights</span>
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-gray-500/20 hover:bg-gray-500/30'
              }`}
            >
              <Activity className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Overall Health Score */}
        {networkHealth && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getHealthColor(networkHealth.overallHealth)}`}>
                  {formatPercentage(networkHealth.overallHealth)}
                </div>
                <div className="text-sm text-white/60 mt-1">Overall Health</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400">
                  {formatPercentage(networkHealth.prosperityIndex)}
                </div>
                <div className="text-sm text-white/60 mt-1">Prosperity Index</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400">
                  {formatPercentage(networkHealth.sustainabilityScore)}
                </div>
                <div className="text-sm text-white/60 mt-1">Sustainability</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {networkHealth.aiAgentStatus.filter(a => a.autonomyLevel === 'full').length}
                </div>
                <div className="text-sm text-white/60 mt-1">Active AI Agents</div>
              </div>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Network Effects Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {networkHealth?.networkEffects.map((effect) => {
          const Icon = getNetworkEffectIcon(effect.type);
          const isSelected = selectedEffect === effect.type;
          
          return (
            <motion.div
              key={effect.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassPanel
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-400 bg-blue-400/10' : ''
                }`}
                onClick={() => setSelectedEffect(effect.type)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  {effect.aiOptimizationScore > 85 && (
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                
                <h3 className="text-sm font-medium text-white mb-1">
                  {effect.type.replace('_', ' ').toUpperCase()}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Strength</span>
                    <span className={`text-sm font-bold ${getHealthColor(effect.strength)}`}>
                      {formatPercentage(effect.strength)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${effect.strength}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Growth</span>
                    <span className={`font-medium ${effect.growth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {effect.growth > 0 ? '+' : ''}{effect.growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* AI Intervention Alerts */}
        <GlassPanel className="col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              AI Intervention Opportunities
            </h2>
            <span className="text-sm text-white/60">
              {networkHealth?.interventionAlerts.length || 0} active
            </span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {networkHealth?.interventionAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-lg border ${
                  alert.urgency === 'critical' 
                    ? 'bg-red-500/10 border-red-400/50' 
                    : alert.urgency === 'high'
                    ? 'bg-yellow-500/10 border-yellow-400/50'
                    : 'bg-blue-500/10 border-blue-400/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.urgency === 'critical' 
                          ? 'bg-red-500/20 text-red-400' 
                          : alert.urgency === 'high'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.urgency.toUpperCase()}
                      </span>
                      <span className="text-xs text-white/60">
                        Leverage Point {alert.leveragePoint}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-white mt-1">
                      {alert.description}
                    </h3>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-white/60">Potential Impact</div>
                    <div className="text-sm font-bold text-green-400">
                      +{alert.potentialImpact.likelyCase.toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                {showAIInsights && (
                  <div className="mt-3 p-3 bg-purple-500/10 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-purple-300 mb-2">{alert.aiAnalysis}</p>
                        
                        {alert.suggestedActions.automated.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-white/60">Automated Actions:</span>
                            <ul className="text-xs text-green-400 ml-4 mt-1">
                              {alert.suggestedActions.automated.map((action, i) => (
                                <li key={i}>• {action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {alert.suggestedActions.humanRequired.length > 0 && (
                          <div>
                            <span className="text-xs text-white/60">Human Actions:</span>
                            <ul className="text-xs text-yellow-400 ml-4 mt-1">
                              {alert.suggestedActions.humanRequired.map((action, i) => (
                                <li key={i}>• {action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3">
                          <button className="text-xs px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors">
                            Execute Auto Actions
                          </button>
                          <button className="text-xs px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors">
                            Review Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </GlassPanel>

        {/* AI Agent Status */}
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-purple-400" />
            AI Agent Status
          </h2>
          
          <div className="space-y-3">
            {networkHealth?.aiAgentStatus.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{agent.name}</div>
                  <div className="text-xs text-white/60">{agent.type}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  agent.autonomyLevel === 'full' 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
                }`} />
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/60 mb-2">Ambient Intelligence</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-white">Predictive UI</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-white">Auto Optimize</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-xs text-white">Privacy Safe</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-white">Learning</span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}