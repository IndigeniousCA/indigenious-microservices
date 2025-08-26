'use client'

import { useState, useEffect } from 'react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  Usb, HardDrive, Upload, Download, Package, FolderOpen,
  CheckCircle, AlertCircle, Loader2, Info, FileSpreadsheet
} from 'lucide-react'
import { p2pSyncService } from '@/lib/offline/P2PSyncService'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BOQ } from '../types'

interface USBDrive {
  path: string
  name: string
  size: number
  free: number
}

interface USBSyncPanelProps {
  boqs: BOQ[]
  onImport?: (boqs: BOQ[]) => void
  onClose?: () => void
}

export function USBSyncPanel({ boqs, onImport, onClose }: USBSyncPanelProps) {
  const [usbDrives, setUsbDrives] = useState<USBDrive[]>([])
  const [selectedDrive, setSelectedDrive] = useState<USBDrive | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  // Check if running from USB in portable mode
  const isPortable = typeof window !== 'undefined' && window.electronAPI?.isPortable
  const currentUSBDrive = typeof window !== 'undefined' && window.electronAPI?.usbDrive

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.p2p) {
      scanForUSBDrives()
    }
  }, [])

  const scanForUSBDrives = async () => {
    setIsScanning(true)
    try {
      const drives = await window.electronAPI.p2p.listUSBDrives()
      setUsbDrives(drives)
      
      // Auto-select current drive if running from USB
      if (currentUSBDrive) {
        const currentDrive = drives.find(d => d.path.startsWith(currentUSBDrive))
        if (currentDrive) {
          setSelectedDrive(currentDrive)
        }
      }
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: 'Failed to scan for USB drives',
        variant: 'destructive'
      })
    } finally {
      setIsScanning(false)
    }
  }

  const exportToUSB = async () => {
    if (!selectedDrive || boqs.length === 0) return

    setIsExporting(true)
    try {
      const bundlePath = `${selectedDrive.path}/IndigenousSync/bundle_${Date.now()}.isb`
      await p2pSyncService.exportSyncBundle(boqs, bundlePath)
      
      toast({
        title: 'Export Complete',
        description: `Exported ${boqs.length} BOQs to ${selectedDrive.name}`
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export to USB',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const importFromUSB = async () => {
    if (!selectedDrive) return

    setIsImporting(true)
    try {
      // In real implementation, would show file picker
      const bundlePath = await window.electronAPI.selectExcelFile()
      if (!bundlePath) return

      const importedBOQs = await p2pSyncService.importSyncBundle(bundlePath)
      
      toast({
        title: 'Import Complete',
        description: `Imported ${importedBOQs.length} BOQs from ${selectedDrive.name}`
      })

      if (onImport) {
        onImport(importedBOQs)
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import from USB',
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3)
    return `${gb.toFixed(1)} GB`
  }

  const getUsagePercentage = (drive: USBDrive) => {
    const used = drive.size - drive.free
    return (used / drive.size) * 100
  }

  return (
    <GlassPanel className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Usb className="h-6 w-6" />
            USB Sync
          </h2>
          <p className="text-white/60 mt-1">
            Transfer BOQs via USB drive
          </p>
        </div>
        {onClose && (
          <GlassButton variant="ghost" onClick={onClose}>
            Close
          </GlassButton>
        )}
      </div>

      {/* Portable Mode Info */}
      {isPortable && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/80">
                <strong>Portable Mode Active</strong>
              </p>
              <p className="text-sm text-white/60 mt-1">
                Running from USB drive: {currentUSBDrive || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* USB Drives */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Available Drives</h3>
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={scanForUSBDrives}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </GlassButton>
        </div>

        {usbDrives.length === 0 && !isScanning ? (
          <div className="text-center py-8">
            <HardDrive className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">
              No USB drives detected
            </p>
            <p className="text-sm text-white/30 mt-1">
              Insert a USB drive and click Refresh
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {usbDrives.map((drive) => (
              <motion.div
                key={drive.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GlassPanel
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    selectedDrive?.path === drive.path && "border-blue-400/50 bg-blue-500/10"
                  )}
                  onClick={() => setSelectedDrive(drive)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedDrive?.path === drive.path ? "bg-blue-500/20" : "bg-white/10"
                      )}>
                        <Usb className={cn(
                          "h-5 w-5",
                          selectedDrive?.path === drive.path ? "text-blue-400" : "text-white/60"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {drive.name}
                        </p>
                        <p className="text-xs text-white/60">
                          {drive.path}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/80">
                        {formatSize(drive.free)} free
                      </p>
                      <div className="w-24 h-2 bg-white/10 rounded-full mt-1">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${getUsagePercentage(drive)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {drive.path === currentUSBDrive && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Running from this drive
                      </p>
                    </div>
                  )}
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {selectedDrive && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Export */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassPanel className="p-4 text-center">
                <Upload className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <h4 className="font-medium text-white mb-1">Export to USB</h4>
                <p className="text-sm text-white/60 mb-4">
                  Save {boqs.length} BOQs to drive
                </p>
                <GlassButton
                  onClick={exportToUSB}
                  disabled={isExporting || boqs.length === 0}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    'Export'
                  )}
                </GlassButton>
              </GlassPanel>
            </motion.div>

            {/* Import */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassPanel className="p-4 text-center">
                <Download className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <h4 className="font-medium text-white mb-1">Import from USB</h4>
                <p className="text-sm text-white/60 mb-4">
                  Load BOQs from sync bundle
                </p>
                <GlassButton
                  onClick={importFromUSB}
                  disabled={isImporting}
                  variant="success"
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </GlassButton>
              </GlassPanel>
            </motion.div>
          </div>

          {/* Bundle Info */}
          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Sync Bundle Format
            </h4>
            <ul className="text-xs text-white/60 space-y-1">
              <li>• Encrypted and compressed .isb files</li>
              <li>• Includes all BOQ data and attachments</li>
              <li>• Automatic conflict resolution on import</li>
              <li>• Compatible with all Indigenious versions</li>
            </ul>
          </div>
        </div>
      )}
    </GlassPanel>
  )
}