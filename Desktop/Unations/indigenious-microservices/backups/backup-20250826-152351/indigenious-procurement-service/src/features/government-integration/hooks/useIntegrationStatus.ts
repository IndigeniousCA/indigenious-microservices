// Integration Status Hook
// Monitor and manage government system connections

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { GovernmentSystem, IntegrationStatus } from '../types/integration.types'

export function useIntegrationStatus() {
  const [systems, setSystems] = useState<IntegrationStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize system statuses
  useEffect(() => {
    loadSystemStatuses()
    
    // Set up polling for real-time updates
    const interval = setInterval(loadSystemStatuses, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadSystemStatuses = async () => {
    try {
      // In production, this would fetch from API
      const mockStatuses: IntegrationStatus[] = [
        {
          system: 'GETS',
          connected: true,
          lastSync: new Date(Date.now() - 5 * 60000).toISOString(),
          syncStatus: 'idle',
          metrics: {
            rfqsImported: 1247,
            bidsSubmitted: 89,
            documentsExchanged: 3421,
            lastSuccessfulSync: new Date(Date.now() - 5 * 60000).toISOString()
          }
        },
        {
          system: 'SAP_ARIBA',
          connected: true,
          lastSync: new Date(Date.now() - 15 * 60000).toISOString(),
          syncStatus: 'syncing',
          metrics: {
            rfqsImported: 892,
            bidsSubmitted: 67,
            documentsExchanged: 2156,
            lastSuccessfulSync: new Date(Date.now() - 15 * 60000).toISOString()
          }
        },
        {
          system: 'BUY_AND_SELL',
          connected: true,
          lastSync: new Date(Date.now() - 2 * 60000).toISOString(),
          syncStatus: 'idle',
          metrics: {
            rfqsImported: 2341,
            bidsSubmitted: 156,
            documentsExchanged: 5678,
            lastSuccessfulSync: new Date(Date.now() - 2 * 60000).toISOString()
          }
        },
        {
          system: 'MERX',
          connected: false,
          lastSync: new Date(Date.now() - 2 * 3600000).toISOString(),
          syncStatus: 'error',
          errorMessage: 'Authentication failed',
          metrics: {
            rfqsImported: 567,
            bidsSubmitted: 34,
            documentsExchanged: 890,
            lastSuccessfulSync: new Date(Date.now() - 2 * 3600000).toISOString()
          }
        },
        {
          system: 'BC_BID',
          connected: true,
          lastSync: new Date(Date.now() - 10 * 60000).toISOString(),
          syncStatus: 'idle',
          metrics: {
            rfqsImported: 234,
            bidsSubmitted: 12,
            documentsExchanged: 456,
            lastSuccessfulSync: new Date(Date.now() - 10 * 60000).toISOString()
          }
        },
        {
          system: 'BIDCENTRAL',
          connected: true,
          lastSync: new Date(Date.now() - 20 * 60000).toISOString(),
          syncStatus: 'idle',
          metrics: {
            rfqsImported: 789,
            bidsSubmitted: 45,
            documentsExchanged: 1234,
            lastSuccessfulSync: new Date(Date.now() - 20 * 60000).toISOString()
          }
        },
        {
          system: 'PSIB',
          connected: true,
          lastSync: new Date(Date.now() - 1 * 60000).toISOString(),
          syncStatus: 'idle',
          metrics: {
            rfqsImported: 456,
            bidsSubmitted: 78,
            documentsExchanged: 901,
            lastSuccessfulSync: new Date(Date.now() - 1 * 60000).toISOString()
          }
        },
        {
          system: 'ISC',
          connected: true,
          lastSync: new Date(Date.now() - 30 * 60000).toISOString(),
          syncStatus: 'paused',
          metrics: {
            rfqsImported: 123,
            bidsSubmitted: 23,
            documentsExchanged: 345,
            lastSuccessfulSync: new Date(Date.now() - 30 * 60000).toISOString()
          }
        }
      ]

      setSystems(mockStatuses)
    } catch (err) {
      setError('Failed to load system statuses')
      logger.error(err)
    }
  }

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    await loadSystemStatuses()
    setIsLoading(false)
  }, [])

  const syncSystem = useCallback(async (system: GovernmentSystem) => {
    setIsLoading(true)
    
    try {
      // Update system status to syncing
      setSystems(prev => prev.map(s => 
        s.system === system 
          ? { ...s, syncStatus: 'syncing' as const }
          : s
      ))

      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Update with success
      setSystems(prev => prev.map(s => 
        s.system === system 
          ? { 
              ...s, 
              syncStatus: 'idle' as const,
              lastSync: new Date().toISOString(),
              metrics: {
                ...s.metrics,
                rfqsImported: s.metrics.rfqsImported + Math.floor(Math.random() * 10),
                lastSuccessfulSync: new Date().toISOString()
              }
            }
          : s
      ))
    } catch (err) {
      // Update with error
      setSystems(prev => prev.map(s => 
        s.system === system 
          ? { 
              ...s, 
              syncStatus: 'error' as const,
              errorMessage: 'Sync failed'
            }
          : s
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const connectSystem = useCallback(async (system: GovernmentSystem, credentials: any) => {
    setIsLoading(true)
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update system as connected
      setSystems(prev => prev.map(s => 
        s.system === system 
          ? { 
              ...s, 
              connected: true,
              syncStatus: 'idle' as const,
              errorMessage: undefined
            }
          : s
      ))

      // Trigger initial sync
      await syncSystem(system)
    } catch (err) {
      setError('Failed to connect system')
    } finally {
      setIsLoading(false)
    }
  }, [syncSystem])

  const disconnectSystem = useCallback(async (system: GovernmentSystem) => {
    setSystems(prev => prev.map(s => 
      s.system === system 
        ? { 
            ...s, 
            connected: false,
            syncStatus: 'idle' as const
          }
        : s
    ))
  }, [])

  const getSystemStatus = useCallback((system: GovernmentSystem) => {
    return systems.find(s => s.system === system)
  }, [systems])

  const getTotalMetrics = useCallback(() => {
    return systems.reduce((acc, system) => ({
      rfqsImported: acc.rfqsImported + system.metrics.rfqsImported,
      bidsSubmitted: acc.bidsSubmitted + system.metrics.bidsSubmitted,
      documentsExchanged: acc.documentsExchanged + system.metrics.documentsExchanged
    }), {
      rfqsImported: 0,
      bidsSubmitted: 0,
      documentsExchanged: 0
    })
  }, [systems])

  return {
    systems,
    isLoading,
    error,
    refreshStatus,
    syncSystem,
    connectSystem,
    disconnectSystem,
    getSystemStatus,
    getTotalMetrics
  }
}