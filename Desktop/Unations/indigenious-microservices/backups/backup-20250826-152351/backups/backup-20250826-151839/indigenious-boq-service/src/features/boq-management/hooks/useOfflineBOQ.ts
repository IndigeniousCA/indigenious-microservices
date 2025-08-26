// React hook for offline BOQ functionality
// Provides offline storage and sync for BOQ data

import { useState, useEffect, useCallback } from 'react'
import { useOffline } from '@/hooks/useOffline'
import { offlineStorage } from '@/lib/offline/OfflineStorage'
import type { BOQ, BOQTemplate } from '../types'
import { boqService } from '../services/BOQService'

interface UseOfflineBOQReturn {
  saveBOQOffline: (boq: BOQ) => Promise<void>
  getBOQOffline: (id: string) => Promise<BOQ | null>
  getAllBOQsOffline: () => Promise<BOQ[]>
  deleteBOQOffline: (id: string) => Promise<void>
  getTemplatesOffline: () => Promise<BOQTemplate[]>
  saveTemplateOffline: (template: BOQTemplate) => Promise<void>
  queueBOQUpdate: (boq: BOQ, action: 'create' | 'update' | 'delete') => Promise<void>
  isOfflineMode: boolean
  syncStatus: {
    isSyncing: boolean
    pendingChanges: number
  }
}

export function useOfflineBOQ(): UseOfflineBOQReturn {
  const { status, queueAction } = useOffline()
  const [pendingChanges, setPendingChanges] = useState(0)

  // Update pending changes count
  useEffect(() => {
    const updatePendingCount = async () => {
      const queueItems = await offlineStorage.getQueueItems()
      setPendingChanges(queueItems.filter(item => item.entity === 'boq').length)
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Save BOQ offline
  const saveBOQOffline = useCallback(async (boq: BOQ) => {
    await offlineStorage.saveBOQ(boq)
    
    // Also save to cache for quick access
    await offlineStorage.setCache(`boq_${boq.id}`, boq, 60) // Cache for 1 hour
  }, [])

  // Get BOQ from offline storage
  const getBOQOffline = useCallback(async (id: string): Promise<BOQ | null> => {
    // Try cache first
    const cached = await offlineStorage.getCache<BOQ>(`boq_${id}`)
    if (cached) return cached

    // Fall back to IndexedDB
    return await offlineStorage.getBOQ(id)
  }, [])

  // Get all BOQs from offline storage
  const getAllBOQsOffline = useCallback(async (): Promise<BOQ[]> => {
    return await offlineStorage.getAllBOQs()
  }, [])

  // Delete BOQ from offline storage
  const deleteBOQOffline = useCallback(async (id: string) => {
    await offlineStorage.deleteBOQ(id)
    await offlineStorage.clearCache(`boq_${id}`)
  }, [])

  // Get templates from offline storage
  const getTemplatesOffline = useCallback(async (): Promise<BOQTemplate[]> => {
    // Try cache first
    const cached = await offlineStorage.getCache<BOQTemplate[]>('boq_templates')
    if (cached) return cached

    // Fall back to IndexedDB
    const templates = await offlineStorage.getTemplates()
    
    // Cache for future use
    if (templates.length > 0) {
      await offlineStorage.setCache('boq_templates', templates, 120) // Cache for 2 hours
    }
    
    return templates
  }, [])

  // Save template offline
  const saveTemplateOffline = useCallback(async (template: BOQTemplate) => {
    await offlineStorage.saveTemplate(template)
    
    // Clear templates cache to force refresh
    await offlineStorage.clearCache('boq_templates')
  }, [])

  // Queue BOQ update for sync
  const queueBOQUpdate = useCallback(async (
    boq: BOQ, 
    action: 'create' | 'update' | 'delete'
  ) => {
    // Save locally first
    if (action !== 'delete') {
      await saveBOQOffline(boq)
    } else {
      await deleteBOQOffline(boq.id)
    }

    // Queue for sync
    await queueAction({
      type: action,
      entity: 'boq',
      data: boq,
      userId: boq.metadata.createdBy
    })

    // Update pending count
    setPendingChanges(prev => prev + 1)
  }, [saveBOQOffline, deleteBOQOffline, queueAction])

  return {
    saveBOQOffline,
    getBOQOffline,
    getAllBOQsOffline,
    deleteBOQOffline,
    getTemplatesOffline,
    saveTemplateOffline,
    queueBOQUpdate,
    isOfflineMode: !status.isOnline,
    syncStatus: {
      isSyncing: status.isSyncing,
      pendingChanges
    }
  }
}