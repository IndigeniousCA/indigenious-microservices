// Offline Indicator Component
// Shows pending actions and sync status when offline

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CloudOff, Sync, CheckCircle, AlertCircle, Clock,
  ChevronUp, ChevronDown, RefreshCw, X, Wifi
} from 'lucide-react'
import { useResponsive } from '../hooks/useResponsive'
import { useOffline } from '../hooks/useOffline'

interface OfflineIndicatorProps {
  pendingCount: number
  syncing: boolean
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'
  onSync?: () => void
  onClear?: () => void
  autoCollapse?: boolean
  showDetails?: boolean
}

export function OfflineIndicator({
  pendingCount,
  syncing,
  position = 'bottom-right',
  onSync,
  onClear,
  autoCollapse = true,
  showDetails = false
}: OfflineIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(!autoCollapse || showDetails)
  const [isVisible, setIsVisible] = useState(pendingCount > 0)

  const { isMobile, isOnline, preferences } = useResponsive()
  const { 
    pendingActions, 
    failedActions, 
    syncActions, 
    clearActions,
    lastSync 
  } = useOffline()

  // Get position classes
  const getPositionClasses = () => {
    const positions = {
      'top': 'top-4 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom': 'bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    }
    return positions[position]
  }

  // Handle sync
  const handleSync = async () => {
    try {
      await syncActions()
      onSync?.()
    } catch (error) {
      logger.error('Manual sync failed:', error)
    }
  }

  // Handle clear
  const handleClear = () => {
    clearActions('pending')
    onClear?.()
  }

  // Format time since last sync
  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    
    const now = new Date()
    const diff = now.getTime() - lastSync.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Get action type icon
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'rfq_application': return '📋'
      case 'message': return '💬'
      case 'document_upload': return '📄'
      case 'profile_update': return '👤'
      case 'bid_submission': return '🏷️'
      default: return '⚡'
    }
  }

  // Get action type label
  const getActionLabel = (type: string) => {
    switch (type) {
      case 'rfq_application': return 'RFQ Application'
      case 'message': return 'Message'
      case 'document_upload': return 'Document Upload'
      case 'profile_update': return 'Profile Update'
      case 'bid_submission': return 'Bid Submission'
      default: return 'Action'
    }
  }

  // Don't show if no pending actions
  if (pendingCount === 0 && !isVisible) return null

  return (
    <AnimatePresence>
      {(pendingCount > 0 || isVisible) && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.9, 
            y: position.includes('bottom') ? 20 : -20 
          }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ 
            opacity: 0, 
            scale: 0.9, 
            y: position.includes('bottom') ? 20 : -20 
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            duration: preferences.reducedMotion ? 0.1 : undefined
          }}
          className={`
            fixed z-50 ${getPositionClasses()}
            bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl
            ${isMobile ? 'max-w-xs' : 'max-w-sm'}
            min-w-[200px]
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                {syncing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sync className="w-4 h-4 text-blue-400" />
                  </motion.div>
                ) : isOnline ? (
                  <CloudOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Wifi className="w-4 h-4 text-red-400" />
                )}
                
                {/* Pending count badge */}
                {pendingCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full 
                    flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {syncing ? 'Syncing...' : isOnline ? 'Pending Actions' : 'Offline Mode'}
                </span>
                <span className="text-white/60 text-xs">
                  {pendingCount === 0 ? 'All synced' : 
                   pendingCount === 1 ? '1 action pending' : 
                   `${pendingCount} actions pending`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-white/10"
              >
                {/* Sync Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Last sync:</span>
                    <span className="text-white">{formatLastSync()}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSync}
                      disabled={syncing || !isOnline}
                      className="flex-1 flex items-center justify-center space-x-1 p-2 
                        bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 
                        rounded text-blue-200 text-xs transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    {pendingCount > 0 && (
                      <button
                        onClick={handleClear}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border 
                          border-red-400/30 rounded text-red-200 text-xs transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Pending Actions List */}
                {pendingActions.length > 0 && (
                  <div className="border-t border-white/10 max-h-40 overflow-y-auto">
                    <div className="p-3 space-y-2">
                      <h4 className="text-white/80 text-xs font-medium">Pending Actions:</h4>
                      
                      {pendingActions.slice(0, 5).map((action) => (
                        <div key={action.id} className="flex items-center space-x-2 p-2 
                          bg-white/5 rounded text-xs">
                          <span className="text-lg">{getActionIcon(action.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white truncate">
                              {getActionLabel(action.type)}
                            </p>
                            <p className="text-white/60 text-xs">
                              {new Date(action.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {action.status === 'pending' && (
                              <Clock className="w-3 h-3 text-amber-400" />
                            )}
                            {action.status === 'syncing' && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Sync className="w-3 h-3 text-blue-400" />
                              </motion.div>
                            )}
                            {action.status === 'completed' && (
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                            )}
                            {action.status === 'failed' && (
                              <AlertCircle className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}

                      {pendingActions.length > 5 && (
                        <p className="text-white/60 text-xs text-center">
                          And {pendingActions.length - 5} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed Actions */}
                {failedActions.length > 0 && (
                  <div className="border-t border-white/10 bg-red-500/10">
                    <div className="p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <h4 className="text-red-200 text-xs font-medium">
                          {failedActions.length} Failed Action{failedActions.length !== 1 ? 's' : ''}
                        </h4>
                      </div>
                      <p className="text-red-100/80 text-xs">
                        Some actions failed to sync. They will be retried automatically when connection improves.
                      </p>
                    </div>
                  </div>
                )}

                {/* Offline Help */}
                {!isOnline && (
                  <div className="border-t border-white/10 bg-purple-500/10">
                    <div className="p-3">
                      <h4 className="text-purple-200 text-xs font-medium mb-1">
                        Offline Mode Active
                      </h4>
                      <p className="text-purple-100/80 text-xs">
                        You can continue working. All actions will sync automatically when you're back online.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
          {syncing && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: 'linear' 
                }}
              />
            </div>
          )}

          {/* Cultural Touch */}
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-400 rounded-full 
            opacity-50 animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}