// useTranslation Hook
// Custom hook for translation functionality

import { useContext } from 'react'
import { TranslationContext } from '../contexts/TranslationContext'

// Re-export the hook from context for easier imports
export { useTranslation } from '../contexts/TranslationContext'

// Additional translation utilities
export function useTranslationHelpers() {
  const context = useContext(TranslationContext)
  
  if (!context) {
    throw new Error('useTranslationHelpers must be used within TranslationProvider')
  }

  const {
    t,
    currentLanguage,
    formatDate,
    formatNumber,
    formatCurrency,
    isIndigenousLanguage
  } = context

  // Pluralization helper
  const plural = (count: number, singular: string, plural: string, zero?: string) => {
    if (count === 0 && zero) return zero
    if (count === 1) return singular
    return plural
  }

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        if (diffMinutes < 5) return t('time.just_now')
        return t('time.minutes_ago', 'common', { count: diffMinutes })
      }
      return t('time.hours_ago', 'common', { count: diffHours })
    }
    
    if (diffDays === 1) return t('time.yesterday')
    if (diffDays < 7) return t('time.days_ago', 'common', { count: diffDays })
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return t('time.weeks_ago', 'common', { count: weeks })
    }
    
    return formatDate(dateObj)
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 1): string => {
    return formatNumber(value, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  // Get ordinal suffix
  const getOrdinal = (n: number): string => {
    if (currentLanguage === 'fr') {
      return n === 1 ? 'er' : 'e'
    }
    
    // English ordinals
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }

  // Format list (with proper conjunctions)
  const formatList = (items: string[]): string => {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    if (items.length === 2) {
      return t('list.two_items', 'common', { item1: items[0], item2: items[1] })
    }
    
    const lastItem = items[items.length - 1]
    const otherItems = items.slice(0, -1)
    return t('list.many_items', 'common', { 
      items: otherItems.join(', '), 
      lastItem 
    })
  }

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours()
    
    if (isIndigenousLanguage()) {
      // Indigenous languages may have different greeting patterns
      if (hour < 12) return t('greetings.morning', 'common')
      if (hour < 17) return t('greetings.afternoon', 'common')
      return t('greetings.evening', 'common')
    }
    
    // Standard greetings
    if (hour < 5) return t('greetings.night', 'common')
    if (hour < 12) return t('greetings.morning', 'common')
    if (hour < 17) return t('greetings.afternoon', 'common')
    if (hour < 21) return t('greetings.evening', 'common')
    return t('greetings.night', 'common')
  }

  return {
    plural,
    formatRelativeTime,
    formatFileSize,
    formatPercentage,
    getOrdinal,
    formatList,
    getGreeting
  }
}