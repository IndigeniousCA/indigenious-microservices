// Dark Mode Theme Provider for Indigenous Procurement Platform
// Provides system-wide dark mode with Apple glass UI support

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'indigenous-platform-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [storageKey])

  useEffect(() => {
    const updateTheme = () => {
      const root = document.documentElement
      
      // Add no-transition class to prevent flash
      root.classList.add('no-transition')
      
      let actualTheme: 'light' | 'dark'
      
      if (theme === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        actualTheme = theme
      }
      
      setIsDark(actualTheme === 'dark')
      
      // Update data-theme attribute
      root.setAttribute('data-theme', actualTheme)
      
      // Update document class for Tailwind dark mode
      if (actualTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      
      // Store theme preference
      localStorage.setItem(storageKey, theme)
      
      // Remove no-transition class after a brief delay
      setTimeout(() => {
        root.classList.remove('no-transition')
      }, 50)
    }

    updateTheme()

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme()
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme, storageKey])

  const toggleTheme = () => {
    setTheme(prevTheme => {
      if (prevTheme === 'light') return 'dark'
      if (prevTheme === 'dark') return 'system'
      return 'light'
    })
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme Toggle Component with Apple Glass UI
export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️'
      case 'dark':
        return '🌙'
      case 'system':
        return '💻'
      default:
        return '☀️'
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'Light'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        glass-panel px-4 py-2 rounded-xl 
        flex items-center space-x-2
        hover:bg-white/20 dark:hover:bg-black/60
        transition-all duration-300
        text-white dark:text-gray-200
        border border-white/20 dark:border-gray-700/50
        backdrop-blur-md
      `}
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
    >
      <span className="text-lg">{getThemeIcon()}</span>
      <span className="text-sm font-medium">{getThemeLabel()}</span>
    </button>
  )
}

// Theme-aware Glass Panel Component
interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'tertiary'
}

export function GlassPanel({ children, className = '', variant = 'primary' }: GlassPanelProps) {
  const baseClasses = 'rounded-xl backdrop-blur-md border transition-all duration-300'
  
  const variantClasses = {
    primary: 'bg-white/10 dark:bg-black/50 border-white/20 dark:border-gray-700/50',
    secondary: 'bg-white/5 dark:bg-black/30 border-white/10 dark:border-gray-700/30',
    tertiary: 'bg-white/2 dark:bg-black/10 border-white/5 dark:border-gray-700/20'
  }
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}

// Theme-aware Glass Button Component
interface GlassButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export function GlassButton({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary', 
  disabled = false 
}: GlassButtonProps) {
  const baseClasses = `
    px-4 py-2 rounded-lg backdrop-blur-md border
    transition-all duration-300 font-medium
    disabled:opacity-50 disabled:cursor-not-allowed
  `
  
  const variantClasses = {
    primary: `
      bg-white/10 dark:bg-black/40 
      border-white/20 dark:border-gray-700/50
      text-white dark:text-gray-200
      hover:bg-white/20 dark:hover:bg-black/60
      hover:border-white/30 dark:hover:border-gray-600/50
    `,
    secondary: `
      bg-white/5 dark:bg-black/20 
      border-white/10 dark:border-gray-700/30
      text-white/80 dark:text-gray-300
      hover:bg-white/10 dark:hover:bg-black/40
      hover:border-white/20 dark:hover:border-gray-600/40
    `,
    danger: `
      bg-red-500/20 dark:bg-red-500/30
      border-red-500/30 dark:border-red-500/50
      text-red-100 dark:text-red-200
      hover:bg-red-500/30 dark:hover:bg-red-500/50
      hover:border-red-500/50 dark:hover:border-red-500/70
    `
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Theme-aware Glass Input Component
interface GlassInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  type?: string
}

export function GlassInput({ 
  placeholder, 
  value, 
  onChange, 
  className = '', 
  type = 'text' 
}: GlassInputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`
        w-full px-4 py-2 rounded-lg backdrop-blur-md border
        bg-white/10 dark:bg-black/30
        border-white/20 dark:border-gray-700/50
        text-white dark:text-gray-200
        placeholder-white/50 dark:placeholder-gray-400
        focus:bg-white/20 dark:focus:bg-black/50
        focus:border-white/30 dark:focus:border-gray-600/50
        focus:outline-none focus:ring-2 focus:ring-blue-500/20
        transition-all duration-300
        ${className}
      `}
    />
  )
}

// Export all theme utilities
export {
  type Theme,
  type ThemeContextType
}