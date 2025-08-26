// Translation Service
// Service for managing translations, loading language packs, and caching

import { 
  LanguageCode, 
  TranslationNamespace, 
  Translation,
  TranslationRequest,
  TranslationStatus,
  TranslationMemory,
  TranslationError
} from '../types/translation.types'
import { logger } from '@/lib/monitoring/logger';
import { FALLBACK_LANGUAGE, TRANSLATION_PRIORITY } from '../config/languages'

export class TranslationService {
  private cache: Map<LanguageCode, Partial<TranslationNamespace>>
  private memoryCache: Map<string, TranslationMemory>
  private loadingPromises: Map<LanguageCode, Promise<Partial<TranslationNamespace>>>

  constructor() {
    this.cache = new Map()
    this.memoryCache = new Map()
    this.loadingPromises = new Map()

    // Load cached translations from localStorage
    this.loadCachedTranslations()
  }

  // Load translations for a language
  async loadTranslations(language: LanguageCode): Promise<Partial<TranslationNamespace>> {
    // Check cache first
    if (this.cache.has(language)) {
      return this.cache.get(language)!
    }

    // Check if already loading
    if (this.loadingPromises.has(language)) {
      return this.loadingPromises.get(language)!
    }

    // Start loading
    const loadPromise = this.fetchTranslations(language)
    this.loadingPromises.set(language, loadPromise)

    try {
      const translations = await loadPromise
      this.cache.set(language, translations)
      this.saveCachedTranslations(language, translations)
      return translations
    } finally {
      this.loadingPromises.delete(language)
    }
  }

  // Fetch translations from server/CDN
  private async fetchTranslations(language: LanguageCode): Promise<Partial<TranslationNamespace>> {
    try {
      // In production, this would fetch from a CDN or API
      // For now, return mock translations
      const translations = await this.getMockTranslations(language)
      return translations
    } catch (error) {
      logger.error(`Failed to fetch translations for ${language}:`, error)
      
      // Fallback to default language
      if (language !== FALLBACK_LANGUAGE) {
        return this.loadTranslations(FALLBACK_LANGUAGE)
      }
      
      // Return empty translations as last resort
      return this.getEmptyTranslations()
    }
  }

  // Get translation for a specific key
  async getTranslation(
    key: string, 
    language: LanguageCode, 
    namespace: keyof TranslationNamespace = 'common'
  ): Promise<string> {
    const translations = await this.loadTranslations(language)
    const namespaceTranslations = translations[namespace]
    
    if (namespaceTranslations && namespaceTranslations[key]) {
      return namespaceTranslations[key]
    }

    // Try fallback language
    if (language !== FALLBACK_LANGUAGE) {
      const fallbackTranslations = await this.loadTranslations(FALLBACK_LANGUAGE)
      const fallbackNamespace = fallbackTranslations[namespace]
      
      if (fallbackNamespace && fallbackNamespace[key]) {
        return fallbackNamespace[key]
      }
    }

    // Return key as last resort
    return key
  }

  // Get translation status for a language
  async getTranslationStatus(language: LanguageCode): Promise<TranslationStatus> {
    const translations = await this.loadTranslations(language)
    const allKeys = this.getAllTranslationKeys()
    const translatedKeys = this.getTranslatedKeys(translations)
    
    const missingKeys = allKeys.filter(key => !translatedKeys.includes(key))
    const coverage = (translatedKeys.length / allKeys.length) * 100

    return {
      language,
      coverage,
      lastSync: new Date().toISOString(),
      pendingTranslations: missingKeys.length,
      approvedTranslations: translatedKeys.length,
      culturallyVerified: Math.floor(translatedKeys.length * 0.8), // Mock
      missingKeys,
      needsUpdate: []
    }
  }

  // Submit translation request
  async submitTranslationRequest(request: TranslationRequest): Promise<void> {
    // In production, this would submit to a translation queue
    logger.info('Translation request submitted:', request)
    
    // Store in localStorage for demo
    const requests = this.getStoredTranslationRequests()
    requests.push(request)
    localStorage.setItem('translation_requests', JSON.stringify(requests))
  }

  // Get translation from memory (for repeated translations)
  getFromMemory(
    sourceText: string, 
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode
  ): string | null {
    const key = `${sourceLanguage}:${targetLanguage}:${sourceText}`
    const memory = this.memoryCache.get(key)
    
    if (memory && memory.translations[targetLanguage]) {
      const translation = memory.translations[targetLanguage]
      // Update usage count
      translation.usageCount++
      translation.lastUsed = new Date().toISOString()
      return translation.text
    }
    
    return null
  }

  // Add translation to memory
  addToMemory(
    sourceText: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    translatedText: string,
    verified: boolean = false
  ): void {
    const key = `${sourceLanguage}:${targetLanguage}:${sourceText}`
    
    const memory: TranslationMemory = this.memoryCache.get(key) || {
      id: key,
      sourceText,
      sourceLanguage,
      translations: {}
    }

    memory.translations[targetLanguage] = {
      text: translatedText,
      quality: verified ? 1 : 0.8,
      verified,
      usageCount: 1,
      lastUsed: new Date().toISOString()
    }

    this.memoryCache.set(key, memory)
  }

  // Clear cache for a language
  clearCache(language?: LanguageCode): void {
    if (language) {
      this.cache.delete(language)
      localStorage.removeItem(`translations_${language}`)
    } else {
      this.cache.clear()
      // Clear all translation keys from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('translations_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  // Private helper methods

  private loadCachedTranslations(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('translations_')) {
        const language = key.replace('translations_', '') as LanguageCode
        try {
          const cached = JSON.parse(localStorage.getItem(key) || '{}')
          this.cache.set(language, cached)
        } catch (error) {
          logger.error(`Failed to load cached translations for ${language}:`, error)
        }
      }
    })
  }

  private saveCachedTranslations(
    language: LanguageCode, 
    translations: Partial<TranslationNamespace>
  ): void {
    try {
      localStorage.setItem(`translations_${language}`, JSON.stringify(translations))
    } catch (error) {
      logger.error(`Failed to cache translations for ${language}:`, error)
    }
  }

  private getStoredTranslationRequests(): TranslationRequest[] {
    try {
      return JSON.parse(localStorage.getItem('translation_requests') || '[]')
    } catch {
      return []
    }
  }

  private getAllTranslationKeys(): string[] {
    // In production, this would come from a master list
    // For now, return a subset
    return [
      'common.welcome',
      'common.submit',
      'common.cancel',
      'common.save',
      'common.delete',
      'navigation.home',
      'navigation.dashboard',
      'navigation.profile',
      'navigation.settings',
      'navigation.logout'
    ]
  }

  private getTranslatedKeys(translations: Partial<TranslationNamespace>): string[] {
    const keys: string[] = []
    
    Object.entries(translations).forEach(([namespace, values]) => {
      if (values) {
        Object.keys(values).forEach(key => {
          keys.push(`${namespace}.${key}`)
        })
      }
    })
    
    return keys
  }

  private getEmptyTranslations(): Partial<TranslationNamespace> {
    return {
      common: {},
      navigation: {},
      forms: {},
      errors: {},
      success: {},
      procurement: {},
      business: {},
      cultural: {},
      legal: {},
      help: {}
    }
  }

  // Mock translations for development
  private async getMockTranslations(language: LanguageCode): Promise<Partial<TranslationNamespace>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const translations: Record<LanguageCode, Partial<TranslationNamespace>> = {
      en: {
        common: {
          welcome: 'Welcome',
          submit: 'Submit',
          cancel: 'Cancel',
          save: 'Save',
          delete: 'Delete',
          search: 'Search',
          filter: 'Filter',
          loading: 'Loading...',
          error: 'Error',
          success: 'Success',
          'time.just_now': 'Just now',
          'time.minutes_ago': '{{count}} minutes ago',
          'time.hours_ago': '{{count}} hours ago',
          'time.yesterday': 'Yesterday',
          'time.days_ago': '{{count}} days ago',
          'time.weeks_ago': '{{count}} weeks ago',
          'greetings.morning': 'Good morning',
          'greetings.afternoon': 'Good afternoon',
          'greetings.evening': 'Good evening',
          'greetings.night': 'Good night',
          'list.two_items': '{{item1}} and {{item2}}',
          'list.many_items': '{{items}}, and {{lastItem}}'
        },
        navigation: {
          home: 'Home',
          dashboard: 'Dashboard',
          profile: 'Profile',
          settings: 'Settings',
          logout: 'Logout',
          help: 'Help',
          about: 'About',
          contact: 'Contact'
        },
        procurement: {
          rfq: 'Request for Quote',
          bid: 'Bid',
          contract: 'Contract',
          vendor: 'Vendor',
          supplier: 'Supplier',
          'submit_bid': 'Submit Bid',
          'view_rfq': 'View RFQ',
          'bid_status': 'Bid Status'
        }
      },
      fr: {
        common: {
          welcome: 'Bienvenue',
          submit: 'Soumettre',
          cancel: 'Annuler',
          save: 'Enregistrer',
          delete: 'Supprimer',
          search: 'Rechercher',
          filter: 'Filtrer',
          loading: 'Chargement...',
          error: 'Erreur',
          success: 'Succès',
          'time.just_now': 'À l\'instant',
          'time.minutes_ago': 'Il y a {{count}} minutes',
          'time.hours_ago': 'Il y a {{count}} heures',
          'time.yesterday': 'Hier',
          'time.days_ago': 'Il y a {{count}} jours',
          'time.weeks_ago': 'Il y a {{count}} semaines',
          'greetings.morning': 'Bonjour',
          'greetings.afternoon': 'Bon après-midi',
          'greetings.evening': 'Bonsoir',
          'greetings.night': 'Bonne nuit',
          'list.two_items': '{{item1}} et {{item2}}',
          'list.many_items': '{{items}}, et {{lastItem}}'
        },
        navigation: {
          home: 'Accueil',
          dashboard: 'Tableau de bord',
          profile: 'Profil',
          settings: 'Paramètres',
          logout: 'Déconnexion',
          help: 'Aide',
          about: 'À propos',
          contact: 'Contact'
        },
        procurement: {
          rfq: 'Demande de devis',
          bid: 'Soumission',
          contract: 'Contrat',
          vendor: 'Fournisseur',
          supplier: 'Fournisseur',
          'submit_bid': 'Soumettre une offre',
          'view_rfq': 'Voir la demande',
          'bid_status': 'Statut de l\'offre'
        }
      },
      oj: {
        common: {
          welcome: 'Aaniin',
          submit: 'Maajitoon',
          cancel: 'Gaawiin',
          save: 'Ganawendan',
          delete: 'Gashkitoon',
          search: 'Nandawab',
          filter: 'Zhiibaayige',
          loading: 'Ani-ozhibii\'ige...',
          error: 'Gawanaaji\'iwe',
          success: 'Gii-minose',
          'time.just_now': 'Noongom',
          'greetings.morning': 'Waaban aaniin',
          'greetings.afternoon': 'Naawakwe aaniin',
          'greetings.evening': 'Onaagoshi aaniin',
          'greetings.night': 'Gichi-dibik aaniin'
        },
        navigation: {
          home: 'Endaayan',
          dashboard: 'Mazina\'igan',
          profile: 'Gidizhinikaaz',
          settings: 'Ozhibii\'igewinan',
          logout: 'Zaagijii',
          help: 'Wiidookaw',
          about: 'Aaniish',
          contact: 'Ganoonidiwag'
        }
      },
      cr: {
        common: {
          welcome: 'Tânisi',
          submit: 'Pakitina',
          cancel: 'Pôni',
          save: 'Kanawêyihta',
          delete: 'Kasîhkwê',
          search: 'Nantona',
          filter: 'Cîpayihcikê',
          loading: 'Pêyako...',
          error: 'Mayatan',
          success: 'Miywasin',
          'greetings.morning': 'Kîkisêpâ wâciyê',
          'greetings.afternoon': 'Âpihtâ-kîsikâw wâciyê',
          'greetings.evening': 'Otâkosîn wâciyê',
          'greetings.night': 'Tipiskâw wâciyê'
        },
        navigation: {
          home: 'Wîkiwin',
          dashboard: 'Masinahikêwin',
          profile: 'Kiyipa',
          settings: 'Itastâwin',
          logout: 'Wayawî',
          help: 'Wîcihisowin',
          about: 'Tânisi ôma',
          contact: 'Pîkiskwêwin'
        }
      },
      iu: {
        common: {
          welcome: 'ᐊᐃ',
          submit: 'ᐊᐃᔪᖅ',
          cancel: 'ᖁᔭᓈᖅᑐᖅ',
          save: 'ᑐᖅᑯᖅᓯᒪᔪᖅ',
          delete: 'ᐲᖅᓯᓂᖅ',
          search: 'ᕿᓂᕐᓂᖅ',
          filter: 'ᐊᕕᒃᓯᓂᖅ',
          loading: 'ᐅᑕᖅᑭᔪᖅ...',
          error: 'ᐊᔪᕐᓇᖅᑐᖅ',
          success: 'ᐊᔪᕐᓇᖏᑦᑐᖅ'
        }
      },
      mic: {
        common: {
          welcome: 'Pjila\'si',
          submit: 'Nata\'tu',
          cancel: 'Mu\'k',
          save: 'Kelu\'k',
          delete: 'Jikla\'tu',
          search: 'Kwilm',
          filter: 'Etekl',
          loading: 'Elukwet...',
          error: 'Aqq wen',
          success: 'Kelu\'lk'
        }
      },
      moh: {
        common: {
          welcome: 'Shé:kon',
          submit: 'Kahrí:wahk',
          cancel: 'Tóka\'',
          save: 'Yeyenawa\'se\'',
          delete: 'Yékhons',
          search: 'Sá:wen',
          filter: 'Tekhahsí:yo',
          loading: 'Yotshá:niht...',
          error: 'Yáh tekarihwayén:teri',
          success: 'Yoyá:ner'
        }
      },
      den: {
        common: {
          welcome: 'Dënë́',
          submit: 'Dënë́yatié',
          cancel: 'Íle',
          save: 'Nëdhë',
          delete: 'Dëghëlchú',
          search: 'Dëłtth\'ë',
          loading: 'Dëdí...',
          error: 'Dëłk\'ë',
          success: 'Hóʔą'
        }
      },
      bla: {
        common: {
          welcome: 'Oki',
          submit: 'Isttohkita',
          cancel: 'Saa',
          save: 'Ikimmat',
          delete: 'Aisttsiksaa',
          search: 'Amo',
          filter: 'Iksstoo',
          loading: 'Iihtsiip...',
          error: 'Mataps',
          success: 'Sokapi'
        }
      },
      chr: {
        common: {
          welcome: 'ᎣᏏᏲ',
          submit: 'ᎠᏓᏅᏖᏗ',
          cancel: 'ᎠᏕᏘᏗ',
          save: 'ᎠᏍᏆᏗᏍᏗ',
          delete: 'ᎠᏍᏆᏙᏗ',
          search: 'ᎠᏓᏡᏗ',
          filter: 'ᎠᏒᏔᏂᏗ',
          loading: 'ᎠᏓᏪᎳᏗᏍᏗ...',
          error: 'ᎤᏓᎵᏍᏔᏅ',
          success: 'ᎣᏍᏓ'
        }
      }
    }

    return translations[language] || translations[FALLBACK_LANGUAGE]
  }
}