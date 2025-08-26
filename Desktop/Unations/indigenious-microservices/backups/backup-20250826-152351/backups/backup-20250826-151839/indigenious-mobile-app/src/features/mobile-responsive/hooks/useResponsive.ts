// Responsive Hook
// Main hook for responsive design and device detection

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { 
  ViewportInfo, 
  ConnectionInfo, 
  DeviceCapabilities, 
  ResponsiveState,
  Breakpoint,
  DeviceType,
  Orientation,
  TouchCapability,
  PerformanceMetrics
} from '../types/responsive.types'

const BREAKPOINTS = {
  mobile: 320,
  phablet: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultra: 1920
}

const COMMUNITY_BREAKPOINTS = {
  'basic-phone': 240,
  'satellite-tablet': 600,
  'community-center': 1280
}

export function useResponsive() {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => ({
    viewport: {
      width: typeof window !== 'undefined' ? window.innerWidth : 1024,
      height: typeof window !== 'undefined' ? window.innerHeight : 768,
      breakpoint: 'desktop' as Breakpoint,
      deviceType: 'desktop' as DeviceType,
      orientation: 'landscape' as Orientation,
      touchCapability: 'no-touch' as TouchCapability,
      isRetina: false,
      pixelRatio: 1
    },
    connection: {
      online: true,
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    },
    capabilities: {
      localStorage: true,
      sessionStorage: true,
      indexedDB: true,
      serviceWorker: true,
      webGL: true,
      webRTC: true,
      geolocation: true,
      camera: true,
      microphone: true,
      battery: false,
      vibration: false,
      gamepad: false
    },
    preferences: {
      reducedMotion: false,
      highContrast: false,
      darkMode: false,
      fontSize: 'medium'
    },
    performance: {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      tti: 0,
      tbt: 0
    }
  }))

  // Detect breakpoint from width
  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width >= BREAKPOINTS.ultra) return 'ultra'
    if (width >= BREAKPOINTS.wide) return 'wide'
    if (width >= BREAKPOINTS.desktop) return 'desktop'
    if (width >= BREAKPOINTS.tablet) return 'tablet'
    if (width >= BREAKPOINTS.phablet) return 'phablet'
    return 'mobile'
  }, [])

  // Detect device type
  const getDeviceType = useCallback((width: number, userAgent?: string): DeviceType => {
    if (userAgent) {
      if (/TV|Television|SmartTV/i.test(userAgent)) return 'tv'
      if (/Mobile|Android|iPhone/i.test(userAgent) && width < BREAKPOINTS.tablet) return 'mobile'
      if (/Tablet|iPad/i.test(userAgent) || (width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop)) return 'tablet'
    }
    
    if (width < BREAKPOINTS.tablet) return 'mobile'
    if (width < BREAKPOINTS.desktop) return 'tablet'
    return 'desktop'
  }, [])

  // Detect orientation
  const getOrientation = useCallback((width: number, height: number): Orientation => {
    return width > height ? 'landscape' : 'portrait'
  }, [])

  // Detect touch capability
  const getTouchCapability = useCallback((): TouchCapability => {
    if (typeof window === 'undefined') return 'no-touch'
    
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasPointer = window.PointerEvent !== undefined
    
    if (hasTouch && hasPointer) return 'hybrid'
    if (hasTouch) return 'touch'
    return 'no-touch'
  }, [])

  // Detect device capabilities
  const getDeviceCapabilities = useCallback((): DeviceCapabilities => {
    if (typeof window === 'undefined') {
      return {
        localStorage: false,
        sessionStorage: false,
        indexedDB: false,
        serviceWorker: false,
        webGL: false,
        webRTC: false,
        geolocation: false,
        camera: false,
        microphone: false,
        battery: false,
        vibration: false,
        gamepad: false
      }
    }

    return {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      webGL: !!window.WebGLRenderingContext,
      webRTC: !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia),
      geolocation: !!navigator.geolocation,
      camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      battery: !!(navigator as unknown).getBattery,
      vibration: !!navigator.vibrate,
      gamepad: !!navigator.getGamepads
    }
  }, [])

  // Get connection info
  const getConnectionInfo = useCallback((): ConnectionInfo => {
    if (typeof window === 'undefined') {
      return {
        online: true,
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      }
    }

    const connection = (navigator as unknown).connection || (navigator as unknown).mozConnection || (navigator as unknown).webkitConnection

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 50,
      saveData: connection?.saveData || false
    }
  }, [])

  // Get user preferences
  const getUserPreferences = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        reducedMotion: false,
        highContrast: false,
        darkMode: false,
        fontSize: 'medium' as const
      }
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    const storedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large' | 'extra-large' || 'medium'

    return {
      reducedMotion,
      highContrast,
      darkMode,
      fontSize: storedFontSize
    }
  }, [])

  // Update viewport info
  const updateViewportInfo = useCallback(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    const height = window.innerHeight
    const breakpoint = getBreakpoint(width)
    const deviceType = getDeviceType(width, navigator.userAgent)
    const orientation = getOrientation(width, height)
    const touchCapability = getTouchCapability()
    const isRetina = window.devicePixelRatio > 1
    const pixelRatio = window.devicePixelRatio

    setResponsiveState(prev => ({
      ...prev,
      viewport: {
        width,
        height,
        breakpoint,
        deviceType,
        orientation,
        touchCapability,
        isRetina,
        pixelRatio
      }
    }))
  }, [getBreakpoint, getDeviceType, getOrientation, getTouchCapability])

  // Update connection info
  const updateConnectionInfo = useCallback(() => {
    const connectionInfo = getConnectionInfo()
    setResponsiveState(prev => ({
      ...prev,
      connection: connectionInfo
    }))
  }, [getConnectionInfo])

  // Update preferences
  const updatePreferences = useCallback(() => {
    const preferences = getUserPreferences()
    setResponsiveState(prev => ({
      ...prev,
      preferences
    }))
  }, [getUserPreferences])

  // Measure performance
  const measurePerformance = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return

    // Web Vitals measurement would go here
    // For now, using mock data
    const performance: PerformanceMetrics = {
      lcp: 1200,
      fid: 50,
      cls: 0.05,
      fcp: 800,
      tti: 2000,
      tbt: 100
    }

    setResponsiveState(prev => ({
      ...prev,
      performance
    }))
  }, [])

  // Initialize responsive state
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial setup
    updateViewportInfo()
    updateConnectionInfo()
    updatePreferences()
    measurePerformance()

    const capabilities = getDeviceCapabilities()
    setResponsiveState(prev => ({
      ...prev,
      capabilities
    }))

    // Event listeners
    const handleResize = () => updateViewportInfo()
    const handleOnline = () => updateConnectionInfo()
    const handleOffline = () => updateConnectionInfo()
    const handleConnectionChange = () => updateConnectionInfo()

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleResize, { passive: true })
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Connection API listeners
    const connection = (navigator as unknown).connection
    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    // Media query listeners for preferences
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handlePreferenceChange = () => updatePreferences()

    reducedMotionQuery.addEventListener('change', handlePreferenceChange)
    highContrastQuery.addEventListener('change', handlePreferenceChange)
    darkModeQuery.addEventListener('change', handlePreferenceChange)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }

      reducedMotionQuery.removeEventListener('change', handlePreferenceChange)
      highContrastQuery.removeEventListener('change', handlePreferenceChange)
      darkModeQuery.removeEventListener('change', handlePreferenceChange)
    }
  }, [updateViewportInfo, updateConnectionInfo, updatePreferences, measurePerformance, getDeviceCapabilities])

  // Utility functions
  const isMobile = useMemo(() => 
    responsiveState.viewport.breakpoint === 'mobile' || responsiveState.viewport.breakpoint === 'phablet',
    [responsiveState.viewport.breakpoint]
  )

  const isTablet = useMemo(() => 
    responsiveState.viewport.breakpoint === 'tablet',
    [responsiveState.viewport.breakpoint]
  )

  const isDesktop = useMemo(() => 
    ['desktop', 'wide', 'ultra'].includes(responsiveState.viewport.breakpoint),
    [responsiveState.viewport.breakpoint]
  )

  const isTouch = useMemo(() => 
    responsiveState.viewport.touchCapability !== 'no-touch',
    [responsiveState.viewport.touchCapability]
  )

  const isOnline = useMemo(() => 
    responsiveState.connection.online,
    [responsiveState.connection.online]
  )

  const isSlowConnection = useMemo(() => 
    ['2g', '3g', 'slow-2g'].includes(responsiveState.connection.effectiveType) || 
    responsiveState.connection.saveData,
    [responsiveState.connection.effectiveType, responsiveState.connection.saveData]
  )

  const shouldOptimizeForPerformance = useMemo(() => 
    isSlowConnection || responsiveState.viewport.deviceType === 'mobile',
    [isSlowConnection, responsiveState.viewport.deviceType]
  )

  // Breakpoint utilities
  const matchesBreakpoint = useCallback((breakpoint: Breakpoint | Breakpoint[]) => {
    const current = responsiveState.viewport.breakpoint
    if (Array.isArray(breakpoint)) {
      return breakpoint.includes(current)
    }
    return current === breakpoint
  }, [responsiveState.viewport.breakpoint])

  const isBreakpointUp = useCallback((breakpoint: Breakpoint) => {
    const breakpointOrder: Breakpoint[] = ['mobile', 'phablet', 'tablet', 'desktop', 'wide', 'ultra']
    const currentIndex = breakpointOrder.indexOf(responsiveState.viewport.breakpoint)
    const targetIndex = breakpointOrder.indexOf(breakpoint)
    return currentIndex >= targetIndex
  }, [responsiveState.viewport.breakpoint])

  const isBreakpointDown = useCallback((breakpoint: Breakpoint) => {
    const breakpointOrder: Breakpoint[] = ['mobile', 'phablet', 'tablet', 'desktop', 'wide', 'ultra']
    const currentIndex = breakpointOrder.indexOf(responsiveState.viewport.breakpoint)
    const targetIndex = breakpointOrder.indexOf(breakpoint)
    return currentIndex <= targetIndex
  }, [responsiveState.viewport.breakpoint])

  // Font size utilities
  const setFontSize = useCallback((size: 'small' | 'medium' | 'large' | 'extra-large') => {
    localStorage.setItem('fontSize', size)
    setResponsiveState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        fontSize: size
      }
    }))
  }, [])

  return {
    // State
    ...responsiveState,
    
    // Computed properties
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isOnline,
    isSlowConnection,
    shouldOptimizeForPerformance,
    
    // Utilities
    matchesBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    setFontSize,
    
    // Update functions
    updateViewportInfo,
    updateConnectionInfo,
    updatePreferences,
    measurePerformance
  }
}