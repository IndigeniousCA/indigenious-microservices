// Offline Hook
// Handle offline functionality and data synchronization

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import type { OfflineAction, CacheStrategy } from '../types/responsive.types'

interface OfflineState {
  isOnline: boolean
  isBackgroundSync: boolean
  lastSync: Date | null
  pendingActions: OfflineAction[]
  failedActions: OfflineAction[]
  syncInProgress: boolean
}

interface OfflineHookProps {
  autoSync?: boolean
  syncInterval?: number
  maxRetries?: number
  onSyncComplete?: (success: boolean, actions: OfflineAction[]) => void
  onActionQueued?: (action: OfflineAction) => void
}

export function useOffline({
  autoSync = true,
  syncInterval = 30000, // 30 seconds
  maxRetries = 3,
  onSyncComplete,
  onActionQueued
}: OfflineHookProps = {}) {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackgroundSync: false,
    lastSync: null,
    pendingActions: [],
    failedActions: [],
    syncInProgress: false
  })

  const syncTimer = useRef<NodeJS.Timeout | null>(null)
  const actionQueue = useRef<OfflineAction[]>([])

  // Load persisted actions from localStorage
  const loadPersistedActions = useCallback(() => {
    try {
      const stored = localStorage.getItem('offline_actions')
      if (stored) {
        const actions: OfflineAction[] = JSON.parse(stored)
        actionQueue.current = actions
        setState(prev => ({ ...prev, pendingActions: actions }))
      }
    } catch (error) {
      logger.error('Failed to load persisted offline actions:', error)
    }
  }, [])

  // Persist actions to localStorage
  const persistActions = useCallback((actions: OfflineAction[]) => {
    try {
      localStorage.setItem('offline_actions', JSON.stringify(actions))
    } catch (error) {
      logger.error('Failed to persist offline actions:', error)
    }
  }, [])

  // Queue an action for offline execution
  const queueAction = useCallback((
    type: string,
    data: unknown,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): string => {
    const action: OfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority,
      status: 'pending'
    }

    actionQueue.current.push(action)
    
    // Sort by priority (high -> medium -> low) and timestamp
    actionQueue.current.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })

    setState(prev => ({
      ...prev,
      pendingActions: [...actionQueue.current]
    }))

    persistActions(actionQueue.current)

    if (onActionQueued) {
      onActionQueued(action)
    }

    // Try immediate sync if online
    if (state.isOnline && autoSync) {
      syncActions()
    }

    return action.id
  }, [state.isOnline, autoSync, persistActions, onActionQueued])

  // Remove action from queue
  const removeAction = useCallback((actionId: string) => {
    actionQueue.current = actionQueue.current.filter(action => action.id !== actionId)
    setState(prev => ({
      ...prev,
      pendingActions: actionQueue.current.filter(action => action.status === 'pending'),
      failedActions: actionQueue.current.filter(action => action.status === 'failed')
    }))
    persistActions(actionQueue.current)
  }, [persistActions])

  // Update action status
  const updateActionStatus = useCallback((actionId: string, status: OfflineAction['status']) => {
    const actionIndex = actionQueue.current.findIndex(action => action.id === actionId)
    if (actionIndex !== -1) {
      actionQueue.current[actionIndex] = {
        ...actionQueue.current[actionIndex],
        status
      }
      
      setState(prev => ({
        ...prev,
        pendingActions: actionQueue.current.filter(action => action.status === 'pending'),
        failedActions: actionQueue.current.filter(action => action.status === 'failed')
      }))
      
      persistActions(actionQueue.current)
    }
  }, [persistActions])

  // Execute a single action
  const executeAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      updateActionStatus(action.id, 'syncing')

      // Mock API call - replace with actual implementation
      logger.info('Executing offline action:', action)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Simulate random failures for testing
      if (Math.random() < 0.1) {
        throw new Error('Simulated API failure')
      }

      updateActionStatus(action.id, 'completed')
      
      // Remove completed actions after a delay
      setTimeout(() => {
        removeAction(action.id)
      }, 5000)

      return true
    } catch (error) {
      logger.error('Failed to execute action:', action, error)
      
      // Increment retry count
      const actionIndex = actionQueue.current.findIndex(a => a.id === action.id)
      if (actionIndex !== -1) {
        actionQueue.current[actionIndex].retries += 1
        
        if (actionQueue.current[actionIndex].retries >= maxRetries) {
          updateActionStatus(action.id, 'failed')
        } else {
          updateActionStatus(action.id, 'pending')
        }
      }

      return false
    }
  }, [updateActionStatus, removeAction, maxRetries])

  // Sync all pending actions
  const syncActions = useCallback(async (): Promise<boolean> => {
    if (!state.isOnline || state.syncInProgress) return false

    setState(prev => ({ ...prev, syncInProgress: true }))

    const pendingActions = actionQueue.current.filter(action => 
      action.status === 'pending' && action.retries < maxRetries
    )

    let allSuccessful = true
    const results: { action: OfflineAction; success: boolean }[] = []

    for (const action of pendingActions) {
      const success = await executeAction(action)
      results.push({ action, success })
      if (!success) allSuccessful = false
    }

    setState(prev => ({
      ...prev,
      syncInProgress: false,
      lastSync: new Date()
    }))

    if (onSyncComplete) {
      onSyncComplete(allSuccessful, results.map(r => r.action))
    }

    return allSuccessful
  }, [state.isOnline, state.syncInProgress, maxRetries, executeAction, onSyncComplete])

  // Force sync all actions
  const forceSyncAll = useCallback(async () => {
    const allActions = actionQueue.current.filter(action => action.status !== 'completed')
    
    // Reset retry counts for failed actions
    allActions.forEach(action => {
      if (action.status === 'failed') {
        action.retries = 0
        action.status = 'pending'
      }
    })

    return await syncActions()
  }, [syncActions])

  // Clear all actions
  const clearActions = useCallback((type?: 'pending' | 'failed' | 'all') => {
    if (type === 'pending') {
      actionQueue.current = actionQueue.current.filter(action => action.status !== 'pending')
    } else if (type === 'failed') {
      actionQueue.current = actionQueue.current.filter(action => action.status !== 'failed')
    } else {
      actionQueue.current = []
    }

    setState(prev => ({
      ...prev,
      pendingActions: actionQueue.current.filter(action => action.status === 'pending'),
      failedActions: actionQueue.current.filter(action => action.status === 'failed')
    }))

    persistActions(actionQueue.current)
  }, [persistActions])

  // Get actions by type
  const getActionsByType = useCallback((type: string) => {
    return actionQueue.current.filter(action => action.type === type)
  }, [])

  // Check if online
  const updateOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine
    setState(prev => ({ ...prev, isOnline }))

    // Trigger sync when coming back online
    if (isOnline && !state.isOnline && autoSync) {
      setTimeout(() => syncActions(), 1000)
    }
  }, [state.isOnline, autoSync, syncActions])

  // Setup background sync timer
  useEffect(() => {
    if (autoSync && state.isOnline) {
      syncTimer.current = setInterval(() => {
        if (state.pendingActions.length > 0) {
          syncActions()
        }
      }, syncInterval)

      return () => {
        if (syncTimer.current) {
          clearInterval(syncTimer.current)
        }
      }
    }
  }, [autoSync, state.isOnline, state.pendingActions.length, syncActions, syncInterval])

  // Setup online/offline event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    loadPersistedActions()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      
      if (syncTimer.current) {
        clearInterval(syncTimer.current)
      }
    }
  }, [updateOnlineStatus, loadPersistedActions])

  // Register service worker for background sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          logger.info('Service Worker registered:', registration)
          setState(prev => ({ ...prev, isBackgroundSync: true }))
        })
        .catch(error => {
          logger.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return {
    // State
    isOnline: state.isOnline,
    isBackgroundSync: state.isBackgroundSync,
    lastSync: state.lastSync,
    pendingActions: state.pendingActions,
    failedActions: state.failedActions,
    syncInProgress: state.syncInProgress,
    
    // Actions
    queueAction,
    syncActions,
    forceSyncAll,
    clearActions,
    removeAction,
    getActionsByType,
    
    // Computed
    hasPendingActions: state.pendingActions.length > 0,
    hasFailedActions: state.failedActions.length > 0,
    totalPendingCount: state.pendingActions.length,
    totalFailedCount: state.failedActions.length
  }
}