// Localized Text Component
// Component for displaying translated text with cultural considerations

import { ReactNode, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Feather, Volume2, Info } from 'lucide-react'
import { useTranslation } from '../contexts/TranslationContext'
import { PronunciationPlayer } from './PronunciationPlayer'

interface LocalizedTextProps {
  // Translation key
  tKey: string
  // Translation namespace
  namespace?: string
  // Variables for interpolation
  variables?: Record<string, any>
  // Fallback text if translation not found
  fallback?: string
  // Show pronunciation button for Indigenous languages
  showPronunciation?: boolean
  // Highlight sacred terms
  highlightSacred?: boolean
  // Show cultural context tooltip
  showCulturalContext?: boolean
  // Custom className
  className?: string
  // Wrapper element
  as?: keyof JSX.IntrinsicElements
  // Children (for complex translations with components)
  children?: (translatedText: string) => ReactNode
}

export function LocalizedText({
  tKey,
  namespace = 'common',
  variables,
  fallback,
  showPronunciation = false,
  highlightSacred = true,
  showCulturalContext = false,
  className = '',
  as: Component = 'span',
  children
}: LocalizedTextProps) {
  const { 
    t, 
    currentLanguage,
    isIndigenousLanguage,
    hasAudioSupport,
    isSacredTerm,
    hasSeasonalRestriction,
    checkProtocol
  } = useTranslation()

  // Get translated text
  const translatedText = useMemo(() => {
    return t(tKey, namespace, variables) || fallback || tKey
  }, [t, tKey, namespace, variables, fallback])

  // Check for cultural protocols
  const culturalProtocol = useMemo(() => {
    return checkProtocol(translatedText)
  }, [checkProtocol, translatedText])

  // Check if text contains sacred terms
  const containsSacredTerms = useMemo(() => {
    return highlightSacred && isSacredTerm(translatedText)
  }, [highlightSacred, isSacredTerm, translatedText])

  // Check seasonal restrictions
  const hasRestrictions = useMemo(() => {
    return hasSeasonalRestriction(translatedText)
  }, [hasSeasonalRestriction, translatedText])

  // Process text to highlight sacred terms
  const processedContent = useMemo(() => {
    if (!highlightSacred || !containsSacredTerms) {
      return translatedText
    }

    // Split text and highlight sacred terms
    const sacredTerms = ['Turtle Island', 'Great Spirit', 'Medicine Wheel', 'Seven Fires', 'Grandmother Moon', 'Grandfather Sun']
    let processed = translatedText

    sacredTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      processed = processed.replace(regex, '<sacred>$1</sacred>')
    })

    return processed
  }, [translatedText, highlightSacred, containsSacredTerms])

  // Render content with sacred term highlighting
  const renderContent = () => {
    if (children) {
      return children(translatedText)
    }

    if (!containsSacredTerms) {
      return translatedText
    }

    // Parse and render with sacred term highlighting
    const parts = processedContent.split(/(<sacred>.*?<\/sacred>)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('<sacred>')) {
        const term = part.replace(/<\/?sacred>/g, '')
        return (
          <span
            key={index}
            className="text-purple-300 font-medium relative group inline-flex items-center"
          >
            {term}
            <Feather className="w-3 h-3 ml-1 text-purple-400" />
            <span className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-purple-500/20 
              backdrop-blur-md border border-purple-400/30 rounded text-xs text-purple-200 
              opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Sacred term
            </span>
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="inline-flex items-center space-x-2">
      <Component className={className}>
        {renderContent()}
      </Component>

      {/* Pronunciation button */}
      {showPronunciation && isIndigenousLanguage() && hasAudioSupport() && (
        <PronunciationPlayer 
          text={translatedText}
          language={currentLanguage}
          variant="inline"
        />
      )}

      {/* Cultural context indicator */}
      {showCulturalContext && culturalProtocol && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative group"
        >
          <Info className="w-4 h-4 text-amber-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
            bg-amber-500/20 backdrop-blur-md border border-amber-400/30 rounded-lg 
            text-sm text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity 
            whitespace-nowrap z-10">
            <p className="font-medium mb-1">Cultural Protocol</p>
            <p className="text-xs">{culturalProtocol.description}</p>
          </div>
        </motion.div>
      )}

      {/* Seasonal restriction warning */}
      {hasRestrictions && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative group"
        >
          <AlertCircle className="w-4 h-4 text-red-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
            bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-lg 
            text-sm text-red-200 opacity-0 group-hover:opacity-100 transition-opacity 
            whitespace-nowrap z-10">
            <p className="font-medium mb-1">Seasonal Restriction</p>
            <p className="text-xs">Some content may have seasonal limitations</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Convenience components for common use cases
export function LocalizedHeading({ 
  tKey, 
  level = 2,
  ...props 
}: LocalizedTextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  return (
    <LocalizedText
      {...props}
      tKey={tKey}
      as={Tag}
      className={`${props.className} ${
        level === 1 ? 'text-3xl font-bold' :
        level === 2 ? 'text-2xl font-semibold' :
        level === 3 ? 'text-xl font-semibold' :
        level === 4 ? 'text-lg font-medium' :
        'text-base font-medium'
      }`}
    />
  )
}

export function LocalizedParagraph({ 
  tKey, 
  ...props 
}: LocalizedTextProps) {
  return (
    <LocalizedText
      {...props}
      tKey={tKey}
      as="p"
      className={`${props.className} text-white/80`}
    />
  )
}

export function LocalizedButton({ 
  tKey,
  onClick,
  variant = 'primary',
  ...props 
}: LocalizedTextProps & { 
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const variantClasses = {
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 text-blue-200',
    secondary: 'bg-white/10 hover:bg-white/20 border-white/20 text-white',
    ghost: 'hover:bg-white/10 text-white/80'
  }

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border transition-all ${variantClasses[variant]} ${props.className}`}
    >
      <LocalizedText {...props} tKey={tKey} />
    </button>
  )
}