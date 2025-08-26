/**
 * Business Vocabulary System
 * Economic terms in Indigenous languages with cultural context
 */

export interface VocabularyTerm {
  english: string;
  translations: {
    [languageCode: string]: {
      term: string;
      syllabics?: string;
      pronunciation?: string;
      context?: string;
      audioUrl?: string;
      verifiedBy?: string[];
    };
  };
  category: string;
  priority: number;
  usage: string[];
}

/**
 * Core business vocabulary with Cree translations
 * Note: These are example translations - real implementation would require
 * verification by native speakers and elders
 */
export const BUSINESS_VOCABULARY: VocabularyTerm[] = [
  // === VERIFICATION & APPROVAL TERMS ===
  {
    english: 'verify',
    translations: {
      'crk': { // Plains Cree
        term: 'kiskeyihtam',
        syllabics: 'ᑭᐢᑫᔨᐦᑕᒼ',
        pronunciation: 'kis-kay-ih-tam',
        context: 'To know for certain, to verify truth'
      },
      'crj-coastal': { // Coastal James Bay Cree
        term: 'chiskutamaashuu',
        syllabics: 'ᒋᔅᑯᑕᒫᔫ',
        pronunciation: 'chis-ku-ta-maa-shuu',
        context: 'To verify, to make certain'
      },
      'crj-inland': { // Inland James Bay Cree
        term: 'kiskeyihtamuu',
        syllabics: 'ᑭᔅᑫᔨᐦᑕᒨ',
        pronunciation: 'kis-key-ih-ta-muu'
      },
      'crl': { // Northern East Cree
        term: 'chischaaýimuu',
        syllabics: 'ᒋᔅᒑᔨᒨ',
        pronunciation: 'chis-chaa-yii-muu'
      }
    },
    category: 'verification',
    priority: 1,
    usage: ['verify business', 'verify identity', 'verify document']
  },
  {
    english: 'approve',
    translations: {
      'crk': {
        term: 'naskomow',
        syllabics: 'ᓇᐢᑯᒧᐤ',
        pronunciation: 'nas-ko-mow',
        context: 'To approve, to agree with'
      },
      'crj-coastal': {
        term: 'wiichiheu',
        syllabics: 'ᐐᒋᐦᐁᐤ',
        pronunciation: 'wii-chi-heu'
      },
      'crj-inland': {
        term: 'naschimuu',
        syllabics: 'ᓇᔅᒋᒨ',
        pronunciation: 'nas-chi-muu'
      }
    },
    category: 'verification',
    priority: 1,
    usage: ['approve payment', 'approve contract', 'approve bid']
  },
  {
    english: 'reject',
    translations: {
      'crk': {
        term: 'anwetam',
        syllabics: 'ᐊᓌᑕᒼ',
        pronunciation: 'an-way-tam',
        context: 'To reject, to refuse'
      },
      'crj-coastal': {
        term: 'achishtaau',
        syllabics: 'ᐊᒋᔥᑖᐤ',
        pronunciation: 'a-chish-taau'
      }
    },
    category: 'verification',
    priority: 1,
    usage: ['reject bid', 'reject application']
  },

  // === FINANCIAL TERMS ===
  {
    english: 'invoice',
    translations: {
      'crk': {
        term: 'sôniyâw-masinahikan',
        syllabics: 'ᓲᓂᔮᐤ ᒪᓯᓇᐦᐃᑲᐣ',
        pronunciation: 'soh-ni-yaaw ma-si-na-hi-kan',
        context: 'Money document'
      },
      'crj-coastal': {
        term: 'shuuniyaau-masinahiikan',
        syllabics: 'ᔫᓂᔮᐤ ᒪᓯᓇᐦᐄᑲᓐ',
        pronunciation: 'shuu-ni-yaau ma-si-na-hii-kan'
      },
      'crj-inland': {
        term: 'shuniyaau-masinihiikan',
        syllabics: 'ᔘᓂᔮᐤ ᒪᓯᓂᐦᐄᑲᓐ',
        pronunciation: 'shu-ni-yaau ma-si-ni-hii-kan'
      }
    },
    category: 'financial',
    priority: 1,
    usage: ['send invoice', 'create invoice', 'pay invoice']
  },
  {
    english: 'payment',
    translations: {
      'crk': {
        term: 'tipahikêwin',
        syllabics: 'ᑎᐸᐦᐃᑫᐏᐣ',
        pronunciation: 'ti-pa-hi-kay-win',
        context: 'The act of paying'
      },
      'crj-coastal': {
        term: 'tipaahamaakeuwin',
        syllabics: 'ᑎᐹᐦᐊᒫᑫᐅᐎᓐ',
        pronunciation: 'ti-paa-ha-maa-keu-win'
      }
    },
    category: 'financial',
    priority: 1,
    usage: ['make payment', 'receive payment', 'process payment']
  },
  {
    english: 'transfer',
    translations: {
      'crk': {
        term: 'sipwêhtahiwêw',
        syllabics: 'ᓯᐻᐦᑕᐦᐃᐍᐤ',
        pronunciation: 'sip-way-ta-hi-wayou',
        context: 'To transfer, to move from one to another'
      },
      'crj-coastal': {
        term: 'aashtuutaau',
        syllabics: 'ᐋᔥᑑᑖᐤ',
        pronunciation: 'aash-tuu-taau'
      }
    },
    category: 'financial',
    priority: 2,
    usage: ['transfer funds', 'transfer ownership']
  },
  {
    english: 'balance',
    translations: {
      'crk': {
        term: 'tipêyihtamowin',
        syllabics: 'ᑎᐯᔨᐦᑕᒧᐏᐣ',
        pronunciation: 'ti-pay-yih-ta-mo-win',
        context: 'Balance, equality'
      },
      'crj-coastal': {
        term: 'naanaahuu',
        syllabics: 'ᓈᓈᐦᐆ',
        pronunciation: 'naa-naa-huu'
      }
    },
    category: 'financial',
    priority: 2,
    usage: ['check balance', 'account balance']
  },

  // === CONTRACT & BUSINESS TERMS ===
  {
    english: 'contract',
    translations: {
      'crk': {
        term: 'naskomôtowin',
        syllabics: 'ᓇᐢᑯᒨᑐᐏᐣ',
        pronunciation: 'nas-ko-moh-to-win',
        context: 'Agreement, contract'
      },
      'crj-coastal': {
        term: 'wiichihituuwin',
        syllabics: 'ᐐᒋᐦᐃᑐᐎᓐ',
        pronunciation: 'wii-chi-hi-tuu-win'
      }
    },
    category: 'business',
    priority: 1,
    usage: ['sign contract', 'review contract', 'draft contract']
  },
  {
    english: 'business',
    translations: {
      'crk': {
        term: 'atoskêwin',
        syllabics: 'ᐊᑐᐢᑫᐏᐣ',
        pronunciation: 'a-tos-kay-win',
        context: 'Work, business'
      },
      'crj-coastal': {
        term: 'aatuskaauwin',
        syllabics: 'ᐋᑐᔅᑳᐅᐎᓐ',
        pronunciation: 'aa-tus-kaau-win'
      },
      'crj-inland': {
        term: 'atuskewin',
        syllabics: 'ᐊᑐᔅᑫᐎᓐ',
        pronunciation: 'a-tus-ke-win'
      }
    },
    category: 'business',
    priority: 1,
    usage: ['register business', 'verify business', 'Indigenous business']
  },
  {
    english: 'proposal',
    translations: {
      'crk': {
        term: 'kakwêcihkêmowin',
        syllabics: 'ᑲᑵᒋᐦᑫᒧᐏᐣ',
        pronunciation: 'kak-way-chih-kay-mo-win',
        context: 'Proposal, request'
      },
      'crj-coastal': {
        term: 'kukwaachihkaamuuwin',
        syllabics: 'ᑯᑳᒋᐦᑳᒨᐎᓐ',
        pronunciation: 'ku-kwaa-chih-kaa-muu-win'
      }
    },
    category: 'business',
    priority: 1,
    usage: ['submit proposal', 'review proposal', 'accept proposal']
  },
  {
    english: 'bid',
    translations: {
      'crk': {
        term: 'akihtâsowin',
        syllabics: 'ᐊᑭᐦᑖᓱᐏᐣ',
        pronunciation: 'a-kih-taa-so-win',
        context: 'To bid, to offer'
      },
      'crj-coastal': {
        term: 'akihtaashuuwin',
        syllabics: 'ᐊᑭᐦᑖᔪᐎᓐ',
        pronunciation: 'a-kih-taa-shuu-win'
      }
    },
    category: 'business',
    priority: 1,
    usage: ['submit bid', 'winning bid', 'review bid']
  },

  // === NUMBERS ===
  {
    english: 'one',
    translations: {
      'crk': {
        term: 'peyak',
        syllabics: 'ᐯᔭᐠ',
        pronunciation: 'pay-yak'
      },
      'crj-coastal': {
        term: 'paayich',
        syllabics: 'ᐹᔨᒡ',
        pronunciation: 'paa-yich'
      },
      'crj-inland': {
        term: 'peyakw',
        syllabics: 'ᐯᔭᒄ',
        pronunciation: 'pay-yakw'
      }
    },
    category: 'numbers',
    priority: 1,
    usage: ['one dollar', 'one business', 'one contract']
  },
  {
    english: 'two',
    translations: {
      'crk': {
        term: 'nîso',
        syllabics: 'ᓃᓱ',
        pronunciation: 'nee-so'
      },
      'crj-coastal': {
        term: 'niishu',
        syllabics: 'ᓃᔓ',
        pronunciation: 'nii-shu'
      }
    },
    category: 'numbers',
    priority: 1,
    usage: ['two businesses', 'two weeks']
  },
  {
    english: 'three',
    translations: {
      'crk': {
        term: 'nisto',
        syllabics: 'ᓂᐢᑐ',
        pronunciation: 'nis-to'
      },
      'crj-coastal': {
        term: 'nishtu',
        syllabics: 'ᓂᔥᑐ',
        pronunciation: 'nish-tu'
      }
    },
    category: 'numbers',
    priority: 1,
    usage: ['three bids', 'three months']
  },
  {
    english: 'hundred',
    translations: {
      'crk': {
        term: 'mitâtahtomitanaw',
        syllabics: 'ᒥᑖᑕᐦᑐᒥᑕᓇᐤ',
        pronunciation: 'mi-taa-tah-to-mi-ta-naw'
      },
      'crj-coastal': {
        term: 'mitaahtumitinuu',
        syllabics: 'ᒥᑖᐦᑐᒥᑎᓅ',
        pronunciation: 'mi-taah-tu-mi-ti-nuu'
      }
    },
    category: 'numbers',
    priority: 2,
    usage: ['hundred dollars', 'hundred employees']
  },
  {
    english: 'thousand',
    translations: {
      'crk': {
        term: 'kihci-mitâtahtomitanaw',
        syllabics: 'ᑭᐦᒋ ᒥᑖᑕᐦᑐᒥᑕᓇᐤ',
        pronunciation: 'kih-chi mi-taa-tah-to-mi-ta-naw'
      },
      'crj-coastal': {
        term: 'kihchi-mitaahtumitinuu',
        syllabics: 'ᑭᐦᒋ ᒥᑖᐦᑐᒥᑎᓅ',
        pronunciation: 'kih-chi mi-taah-tu-mi-ti-nuu'
      }
    },
    category: 'numbers',
    priority: 2,
    usage: ['thousand dollars', 'thousand businesses']
  },

  // === TIME EXPRESSIONS ===
  {
    english: 'today',
    translations: {
      'crk': {
        term: 'anohc',
        syllabics: 'ᐊᓄᐦᐨ',
        pronunciation: 'a-nohch'
      },
      'crj-coastal': {
        term: 'anuuhch',
        syllabics: 'ᐊᓅᐦᒡ',
        pronunciation: 'a-nuuhch'
      }
    },
    category: 'time',
    priority: 1,
    usage: ['submit today', 'deadline today']
  },
  {
    english: 'tomorrow',
    translations: {
      'crk': {
        term: 'wâpaki',
        syllabics: 'ᐚᐸᑭ',
        pronunciation: 'waa-pa-ki'
      },
      'crj-coastal': {
        term: 'waapich',
        syllabics: 'ᐛᐱᒡ',
        pronunciation: 'waa-pich'
      }
    },
    category: 'time',
    priority: 1,
    usage: ['meeting tomorrow', 'deadline tomorrow']
  },
  {
    english: 'week',
    translations: {
      'crk': {
        term: 'ayamihêwi-kîsikâw',
        syllabics: 'ᐊᔭᒥᐦᐁᐏ ᑮᓯᑳᐤ',
        pronunciation: 'a-ya-mi-hay-wi kee-si-kaaw'
      },
      'crj-coastal': {
        term: 'shaapunaau',
        syllabics: 'ᔖᐳᓈᐤ',
        pronunciation: 'shaa-pu-naau'
      }
    },
    category: 'time',
    priority: 2,
    usage: ['next week', 'this week', 'last week']
  },

  // === PLATFORM ACTIONS ===
  {
    english: 'search',
    translations: {
      'crk': {
        term: 'nanâtohkê',
        syllabics: 'ᓇᓈᑐᐦᑫ',
        pronunciation: 'na-naa-toh-kay',
        context: 'To search, to look for'
      },
      'crj-coastal': {
        term: 'naanaatuhcheu',
        syllabics: 'ᓈᓈᑐᐦᒉᐤ',
        pronunciation: 'naa-naa-tuh-cheu'
      }
    },
    category: 'actions',
    priority: 1,
    usage: ['search businesses', 'search RFQs', 'search contracts']
  },
  {
    english: 'show',
    translations: {
      'crk': {
        term: 'wâpahtihêw',
        syllabics: 'ᐚᐸᐦᑎᐦᐁᐤ',
        pronunciation: 'waa-pah-ti-hayou',
        context: 'To show, to display'
      },
      'crj-coastal': {
        term: 'waapihtiheu',
        syllabics: 'ᐛᐱᐦᑎᐦᐁᐤ',
        pronunciation: 'waa-pih-ti-heu'
      }
    },
    category: 'actions',
    priority: 1,
    usage: ['show invoices', 'show pending', 'show results']
  },
  {
    english: 'send',
    translations: {
      'crk': {
        term: 'isitisahwêw',
        syllabics: 'ᐃᓯᑎᓴᐦᐍᐤ',
        pronunciation: 'i-si-ti-sah-wayou'
      },
      'crj-coastal': {
        term: 'ishaaueu',
        syllabics: 'ᐃᔖᐅᐁᐤ',
        pronunciation: 'i-shaau-eu'
      }
    },
    category: 'actions',
    priority: 1,
    usage: ['send invoice', 'send message', 'send document']
  }
];

/**
 * Get vocabulary by category
 */
export function getVocabularyByCategory(category: string): VocabularyTerm[] {
  return BUSINESS_VOCABULARY.filter(term => term.category === category);
}

/**
 * Get vocabulary by language
 */
export function getVocabularyByLanguage(languageCode: string): VocabularyTerm[] {
  return BUSINESS_VOCABULARY.filter(term => 
    term.translations[languageCode] !== undefined
  );
}

/**
 * Search vocabulary
 */
export function searchVocabulary(query: string, languageCode?: string): VocabularyTerm[] {
  const lowercaseQuery = query.toLowerCase();
  
  return BUSINESS_VOCABULARY.filter(term => {
    // Search in English
    if (term.english.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    // Search in translations
    if (languageCode && term.translations[languageCode]) {
      const translation = term.translations[languageCode];
      if (translation.term.toLowerCase().includes(lowercaseQuery) ||
          translation.syllabics?.includes(query)) {
        return true;
      }
    }
    
    // Search in usage examples
    return term.usage.some(u => u.toLowerCase().includes(lowercaseQuery));
  });
}

/**
 * Get priority vocabulary for initial training
 */
export function getPriorityVocabulary(limit: number = 100): VocabularyTerm[] {
  return BUSINESS_VOCABULARY
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}

/**
 * Build command patterns from vocabulary
 */
export function buildCommandPatterns(languageCode: string): Map<string, string[]> {
  const patterns = new Map<string, string[]>();
  
  BUSINESS_VOCABULARY.forEach(term => {
    if (term.translations[languageCode]) {
      const translation = term.translations[languageCode].term;
      
      // Build patterns from usage examples
      term.usage.forEach(usage => {
        const pattern = usage.replace(term.english, translation);
        
        if (!patterns.has(usage)) {
          patterns.set(usage, []);
        }
        patterns.get(usage)!.push(pattern);
      });
    }
  });
  
  return patterns;
}

export default {
  BUSINESS_VOCABULARY,
  getVocabularyByCategory,
  getVocabularyByLanguage,
  searchVocabulary,
  getPriorityVocabulary,
  buildCommandPatterns
};