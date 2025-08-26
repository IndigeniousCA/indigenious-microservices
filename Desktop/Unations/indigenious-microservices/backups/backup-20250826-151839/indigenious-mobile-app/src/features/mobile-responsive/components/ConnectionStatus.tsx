// Connection Status Component
// Network connectivity indicator with offline capabilities

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh,
  Download, Upload, Clock, AlertTriangle, CheckCircle, X
} from 'lucide-react'
import { useResponsive } from '../hooks/useResponsive'

interface ConnectionStatusProps {
  isOnline: boolean
  isSlowConnection: boolean
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'
  showDetails?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  compact?: boolean
  onClose?: () => void
}

export function ConnectionStatus({
  isOnline,
  isSlowConnection,
  position = 'top-right',
  showDetails = false,
  autoHide = true,
  autoHideDelay = 5000,
  compact = false,
  onClose
}: ConnectionStatusProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [connectionInfo, setConnectionInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  })

  const { isMobile, connection, preferences } = useResponsive()

  // Update connection info
  useEffect(() => {
    setConnectionInfo({
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    })
  }, [connection])

  // Auto-hide logic
  useEffect(() => {
    if (!autoHide || !isOnline) return

    const timer = setTimeout(() => {
      setIsVisible(false)
    }, autoHideDelay)

    return () => clearTimeout(timer)
  }, [autoHide, autoHideDelay, isOnline])

  // Show when connection changes
  useEffect(() => {
    setIsVisible(true)
  }, [isOnline, isSlowConnection])

  // Get signal strength icon
  const getSignalIcon = () => {
    if (!isOnline) return WifiOff

    const { effectiveType, downlink } = connectionInfo
    
    if (effectiveType === 'slow-2g' || downlink < 0.5) return SignalLow
    if (effectiveType === '2g' || downlink < 2) return SignalLow
    if (effectiveType === '3g' || downlink < 10) return SignalMedium
    return SignalHigh
  }

  // Get connection quality
  const getConnectionQuality = () => {
    if (!isOnline) return 'offline'
    if (isSlowConnection) return 'slow'
    if (connectionInfo.effectiveType === '4g' && connectionInfo.downlink > 10) return 'excellent'
    if (connectionInfo.effectiveType === '4g') return 'good'
    if (connectionInfo.effectiveType === '3g') return 'fair'
    return 'poor'
  }

  // Get status color
  const getStatusColor = () => {
    const quality = getConnectionQuality()
    switch (quality) {
      case 'excellent': return 'emerald'
      case 'good': return 'blue'
      case 'fair': return 'yellow'
      case 'slow':
      case 'poor': return 'orange'
      case 'offline': return 'red'
      default: return 'gray'
    }
  }

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

  // Format speed
  const formatSpeed = (speed: number) => {
    if (speed >= 1) return `${speed.toFixed(1)} Mbps`
    return `${(speed * 1000).toFixed(0)} Kbps`
  }

  // Format latency
  const formatLatency = (rtt: number) => {
    return `${rtt}ms`
  }

  const SignalIcon = getSignalIcon()
  const statusColor = getStatusColor()

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: position.includes('top') ? -20 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: position.includes('top') ? -20 : 20 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          duration: preferences.reducedMotion ? 0.1 : undefined
        }}
        className={`
          fixed z-50 ${getPositionClasses()}
          bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl
          ${compact ? 'p-2' : 'p-3'}
          ${isMobile ? 'max-w-xs' : 'max-w-sm'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded-full bg-${statusColor}-500/20`}>
              <SignalIcon className={`w-4 h-4 text-${statusColor}-400`} />
            </div>
            
            {!compact && (
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
                {isOnline && (
                  <span className={`text-${statusColor}-300 text-xs capitalize`}>
                    {getConnectionQuality()} connection
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Expand/Collapse button */}
            {!compact && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                aria-label={isExpanded ? 'Hide details' : 'Show details'}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.div>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={() => {
                setIsVisible(false)
                onClose?.()
              }}
              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
              aria-label="Close connection status"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && !compact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-white/10 space-y-2"
            >
              {isOnline ? (
                <>
                  {/* Connection Type */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Type:</span>
                    <span className="text-white uppercase">{connectionInfo.effectiveType}</span>
                  </div>

                  {/* Download Speed */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Download className="w-3 h-3 text-white/60" />
                      <span className="text-white/60">Speed:</span>
                    </div>
                    <span className="text-white">{formatSpeed(connectionInfo.downlink)}</span>
                  </div>

                  {/* Latency */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-white/60" />
                      <span className="text-white/60">Latency:</span>
                    </div>
                    <span className="text-white">{formatLatency(connectionInfo.rtt)}</span>
                  </div>

                  {/* Data Saver */}
                  {connectionInfo.saveData && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Data Saver:</span>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Enabled</span>
                      </div>
                    </div>
                  )}

                  {/* Slow Connection Warning */}
                  {isSlowConnection && (
                    <div className="flex items-center space-x-2 p-2 bg-amber-500/20 border border-amber-400/30 rounded text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="text-amber-200">
                        Slow connection detected. Some features may be limited.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* Offline Message */
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-200">No internet connection</span>
                  </div>
                  <p className="text-white/60 text-xs">
                    You can still browse cached content and your actions will sync when reconnected.
                  </p>
                </div>
              )}

              {/* Connection Tips */}
              {isOnline && isSlowConnection && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-white/60 text-xs">
                    <strong className="text-white">Tip:</strong> Images and videos are optimized for your connection speed.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Status Indicator for Compact Mode */}
        {compact && (
          <div className="absolute -top-1 -right-1">
            <div className={`w-2 h-2 rounded-full bg-${statusColor}-400 ${
              isOnline ? 'animate-pulse' : ''
            }`} />
          </div>
        )}

        {/* Accessibility */}
        <div className="sr-only">
          Connection status: {isOnline ? 'Online' : 'Offline'}
          {isOnline && `, ${getConnectionQuality()} quality`}
          {isSlowConnection && ', slow connection'}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}