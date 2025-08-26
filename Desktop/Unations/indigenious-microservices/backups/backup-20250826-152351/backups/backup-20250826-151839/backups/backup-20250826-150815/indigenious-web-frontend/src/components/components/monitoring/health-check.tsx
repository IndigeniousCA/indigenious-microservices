'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: {
    database: boolean
    payment: boolean
    storage: boolean
    auth: boolean
    email: boolean
  }
  metrics: {
    responseTime: number
    uptime: number
    errorRate: number
    activeUsers: number
  }
}

export function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setHealth(data)
      } catch (error) {
        logger.error('Health check failed:', error)
        setHealth({
          status: 'down',
          timestamp: new Date().toISOString(),
          services: {
            database: false,
            payment: false,
            storage: false,
            auth: false,
            email: false,
          },
          metrics: {
            responseTime: 0,
            uptime: 0,
            errorRate: 100,
            activeUsers: 0,
          },
        })
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 animate-pulse" />
          <h2 className="text-lg font-semibold">System Health</h2>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!health) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon(health.status)}
          <h2 className="text-lg font-semibold">System Health</h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
          {health.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Services */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Services</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(health.services).map(([service, isUp]) => (
              <div key={service} className="flex items-center gap-2">
                {isUp ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm capitalize">{service}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Response Time</span>
              <span className="font-medium">{health.metrics.responseTime}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Uptime</span>
              <span className="font-medium">{health.metrics.uptime}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Rate</span>
              <span className="font-medium">{health.metrics.errorRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Active Users</span>
              <span className="font-medium">{health.metrics.activeUsers}</span>
            </div>
          </div>
        </div>

        {/* Last Check */}
        <div className="text-xs text-gray-500">
          Last checked: {new Date(health.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}