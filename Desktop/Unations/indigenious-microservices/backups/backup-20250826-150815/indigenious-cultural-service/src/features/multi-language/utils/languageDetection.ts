// Language Detection Utilities
// Functions for detecting user's preferred language

import { LanguageCode, LanguageDetection } from '../types/translation.types'
import { logger } from '@/lib/monitoring/logger';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../config/languages'

// Detect user's preferred language
export async function detectLanguage(): Promise<LanguageDetection> {
  const detection: LanguageDetection = {
    detectedLanguage: DEFAULT_LANGUAGE,
    confidence: 0,
    method: 'default',
    fallbackLanguage: DEFAULT_LANGUAGE,
    browserLanguages: []
  }

  // 1. Check saved user preference
  const savedPreference = localStorage.getItem('preferred_language') as LanguageCode
  if (savedPreference && SUPPORTED_LANGUAGES[savedPreference]) {
    detection.detectedLanguage = savedPreference
    detection.confidence = 100
    detection.method = 'user_preference'
    detection.userPreference = savedPreference
    return detection
  }

  // 2. Check browser languages
  const browserLanguages = getBrowserLanguages()
  detection.browserLanguages = browserLanguages
  
  for (const lang of browserLanguages) {
    const matchedLang = matchBrowserLanguage(lang)
    if (matchedLang) {
      detection.detectedLanguage = matchedLang
      detection.confidence = 80
      detection.method = 'browser'
      break
    }
  }

  // 3. Check geolocation (if available)
  try {
    const location = await detectLocation()
    if (location) {
      detection.location = location
      const geoLanguage = getLanguageFromLocation(location)
      if (geoLanguage && detection.confidence < 60) {
        detection.detectedLanguage = geoLanguage
        detection.confidence = 60
        detection.method = 'geolocation'
      }
    }
  } catch (error) {
    // Geolocation failed, continue with other methods
  }

  // Set fallback
  detection.fallbackLanguage = DEFAULT_LANGUAGE

  return detection
}

// Get browser languages
function getBrowserLanguages(): string[] {
  const languages: string[] = []
  
  // Navigator languages
  if (navigator.languages && navigator.languages.length > 0) {
    languages.push(...navigator.languages)
  } else if (navigator.language) {
    languages.push(navigator.language)
  }

  // Legacy IE support
  if ((navigator as unknown).userLanguage) {
    languages.push((navigator as unknown).userLanguage)
  }
  if ((navigator as unknown).browserLanguage) {
    languages.push((navigator as unknown).browserLanguage)
  }

  // Remove duplicates and normalize
  return [...new Set(languages.map(lang => lang.toLowerCase()))]
}

// Match browser language to supported language
function matchBrowserLanguage(browserLang: string): LanguageCode | null {
  // Direct match
  const directMatch = Object.keys(SUPPORTED_LANGUAGES).find(
    code => code === browserLang
  )
  if (directMatch) return directMatch as LanguageCode

  // Match by language code (e.g., 'en-US' -> 'en')
  const langCode = browserLang.split('-')[0]
  const codeMatch = Object.keys(SUPPORTED_LANGUAGES).find(
    code => code === langCode
  )
  if (codeMatch) return codeMatch as LanguageCode

  // Special mappings for Indigenous languages
  const indigenousMap: Record<string, LanguageCode> = {
    'oj': 'oj',
    'ojw': 'oj',
    'cr': 'cr',
    'cre': 'cr',
    'iu': 'iu',
    'iku': 'iu',
    'mic': 'mic',
    'moh': 'moh',
    'den': 'den',
    'bla': 'bla',
    'chr': 'chr'
  }

  const indigenousMatch = indigenousMap[langCode]
  if (indigenousMatch && SUPPORTED_LANGUAGES[indigenousMatch]) {
    return indigenousMatch
  }

  return null
}

// Detect user location using IP geolocation
async function detectLocation(): Promise<{
  country: string
  region: string
  city: string
} | null> {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/')
    if (!response.ok) return null
    
    const data = await response.json()
    return {
      country: data.country_code || '',
      region: data.region || '',
      city: data.city || ''
    }
  } catch (error) {
    logger.error('Failed to detect location:', error)
    return null
  }
}

// Get language from location
function getLanguageFromLocation(location: {
  country: string
  region: string
  city: string
}): LanguageCode | null {
  // Canada regions
  if (location.country === 'CA') {
    // Quebec - French
    if (location.region === 'QC') {
      return 'fr'
    }
    
    // Indigenous regions
    const indigenousRegions: Record<string, LanguageCode> = {
      'NU': 'iu', // Nunavut - Inuktitut
      'NT': 'den', // Northwest Territories - Dene
      'YT': 'den', // Yukon - Dene
    }
    
    const regionLang = indigenousRegions[location.region]
    if (regionLang && SUPPORTED_LANGUAGES[regionLang]) {
      return regionLang
    }
    
    // Default to English for other Canadian regions
    return 'en'
  }

  // US regions with significant Indigenous populations
  if (location.country === 'US') {
    const stateLanguages: Record<string, LanguageCode> = {
      'OK': 'chr', // Oklahoma - Cherokee
      'AZ': 'den', // Arizona - Dene/Navajo
      'NM': 'den', // New Mexico - Dene/Navajo
      'MT': 'bla', // Montana - Blackfoot
      'ND': 'oj', // North Dakota - Ojibwe
      'MN': 'oj', // Minnesota - Ojibwe
      'WI': 'oj', // Wisconsin - Ojibwe
      'MI': 'oj', // Michigan - Ojibwe
    }
    
    const stateLang = stateLanguages[location.region]
    if (stateLang && SUPPORTED_LANGUAGES[stateLang]) {
      return stateLang
    }
  }

  return null
}

// Check if language is supported
export function isLanguageSupported(language: string): boolean {
  return !!SUPPORTED_LANGUAGES[language as LanguageCode]
}

// Get closest supported language
export function getClosestSupportedLanguage(language: string): LanguageCode {
  // Check if directly supported
  if (isLanguageSupported(language)) {
    return language as LanguageCode
  }

  // Try to match by language code
  const langCode = language.split('-')[0]
  const match = matchBrowserLanguage(langCode)
  if (match) return match

  // Default fallback
  return DEFAULT_LANGUAGE
}

// Get language display name
export function getLanguageDisplayName(
  language: LanguageCode, 
  displayIn: LanguageCode = 'en'
): string {
  const lang = SUPPORTED_LANGUAGES[language]
  if (!lang) return language

  // Return native name if displaying in same language
  if (language === displayIn || displayIn === language) {
    return lang.nativeName
  }

  // Otherwise return standard name
  return lang.name
}

// Check if user is in an Indigenous region
export async function isInIndigenousRegion(): Promise<boolean> {
  try {
    const location = await detectLocation()
    if (!location) return false

    // Check Canadian Indigenous territories
    if (location.country === 'CA') {
      const indigenousTerritories = ['NU', 'NT', 'YT']
      if (indigenousTerritories.includes(location.region)) {
        return true
      }
    }

    // Check US states with significant Indigenous populations
    if (location.country === 'US') {
      const indigenousStates = ['OK', 'AZ', 'NM', 'MT', 'ND', 'MN', 'WI', 'MI', 'AK']
      if (indigenousStates.includes(location.region)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}