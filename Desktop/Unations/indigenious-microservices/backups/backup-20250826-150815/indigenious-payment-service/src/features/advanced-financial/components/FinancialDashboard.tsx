// Financial Dashboard Component
// Main financial overview and metrics dashboard

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  FileText, PieChart, Calendar, AlertCircle,
  Download, RefreshCw, Plus, Users, Feather,
  BarChart3, ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react'
import { FinancialMetrics, CurrencyCode } from '../types/financial.types'
import { useFinancialMetrics } from '../hooks/useFinancialMetrics'
import { formatCurrency } from '../utils/formatters'

interface FinancialDashboardProps {
  dateRange?: { start: Date; end: Date }
  onNavigate?: (section: string) => void
}

export function FinancialDashboard({
  dateRange,
  onNavigate
}: FinancialDashboardProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('CAD')
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  
  const { metrics, isLoading, refresh } = useFinancialMetrics(selectedPeriod)

  // Calculate percentage changes
  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0,
      Icon: change >= 0 ? ArrowUpRight : ArrowDownRight,
      color: change >= 0 ? 'emerald' : 'red'
    }
  }

  if (!metrics) return null

  const revenueChange = getChangeIndicator(metrics.revenue.total, metrics.revenue.total * 0.85)
  const expenseChange = getChangeIndicator(metrics.expenses.total, metrics.expenses.total * 1.1)
  const profitChange = getChangeIndicator(
    metrics.revenue.total - metrics.expenses.total,
    (metrics.revenue.total - metrics.expenses.total) * 0.9
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Financial Overview</h1>
          <p className="text-white/70">
            Real-time financial metrics and insights
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month' | 'year')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="day" className="bg-gray-800">Today</option>
            <option value="week" className="bg-gray-800">This Week</option>
            <option value="month" className="bg-gray-800">This Month</option>
            <option value="year" className="bg-gray-800">This Year</option>
          </select>

          {/* Currency Selector */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="CAD" className="bg-gray-800">CAD</option>
            <option value="USD" className="bg-gray-800">USD</option>
          </select>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 
            backdrop-blur-md border border-emerald-400/30 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div className={`flex items-center space-x-1 text-${revenueChange.color}-400`}>
              <revenueChange.Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{revenueChange.value}%</span>
            </div>
          </div>
          <p className="text-white/70 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(metrics.revenue.total, selectedCurrency)}
          </p>
          <p className="text-emerald-300 text-sm mt-2">
            Forecast: {formatCurrency(metrics.revenue.forecast, selectedCurrency)}
          </p>
        </motion.div>

        {/* Expenses Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-500/20 to-red-600/20 
            backdrop-blur-md border border-red-400/30 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div className={`flex items-center space-x-1 text-${expenseChange.color}-400`}>
              <expenseChange.Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{expenseChange.value}%</span>
            </div>
          </div>
          <p className="text-white/70 text-sm mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(metrics.expenses.total, selectedCurrency)}
          </p>
          <p className="text-red-300 text-sm mt-2">
            Burn rate: {formatCurrency(metrics.expenses.burnRate, selectedCurrency)}/month
          </p>
        </motion.div>

        {/* Profit Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 
            backdrop-blur-md border border-blue-400/30 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div className={`flex items-center space-x-1 text-${profitChange.color}-400`}>
              <profitChange.Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{profitChange.value}%</span>
            </div>
          </div>
          <p className="text-white/70 text-sm mb-1">Net Profit</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(metrics.revenue.total - metrics.expenses.total, selectedCurrency)}
          </p>
          <p className="text-blue-300 text-sm mt-2">
            Margin: {metrics.profitability.netMargin.toFixed(1)}%
          </p>
        </motion.div>

        {/* Cash Flow Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 
            backdrop-blur-md border border-purple-400/30 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
              Operating
            </span>
          </div>
          <p className="text-white/70 text-sm mb-1">Cash Flow</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(metrics.cashFlow.net, selectedCurrency)}
          </p>
          <p className="text-purple-300 text-sm mt-2">
            Available: {formatCurrency(metrics.cashFlow.operating, selectedCurrency)}
          </p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate?.('invoices')}
          className="p-4 bg-white/10 hover:bg-white/15 border border-white/20 
            rounded-xl transition-all group"
        >
          <FileText className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-white font-medium">Create Invoice</p>
          <p className="text-white/60 text-sm">Quick invoice generation</p>
        </button>

        <button
          onClick={() => onNavigate?.('expenses')}
          className="p-4 bg-white/10 hover:bg-white/15 border border-white/20 
            rounded-xl transition-all group"
        >
          <CreditCard className="w-6 h-6 text-emerald-400 mb-2" />
          <p className="text-white font-medium">Record Expense</p>
          <p className="text-white/60 text-sm">Track spending</p>
        </button>

        <button
          onClick={() => onNavigate?.('reports')}
          className="p-4 bg-white/10 hover:bg-white/15 border border-white/20 
            rounded-xl transition-all group"
        >
          <PieChart className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-white font-medium">View Reports</p>
          <p className="text-white/60 text-sm">Financial analytics</p>
        </button>

        <button
          onClick={() => onNavigate?.('budgets')}
          className="p-4 bg-white/10 hover:bg-white/15 border border-white/20 
            rounded-xl transition-all group"
        >
          <Calendar className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-white font-medium">Manage Budgets</p>
          <p className="text-white/60 text-sm">Budget planning</p>
        </button>
      </div>

      {/* Indigenous Impact Section */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 
        backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Feather className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Indigenous Economic Impact</h2>
          </div>
          <button
            onClick={() => onNavigate?.('indigenous-impact')}
            className="text-purple-300 hover:text-purple-200 text-sm"
          >
            View Details →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-white/70 text-sm mb-1">Community Investment</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(metrics.indigenousImpact.communitySpend, selectedCurrency)}
            </p>
            <p className="text-purple-300 text-sm mt-1">
              {metrics.indigenousImpact.percentOfTotal.toFixed(1)}% of total
            </p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Local Suppliers</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(metrics.indigenousImpact.communitySpend * 0.6, selectedCurrency)}
            </p>
            <p className="text-purple-300 text-sm mt-1">
              18 Indigenous businesses
            </p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Jobs Created</p>
            <p className="text-2xl font-bold text-white">
              {metrics.indigenousImpact.jobsCreated}
            </p>
            <p className="text-purple-300 text-sm mt-1">
              85% Indigenous hires
            </p>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Youth Trained</p>
            <p className="text-2xl font-bold text-white">
              {metrics.indigenousImpact.youthTrained}
            </p>
            <p className="text-purple-300 text-sm mt-1">
              Capacity building
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Category</h3>
          <div className="space-y-3">
            {Object.entries(metrics.revenue.byCategory).map(([category, amount]) => {
              const percentage = (amount / metrics.revenue.total) * 100
              
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/80 text-sm capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(amount, selectedCurrency)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Key Performance Indicators</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white/70 text-sm">Days Sales Outstanding</p>
                <p className="text-white font-medium">{metrics.kpis.dso} days</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                metrics.kpis.dso < 30 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {metrics.kpis.dso < 30 ? 'Good' : 'Monitor'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white/70 text-sm">Current Ratio</p>
                <p className="text-white font-medium">{metrics.kpis.currentRatio.toFixed(2)}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                metrics.kpis.currentRatio > 1.5 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {metrics.kpis.currentRatio > 1.5 ? 'Healthy' : 'Risk'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white/70 text-sm">Gross Margin</p>
                <p className="text-white font-medium">{metrics.profitability.grossMargin.toFixed(1)}%</p>
              </div>
              <div className="text-blue-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white/70 text-sm">EBITDA</p>
                <p className="text-white font-medium">
                  {formatCurrency(metrics.profitability.ebitda, selectedCurrency)}
                </p>
              </div>
              <div className="text-emerald-300">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {metrics.kpis.dso > 45 && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <p className="text-amber-200 font-medium">Collection Alert</p>
              <p className="text-amber-100/80 text-sm mt-1">
                Average collection time is {metrics.kpis.dso} days. Consider following up on overdue invoices.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}