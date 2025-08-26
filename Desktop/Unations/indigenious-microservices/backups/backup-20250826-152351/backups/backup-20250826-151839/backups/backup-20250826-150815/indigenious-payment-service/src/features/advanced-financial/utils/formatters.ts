// Financial Formatters
// Currency and number formatting utilities

import { CurrencyCode } from '../types/financial.types'

// Currency symbols
const currencySymbols: Record<CurrencyCode, string> = {
  CAD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  BTC: '₿',
  ETH: 'Ξ',
  ITU: '◊' // Indigenous Trade Units
}

// Format currency with proper locale
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'CAD',
  options?: Intl.NumberFormatOptions
): string {
  const locale = getLocaleForCurrency(currency)
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'ITU' ? 'CAD' : currency, // Use CAD for ITU formatting
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(amount).replace('CA$', currencySymbols[currency])
}

// Get locale for currency
function getLocaleForCurrency(currency: CurrencyCode): string {
  const localeMap: Record<CurrencyCode, string> = {
    CAD: 'en-CA',
    USD: 'en-US',
    EUR: 'fr-FR',
    GBP: 'en-GB',
    BTC: 'en-US',
    ETH: 'en-US',
    ITU: 'en-CA' // Use Canadian locale for ITU
  }
  return localeMap[currency] || 'en-CA'
}

// Format percentage
export function formatPercentage(
  value: number,
  decimals = 1,
  includeSign = true
): string {
  const formatted = value.toFixed(decimals)
  return includeSign ? `${formatted}%` : formatted
}

// Format number with commas
export function formatNumber(
  value: number,
  decimals = 0
): string {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

// Format compact number (1.2K, 3.4M, etc)
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value)
}

// Format date for financial documents
export function formatFinancialDate(
  date: string | Date,
  format: 'short' | 'long' | 'invoice' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'long':
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj)
    
    case 'invoice':
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(dateObj)
    
    default:
      return new Intl.DateTimeFormat('en-CA').format(dateObj)
  }
}

// Format payment terms
export function formatPaymentTerms(terms: string): string {
  const termMap: Record<string, string> = {
    'net_15': 'Net 15 days',
    'net_30': 'Net 30 days',
    'net_45': 'Net 45 days',
    'net_60': 'Net 60 days',
    'net_90': 'Net 90 days',
    'due_on_receipt': 'Due on receipt',
    'custom': 'Custom terms'
  }
  return termMap[terms] || terms
}

// Format invoice number
export function formatInvoiceNumber(
  prefix: string,
  number: number,
  year?: number
): string {
  const yearStr = year || new Date().getFullYear()
  const paddedNumber = String(number).padStart(4, '0')
  return `${prefix}-${yearStr}-${paddedNumber}`
}

// Format tax number
export function formatTaxNumber(number: string, type: 'gst' | 'pst' | 'business'): string {
  const cleaned = number.replace(/\D/g, '')
  
  switch (type) {
    case 'gst':
      // Format: 123456789RT0001
      if (cleaned.length >= 9) {
        return `${cleaned.slice(0, 9)}RT${cleaned.slice(9).padStart(4, '0')}`
      }
      return cleaned
    
    case 'business':
      // Format: 123456789
      return cleaned.slice(0, 9)
    
    default:
      return cleaned
  }
}

// Format phone number
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}

// Format file size
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

// Format duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 7) {
    return formatFinancialDate(dateObj, 'short')
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

// Parse currency string to number
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$€£¥◊,]/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Validate currency format
export function isValidCurrency(value: string): boolean {
  const pattern = /^[$€£¥◊]?\s*\d{1,3}(,\d{3})*(\.\d{2})?$/
  return pattern.test(value.trim())
}