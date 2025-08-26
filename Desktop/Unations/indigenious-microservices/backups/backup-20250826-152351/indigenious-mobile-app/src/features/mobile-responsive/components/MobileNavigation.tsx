// Mobile Navigation Component
// Adaptive navigation for mobile devices with gesture support

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { 
  Menu, X, Home, Search, Bell, User, Grid3X3, 
  ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react'
import { useTouch } from '../hooks/useTouch'
import { useResponsive } from '../hooks/useResponsive'

interface MobileNavigationProps {
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  position?: 'top' | 'bottom'
  variant?: 'tabs' | 'drawer' | 'floating'
  showOverlay?: boolean
  swipeToClose?: boolean
  className?: string
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<unknown>
  href?: string
  onClick?: () => void
  badge?: number
  active?: boolean
  disabled?: boolean
}

const defaultNavigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/', active: true },
  { id: 'directory', label: 'Directory', icon: Grid3X3, href: '/directory' },
  { id: 'search', label: 'Search', icon: Search, href: '/search' },
  { id: 'notifications', label: 'Alerts', icon: Bell, href: '/notifications', badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' }
]

export function MobileNavigation({
  children,
  isOpen,
  onToggle,
  position = 'bottom',
  variant = 'drawer',
  showOverlay = true,
  swipeToClose = true,
  className = ''
}: MobileNavigationProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const [items, setItems] = useState<NavigationItem[]>(defaultNavigationItems)
  const [activeItem, setActiveItem] = useState('home')
  
  const { isMobile, viewport, preferences } = useResponsive()

  // Touch handlers for swipe-to-close
  const { ref: navRef } = useTouch({
    onSwipe: (gesture) => {
      if (!swipeToClose || !isOpen) return
      
      const threshold = 100
      const direction = gesture.direction
      
      // Close on appropriate swipe direction based on position
      if (
        (position === 'bottom' && direction === 'down') ||
        (position === 'top' && direction === 'up') ||
        (variant === 'drawer' && direction === 'left')
      ) {
        if (gesture.distance && gesture.distance > threshold) {
          onToggle()
        }
      }
    },
    onDrag: (gesture) => {
      if (!swipeToClose || !isOpen) return
      
      const offset = position === 'bottom' 
        ? Math.max(0, (gesture.endY || 0) - gesture.startY)
        : Math.min(0, (gesture.endY || 0) - gesture.startY)
      
      setDragOffset(offset)
    }
  })

  // Handle pan gesture for drawer
  const handlePan = (event: any, info: PanInfo) => {
    if (!swipeToClose) return
    
    const offset = variant === 'drawer' 
      ? Math.min(0, info.offset.x)
      : position === 'bottom'
      ? Math.max(0, info.offset.y)
      : Math.min(0, info.offset.y)
    
    setDragOffset(offset)
  }

  const handlePanEnd = (event: any, info: PanInfo) => {
    if (!swipeToClose) return
    
    const threshold = 50
    const velocity = variant === 'drawer' ? info.velocity.x : info.velocity.y
    const offset = variant === 'drawer' ? info.offset.x : info.offset.y
    
    // Close if dragged far enough or with sufficient velocity
    if (
      Math.abs(offset) > threshold ||
      (variant === 'drawer' && velocity < -500) ||
      (position === 'bottom' && velocity > 500) ||
      (position === 'top' && velocity < -500)
    ) {
      onToggle()
    }
    
    setDragOffset(0)
  }

  // Render drawer variant
  const renderDrawer = () => (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/50 z-40"
            />
          )}
          
          {/* Drawer */}
          <motion.div
            ref={navRef}
            initial={{ x: '-100%' }}
            animate={{ x: dragOffset }}
            exit={{ x: '-100%' }}
            drag="x"
            dragConstraints={{ left: -300, right: 0 }}
            dragElastic={0.1}
            onPan={handlePan}
            onPanEnd={handlePanEnd}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            className="fixed left-0 top-0 h-full w-80 max-w-sm bg-white/10 backdrop-blur-md 
              border-r border-white/20 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Render tabs variant
  const renderTabs = () => {
    if (!isMobile) return null
    
    return (
      <motion.div
        initial={{ y: position === 'bottom' ? 100 : -100 }}
        animate={{ y: 0 }}
        className={`
          fixed ${position === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 z-40
          bg-white/10 backdrop-blur-md border-${position === 'bottom' ? 't' : 'b'} border-white/20
          safe-area-inset-bottom
        `}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {items.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveItem(item.id)
                item.onClick?.()
              }}
              disabled={item.disabled}
              className={`
                relative flex flex-col items-center justify-center p-2 min-w-0 flex-1
                transition-all duration-200 rounded-lg
                ${activeItem === item.id 
                  ? 'text-blue-400 bg-blue-500/20' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full 
                    flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-full">
                {item.label}
              </span>
            </button>
          ))}
          
          {/* More button if there are more than 5 items */}
          {items.length > 5 && (
            <button
              onClick={onToggle}
              className="flex flex-col items-center justify-center p-2 min-w-0 flex-1
                text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs mt-1">More</span>
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  // Render floating variant
  const renderFloating = () => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
          className="fixed bottom-20 right-4 z-50"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 
            shadow-2xl min-w-[200px]">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Menu toggle button
  const MenuToggle = () => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full 
        hover:bg-white/20 transition-all duration-200 shadow-lg"
      aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
    >
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </motion.div>
    </motion.button>
  )

  // Don't render on desktop unless explicitly requested
  if (!isMobile && variant !== 'floating') {
    return null
  }

  return (
    <div className={className}>
      {/* Render based on variant */}
      {variant === 'drawer' && renderDrawer()}
      {variant === 'tabs' && renderTabs()}
      {variant === 'floating' && renderFloating()}
      
      {/* Menu toggle for drawer and floating variants */}
      {(variant === 'drawer' || variant === 'floating') && (
        <div className={`
          fixed z-50
          ${position === 'bottom' ? 'bottom-4' : 'top-4'}
          ${variant === 'floating' ? 'right-4' : 'left-4'}
        `}>
          <MenuToggle />
        </div>
      )}

      {/* Accessibility improvements */}
      {isOpen && (
        <div
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          Navigation menu {isOpen ? 'opened' : 'closed'}
        </div>
      )}

      {/* Keyboard navigation */}
      <div className="sr-only">
        <button
          onKeyDown={(e) => {
            if (e.key === 'Escape' && isOpen) {
              onToggle()
            }
          }}
        >
          Press Escape to close navigation
        </button>
      </div>

      {/* Reduced motion support */}
      {preferences.reducedMotion && (
        <style jsx>{`
          .motion-reduce * {
            animation-duration: 0.01s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01s !important;
          }
        `}</style>
      )}
    </div>
  )
}