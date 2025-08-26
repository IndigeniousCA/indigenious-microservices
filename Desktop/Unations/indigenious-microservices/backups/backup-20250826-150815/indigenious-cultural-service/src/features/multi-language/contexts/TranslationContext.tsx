// Translation Context Provider
// Global translation state and functionality

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { 
  LanguageCode, 
  Language, 
  TranslationNamespace,
  LanguageDetection,
  LocalizationSettings,
  TranslationError,
  CulturalProtocol
} from '../types/translation.types'
import { 
  SUPPORTED_LANGUAGES, 
  DEFAULT_LANGUAGE, 
  FALLBACK_LANGUAGE,
  LOCALIZATION_SETTINGS,
  SACRED_TERMS,
  SEASONAL_RESTRICTIONS
} from '../config/languages'
import { TranslationService } from '../services/TranslationService'
import { detectLanguage } from '../utils/languageDetection'
import { checkCulturalProtocols } from '../utils/culturalProtocols'

interface TranslationContextValue {
  currentLanguage: LanguageCode
  setLanguage: (language: LanguageCode) => Promise<void>
  languages: Record<string, Language>
  translations: Partial<TranslationNamespace>
  localizationSettings: LocalizationSettings
  isLoading: boolean
  error: TranslationError | null
  // Translation functions
  t: (key: string, namespace?: string, variables?: Record<string, any>) => string
  formatDate: (date: Date | string, format?: string) => string
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (amount: number, currency?: string) => string
  // Cultural protocol functions
  checkProtocol: (text: string) => CulturalProtocol | null
  isSacredTerm: (term: string) => boolean
  hasSeasonalRestriction: (text: string) => boolean
  // Utility functions
  detectUserLanguage: () => Promise<LanguageDetection>
  getLanguageDirection: () => 'ltr' | 'rtl'
  isIndigenousLanguage: () => boolean
  hasAudioSupport: () => boolean
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined)

interface TranslationProviderProps {
  children: React.ReactNode
  initialLanguage?: LanguageCode
  onLanguageChange?: (language: LanguageCode) => void
}

export function TranslationProvider({ 
  children, 
  initialLanguage,
  onLanguageChange 
}: TranslationProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    initialLanguage || DEFAULT_LANGUAGE
  )
  const [translations, setTranslations] = useState<Partial<TranslationNamespace>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<TranslationError | null>(null)

  const translationService = new TranslationService()

  // Load translations for current language
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const loadedTranslations = await translationService.loadTranslations(currentLanguage)
        setTranslations(loadedTranslations)
      } catch (err) {
        setError({
          key: 'load_translations',
          language: currentLanguage,
          error: err instanceof Error ? err.message : 'Failed to load translations',
          fallbackUsed: true,
          timestamp: new Date().toISOString()
        })

        // Load fallback language
        try {
          const fallbackTranslations = await translationService.loadTranslations(FALLBACK_LANGUAGE)
          setTranslations(fallbackTranslations)
        } catch (fallbackErr) {
          logger.error('Failed to load fallback translations:', fallbackErr)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadTranslations()
  }, [currentLanguage])

  // Set language and notify parent
  const setLanguage = useCallback(async (language: LanguageCode) => {
    if (language === currentLanguage) return

    // Check if language is supported
    if (!SUPPORTED_LANGUAGES[language]) {
      logger.warn(`Language ${language} is not supported`)
      return
    }

    setCurrentLanguage(language)
    
    // Save preference
    localStorage.setItem('preferred_language', language)
    
    // Notify parent component
    onLanguageChange?.(language)

    // Update document attributes
    document.documentElement.lang = language
    document.documentElement.dir = SUPPORTED_LANGUAGES[language].direction
  }, [currentLanguage, onLanguageChange])

  // Translation function
  const t = useCallback((key: string, namespace: string = 'common', variables?: Record<string, any>) => {
    const namespaceTranslations = translations[namespace as keyof TranslationNamespace]
    
    if (!namespaceTranslations) {
      logger.warn(`Namespace ${namespace} not loaded`)
      return key
    }

    let translation = namespaceTranslations[key] || key

    // Replace variables
    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        translation = translation.replace(`{{${varKey}}}`, String(value))
      })
    }

    return translation
  }, [translations])

  // Date formatting
  const formatDate = useCallback((date: Date | string, format?: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const settings = LOCALIZATION_SETTINGS[currentLanguage] || LOCALIZATION_SETTINGS[DEFAULT_LANGUAGE]

    // Use traditional calendar if available
    if (settings.calendar?.type === 'traditional' && settings.calendar.traditionalMonths) {
      const month = dateObj.getMonth()
      const traditionalMonth = settings.calendar.traditionalMonths[month]
      return `${dateObj.getDate()} ${traditionalMonth} ${dateObj.getFullYear()}`
    }

    // Default formatting
    return dateObj.toLocaleDateString(currentLanguage, {
      dateStyle: format as unknown || 'medium'
    })
  }, [currentLanguage])

  // Number formatting
  const formatNumber = useCallback((number: number, options?: Intl.NumberFormatOptions) => {
    const settings = LOCALIZATION_SETTINGS[currentLanguage] || LOCALIZATION_SETTINGS[DEFAULT_LANGUAGE]
    
    return new Intl.NumberFormat(currentLanguage, {
      ...options,
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2
    }).format(number)
  }, [currentLanguage])

  // Currency formatting
  const formatCurrency = useCallback((amount: number, currency?: string) => {
    const settings = LOCALIZATION_SETTINGS[currentLanguage] || LOCALIZATION_SETTINGS[DEFAULT_LANGUAGE]
    const currencyCode = currency || settings.currency.code

    return new Intl.NumberFormat(currentLanguage, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }, [currentLanguage])

  // Check cultural protocols
  const checkProtocol = useCallback((text: string): CulturalProtocol | null => {
    return checkCulturalProtocols(text, currentLanguage)
  }, [currentLanguage])

  // Check if term is sacred
  const isSacredTerm = useCallback((term: string): boolean => {
    const lowerTerm = term.toLowerCase()
    return SACRED_TERMS.some(sacred => lowerTerm.includes(sacred.toLowerCase()))
  }, [])

  // Check seasonal restrictions
  const hasSeasonalRestriction = useCallback((text: string): boolean => {
    const currentMonth = new Date().getMonth()
    const currentSeason = currentMonth >= 11 || currentMonth <= 2 ? 'winter' : 'summer'
    
    const restrictions = SEASONAL_RESTRICTIONS[currentSeason]
    if (!restrictions.languages.includes(currentLanguage)) return false
    
    return restrictions.restricted.some(restriction => 
      text.toLowerCase().includes(restriction.toLowerCase())
    )
  }, [currentLanguage])

  // Detect user language
  const detectUserLanguage = useCallback(async (): Promise<LanguageDetection> => {
    return detectLanguage()
  }, [])

  // Get text direction
  const getLanguageDirection = useCallback((): 'ltr' | 'rtl' => {
    return SUPPORTED_LANGUAGES[currentLanguage]?.direction || 'ltr'
  }, [currentLanguage])

  // Check if current language is Indigenous
  const isIndigenousLanguage = useCallback((): boolean => {
    return SUPPORTED_LANGUAGES[currentLanguage]?.isIndigenous || false
  }, [currentLanguage])

  // Check if language has audio support
  const hasAudioSupport = useCallback((): boolean => {
    const language = SUPPORTED_LANGUAGES[currentLanguage]
    return language?.culturalNotes?.pronunciationAvailable || false
  }, [currentLanguage])

  // Get localization settings
  const localizationSettings = LOCALIZATION_SETTINGS[currentLanguage] || LOCALIZATION_SETTINGS[DEFAULT_LANGUAGE]

  const value: TranslationContextValue = {
    currentLanguage,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    translations,
    localizationSettings,
    isLoading,
    error,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    checkProtocol,
    isSacredTerm,
    hasSeasonalRestriction,
    detectUserLanguage,
    getLanguageDirection,
    isIndigenousLanguage,
    hasAudioSupport
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

// Hook to use translation context
export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return context
}

// HOC for components that need translations
export function withTranslation<P extends object>(
  Component: React.ComponentType<P & { t: TranslationContextValue['t'] }>
) {
  return function WithTranslationComponent(props: P) {
    const { t } = useTranslation()
    return <Component {...props} t={t} />
  }
}