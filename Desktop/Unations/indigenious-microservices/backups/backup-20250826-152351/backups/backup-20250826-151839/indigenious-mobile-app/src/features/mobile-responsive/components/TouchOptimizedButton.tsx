// Touch Optimized Button Component
// Large, accessible buttons optimized for touch interfaces

import { forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useTouch } from '../hooks/useTouch'
import { useResponsive } from '../hooks/useResponsive'

interface TouchOptimizedButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cultural'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'touch'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  hapticFeedback?: boolean
  longPressAction?: () => void
  longPressDuration?: number
  swipeActions?: {
    left?: () => void
    right?: () => void
    up?: () => void
    down?: () => void
  }
  touchFeedback?: 'scale' | 'opacity' | 'highlight' | 'ripple'
  accessibility?: {
    label?: string
    description?: string
    role?: string
  }
}

const TouchOptimizedButton = forwardRef<HTMLButtonElement, TouchOptimizedButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  hapticFeedback = true,
  longPressAction,
  longPressDuration = 800,
  swipeActions,
  touchFeedback = 'scale',
  accessibility,
  children,
  className = '',
  onClick,
  disabled,
  ...props
}, ref) => {
  const { isMobile, isTouch, preferences } = useResponsive()

  // Touch handlers
  const { ref: touchRef, isPressed } = useTouch({
    onTap: (gesture) => {
      if (disabled || loading) return
      
      // Haptic feedback
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
      
      // Trigger click
      const syntheticEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      })
      onClick?.(syntheticEvent as unknown)
    },
    onLongPress: (gesture) => {
      if (disabled || loading) return
      
      // Stronger haptic feedback for long press
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate([50, 100, 50])
      }
      
      longPressAction?.()
    },
    onSwipe: (gesture) => {
      if (disabled || loading || !swipeActions) return
      
      const { direction } = gesture
      if (direction && swipeActions[direction]) {
        // Light haptic feedback for swipe
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate(5)
        }
        
        swipeActions[direction]?.()
      }
    },
    threshold: {
      tap: isMobile ? 15 : 10,
      longPress: longPressDuration,
      swipe: 30,
      pinch: 10
    },
    disabled: disabled || loading
  })

  // Combine refs
  const buttonRef = (node: HTMLButtonElement) => {
    touchRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  // Get variant classes
  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-transparent shadow-lg',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md',
      outline: 'bg-transparent hover:bg-white/10 text-white border-white/40 hover:border-white/60',
      ghost: 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white border-transparent',
      danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-transparent shadow-lg',
      cultural: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-transparent shadow-lg'
    }
    return variants[variant]
  }

  // Get size classes
  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-base min-h-[44px]',
      lg: 'px-6 py-4 text-lg min-h-[52px]',
      xl: 'px-8 py-5 text-xl min-h-[60px]',
      touch: 'px-6 py-4 text-lg min-h-[48px]' // Optimized for touch (48dp minimum)
    }
    
    // Use touch size on mobile devices
    const actualSize = isMobile && size === 'md' ? 'touch' : size
    return sizes[actualSize]
  }

  // Get touch feedback classes
  const getTouchFeedbackClasses = () => {
    if (preferences.reducedMotion) return ''
    
    const feedbackClasses = {
      scale: 'active:scale-95 transform-gpu',
      opacity: 'active:opacity-75',
      highlight: 'active:bg-white/20',
      ripple: 'relative overflow-hidden'
    }
    return feedbackClasses[touchFeedback]
  }

  // Base classes
  const baseClasses = `
    relative inline-flex items-center justify-center
    font-medium rounded-lg border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none touch-manipulation
    ${fullWidth ? 'w-full' : ''}
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${getTouchFeedbackClasses()}
    ${isPressed && !disabled ? 'scale-95' : ''}
  `

  // Motion variants for animations
  const motionVariants = {
    idle: { 
      scale: 1,
      opacity: 1
    },
    pressed: { 
      scale: preferences.reducedMotion ? 1 : 0.95,
      opacity: touchFeedback === 'opacity' ? 0.75 : 1
    },
    loading: {
      scale: 1,
      opacity: 0.75
    }
  }

  return (
    <motion.button
      ref={buttonRef}
      className={`${baseClasses} ${className}`}
      variants={motionVariants}
      animate={
        loading ? 'loading' :
        isPressed ? 'pressed' : 'idle'
      }
      whileTap={
        preferences.reducedMotion ? undefined :
        touchFeedback === 'scale' ? { scale: 0.95 } : undefined
      }
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        duration: preferences.reducedMotion ? 0 : undefined
      }}
      disabled={disabled || loading}
      aria-label={accessibility?.label}
      aria-describedby={accessibility?.description}
      role={accessibility?.role}
      {...props}
    >
      {/* Ripple effect */}
      {touchFeedback === 'ripple' && (
        <motion.div
          className="absolute inset-0 bg-white/20 rounded-lg opacity-0"
          animate={isPressed ? { opacity: [0, 0.3, 0] } : {}}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="flex items-center justify-center space-x-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {children && (
          <span className={`
            ${loading ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-200
            ${isMobile ? 'leading-tight' : ''}
          `}>
            {children}
          </span>
        )}
        
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </div>

      {/* Long press indicator */}
      {longPressAction && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-full"
          initial={{ width: 0 }}
          animate={isPressed ? { width: '100%' } : { width: 0 }}
          transition={{ duration: longPressDuration / 1000 }}
        />
      )}

      {/* Accessibility enhancements */}
      {swipeActions && (
        <div className="sr-only">
          {swipeActions.left && 'Swipe left for additional action. '}
          {swipeActions.right && 'Swipe right for additional action. '}
          {swipeActions.up && 'Swipe up for additional action. '}
          {swipeActions.down && 'Swipe down for additional action. '}
        </div>
      )}

      {longPressAction && (
        <div className="sr-only">
          Long press for additional action
        </div>
      )}

      {/* High contrast mode border */}
      {preferences.highContrast && (
        <div className="absolute inset-0 border-2 border-white rounded-lg pointer-events-none" />
      )}
    </motion.button>
  )
})

TouchOptimizedButton.displayName = 'TouchOptimizedButton'

export { TouchOptimizedButton }