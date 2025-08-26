'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Webhook, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle,
  XCircle, Clock, Activity, Shield, Copy, Eye, EyeOff,
  TestTube, Save, Edit2, Globe, Zap
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { Webhook as WebhookType } from '../types'

interface WebhookConfigurationProps {
  clientId: string
  tier: 'basic' | 'professional' | 'enterprise'
}

interface WebhookEvent {
  id: string
  name: string
  description: string
  category: string
}

interface WebhookDelivery {
  id: string
  timestamp: Date
  event: string
  status: 'success' | 'failed' | 'pending'
  statusCode?: number
  responseTime?: number
  retryCount: number
}

export function WebhookConfiguration({ clientId, tier }: WebhookConfigurationProps) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [showSecret, setShowSecret] = useState<string | null>(null)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])

  // New webhook form state
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[],
    description: ''
  })

  const availableEvents: WebhookEvent[] = [
    // Business Events
    { id: 'business.created', name: 'Business Created', description: 'New business added', category: 'Business' },
    { id: 'business.updated', name: 'Business Updated', description: 'Business info changed', category: 'Business' },
    { id: 'business.deleted', name: 'Business Deleted', description: 'Business removed', category: 'Business' },
    { id: 'business.verified', name: 'Business Verified', description: 'Verification status changed', category: 'Business' },
    
    // Certification Events
    { id: 'certification.added', name: 'Certification Added', description: 'New certification', category: 'Certification' },
    { id: 'certification.updated', name: 'Certification Updated', description: 'Certification modified', category: 'Certification' },
    { id: 'certification.expired', name: 'Certification Expired', description: 'Certification expired', category: 'Certification' },
    { id: 'certification.renewed', name: 'Certification Renewed', description: 'Certification renewed', category: 'Certification' },
    
    // API Events
    { id: 'api.limit.warning', name: 'API Limit Warning', description: '80% of limit reached', category: 'API' },
    { id: 'api.limit.exceeded', name: 'API Limit Exceeded', description: 'Rate limit hit', category: 'API' }
  ]

  const mockDeliveries: WebhookDelivery[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      event: 'business.updated',
      status: 'success',
      statusCode: 200,
      responseTime: 125,
      retryCount: 0
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      event: 'certification.added',
      status: 'failed',
      statusCode: 500,
      responseTime: 2000,
      retryCount: 3
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 10800000),
      event: 'business.created',
      status: 'success',
      statusCode: 200,
      responseTime: 98,
      retryCount: 0
    }
  ]

  const createWebhook = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) return

    const webhook: WebhookType = {
      id: `webhook-${Date.now()}`,
      url: newWebhook.url,
      events: newWebhook.events,
      secret: generateSecret(),
      active: true,
      lastPing: new Date(),
      failureCount: 0
    }

    setWebhooks([...webhooks, webhook])
    setNewWebhook({ url: '', events: [], description: '' })
    setIsCreating(false)
  }

  const updateWebhook = async (webhook: WebhookType) => {
    setWebhooks(webhooks.map(w => w.id === webhook.id ? webhook : w))
    setEditingWebhook(null)
  }

  const deleteWebhook = async (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id))
    if (selectedWebhook?.id === id) {
      setSelectedWebhook(null)
    }
  }

  const toggleWebhookStatus = async (id: string) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ))
  }

  const testWebhook = async (webhook: WebhookType) => {
    // Simulate webhook test
    const delivery: WebhookDelivery = {
      id: `delivery-${Date.now()}`,
      timestamp: new Date(),
      event: 'test.ping',
      status: 'pending',
      retryCount: 0
    }

    setDeliveries([delivery, ...deliveries])

    // Simulate response after delay
    setTimeout(() => {
      setDeliveries(prev => prev.map(d => 
        d.id === delivery.id 
          ? { ...d, status: 'success', statusCode: 200, responseTime: 150 }
          : d
      ))
    }, 1500)
  }

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let secret = 'whsec_'
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getEventsByCategory = () => {
    const grouped: Record<string, WebhookEvent[]> = {}
    availableEvents.forEach(event => {
      if (!grouped[event.category]) {
        grouped[event.category] = []
      }
      grouped[event.category].push(event)
    })
    return grouped
  }

  if (tier === 'basic') {
    return (
      <GlassPanel className="p-12 text-center">
        <Webhook className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Webhooks Not Available</h3>
        <p className="text-white/60 mb-6">
          Webhooks are available on Professional and Enterprise plans
        </p>
        <GlassButton>
          Upgrade Plan
        </GlassButton>
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Webhook Configuration</h2>
          <p className="text-white/60">Receive real-time notifications for API events</p>
        </div>
        <GlassButton onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </GlassButton>
      </div>

      {/* Webhook List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Configured Webhooks</h3>
          
          {webhooks.length === 0 ? (
            <GlassPanel className="p-8 text-center">
              <Globe className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No webhooks configured yet</p>
              <p className="text-white/40 text-sm mt-1">
                Add a webhook to receive real-time notifications
              </p>
            </GlassPanel>
          ) : (
            webhooks.map(webhook => (
              <GlassPanel 
                key={webhook.id} 
                className={`p-4 cursor-pointer transition-all ${
                  selectedWebhook?.id === webhook.id ? 'border-blue-400/50' : ''
                }`}
                onClick={() => setSelectedWebhook(webhook)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {webhook.active ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <p className="text-white font-medium">{webhook.url}</p>
                    </div>
                    
                    <p className="text-white/60 text-sm mb-2">
                      {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''} subscribed
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span>
                        Last ping: {webhook.lastPing ? new Date(webhook.lastPing).toLocaleString() : 'Never'}
                      </span>
                      {webhook.failureCount > 0 && (
                        <span className="text-yellow-400">
                          {webhook.failureCount} failures
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWebhookStatus(webhook.id)
                      }}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Activity className={`w-4 h-4 ${webhook.active ? 'text-green-400' : 'text-white/40'}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingWebhook(webhook)
                      }}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteWebhook(webhook.id)
                      }}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </GlassPanel>
            ))
          )}
        </div>

        {/* Webhook Details */}
        <div>
          {selectedWebhook ? (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Webhook Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Endpoint URL</p>
                  <code className="text-white">{selectedWebhook.url}</code>
                </div>

                <div>
                  <p className="text-white/60 text-sm mb-1">Signing Secret</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-white font-mono text-sm">
                      {showSecret === selectedWebhook.id 
                        ? selectedWebhook.secret 
                        : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => setShowSecret(showSecret === selectedWebhook.id ? null : selectedWebhook.id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      {showSecret === selectedWebhook.id ? (
                        <EyeOff className="w-4 h-4 text-white/60" />
                      ) : (
                        <Eye className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedWebhook.secret)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-white/60 text-sm mb-2">Subscribed Events</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWebhook.events.map(event => (
                      <span 
                        key={event}
                        className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <GlassButton 
                    size="sm" 
                    onClick={() => testWebhook(selectedWebhook)}
                    className="w-full"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Send Test Event
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-8 text-center">
              <Zap className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">Select a webhook to view details</p>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Recent Deliveries */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Deliveries</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Time</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Event</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Response</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Retries</th>
              </tr>
            </thead>
            <tbody>
              {(deliveries.length > 0 ? deliveries : mockDeliveries).map(delivery => (
                <tr key={delivery.id} className="border-b border-white/10">
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {new Date(delivery.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-white text-sm">{delivery.event}</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      delivery.status === 'success' 
                        ? 'bg-green-500/20 text-green-400'
                        : delivery.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {delivery.status === 'success' && <CheckCircle className="w-3 h-3" />}
                      {delivery.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {delivery.status === 'pending' && <Clock className="w-3 h-3" />}
                      {delivery.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/60 text-sm">
                    {delivery.statusCode && `${delivery.statusCode} • `}
                    {delivery.responseTime && `${delivery.responseTime}ms`}
                  </td>
                  <td className="py-3 px-4 text-white/60 text-sm">
                    {delivery.retryCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Create/Edit Webhook Modal */}
      <AnimatePresence>
        {(isCreating || editingWebhook) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setIsCreating(false)
              setEditingWebhook(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6">
                  {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Endpoint URL
                    </label>
                    <GlassInput
                      placeholder="https://your-domain.com/webhooks"
                      value={editingWebhook ? editingWebhook.url : newWebhook.url}
                      onChange={(e) => {
                        if (editingWebhook) {
                          setEditingWebhook({ ...editingWebhook, url: e.target.value })
                        } else {
                          setNewWebhook({ ...newWebhook, url: e.target.value })
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Events to Subscribe
                    </label>
                    <div className="space-y-4">
                      {Object.entries(getEventsByCategory()).map(([category, events]) => (
                        <div key={category}>
                          <h4 className="text-white font-medium mb-2">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {events.map(event => {
                              const isSelected = editingWebhook 
                                ? editingWebhook.events.includes(event.id)
                                : newWebhook.events.includes(event.id)
                              
                              return (
                                <label
                                  key={event.id}
                                  className={`flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-blue-500/20 border border-blue-400/50' 
                                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (editingWebhook) {
                                        const events = e.target.checked
                                          ? [...editingWebhook.events, event.id]
                                          : editingWebhook.events.filter(id => id !== event.id)
                                        setEditingWebhook({ ...editingWebhook, events })
                                      } else {
                                        const events = e.target.checked
                                          ? [...newWebhook.events, event.id]
                                          : newWebhook.events.filter(id => id !== event.id)
                                        setNewWebhook({ ...newWebhook, events })
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-white text-sm font-medium">
                                      {event.name}
                                    </p>
                                    <p className="text-white/40 text-xs">
                                      {event.description}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <GlassButton
                      onClick={() => {
                        if (editingWebhook) {
                          updateWebhook(editingWebhook)
                        } else {
                          createWebhook()
                        }
                      }}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                    </GlassButton>
                    <GlassButton
                      variant="secondary"
                      onClick={() => {
                        setIsCreating(false)
                        setEditingWebhook(null)
                      }}
                    >
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}