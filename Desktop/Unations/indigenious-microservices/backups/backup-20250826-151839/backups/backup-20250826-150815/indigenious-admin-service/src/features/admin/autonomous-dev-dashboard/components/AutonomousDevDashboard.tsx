/**
 * Autonomous Development Dashboard
 * Monitor and control the AI-driven development system
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Code, 
  Zap, 
  TrendingUp, 
  Shield, 
  GitBranch,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Cpu,
  GitPullRequest,
  Bug,
  Lightbulb,
  Rocket
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import { autonomousDevSystem, DevelopmentInsight } from '@/lib/ai/autonomous-dev-system';
import { proactiveAssistant, CodeSuggestion } from '@/lib/ai/proactive-code-assistant';
// import { useToast } from '@/hooks/useToast';
const useToast = () => ({ showToast: (msg: any) => console.log('Toast:', msg) });

interface InsightStats {
  total: number;
  applied: number;
  pending: number;
  dismissed: number;
  byType: Record<string, number>;
  averageConfidence: number;
  estimatedHoursSaved: number;
}

export default function AutonomousDevDashboard() {
  const [insights, setInsights] = useState<DevelopmentInsight[]>([]);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [stats, setStats] = useState<InsightStats>({
    total: 0,
    applied: 0,
    pending: 0,
    dismissed: 0,
    byType: {},
    averageConfidence: 0,
    estimatedHoursSaved: 0,
  });
  const [selectedInsight, setSelectedInsight] = useState<DevelopmentInsight | null>(null);
  const [techRadar, setTechRadar] = useState<any[]>([]);
  const [isAutoApplyEnabled, setIsAutoApplyEnabled] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time updates
    const handleNewInsight = (insight: DevelopmentInsight) => {
      setInsights(prev => [insight, ...prev]);
      showToast({
        title: 'New Development Insight',
        description: insight.title,
        type: 'info',
      });
    };

    const handleNewSuggestion = (suggestion: CodeSuggestion) => {
      setSuggestions(prev => [suggestion, ...prev].slice(0, 50));
    };

    autonomousDevSystem.on('insight_generated', handleNewInsight);
    proactiveAssistant.on('suggestion', handleNewSuggestion);

    return () => {
      autonomousDevSystem.off('insight_generated', handleNewInsight);
      proactiveAssistant.off('suggestion', handleNewSuggestion);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load insights
      const activeInsights = await autonomousDevSystem.getActiveInsights();
      setInsights(activeInsights);

      // Load suggestions
      const activeSuggestions = proactiveAssistant.getSuggestions();
      setSuggestions(activeSuggestions);

      // Calculate stats
      calculateStats(activeInsights);

      // Load tech radar
      const response = await fetch('/api/admin/tech-radar');
      if (response.ok) {
        const data = await response.json();
        setTechRadar(data.technologies);
      }
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    }
  };

  const calculateStats = (insights: DevelopmentInsight[]) => {
    const stats: InsightStats = {
      total: insights.length,
      applied: 0,
      pending: insights.length,
      dismissed: 0,
      byType: {},
      averageConfidence: 0,
      estimatedHoursSaved: 0,
    };

    insights.forEach(insight => {
      stats.byType[insight.type] = (stats.byType[insight.type] || 0) + 1;
      stats.averageConfidence += insight.aiConfidence;
      stats.estimatedHoursSaved += insight.implementation.estimatedHours;
    });

    stats.averageConfidence = stats.averageConfidence / insights.length || 0;
    setStats(stats);
  };

  const handleApplyInsight = async (insight: DevelopmentInsight) => {
    try {
      const success = await autonomousDevSystem.applyInsight(insight.id);
      
      if (success) {
        showToast({
          title: 'Insight Applied',
          description: `Successfully applied: ${insight.title}`,
          type: 'success',
        });
        
        // Reload data
        loadDashboardData();
      } else {
        showToast({
          title: 'Application Failed',
          description: 'Could not apply the insight. Check logs for details.',
          type: 'error',
        });
      }
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'An error occurred while applying the insight',
        type: 'error',
      });
    }
  };

  const handleDismissInsight = async (insight: DevelopmentInsight) => {
    const reason = prompt('Why are you dismissing this insight?');
    if (reason) {
      await autonomousDevSystem.dismissInsight(insight.id, reason);
      loadDashboardData();
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'bug_fix': return <Bug className="w-5 h-5" />;
      case 'enhancement': return <Lightbulb className="w-5 h-5" />;
      case 'new_feature': return <Sparkles className="w-5 h-5" />;
      case 'tech_upgrade': return <Rocket className="w-5 h-5" />;
      case 'security_patch': return <Shield className="w-5 h-5" />;
      default: return <Code className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            Autonomous Development System
          </h1>
          <p className="text-white/60 mt-2">
            AI-powered development insights and automation
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <GlassPanel className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-white">System Active</span>
            </div>
          </GlassPanel>
          
          <GlassButton
            onClick={() => setIsAutoApplyEnabled(!isAutoApplyEnabled)}
            variant={isAutoApplyEnabled ? 'primary' : 'secondary'}
          >
            {isAutoApplyEnabled ? 'Auto-Apply ON' : 'Auto-Apply OFF'}
          </GlassButton>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Active Insights</p>
              <p className="text-3xl font-bold text-white">{stats.pending}</p>
            </div>
            <Lightbulb className="w-8 h-8 text-yellow-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Hours Saved</p>
              <p className="text-3xl font-bold text-white">
                {Math.round(stats.estimatedHoursSaved)}
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">AI Confidence</p>
              <p className="text-3xl font-bold text-white">
                {Math.round(stats.averageConfidence * 100)}%
              </p>
            </div>
            <Cpu className="w-8 h-8 text-blue-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Applied Today</p>
              <p className="text-3xl font-bold text-white">{stats.applied}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </GlassPanel>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights List */}
        <div className="lg:col-span-2 space-y-4">
          <GlassPanel className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Development Insights
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <AnimatePresence>
                {insights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div
                      className="p-4 hover:bg-white/20 transition-colors cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 rounded-xl"
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getInsightIcon(insight.type)}
                            <h3 className="text-white font-medium">{insight.title}</h3>
                            <span className={`text-sm ${getPriorityColor(insight.priority)}`}>
                              {insight.priority}
                            </span>
                          </div>
                          
                          <p className="text-white/60 text-sm mb-3">
                            {insight.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {Math.round(insight.aiConfidence * 100)}% confidence
                            </span>
                            <span className="flex items-center gap-1">
                              <Code className="w-3 h-3" />
                              {insight.implementation.files.length} files
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {insight.implementation.estimatedHours}h saved
                            </span>
                          </div>

                          {insight.estimatedImpact && (
                            <div className="flex items-center gap-3 mt-3">
                              {insight.estimatedImpact.performance && (
                                <span className="text-xs text-green-400">
                                  +{insight.estimatedImpact.performance}% performance
                                </span>
                              )}
                              {insight.estimatedImpact.security && (
                                <span className="text-xs text-blue-400">
                                  +{insight.estimatedImpact.security}% security
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyInsight(insight);
                            }}
                          >
                            Apply
                          </GlassButton>
                          <GlassButton
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissInsight(insight);
                            }}
                          >
                            Dismiss
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassPanel>

          {/* Code Suggestions */}
          <GlassPanel className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-400" />
              Real-time Code Suggestions
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {suggestions.slice(0, 10).map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${
                          suggestion.severity === 'error' ? 'text-red-400' :
                          suggestion.severity === 'warning' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {suggestion.title}
                        </span>
                        <span className="text-xs text-white/40">
                          {suggestion.file}:{suggestion.line}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {suggestion.description}
                      </p>
                    </div>
                    
                    {suggestion.autoFixable && (
                      <GlassButton
                        size="sm"
                        onClick={() => proactiveAssistant.applySuggestion(suggestion.id)}
                      >
                        Fix
                      </GlassButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Tech Radar & Details */}
        <div className="space-y-4">
          {/* Selected Insight Details */}
          {selectedInsight && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Implementation Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-white/60 mb-2">Files to modify:</p>
                  <div className="space-y-1">
                    {selectedInsight.implementation.files.map((file, i) => (
                      <div key={i} className="text-sm text-white/80 font-mono">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInsight.implementation.dependencies && 
                 selectedInsight.implementation.dependencies.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-2">New dependencies:</p>
                    <div className="space-y-1">
                      {selectedInsight.implementation.dependencies.map((dep, i) => (
                        <div key={i} className="text-sm text-white/80 font-mono">
                          {dep}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">
                    Will create PR with {selectedInsight.implementation.changes.length} changes
                  </span>
                </div>

                {selectedInsight.implementation.breakingChanges && (
                  <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                    <p className="text-sm text-red-400">
                      ⚠️ Contains breaking changes
                    </p>
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {/* Tech Radar */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-purple-400" />
              Technology Radar
            </h3>

            <div className="space-y-3">
              {techRadar.slice(0, 5).map((tech, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{tech.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tech.ring === 'adopt' ? 'bg-green-500/20 text-green-400' :
                      tech.ring === 'trial' ? 'bg-yellow-500/20 text-yellow-400' :
                      tech.ring === 'assess' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {tech.ring}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mb-2">{tech.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>⭐ {tech.communityAdoption.stars}</span>
                    <span>📊 {Math.round(tech.relevanceScore * 100)}% relevant</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* System Health */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              System Health
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Bug Detection</span>
                <span className="text-sm text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Pattern Recognition</span>
                <span className="text-sm text-green-400">Learning</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Tech Scanning</span>
                <span className="text-sm text-blue-400">Updated 2h ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Code Quality</span>
                <span className="text-sm text-yellow-400">85%</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}