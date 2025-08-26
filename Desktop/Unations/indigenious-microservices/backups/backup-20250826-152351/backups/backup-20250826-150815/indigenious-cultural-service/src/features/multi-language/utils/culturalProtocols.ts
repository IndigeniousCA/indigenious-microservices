// Cultural Protocols Utilities
// Functions for handling cultural sensitivities in translations

import { CulturalProtocol, LanguageCode } from '../types/translation.types'
import { SACRED_TERMS, SEASONAL_RESTRICTIONS } from '../config/languages'

// Cultural protocol definitions
const CULTURAL_PROTOCOLS: CulturalProtocol[] = [
  {
    id: 'sacred-terms',
    languages: ['oj', 'cr', 'mic', 'moh', 'den', 'bla', 'chr'],
    type: 'sacred_term',
    description: 'Sacred terms should be used respectfully and with proper context',
    restrictions: {
      usageGuidelines: [
        'Should not be used casually or out of context',
        'Requires understanding of cultural significance',
        'May require elder permission for certain uses'
      ]
    },
    elderGuidance: 'Consult with elders before using sacred terms in formal contexts'
  },
  {
    id: 'seasonal-ceremonies',
    languages: ['oj', 'cr'],
    type: 'seasonal',
    description: 'Certain ceremonial terms have seasonal restrictions',
    restrictions: {
      timeRestrictions: {
        seasons: ['winter'],
        months: [11, 0, 1, 2] // November through February
      },
      usageGuidelines: [
        'Some stories and teachings are only shared in winter',
        'Certain ceremonies are season-specific'
      ]
    },
    elderGuidance: 'Traditional teachings about seasonal protocols vary by community'
  },
  {
    id: 'gender-specific',
    languages: ['oj', 'cr', 'mic'],
    type: 'gender_specific',
    description: 'Some terms and teachings are gender-specific',
    restrictions: {
      accessRestrictions: {
        gender: ['specific']
      },
      usageGuidelines: [
        'Respect traditional gender roles in ceremonial contexts',
        'Some teachings are specifically for men or women'
      ]
    }
  },
  {
    id: 'age-specific',
    languages: ['oj', 'cr', 'moh'],
    type: 'age_specific',
    description: 'Certain knowledge is shared based on age and maturity',
    restrictions: {
      accessRestrictions: {
        age: { min: 18 }
      },
      usageGuidelines: [
        'Some teachings are only for adults',
        'Youth have specific protocols for learning'
      ]
    }
  },
  {
    id: 'ceremonial-context',
    languages: ['oj', 'cr', 'mic', 'moh', 'den', 'bla'],
    type: 'ceremonial',
    description: 'Ceremonial language requires proper protocol',
    restrictions: {
      timeRestrictions: {
        ceremonies: ['Sundance', 'Sweat Lodge', 'Pipe Ceremony']
      },
      usageGuidelines: [
        'Should only be used in ceremonial contexts',
        'Requires proper preparation and protocol',
        'Not for casual or commercial use'
      ]
    },
    alternatives: {
      en: ['ceremony', 'gathering', 'spiritual practice'],
      fr: ['cérémonie', 'rassemblement', 'pratique spirituelle']
    }
  }
]

// Check if text contains cultural protocols
export function checkCulturalProtocols(
  text: string, 
  language: LanguageCode
): CulturalProtocol | null {
  const lowerText = text.toLowerCase()

  // Check each protocol
  for (const protocol of CULTURAL_PROTOCOLS) {
    // Skip if language not affected
    if (!protocol.languages.includes(language)) continue

    // Check based on protocol type
    switch (protocol.type) {
      case 'sacred_term':
        if (containsSacredTerms(lowerText)) {
          return protocol
        }
        break

      case 'seasonal':
        if (containsSeasonalContent(lowerText, language)) {
          return protocol
        }
        break

      case 'ceremonial':
        if (containsCeremonialTerms(lowerText)) {
          return protocol
        }
        break
    }
  }

  return null
}

// Check if text contains sacred terms
function containsSacredTerms(text: string): boolean {
  return SACRED_TERMS.some(term => 
    text.includes(term.toLowerCase())
  )
}

// Check if text contains seasonal content
function containsSeasonalContent(text: string, language: LanguageCode): boolean {
  const currentMonth = new Date().getMonth()
  const currentSeason = getSeasonFromMonth(currentMonth)

  const restrictions = SEASONAL_RESTRICTIONS[currentSeason]
  if (!restrictions.languages.includes(language)) return false

  return restrictions.restricted.some(term => 
    text.includes(term.toLowerCase())
  )
}

// Check if text contains ceremonial terms
function containsCeremonialTerms(text: string): boolean {
  const ceremonialTerms = [
    'sundance', 'sun dance',
    'sweat lodge', 'sweatlodge',
    'pipe ceremony', 'sacred pipe',
    'smudge', 'smudging',
    'vision quest',
    'naming ceremony',
    'medicine wheel',
    'talking circle',
    'powwow', 'pow wow'
  ]

  return ceremonialTerms.some(term => 
    text.includes(term)
  )
}

// Get season from month
function getSeasonFromMonth(month: number): 'winter' | 'summer' {
  return (month >= 11 || month <= 2) ? 'winter' : 'summer'
}

// Get appropriate alternatives for restricted content
export function getCulturalAlternatives(
  text: string,
  protocol: CulturalProtocol,
  targetLanguage: LanguageCode
): string[] {
  if (!protocol.alternatives) return []
  
  return protocol.alternatives[targetLanguage] || protocol.alternatives['en'] || []
}

// Check if current time allows content
export function isContentAllowedNow(protocol: CulturalProtocol): boolean {
  if (!protocol.restrictions.timeRestrictions) return true

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentSeason = getSeasonFromMonth(currentMonth)

  // Check seasonal restrictions
  if (protocol.restrictions.timeRestrictions.seasons) {
    if (!protocol.restrictions.timeRestrictions.seasons.includes(currentSeason)) {
      return false
    }
  }

  // Check monthly restrictions
  if (protocol.restrictions.timeRestrictions.months) {
    if (!protocol.restrictions.timeRestrictions.months.includes(currentMonth)) {
      return false
    }
  }

  return true
}

// Get guidance message for protocol
export function getProtocolGuidance(
  protocol: CulturalProtocol,
  language: LanguageCode
): string {
  // In production, this would return translated guidance
  const messages: Record<string, string> = {
    'sacred-terms': 'This content contains sacred terms that should be used respectfully.',
    'seasonal-ceremonies': 'This content has seasonal restrictions based on traditional protocols.',
    'gender-specific': 'This content may have gender-specific protocols.',
    'age-specific': 'This content may be restricted based on age or maturity.',
    'ceremonial-context': 'This content is meant for ceremonial contexts only.'
  }

  return messages[protocol.id] || protocol.description
}

// Sanitize text to remove or replace restricted content
export function sanitizeRestrictedContent(
  text: string,
  language: LanguageCode,
  replaceWith: string = '[restricted]'
): string {
  let sanitized = text

  // Check all protocols
  for (const protocol of CULTURAL_PROTOCOLS) {
    if (!protocol.languages.includes(language)) continue

    // Only sanitize if content not currently allowed
    if (!isContentAllowedNow(protocol)) {
      // Replace restricted terms
      if (protocol.type === 'sacred_term') {
        SACRED_TERMS.forEach(term => {
          const regex = new RegExp(term, 'gi')
          sanitized = sanitized.replace(regex, replaceWith)
        })
      }

      if (protocol.type === 'seasonal') {
        const currentSeason = getSeasonFromMonth(new Date().getMonth())
        const restrictions = SEASONAL_RESTRICTIONS[currentSeason]
        
        restrictions.restricted.forEach(term => {
          const regex = new RegExp(term, 'gi')
          sanitized = sanitized.replace(regex, replaceWith)
        })
      }
    }
  }

  return sanitized
}

// Get cultural context for a language
export function getCulturalContext(language: LanguageCode): {
  protocols: CulturalProtocol[]
  guidelines: string[]
  hasRestrictions: boolean
} {
  const protocols = CULTURAL_PROTOCOLS.filter(p => 
    p.languages.includes(language)
  )

  const guidelines = [
    ...new Set(protocols.flatMap(p => p.restrictions.usageGuidelines || []))
  ]

  return {
    protocols,
    guidelines,
    hasRestrictions: protocols.length > 0
  }
}