// Localized Number Component
// Component for displaying numbers in culturally appropriate formats

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslation } from '../contexts/TranslationContext'
import { useTranslationHelpers } from '../hooks/useTranslation'

interface LocalizedNumberProps {
  value: number
  format?: 'decimal' | 'percent' | 'currency' | 'compact' | 'traditional'
  decimals?: number
  currency?: string
  showTrend?: boolean
  previousValue?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function LocalizedNumber({
  value,
  format = 'decimal',
  decimals,
  currency,
  showTrend = false,
  previousValue,
  prefix = '',
  suffix = '',
  className = ''
}: LocalizedNumberProps) {
  const { 
    formatNumber, 
    formatCurrency, 
    currentLanguage,
    isIndigenousLanguage 
  } = useTranslation()
  
  const { formatPercentage } = useTranslationHelpers()

  // Format the number based on type
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'percent':
        return formatPercentage(value, decimals)
      
      case 'currency':
        return formatCurrency(value, currency)
      
      case 'compact':
        return new Intl.NumberFormat(currentLanguage, {
          notation: 'compact',
          compactDisplay: 'short',
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 2
        }).format(value)
      
      case 'traditional':
        // For Indigenous languages, could use traditional counting
        if (isIndigenousLanguage() && value <= 20) {
          // This would need actual traditional number mappings
          return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        }
        return formatNumber(value, { 
          minimumFractionDigits: decimals ?? 0, 
          maximumFractionDigits: decimals ?? 2 
        })
      
      default:
        return formatNumber(value, {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 2
        })
    }
  }, [value, format, decimals, currency, formatNumber, formatCurrency, 
      formatPercentage, currentLanguage, isIndigenousLanguage])

  // Calculate trend
  const trend = useMemo(() => {
    if (!showTrend || previousValue === undefined) return null
    
    const change = value - previousValue
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: change,
      percent: changePercent
    }
  }, [value, previousValue, showTrend])

  // Get trend color
  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-emerald-400'
      case 'down': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <span className="text-white/90">
        {prefix}{formattedValue}{suffix}
      </span>
      
      {trend && (
        <div className={`flex items-center space-x-1 text-sm ${getTrendColor(trend.direction)}`}>
          {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
          {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
          {trend.direction === 'neutral' && <Minus className="w-4 h-4" />}
          <span>{Math.abs(trend.percent).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

// Animated counter component
interface AnimatedNumberProps extends Omit<LocalizedNumberProps, 'value'> {
  from?: number
  to: number
  duration?: number
  delay?: number
}

export function AnimatedNumber({
  from = 0,
  to,
  duration = 2000,
  delay = 0,
  ...props
}: AnimatedNumberProps) {
  const [value, setValue] = React.useState(from)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now()
      const endTime = startTime + duration
      const diff = to - from

      const updateValue = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        
        // Easing function (ease-out-expo)
        const eased = 1 - Math.pow(2, -10 * progress)
        const currentValue = from + (diff * eased)
        
        setValue(currentValue)
        
        if (progress < 1) {
          requestAnimationFrame(updateValue)
        }
      }

      requestAnimationFrame(updateValue)
    }, delay)

    return () => clearTimeout(timeout)
  }, [from, to, duration, delay])

  return <LocalizedNumber {...props} value={value} />
}

// Statistics display component
interface LocalizedStatProps {
  label: string
  value: number
  format?: LocalizedNumberProps['format']
  decimals?: number
  currency?: string
  trend?: number
  icon?: React.ReactNode
  color?: string
}

export function LocalizedStat({
  label,
  value,
  format = 'decimal',
  decimals,
  currency,
  trend,
  icon,
  color = 'blue'
}: LocalizedStatProps) {
  const { t } = useTranslation()

  const colorClasses = {
    blue: 'border-blue-400/50 bg-blue-500/10',
    emerald: 'border-emerald-400/50 bg-emerald-500/10',
    purple: 'border-purple-400/50 bg-purple-500/10',
    amber: 'border-amber-400/50 bg-amber-500/10',
    red: 'border-red-400/50 bg-red-500/10'
  }

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color as keyof typeof colorClasses]} 
      backdrop-blur-md`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-white/60 text-sm">{label}</span>
        {icon && <div className="text-white/40">{icon}</div>}
      </div>
      
      <LocalizedNumber
        value={value}
        format={format}
        decimals={decimals}
        currency={currency}
        showTrend={trend !== undefined}
        previousValue={trend !== undefined ? value - trend : undefined}
        className="text-2xl font-bold"
      />
    </div>
  )
}

// Number range component
interface LocalizedNumberRangeProps {
  min: number
  max: number
  format?: LocalizedNumberProps['format']
  decimals?: number
  currency?: string
  separator?: string
  className?: string
}

export function LocalizedNumberRange({
  min,
  max,
  format = 'decimal',
  decimals,
  currency,
  separator = ' - ',
  className = ''
}: LocalizedNumberRangeProps) {
  return (
    <span className={className}>
      <LocalizedNumber
        value={min}
        format={format}
        decimals={decimals}
        currency={currency}
      />
      <span className="text-white/60">{separator}</span>
      <LocalizedNumber
        value={max}
        format={format}
        decimals={decimals}
        currency={currency}
      />
    </span>
  )
}