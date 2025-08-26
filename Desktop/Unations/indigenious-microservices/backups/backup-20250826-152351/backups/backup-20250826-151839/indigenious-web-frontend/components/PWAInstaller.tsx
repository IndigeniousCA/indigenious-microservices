'use client'

import React, { useEffect, useState } from 'react'
import { useElemental } from '../contexts/ElementalContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PWAInstaller: React.FC = () => {
  const { emitRipple } = useElemental()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      console.log('🌲 Forest already planted (PWA installed)')
    }

    // Register service worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('🌱 Service Worker planted successfully')
          setSwRegistration(registration)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🍃 New forest growth available')
                  setOfflineReady(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Failed to plant service worker:', error)
        })

      // Listen for messages from service worker
      navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data.type === 'cache-update') {
          console.log('🍄 Mycelial cache updated:', event.data.url)
        } else if (event.data.type === 'river-flow') {
          console.log('💧 River flow tracked:', event.data.url)
        }
      })
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
      console.log('🌰 Forest seed ready to plant')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('🌲 Forest successfully planted!')
      setIsInstalled(true)
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show install prompt
    deferredPrompt.prompt()
    
    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('🌱 User accepted forest planting')
      emitRipple(window.innerWidth / 2, window.innerHeight / 2, 3)
    } else {
      console.log('🍂 User declined forest planting')
    }
    
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return (
    <>
      {/* Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg transform transition-transform duration-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌲</span>
              <div>
                <h3 className="font-semibold">Plant the Indigenous Forest</h3>
                <p className="text-sm text-green-100">Install for offline access and native app experience</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                Plant Now 🌱
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update notification */}
      {offlineReady && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌿</span>
              <div>
                <h4 className="font-semibold">New Growth Available</h4>
                <p className="text-sm text-blue-100">Update to latest forest features</p>
              </div>
            </div>
            <button
              onClick={handleUpdate}
              className="px-3 py-1 bg-white text-blue-700 rounded font-medium hover:bg-blue-50 transition-colors"
            >
              Grow
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
          <span>🌙</span>
          <span className="text-sm font-medium">Offline - Using Forest Cache</span>
        </div>
      )}

      {/* iOS Install Instructions */}
      {typeof navigator !== 'undefined' && !isInstalled && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-xl">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🍎</span>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Install on iOS</h4>
              <p className="text-sm text-purple-100">
                Tap the share button <span className="inline-block mx-1">⬆️</span> then "Add to Home Screen" to plant the forest
              </p>
            </div>
            <button
              onClick={() => {
                const element = document.querySelector('.ios-install-hint')
                if (element) {
                  element.classList.add('hidden')
                }
              }}
              className="text-purple-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Network status monitor
export const NetworkMonitor: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
      
      // Get connection type if available
      const connection = typeof navigator !== 'undefined' ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection) : null
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown')
      }
    }

    updateOnlineStatus()
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const getConnectionIcon = () => {
    if (!isOnline) return '🌙'
    switch (connectionType) {
      case '4g': return '⚡'
      case '3g': return '🌊'
      case '2g': return '💧'
      case 'slow-2g': return '💦'
      default: return '🌐'
    }
  }

  const getConnectionMessage = () => {
    if (!isOnline) return 'Forest Offline - Using Cache'
    switch (connectionType) {
      case '4g': return 'Lightning Fast River'
      case '3g': return 'Flowing River'
      case '2g': return 'Gentle Stream'
      case 'slow-2g': return 'Trickling Brook'
      default: return 'Connected to Forest'
    }
  }

  return (
    <div className={`fixed bottom-4 right-4 z-30 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 transition-all ${
      isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
    }`}>
      <span>{getConnectionIcon()}</span>
      <span>{getConnectionMessage()}</span>
    </div>
  )
}