'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Terminal, Send, Copy, Check, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Plus, Trash2, Save,
  Clock, Zap, Code, FileJson, Eye, EyeOff
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { DirectoryAPIService } from '../services/DirectoryAPIService'

interface APITestingInterfaceProps {
  apiKey?: string
  baseUrl?: string
}

interface SavedRequest {
  id: string
  name: string
  endpoint: string
  method: string
  params: Record<string, any>
  headers: Record<string, string>
  body?: any
}

export function APITestingInterface({ 
  apiKey: defaultApiKey = '',
  baseUrl = 'https://api.indigenious.ca/v1' 
}: APITestingInterfaceProps) {
  const [apiService] = useState(() => new DirectoryAPIService())
  const [selectedEndpoint, setSelectedEndpoint] = useState('/businesses/search')
  const [method, setMethod] = useState('GET')
  const [apiKey, setApiKey] = useState(defaultApiKey)
  const [showApiKey, setShowApiKey] = useState(false)
  const [params, setParams] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [responseTime, setResponseTime] = useState(0)
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([])
  const [showSaved, setShowSaved] = useState(true)

  const endpoints = [
    { path: '/businesses/search', method: 'GET', description: 'Search businesses' },
    { path: '/businesses/:id', method: 'GET', description: 'Get business by ID' },
    { path: '/businesses/:id/certifications', method: 'GET', description: 'Get certifications' },
    { path: '/businesses/bulk', method: 'POST', description: 'Bulk fetch (Enterprise)' },
    { path: '/categories', method: 'GET', description: 'List categories' },
    { path: '/certifications/types', method: 'GET', description: 'List certification types' }
  ]

  const exampleQueries = {
    '/businesses/search': {
      query: 'construction',
      'location.province': 'ON',
      categories: 'Construction,Engineering',
      limit: '10'
    },
    '/businesses/:id': {
      id: 'biz-001'
    },
    '/businesses/bulk': {
      body: JSON.stringify({ ids: ['biz-001', 'biz-002', 'biz-003'] }, null, 2)
    }
  }

  const sendRequest = async () => {
    if (!apiKey) {
      setResponse({ error: 'API key is required' })
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      // Build the request URL
      let url = baseUrl + selectedEndpoint
      
      // Replace path parameters
      Object.entries(params).forEach(([key, value]) => {
        if (selectedEndpoint.includes(`:${key}`)) {
          url = url.replace(`:${key}`, value)
        }
      })

      // Add query parameters for GET requests
      if (method === 'GET') {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (!selectedEndpoint.includes(`:${key}`) && value) {
            queryParams.append(key, value)
          }
        })
        if (queryParams.toString()) {
          url += '?' + queryParams.toString()
        }
      }

      // Mock the API call using our service
      let result
      if (selectedEndpoint === '/businesses/search') {
        const searchParams = {
          query: params.query,
          categories: params.categories?.split(',').filter(Boolean),
          location: params['location.province'] ? { province: params['location.province'] } : undefined,
          limit: params.limit ? parseInt(params.limit) : undefined
        }
        result = await apiService.searchBusinesses(searchParams, apiKey)
      } else if (selectedEndpoint === '/businesses/:id') {
        result = await apiService.getBusinessById(params.id || 'biz-001', apiKey)
      } else {
        // Mock response for other endpoints
        result = {
          status: 200,
          data: { message: 'Mock response for ' + selectedEndpoint },
          metadata: {
            requestId: `req_${Date.now()}`,
            processingTime: Date.now() - startTime
          }
        }
      }

      setResponse(result)
      setResponseTime(Date.now() - startTime)
    } catch (error) {
      setResponse({
        error: error.message || 'Request failed',
        status: 500
      })
      setResponseTime(Date.now() - startTime)
    } finally {
      setIsLoading(false)
    }
  }

  const loadExample = () => {
    const example = exampleQueries[selectedEndpoint]
    if (example) {
      if (example.body) {
        setBody(example.body)
      } else {
        setParams(example)
      }
    }
  }

  const saveRequest = () => {
    const request: SavedRequest = {
      id: Date.now().toString(),
      name: `${method} ${selectedEndpoint}`,
      endpoint: selectedEndpoint,
      method,
      params,
      headers,
      body: body ? JSON.parse(body) : undefined
    }
    setSavedRequests([...savedRequests, request])
  }

  const loadSavedRequest = (request: SavedRequest) => {
    setSelectedEndpoint(request.endpoint)
    setMethod(request.method)
    setParams(request.params)
    setHeaders(request.headers)
    setBody(request.body ? JSON.stringify(request.body, null, 2) : '')
  }

  const deleteSavedRequest = (id: string) => {
    setSavedRequests(savedRequests.filter(r => r.id !== id))
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">API Testing Interface</h2>
              <p className="text-sm text-white/60">Test API endpoints with live responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60">Base URL:</span>
            <code className="text-sm text-blue-400">{baseUrl}</code>
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* API Key */}
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">API Key</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <GlassInput
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4 text-white/60" />
                  ) : (
                    <Eye className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* Endpoint Selection */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Endpoint</h3>
              <GlassButton size="sm" variant="secondary" onClick={loadExample}>
                <Code className="w-4 h-4 mr-2" />
                Load Example
              </GlassButton>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <select
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                  className="md:col-span-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                >
                  {endpoints.map(endpoint => (
                    <option key={endpoint.path} value={endpoint.path}>
                      {endpoint.path} - {endpoint.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parameters */}
              <div>
                <h4 className="text-white font-medium mb-2">Parameters</h4>
                <div className="space-y-2">
                  {selectedEndpoint.includes(':id') && (
                    <GlassInput
                      placeholder="Business ID"
                      value={params.id || ''}
                      onChange={(e) => setParams({ ...params, id: e.target.value })}
                    />
                  )}
                  
                  {selectedEndpoint === '/businesses/search' && (
                    <>
                      <GlassInput
                        placeholder="Search query"
                        value={params.query || ''}
                        onChange={(e) => setParams({ ...params, query: e.target.value })}
                      />
                      <GlassInput
                        placeholder="Categories (comma-separated)"
                        value={params.categories || ''}
                        onChange={(e) => setParams({ ...params, categories: e.target.value })}
                      />
                      <GlassInput
                        placeholder="Province (e.g., ON)"
                        value={params['location.province'] || ''}
                        onChange={(e) => setParams({ ...params, 'location.province': e.target.value })}
                      />
                      <GlassInput
                        placeholder="Limit (default: 20)"
                        type="number"
                        value={params.limit || ''}
                        onChange={(e) => setParams({ ...params, limit: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Request Body */}
              {method !== 'GET' && (
                <div>
                  <h4 className="text-white font-medium mb-2">Request Body</h4>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter JSON body"
                    className="w-full h-32 px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-400/50"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <GlassButton 
                onClick={sendRequest} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </GlassButton>
              <GlassButton variant="secondary" onClick={saveRequest}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </GlassButton>
            </div>
          </GlassPanel>

          {/* Response */}
          {response && (
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Response</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {responseTime}ms
                  </span>
                  <button
                    onClick={copyResponse}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-96">
                <pre className="p-4 bg-black/50 rounded-lg text-sm">
                  <code className={response.error ? 'text-red-400' : 'text-green-400'}>
                    {JSON.stringify(response, null, 2)}
                  </code>
                </pre>
              </div>

              {response.metadata?.rateLimit && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/50 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Rate Limit: {response.metadata.rateLimit.remaining}/{response.metadata.rateLimit.limit} remaining
                  </p>
                </div>
              )}
            </GlassPanel>
          )}
        </div>

        {/* Saved Requests */}
        <div className="lg:col-span-1">
          <GlassPanel className="p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Saved Requests
              </h3>
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {showSaved ? (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>

            {showSaved && (
              <div className="space-y-2">
                {savedRequests.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-4">
                    No saved requests yet
                  </p>
                ) : (
                  savedRequests.map(request => (
                    <div
                      key={request.id}
                      className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => loadSavedRequest(request)}
                          className="flex-1 text-left"
                        >
                          <p className="text-white text-sm font-medium">
                            {request.name}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {request.method} {request.endpoint}
                          </p>
                        </button>
                        <button
                          onClick={() => deleteSavedRequest(request.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}