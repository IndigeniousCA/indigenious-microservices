// Language Switcher Component
// UI for selecting and switching between languages

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, ChevronDown, Check, Volume2, Feather,
  Info, Star, Users, BookOpen, AlertCircle
} from 'lucide-react'
import { useTranslation } from '../contexts/TranslationContext'
import { LanguageCode, Language } from '../types/translation.types'
import { LANGUAGE_FAMILIES, AUDIO_SUPPORTED_LANGUAGES } from '../config/languages'

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'grid' | 'inline'
  showFlags?: boolean
  showNativeNames?: boolean
  groupByFamily?: boolean
  onLanguageSelect?: (language: LanguageCode) => void
}

export function LanguageSwitcher({ 
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true,
  groupByFamily = true,
  onLanguageSelect
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { 
    currentLanguage, 
    setLanguage, 
    languages,
    isIndigenousLanguage,
    hasAudioSupport,
    t
  } = useTranslation()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle language selection
  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    await setLanguage(languageCode)
    setIsOpen(false)
    onLanguageSelect?.(languageCode)
  }

  // Filter languages based on search
  const filteredLanguages = Object.entries(languages).filter(([code, lang]) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      lang.name.toLowerCase().includes(searchLower) ||
      lang.nativeName.toLowerCase().includes(searchLower) ||
      code.toLowerCase().includes(searchLower)
    )
  })

  // Group languages by family
  const groupedLanguages = groupByFamily ? Object.entries(LANGUAGE_FAMILIES).map(([family, codes]) => ({
    family,
    languages: filteredLanguages.filter(([code]) => codes.includes(code))
  })).filter(group => group.languages.length > 0) : null

  // Get family display name
  const getFamilyName = (family: string) => {
    switch (family) {
      case 'official': return 'Official Languages'
      case 'algonquian': return 'Algonquian'
      case 'iroquoian': return 'Iroquoian'
      case 'inuit': return 'Inuit'
      case 'athabaskan': return 'Athabaskan'
      default: return family
    }
  }

  const currentLang = languages[currentLanguage]

  if (variant === 'dropdown') {
    return (
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md 
            border border-white/20 rounded-lg hover:bg-white/15 transition-all group"
        >
          <Globe className="w-4 h-4 text-white/80" />
          {showFlags && currentLang.flag && (
            <span className="text-lg">{currentLang.flag}</span>
          )}
          <span className="text-white/90">
            {showNativeNames && currentLang.isIndigenous 
              ? currentLang.nativeName 
              : currentLang.name}
          </span>
          {currentLang.isIndigenous && (
            <Feather className="w-3 h-3 text-purple-400" />
          )}
          <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 left-0 w-80 bg-white/10 backdrop-blur-xl 
                border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Search Bar */}
              <div className="p-3 border-b border-white/10">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg
                    text-white placeholder-white/50 focus:outline-none focus:ring-2 
                    focus:ring-blue-400/50"
                />
              </div>

              {/* Language List */}
              <div className="max-h-96 overflow-y-auto">
                {groupedLanguages ? (
                  // Grouped by family
                  groupedLanguages.map((group) => (
                    <div key={group.family}>
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                          {getFamilyName(group.family)}
                        </h3>
                      </div>
                      {group.languages.map(([code, lang]) => (
                        <LanguageOption
                          key={code}
                          code={code as LanguageCode}
                          language={lang}
                          isSelected={code === currentLanguage}
                          onSelect={handleLanguageSelect}
                          showFlags={showFlags}
                          showNativeNames={showNativeNames}
                        />
                      ))}
                    </div>
                  ))
                ) : (
                  // Flat list
                  filteredLanguages.map(([code, lang]) => (
                    <LanguageOption
                      key={code}
                      code={code as LanguageCode}
                      language={lang}
                      isSelected={code === currentLanguage}
                      onSelect={handleLanguageSelect}
                      showFlags={showFlags}
                      showNativeNames={showNativeNames}
                    />
                  ))
                )}
              </div>

              {/* Footer Info */}
              <div className="p-3 border-t border-white/10 bg-indigo-500/10">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-indigo-400 mt-0.5" />
                  <p className="text-xs text-indigo-200">
                    Indigenous languages marked with <Feather className="w-3 h-3 inline mx-1" />
                    Audio pronunciation available for languages with <Volume2 className="w-3 h-3 inline mx-1" />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(languages).map(([code, lang]) => (
          <button
            key={code}
            onClick={() => handleLanguageSelect(code as LanguageCode)}
            className={`p-4 rounded-lg border transition-all ${
              code === currentLanguage
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              {showFlags && lang.flag && (
                <span className="text-2xl">{lang.flag}</span>
              )}
              <div className="text-center">
                <p className="font-medium">{lang.name}</p>
                {showNativeNames && lang.nativeName !== lang.name && (
                  <p className="text-sm opacity-80">{lang.nativeName}</p>
                )}
              </div>
              {lang.isIndigenous && (
                <Feather className="w-4 h-4 text-purple-400" />
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  // Inline variant
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(languages).map(([code, lang]) => (
        <button
          key={code}
          onClick={() => handleLanguageSelect(code as LanguageCode)}
          className={`px-3 py-1 rounded-full text-sm transition-all ${
            code === currentLanguage
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-white/80 hover:bg-white/20'
          }`}
        >
          {showFlags && lang.flag && <span className="mr-1">{lang.flag}</span>}
          {lang.name}
          {lang.isIndigenous && <Feather className="w-3 h-3 inline ml-1" />}
        </button>
      ))}
    </div>
  )
}

// Individual language option component
interface LanguageOptionProps {
  code: LanguageCode
  language: Language
  isSelected: boolean
  onSelect: (code: LanguageCode) => void
  showFlags?: boolean
  showNativeNames?: boolean
}

function LanguageOption({
  code,
  language,
  isSelected,
  onSelect,
  showFlags = true,
  showNativeNames = true
}: LanguageOptionProps) {
  const hasAudio = AUDIO_SUPPORTED_LANGUAGES.includes(code)

  return (
    <button
      onClick={() => onSelect(code)}
      className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 
        transition-colors ${isSelected ? 'bg-blue-500/20' : ''}`}
    >
      <div className="flex items-center space-x-3">
        {showFlags && language.flag && (
          <span className="text-xl">{language.flag}</span>
        )}
        <div className="text-left">
          <p className={`font-medium ${isSelected ? 'text-blue-200' : 'text-white/90'}`}>
            {language.name}
          </p>
          {showNativeNames && language.nativeName !== language.name && (
            <p className={`text-sm ${isSelected ? 'text-blue-100/80' : 'text-white/60'}`}>
              {language.nativeName}
            </p>
          )}
          {language.nation && (
            <p className="text-xs text-white/50">{language.nation}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {language.isIndigenous && (
          <Feather className="w-4 h-4 text-purple-400" />
        )}
        {hasAudio && (
          <Volume2 className="w-4 h-4 text-green-400" />
        )}
        {language.culturalNotes?.elderApproval && (
          <Users className="w-4 h-4 text-amber-400" />
        )}
        {isSelected && (
          <Check className="w-4 h-4 text-blue-400" />
        )}
      </div>
    </button>
  )
}