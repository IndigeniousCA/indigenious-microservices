'use client'

import React, { useState, useEffect } from 'react'
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Code, Shield, Zap, DollarSign, 
  Users, BarChart3, Key, Globe,
  CheckCircle, TrendingUp, Lock, Sparkles,
  Database, Cpu, Activity, Award
} from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface APIProduct {
  id: string
  name: string
  description: string
  category: 'data' | 'analytics' | 'verification' | 'compliance' | 'intelligence'
  provider: {
    name: string
    verified: boolean
    indigenousOwned: boolean
  }
  pricing: {
    model: 'pay-per-use' | 'subscription' | 'freemium'
    basePrice: number
    freeQuota: number
    unit: string
  }
  stats: {
    requests: number
    uptime: number
    avgLatency: number
    rating: number
    reviews: number
  }
  features: string[]
  endpoints: APIEndpoint[]
  revenue?: {
    total: number
    thisMonth: number
    growth: number
  }
}

interface APIEndpoint {
  method: string
  path: string
  description: string
  rateLimit: string
  example: {
    request: string
    response: string
  }
}

export function APIMarketplace() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-apis' | 'analytics' | 'docs'>('browse')
  const [selectedAPI, setSelectedAPI] = useState<APIProduct | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [apiProducts, setApiProducts] = useState<APIProduct[]>([])
  const [userAPIs, setUserAPIs] = useState<APIProduct[]>([])
  const [apiKey, setApiKey] = useState<string>('')
  const [showKeyGenerator, setShowKeyGenerator] = useState(false)

  useEffect(() => {
    loadAPIProducts()
    loadUserAPIs()
  }, [])

  const loadAPIProducts = () => {
    // Mock data - in production, fetch from API
    setApiProducts([
      {
        id: 'api-1',
        name: 'Indigenous Business Verification API',
        description: 'Instantly verify Indigenous business certifications and ownership',
        category: 'verification',
        provider: {
          name: 'CCAB Integration Services',
          verified: true,
          indigenousOwned: true,
        },
        pricing: {
          model: 'pay-per-use',
          basePrice: 0.10,
          freeQuota: 100,
          unit: 'verification',
        },
        stats: {
          requests: 1250000,
          uptime: 99.9,
          avgLatency: 45,
          rating: 4.8,
          reviews: 234,
        },
        features: [
          'Real-time CCAB verification',
          'Ownership percentage validation',
          'Certificate expiry alerts',
          'Bulk verification support',
        ],
        endpoints: [
          {
            method: 'GET',
            path: '/verify/business/{businessNumber}',
            description: 'Verify a single business certification',
            rateLimit: '1000/hour',
            example: {
              request: `curl -X GET "https://api.indigenous-procurement.ca/v1/verify/business/123456789" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
              response: `{
  "verified": true,
  "businessName": "Northern Solar Tech",
  "certificationNumber": "CCAB-2024-1234",
  "ownershipPercentage": 75,
  "expiryDate": "2025-12-31",
  "certifyingBody": "CCAB",
  "status": "active"
}`
            }
          }
        ],
      },
      {
        id: 'api-2',
        name: 'Procurement Intelligence API',
        description: 'AI-powered insights on government procurement trends and opportunities',
        category: 'intelligence',
        provider: {
          name: 'Indigenous AI Labs',
          verified: true,
          indigenousOwned: true,
        },
        pricing: {
          model: 'subscription',
          basePrice: 499,
          freeQuota: 10,
          unit: 'month',
        },
        stats: {
          requests: 850000,
          uptime: 99.8,
          avgLatency: 120,
          rating: 4.9,
          reviews: 156,
        },
        features: [
          'Predictive RFQ analytics',
          'Department spending patterns',
          'Win probability scoring',
          'Competitive intelligence',
          'Custom alerts',
        ],
        endpoints: [
          {
            method: 'POST',
            path: '/intelligence/predict',
            description: 'Get AI predictions for upcoming opportunities',
            rateLimit: '100/day',
            example: {
              request: `curl -X POST "https://api.indigenous-procurement.ca/v1/intelligence/predict" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "businessId": "BUS-123",
    "categories": ["solar", "construction"],
    "timeframe": "next_quarter"
  }'`,
              response: `{
  "predictions": [
    {
      "department": "Health Canada",
      "probability": 0.92,
      "estimatedValue": 750000,
      "category": "solar",
      "timeframe": "30-45 days"
    }
  ],
  "recommendations": [
    "Update solar installation certifications",
    "Partner with electrical contractor"
  ]
}`
            }
          }
        ],
      },
      {
        id: 'api-3',
        name: 'Community Benefits Calculator',
        description: 'Calculate and track Indigenous community benefits for proposals',
        category: 'analytics',
        provider: {
          name: 'First Nations Data Collective',
          verified: true,
          indigenousOwned: true,
        },
        pricing: {
          model: 'freemium',
          basePrice: 0,
          freeQuota: 50,
          unit: 'calculation',
        },
        stats: {
          requests: 425000,
          uptime: 99.95,
          avgLatency: 35,
          rating: 4.7,
          reviews: 89,
        },
        features: [
          'Employment impact analysis',
          'Economic multiplier calculations',
          'Training program ROI',
          'Environmental benefits scoring',
        ],
        endpoints: [
          {
            method: 'POST',
            path: '/calculate/community-benefits',
            description: 'Calculate community benefit score for a project',
            rateLimit: '500/hour',
            example: {
              request: `curl -X POST "https://api.indigenous-procurement.ca/v1/calculate/community-benefits" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectValue": 500000,
    "indigenousEmployees": 15,
    "trainingPositions": 5,
    "localProcurement": 0.4
  }'`,
              response: `{
  "score": 87,
  "breakdown": {
    "employment": 35,
    "training": 20,
    "economic": 22,
    "sustainability": 10
  },
  "communityImpact": {
    "jobsCreated": 15,
    "economicMultiplier": 2.3,
    "localRevenue": 185000
  }
}`
            }
          }
        ],
      },
    ])
  }

  const loadUserAPIs = () => {
    // Mock user's published APIs
    setUserAPIs([
      {
        id: 'user-api-1',
        name: 'Traditional Knowledge Protocol API',
        description: 'Secure access to traditional knowledge with proper protocols',
        category: 'data',
        provider: {
          name: 'Northern Solar Tech',
          verified: true,
          indigenousOwned: true,
        },
        pricing: {
          model: 'subscription',
          basePrice: 299,
          freeQuota: 0,
          unit: 'month',
        },
        stats: {
          requests: 45000,
          uptime: 99.9,
          avgLatency: 55,
          rating: 5.0,
          reviews: 12,
        },
        features: [
          'Elder-approved content',
          'Cultural protocol enforcement',
          'Seasonal access controls',
          'Attribution tracking',
        ],
        revenue: {
          total: 125000,
          thisMonth: 8500,
          growth: 15,
        },
        endpoints: [],
      },
    ])
  }

  const generateAPIKey = () => {
    // Generate a mock API key
    const key = 'ipk_' + Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join('')
    setApiKey(key)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'verification':
        return Shield
      case 'intelligence':
        return Cpu
      case 'analytics':
        return BarChart3
      case 'compliance':
        return CheckCircle
      case 'data':
        return Database
      default:
        return Code
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'verification':
        return 'text-green-400'
      case 'intelligence':
        return 'text-purple-400'
      case 'analytics':
        return 'text-blue-400'
      case 'compliance':
        return 'text-yellow-400'
      case 'data':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  const renderBrowseTab = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'verification', 'intelligence', 'analytics', 'compliance', 'data'].map((cat) => (
          <LiquidGlassButton
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 ${filter === cat ? 'border-2 border-blue-400/50' : ''}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </LiquidGlassButton>
        ))}
      </div>

      {/* API Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apiProducts
          .filter(api => filter === 'all' || api.category === filter)
          .map((api) => {
            const Icon = getCategoryIcon(api.category)
            return (
              <motion.div
                key={api.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LiquidGlassCard 
                  variant="frost"
                  className="cursor-pointer hover:border-blue-400/50 transition-colors"
                  onClick={() => setSelectedAPI(api)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-white/10 ${getCategoryColor(api.category)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {api.provider.indigenousOwned && (
                      <div className="px-3 py-1 bg-purple-500/20 rounded-full">
                        <span className="text-xs text-purple-300">Indigenous Owned</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{api.name}</h3>
                  <p className="text-sm text-white/70 mb-4">{api.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Requests</span>
                      <span className="text-white">{(api.stats.requests / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Uptime</span>
                      <span className="text-green-400">{api.stats.uptime}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Latency</span>
                      <span className="text-white">{api.stats.avgLatency}ms</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      {api.pricing.model === 'pay-per-use' ? (
                        <p className="text-white">
                          <span className="text-2xl font-bold">${api.pricing.basePrice}</span>
                          <span className="text-sm text-white/60">/{api.pricing.unit}</span>
                        </p>
                      ) : api.pricing.model === 'subscription' ? (
                        <p className="text-white">
                          <span className="text-2xl font-bold">${api.pricing.basePrice}</span>
                          <span className="text-sm text-white/60">/month</span>
                        </p>
                      ) : (
                        <p className="text-green-400 font-semibold">Free tier available</p>
                      )}
                      {api.pricing.freeQuota > 0 && (
                        <p className="text-xs text-white/60 mt-1">
                          {api.pricing.freeQuota} free {api.pricing.unit}s
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-white">{api.stats.rating}</span>
                      <span className="text-white/60 text-sm">({api.stats.reviews})</span>
                    </div>
                  </div>
                </LiquidGlassCard>
              </motion.div>
            )
          })}
      </div>
    </div>
  )

  const renderMyAPIsTab = () => (
    <div className="space-y-6">
      {/* Create New API */}
      <LiquidGlassCard variant="aurora">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Monetize Your Data & Services
            </h3>
            <p className="text-white/70">
              Transform your procurement insights into revenue streams
            </p>
          </div>
          <LiquidGlassButton>
            <Sparkles className="w-4 h-4 mr-2" />
            Create New API
          </LiquidGlassButton>
        </div>
      </LiquidGlassCard>

      {/* Published APIs */}
      {userAPIs.map((api) => (
        <LiquidGlassCard key={api.id} variant="clear">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">{api.name}</h3>
              <p className="text-white/70 mb-4">{api.description}</p>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-white/60">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${api.revenue?.total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">This Month</p>
                  <p className="text-xl font-semibold text-white">
                    ${api.revenue?.thisMonth.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Growth</p>
                  <p className="text-xl font-semibold text-white flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    {api.revenue?.growth}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Active Users</p>
                  <p className="text-xl font-semibold text-white">247</p>
                </div>
              </div>

              <div className="flex gap-2">
                <LiquidGlassButton className="text-sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </LiquidGlassButton>
                <LiquidGlassButton className="text-sm">
                  <Code className="w-4 h-4 mr-2" />
                  Edit Endpoints
                </LiquidGlassButton>
                <LiquidGlassButton className="text-sm">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Manage Pricing
                </LiquidGlassButton>
              </div>
            </div>
            
            <div className="ml-6">
              <div className={`p-2 rounded-full ${
                api.stats.uptime >= 99.9 ? 'bg-green-500/20' : 'bg-yellow-500/20'
              }`}>
                <Activity className={`w-5 h-5 ${
                  api.stats.uptime >= 99.9 ? 'text-green-400' : 'text-yellow-400'
                }`} />
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      ))}
    </div>
  )

  const renderSelectedAPI = () => {
    if (!selectedAPI) return null

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedAPI(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LiquidGlassCard variant="frost" className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedAPI.name}
                  </h2>
                  <p className="text-white/70">{selectedAPI.description}</p>
                </div>
                <button
                  onClick={() => setSelectedAPI(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedAPI.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-8 p-6 bg-white/5 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-white/60 mb-1">Model</p>
                    <p className="text-white capitalize">
                      {selectedAPI.pricing.model.replace('-', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-1">Price</p>
                    <p className="text-white">
                      ${selectedAPI.pricing.basePrice}/{selectedAPI.pricing.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-1">Free Tier</p>
                    <p className="text-white">
                      {selectedAPI.pricing.freeQuota} {selectedAPI.pricing.unit}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Endpoints */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Endpoints</h3>
                {selectedAPI.endpoints.map((endpoint, i) => (
                  <div key={i} className="mb-6 p-4 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded text-xs font-mono ${
                        endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                        endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-white/80">{endpoint.path}</code>
                      <span className="ml-auto text-xs text-white/60">
                        Rate limit: {endpoint.rateLimit}
                      </span>
                    </div>
                    <p className="text-white/70 mb-4">{endpoint.description}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-white/60 mb-2">Example Request</p>
                        <SyntaxHighlighter 
                          language="bash" 
                          style={atomDark}
                          className="text-xs"
                        >
                          {endpoint.example.request}
                        </SyntaxHighlighter>
                      </div>
                      <div>
                        <p className="text-sm text-white/60 mb-2">Example Response</p>
                        <SyntaxHighlighter 
                          language="json" 
                          style={atomDark}
                          className="text-xs"
                        >
                          {endpoint.example.response}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <LiquidGlassButton 
                  onClick={() => setShowKeyGenerator(true)}
                  className="flex-1"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Get API Key
                </LiquidGlassButton>
                <LiquidGlassButton className="flex-1">
                  <Globe className="w-4 h-4 mr-2" />
                  View Documentation
                </LiquidGlassButton>
              </div>
            </LiquidGlassCard>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <LiquidGlass variant="aurora" intensity="strong" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  API Marketplace
                </h1>
                <p className="text-sm text-white/60">
                  Monetize your data while maintaining sovereignty
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white/60">Platform Revenue Share</p>
                <p className="text-xl font-bold text-white">Only 5%</p>
              </div>
              <LiquidGlassButton onClick={() => setShowKeyGenerator(true)}>
                <Key className="w-4 h-4 mr-2" />
                API Keys
              </LiquidGlassButton>
            </div>
          </div>
        </LiquidGlass>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LiquidGlassCard variant="clear">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">127</p>
                <p className="text-sm text-white/60">Active APIs</p>
              </div>
              <Code className="w-8 h-8 text-blue-400" />
            </div>
          </LiquidGlassCard>
          
          <LiquidGlassCard variant="frost">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">$2.4M</p>
                <p className="text-sm text-white/60">Monthly Volume</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </LiquidGlassCard>
          
          <LiquidGlassCard variant="aurora">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">89%</p>
                <p className="text-sm text-white/60">Indigenous Owned</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </LiquidGlassCard>
          
          <LiquidGlassCard variant="clear">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">45ms</p>
                <p className="text-sm text-white/60">Avg Latency</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </LiquidGlassCard>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {[
            { id: 'browse', label: 'Browse APIs', icon: Globe },
            { id: 'my-apis', label: 'My APIs', icon: Code },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'docs', label: 'Documentation', icon: FileText },
          ].map((tab) => (
            <LiquidGlassButton
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeTab === tab.id ? 'border-2 border-blue-400/50' : ''
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </LiquidGlassButton>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {activeTab === 'browse' && renderBrowseTab()}
            {activeTab === 'my-apis' && renderMyAPIsTab()}
          </motion.div>
        </AnimatePresence>

        {/* Selected API Modal */}
        {renderSelectedAPI()}

        {/* API Key Generator */}
        {showKeyGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowKeyGenerator(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LiquidGlassCard variant="frost" className="p-8 max-w-2xl">
                <h3 className="text-xl font-semibold text-white mb-6">
                  API Key Management
                </h3>
                
                {!apiKey ? (
                  <div className="text-center py-8">
                    <Lock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <p className="text-white/70 mb-6">
                      Generate a new API key to access marketplace APIs
                    </p>
                    <LiquidGlassButton onClick={generateAPIKey}>
                      <Key className="w-4 h-4 mr-2" />
                      Generate New API Key
                    </LiquidGlassButton>
                  </div>
                ) : (
                  <div>
                    <div className="p-4 bg-black/30 rounded-lg mb-4">
                      <p className="text-sm text-white/60 mb-2">Your API Key</p>
                      <code className="text-green-400 font-mono break-all">
                        {apiKey}
                      </code>
                    </div>
                    <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg mb-6">
                      <p className="text-sm text-yellow-400">
                        ⚠️ Save this key securely. It won't be shown again.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <LiquidGlassButton 
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                        className="flex-1"
                      >
                        Copy to Clipboard
                      </LiquidGlassButton>
                      <LiquidGlassButton
                        onClick={() => setShowKeyGenerator(false)}
                        className="flex-1"
                      >
                        Done
                      </LiquidGlassButton>
                    </div>
                  </div>
                )}
              </LiquidGlassCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}