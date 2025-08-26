'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

export function OfflineIndicator() {
  const { status, forceSync } = useOffline()
  
  // Don't show if online and not syncing
  if (status.isOnline && !status.isSyncing) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50"
      >
        <GlassPanel className="p-4 min-w-[280px]">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              status.isOnline ? 'bg-blue-500/20' : 'bg-orange-500/20'
            }`}>
              {status.isSyncing ? (
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              ) : status.isOnline ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-orange-400" />
              )}
            </div>

            {/* Status */}
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">
                {status.isSyncing 
                  ? 'Syncing...' 
                  : status.isOnline 
                  ? 'Online' 
                  : 'Offline Mode'}
              </p>
              
              {status.isSyncing && (
                <div className="mt-1">
                  <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                    <span>
                      {status.syncProgress.completed} of {status.syncProgress.total}
                    </span>
                    <span>
                      {status.syncProgress.total > 0 
                        ? Math.round((status.syncProgress.completed / status.syncProgress.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <motion.div 
                      className="bg-blue-400 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: status.syncProgress.total > 0 
                          ? `${(status.syncProgress.completed / status.syncProgress.total) * 100}%` 
                          : '0%' 
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
              
              {!status.isOnline && (
                <p className="text-xs text-white/60 mt-1">
                  Changes will sync when online
                </p>
              )}

              {status.syncProgress.failed > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <p className="text-xs text-red-400">
                    {status.syncProgress.failed} items failed to sync
                  </p>
                </div>
              )}
            </div>

            {/* Action */}
            {status.isOnline && !status.isSyncing && (
              <GlassButton size="sm" variant="secondary" onClick={forceSync}>
                <RefreshCw className="w-4 h-4" />
              </GlassButton>
            )}
          </div>

          {/* Storage usage */}
          {status.storageUsage.percentUsed > 80 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <p className="text-xs text-yellow-400">
                  Storage {status.storageUsage.percentUsed.toFixed(0)}% full
                </p>
              </div>
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </AnimatePresence>
  )
}