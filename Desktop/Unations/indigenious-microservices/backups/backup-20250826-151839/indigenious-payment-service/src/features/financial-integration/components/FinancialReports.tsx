// Financial Reports Component
// Generate and view financial reports

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, PieChart, TrendingUp, Download, Calendar,
  FileText, DollarSign, Users, Building, ArrowUpRight,
  ArrowDownRight, Filter, Printer, Share2, Info
} from 'lucide-react'
import { useFinancialReports } from '../hooks/useFinancialReports'

interface FinancialReportsProps {
  vendorId: string
  timeRange: 'month' | 'quarter' | 'year'
}

export function FinancialReports({ vendorId, timeRange }: FinancialReportsProps) {
  const [activeReport, setActiveReport] = useState<'income' | 'expense' | 'cash_flow' | 'indigenous'>('income')
  const [showDetails, setShowDetails] = useState(false)
  
  const {
    reports,
    loading,
    generateReport,
    exportReport
  } = useFinancialReports(vendorId, timeRange)

  const currentReport = reports[activeReport]

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Get report icon
  const getReportIcon = (type: string) => {
    switch (type) {
      case 'income':
        return ArrowDownRight
      case 'expense':
        return ArrowUpRight
      case 'cash_flow':
        return TrendingUp
      case 'indigenous':
        return Users
      default:
        return FileText
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
        {[
          { id: 'income', label: 'Income Statement', icon: ArrowDownRight },
          { id: 'expense', label: 'Expense Report', icon: ArrowUpRight },
          { id: 'cash_flow', label: 'Cash Flow', icon: TrendingUp },
          { id: 'indigenous', label: 'Indigenous Content', icon: Users }
        ].map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id as unknown)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 
              flex items-center justify-center ${
              activeReport === report.id
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <report.icon className="w-4 h-4 mr-2" />
            {report.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : currentReport ? (
        <>
          {/* Report Header */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {activeReport === 'income' && 'Income Statement'}
                  {activeReport === 'expense' && 'Expense Report'}
                  {activeReport === 'cash_flow' && 'Cash Flow Statement'}
                  {activeReport === 'indigenous' && 'Indigenous Content Report'}
                </h3>
                <p className="text-white/60">
                  {new Date(currentReport.period.start).toLocaleDateString()} - {' '}
                  {new Date(currentReport.period.end).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Printer className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4 text-white/60" />
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => exportReport(activeReport)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white text-sm font-medium 
                    transition-all duration-200 flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </motion.button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeReport === 'income' && (
                <>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Total Revenue</span>
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.summary.totalRevenue)}
                    </p>
                    <p className="text-sm text-emerald-400 mt-1">
                      +{calculateChange(currentReport.summary.totalRevenue, currentReport.previousPeriod?.totalRevenue || 0).toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Net Income</span>
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.summary.netIncome)}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {((currentReport.summary.netIncome / currentReport.summary.totalRevenue) * 100).toFixed(1)}% margin
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Outstanding</span>
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.summary.outstandingInvoices)}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      To be collected
                    </p>
                  </div>
                </>
              )}

              {activeReport === 'expense' && (
                <>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Total Expenses</span>
                      <ArrowUpRight className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.summary.totalExpenses)}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Largest Category</span>
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-lg font-bold text-white">
                      {currentReport.largestExpenseCategory}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {formatCurrency(currentReport.largestExpenseAmount)}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Cost Savings</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(currentReport.costSavings || 0)}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      vs last period
                    </p>
                  </div>
                </>
              )}

              {activeReport === 'indigenous' && (
                <>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Total Value</span>
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.indigenousContent?.totalValue || 0)}
                    </p>
                    <p className="text-sm text-purple-400 mt-1">
                      {currentReport.indigenousContent?.percentage || 0}% of revenue
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Employment</span>
                      <Building className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.indigenousContent?.byCategory.employment || 0)}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Subcontracting</span>
                      <DollarSign className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(currentReport.indigenousContent?.byCategory.subcontracting || 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          {activeReport === 'income' && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Revenue by Client</h4>
              
              {/* Chart placeholder */}
              <div className="h-64 bg-white/5 rounded-lg mb-6 flex items-center justify-center">
                <p className="text-white/40">Revenue distribution chart would go here</p>
              </div>
              
              {/* Client List */}
              <div className="space-y-3">
                {currentReport.revenueByClient?.slice(0, 5).map((client: any, index: number) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-purple-500' : 
                        index === 2 ? 'bg-emerald-500' : 
                        index === 3 ? 'bg-amber-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="font-medium text-white">{client.name}</p>
                        <p className="text-sm text-white/60">{client.invoiceCount} invoices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(client.amount)}</p>
                      <p className="text-sm text-white/60">{client.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'expense' && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Expense Categories</h4>
              
              {/* Chart placeholder */}
              <div className="h-64 bg-white/5 rounded-lg mb-6 flex items-center justify-center">
                <p className="text-white/40">Expense breakdown chart would go here</p>
              </div>
              
              {/* Category List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentReport.expensesByCategory?.map((category: unknown) => (
                  <div key={category.category} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{category.category}</span>
                      <span className="text-sm text-white/60">{category.percentage.toFixed(1)}%</span>
                    </div>
                    <p className="text-lg font-semibold text-white mb-1">
                      {formatCurrency(category.amount)}
                    </p>
                    <p className="text-xs text-white/60">
                      {category.transactionCount} transactions
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'cash_flow' && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Cash Flow Timeline</h4>
              
              {/* Chart placeholder */}
              <div className="h-64 bg-white/5 rounded-lg mb-6 flex items-center justify-center">
                <p className="text-white/40">Cash flow timeline chart would go here</p>
              </div>
              
              {/* Cash Flow Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Opening Balance</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(currentReport.openingBalance || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Net Change</p>
                  <p className={`text-lg font-semibold ${
                    currentReport.netChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {currentReport.netChange >= 0 ? '+' : ''}{formatCurrency(currentReport.netChange || 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Closing Balance</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(currentReport.closingBalance || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'indigenous' && (
            <div className="space-y-6">
              {/* Impact Overview */}
              <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <Info className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-100 mb-2">
                      Indigenous Economic Impact
                    </h4>
                    <p className="text-sm text-purple-100/80">
                      Your business has contributed {formatCurrency(currentReport.indigenousContent?.totalValue || 0)} 
                      to Indigenous communities through employment, subcontracting, and procurement. 
                      This represents {currentReport.indigenousContent?.percentage || 0}% of your total revenue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Breakdown by Category</h4>
                
                <div className="space-y-4">
                  {Object.entries(currentReport.indigenousContent?.byCategory || {}).map(([category, amount]) => {
                    const percentage = ((amount as number) / (currentReport.indigenousContent?.totalValue || 1)) * 100
                    
                    return (
                      <div key={category}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-white capitalize">
                            {category.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(amount as number)}
                          </span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="h-full bg-purple-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Community Partners */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Community Partners</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentReport.communityPartners?.map((partner: unknown) => (
                    <div key={partner.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">{partner.name}</h5>
                        <span className="text-sm text-purple-400">{partner.nation}</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(partner.totalValue)}
                      </p>
                      <p className="text-sm text-white/60">
                        {partner.projectCount} projects
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
          <BarChart3 className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No report data available</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateReport(activeReport)}
            className="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-lg text-blue-100 font-medium 
              transition-all duration-200"
          >
            Generate Report
          </motion.button>
        </div>
      )}
    </div>
  )
}