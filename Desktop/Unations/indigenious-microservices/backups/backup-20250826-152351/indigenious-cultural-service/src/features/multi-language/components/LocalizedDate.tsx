// Localized Date Component
// Component for displaying dates in culturally appropriate formats

import { useMemo } from 'react'
import { Calendar, Moon, Sun, Feather } from 'lucide-react'
import { useTranslation } from '../contexts/TranslationContext'
import { useTranslationHelpers } from '../hooks/useTranslation'

interface LocalizedDateProps {
  date: Date | string
  format?: 'short' | 'medium' | 'long' | 'full' | 'relative' | 'traditional'
  showTime?: boolean
  showTraditionalCalendar?: boolean
  showLunarPhase?: boolean
  className?: string
}

export function LocalizedDate({
  date,
  format = 'medium',
  showTime = false,
  showTraditionalCalendar = true,
  showLunarPhase = false,
  className = ''
}: LocalizedDateProps) {
  const { 
    formatDate, 
    currentLanguage, 
    isIndigenousLanguage,
    localizationSettings 
  } = useTranslation()
  
  const { formatRelativeTime } = useTranslationHelpers()

  const dateObj = useMemo(() => {
    return typeof date === 'string' ? new Date(date) : date
  }, [date])

  // Calculate lunar phase (simplified)
  const getLunarPhase = (date: Date): string => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    
    // Simplified lunar phase calculation
    const c = Math.floor(365.25 * year)
    const e = Math.floor(30.6 * month)
    const jd = c + e + day + 1720994.5
    const phase = ((jd - 2451549.5) / 29.53) % 1
    
    if (phase < 0.0625) return 'New Moon'
    if (phase < 0.1875) return 'Waxing Crescent'
    if (phase < 0.3125) return 'First Quarter'
    if (phase < 0.4375) return 'Waxing Gibbous'
    if (phase < 0.5625) return 'Full Moon'
    if (phase < 0.6875) return 'Waning Gibbous'
    if (phase < 0.8125) return 'Last Quarter'
    if (phase < 0.9375) return 'Waning Crescent'
    return 'New Moon'
  }

  // Get formatted date based on format type
  const formattedDate = useMemo(() => {
    if (format === 'relative') {
      return formatRelativeTime(dateObj)
    }

    if (format === 'traditional' && isIndigenousLanguage() && 
        localizationSettings.calendar?.type === 'traditional') {
      // Use traditional calendar format
      const traditionalMonths = localizationSettings.calendar.traditionalMonths
      if (traditionalMonths) {
        const month = dateObj.getMonth()
        const traditionalMonth = traditionalMonths[month]
        const day = dateObj.getDate()
        const year = dateObj.getFullYear()
        
        return `${day} ${traditionalMonth} ${year}`
      }
    }

    // Standard date formatting
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: format === 'short' ? 'short' : 
                 format === 'long' ? 'long' :
                 format === 'full' ? 'full' : 'medium'
    }

    if (showTime) {
      options.timeStyle = format === 'short' ? 'short' : 'medium'
    }

    return dateObj.toLocaleDateString(currentLanguage, options)
  }, [dateObj, format, formatDate, formatRelativeTime, currentLanguage, 
      isIndigenousLanguage, localizationSettings, showTime])

  // Get traditional calendar info
  const traditionalInfo = useMemo(() => {
    if (!showTraditionalCalendar || !isIndigenousLanguage() || 
        !localizationSettings.calendar?.traditionalMonths) {
      return null
    }

    const month = dateObj.getMonth()
    const traditionalMonth = localizationSettings.calendar.traditionalMonths[month]
    
    // Check for ceremonies
    const ceremonies = localizationSettings.calendar.ceremonies?.filter(
      ceremony => ceremony.date.toLowerCase() === dateObj.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()
    )

    return {
      month: traditionalMonth,
      ceremonies
    }
  }, [dateObj, showTraditionalCalendar, isIndigenousLanguage, localizationSettings])

  // Get lunar phase
  const lunarPhase = useMemo(() => {
    return showLunarPhase ? getLunarPhase(dateObj) : null
  }, [dateObj, showLunarPhase])

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-white/60" />
        <span className="text-white/90">{formattedDate}</span>
        
        {traditionalInfo && (
          <div className="flex items-center space-x-1">
            <Feather className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300 text-sm">({traditionalInfo.month})</span>
          </div>
        )}
      </div>

      {/* Additional information */}
      {(lunarPhase || traditionalInfo?.ceremonies) && (
        <div className="mt-1 ml-6 space-y-1">
          {lunarPhase && (
            <div className="flex items-center space-x-2 text-sm">
              <Moon className="w-3 h-3 text-indigo-400" />
              <span className="text-indigo-300">{lunarPhase}</span>
            </div>
          )}

          {traditionalInfo?.ceremonies?.map((ceremony, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <Sun className="w-3 h-3 text-amber-400 mt-0.5" />
              <div>
                <span className="text-amber-300">{ceremony.name}</span>
                {ceremony.restrictions && (
                  <ul className="text-xs text-amber-200/70 mt-0.5">
                    {ceremony.restrictions.map((restriction, idx) => (
                      <li key={idx}>• {restriction}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Date range component
interface LocalizedDateRangeProps {
  startDate: Date | string
  endDate: Date | string
  format?: 'short' | 'medium' | 'long'
  separator?: string
  className?: string
}

export function LocalizedDateRange({
  startDate,
  endDate,
  format = 'medium',
  separator = ' - ',
  className = ''
}: LocalizedDateRangeProps) {
  const { currentLanguage } = useTranslation()
  
  const startObj = typeof startDate === 'string' ? new Date(startDate) : startDate
  const endObj = typeof endDate === 'string' ? new Date(endDate) : endDate

  const formattedRange = useMemo(() => {
    // Check if dates are in the same month/year for smarter formatting
    const sameYear = startObj.getFullYear() === endObj.getFullYear()
    const sameMonth = sameYear && startObj.getMonth() === endObj.getMonth()

    if (sameMonth) {
      // Show full date for start, only day for end
      const startFormatted = startObj.toLocaleDateString(currentLanguage, {
        day: 'numeric'
      })
      const endFormatted = endObj.toLocaleDateString(currentLanguage, {
        dateStyle: format === 'short' ? 'short' : 'medium'
      })
      return `${startFormatted}${separator}${endFormatted}`
    }

    // Different months
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: format === 'short' ? 'short' : 'medium'
    }

    const startFormatted = startObj.toLocaleDateString(currentLanguage, options)
    const endFormatted = endObj.toLocaleDateString(currentLanguage, options)
    
    return `${startFormatted}${separator}${endFormatted}`
  }, [startObj, endObj, currentLanguage, format, separator])

  return (
    <span className={className}>
      {formattedRange}
    </span>
  )
}

// Relative time component
interface LocalizedRelativeTimeProps {
  date: Date | string
  autoUpdate?: boolean
  className?: string
}

export function LocalizedRelativeTime({
  date,
  autoUpdate = false,
  className = ''
}: LocalizedRelativeTimeProps) {
  const { formatRelativeTime } = useTranslationHelpers()
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      forceUpdate()
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [autoUpdate])

  const relativeTime = formatRelativeTime(date)

  return (
    <span className={className}>
      {relativeTime}
    </span>
  )
}