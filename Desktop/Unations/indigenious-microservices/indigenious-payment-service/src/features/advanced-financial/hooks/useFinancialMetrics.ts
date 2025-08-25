// Financial Metrics Hook
// Calculate and track financial metrics

import { useState, useEffect, useCallback, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { FinancialMetrics, TransactionCategory } from '../types/financial.types'

export function useFinancialMetrics(period: 'day' | 'week' | 'month' | 'year') {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(start.getFullYear() - 1)
        break
    }

    return { start, end }
  }, [period])

  // Load financial metrics
  const loadMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In production, this would fetch from API
      const mockMetrics: FinancialMetrics = {
        period,
        revenue: {
          total: 1250000,
          growth: 15.5,
          byCategory: {
            'government_contracts': 750000,
            'private_sector': 350000,
            'consulting': 100000,
            'training': 50000
          },
          forecast: 1450000
        },
        expenses: {
          total: 875000,
          byCategory: {
            'revenue': 0,
            'materials': 250000,
            'labor': 400000,
            'equipment': 50000,
            'travel': 25000,
            'professional_fees': 35000,
            'utilities': 15000,
            'rent': 40000,
            'insurance': 20000,
            'taxes': 0,
            'cultural_activities': 15000,
            'community_investment': 20000,
            'elder_compensation': 5000,
            'other': 0
          },
          burnRate: 72916 // Monthly average
        },
        profitability: {
          grossMargin: 42.5,
          netMargin: 30.0,
          ebitda: 425000
        },
        cashFlow: {
          operating: 350000,
          investing: -75000,
          financing: -50000,
          net: 225000
        },
        indigenousImpact: {
          communitySpend: 187500,
          percentOfTotal: 15.0,
          jobsCreated: 24,
          youthTrained: 12
        },
        kpis: {
          dso: 32, // Days Sales Outstanding
          currentRatio: 2.1,
          quickRatio: 1.8,
          debtToEquity: 0.3
        }
      }

      // Adjust metrics based on period
      if (period === 'day') {
        // Scale down to daily values
        Object.keys(mockMetrics.revenue.byCategory).forEach(key => {
          mockMetrics.revenue.byCategory[key] /= 30
        })
        mockMetrics.revenue.total /= 30
        mockMetrics.revenue.forecast /= 30
        mockMetrics.expenses.total /= 30
        Object.keys(mockMetrics.expenses.byCategory).forEach(key => {
          mockMetrics.expenses.byCategory[key as TransactionCategory] /= 30
        })
      } else if (period === 'week') {
        // Scale to weekly values
        Object.keys(mockMetrics.revenue.byCategory).forEach(key => {
          mockMetrics.revenue.byCategory[key] /= 4
        })
        mockMetrics.revenue.total /= 4
        mockMetrics.revenue.forecast /= 4
        mockMetrics.expenses.total /= 4
        Object.keys(mockMetrics.expenses.byCategory).forEach(key => {
          mockMetrics.expenses.byCategory[key as TransactionCategory] /= 4
        })
      }

      setMetrics(mockMetrics)
    } catch (err) {
      setError('Failed to load financial metrics')
      logger.error('Failed to load financial metrics', err)
    } finally {
      setIsLoading(false)
    }
  }, [period])

  // Load metrics on mount and period change
  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Refresh metrics
  const refresh = useCallback(() => {
    loadMetrics()
  }, [loadMetrics])

  // Calculate custom metrics
  const calculateTrend = useCallback((current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }, [])

  // Export metrics data
  const exportMetrics = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    if (!metrics) return

    try {
      // In production, this would generate actual export
      logger.info(`Exporting metrics as ${format}`)
      
      // Mock download
      const blob = new Blob([JSON.stringify(metrics, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-metrics-${period}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      logger.error('Export failed:', err)
    }
  }, [metrics, period])

  return {
    metrics,
    isLoading,
    error,
    refresh,
    calculateTrend,
    exportMetrics,
    dateRange
  }
}