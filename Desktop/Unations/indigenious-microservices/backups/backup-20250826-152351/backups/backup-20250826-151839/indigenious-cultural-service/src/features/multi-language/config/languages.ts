// Language Configuration
// Supported languages and their settings

import type { Language, LocalizationSettings } from '../types/translation.types'

export const SUPPORTED_LANGUAGES: Record<string, Language> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇨🇦',
    script: 'latin',
    isIndigenous: false
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇨🇦',
    script: 'latin',
    isIndigenous: false
  },
  oj: {
    code: 'oj',
    name: 'Ojibwe',
    nativeName: 'Ojibwemowin',
    direction: 'ltr',
    isIndigenous: true,
    nation: 'Anishinaabe',
    script: 'latin',
    dialects: ['Eastern Ojibwe', 'Western Ojibwe', 'Northern Ojibwe'],
    writingSystems: [
      { name: 'Roman', script: 'latin', isDefault: true },
      { name: 'Syllabics', script: 'syllabics', isDefault: false }
    ],
    culturalNotes: {
      sacredTerms: ['manidoo', 'midewiwin'],
      seasonalRestrictions: {
        winter: ['certain ceremonies', 'specific teachings']
      },
      pronunciationAvailable: true,
      elderApproval: true
    }
  },
  cr: {
    code: 'cr',
    name: 'Cree',
    nativeName: 'Nēhiyawēwin',
    direction: 'ltr',
    isIndigenous: true,
    nation: 'Cree Nation',
    script: 'syllabics',
    dialects: ['Plains Cree', 'Woods Cree', 'Swampy Cree'],
    writingSystems: [
      { name: 'Syllabics', script: 'syllabics', isDefault: true },
      { name: 'Roman', script: 'latin', isDefault: false }
    ],
    culturalNotes: {
      pronunciationAvailable: true,
      elderApproval: true
    }
  },
  iu: {
    code: 'iu',
    name: 'Inuktitut',
    nativeName: 'ᐃᓄᒃᑎᑐᑦ',
    direction: 'ltr',
    isIndigenous: true,
    nation: 'Inuit',
    script: 'syllabics',
    writingSystems: [
      { name: 'Syllabics', script: 'syllabics', isDefault: true },
      { name: 'Roman', script: 'latin', isDefault: false }
    ],
    culturalNotes: {
      pronunciationAvailable: true,
      elderApproval: true
    }
  },
  mic: {
    code: 'mic',
    name: "Mi'kmaq",
    nativeName: "Mi'kmawi'simk",
    direction: 'ltr',
    isIndigenous: true,
    nation: "Mi'kmaq Nation",
    script: 'latin',
    writingSystems: [
      { name: 'Smith-Francis', script: 'latin', isDefault: true },
      { name: 'Listuguj', script: 'latin', isDefault: false }
    ],
    culturalNotes: {
      sacredTerms: ['Glooscap', 'Nuckanaw'],
      pronunciationAvailable: true,
      elderApproval: true
    }
  },
  moh: {
    code: 'moh',
    name: 'Mohawk',
    nativeName: 'Kanienʼkéha',
    direction: 'ltr',
    isIndigenous: true,
    nation: 'Haudenosaunee',
    script: 'latin',
    culturalNotes: {
      sacredTerms: ['Kayanerenkó:wa', 'Ohén:ton Karihwatéhkwen'],
      pronunciationAvailable: true,
      elderApproval: true
    }
  }
}

export const DEFAULT_LANGUAGE = 'en'
export const FALLBACK_LANGUAGE = 'en'

// Localization settings for each language
export const LOCALIZATION_SETTINGS: Record<string, LocalizationSettings> = {
  en: {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    currency: {
      code: 'CAD',
      symbol: '$',
      position: 'before'
    }
  },
  fr: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
      grouping: [3]
    },
    currency: {
      code: 'CAD',
      symbol: '$',
      position: 'after'
    }
  },
  oj: {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    currency: {
      code: 'CAD',
      symbol: '$',
      position: 'before'
    },
    calendar: {
      type: 'traditional',
      firstDayOfWeek: 0,
      traditionalMonths: [
        'Manidoo Giizis', // Spirit Moon (January)
        'Makwa Giizis', // Bear Moon (February)
        'Naabekamigaa Giizis', // Crust on Snow Moon (March)
        'Popogami Giizis', // Broken Snowshoe Moon (April)
        'Zaagibagaa Giizis', // Budding Moon (May)
        'Odemiini Giizis', // Strawberry Moon (June)
        'Aabita Niibino Giizis', // Halfway Summer Moon (July)
        'Manoominike Giizis', // Rice Making Moon (August)
        'Waatebagaa Giizis', // Changing Color Moon (September)
        'Binaakwii Giizis', // Falling Leaves Moon (October)
        'Gashkadino Giizis', // Freezing Moon (November)
        'Manidoo Giizisoons' // Little Spirit Moon (December)
      ],
      ceremonies: [
        {
          name: 'Strawberry Ceremony',
          date: 'June',
          restrictions: ['No photography', 'Elder permission required']
        }
      ]
    }
  },
  cr: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      grouping: [3]
    },
    currency: {
      code: 'CAD',
      symbol: '$',
      position: 'before'
    },
    calendar: {
      type: 'traditional',
      firstDayOfWeek: 0,
      traditionalMonths: [
        'Kisepīsim', // Great Moon (January)
        'Mikisiwipīsim', // Eagle Moon (February)
        'Niskipīsim', // Goose Moon (March)
        'Ayikipīsim', // Frog Moon (April)
        'Opiniyāwīwipīsim', // Egg Laying Moon (May)
        'Pāskāwīhowipīsim', // Hatching Moon (June)
        'Paskowipīsim', // Feather Moulting Moon (July)
        'Ohpahowipīsim', // Flying Moon (August)
        'Nōcihitowipīsim', // Rutting Moon (September)
        'Pīmahāmowipīsim', // Migrating Moon (October)
        'Ihkopīwipīsim', // Frost Moon (November)
        'Pawācakinasīsipīsim' // Frost Exploding Moon (December)
      ]
    }
  }
}

// Language families for grouped display
export const LANGUAGE_FAMILIES = {
  official: ['en', 'fr'],
  algonquian: ['oj', 'cr', 'mic', 'bla'],
  iroquoian: ['moh'],
  inuit: ['iu'],
  athabaskan: ['den']
}

// RTL languages (for future support)
export const RTL_LANGUAGES: string[] = []

// Languages with audio pronunciation support
export const AUDIO_SUPPORTED_LANGUAGES = ['oj', 'cr', 'iu', 'mic', 'moh']

// Languages requiring special fonts
export const SPECIAL_FONT_LANGUAGES = {
  iu: 'Pigiarniq',
  cr: 'Aboriginal Sans',
  chr: 'Aboriginal Serif'
}

// Translation priority by namespace
export const TRANSLATION_PRIORITY = {
  critical: ['navigation', 'forms', 'errors', 'legal'],
  high: ['common', 'procurement', 'business', 'success'],
  medium: ['help', 'cultural'],
  low: ['admin', 'developer']
}

// Sacred terms that should not be translated
export const SACRED_TERMS = [
  'Turtle Island',
  'Great Spirit',
  'Medicine Wheel',
  'Seven Fires',
  'Grandmother Moon',
  'Grandfather Sun'
]

// Seasonal language restrictions
export const SEASONAL_RESTRICTIONS = {
  winter: {
    restricted: ['certain ceremonial terms'],
    languages: ['oj', 'cr']
  },
  summer: {
    restricted: [],
    languages: []
  }
}

// Default pluralization rules
export const PLURALIZATION_RULES = {
  en: {
    zero: 'zero',
    one: 'one',
    other: 'other'
  },
  fr: {
    zero: 'zero',
    one: 'one',
    other: 'other'
  },
  oj: {
    one: 'one',
    other: 'other'
  },
  cr: {
    one: 'one',
    other: 'other'
  }
}