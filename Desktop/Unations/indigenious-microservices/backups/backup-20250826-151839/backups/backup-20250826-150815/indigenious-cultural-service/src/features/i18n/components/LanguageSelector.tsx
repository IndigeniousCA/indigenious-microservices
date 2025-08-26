/**
 * Language Selector Component
 * Allows users to switch between Indigenous languages
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/translation-provider'
import { GlassPanel } from '@/components/ui/GlassPanel'

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'tabs' | 'grid'
  showNativeNames?: boolean
  showRegions?: boolean
  className?: string
}

export default function LanguageSelector({
  variant = 'dropdown',
  showNativeNames = true,
  showRegions = false,
  className = ''
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, languages, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const supportedLanguages = [
    'en',
    'cr',      // Cree (Syllabics)
    'cr-Latn', // Cree (Roman)
    'oj',      // Ojibwe (Syllabics)
    'oj-Latn', // Ojibwe (Roman)
    'iu',      // Inuktitut (Syllabics)
    'iu-Latn'  // Inuktitut (Roman)
  ]

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode)
    setIsOpen(false)
  }

  if (variant === 'tabs') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {supportedLanguages.map(langCode => {
          const lang = languages[langCode]
          if (!lang && langCode !== 'en') return null

          return (
            <button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentLanguage === langCode
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              {langCode === 'en' ? 'English' : lang?.name}
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
        {supportedLanguages.map(langCode => {
          const lang = languages[langCode]
          if (!lang && langCode !== 'en') return null

          const isSelected = currentLanguage === langCode

          return (
            <motion.button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                  : 'border-white/20 bg-white/10 text-gray-300 hover:border-white/40 hover:bg-white/20'
              }`}
            >
              {isSelected && (
                <Check className="absolute top-2 right-2 h-4 w-4 text-blue-400" />
              )}
              
              <div className="text-left">
                <div className="font-medium">
                  {langCode === 'en' ? 'English' : lang?.name}
                </div>
                
                {showNativeNames && lang?.nativeName && (
                  <div 
                    className="text-sm opacity-75 mt-1"
                    style={{ fontFamily: lang.font }}
                  >
                    {lang.nativeName}
                  </div>
                )}
                
                {showRegions && lang?.region && (
                  <div className="text-xs opacity-60 mt-2">
                    {lang.region.slice(0, 2).join(', ')}
                    {lang.region.length > 2 && ` +${lang.region.length - 2}`}
                  </div>
                )}
                
                {lang?.endangered && (
                  <div className="text-xs text-orange-400 mt-1">
                    {t('language.endangered')}
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/20"
      >
        <Globe className="h-4 w-4 text-gray-300" />
        <span className="text-white">
          {currentLanguage === 'en' 
            ? 'English' 
            : languages[currentLanguage]?.name || currentLanguage
          }
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-300 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 z-50 min-w-64"
          >
            <GlassPanel className="p-2">
              <div className="space-y-1">
                {supportedLanguages.map(langCode => {
                  const lang = languages[langCode]
                  if (!lang && langCode !== 'en') return null

                  const isSelected = currentLanguage === langCode

                  return (
                    <button
                      key={langCode}
                      onClick={() => handleLanguageChange(langCode)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">
                          {langCode === 'en' ? 'English' : lang?.name}
                        </div>
                        
                        {showNativeNames && lang?.nativeName && (
                          <div 
                            className="text-sm opacity-75"
                            style={{ fontFamily: lang.font }}
                          >
                            {lang.nativeName}
                          </div>
                        )}
                        
                        {showRegions && lang?.region && (
                          <div className="text-xs opacity-60">
                            {lang.region.slice(0, 2).join(', ')}
                            {lang.region.length > 2 && ` +${lang.region.length - 2}`}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-400" />
                        )}
                        
                        {lang?.endangered && (
                          <div className="text-xs text-orange-400">
                            Endangered
                          </div>
                        )}
                        
                        {lang?.speakers && (
                          <div className="text-xs opacity-60">
                            {formatSpeakers(lang.speakers)}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="border-t border-white/10 mt-2 pt-2">
                <div className="text-xs text-gray-400 p-2">
                  {t('language.supportNote')}
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Helper function to format speaker count
function formatSpeakers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M speakers`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K speakers`
  } else {
    return `${count} speakers`
  }
}

// Language Status Indicator Component
export function LanguageStatusIndicator({ 
  languageCode, 
  showText = false 
}: { 
  languageCode: string
  showText?: boolean 
}) {
  const { languages } = useTranslation()
  const lang = languages[languageCode]
  
  if (!lang) return null

  const statusColor = lang.endangered ? 'text-orange-400' : 'text-green-400'
  const statusText = lang.endangered ? 'Endangered' : 'Stable'

  return (
    <div className={`flex items-center space-x-1 ${statusColor}`}>
      <div className={`h-2 w-2 rounded-full ${
        lang.endangered ? 'bg-orange-400' : 'bg-green-400'
      }`} />
      {showText && (
        <span className="text-xs">{statusText}</span>
      )}
    </div>
  )
}

// Writing System Toggle Component
export function WritingSystemToggle({ 
  baseLanguage 
}: { 
  baseLanguage: 'cr' | 'oj' | 'iu' 
}) {
  const { currentLanguage, setLanguage } = useTranslation()
  
  const syllabicsCode = baseLanguage
  const romanCode = `${baseLanguage}-Latn`
  
  const isSyllabics = currentLanguage === syllabicsCode
  const isRoman = currentLanguage === romanCode

  return (
    <div className="flex bg-white/10 rounded-lg p-1">
      <button
        onClick={() => setLanguage(syllabicsCode)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
          isSyllabics
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        Syllabics
      </button>
      <button
        onClick={() => setLanguage(romanCode)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
          isRoman
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        Roman
      </button>
    </div>
  )
}