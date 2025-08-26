// Touch Hook
// Touch gesture detection and handling for mobile devices

import { useRef, useCallback, useEffect } from 'react'
import type { TouchGesture, TouchProps, SwipeDirection } from '../types/responsive.types'

interface TouchState {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
  isPressed: boolean
  initialDistance: number
  currentDistance: number
}

const DEFAULT_THRESHOLD = {
  tap: 10,
  longPress: 500,
  swipe: 50,
  pinch: 10
}

export function useTouch({
  onTap,
  onLongPress,
  onSwipe,
  onPinch,
  onDrag,
  disabled = false,
  threshold = DEFAULT_THRESHOLD
}: TouchProps) {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isPressed: false,
    initialDistance: 0,
    currentDistance: 0
  })

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  // Calculate distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }, [])

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return getDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY)
  }, [getDistance])

  // Get swipe direction
  const getSwipeDirection = useCallback((startX: number, startY: number, endX: number, endY: number): SwipeDirection => {
    const deltaX = endX - startX
    const deltaY = endY - startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    return {
      horizontal: absX > absY ? (deltaX > 0 ? 'right' : 'left') : 'none',
      vertical: absY > absX ? (deltaY > 0 ? 'down' : 'up') : 'none'
    }
  }, [])

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return

    const touch = event.touches[0]
    const now = Date.now()

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isPressed: true,
      initialDistance: getTouchDistance(event.touches),
      currentDistance: getTouchDistance(event.touches)
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (touchState.current.isPressed) {
          const gesture: TouchGesture = {
            type: 'long-press',
            startX: touchState.current.startX,
            startY: touchState.current.startY,
            duration: Date.now() - touchState.current.startTime
          }
          onLongPress(gesture)
        }
      }, threshold.longPress)
    }
  }, [disabled, onLongPress, threshold.longPress, getTouchDistance])

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !touchState.current.isPressed) return

    const touch = event.touches[0]
    touchState.current.currentX = touch.clientX
    touchState.current.currentY = touch.clientY

    // Handle pinch gesture
    if (event.touches.length === 2 && onPinch) {
      const currentDistance = getTouchDistance(event.touches)
      touchState.current.currentDistance = currentDistance

      const scale = currentDistance / touchState.current.initialDistance
      const gesture: TouchGesture = {
        type: 'pinch',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        endX: touchState.current.currentX,
        endY: touchState.current.currentY,
        duration: Date.now() - touchState.current.startTime,
        scale
      }
      onPinch(gesture)
    }

    // Handle drag gesture
    if (onDrag) {
      const distance = getDistance(
        touchState.current.startX,
        touchState.current.startY,
        touchState.current.currentX,
        touchState.current.currentY
      )

      if (distance > threshold.tap) {
        clearLongPressTimer()

        const gesture: TouchGesture = {
          type: 'drag',
          startX: touchState.current.startX,
          startY: touchState.current.startY,
          endX: touchState.current.currentX,
          endY: touchState.current.currentY,
          duration: Date.now() - touchState.current.startTime,
          distance
        }
        onDrag(gesture)
      }
    }
  }, [disabled, onPinch, onDrag, threshold.tap, getTouchDistance, getDistance, clearLongPressTimer])

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled || !touchState.current.isPressed) return

    clearLongPressTimer()
    touchState.current.isPressed = false

    const endTime = Date.now()
    const duration = endTime - touchState.current.startTime
    const distance = getDistance(
      touchState.current.startX,
      touchState.current.startY,
      touchState.current.currentX,
      touchState.current.currentY
    )

    // Handle tap gesture
    if (distance <= threshold.tap && duration < threshold.longPress && onTap) {
      const gesture: TouchGesture = {
        type: 'tap',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        duration
      }
      onTap(gesture)
    }

    // Handle swipe gesture
    if (distance >= threshold.swipe && onSwipe) {
      const direction = getSwipeDirection(
        touchState.current.startX,
        touchState.current.startY,
        touchState.current.currentX,
        touchState.current.currentY
      )

      const gesture: TouchGesture = {
        type: 'swipe',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        endX: touchState.current.currentX,
        endY: touchState.current.currentY,
        duration,
        distance,
        direction: direction.horizontal !== 'none' ? direction.horizontal : direction.vertical
      }
      onSwipe(gesture)
    }
  }, [disabled, onTap, onSwipe, threshold.tap, threshold.longPress, threshold.swipe, getDistance, getSwipeDirection, clearLongPressTimer])

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer()
    touchState.current.isPressed = false
  }, [clearLongPressTimer])

  // Mouse event handlers for desktop support
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (disabled) return

    const now = Date.now()
    touchState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTime: now,
      currentX: event.clientX,
      currentY: event.clientY,
      isPressed: true,
      initialDistance: 0,
      currentDistance: 0
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (touchState.current.isPressed) {
          const gesture: TouchGesture = {
            type: 'long-press',
            startX: touchState.current.startX,
            startY: touchState.current.startY,
            duration: Date.now() - touchState.current.startTime
          }
          onLongPress(gesture)
        }
      }, threshold.longPress)
    }
  }, [disabled, onLongPress, threshold.longPress])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (disabled || !touchState.current.isPressed) return

    touchState.current.currentX = event.clientX
    touchState.current.currentY = event.clientY

    // Handle drag gesture
    if (onDrag) {
      const distance = getDistance(
        touchState.current.startX,
        touchState.current.startY,
        touchState.current.currentX,
        touchState.current.currentY
      )

      if (distance > threshold.tap) {
        clearLongPressTimer()

        const gesture: TouchGesture = {
          type: 'drag',
          startX: touchState.current.startX,
          startY: touchState.current.startY,
          endX: touchState.current.currentX,
          endY: touchState.current.currentY,
          duration: Date.now() - touchState.current.startTime,
          distance
        }
        onDrag(gesture)
      }
    }
  }, [disabled, onDrag, threshold.tap, getDistance, clearLongPressTimer])

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (disabled || !touchState.current.isPressed) return

    clearLongPressTimer()
    touchState.current.isPressed = false

    const endTime = Date.now()
    const duration = endTime - touchState.current.startTime
    const distance = getDistance(
      touchState.current.startX,
      touchState.current.startY,
      event.clientX,
      event.clientY
    )

    // Handle tap gesture (click)
    if (distance <= threshold.tap && duration < threshold.longPress && onTap) {
      const gesture: TouchGesture = {
        type: 'tap',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        duration
      }
      onTap(gesture)
    }

    // Handle swipe gesture
    if (distance >= threshold.swipe && onSwipe) {
      const direction = getSwipeDirection(
        touchState.current.startX,
        touchState.current.startY,
        event.clientX,
        event.clientY
      )

      const gesture: TouchGesture = {
        type: 'swipe',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        endX: event.clientX,
        endY: event.clientY,
        duration,
        distance,
        direction: direction.horizontal !== 'none' ? direction.horizontal : direction.vertical
      }
      onSwipe(gesture)
    }
  }, [disabled, onTap, onSwipe, threshold.tap, threshold.longPress, threshold.swipe, getDistance, getSwipeDirection, clearLongPressTimer])

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    // Mouse events for desktop support
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseup', handleMouseUp)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, handleMouseDown, handleMouseMove, handleMouseUp])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer()
    }
  }, [clearLongPressTimer])

  return {
    ref: elementRef,
    isPressed: touchState.current.isPressed
  }
}