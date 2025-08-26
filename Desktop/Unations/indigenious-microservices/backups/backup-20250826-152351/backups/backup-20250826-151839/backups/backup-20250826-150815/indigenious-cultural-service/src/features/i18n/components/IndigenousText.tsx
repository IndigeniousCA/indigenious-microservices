/**
 * Indigenous Text Component
 * Proper rendering and formatting for Indigenous languages
 */

'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/translation-provider'
import { 
  getFontFamily, 
  getTextDirection, 
  formatIndigenousDate,
  formatIndigenousCurrency,
  formatIndigenousNumber
} from '@/lib/i18n/indigenous-languages'

interface IndigenousTextProps {
  children: React.ReactNode
  language?: string
  variant?: 'body' | 'heading' | 'caption' | 'ceremonial'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right' | 'natural'
  ceremonial?: boolean
  respectful?: boolean
  className?: string
}

export default function IndigenousText({
  children,
  language,
  variant = 'body',
  size = 'base',
  weight = 'normal',
  align = 'natural',
  ceremonial = false,
  respectful = false,
  className = ''
}: IndigenousTextProps) {
  const { currentLanguage } = useTranslation()
  const lang = language || currentLanguage
  
  // Get language-specific styling
  const fontFamily = getFontFamily(lang)
  const direction = getTextDirection(lang)
  const isIndigenous = lang !== 'en'

  // Size classes
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  }

  // Weight classes
  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  }

  // Alignment classes
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    natural: direction === 'rtl' ? 'text-right' : 'text-left'
  }

  // Variant-specific styling
  const variantStyles = {
    body: '',
    heading: 'leading-tight',
    caption: 'text-gray-400',
    ceremonial: 'leading-relaxed tracking-wide'
  }

  // Additional styling for Indigenous languages
  const indigenousStyles = isIndigenous ? {
    // Larger line height for syllabics
    lineHeight: lang.includes('cr') || lang.includes('oj') || lang.includes('iu') ? '1.7' : '1.6',
    // Letter spacing for syllabics
    letterSpacing: (lang.includes('cr') || lang.includes('oj') || lang.includes('iu')) && !lang.includes('Latn') ? '0.05em' : 'normal',
    // Text rendering optimization
    textRendering: 'optimizeLegibility' as const,
    fontFeatureSettings: '"liga" 1, "kern" 1'
  } : {}

  // Ceremonial text styling
  const ceremonialStyles = ceremonial ? {
    textShadow: '0 0 10px rgba(139, 69, 19, 0.3)',
    color: '#D4AF37' // Gold color for ceremonial text
  } : {}

  // Respectful context indicator
  const respectfulIndicator = respectful && isIndigenous && (
    <span 
      className="inline-block w-2 h-2 bg-amber-400 rounded-full ml-2 opacity-60"
      title="Sacred or ceremonial content - please treat with respect"
    />
  )

  return (
    <span
      className={`
        ${sizeClasses[size]}
        ${weightClasses[weight]}
        ${alignClasses[align]}
        ${variantStyles[variant]}
        ${ceremonial ? 'text-amber-300' : ''}
        ${className}
      `}
      style={{
        fontFamily,
        direction,
        ...indigenousStyles,
        ...ceremonialStyles
      }}
      lang={lang}
      dir={direction}
    >
      {children}
      {respectfulIndicator}
    </span>
  )
}

// Specialized components for different content types

export function IndigenousHeading({
  level = 1,
  children,
  ...props
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
} & Omit<IndigenousTextProps, 'variant' | 'size'>) {
  const sizeMap = {
    1: '3xl' as const,
    2: '2xl' as const,
    3: 'xl' as const,
    4: 'lg' as const,
    5: 'base' as const,
    6: 'sm' as const
  }

  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <Tag>
      <IndigenousText
        variant="heading"
        size={sizeMap[level]}
        weight="semibold"
        {...props}
      >
        {children}
      </IndigenousText>
    </Tag>
  )
}

export function IndigenousDate({
  date,
  format = 'short',
  language,
  ...props
}: {
  date: Date
  format?: 'short' | 'long'
  language?: string
} & Omit<IndigenousTextProps, 'children'>) {
  const { currentLanguage } = useTranslation()
  const lang = language || currentLanguage
  
  const formattedDate = formatIndigenousDate(date, lang, format)

  return (
    <IndigenousText language={lang} {...props}>
      {formattedDate}
    </IndigenousText>
  )
}

export function IndigenousCurrency({
  amount,
  currency = 'CAD',
  language,
  ...props
}: {
  amount: number
  currency?: string
  language?: string
} & Omit<IndigenousTextProps, 'children'>) {
  const { currentLanguage } = useTranslation()
  const lang = language || currentLanguage
  
  const formattedAmount = formatIndigenousCurrency(amount, lang, currency)

  return (
    <IndigenousText language={lang} {...props}>
      {formattedAmount}
    </IndigenousText>
  )
}

export function IndigenousNumber({
  number,
  language,
  ...props
}: {
  number: number
  language?: string
} & Omit<IndigenousTextProps, 'children'>) {
  const { currentLanguage } = useTranslation()
  const lang = language || currentLanguage
  
  const formattedNumber = formatIndigenousNumber(number, lang)

  return (
    <IndigenousText language={lang} {...props}>
      {formattedNumber}
    </IndigenousText>
  )
}

// Sacred/Ceremonial Text Component
export function SacredText({
  children,
  showWarning = true,
  ...props
}: {
  children: React.ReactNode
  showWarning?: boolean
} & Omit<IndigenousTextProps, 'ceremonial' | 'respectful'>) {
  return (
    <div className="relative">
      {showWarning && (
        <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-300 flex items-center">
            <span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-2" />
            Sacred content - please treat with respect and cultural sensitivity
          </p>
        </div>
      )}
      <IndigenousText
        ceremonial
        respectful
        weight="medium"
        {...props}
      >
        {children}
      </IndigenousText>
    </div>
  )
}

// Bilingual Text Component
export function BilingualText({
  english,
  indigenous,
  primaryLanguage = 'indigenous',
  showBoth = true,
  ...props
}: {
  english: string
  indigenous: string
  primaryLanguage?: 'english' | 'indigenous'
  showBoth?: boolean
} & Omit<IndigenousTextProps, 'children' | 'language'>) {
  const { currentLanguage } = useTranslation()
  const isIndigenousLang = currentLanguage !== 'en'

  if (!showBoth) {
    return (
      <IndigenousText language={currentLanguage} {...props}>
        {isIndigenousLang ? indigenous : english}
      </IndigenousText>
    )
  }

  const primary = primaryLanguage === 'indigenous' ? indigenous : english
  const secondary = primaryLanguage === 'indigenous' ? english : indigenous
  const primaryLang = primaryLanguage === 'indigenous' ? currentLanguage : 'en'
  const secondaryLang = primaryLanguage === 'indigenous' ? 'en' : currentLanguage

  return (
    <div className="space-y-1">
      <IndigenousText language={primaryLang} weight="medium" {...props}>
        {primary}
      </IndigenousText>
      <IndigenousText 
        language={secondaryLang} 
        size="sm" 
        className="opacity-75"
        {...props}
      >
        {secondary}
      </IndigenousText>
    </div>
  )
}

// Text with Translation Note
export function IndigenousTextWithNote({
  children,
  note,
  ...props
}: {
  children: React.ReactNode
  note: string
} & IndigenousTextProps) {
  return (
    <div className="space-y-1">
      <IndigenousText {...props}>
        {children}
      </IndigenousText>
      <p className="text-xs text-gray-400 italic">
        {note}
      </p>
    </div>
  )
}