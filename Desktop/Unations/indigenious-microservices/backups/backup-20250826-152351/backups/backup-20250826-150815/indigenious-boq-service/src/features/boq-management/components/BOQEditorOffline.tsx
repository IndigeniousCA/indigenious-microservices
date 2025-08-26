'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Upload, Download, Save, Lock, Unlock, History, 
  Share2, MessageSquare, CheckCircle, AlertCircle, 
  ChevronRight, ChevronDown, Edit2, Trash2, Copy,
  FileSpreadsheet, Filter, Search, Users, WifiOff,
  Cloud, CloudOff
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { useToast } from '@/components/ui/use-toast'
import { boqService } from '../services/BOQService'
import { excelService } from '../services/ExcelService'
import { useOfflineBOQ } from '../hooks/useOfflineBOQ'
import type { 
  BOQ, BOQSection, BOQItem, BOQStatus, UserRole 
} from '../types'

interface BOQEditorOfflineProps {
  boqId?: string
  projectId: string
  projectName: string
  onSave?: (boq: BOQ) => void
  currentUser: {
    id: string
    name: string
    role: UserRole
  }
}

export function BOQEditorOffline({ 
  boqId, 
  projectId, 
  projectName,
  onSave,
  currentUser 
}: BOQEditorOfflineProps) {
  const [boq, setBOQ] = useState<BOQ | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const { toast } = useToast()
  const {
    saveBOQOffline,
    getBOQOffline,
    queueBOQUpdate,
    isOfflineMode,
    syncStatus
  } = useOfflineBOQ()

  // Load or create BOQ
  useEffect(() => {
    const loadBOQ = async () => {
      setIsLoading(true)
      try {
        if (boqId) {
          // Try to load from offline storage first
          const offlineBOQ = await getBOQOffline(boqId)
          if (offlineBOQ) {
            setBOQ(offlineBOQ)
            toast({
              title: isOfflineMode ? 'Offline Mode' : 'Loaded from cache',
              description: isOfflineMode 
                ? 'Working with locally saved BOQ' 
                : 'BOQ loaded from local cache'
            })
          } else if (!isOfflineMode) {
            // If online and not in cache, fetch from server
            // In production, this would fetch from API
            logger.info('Fetching BOQ from server:', boqId)
          }
        } else {
          // Create new BOQ
          const newBOQ = await boqService.createBOQ({
            projectId,
            projectName,
            discipline: 'architectural',
            createdBy: currentUser.id,
            createdByRole: currentUser.role,
            organization: 'Example Organization',
            projectType: 'commercial',
            indigenousContentTarget: 5
          })
          setBOQ(newBOQ)
          
          // Save offline immediately
          await saveBOQOffline(newBOQ)
          
          // Queue for sync if online
          if (!isOfflineMode) {
            await queueBOQUpdate(newBOQ, 'create')
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load BOQ',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadBOQ()
  }, [boqId, projectId, projectName, currentUser, toast, getBOQOffline, saveBOQOffline, queueBOQUpdate, isOfflineMode])

  // Auto-save changes
  useEffect(() => {
    if (hasUnsavedChanges && boq) {
      const saveTimeout = setTimeout(async () => {
        await handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(saveTimeout)
    }
  }, [hasUnsavedChanges, boq])

  // Save BOQ
  const handleSave = async () => {
    if (!boq) return

    try {
      // Always save offline first
      await saveBOQOffline(boq)
      
      // Queue for sync
      await queueBOQUpdate(boq, boqId ? 'update' : 'create')
      
      setHasUnsavedChanges(false)
      
      if (onSave) {
        onSave(boq)
      }
      
      toast({
        title: 'Saved',
        description: isOfflineMode 
          ? 'Changes saved offline. Will sync when online.' 
          : 'Changes saved and queued for sync.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save BOQ',
        variant: 'destructive'
      })
    }
  }

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // Add new item
  const handleAddItem = async (sectionId: string) => {
    if (!boq) return

    const newItem = {
      code: `${sectionId}.${Date.now()}`,
      description: 'New Item',
      quantity: 0,
      unit: 'ea',
      rate: 0,
      currency: 'CAD',
      status: 'active' as const,
      indigenousContent: {
        percentage: 0
      },
      specifications: {}
    }

    try {
      const updatedBOQ = await boqService.addItem(
        boq,
        sectionId,
        newItem,
        currentUser.id
      )
      setBOQ(updatedBOQ)
      setHasUnsavedChanges(true)
      
      toast({
        title: 'Success',
        description: 'Item added successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive'
      })
    }
  }

  // Update item
  const handleUpdateItem = async (itemId: string, updates: Partial<BOQItem>) => {
    if (!boq) return

    try {
      const updatedBOQ = await boqService.updateItem(
        boq,
        itemId,
        updates,
        currentUser.id
      )
      setBOQ(updatedBOQ)
      setHasUnsavedChanges(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive'
      })
    }
  }

  // Import from Excel
  const handleImport = async (file: File) => {
    if (!boq) return

    setIsLoading(true)
    try {
      // Detect column mapping
      const { mapping, confidence } = await excelService.detectColumnMapping(file)
      
      if (confidence < 50) {
        toast({
          title: 'Warning',
          description: 'Column mapping confidence is low. Please review the import.',
          variant: 'destructive'
        })
      }

      const updatedBOQ = await boqService.importBOQ(
        file,
        {
          format: 'excel',
          mapping,
          options: {
            hasHeaders: true
          }
        },
        boq,
        currentUser.id
      )
      
      setBOQ(updatedBOQ)
      setHasUnsavedChanges(true)
      setShowImportDialog(false)
      
      toast({
        title: 'Success',
        description: 'BOQ imported successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import BOQ',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Export to Excel (works offline)
  const handleExport = async () => {
    if (!boq) return

    setIsLoading(true)
    try {
      const blob = await boqService.exportBOQ(boq, {
        format: 'excel',
        options: {
          includeRates: true,
          includeAmounts: true,
          includeSuppliers: true,
          includeSpecifications: true,
          includeComments: false,
          indigenousContentReport: true
        }
      })

      // Download file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BOQ_${boq.projectName}_${boq.revision}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'BOQ exported successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export BOQ',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Download template
  const handleDownloadTemplate = () => {
    const blob = excelService.generateTemplate('architectural', 'commercial')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'BOQ_Import_Template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate Indigenous content percentage
  const getIndigenousPercentage = () => {
    if (!boq) return 0
    const { percentage } = boqService.calculateIndigenousContent(boq)
    return percentage
  }

  // Render section
  const renderSection = (section: BOQSection, depth = 0) => {
    const isExpanded = expandedSections.has(section.id)
    const hasItems = (section.items?.length || 0) > 0
    const hasSubsections = (section.subsections?.length || 0) > 0
    const hasContent = hasItems || hasSubsections

    return (
      <div key={section.id} className={`${depth > 0 ? 'ml-8' : ''}`}>
        <div
          className={`flex items-center gap-2 p-3 hover:bg-white/5 rounded-lg cursor-pointer ${
            selectedSection === section.id ? 'bg-white/10' : ''
          }`}
          onClick={() => {
            setSelectedSection(section.id)
            if (hasContent) toggleSection(section.id)
          }}
        >
          {hasContent && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </motion.div>
          )}
          
          <div className="flex-1 flex items-center gap-3">
            <span className="font-semibold text-white">
              {section.code}
            </span>
            <span className="text-white/80">{section.name}</span>
            {section.totals.items > 0 && (
              <span className="text-sm text-white/50">
                ({section.totals.items} items)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {section.totals.amount > 0 && (
              <span className="text-sm text-white/60">
                ${section.totals.amount.toLocaleString()}
              </span>
            )}
            
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                handleAddItem(section.id)
              }}
            >
              <Plus className="w-4 h-4" />
            </GlassButton>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Items */}
              {section.items?.map(item => renderItem(item, section.id))}
              
              {/* Subsections */}
              {section.subsections?.map(subsection => 
                renderSection(subsection, depth + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Render item
  const renderItem = (item: BOQItem, sectionId: string) => {
    const isSelected = selectedItem === item.id
    const isEditingItem = isSelected && isEditing

    return (
      <div
        key={item.id}
        className={`ml-8 p-2 hover:bg-white/5 rounded-lg cursor-pointer ${
          isSelected ? 'bg-white/10' : ''
        }`}
        onClick={() => setSelectedItem(item.id)}
      >
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-1 text-sm text-white/60">
            {item.code}
          </div>
          
          <div className="col-span-4">
            {isEditingItem ? (
              <GlassInput
                value={item.description}
                onChange={(e) => handleUpdateItem(item.id, { 
                  description: e.target.value 
                })}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-white/80">{item.description}</span>
            )}
          </div>
          
          <div className="col-span-2 text-center">
            {isEditingItem ? (
              <GlassInput
                type="number"
                value={item.quantity}
                onChange={(e) => handleUpdateItem(item.id, { 
                  quantity: parseFloat(e.target.value) || 0 
                })}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-white/80">{item.quantity}</span>
            )}
          </div>
          
          <div className="col-span-1 text-center text-white/60">
            {item.unit}
          </div>
          
          <div className="col-span-2 text-right">
            {isEditingItem ? (
              <GlassInput
                type="number"
                value={item.rate}
                onChange={(e) => handleUpdateItem(item.id, { 
                  rate: parseFloat(e.target.value) || 0 
                })}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-white/80">
                ${item.rate?.toLocaleString() || '0'}
              </span>
            )}
          </div>
          
          <div className="col-span-2 text-right font-semibold text-white">
            ${item.amount?.toLocaleString() || '0'}
          </div>
        </div>

        {item.indigenousContent.percentage > 0 && (
          <div className="mt-1 text-xs text-green-400">
            {item.indigenousContent.percentage}% Indigenous content
          </div>
        )}
      </div>
    )
  }

  if (isLoading || !boq) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading BOQ...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{boq.projectName}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
              <span>Revision: {boq.revision}</span>
              <span>•</span>
              <span>Version: {boq.version}</span>
              <span>•</span>
              <span className="capitalize">Status: {boq.status}</span>
              {isOfflineMode && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-orange-400">
                    <WifiOff className="w-4 h-4" />
                    Offline Mode
                  </span>
                </>
              )}
              {syncStatus.pendingChanges > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <CloudOff className="w-4 h-4" />
                    {syncStatus.pendingChanges} pending
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              onClick={handleDownloadTemplate}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Template
            </GlassButton>
            
            <GlassButton
              variant="secondary"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </GlassButton>
            
            <GlassButton
              variant="secondary"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </GlassButton>
            
            <GlassButton
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </GlassButton>
            
            <GlassButton
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? 'Done' : 'Edit'}
            </GlassButton>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {boq.summary.totalItems}
            </div>
            <div className="text-sm text-white/60">Total Items</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              ${boq.summary.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-white/60">Total Amount</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {getIndigenousPercentage().toFixed(1)}%
            </div>
            <div className="text-sm text-white/60">Indigenous Content</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {boq.collaboration.access.length}
            </div>
            <div className="text-sm text-white/60">Collaborators</div>
          </div>
        </div>
      </GlassPanel>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* BOQ Tree */}
        <div className="lg:col-span-3">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Bill of Quantities</h2>
              
              <div className="flex items-center gap-2">
                <GlassInput
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <GlassButton size="sm" variant="secondary">
                  <Filter className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 p-2 border-b border-white/20 text-sm text-white/60">
              <div className="col-span-1">Code</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-1 text-center">Unit</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Sections and Items */}
            <div className="mt-4 space-y-1">
              {boq.sections.map(section => renderSection(section))}
            </div>
          </GlassPanel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Offline Status */}
          {isOfflineMode && (
            <GlassPanel className="p-4 border-orange-400/50">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-orange-400" />
                Working Offline
              </h3>
              <p className="text-sm text-white/60">
                All changes are saved locally. They'll sync automatically when you're back online.
              </p>
              {syncStatus.pendingChanges > 0 && (
                <p className="text-sm text-orange-400 mt-2">
                  {syncStatus.pendingChanges} changes pending sync
                </p>
              )}
            </GlassPanel>
          )}

          {/* Collaboration */}
          <GlassPanel className="p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Collaborators
            </h3>
            <div className="space-y-2">
              {boq.collaboration.access.map(access => (
                <div key={access.userId} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm text-white">{access.userId}</div>
                    <div className="text-xs text-white/60">{access.userRole}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Recent Activity */}
          <GlassPanel className="p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {boq.history.slice(-5).reverse().map(entry => (
                <div key={entry.id} className="text-sm">
                  <div className="text-white/80">{entry.userName} {entry.action}</div>
                  <div className="text-xs text-white/60">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassPanel className="p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Import BOQ</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-2" />
                <p className="text-white/60 mb-2">
                  Drop your Excel file here or click to browse
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(file)
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <GlassButton as="span" className="cursor-pointer">
                    Choose File
                  </GlassButton>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <GlassButton
                  variant="secondary"
                  onClick={() => setShowImportDialog(false)}
                >
                  Cancel
                </GlassButton>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}