// Translation System Types
// Multi-language support type definitions

export type LanguageCode = 
  | 'en'    // English
  | 'fr'    // French
  | 'oj'    // Ojibwe
  | 'cr'    // Cree
  | 'iu'    // Inuktitut
  | 'mic'   // Mi'kmaq
  | 'moh'   // Mohawk
  | 'den'   // Dene
  | 'bla'   // Blackfoot
  | 'chr'   // Cherokee

export type LanguageDirection = 'ltr' | 'rtl'

export interface Language {
  code: LanguageCode
  name: string
  nativeName: string
  direction: LanguageDirection
  flag?: string
  script?: 'latin' | 'syllabics' | 'syllabary'
  isIndigenous: boolean
  nation?: string
  dialects?: string[]
  writingSystems?: Array<{
    name: string
    script: string
    isDefault: boolean
  }>
  culturalNotes?: {
    sacredTerms?: string[]
    seasonalRestrictions?: Record<string, string[]>
    pronunciationAvailable?: boolean
    elderApproval?: boolean
  }
}

export interface Translation {
  key: string
  value: string
  context?: string
  namespace?: string
  lastUpdated: string
  updatedBy: string
  approved: boolean
  culturallyVerified?: boolean
  alternates?: string[]
  pronunciation?: {
    audioUrl?: string
    phonetic?: string
    elderRecording?: boolean
  }
  metadata?: {
    gender?: 'neutral' | 'masculine' | 'feminine'
    formality?: 'formal' | 'informal'
    domain?: string
    notes?: string
  }
}

export interface TranslationNamespace {
  common: Record<string, string>
  navigation: Record<string, string>
  forms: Record<string, string>
  errors: Record<string, string>
  success: Record<string, string>
  procurement: Record<string, string>
  business: Record<string, string>
  cultural: Record<string, string>
  legal: Record<string, string>
  help: Record<string, string>
}

export interface LocalizationSettings {
  dateFormat: string
  timeFormat: string
  numberFormat: {
    decimal: string
    thousands: string
    grouping: number[]
  }
  currency: {
    code: string
    symbol: string
    position: 'before' | 'after'
  }
  calendar?: {
    type: 'gregorian' | 'traditional'
    firstDayOfWeek: number
    traditionalMonths?: string[]
    ceremonies?: Array<{
      name: string
      date: string
      restrictions?: string[]
    }>
  }
  measurements?: {
    system: 'metric' | 'imperial' | 'traditional'
    units?: Record<string, string>
  }
}

export interface TranslationStatus {
  language: LanguageCode
  coverage: number
  lastSync: string
  pendingTranslations: number
  approvedTranslations: number
  culturallyVerified: number
  missingKeys: string[]
  needsUpdate: string[]
}

export interface PronunciationData {
  id: string
  language: LanguageCode
  text: string
  audioUrl: string
  speaker: {
    name: string
    role: 'elder' | 'teacher' | 'native_speaker'
    nation?: string
    dialect?: string
  }
  recordedAt: string
  approved: boolean
  metadata?: {
    gender?: string
    age?: string
    formality?: string
    context?: string
  }
}

export interface TranslationRequest {
  key: string
  sourceLanguage: LanguageCode
  targetLanguage: LanguageCode
  context?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requestedBy: string
  requestedAt: string
  deadline?: string
  culturalSensitivity?: 'standard' | 'sensitive' | 'sacred'
  notes?: string
}

export interface LanguageDetection {
  detectedLanguage: LanguageCode
  confidence: number
  method: 'user_preference' | 'browser' | 'geolocation' | 'default'
  fallbackLanguage: LanguageCode
  userPreference?: LanguageCode
  browserLanguages: string[]
  location?: {
    country: string
    region: string
    city: string
  }
}

export interface TranslationError {
  key: string
  language: LanguageCode
  error: string
  fallbackUsed: boolean
  timestamp: string
}

export interface CulturalProtocol {
  id: string
  languages: LanguageCode[]
  type: 'sacred_term' | 'seasonal' | 'ceremonial' | 'gender_specific' | 'age_specific'
  description: string
  restrictions: {
    timeRestrictions?: {
      seasons?: string[]
      months?: number[]
      ceremonies?: string[]
    }
    accessRestrictions?: {
      roles?: string[]
      nations?: string[]
      age?: { min?: number; max?: number }
      gender?: string[]
    }
    usageGuidelines?: string[]
  }
  alternatives?: Record<LanguageCode, string[]>
  elderGuidance?: string
}

export interface TranslationMemory {
  id: string
  sourceText: string
  sourceLanguage: LanguageCode
  translations: Record<LanguageCode, {
    text: string
    quality: number
    verified: boolean
    usageCount: number
    lastUsed: string
  }>
  domain?: string
  context?: string
  tags?: string[]
}

export interface LanguageResource {
  language: LanguageCode
  type: 'dictionary' | 'grammar' | 'pronunciation' | 'cultural_guide'
  title: string
  url?: string
  fileUrl?: string
  description: string
  author: string
  publishedDate: string
  tags: string[]
  accessLevel: 'public' | 'registered' | 'indigenous_only' | 'elder_approved'
}

export interface TranslationAnalytics {
  language: LanguageCode
  period: string
  metrics: {
    views: number
    uniqueUsers: number
    translationRequests: number
    audioPlays: number
    errors: number
    performance: {
      avgLoadTime: number
      cacheHitRate: number
    }
  }
  popularTranslations: Array<{
    key: string
    count: number
  }>
  userFeedback: {
    ratings: Record<number, number>
    avgRating: number
    comments: number
  }
}

// Pluralization rules for different languages
export interface PluralizationRule {
  language: LanguageCode
  rules: Array<{
    min: number
    max?: number
    form: string
  }>
  examples?: Record<string, string[]>
}

// Number formatting for traditional counting systems
export interface TraditionalNumberSystem {
  language: LanguageCode
  system: string
  numbers: Record<number, string>
  rules?: {
    compound?: (tens: number, ones: number) => string
    ordinal?: (n: number) => string
  }
  culturalContext?: string
}