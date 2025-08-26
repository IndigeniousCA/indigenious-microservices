// Financial Dashboard Component
// Main interface for financial management and payments

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, TrendingUp, TrendingDown, FileText, 
  CreditCard, Building, AlertCircle, Download, Plus,
  Calendar, Clock, PieChart, BarChart3, ArrowUpRight,
  ArrowDownRight, Wallet, Receipt
} from 'lucide-react'
import { InvoiceManagement } from './InvoiceManagement'
import { PaymentProcessing } from './PaymentProcessing'
import { BankingIntegration } from './BankingIntegration'
import { FinancialReports } from './FinancialReports'
import { TaxCompliance } from './TaxCompliance'
import { useFinancial } from '../hooks/useFinancial'

interface FinancialDashboardProps {
  vendorId: string
  userRole: 'vendor' | 'buyer' | 'admin'
}

export function FinancialDashboard({ vendorId, userRole }: FinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'banking' | 'reports' | 'tax'>('overview')
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')
  
  const {
    financialData,
    loading,
    error,
    refreshData
  } = useFinancial(vendorId, { timeRange })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading financial data...</p>
        </div>
      </div>
    )
  }

  if (error || !financialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Financial Data</h2>
          <p className="text-white/60">{error || 'Please try again later'}</p>
        </div>
      </div>
    )
  }

  const { summary, cashFlow, recentTransactions, upcomingPayments } = financialData

  // Calculate trends
  const revenueChange = ((summary.currentRevenue - summary.previousRevenue) / summary.previousRevenue) * 100
  const expenseChange = ((summary.currentExpenses - summary.previousExpenses) / summary.previousExpenses) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Financial Management</h1>
              <p className="text-white/60">
                Track payments, manage invoices, and monitor financial health
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {/* Open quick invoice */}}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                  border-emerald-400/50 rounded-xl text-emerald-100 font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Invoice
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {/* Export */}}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                  rounded-xl text-white font-medium transition-all duration-200 
                  flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </motion.button>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
            {(['month', 'quarter', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {range === 'month' ? 'This Month' : 
                 range === 'quarter' ? 'This Quarter' : 'This Year'}
              </button>
            ))}
          </div>

          <div className="text-sm text-white/60">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'overview'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <PieChart className="w-4 h-4 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'invoices'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Invoices
            {summary.unpaidInvoices > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 
                text-xs rounded-full">
                {summary.unpaidInvoices}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'payments'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </button>
          <button
            onClick={() => setActiveTab('banking')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'banking'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Building className="w-4 h-4 mr-2" />
            Banking
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'reports'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
              whitespace-nowrap flex items-center ${
              activeTab === 'tax'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Tax
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FinancialOverview 
                summary={summary}
                cashFlow={cashFlow}
                recentTransactions={recentTransactions}
                upcomingPayments={upcomingPayments}
                revenueChange={revenueChange}
                expenseChange={expenseChange}
              />
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <InvoiceManagement vendorId={vendorId} userRole={userRole} />
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PaymentProcessing vendorId={vendorId} userRole={userRole} />
            </motion.div>
          )}

          {activeTab === 'banking' && (
            <motion.div
              key="banking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BankingIntegration vendorId={vendorId} />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FinancialReports vendorId={vendorId} timeRange={timeRange} />
            </motion.div>
          )}

          {activeTab === 'tax' && (
            <motion.div
              key="tax"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TaxCompliance vendorId={vendorId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Financial Overview Component
function FinancialOverview({ 
  summary, 
  cashFlow, 
  recentTransactions, 
  upcomingPayments,
  revenueChange,
  expenseChange
}: any) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${summary.currentRevenue.toLocaleString()}
          </p>
          <div className="flex items-center mt-2">
            {revenueChange >= 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 mr-1" />
                <span className="text-sm text-emerald-400">+{revenueChange.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
                <span className="text-sm text-red-400">{revenueChange.toFixed(1)}%</span>
              </>
            )}
            <span className="text-sm text-white/40 ml-2">vs last period</span>
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Outstanding</span>
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${summary.outstandingAmount.toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-2">
            {summary.unpaidInvoices} unpaid invoices
          </p>
        </div>

        {/* Cash Balance */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Cash Balance</span>
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${summary.cashBalance.toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-2">
            Across {summary.connectedAccounts} accounts
          </p>
        </div>

        {/* Net Income */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Net Income</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className={`text-2xl font-bold ${
            summary.netIncome >= 0 ? 'text-white' : 'text-red-400'
          }`}>
            ${Math.abs(summary.netIncome).toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-2">
            {((summary.netIncome / summary.currentRevenue) * 100).toFixed(1)}% margin
          </p>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Cash Flow</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2" />
              <span className="text-white/60">Income</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              <span className="text-white/60">Expenses</span>
            </div>
          </div>
        </div>
        
        {/* Chart placeholder */}
        <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
          <p className="text-white/40">Cash flow chart would go here</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View all
            </button>
          </div>
          
          <div className="space-y-3">
            {recentTransactions.map((transaction: any, index: number) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'credit' 
                      ? 'bg-emerald-500/20' 
                      : 'bg-red-500/20'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-white/60">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className={`font-medium ${
                  transaction.type === 'credit' 
                    ? 'text-emerald-400' 
                    : 'text-red-400'
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}
                  ${transaction.amount.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Upcoming Payments</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Schedule
            </button>
          </div>
          
          <div className="space-y-3">
            {upcomingPayments.map((payment: any, index: number) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {payment.description}
                    </p>
                    <p className="text-xs text-white/60">
                      Due {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    ${payment.amount.toLocaleString()}
                  </p>
                  {payment.isOverdue && (
                    <p className="text-xs text-red-400">Overdue</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Indigenous Content Tracking */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-100">Indigenous Content Value</h3>
          <span className="text-2xl font-bold text-purple-100">
            ${summary.indigenousContentValue.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-purple-100/60">Employment</p>
            <p className="text-lg font-semibold text-purple-100">
              ${summary.indigenousEmployment.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-100/60">Subcontracting</p>
            <p className="text-lg font-semibold text-purple-100">
              ${summary.indigenousSubcontracting.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-100/60">Procurement</p>
            <p className="text-lg font-semibold text-purple-100">
              ${summary.indigenousProcurement.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}