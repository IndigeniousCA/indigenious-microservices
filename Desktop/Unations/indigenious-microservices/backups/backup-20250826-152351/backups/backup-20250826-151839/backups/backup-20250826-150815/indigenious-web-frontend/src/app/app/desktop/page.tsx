'use client'

import { useEffect, useState } from 'react'
import { BOQEditorDesktop } from '@/features/boq-management/components/BOQEditorDesktop'
import { desktopStorage } from '@/lib/offline/DesktopStorage'

export default function DesktopPage() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Check if running in Electron
    setIsDesktop(desktopStorage.isDesktop())
  }, [])

  if (!isDesktop && typeof window !== 'undefined') {
    // Redirect to main app if not in desktop mode
    window.location.href = '/'
    return null
  }

  return <BOQEditorDesktop />
}