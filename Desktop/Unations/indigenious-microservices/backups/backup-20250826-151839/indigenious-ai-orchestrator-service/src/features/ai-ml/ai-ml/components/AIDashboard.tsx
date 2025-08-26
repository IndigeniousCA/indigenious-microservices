// AI Dashboard Component
// Central hub for AI/ML features and insights

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, Sparkles, TrendingUp, Target, MessageSquare,
  FileSearch, DollarSign, AlertTriangle, Users, Globe,
  ChevronRight, Clock, Star, Zap, Eye, Info, Settings
} from 'lucide-react'
import { useAI } from '../hooks/useAI'
import { SmartRecommendations } from './SmartRecommendations'
import { BidMatcher } from './BidMatcher'
import { PriceOptimizer } from './PriceOptimizer'
import { DocumentAnalyzer } from './DocumentAnalyzer'
import { AIAssistant } from './AIAssistant'
import { AnomalyDetector } from './AnomalyDetector'
import { ModelPerformance } from './ModelPerformance'
import { InsightsPanel } from './InsightsPanel'

interface AIDashboardProps {
  userId: string
  businessId?: string
  userRole: string
  culturalContext?: {
    community?: string
    language?: string
    protocols?: string[]
  }
}

export function AIDashboard({ 
  userId, 
  businessId, 
  userRole,
  culturalContext 
}: AIDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'recommendations' | 'bid-matcher' | 'price-optimizer' | 
    'document-analyzer' | 'assistant' | 'anomalies' | 'performance'
  >('overview')

  const {
    bidRecommendations,
    smartRecommendations,
    anomalies,
    modelPerformance,
    isLoading
  } = useAI({ userId, businessId, culturalContext })

  // Calculate AI metrics
  const aiMetrics = {
    totalRecommendations: bidRecommendations.length + smartRecommendations.length,
    activeAnomalies: anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length,
    avgConfidence: bidRecommendations.reduce((sum, r) => sum + r.confidence, 0) / (bidRecommendations.length || 1),
    modelsActive: modelPerformance.size
  }

  // Navigation tabs
  const tabs = [
    { 
      id: 'overview', 
      label: 'AI Overview', 
      icon: Brain,
      description: 'AI insights and metrics dashboard'
    },
    { 
      id: 'recommendations', 
      label: 'Smart Recommendations', 
      icon: Sparkles,
      badge: smartRecommendations.length,
      description: 'Personalized opportunities and insights'
    },
    { 
      id: 'bid-matcher', 
      label: 'Bid Matcher', 
      icon: Target,
      description: 'AI-powered RFQ matching'
    },
    { 
      id: 'price-optimizer', 
      label: 'Price Optimizer', 
      icon: DollarSign,
      description: 'Competitive pricing analysis'
    },
    { 
      id: 'document-analyzer', 
      label: 'Document Analyzer', 
      icon: FileSearch,
      description: 'NLP document processing'
    },
    { 
      id: 'assistant', 
      label: 'AI Assistant', 
      icon: MessageSquare,
      description: 'Conversational AI support'
    },
    { 
      id: 'anomalies', 
      label: 'Anomaly Detection', 
      icon: AlertTriangle,
      badge: anomalies.length,
      description: 'Unusual pattern alerts'
    },
    { 
      id: 'performance', 
      label: 'Model Performance', 
      icon: TrendingUp,
      description: 'AI system health metrics'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Brain className="w-7 h-7 mr-3 text-purple-400" />
            AI & Machine Learning Center
          </h1>
          <p className="text-white/60 mt-1">
            Intelligent automation and insights powered by culturally-aware AI
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Cultural Context Indicator */}
          {culturalContext && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 
              border border-purple-400/30 rounded-lg">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200 text-sm">
                {culturalContext.community || 'Indigenous AI'}
              </span>
            </div>
          )}

          <button className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
            rounded-lg text-white/60 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Status Banner */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border 
        border-purple-400/30 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {aiMetrics.totalRecommendations}
            </div>
            <div className="text-white/60 text-sm">Active Recommendations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {Math.round(aiMetrics.avgConfidence * 100)}%
            </div>
            <div className="text-white/60 text-sm">Average Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {aiMetrics.modelsActive}
            </div>
            <div className="text-white/60 text-sm">AI Models Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {aiMetrics.activeAnomalies}
            </div>
            <div className="text-white/60 text-sm">Active Alerts</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-2 text-purple-200 text-sm">
          <Zap className="w-4 h-4" />
          <span>AI systems operating at optimal performance</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as unknown)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative bg-white/10 backdrop-blur-md border rounded-xl p-4 
              text-left transition-all duration-200 ${
              activeTab === tab.id
                ? 'border-purple-400/50 bg-purple-500/10'
                : 'border-white/20 hover:bg-white/15'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <tab.icon className={`w-6 h-6 ${
                activeTab === tab.id ? 'text-purple-400' : 'text-white/60'
              }`} />
              {tab.badge && tab.badge > 0 && (
                <div className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                  {tab.badge}
                </div>
              )}
            </div>
            <h3 className="font-medium text-white text-sm mb-1">{tab.label}</h3>
            <p className="text-white/60 text-xs">{tab.description}</p>
            
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 border-2 border-purple-400 rounded-xl"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI Insights Summary */}
              <InsightsPanel 
                userId={userId}
                businessId={businessId}
                culturalContext={culturalContext}
              />

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Top Opportunity */}
                {smartRecommendations[0] && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Star className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="font-medium text-white">Top Opportunity</h3>
                    </div>
                    <p className="text-white/80 text-sm mb-3">
                      {smartRecommendations[0].title}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="text-emerald-400 font-medium">
                          {smartRecommendations[0].score}% Match
                        </div>
                        <div className="text-white/60 text-xs">
                          ${smartRecommendations[0].impact.revenue?.toLocaleString()} potential
                        </div>
                      </div>
                      <button className="text-emerald-400 hover:text-emerald-300">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Anomalies */}
                {anomalies.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <h3 className="font-medium text-white">Active Alerts</h3>
                    </div>
                    <p className="text-white/80 text-sm mb-3">
                      {anomalies[0].description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="text-amber-400 font-medium capitalize">
                          {anomalies[0].severity} Severity
                        </div>
                        <div className="text-white/60 text-xs">
                          {anomalies.length} total alerts
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('anomalies')}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Model Performance */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-medium text-white">AI Performance</h3>
                  </div>
                  <p className="text-white/80 text-sm mb-3">
                    All models operating normally
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-blue-400 font-medium">
                        87% Accuracy
                      </div>
                      <div className="text-white/60 text-xs">
                        1,247 predictions today
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('performance')}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent AI Activity */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent AI Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <Target className="w-5 h-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="text-white text-sm">New bid recommendation generated</p>
                      <p className="text-white/60 text-xs">Highway maintenance contract - 92% match</p>
                    </div>
                    <span className="text-white/40 text-xs">2 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <FileSearch className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-white text-sm">Document analyzed successfully</p>
                      <p className="text-white/60 text-xs">RFQ-2024-INF-001 - 15 requirements extracted</p>
                    </div>
                    <span className="text-white/40 text-xs">5 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <div className="flex-1">
                      <p className="text-white text-sm">Price optimization completed</p>
                      <p className="text-white/60 text-xs">Suggested bid: $175,000 (15% below market)</p>
                    </div>
                    <span className="text-white/40 text-xs">12 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <SmartRecommendations 
              userId={userId}
              businessId={businessId}
              culturalContext={culturalContext}
            />
          )}

          {activeTab === 'bid-matcher' && (
            <BidMatcher 
              userId={userId}
              businessId={businessId}
              culturalContext={culturalContext}
            />
          )}

          {activeTab === 'price-optimizer' && (
            <PriceOptimizer 
              userId={userId}
              businessId={businessId}
            />
          )}

          {activeTab === 'document-analyzer' && (
            <DocumentAnalyzer 
              userId={userId}
              culturalContext={culturalContext}
            />
          )}

          {activeTab === 'assistant' && (
            <AIAssistant 
              userId={userId}
              businessId={businessId}
              culturalContext={culturalContext}
            />
          )}

          {activeTab === 'anomalies' && (
            <AnomalyDetector 
              userId={userId}
              userRole={userRole}
            />
          )}

          {activeTab === 'performance' && (
            <ModelPerformance 
              userId={userId}
              userRole={userRole}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* AI Ethics Notice */}
      <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-indigo-400" />
          <div className="text-indigo-200 text-sm">
            <p className="font-medium mb-1">Ethical AI Commitment</p>
            <p className="text-indigo-100/80">
              Our AI systems are designed with Indigenous values, ensuring fair representation, 
              cultural sensitivity, and transparent decision-making. All recommendations respect 
              data sovereignty and traditional knowledge protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}