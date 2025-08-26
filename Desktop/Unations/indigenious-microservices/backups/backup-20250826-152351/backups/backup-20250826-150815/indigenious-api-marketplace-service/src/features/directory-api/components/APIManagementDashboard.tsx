'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Key, Shield, Activity, DollarSign, Globe,
  Code, Users, BarChart3, Settings, Plus,
  Copy, Eye, EyeOff, RefreshCw, Download,
  Check, AlertTriangle, TrendingUp, Clock,
  Zap, ChevronRight, Terminal, Book, Package
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { DirectoryAPIService } from '../services/DirectoryAPIService'
import { 
  APIClient, APIAnalytics, SubscriptionPlan,
  BusinessSearchParams, UsageStats
} from '../types'

interface APIManagementDashboardProps {
  clientId?: string
  isAdmin?: boolean
}

export function APIManagementDashboard({ 
  clientId = 'demo-client',
  isAdmin = false 
}: APIManagementDashboardProps) {
  const [apiService] = useState(() => new DirectoryAPIService())
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'usage' | 'docs' | 'billing'>('overview')
  const [apiClient, setApiClient] = useState<APIClient | null>(null)
  const [analytics, setAnalytics] = useState<APIAnalytics | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [testResponse, setTestResponse] = useState<unknown>(null)

  useEffect(() => {
    loadData()
  }, [clientId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Mock API client data
      const mockClient: APIClient = {
        id: clientId,
        organizationName: 'Government of Canada',
        contactName: 'John Smith',
        email: 'john.smith@gc.ca',
        apiKey: 'pk_test_1234567890abcdef',
        secretKey: 'sk_test_abcdef1234567890',
        status: 'active',
        tier: 'professional',
        createdDate: new Date('2024-01-01'),
        billing: {
          plan: 'monthly',
          amount: 499,
          currency: 'CAD',
          nextBillingDate: new Date('2024-03-01'),
          invoices: []
        },
        usage: {
          currentPeriod: {
            requests: 45678,
            uniqueBusinessesAccessed: 1234,
            dataDownloaded: 256,
            lastRequest: new Date()
          },
          limits: {
            requestsPerMonth: 100000,
            requestsPerMinute: 300,
            resultsPerRequest: 200,
            dataDownloadLimit: 10240
          },
          historical: []
        },
        permissions: {
          endpoints: [],
          dataFields: [],
          exportFormats: ['json', 'csv'],
          features: []
        }
      }

      setApiClient(mockClient)
      
      const [analyticsData, plansData] = await Promise.all([
        apiService.getAnalytics(clientId),
        apiService.getSubscriptionPlans()
      ])
      
      setAnalytics(analyticsData)
      setPlans(plansData)
    } catch (error) {
      logger.error('Error loading API data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    
    // Show notification
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-400/50 text-green-400 px-4 py-2 rounded-lg z-50'
    notification.textContent = `${type} copied to clipboard`
    document.body.appendChild(notification)
    
    setTimeout(() => notification.remove(), 2000)
  }

  const testAPICall = async () => {
    if (!apiClient) return
    
    try {
      const response = await apiService.searchBusinesses(
        { 
          categories: ['IT Services'],
          limit: 5 
        },
        apiClient.apiKey
      )
      setTestResponse(response)
    } catch (error) {
      logger.error('API test failed:', error)
    }
  }

  const renderOverviewTab = () => {
    if (!apiClient || !analytics) return null

    const usagePercentage = (apiClient.usage.currentPeriod.requests / apiClient.usage.limits.requestsPerMonth) * 100

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-green-400" />
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                Active
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {apiClient.usage.currentPeriod.requests.toLocaleString()}
            </p>
            <p className="text-sm text-white/60">API Calls This Month</p>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-blue-400" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-2xl font-bold text-white">
              {analytics.overview.avgResponseTime}ms
            </p>
            <p className="text-sm text-white/60">Avg Response Time</p>
            <p className="text-xs text-green-400 mt-1">↓ 12% from last month</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-xs text-white/60">Unique</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {apiClient.usage.currentPeriod.uniqueBusinessesAccessed.toLocaleString()}
            </p>
            <p className="text-sm text-white/60">Businesses Accessed</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-yellow-400" />
              <span className="text-xs text-white/60">SLA</span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics.overview.uptime}%</p>
            <p className="text-sm text-white/60">Uptime</p>
            <p className="text-xs text-white/40 mt-1">Last 30 days</p>
          </GlassPanel>
        </div>

        {/* Usage Chart */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Usage (Last 24 Hours)</h3>
          <div className="h-64 relative">
            {/* Simple bar chart visualization */}
            <div className="absolute inset-0 flex items-end justify-between gap-1">
              {analytics.timeSeriesData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col justify-end">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                    style={{ 
                      height: `${(data.requests / Math.max(...analytics.timeSeriesData.map(d => d.requests))) * 100}%` 
                    }}
                  />
                  {index % 4 === 0 && (
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(data.timestamp).getHours()}:00
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* Quick Test */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Quick API Test</h3>
            <GlassButton size="sm" onClick={testAPICall}>
              <Terminal className="w-4 h-4 mr-2" />
              Test API
            </GlassButton>
          </div>
          
          {testResponse && (
            <div className="mt-4 p-4 bg-black/50 rounded-lg overflow-auto max-h-64">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </GlassPanel>
      </div>
    )
  }

  const renderKeysTab = () => {
    if (!apiClient) return null

    return (
      <div className="space-y-6">
        {/* API Key */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">API Key</h3>
              <p className="text-sm text-white/60">Use this key in your API requests</p>
            </div>
            <button
              onClick={() => apiClient && copyToClipboard(apiClient.apiKey, 'API key')}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <Copy className="w-4 h-4 text-white/60" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-black/50 rounded-lg text-sm font-mono text-white/80">
              {showApiKey ? apiClient.apiKey : 'pk_test_••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              {showApiKey ? <EyeOff className="w-4 h-4 text-white/60" /> : <Eye className="w-4 h-4 text-white/60" />}
            </button>
          </div>
        </GlassPanel>

        {/* Secret Key */}
        <GlassPanel className="p-6 border-yellow-400/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Secret Key
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </h3>
              <p className="text-sm text-white/60">Keep this secret! Only use server-side</p>
            </div>
            <button
              onClick={() => apiClient && copyToClipboard(apiClient.secretKey, 'Secret key')}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <Copy className="w-4 h-4 text-white/60" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-black/50 rounded-lg text-sm font-mono text-white/80">
              {showSecretKey ? apiClient.secretKey : 'sk_test_••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              {showSecretKey ? <EyeOff className="w-4 h-4 text-white/60" /> : <Eye className="w-4 h-4 text-white/60" />}
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              ⚠️ Never expose your secret key in client-side code or public repositories
            </p>
          </div>
        </GlassPanel>

        {/* Regenerate Keys */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Regenerate Keys</h3>
          <p className="text-sm text-white/60 mb-4">
            If you believe your keys have been compromised, regenerate them here. This will invalidate your current keys.
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate API Key
            </GlassButton>
            <GlassButton variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Secret Key
            </GlassButton>
          </div>
        </GlassPanel>
      </div>
    )
  }

  const renderUsageTab = () => {
    if (!apiClient) return null

    return (
      <div className="space-y-6">
        {/* Current Period Usage */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Billing Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-white/60 mb-2">API Requests</p>
              <p className="text-2xl font-bold text-white">
                {apiClient.usage.currentPeriod.requests.toLocaleString()}
              </p>
              <p className="text-xs text-white/40">
                of {apiClient.usage.limits.requestsPerMonth.toLocaleString()} limit
              </p>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ 
                    width: `${(apiClient.usage.currentPeriod.requests / apiClient.usage.limits.requestsPerMonth) * 100}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-white/60 mb-2">Unique Businesses</p>
              <p className="text-2xl font-bold text-white">
                {apiClient.usage.currentPeriod.uniqueBusinessesAccessed.toLocaleString()}
              </p>
              <p className="text-xs text-white/40">Accessed this month</p>
            </div>

            <div>
              <p className="text-sm text-white/60 mb-2">Data Downloaded</p>
              <p className="text-2xl font-bold text-white">
                {(apiClient.usage.currentPeriod.dataDownloaded / 1024).toFixed(1)} GB
              </p>
              <p className="text-xs text-white/40">
                of {(apiClient.usage.limits.dataDownloadLimit / 1024).toFixed(0)} GB limit
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* Rate Limits */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Rate Limits</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white">Requests per minute</p>
                <p className="text-sm text-white/60">Current tier limit</p>
              </div>
              <p className="text-xl font-bold text-white">{apiClient.usage.limits.requestsPerMinute}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white">Results per request</p>
                <p className="text-sm text-white/60">Maximum records returned</p>
              </div>
              <p className="text-xl font-bold text-white">{apiClient.usage.limits.resultsPerRequest}</p>
            </div>
          </div>
        </GlassPanel>

        {/* Top Endpoints */}
        {analytics && (
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Endpoints</h3>
            <div className="space-y-3">
              {analytics.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-mono text-sm">{endpoint.endpoint}</p>
                    <p className="text-xs text-white/60">
                      {endpoint.avgResponseTime}ms avg • {(endpoint.errorRate * 100).toFixed(2)}% errors
                    </p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {endpoint.requests.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    )
  }

  const renderDocsTab = () => (
    <div className="space-y-6">
      {/* Quick Start */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">1. Install SDK</h4>
            <div className="p-3 bg-black/50 rounded-lg">
              <code className="text-sm text-green-400 font-mono">
                npm install @indigenious/api-sdk
              </code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">2. Initialize Client</h4>
            <div className="p-3 bg-black/50 rounded-lg overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">{`import { IndigenousAPI } from '@indigenious/api-sdk'

const api = new IndigenousAPI({
  apiKey: '${apiClient?.apiKey || 'your-api-key'}'
})`}</pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">3. Search Businesses</h4>
            <div className="p-3 bg-black/50 rounded-lg overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">{`const results = await api.businesses.search({
  categories: ['Construction', 'IT Services'],
  location: { province: 'ON' },
  indigenousOwnership: { min: 51 }
})`}</pre>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* API Endpoints */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available Endpoints</h3>
        
        <div className="space-y-3">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">GET</span>
              <code className="text-white font-mono">/api/v1/businesses/search</code>
            </div>
            <p className="text-sm text-white/60">Search for Indigenous businesses with filters</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">GET</span>
              <code className="text-white font-mono">/api/v1/businesses/:id</code>
            </div>
            <p className="text-sm text-white/60">Get detailed information about a specific business</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">POST</span>
              <code className="text-white font-mono">/api/v1/businesses/bulk</code>
            </div>
            <p className="text-sm text-white/60">Bulk fetch multiple businesses (Enterprise only)</p>
          </div>
        </div>
      </GlassPanel>

      {/* SDKs */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available SDKs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['JavaScript', 'Python', 'PHP', 'Java', 'C#', 'Go'].map(lang => (
            <button
              key={lang}
              className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-white font-medium">{lang}</p>
              <p className="text-xs text-white/60">SDK & Examples</p>
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  )

  const renderBillingTab = () => {
    if (!apiClient) return null

    return (
      <div className="space-y-6">
        {/* Current Plan */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Plan</h3>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-2xl font-bold text-white capitalize">{apiClient.tier} Plan</p>
              <p className="text-white/60">${apiClient.billing.amount}/month</p>
            </div>
            <GlassButton>
              Upgrade Plan
            </GlassButton>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/60">Monthly Requests</p>
              <p className="text-white font-medium">
                {apiClient.usage.limits.requestsPerMonth.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/60">Rate Limit</p>
              <p className="text-white font-medium">
                {apiClient.usage.limits.requestsPerMinute}/min
              </p>
            </div>
            <div>
              <p className="text-white/60">Export Formats</p>
              <p className="text-white font-medium">
                {apiClient.permissions.exportFormats.join(', ').toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-white/60">Next Billing</p>
              <p className="text-white font-medium">
                {apiClient.billing.nextBillingDate?.toLocaleDateString()}
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <GlassPanel 
              key={plan.id}
              className={`p-6 ${plan.popular ? 'border-blue-400/50' : ''}`}
            >
              {plan.popular && (
                <div className="text-center mb-4">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
              <p className="text-3xl font-bold text-white mb-1">
                ${plan.price.monthly}
                <span className="text-lg text-white/60">/mo</span>
              </p>
              <p className="text-sm text-white/60 mb-6">
                or ${plan.price.annual}/year (save ${plan.price.monthly * 12 - plan.price.annual})
              </p>

              <ul className="space-y-3 mb-6">
                {plan.features.slice(0, 5).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5" />
                    <span className="text-white/80">
                      {feature.description}
                      {feature.limit && ` (${feature.limit.toLocaleString()})`}
                    </span>
                  </li>
                ))}
              </ul>

              <GlassButton 
                variant={apiClient.tier === plan.tier ? 'secondary' : 'primary'}
                className="w-full"
                disabled={apiClient.tier === plan.tier}
              >
                {apiClient.tier === plan.tier ? 'Current Plan' : 'Select Plan'}
              </GlassButton>
            </GlassPanel>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-4"
        >
          <Key className="w-16 h-16 text-blue-400" />
        </motion.div>
        <p className="text-white/60">Loading API dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                API Management
              </h2>
              <p className="text-sm text-white/60">
                Indigenous Business Directory API
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white/60">Organization</p>
              <p className="text-white font-medium">{apiClient?.organizationName}</p>
            </div>
            <GlassButton variant="secondary" size="sm">
              <Book className="w-4 h-4 mr-2" />
              Full Docs
            </GlassButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {(['overview', 'keys', 'usage', 'docs', 'billing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab === 'keys' && <Key className="w-4 h-4 inline mr-2" />}
              {tab === 'usage' && <BarChart3 className="w-4 h-4 inline mr-2" />}
              {tab === 'docs' && <Code className="w-4 h-4 inline mr-2" />}
              {tab === 'billing' && <DollarSign className="w-4 h-4 inline mr-2" />}
              {tab}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'keys' && renderKeysTab()}
          {activeTab === 'usage' && renderUsageTab()}
          {activeTab === 'docs' && renderDocsTab()}
          {activeTab === 'billing' && renderBillingTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}