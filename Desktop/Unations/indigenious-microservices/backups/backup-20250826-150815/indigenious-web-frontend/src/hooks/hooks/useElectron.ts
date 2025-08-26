// React hook for Electron desktop integration
// Provides access to desktop-specific features

import { useState, useEffect, useCallback } from 'react'

import { logger } from '@/lib/monitoring/logger';
interface ElectronAPI {
  selectExcelFile: () => Promise<string | null>
  saveExcelFile: (defaultName: string) => Promise<string | null>
  getTheme: () => Promise<'light' | 'dark'>
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => void
  onMenuAction: (callback: (action: string, ...args: unknown[]) => void) => void
  platform: string
  isDesktop: boolean
  getVersion: () => Promise<string>
}

interface UseElectronReturn {
  isElectron: boolean
  electronAPI: ElectronAPI | null
  platform: string | null
  theme: 'light' | 'dark'
  selectFile: () => Promise<File | null>
  saveFile: (blob: Blob, defaultName: string) => Promise<boolean>
}

export function useElectron(): UseElectronReturn {
  const [isElectron, setIsElectron] = useState(false)
  const [electronAPI, setElectronAPI] = useState<ElectronAPI | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true)
      setElectronAPI(window.electronAPI)
      setPlatform(window.electronAPI.platform)
      
      // Get initial theme
      window.electronAPI.getTheme().then(setTheme)
      
      // Listen for theme changes
      window.electronAPI.onThemeChanged(setTheme)
    }
  }, [])

  // Select file using Electron dialog
  const selectFile = useCallback(async (): Promise<File | null> => {
    if (!electronAPI) {
      // Fall back to web file input
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.xlsx,.xls'
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          resolve(file || null)
        }
        input.click()
      })
    }

    const filePath = await electronAPI.selectExcelFile()
    if (!filePath) return null

    // In Electron, we get a file path, not a File object
    // We'll need to handle this differently in the actual implementation
    // For now, return null as we can't create a File from a path in the renderer
    logger.info('Selected file:', filePath)
    return null
  }, [electronAPI])

  // Save file using Electron dialog
  const saveFile = useCallback(async (blob: Blob, defaultName: string): Promise<boolean> => {
    if (!electronAPI) {
      // Fall back to web download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
      return true
    }

    const filePath = await electronAPI.saveExcelFile(defaultName)
    if (!filePath) return false

    // In a real implementation, we'd send the blob data to main process
    // to save at the selected path
    logger.info('Save to:', filePath)
    return true
  }, [electronAPI])

  return {
    isElectron,
    electronAPI,
    platform,
    theme,
    selectFile,
    saveFile
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}