'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface ElementalComponent {
  symbol: string
  name: string
  meaning: string
  category: string
  element: string
}

interface SeasonalTheme {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
  aurora: {
    color: string
    intensity: number
    animation: string
  }
  particles: {
    count: number
    speed: number
    color: string
  }
}

interface PerformanceMode {
  mode: 'full-forest' | 'flowing-river' | 'still-pond'
  fps: number
  particles: boolean
  animations: boolean
  shadows: boolean
  reflections: boolean
}

interface ElementalContextType {
  elements: ElementalComponent[]
  theme: SeasonalTheme
  performance: PerformanceMode
  socket: Socket | null
  isConnected: boolean
  setPerformanceMode: (mode: PerformanceMode['mode']) => void
  emitRipple: (x: number, y: number, intensity: number) => void
  getElementByName: (name: string) => ElementalComponent | undefined
}

const ElementalContext = createContext<ElementalContextType | undefined>(undefined)

export const useElemental = () => {
  const context = useContext(ElementalContext)
  if (!context) {
    throw new Error('useElemental must be used within ElementalProvider')
  }
  return context
}

const DESIGN_SYSTEM_URL = process.env.NEXT_PUBLIC_DESIGN_SYSTEM_URL || 'http://localhost:3007'

export const ElementalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [elements, setElements] = useState<ElementalComponent[]>([])
  const [theme, setTheme] = useState<SeasonalTheme>({
    season: 'spring',
    timeOfDay: 'morning',
    aurora: {
      color: '#00ff88',
      intensity: 0.4,
      animation: 'pulse'
    },
    particles: {
      count: 100,
      speed: 0.5,
      color: '#ffffff'
    }
  })
  const [performance, setPerformance] = useState<PerformanceMode>({
    mode: 'full-forest',
    fps: 60,
    particles: true,
    animations: true,
    shadows: true,
    reflections: true
  })
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch elemental components
  useEffect(() => {
    const fetchElements = async () => {
      try {
        const response = await fetch(`${DESIGN_SYSTEM_URL}/api/elements`)
        const data = await response.json()
        setElements(data.elements || [])
      } catch (error) {
        console.error('Failed to fetch elemental components:', error)
        // Fallback to local elements
        setElements([
          { symbol: "🌊", name: "Water", meaning: "User flows and authentication", category: "Foundation", element: "water" },
          { symbol: "🌍", name: "Earth", meaning: "Data persistence", category: "Foundation", element: "earth" },
          { symbol: "🔥", name: "Fire", meaning: "Real-time processing", category: "Foundation", element: "fire" },
          { symbol: "💨", name: "Air", meaning: "Communication", category: "Foundation", element: "air" },
          { symbol: "🌱", name: "Life", meaning: "Growth systems", category: "Growth", element: "life" },
          { symbol: "⚡", name: "Energy", meaning: "Power management", category: "Power", element: "energy" }
        ])
      }
    }
    fetchElements()
  }, [])

  // Fetch seasonal theme
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await fetch(`${DESIGN_SYSTEM_URL}/api/theme/current`)
        const data = await response.json()
        setTheme(data.theme)
      } catch (error) {
        console.error('Failed to fetch theme:', error)
      }
    }
    
    fetchTheme()
    const interval = setInterval(fetchTheme, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  // Setup WebSocket connection
  useEffect(() => {
    const socketInstance = io(DESIGN_SYSTEM_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Elemental Design System')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Elemental Design System')
      setIsConnected(false)
    })

    socketInstance.on('theme-update', (newTheme: SeasonalTheme) => {
      setTheme(newTheme)
    })

    socketInstance.on('ripple', (data: { x: number, y: number, intensity: number, userId: string }) => {
      // Handle collaborative ripples
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('elemental-ripple', { detail: data }))
      }
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Detect device performance and auto-adjust
  useEffect(() => {
    const detectPerformance = () => {
      if (typeof navigator !== 'undefined') {
        const memory = (navigator as any).deviceMemory
        const cores = navigator.hardwareConcurrency
        
        if (memory <= 2 || cores <= 2) {
          setPerformanceMode('still-pond')
        } else if (memory <= 4 || cores <= 4) {
          setPerformanceMode('flowing-river')
        } else {
          setPerformanceMode('full-forest')
        }
      }
    }

    detectPerformance()
  }, [])

  const setPerformanceMode = useCallback((mode: PerformanceMode['mode']) => {
    const modes: Record<PerformanceMode['mode'], PerformanceMode> = {
      'full-forest': {
        mode: 'full-forest',
        fps: 60,
        particles: true,
        animations: true,
        shadows: true,
        reflections: true
      },
      'flowing-river': {
        mode: 'flowing-river',
        fps: 30,
        particles: true,
        animations: true,
        shadows: false,
        reflections: false
      },
      'still-pond': {
        mode: 'still-pond',
        fps: 15,
        particles: false,
        animations: false,
        shadows: false,
        reflections: false
      }
    }
    
    setPerformance(modes[mode])
  }, [])

  const emitRipple = useCallback((x: number, y: number, intensity: number) => {
    if (socket && isConnected) {
      socket.emit('ripple', { x, y, intensity })
    }
  }, [socket, isConnected])

  const getElementByName = useCallback((name: string) => {
    return elements.find(el => el.name.toLowerCase() === name.toLowerCase())
  }, [elements])

  return (
    <ElementalContext.Provider
      value={{
        elements,
        theme,
        performance,
        socket,
        isConnected,
        setPerformanceMode,
        emitRipple,
        getElementByName
      }}
    >
      {children}
    </ElementalContext.Provider>
  )
}