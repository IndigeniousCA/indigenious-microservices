'use client'

import { useState, useEffect } from 'react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  Wifi, WifiOff, Users, Smartphone, Monitor, Tablet,
  RefreshCw, Upload, Download, Usb, Share2, Radio,
  CheckCircle, AlertCircle, Loader2, QrCode, Shield
} from 'lucide-react'
import { p2pSyncService } from '@/lib/offline/P2PSyncService'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface P2PSyncPanelProps {
  onClose?: () => void
}

export function P2PSyncPanel({ onClose }: P2PSyncPanelProps) {
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [syncingSessions, setSyncingSessions] = useState<Map<string, any>>(new Map())
  const [hotspotInfo, setHotspotInfo] = useState<{ ssid: string; password: string } | null>(null)
  const [showUSBExport, setShowUSBExport] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Listen for P2P events
    const handleDeviceDiscovered = (device: unknown) => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id)
        if (exists) {
          return prev.map(d => d.id === device.id ? device : d)
        }
        return [...prev, device]
      })
    }

    const handleSyncProgress = (session: unknown) => {
      setSyncingSessions(prev => new Map(prev).set(session.id, session))
    }

    const handleSyncComplete = (session: unknown) => {
      setSyncingSessions(prev => {
        const next = new Map(prev)
        next.delete(session.id)
        return next
      })
      
      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${session.itemsSynced} items with ${session.remoteDevice.name}`
      })
    }

    p2pSyncService.on('device:discovered', handleDeviceDiscovered)
    p2pSyncService.on('sync:progress', handleSyncProgress)
    p2pSyncService.on('sync:complete', handleSyncComplete)

    return () => {
      p2pSyncService.off('device:discovered', handleDeviceDiscovered)
      p2pSyncService.off('sync:progress', handleSyncProgress)
      p2pSyncService.off('sync:complete', handleSyncComplete)
    }
  }, [toast])

  const startDiscovery = async () => {
    setIsDiscovering(true)
    setDevices([])
    
    try {
      await p2pSyncService.startDiscovery()
      
      // Stop discovery after 30 seconds
      setTimeout(() => {
        if (isDiscovering) {
          stopDiscovery()
        }
      }, 30000)
    } catch (error) {
      toast({
        title: 'Discovery Failed',
        description: 'Failed to start device discovery',
        variant: 'destructive'
      })
      setIsDiscovering(false)
    }
  }

  const stopDiscovery = () => {
    p2pSyncService.stopDiscovery()
    setIsDiscovering(false)
  }

  const syncWithDevice = async (deviceId: string) => {
    try {
      const session = await p2pSyncService.syncWithDevice(deviceId)
      setSyncingSessions(prev => new Map(prev).set(session.id, session))
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync with device',
        variant: 'destructive'
      })
    }
  }

  const createHotspot = async () => {
    try {
      const info = await p2pSyncService.createSyncHotspot()
      setHotspotInfo(info)
      
      toast({
        title: 'Hotspot Created',
        description: 'Other devices can now connect to sync'
      })
    } catch (error) {
      toast({
        title: 'Hotspot Failed',
        description: 'Failed to create sync hotspot',
        variant: 'destructive'
      })
    }
  }

  const exportToUSB = async () => {
    setShowUSBExport(true)
    // Implementation would trigger file save dialog
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return Monitor
      case 'mobile':
        return Smartphone
      case 'tablet':
        return Tablet
      default:
        return Monitor
    }
  }

  return (
    <GlassPanel className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            P2P Sync for Job Sites
          </h2>
          <p className="text-white/60 mt-1">
            Sync BOQs directly between devices without internet
          </p>
        </div>
        {onClose && (
          <GlassButton variant="ghost" onClick={onClose}>
            Close
          </GlassButton>
        )}
      </div>

      {/* Connection Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Local Network Discovery */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GlassPanel className="p-4 cursor-pointer hover:bg-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Wifi className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">WiFi Discovery</h3>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Find devices on the same network
            </p>
            <GlassButton
              onClick={isDiscovering ? stopDiscovery : startDiscovery}
              disabled={hotspotInfo !== null}
              className="w-full"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                'Start Discovery'
              )}
            </GlassButton>
          </GlassPanel>
        </motion.div>

        {/* Create Hotspot */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GlassPanel className="p-4 cursor-pointer hover:bg-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Radio className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Create Hotspot</h3>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Create a sync network for others
            </p>
            <GlassButton
              onClick={createHotspot}
              disabled={hotspotInfo !== null || isDiscovering}
              className="w-full"
              variant="success"
            >
              Create Hotspot
            </GlassButton>
          </GlassPanel>
        </motion.div>

        {/* USB Sync */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GlassPanel className="p-4 cursor-pointer hover:bg-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Usb className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">USB Transfer</h3>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Export/import via USB drive
            </p>
            <GlassButton
              onClick={exportToUSB}
              className="w-full"
              variant="outline"
            >
              Export to USB
            </GlassButton>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Hotspot Info */}
      {hotspotInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <GlassPanel className="p-6 bg-green-500/10 border-green-400/50">
            <div className="flex items-start gap-4">
              <Radio className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">
                  Hotspot Active
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-white/60">Network Name:</span>
                    <code className="ml-2 px-2 py-1 bg-black/20 rounded text-white">
                      {hotspotInfo.ssid}
                    </code>
                  </div>
                  <div>
                    <span className="text-white/60">Password:</span>
                    <code className="ml-2 px-2 py-1 bg-black/20 rounded text-white">
                      {hotspotInfo.password}
                    </code>
                  </div>
                </div>
                <p className="text-sm text-white/60 mt-3">
                  Other devices can connect to this network to sync
                </p>
              </div>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setHotspotInfo(null)}
              >
                Stop
              </GlassButton>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Discovered Devices */}
      {(isDiscovering || devices.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nearby Devices
            {isDiscovering && (
              <Loader2 className="h-4 w-4 animate-spin text-white/60" />
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {devices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.type)
                const syncSession = Array.from(syncingSessions.values())
                  .find(s => s.remoteDevice.id === device.id)
                
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <GlassPanel className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            syncSession ? "bg-blue-500/20" : "bg-white/10"
                          )}>
                            <DeviceIcon className={cn(
                              "h-5 w-5",
                              syncSession ? "text-blue-400" : "text-white/60"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {device.name}
                            </p>
                            <p className="text-xs text-white/60 capitalize">
                              {device.type} • Last seen {new Date(device.lastSeen).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        {syncSession ? (
                          <div className="text-right">
                            <p className="text-sm text-white/80">
                              {syncSession.itemsSynced}/{syncSession.totalItems}
                            </p>
                            <div className="w-24 h-2 bg-white/10 rounded-full mt-1">
                              <motion.div
                                className="h-full bg-blue-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${(syncSession.itemsSynced / syncSession.totalItems) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <GlassButton
                            size="sm"
                            onClick={() => syncWithDevice(device.id)}
                          >
                            Sync
                          </GlassButton>
                        )}
                      </div>

                      {device.capabilities && (
                        <div className="flex gap-2 mt-3">
                          {device.capabilities.map((cap: string) => (
                            <span
                              key={cap}
                              className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/60"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </GlassPanel>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {devices.length === 0 && !isDiscovering && (
              <div className="col-span-2 text-center py-8">
                <WifiOff className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">
                  No devices found. Start discovery to find nearby devices.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80">
              <strong>Security:</strong> All P2P connections are encrypted. Only sync with trusted devices on your job site.
            </p>
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}