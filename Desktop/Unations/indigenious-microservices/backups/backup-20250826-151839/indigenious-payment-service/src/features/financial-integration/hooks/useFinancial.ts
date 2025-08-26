// Financial Hook
// Main hook for financial dashboard and operations

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '../../../shared/hooks/useDataProvider'
import type { 
  FinancialDashboardData, 
  Invoice, 
  Payment, 
  BankingIntegration,
  FinancialStats 
} from '../types/financial.types'

export function useFinancial(vendorId: string) {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null)
  const dataProvider = useDataProvider()

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // This would be implemented with actual data provider
      // For now, using mock data structure
      const data: FinancialDashboardData = {
        totalRevenue: 125000,
        revenueGrowth: 15.5,
        outstandingInvoices: 45000,
        overdueAmount: 12000,
        avgPaymentTime: 18,
        
        cashFlow: {
          current: 25000,
          projected30Days: 35000,
          trend: 'positive'
        },
        
        recentInvoices: [],
        upcomingPayments: [],
        
        monthlyStats: {
          invoicesSent: 12,
          invoicesPaid: 8,
          avgInvoiceValue: 5200,
          collectionRate: 92
        },
        
        yearlyBreakdown: {
          q1: { revenue: 28000, expenses: 18000 },
          q2: { revenue: 32000, expenses: 20000 },
          q3: { revenue: 35000, expenses: 22000 },
          q4: { revenue: 30000, expenses: 19000 }
        }
      }
      
      setDashboardData(data)
    } catch (error) {
      logger.error('Failed to fetch financial dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate financial health score
  const calculateHealthScore = (): number => {
    if (!dashboardData) return 0
    
    let score = 0
    const factors = []
    
    // Cash flow health (30%)
    if (dashboardData.cashFlow.trend === 'positive') {
      score += 30
      factors.push('Strong cash flow')
    } else if (dashboardData.cashFlow.trend === 'stable') {
      score += 20
      factors.push('Stable cash flow')
    } else {
      factors.push('Declining cash flow')
    }
    
    // Collection efficiency (25%)
    const collectionRate = dashboardData.monthlyStats.collectionRate
    if (collectionRate >= 95) {
      score += 25
      factors.push('Excellent collections')
    } else if (collectionRate >= 85) {
      score += 20
      factors.push('Good collections')
    } else if (collectionRate >= 75) {
      score += 15
      factors.push('Fair collections')
    } else {
      factors.push('Poor collections')
    }
    
    // Revenue growth (20%)
    if (dashboardData.revenueGrowth > 15) {
      score += 20
      factors.push('High growth')
    } else if (dashboardData.revenueGrowth > 5) {
      score += 15
      factors.push('Moderate growth')
    } else if (dashboardData.revenueGrowth > 0) {
      score += 10
      factors.push('Slow growth')
    } else {
      factors.push('Declining revenue')
    }
    
    // Overdue management (15%)
    const overdueRatio = dashboardData.overdueAmount / dashboardData.outstandingInvoices
    if (overdueRatio < 0.1) {
      score += 15
      factors.push('Low overdue amounts')
    } else if (overdueRatio < 0.2) {
      score += 10
      factors.push('Manageable overdue amounts')
    } else {
      factors.push('High overdue amounts')
    }
    
    // Payment speed (10%)
    if (dashboardData.avgPaymentTime <= 15) {
      score += 10
      factors.push('Fast payments')
    } else if (dashboardData.avgPaymentTime <= 30) {
      score += 7
      factors.push('Average payment speed')
    } else {
      factors.push('Slow payments')
    }
    
    return Math.min(score, 100)
  }

  // Get financial insights
  const getFinancialInsights = () => {
    if (!dashboardData) return []
    
    const insights = []
    
    // Cash flow insights
    if (dashboardData.cashFlow.current < 10000) {
      insights.push({
        type: 'warning',
        title: 'Low Cash Flow',
        message: 'Consider following up on outstanding invoices to improve cash position.',
        action: 'Review receivables'
      })
    }
    
    // Overdue insights
    const overdueRatio = dashboardData.overdueAmount / dashboardData.outstandingInvoices
    if (overdueRatio > 0.25) {
      insights.push({
        type: 'alert',
        title: 'High Overdue Amount',
        message: 'More than 25% of outstanding invoices are overdue.',
        action: 'Implement collection strategy'
      })
    }
    
    // Growth insights
    if (dashboardData.revenueGrowth < 0) {
      insights.push({
        type: 'alert',
        title: 'Declining Revenue',
        message: 'Revenue has decreased compared to previous period.',
        action: 'Review business strategy'
      })
    } else if (dashboardData.revenueGrowth > 20) {
      insights.push({
        type: 'success',
        title: 'Strong Growth',
        message: 'Revenue is growing rapidly. Consider expanding capacity.',
        action: 'Scale operations'
      })
    }
    
    // Indigenous content tracking
    insights.push({
      type: 'info',
      title: 'Indigenous Content Tracking',
      message: 'Ensure all Indigenous supplier relationships are properly documented for compliance.',
      action: 'Update vendor records'
    })
    
    return insights
  }

  // Export financial data
  const exportFinancialData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // This would call the actual export service
      logger.info(`Exporting financial data as ${format}`)
      
      // Mock export process
      return {
        success: true,
        downloadUrl: `/exports/financial-data-${Date.now()}.${format}`
      }
    } catch (error) {
      logger.error('Failed to export financial data:', error)
      throw error
    }
  }

  // Refresh dashboard data
  const refreshData = async () => {
    await fetchDashboardData()
  }

  useEffect(() => {
    if (vendorId) {
      fetchDashboardData()
    }
  }, [vendorId])

  return {
    dashboardData,
    loading,
    healthScore: calculateHealthScore(),
    insights: getFinancialInsights(),
    refreshData,
    exportFinancialData
  }
}