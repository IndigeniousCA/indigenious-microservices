// Responsive Layout Component
// Main layout wrapper with breakpoint handling and adaptive design

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useResponsive } from '../hooks/useResponsive'
import { useOffline } from '../hooks/useOffline'
import { MobileNavigation } from './MobileNavigation'
import { ConnectionStatus } from './ConnectionStatus'
import { OfflineIndicator } from './OfflineIndicator'
import type { ResponsiveProps } from '../types/responsive.types'

interface ResponsiveLayoutProps extends ResponsiveProps {
  navigation?: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  showConnectionStatus?: boolean
  showOfflineIndicator?: boolean
  enableOfflineMode?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveLayout({
  children,
  navigation,
  sidebar,
  header,
  footer,
  className = '',
  breakpoint,
  hide,
  show,
  adapt = true,
  optimized = true,
  showConnectionStatus = true,
  showOfflineIndicator = true,
  enableOfflineMode = true,
  maxWidth = 'full',
  padding = 'md'
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const {
    viewport,
    isMobile,
    isTablet,
    isDesktop,
    isOnline,
    isSlowConnection,
    shouldOptimizeForPerformance,
    matchesBreakpoint,
    preferences
  } = useResponsive()

  const {
    hasPendingActions,
    totalPendingCount,
    syncInProgress
  } = useOffline({
    autoSync: enableOfflineMode
  })

  // Handle scroll detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Determine visibility based on breakpoint conditions
  const isVisible = useMemo(() => {
    if (hide && matchesBreakpoint(hide)) return false
    if (show && !matchesBreakpoint(show)) return false
    if (breakpoint && !matchesBreakpoint(breakpoint)) return false
    return true
  }, [hide, show, breakpoint, matchesBreakpoint])

  // Get responsive classes
  const getResponsiveClasses = useMemo(() => {
    const classes = []

    // Base layout classes
    classes.push('min-h-screen')
    classes.push('bg-gray-900')
    
    // Max width constraints
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full'
    }
    if (maxWidth !== 'full') {
      classes.push('mx-auto')
      classes.push(maxWidthClasses[maxWidth])
    }

    // Padding classes
    const paddingClasses = {
      none: '',
      sm: 'p-2 sm:p-4',
      md: 'p-4 sm:p-6 lg:p-8',
      lg: 'p-6 sm:p-8 lg:p-12'
    }
    if (padding !== 'none') {
      classes.push(paddingClasses[padding])
    }

    // Performance optimization classes
    if (shouldOptimizeForPerformance) {
      classes.push('will-change-auto')
    }

    // Accessibility classes
    if (preferences.highContrast) {
      classes.push('contrast-125')
    }

    if (preferences.reducedMotion) {
      classes.push('motion-reduce:transform-none')
      classes.push('motion-reduce:transition-none')
    }

    return classes.join(' ')
  }, [maxWidth, padding, shouldOptimizeForPerformance, preferences.highContrast, preferences.reducedMotion])

  // Layout configuration based on screen size
  const layoutConfig = useMemo(() => {
    if (isMobile) {
      return {
        showSidebar: false,
        sidebarType: 'overlay',
        navigationPosition: 'bottom',
        headerSticky: true,
        compactHeader: true
      }
    }

    if (isTablet) {
      return {
        showSidebar: true,
        sidebarType: 'overlay',
        navigationPosition: 'top',
        headerSticky: true,
        compactHeader: false
      }
    }

    return {
      showSidebar: true,
      sidebarType: 'persistent',
      navigationPosition: 'top',
      headerSticky: false,
      compactHeader: false
    }
  }, [isMobile, isTablet])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`${getResponsiveClasses} ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <ConnectionStatus
          isOnline={isOnline}
          isSlowConnection={isSlowConnection}
          position={isMobile ? 'top' : 'top-right'}
        />
      )}

      {/* Offline Indicator */}
      {showOfflineIndicator && hasPendingActions && (
        <OfflineIndicator
          pendingCount={totalPendingCount}
          syncing={syncInProgress}
          position={isMobile ? 'bottom' : 'bottom-right'}
        />
      )}

      {/* Mobile Navigation Trigger */}
      {isMobile && navigation && (
        <MobileNavigation
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          position={layoutConfig.navigationPosition as 'top' | 'bottom'}
        >
          {navigation}
        </MobileNavigation>
      )}

      {/* Header */}
      {header && (
        <motion.header
          initial={false}
          animate={{
            backdropFilter: isScrolled ? 'blur(8px)' : 'blur(0px)',
            backgroundColor: isScrolled ? 'rgba(17, 24, 39, 0.8)' : 'transparent'
          }}
          className={`
            ${layoutConfig.headerSticky ? 'sticky top-0 z-40' : ''}
            ${layoutConfig.compactHeader ? 'h-14' : 'h-16 lg:h-20'}
            transition-all duration-200 border-b border-white/10
          `}
        >
          <div className="h-full flex items-center justify-between px-4 lg:px-6">
            {header}
          </div>
        </motion.header>
      )}

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebar && layoutConfig.showSidebar) && (
            <>
              {/* Overlay for mobile */}
              {layoutConfig.sidebarType === 'overlay' && sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
              )}

              {/* Sidebar Content */}
              <motion.aside
                initial={{
                  x: layoutConfig.sidebarType === 'overlay' ? '-100%' : 0
                }}
                animate={{
                  x: layoutConfig.sidebarType === 'overlay' && !sidebarOpen ? '-100%' : 0
                }}
                exit={{
                  x: '-100%'
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30
                }}
                className={`
                  ${layoutConfig.sidebarType === 'overlay' 
                    ? 'fixed left-0 top-0 h-full w-64 z-50 lg:relative lg:translate-x-0' 
                    : 'w-64 flex-shrink-0'
                  }
                  bg-white/10 backdrop-blur-md border-r border-white/20
                  ${isMobile ? 'w-full max-w-sm' : ''}
                `}
              >
                <div className="h-full overflow-y-auto">
                  {sidebar}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Performance optimization wrapper */}
          {optimized && shouldOptimizeForPerformance ? (
            <div className="transform-gpu">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="mt-auto border-t border-white/10">
          <div className="px-4 lg:px-6 py-6">
            {footer}
          </div>
        </footer>
      )}

      {/* Cultural Acknowledgment */}
      <div className="fixed bottom-4 left-4 z-30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="bg-purple-500/10 border border-purple-400/30 rounded-lg px-3 py-2 
            max-w-xs backdrop-blur-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-200 text-xs">
              {isMobile ? 'Built for Indigenous communities' : 'Respectfully designed for Indigenous communities'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Font Size Controls for Accessibility */}
      {preferences.fontSize !== 'medium' && (
        <style jsx>{`
          .responsive-layout {
            font-size: ${preferences.fontSize === 'small' ? '0.875rem' : 
                        preferences.fontSize === 'large' ? '1.125rem' : 
                        preferences.fontSize === 'extra-large' ? '1.25rem' : '1rem'};
          }
        `}</style>
      )}
    </div>
  )
}