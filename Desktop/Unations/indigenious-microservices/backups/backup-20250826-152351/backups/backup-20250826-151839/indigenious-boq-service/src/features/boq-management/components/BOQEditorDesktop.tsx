'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  Save, Upload, Download, FolderOpen, HardDrive, Wifi, WifiOff, 
  RefreshCw, CheckCircle, AlertCircle, Database, Zap, FileSpreadsheet,
  Search, Filter, Menu, ChevronRight, Maximize2, Minimize2
} from 'lucide-react'
import { BOQ, BOQItem } from '../types'
import { desktopStorage } from '@/lib/offline/DesktopStorage'
import { BOQEditor } from './BOQEditor'
import { OfflineSyncHub } from './OfflineSyncHub'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BOQEditorDesktopProps {
  initialBOQ?: BOQ
  onSave?: (boq: BOQ) => void
  onClose?: () => void
}

export function BOQEditorDesktop({ initialBOQ, onSave, onClose }: BOQEditorDesktopProps) {
  const [boq, setBOQ] = useState<BOQ | null>(initialBOQ || null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [storageInfo, setStorageInfo] = useState<unknown>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [recentBOQs, setRecentBOQs] = useState<BOQ[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSyncHub, setShowSyncHub] = useState(false)
  const { toast } = useToast()
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Check if desktop features are available
  const isDesktop = desktopStorage.isDesktop()
  const platform = desktopStorage.getPlatform()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load recent BOQs and storage info
  useEffect(() => {
    if (isDesktop) {
      loadRecentBOQs()
      loadStorageInfo()
    }
  }, [isDesktop])

  // Auto-save with debouncing
  useEffect(() => {
    if (!boq || !boq.id) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [boq])

  // Listen for menu actions
  useEffect(() => {
    if (!isDesktop || !window.electronAPI) return

    const handleMenuAction = (action: string) => {
      switch (action) {
        case 'menu-new-boq':
          handleNewBOQ()
          break
        case 'menu-open-boq':
          handleOpenBOQ()
          break
        case 'menu-save':
          handleSave()
          break
        case 'menu-import-excel':
          handleImportExcel()
          break
        case 'menu-export-excel':
          handleExportExcel()
          break
        case 'menu-sync-now':
          handleSync()
          break
        case 'menu-toggle-offline':
          // Handled by the menu checkbox
          break
      }
    }

    window.electronAPI.onMenuAction(handleMenuAction)
  }, [boq, isDesktop])

  const loadRecentBOQs = async () => {
    try {
      const boqs = await desktopStorage.getAllBOQs()
      setRecentBOQs(boqs.slice(0, 10)) // Show last 10 BOQs
    } catch (error) {
      logger.error('Failed to load recent BOQs:', error)
    }
  }

  const loadStorageInfo = async () => {
    try {
      const info = await desktopStorage.getStorageInfo()
      setStorageInfo(info)
    } catch (error) {
      logger.error('Failed to load storage info:', error)
    }
  }

  const handleAutoSave = async () => {
    if (!boq || !boq.id) return

    setIsSaving(true)
    try {
      await desktopStorage.saveBOQ(boq)
      setLastSaved(new Date())
    } catch (error) {
      logger.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!boq) return

    setIsSaving(true)
    try {
      await desktopStorage.saveBOQ(boq)
      setLastSaved(new Date())
      
      toast({
        title: 'BOQ Saved',
        description: 'Your changes have been saved locally'
      })

      if (onSave) {
        onSave(boq)
      }

      // Reload recent BOQs
      loadRecentBOQs()
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save BOQ. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNewBOQ = () => {
    const newBOQ: BOQ = {
      id: `boq_${Date.now()}`,
      projectId: '',
      projectName: 'New BOQ',
      version: 1,
      revision: 'A',
      status: 'draft',
      discipline: 'General',
      items: [],
      summary: {
        totalCost: 0,
        indigenousContent: 0,
        itemCount: 0
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user'
      },
      permissions: {
        canEdit: true,
        canComment: true,
        canApprove: false
      }
    }

    setBOQ(newBOQ)
  }

  const handleOpenBOQ = async () => {
    // Show file picker or BOQ list
    setShowSidebar(true)
  }

  const handleSelectBOQ = async (selectedBOQ: BOQ) => {
    setBOQ(selectedBOQ)
    setShowSidebar(false)
  }

  const handleImportExcel = async () => {
    if (!window.electronAPI) return

    try {
      const filePath = await window.electronAPI.selectExcelFile()
      if (!filePath) return

      // TODO: Implement Excel import logic
      toast({
        title: 'Excel Import',
        description: `Selected file: ${filePath}`,
      })
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to import Excel file',
        variant: 'destructive'
      })
    }
  }

  const handleExportExcel = async () => {
    if (!window.electronAPI || !boq) return

    try {
      const defaultName = `${boq.projectName}_BOQ_${new Date().toISOString().split('T')[0]}.xlsx`
      const filePath = await window.electronAPI.saveExcelFile(defaultName)
      if (!filePath) return

      // TODO: Implement Excel export logic
      toast({
        title: 'Excel Export',
        description: `Exported to: ${filePath}`,
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export Excel file',
        variant: 'destructive'
      })
    }
  }

  const handleSync = async () => {
    setShowSyncHub(true)
  }

  const handleImportBOQs = async (importedBOQs: BOQ[]) => {
    // Save imported BOQs
    for (const boq of importedBOQs) {
      try {
        await desktopStorage.saveBOQ(boq)
      } catch (error) {
        logger.error('Failed to save imported BOQ:', error)
      }
    }

    // Reload recent BOQs
    loadRecentBOQs()

    toast({
      title: 'Import Complete',
      description: `Imported ${importedBOQs.length} BOQs successfully`
    })
  }

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!isDesktop) {
    // Fallback to regular BOQ editor for non-desktop
    return <BOQEditor initialBOQ={initialBOQ} onSave={onSave} />
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 border-r border-white/10 bg-black/20 backdrop-blur-xl"
          >
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Database className="h-5 w-5" />
                Local BOQs
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Stored on your device
              </p>
            </div>

            {/* Storage Info */}
            {storageInfo && (
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Database Size</span>
                  <span className="text-white">
                    {formatFileSize(storageInfo.databaseSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-white/60">BOQs</span>
                  <span className="text-white">
                    {storageInfo.tableCounts?.boqs || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Recent BOQs */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/80">Recent</h3>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={loadRecentBOQs}
                >
                  <RefreshCw className="h-4 w-4" />
                </GlassButton>
              </div>

              <div className="space-y-2">
                {recentBOQs.map((recentBOQ) => (
                  <button
                    key={recentBOQ.id}
                    onClick={() => handleSelectBOQ(recentBOQ)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg",
                      "bg-white/5 hover:bg-white/10",
                      "border border-white/10 hover:border-white/20",
                      "transition-all duration-200",
                      boq?.id === recentBOQ.id && "bg-blue-500/20 border-blue-400/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {recentBOQ.projectName}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          v{recentBOQ.version} Rev {recentBOQ.revision}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/40 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>

              {recentBOQs.length === 0 && (
                <p className="text-sm text-white/40 text-center py-8">
                  No BOQs found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="h-4 w-4" />
              </GlassButton>

              <div>
                <h1 className="text-lg font-semibold text-white">
                  {boq?.projectName || 'No BOQ Selected'}
                </h1>
                <div className="flex items-center gap-4 text-xs text-white/60 mt-1">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {platform}
                  </span>
                  <span className="flex items-center gap-1">
                    {isOnline ? (
                      <>
                        <Wifi className="h-3 w-3 text-green-400" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 text-orange-400" />
                        Offline
                      </>
                    )}
                  </span>
                  {lastSaved && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-400" />
                      Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  {isSaving && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={handleNewBOQ}
              >
                New
              </GlassButton>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={!boq || isSaving}
              >
                <Save className="h-4 w-4" />
                Save
              </GlassButton>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={handleSync}
              >
                <RefreshCw className="h-4 w-4" />
                Sync
              </GlassButton>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </GlassButton>
            </div>
          </div>
        </div>

        {/* BOQ Editor */}
        <div className="flex-1 overflow-hidden">
          {boq ? (
            <BOQEditor
              initialBOQ={boq}
              onSave={(updatedBOQ) => {
                setBOQ(updatedBOQ)
                handleSave()
              }}
              isDesktop={true}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <GlassPanel className="max-w-md p-8 text-center">
                <FileSpreadsheet className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  No BOQ Selected
                </h2>
                <p className="text-white/60 mb-6">
                  Create a new BOQ or select one from the sidebar
                </p>
                <div className="flex gap-4 justify-center">
                  <GlassButton onClick={handleNewBOQ}>
                    Create New BOQ
                  </GlassButton>
                  <GlassButton
                    variant="outline"
                    onClick={() => setShowSidebar(true)}
                  >
                    Browse BOQs
                  </GlassButton>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-xl px-4 py-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Desktop Mode
              </span>
              <span>
                {boq?.items?.length || 0} items
              </span>
              <span>
                Total: ${boq?.summary?.totalCost?.toLocaleString() || 0}
              </span>
            </div>
            <div>
              Indigenious Desktop v{window.electronAPI?.getVersion?.() || '1.0.0'}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Hub Modal */}
      {showSyncHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-h-[90vh] overflow-y-auto">
            <OfflineSyncHub
              boqs={recentBOQs}
              onImport={handleImportBOQs}
              onClose={() => setShowSyncHub(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}