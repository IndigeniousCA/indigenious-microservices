'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Book, Code, Shield, Zap, Terminal, Download,
  ChevronRight, Copy, Check, ExternalLink, Globe,
  Key, Clock, BarChart3, Package, AlertCircle
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

interface APIDocumentationProps {
  isPublic?: boolean
}

export function APIDocumentation({ isPublic = true }: APIDocumentationProps) {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const sections = [
    { id: 'getting-started', name: 'Getting Started', icon: Zap },
    { id: 'authentication', name: 'Authentication', icon: Shield },
    { id: 'endpoints', name: 'API Endpoints', icon: Globe },
    { id: 'search', name: 'Business Search', icon: BarChart3 },
    { id: 'rate-limits', name: 'Rate Limits', icon: Clock },
    { id: 'sdks', name: 'SDKs & Libraries', icon: Package },
    { id: 'webhooks', name: 'Webhooks', icon: Terminal },
    { id: 'errors', name: 'Error Handling', icon: AlertCircle }
  ]

  const renderGettingStarted = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to the Indigenous Business Directory API</h2>
        <p className="text-white/80 mb-6">
          Access verified Indigenous business data to meet procurement targets and build meaningful partnerships.
          Our API provides comprehensive business information, certifications, and capabilities.
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-white/60 mb-2">1. Sign up for an API account</p>
            {isPublic && (
              <GlassButton className="w-full sm:w-auto">
                <Key className="w-4 h-4 mr-2" />
                Get API Access
              </GlassButton>
            )}
          </div>

          <div>
            <p className="text-white/60 mb-2">2. Install the SDK</p>
            <div className="relative">
              <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
                <code className="text-green-400 text-sm">npm install @indigenious/api-sdk</code>
              </pre>
              <button
                onClick={() => copyCode('npm install @indigenious/api-sdk', 'npm-install')}
                className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
              >
                {copiedCode === 'npm-install' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-white/60 mb-2">3. Make your first request</p>
            <div className="relative">
              <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
                <code className="text-green-400 text-sm">{`import { IndigenousAPI } from '@indigenious/api-sdk'

const api = new IndigenousAPI({
  apiKey: 'your-api-key'
})

const businesses = await api.businesses.search({
  categories: ['Construction'],
  location: { province: 'ON' }
})`}</code>
              </pre>
              <button
                onClick={() => copyCode(`import { IndigenousAPI } from '@indigenious/api-sdk'

const api = new IndigenousAPI({
  apiKey: 'your-api-key'
})

const businesses = await api.businesses.search({
  categories: ['Construction'],
  location: { province: 'ON' }
})`, 'quick-start')}
                className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
              >
                {copiedCode === 'quick-start' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel className="p-6">
          <Zap className="w-8 h-8 text-yellow-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Fast & Reliable</h4>
          <p className="text-white/60 text-sm">
            99.9% uptime SLA with sub-200ms response times
          </p>
        </GlassPanel>

        <GlassPanel className="p-6">
          <Shield className="w-8 h-8 text-blue-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Secure & Compliant</h4>
          <p className="text-white/60 text-sm">
            SOC 2 certified with end-to-end encryption
          </p>
        </GlassPanel>

        <GlassPanel className="p-6">
          <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="text-white font-semibold mb-2">Rich Data</h4>
          <p className="text-white/60 text-sm">
            Verified business data with certifications
          </p>
        </GlassPanel>
      </div>
    </div>
  )

  const renderAuthentication = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
        <p className="text-white/80">
          All API requests must include your API key in the Authorization header.
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">API Key Authentication</h3>
        
        <div className="space-y-4">
          <p className="text-white/80">Include your API key in the request header:</p>
          
          <div className="relative">
            <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
              <code className="text-green-400 text-sm">{`Authorization: Bearer YOUR_API_KEY`}</code>
            </pre>
            <button
              onClick={() => copyCode('Authorization: Bearer YOUR_API_KEY', 'auth-header')}
              className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
            >
              {copiedCode === 'auth-header' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-white/60" />
              )}
            </button>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-400/50 rounded-lg">
            <p className="text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Keep your API keys secure and never expose them in client-side code
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">OAuth 2.0 (Enterprise)</h3>
        <p className="text-white/80 mb-4">
          Enterprise clients can use OAuth 2.0 for enhanced security and user-specific access.
        </p>
        
        <div className="relative">
          <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
            <code className="text-green-400 text-sm">{`// OAuth 2.0 Flow
const auth = new IndigenousAuth({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://your-app.com/callback'
})

const token = await auth.getAccessToken()
api.setAuthToken(token)`}</code>
          </pre>
        </div>
      </GlassPanel>
    </div>
  )

  const renderEndpoints = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">API Endpoints</h2>
        <p className="text-white/80">
          Base URL: <code className="text-blue-400">https://api.indigenious.ca/v1</code>
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            method: 'GET',
            path: '/businesses/search',
            description: 'Search for Indigenous businesses',
            params: ['query', 'categories', 'location', 'certifications']
          },
          {
            method: 'GET',
            path: '/businesses/:id',
            description: 'Get detailed business information',
            params: ['id']
          },
          {
            method: 'GET',
            path: '/businesses/:id/certifications',
            description: 'Get business certifications',
            params: ['id']
          },
          {
            method: 'POST',
            path: '/businesses/bulk',
            description: 'Bulk fetch multiple businesses (Enterprise)',
            params: ['ids[]']
          },
          {
            method: 'GET',
            path: '/categories',
            description: 'List all business categories',
            params: []
          },
          {
            method: 'GET',
            path: '/certifications/types',
            description: 'List certification types',
            params: []
          }
        ].map((endpoint, index) => (
          <GlassPanel key={index} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                    endpoint.method === 'GET' 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-white font-mono">{endpoint.path}</code>
                </div>
                <p className="text-white/60 text-sm mb-2">{endpoint.description}</p>
                {endpoint.params.length > 0 && (
                  <p className="text-xs text-white/40">
                    Parameters: {endpoint.params.join(', ')}
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  )

  const renderSearch = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Business Search</h2>
        <p className="text-white/80">
          Search for Indigenous businesses using powerful filters and parameters.
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Search Parameters</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Basic Search</h4>
            <div className="relative">
              <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
                <code className="text-green-400 text-sm">{`GET /businesses/search?query=construction&location.province=ON&limit=20`}</code>
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Advanced Filters</h4>
            <div className="relative">
              <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
                <code className="text-green-400 text-sm">{`const results = await api.businesses.search({
  query: 'technology',
  categories: ['IT Services', 'Software Development'],
  location: {
    province: 'ON',
    city: 'Toronto',
    radius: 50 // km
  },
  indigenousOwnership: {
    min: 51 // minimum percentage
  },
  certifications: ['CCAB Certified'],
  size: 'medium',
  capabilities: ['Cloud Solutions', 'Cybersecurity'],
  verified: true,
  sort: 'relevance',
  limit: 50
})`}</code>
              </pre>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Response Format</h3>
        
        <div className="relative">
          <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto max-h-96">
            <code className="text-green-400 text-sm">{`{
  "status": 200,
  "data": {
    "businesses": [
      {
        "id": "biz-001",
        "businessName": "Northern Tech Solutions",
        "description": "Indigenous-owned IT services",
        "address": {
          "city": "Thunder Bay",
          "province": "ON"
        },
        "indigenousInfo": {
          "ownershipPercentage": 100,
          "nation": "Ojibway",
          "certifications": [
            {
              "type": "CCAB Certified",
              "status": "active"
            }
          ]
        },
        "businessInfo": {
          "employeeCount": 45,
          "categories": ["IT Services"],
          "capabilities": ["Cloud Solutions"]
        }
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 20
  },
  "metadata": {
    "requestId": "req_1234567890",
    "processingTime": 125,
    "rateLimit": {
      "remaining": 299,
      "reset": "2024-02-01T12:00:00Z"
    }
  }
}`}</code>
          </pre>
        </div>
      </GlassPanel>
    </div>
  )

  const renderRateLimits = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>
        <p className="text-white/80">
          API rate limits vary by subscription tier. All rate limit info is included in response headers.
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Rate Limit Tiers</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Tier</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Requests/Month</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Requests/Minute</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Burst Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4 text-white">Basic</td>
                <td className="py-3 px-4 text-white/80">10,000</td>
                <td className="py-3 px-4 text-white/80">60</td>
                <td className="py-3 px-4 text-white/80">100</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4 text-white">Professional</td>
                <td className="py-3 px-4 text-white/80">100,000</td>
                <td className="py-3 px-4 text-white/80">300</td>
                <td className="py-3 px-4 text-white/80">500</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-white">Enterprise</td>
                <td className="py-3 px-4 text-white/80">Unlimited</td>
                <td className="py-3 px-4 text-white/80">Custom</td>
                <td className="py-3 px-4 text-white/80">Custom</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Rate Limit Headers</h3>
        
        <div className="relative">
          <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
            <code className="text-green-400 text-sm">{`X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1612137600
X-RateLimit-Retry-After: 60`}</code>
          </pre>
        </div>
      </GlassPanel>
    </div>
  )

  const renderSDKs = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">SDKs & Libraries</h2>
        <p className="text-white/80">
          Official SDKs for popular programming languages to get you started quickly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'JavaScript/TypeScript', icon: '📦', install: 'npm install @indigenious/api-sdk' },
          { name: 'Python', icon: '🐍', install: 'pip install indigenious-api' },
          { name: 'PHP', icon: '🐘', install: 'composer require indigenious/api-sdk' },
          { name: 'Java', icon: '☕', install: 'implementation \'ca.indigenious:api-sdk:1.0.0\'' },
          { name: 'C#/.NET', icon: '🔷', install: 'dotnet add package Indigenious.ApiSdk' },
          { name: 'Go', icon: '🐹', install: 'go get github.com/indigenious/api-sdk-go' }
        ].map((sdk, index) => (
          <GlassPanel key={index} className="p-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{sdk.icon}</span>
              <h4 className="text-white font-semibold">{sdk.name}</h4>
            </div>
            
            <div className="relative">
              <pre className="p-3 bg-black/50 rounded text-xs overflow-x-auto">
                <code className="text-green-400">{sdk.install}</code>
              </pre>
              <button
                onClick={() => copyCode(sdk.install, `sdk-${index}`)}
                className="absolute top-1 right-1 p-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
              >
                {copiedCode === `sdk-${index}` ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/60" />
                )}
              </button>
            </div>
            
            <div className="mt-3 flex gap-2">
              <button className="text-xs text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Docs
              </button>
              <button className="text-xs text-blue-400 hover:text-blue-300">
                <Code className="w-3 h-3 inline mr-1" />
                Examples
              </button>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  )

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Webhooks</h2>
        <p className="text-white/80">
          Receive real-time notifications when business data changes (Professional & Enterprise only).
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available Events</h3>
        
        <div className="space-y-3">
          {[
            { event: 'business.created', description: 'New business added to directory' },
            { event: 'business.updated', description: 'Business information updated' },
            { event: 'business.verified', description: 'Business verification status changed' },
            { event: 'certification.added', description: 'New certification added' },
            { event: 'certification.expired', description: 'Certification expired' }
          ].map((webhook, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <code className="text-white font-mono text-sm">{webhook.event}</code>
                <p className="text-white/60 text-xs mt-1">{webhook.description}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Webhook Payload</h3>
        
        <div className="relative">
          <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
            <code className="text-green-400 text-sm">{`{
  "event": "business.updated",
  "timestamp": "2024-02-01T12:00:00Z",
  "data": {
    "businessId": "biz-001",
    "changes": ["address", "capabilities"],
    "business": { ... }
  },
  "signature": "sha256=..."
}`}</code>
          </pre>
        </div>
      </GlassPanel>
    </div>
  )

  const renderErrors = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Error Handling</h2>
        <p className="text-white/80">
          The API uses standard HTTP status codes and returns detailed error information.
        </p>
      </div>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Error Response Format</h3>
        
        <div className="relative">
          <pre className="p-4 bg-black/50 rounded-lg overflow-x-auto">
            <code className="text-green-400 text-sm">{`{
  "status": 429,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 300,
      "reset": "2024-02-01T12:00:00Z"
    },
    "documentation": "https://docs.indigenious.ca/api/errors/RATE_LIMIT_EXCEEDED"
  }
}`}</code>
          </pre>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Common Error Codes</h3>
        
        <div className="space-y-3">
          {[
            { code: '400', name: 'Bad Request', description: 'Invalid request parameters' },
            { code: '401', name: 'Unauthorized', description: 'Missing or invalid API key' },
            { code: '403', name: 'Forbidden', description: 'Access denied to resource' },
            { code: '404', name: 'Not Found', description: 'Resource not found' },
            { code: '429', name: 'Too Many Requests', description: 'Rate limit exceeded' },
            { code: '500', name: 'Internal Error', description: 'Server error occurred' }
          ].map((error, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-mono">
                  {error.code}
                </span>
                <div>
                  <p className="text-white font-medium">{error.name}</p>
                  <p className="text-white/60 text-xs">{error.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return renderGettingStarted()
      case 'authentication':
        return renderAuthentication()
      case 'endpoints':
        return renderEndpoints()
      case 'search':
        return renderSearch()
      case 'rate-limits':
        return renderRateLimits()
      case 'sdks':
        return renderSDKs()
      case 'webhooks':
        return renderWebhooks()
      case 'errors':
        return renderErrors()
      default:
        return renderGettingStarted()
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <GlassPanel className="p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Book className="w-5 h-5" />
              Documentation
            </h2>
            
            <nav className="space-y-1">
              {sections.map(section => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      activeSection === section.id
                        ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.name}
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 pt-6 border-t border-white/10">
              <GlassButton variant="secondary" className="w-full" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </GlassButton>
            </div>
          </GlassPanel>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  )
}