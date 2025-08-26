/**
 * Indigenous Language Configuration
 * Comprehensive support for Cree language family and other Indigenous languages
 */

export interface LanguageDialect {
  code: string;
  name: string;
  nativeName: string;
  speakers: number;
  regions: string[];
  writingSystems: ('syllabics' | 'roman' | 'both')[];
  iso639_3?: string;
  glottocode?: string;
  endangered?: 'vulnerable' | 'definitely' | 'severely' | 'critically';
  audioModels?: string[];
}

export interface LanguageFamily {
  family: string;
  languages: {
    [key: string]: {
      name: string;
      dialects: LanguageDialect[];
    };
  };
}

// Comprehensive Cree language family configuration
export const CREE_LANGUAGES: LanguageFamily = {
  family: 'Algonquian',
  languages: {
    plains_cree: {
      name: 'Plains Cree',
      dialects: [
        {
          code: 'crk',
          name: 'Plains Cree',
          nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ (nēhiyawēwin)',
          speakers: 75000,
          regions: ['Saskatchewan', 'Alberta', 'Montana'],
          writingSystems: ['both'],
          iso639_3: 'crk',
          glottocode: 'plai1258',
          audioModels: ['whisper-cree-plains', 'google-crk', 'azure-plains-cree']
        },
        {
          code: 'crk-SK',
          name: 'Saskatchewan Plains Cree',
          nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ',
          speakers: 45000,
          regions: ['Saskatchewan'],
          writingSystems: ['both'],
          audioModels: ['whisper-cree-sk', 'custom-sk-plains']
        },
        {
          code: 'crk-AB',
          name: 'Alberta Plains Cree',
          nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ',
          speakers: 30000,
          regions: ['Alberta'],
          writingSystems: ['both'],
          audioModels: ['whisper-cree-ab', 'custom-ab-plains']
        }
      ]
    },
    woods_cree: {
      name: 'Woods Cree',
      dialects: [
        {
          code: 'cwd',
          name: 'Woods Cree',
          nativeName: 'ᓀᐦᐃᖬᐍᐏᐣ (nīhithawīwin)',
          speakers: 35000,
          regions: ['Northern Saskatchewan', 'Manitoba'],
          writingSystems: ['both'],
          iso639_3: 'cwd',
          glottocode: 'wood1236',
          audioModels: ['whisper-cree-woods', 'google-cwd']
        }
      ]
    },
    swampy_cree: {
      name: 'Swampy Cree',
      dialects: [
        {
          code: 'csw',
          name: 'Swampy Cree',
          nativeName: 'ᓀᐦᐃᓇᐍᐏᐣ (nēhinawēwin)',
          speakers: 20000,
          regions: ['Ontario', 'Manitoba', 'Saskatchewan'],
          writingSystems: ['both'],
          iso639_3: 'csw',
          glottocode: 'swam1239',
          audioModels: ['whisper-cree-swampy', 'azure-swampy']
        },
        {
          code: 'csw-W',
          name: 'Western Swampy Cree',
          nativeName: 'ᐃᓂᓂᐍᐏᐣ (ininiwēwin)',
          speakers: 10000,
          regions: ['Manitoba', 'Saskatchewan'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-swampy-west']
        },
        {
          code: 'csw-E',
          name: 'Eastern Swampy Cree',
          nativeName: 'ᐃᓂᓂᐍᐏᐣ',
          speakers: 10000,
          regions: ['Ontario'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-swampy-east']
        }
      ]
    },
    moose_cree: {
      name: 'Moose Cree',
      dialects: [
        {
          code: 'crm',
          name: 'Moose Cree',
          nativeName: 'ᐃᓕᓖᒧᐏᐣ (ililiwēwin)',
          speakers: 5000,
          regions: ['Moose Factory', 'Moosonee', 'Ontario'],
          writingSystems: ['syllabics'],
          iso639_3: 'crm',
          glottocode: 'moos1236',
          endangered: 'vulnerable',
          audioModels: ['whisper-cree-moose', 'custom-moose']
        }
      ]
    },
    james_bay_cree: {
      name: 'James Bay Cree',
      dialects: [
        {
          code: 'crl',
          name: 'Northern East Cree',
          nativeName: 'ᐄᔨᔫ ᐊᔨᒨᓐ (īyiyū ayimūn)',
          speakers: 12000,
          regions: ['Northern Quebec', 'James Bay North'],
          writingSystems: ['syllabics'],
          iso639_3: 'crl',
          glottocode: 'nort1552',
          audioModels: ['whisper-cree-north-east', 'azure-crl']
        },
        {
          code: 'crj',
          name: 'Southern East Cree',
          nativeName: 'ᐄᔨᔫ ᐊᔨᒨᓐ (īyiyū ayimūn)',
          speakers: 14000,
          regions: ['Southern Quebec', 'James Bay South'],
          writingSystems: ['syllabics'],
          iso639_3: 'crj',
          glottocode: 'sout2963',
          audioModels: ['whisper-cree-south-east', 'azure-crj']
        },
        {
          code: 'crj-coastal',
          name: 'Coastal James Bay Cree',
          nativeName: 'ᐄᔨᔫ ᐊᔨᒨᓐ',
          speakers: 8000,
          regions: ['Chisasibi', 'Fort George', 'Wemindji', 'Eastmain'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-jbc-coastal']
        },
        {
          code: 'crj-inland',
          name: 'Inland James Bay Cree',
          nativeName: 'ᐄᓅ ᐊᔨᒨᓐ (īnū ayimūn)',
          speakers: 10000,
          regions: ['Mistissini', 'Oujé-Bougoumou', 'Waswanipi', 'Nemaska'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-jbc-inland']
        },
        {
          code: 'crj-waska',
          name: 'Waskaganish Cree',
          nativeName: 'ᐄᔨᔫ ᐊᔨᒨᓐ',
          speakers: 2500,
          regions: ['Waskaganish'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-waskaganish']
        },
        {
          code: 'crj-whap',
          name: 'Whapmagoostui Cree',
          nativeName: 'ᐄᔨᔫ ᐊᔨᒨᓐ',
          speakers: 1000,
          regions: ['Whapmagoostui', 'Kuujjuarapik'],
          writingSystems: ['syllabics'],
          audioModels: ['custom-whapmagoostui']
        }
      ]
    },
    atikamekw: {
      name: 'Atikamekw',
      dialects: [
        {
          code: 'atj',
          name: 'Atikamekw',
          nativeName: 'Atikamekw Nehiromowin',
          speakers: 7000,
          regions: ['Quebec', 'Mauricie'],
          writingSystems: ['roman'],
          iso639_3: 'atj',
          glottocode: 'atik1240',
          audioModels: ['whisper-atikamekw', 'custom-atj']
        }
      ]
    },
    montagnais_naskapi: {
      name: 'Montagnais-Naskapi',
      dialects: [
        {
          code: 'moe',
          name: 'Montagnais',
          nativeName: 'Innu-aimun',
          speakers: 10000,
          regions: ['Quebec', 'Labrador'],
          writingSystems: ['roman'],
          iso639_3: 'moe',
          glottocode: 'mont1268',
          audioModels: ['whisper-montagnais', 'azure-moe']
        },
        {
          code: 'nsk',
          name: 'Naskapi',
          nativeName: 'ᓇᔅᑲᐱ (Naskapi)',
          speakers: 1000,
          regions: ['Northern Quebec', 'Labrador'],
          writingSystems: ['both'],
          iso639_3: 'nsk',
          glottocode: 'nask1242',
          endangered: 'definitely',
          audioModels: ['custom-naskapi']
        }
      ]
    }
  }
};

// Other priority Indigenous languages
export const OTHER_LANGUAGES: LanguageDialect[] = [
  {
    code: 'oj',
    name: 'Ojibwe',
    nativeName: 'ᐊᓂᔑᓈᐯᒧᐎᓐ (Anishinaabemowin)',
    speakers: 50000,
    regions: ['Ontario', 'Manitoba', 'Saskatchewan', 'Quebec', 'Michigan', 'Wisconsin', 'Minnesota'],
    writingSystems: ['both'],
    iso639_3: 'oji',
    glottocode: 'ojib1241',
    audioModels: ['whisper-ojibwe', 'google-oj', 'azure-ojibwe']
  },
  {
    code: 'iu',
    name: 'Inuktitut',
    nativeName: 'ᐃᓄᒃᑎᑐᑦ',
    speakers: 35000,
    regions: ['Nunavut', 'Northwest Territories', 'Northern Quebec', 'Labrador'],
    writingSystems: ['syllabics'],
    iso639_3: 'iku',
    glottocode: 'inuk1254',
    audioModels: ['whisper-inuktitut', 'google-iu']
  },
  {
    code: 'mic',
    name: "Mi'kmaq",
    nativeName: "Mi'kmawi'simk",
    speakers: 8000,
    regions: ['Nova Scotia', 'New Brunswick', 'Prince Edward Island', 'Newfoundland', 'Quebec', 'Maine'],
    writingSystems: ['roman'],
    iso639_3: 'mic',
    glottocode: 'mikm1235',
    endangered: 'definitely',
    audioModels: ['custom-mikmaq']
  },
  {
    code: 'den',
    name: 'Dene',
    nativeName: 'Dene Zhatié',
    speakers: 11000,
    regions: ['Northwest Territories', 'Saskatchewan', 'Alberta', 'Manitoba'],
    writingSystems: ['roman'],
    iso639_3: 'den',
    glottocode: 'dene1251',
    audioModels: ['whisper-dene', 'custom-dene']
  },
  {
    code: 'moh',
    name: 'Mohawk',
    nativeName: 'Kanienʼkéha',
    speakers: 3500,
    regions: ['Ontario', 'Quebec', 'New York'],
    writingSystems: ['roman'],
    iso639_3: 'moh',
    glottocode: 'moha1258',
    endangered: 'severely',
    audioModels: ['custom-mohawk']
  }
];

// Business vocabulary categories
export const VOCABULARY_CATEGORIES = {
  core_business: [
    'verify', 'approve', 'reject', 'submit', 'review',
    'invoice', 'payment', 'transfer', 'balance', 'credit',
    'contract', 'agreement', 'proposal', 'bid', 'tender',
    'business', 'company', 'organization', 'band', 'council'
  ],
  numbers: [
    'one', 'two', 'three', 'four', 'five',
    'ten', 'twenty', 'fifty', 'hundred', 'thousand',
    'million', 'dollar', 'cent', 'percent', 'fraction'
  ],
  time: [
    'today', 'tomorrow', 'yesterday', 'week', 'month',
    'year', 'morning', 'afternoon', 'evening', 'deadline'
  ],
  actions: [
    'search', 'find', 'show', 'list', 'open',
    'close', 'send', 'receive', 'download', 'upload',
    'create', 'edit', 'delete', 'save', 'cancel'
  ],
  status: [
    'pending', 'approved', 'rejected', 'active', 'inactive',
    'complete', 'incomplete', 'verified', 'unverified', 'urgent'
  ]
};

// Language detection configuration
export const LANGUAGE_DETECTION_CONFIG = {
  // Acoustic features for dialect detection
  acousticFeatures: {
    formantRanges: true,
    pitchPatterns: true,
    rhythmPatterns: true,
    voiceQuality: true
  },
  
  // Lexical markers for dialect identification
  lexicalMarkers: {
    particleVariations: true,
    pronounVariations: true,
    verbEndings: true,
    nounMarkers: true
  },
  
  // Confidence thresholds
  confidenceThresholds: {
    languageFamily: 0.7,
    specificLanguage: 0.8,
    dialect: 0.85,
    speaker: 0.9
  }
};

// Get all supported language codes
export function getAllLanguageCodes(): string[] {
  const codes: string[] = [];
  
  // Add all Cree dialect codes
  Object.values(CREE_LANGUAGES.languages).forEach(lang => {
    lang.dialects.forEach(dialect => {
      codes.push(dialect.code);
    });
  });
  
  // Add other language codes
  OTHER_LANGUAGES.forEach(lang => {
    codes.push(lang.code);
  });
  
  return codes;
}

// Get language by code
export function getLanguageByCode(code: string): LanguageDialect | undefined {
  // Search in Cree languages
  for (const lang of Object.values(CREE_LANGUAGES.languages)) {
    const dialect = lang.dialects.find(d => d.code === code);
    if (dialect) return dialect;
  }
  
  // Search in other languages
  return OTHER_LANGUAGES.find(l => l.code === code);
}

// Get languages by region
export function getLanguagesByRegion(region: string): LanguageDialect[] {
  const languages: LanguageDialect[] = [];
  
  // Search Cree languages
  Object.values(CREE_LANGUAGES.languages).forEach(lang => {
    lang.dialects.forEach(dialect => {
      if (dialect.regions.some(r => 
        r.toLowerCase().includes(region.toLowerCase())
      )) {
        languages.push(dialect);
      }
    });
  });
  
  // Search other languages
  OTHER_LANGUAGES.forEach(lang => {
    if (lang.regions.some(r => 
      r.toLowerCase().includes(region.toLowerCase())
    )) {
      languages.push(lang);
    }
  });
  
  return languages;
}

// Priority languages for initial implementation
export const PRIORITY_LANGUAGES = [
  'crj-coastal',  // Coastal James Bay Cree
  'crj-inland',   // Inland James Bay Cree
  'crk',          // Plains Cree
  'crl',          // Northern East Cree
  'crj',          // Southern East Cree
  'oj',           // Ojibwe
  'iu'            // Inuktitut
];

export default {
  CREE_LANGUAGES,
  OTHER_LANGUAGES,
  VOCABULARY_CATEGORIES,
  LANGUAGE_DETECTION_CONFIG,
  getAllLanguageCodes,
  getLanguageByCode,
  getLanguagesByRegion,
  PRIORITY_LANGUAGES
};