// React hook for offline functionality
// Provides offline status, storage, and sync capabilities

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { offlineStorage } from '@/lib/offline/OfflineStorage'
import { offlineSyncService } from '@/lib/offline/OfflineSyncService'
import { useToast } from '@/components/ui/use-toast'

interface OfflineStatus {
  isOnline: boolean
  isSyncing: boolean
  syncProgress: {
    total: number
    completed: number
    failed: number
  }
  storageUsage: {
    usage: number
    quota: number
    percentUsed: number
  }
}

interface UseOfflineReturn {
  status: OfflineStatus
  saveOffline: (key: string, data: unknown) => Promise<void>
  getOffline: <T>(key: string) => Promise<T | null>
  queueAction: (action: unknown) => Promise<void>
  forceSync: () => Promise<void>
  clearOfflineData: () => Promise<void>
}

export function useOffline(): UseOfflineReturn {
  const { toast } = useToast()
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    syncProgress: {
      total: 0,
      completed: 0,
      failed: 0
    },
    storageUsage: {
      usage: 0,
      quota: 0,
      percentUsed: 0
    }
  })

  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }))
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored. Syncing changes...',
      })
    }

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }))
      toast({
        title: 'Offline Mode',
        description: 'You can continue working. Changes will sync when you\'re back online.',
        variant: 'default'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Subscribe to sync progress
    const unsubscribe = offlineSyncService.onSyncProgress((progress) => {
      setStatus(prev => ({
        ...prev,
        isSyncing: progress.inProgress,
        syncProgress: {
          total: progress.total,
          completed: progress.completed,
          failed: progress.failed
        }
      }))
    })

    // Update storage usage periodically
    const updateStorageUsage = async () => {
      const usage = await offlineStorage.getStorageInfo()
      setStatus(prev => ({ ...prev, storageUsage: usage }))
    }

    updateStorageUsage()
    const interval = setInterval(updateStorageUsage, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
      clearInterval(interval)
    }
  }, [toast])

  // Save data offline
  const saveOffline = useCallback(async (key: string, data: unknown) => {
    try {
      await offlineStorage.setCache(key, data)
      
      // Update storage usage
      const usage = await offlineStorage.getStorageInfo()
      setStatus(prev => ({ ...prev, storageUsage: usage }))
    } catch (error) {
      logger.error('Failed to save offline:', error)
      toast({
        title: 'Storage Error',
        description: 'Failed to save data offline. Please check your storage space.',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Get data from offline storage
  const getOffline = useCallback(async <T,>(key: string): Promise<T | null> => {
    try {
      return await offlineStorage.getCache<T>(key)
    } catch (error) {
      logger.error('Failed to get offline data:', error)
      return null
    }
  }, [])

  // Queue an action for sync
  const queueAction = useCallback(async (action: unknown) => {
    try {
      await offlineStorage.addToQueue(action)
      
      // If online, trigger sync
      if (status.isOnline) {
        offlineSyncService.forceSync()
      }
    } catch (error) {
      logger.error('Failed to queue action:', error)
      toast({
        title: 'Queue Error',
        description: 'Failed to queue action for sync.',
        variant: 'destructive'
      })
    }
  }, [status.isOnline, toast])

  // Force sync
  const forceSync = useCallback(async () => {
    if (!status.isOnline) {
      toast({
        title: 'Offline',
        description: 'Cannot sync while offline.',
        variant: 'destructive'
      })
      return
    }

    try {
      await offlineSyncService.forceSync()
      toast({
        title: 'Sync Complete',
        description: 'All changes have been synchronized.',
      })
    } catch (error) {
      logger.error('Sync failed:', error)
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync changes. Please try again.',
        variant: 'destructive'
      })
    }
  }, [status.isOnline, toast])

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearAll()
      
      // Update storage usage
      const usage = await offlineStorage.getStorageInfo()
      setStatus(prev => ({ ...prev, storageUsage: usage }))
      
      toast({
        title: 'Data Cleared',
        description: 'All offline data has been cleared.',
      })
    } catch (error) {
      logger.error('Failed to clear offline data:', error)
      toast({
        title: 'Clear Failed',
        description: 'Failed to clear offline data.',
        variant: 'destructive'
      })
    }
  }, [toast])

  return {
    status,
    saveOffline,
    getOffline,
    queueAction,
    forceSync,
    clearOfflineData
  }
}