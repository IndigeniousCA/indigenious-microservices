// Multi-Language Support Feature Exports

// Context and Provider
export { TranslationProvider, useTranslation } from './contexts/TranslationContext'

// Components
export { LanguageSwitcher } from './components/LanguageSwitcher'
export { 
  LocalizedText, 
  LocalizedHeading, 
  LocalizedParagraph, 
  LocalizedButton 
} from './components/LocalizedText'
export { 
  LocalizedDate, 
  LocalizedDateRange, 
  LocalizedRelativeTime 
} from './components/LocalizedDate'
export { 
  LocalizedNumber, 
  AnimatedNumber, 
  LocalizedStat, 
  LocalizedNumberRange 
} from './components/LocalizedNumber'
export { PronunciationPlayer } from './components/PronunciationPlayer'

// Hooks
export { useTranslation, useTranslationHelpers } from './hooks/useTranslation'

// Services
export { TranslationService } from './services/TranslationService'

// Utilities
export { 
  detectLanguage, 
  isLanguageSupported, 
  getClosestSupportedLanguage,
  getLanguageDisplayName,
  isInIndigenousRegion 
} from './utils/languageDetection'
export {
  checkCulturalProtocols,
  getCulturalAlternatives,
  isContentAllowedNow,
  getProtocolGuidance,
  sanitizeRestrictedContent,
  getCulturalContext
} from './utils/culturalProtocols'

// Types
export type {
  LanguageCode,
  Language,
  Translation,
  TranslationNamespace,
  LocalizationSettings,
  TranslationStatus,
  PronunciationData,
  TranslationRequest,
  LanguageDetection,
  CulturalProtocol,
  TranslationError,
  TranslationMemory,
  LanguageResource,
  TranslationAnalytics,
  PluralizationRule,
  TraditionalNumberSystem
} from './types/translation.types'

// Configuration
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  LOCALIZATION_SETTINGS,
  LANGUAGE_FAMILIES,
  RTL_LANGUAGES,
  AUDIO_SUPPORTED_LANGUAGES,
  SPECIAL_FONT_LANGUAGES,
  TRANSLATION_PRIORITY,
  SACRED_TERMS,
  SEASONAL_RESTRICTIONS,
  PLURALIZATION_RULES
} from './config/languages'