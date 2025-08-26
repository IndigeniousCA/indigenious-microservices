/**
 * Language Selector Component with Glassmorphism Design
 * Supports Indigenous languages with syllabics
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { languages, saveLanguagePreference, getFontFamily } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';

export function LanguageSelector() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLocale = (router.locale || 'en') as Locale;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (locale: Locale) => {
    saveLanguagePreference(locale);
    setIsOpen(false);
    
    // Navigate to the same page in the new locale
    await router.push(router.pathname, router.asPath, { locale });
  };

  const currentLanguage = languages[currentLocale];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-200"
        aria-label="Language selector"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4 text-white/80" />
        <span className="text-white font-medium" style={{ fontFamily: getFontFamily(currentLocale) }}>
          {currentLanguage.nativeName}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 z-50"
          >
            <GlassPanel className="p-2 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 mb-2 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white/80">Select Language</h3>
                <p className="text-xs text-white/60 mt-1">
                  Choose your preferred language. Syllabics supported.
                </p>
              </div>

              <div className="space-y-1">
                {/* Official Languages */}
                <div className="px-3 py-1">
                  <span className="text-xs text-white/50 uppercase tracking-wider">Official Languages</span>
                </div>
                {['en', 'fr'].map((locale) => (
                  <LanguageOption
                    key={locale}
                    locale={locale as Locale}
                    isSelected={currentLocale === locale}
                    onSelect={handleLanguageChange}
                  />
                ))}

                {/* Indigenous Languages with Syllabics */}
                <div className="px-3 py-1 mt-2">
                  <span className="text-xs text-white/50 uppercase tracking-wider">Indigenous Languages (Syllabics)</span>
                </div>
                {['cr', 'crk', 'crl', 'iu'].map((locale) => (
                  <LanguageOption
                    key={locale}
                    locale={locale as Locale}
                    isSelected={currentLocale === locale}
                    onSelect={handleLanguageChange}
                  />
                ))}

                {/* Indigenous Languages with Latin Script */}
                <div className="px-3 py-1 mt-2">
                  <span className="text-xs text-white/50 uppercase tracking-wider">Indigenous Languages</span>
                </div>
                {['oj', 'mi', 'moe', 'atj', 'den', 'gwi', 'moh', 'hur'].map((locale) => (
                  <LanguageOption
                    key={locale}
                    locale={locale as Locale}
                    isSelected={currentLocale === locale}
                    onSelect={handleLanguageChange}
                  />
                ))}
              </div>

              <div className="mt-3 pt-3 px-3 border-t border-white/10">
                <p className="text-xs text-white/50">
                  Missing your language? Help us translate!
                </p>
                <a
                  href="https://crowdin.com/project/indigenous-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                >
                  Contribute translations →
                </a>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LanguageOptionProps {
  locale: Locale;
  isSelected: boolean;
  onSelect: (locale: Locale) => void;
}

function LanguageOption({ locale, isSelected, onSelect }: LanguageOptionProps) {
  const language = languages[locale];
  
  return (
    <button
      onClick={() => onSelect(locale)}
      className={`
        w-full px-3 py-2 rounded-lg text-left transition-all duration-200
        flex items-center justify-between group
        ${isSelected 
          ? 'bg-blue-500/20 border border-blue-400/30' 
          : 'hover:bg-white/10'
        }
      `}
      aria-current={isSelected ? 'true' : undefined}
    >
      <div className="flex flex-col">
        <span 
          className="text-white font-medium"
          style={{ fontFamily: getFontFamily(locale) }}
        >
          {language.nativeName}
        </span>
        <span className="text-xs text-white/60">{language.name}</span>
      </div>
      
      {isSelected && (
        <Check className="w-4 h-4 text-blue-400" />
      )}
      
      {'syllabics' in language && language.syllabics && (
        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
          Syllabics
        </span>
      )}
    </button>
  );
}