'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  Share2, Usb, Wifi, Radio, ArrowLeft, Settings,
  HelpCircle, Shield, Zap
} from 'lucide-react'
import { P2PSyncPanel } from './P2PSyncPanel'
import { USBSyncPanel } from './USBSyncPanel'
import { motion, AnimatePresence } from 'framer-motion'
import { BOQ } from '../types'

interface OfflineSyncHubProps {
  boqs: BOQ[]
  onImport?: (boqs: BOQ[]) => void
  onClose?: () => void
}

type SyncMode = 'hub' | 'p2p' | 'usb'

export function OfflineSyncHub({ boqs, onImport, onClose }: OfflineSyncHubProps) {
  const [mode, setMode] = useState<SyncMode>('hub')
  
  // Check capabilities
  const isDesktop = typeof window !== 'undefined' && window.electronAPI?.isDesktop
  const isPortable = typeof window !== 'undefined' && window.electronAPI?.isPortable

  const renderContent = () => {
    switch (mode) {
      case 'p2p':
        return (
          <P2PSyncPanel 
            onClose={() => setMode('hub')}
          />
        )
      
      case 'usb':
        return (
          <USBSyncPanel
            boqs={boqs}
            onImport={onImport}
            onClose={() => setMode('hub')}
          />
        )
      
      default:
        return (
          <GlassPanel className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Share2 className="h-6 w-6" />
                  Offline Sync Hub
                </h2>
                <p className="text-white/60 mt-1">
                  Sync BOQs without internet connection
                </p>
              </div>
              {onClose && (
                <GlassButton variant="ghost" onClick={onClose}>
                  Close
                </GlassButton>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{boqs.length}</p>
                <p className="text-sm text-white/60">Local BOQs</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">
                  {isDesktop ? 'Desktop' : 'Web'}
                </p>
                <p className="text-sm text-white/60">Platform</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </p>
                <p className="text-sm text-white/60">Status</p>
              </div>
            </div>

            {/* Sync Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* P2P Sync */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GlassPanel 
                  className="p-6 cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => setMode('p2p')}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                      <Wifi className="h-8 w-8 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        P2P Sync
                      </h3>
                      <p className="text-sm text-white/60 mb-4">
                        Sync directly with nearby devices on job sites. Works without internet using WiFi Direct or Bluetooth.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Zap className="h-3 w-3" />
                          Fast local transfer
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Radio className="h-3 w-3" />
                          Create sync hotspot
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Shield className="h-3 w-3" />
                          Encrypted connections
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>

              {/* USB Sync */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GlassPanel 
                  className="p-6 cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => setMode('usb')}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20">
                      <Usb className="h-8 w-8 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        USB Transfer
                      </h3>
                      <p className="text-sm text-white/60 mb-4">
                        Export BOQs to USB drive for sharing or backup. Perfect for remote sites with no connectivity.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <HelpCircle className="h-3 w-3" />
                          No network required
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Settings className="h-3 w-3" />
                          Portable app support
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Shield className="h-3 w-3" />
                          Secure bundle format
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            </div>

            {/* Portable Mode Banner */}
            {isPortable && (
              <div className="p-4 bg-green-500/10 border border-green-400/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Usb className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Running in Portable Mode
                    </p>
                    <p className="text-xs text-white/60">
                      All data is stored on your USB drive for maximum portability
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
              <h4 className="text-sm font-medium text-white mb-2">
                Sync Tips for Remote Sites
              </h4>
              <ul className="text-xs text-white/60 space-y-1">
                <li>• Use P2P sync when multiple workers are on the same job site</li>
                <li>• USB transfer is ideal for winter road communities</li>
                <li>• Create a sync hotspot when no network infrastructure exists</li>
                <li>• Keep sync bundles under 500MB for faster transfers</li>
              </ul>
            </div>
          </GlassPanel>
        )
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  )
}