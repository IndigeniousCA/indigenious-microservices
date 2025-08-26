// Financial Reports Component
// Generate comprehensive financial reports and analytics

import { useState, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Mail, Calendar, Filter,
  TrendingUp, TrendingDown, PieChart, BarChart3,
  Users, Feather, DollarSign, Target, AlertCircle,
  CheckCircle, Clock, Eye, Printer, Share2,
  ChevronRight, Info, Lock
} from 'lucide-react'
import { FinancialMetrics, CurrencyCode } from '../types/financial.types'
import { useFinancialMetrics } from '../hooks/useFinancialMetrics'
import { formatCurrency, formatPercentage, formatFinancialDate } from '../utils/formatters'

interface FinancialReportsProps {
  onExport?: (format: string) => void
  onShare?: (report: unknown) => void
}

type ReportType = 'income' | 'expense' | 'cashflow' | 'indigenous' | 'tax' | 'budget' | 'forecast'
type ReportPeriod = 'monthly' | 'quarterly' | 'annual' | 'custom'

export function FinancialReports({ onExport, onShare }: FinancialReportsProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('income')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  })
  const [showPreview, setShowPreview] = useState(false)

  const { metrics, isLoading } = useFinancialMetrics('month')

  // Report configurations
  const reportTypes: Record<ReportType, {
    label: string
    icon: any
    color: string
    description: string
    compliance?: string[]
  }> = {
    income: {
      label: 'Income Statement',
      icon: TrendingUp,
      color: 'emerald',
      description: 'Revenue, expenses, and profitability',
      compliance: ['GAAP', 'IFRS']
    },
    expense: {
      label: 'Expense Report',
      icon: TrendingDown,
      color: 'red',
      description: 'Detailed expense breakdown by category',
      compliance: ['CRA']
    },
    cashflow: {
      label: 'Cash Flow Statement',
      icon: DollarSign,
      color: 'blue',
      description: 'Operating, investing, and financing activities',
      compliance: ['GAAP', 'IFRS']
    },
    indigenous: {
      label: 'Indigenous Impact Report',
      icon: Feather,
      color: 'purple',
      description: 'Community investment and procurement metrics',
      compliance: ['ISC', 'TBS']
    },
    tax: {
      label: 'Tax Summary',
      icon: FileText,
      color: 'amber',
      description: 'GST/PST collection and remittance',
      compliance: ['CRA']
    },
    budget: {
      label: 'Budget vs Actual',
      icon: Target,
      color: 'indigo',
      description: 'Budget performance and variance analysis'
    },
    forecast: {
      label: 'Financial Forecast',
      icon: BarChart3,
      color: 'pink',
      description: 'Revenue and expense projections'
    }
  }

  // Generate report data based on type
  const generateReportData = useMemo(() => {
    if (!metrics) return null

    switch (selectedReport) {
      case 'income':
        return {
          title: 'Income Statement',
          period: `${formatFinancialDate(dateRange.start, 'long')} - ${formatFinancialDate(dateRange.end, 'long')}`,
          sections: [
            {
              title: 'Revenue',
              items: Object.entries(metrics.revenue.byCategory).map(([category, amount]) => ({
                label: category.replace(/_/g, ' '),
                amount,
                percentage: (amount / metrics.revenue.total) * 100
              })),
              total: metrics.revenue.total
            },
            {
              title: 'Operating Expenses',
              items: Object.entries(metrics.expenses.byCategory)
                .filter(([cat]) => !['taxes', 'revenue'].includes(cat))
                .map(([category, amount]) => ({
                  label: category.replace(/_/g, ' '),
                  amount,
                  percentage: (amount / metrics.expenses.total) * 100
                })),
              total: metrics.expenses.total
            },
            {
              title: 'Summary',
              items: [
                { label: 'Gross Profit', amount: metrics.revenue.total - metrics.expenses.total },
                { label: 'Operating Margin', amount: metrics.profitability.grossMargin, isPercentage: true },
                { label: 'EBITDA', amount: metrics.profitability.ebitda },
                { label: 'Net Margin', amount: metrics.profitability.netMargin, isPercentage: true }
              ]
            }
          ]
        }

      case 'indigenous':
        return {
          title: 'Indigenous Economic Impact Report',
          period: `${formatFinancialDate(dateRange.start, 'long')} - ${formatFinancialDate(dateRange.end, 'long')}`,
          sections: [
            {
              title: 'Procurement Metrics',
              items: [
                { 
                  label: 'Total Indigenous Procurement', 
                  amount: metrics.indigenousImpact.communitySpend,
                  highlight: true
                },
                { 
                  label: 'Percentage of Total Spend', 
                  amount: metrics.indigenousImpact.percentOfTotal,
                  isPercentage: true,
                  status: metrics.indigenousImpact.percentOfTotal >= 5 ? 'success' : 'warning'
                },
                { 
                  label: 'Federal Target (5%)', 
                  amount: 5,
                  isPercentage: true,
                  isBenchmark: true
                }
              ]
            },
            {
              title: 'Community Investment',
              items: [
                { label: 'Direct Community Investment', amount: metrics.indigenousImpact.communitySpend * 0.4 },
                { label: 'Elder & Knowledge Keeper Compensation', amount: metrics.expenses.byCategory.elder_compensation || 0 },
                { label: 'Cultural Activities & Ceremonies', amount: metrics.expenses.byCategory.cultural_activities || 0 },
                { label: 'Youth Training Programs', amount: metrics.indigenousImpact.communitySpend * 0.2 }
              ],
              total: metrics.indigenousImpact.communitySpend
            },
            {
              title: 'Employment Impact',
              items: [
                { label: 'Indigenous Jobs Created', amount: metrics.indigenousImpact.jobsCreated, isCount: true },
                { label: 'Youth Trained', amount: metrics.indigenousImpact.youthTrained, isCount: true },
                { label: 'Indigenous Businesses Engaged', amount: 18, isCount: true },
                { label: 'Communities Impacted', amount: 7, isCount: true }
              ]
            }
          ],
          compliance: {
            federal: metrics.indigenousImpact.percentOfTotal >= 5,
            reporting: true,
            verification: 'Pending'
          }
        }

      case 'cashflow':
        return {
          title: 'Cash Flow Statement',
          period: `${formatFinancialDate(dateRange.start, 'long')} - ${formatFinancialDate(dateRange.end, 'long')}`,
          sections: [
            {
              title: 'Operating Activities',
              items: [
                { label: 'Net Income', amount: metrics.revenue.total - metrics.expenses.total },
                { label: 'Depreciation & Amortization', amount: 12000 },
                { label: 'Changes in Working Capital', amount: -8000 },
                { label: 'Accounts Receivable', amount: -15000 },
                { label: 'Accounts Payable', amount: 7000 }
              ],
              total: metrics.cashFlow.operating
            },
            {
              title: 'Investing Activities',
              items: [
                { label: 'Equipment Purchases', amount: -50000 },
                { label: 'Software Licenses', amount: -25000 }
              ],
              total: metrics.cashFlow.investing
            },
            {
              title: 'Financing Activities',
              items: [
                { label: 'Loan Repayments', amount: -30000 },
                { label: 'Dividend Payments', amount: -20000 }
              ],
              total: metrics.cashFlow.financing
            },
            {
              title: 'Summary',
              items: [
                { label: 'Net Cash Flow', amount: metrics.cashFlow.net, highlight: true },
                { label: 'Beginning Cash', amount: 450000 },
                { label: 'Ending Cash', amount: 450000 + metrics.cashFlow.net }
              ]
            }
          ]
        }

      default:
        return null
    }
  }, [selectedReport, metrics, dateRange])

  // Export report
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    onExport?.(format)
    // In production, generate actual file
    logger.info(`Exporting ${selectedReport} report as ${format}`)
  }

  // Share report
  const handleShare = () => {
    onShare?.(generateReportData)
    // In production, share via email or link
    logger.info('Sharing report')
  }

  if (!metrics || !generateReportData) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Financial Reports</h2>
          <p className="text-white/70">
            Generate compliance-ready financial reports and analytics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 
              border border-white/20 rounded-lg text-white/80 
              transition-colors flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>

          <div className="relative group">
            <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
              border border-blue-400/50 rounded-lg text-blue-200 
              font-medium transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md 
              border border-white/20 rounded-lg shadow-xl opacity-0 invisible 
              group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-left text-white/80 hover:bg-white/10 
                  transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-white/80 hover:bg-white/10 
                  transition-colors flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Export as Excel</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-white/80 hover:bg-white/10 
                  transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(reportTypes).map(([type, config]) => {
          const Icon = config.icon
          const isSelected = selectedReport === type

          return (
            <button
              key={type}
              onClick={() => setSelectedReport(type as ReportType)}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? `bg-${config.color}-500/20 border-${config.color}-400/50`
                  : 'bg-white/10 border-white/20 hover:bg-white/15'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                isSelected ? `text-${config.color}-400` : 'text-white/60'
              }`} />
              <p className={`text-sm font-medium ${
                isSelected ? 'text-white' : 'text-white/80'
              }`}>
                {config.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Report Configuration */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-6">
          {/* Period Selection */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Report Period</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="monthly" className="bg-gray-800">Monthly</option>
              <option value="quarterly" className="bg-gray-800">Quarterly</option>
              <option value="annual" className="bg-gray-800">Annual</option>
              <option value="custom" className="bg-gray-800">Custom Range</option>
            </select>
          </div>

          {/* Date Range (for custom) */}
          {reportPeriod === 'custom' && (
            <>
              <div>
                <label className="text-white/80 text-sm mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start.split('T')[0]}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    start: new Date(e.target.value).toISOString()
                  })}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">End Date</label>
                <input
                  type="date"
                  value={dateRange.end.split('T')[0]}
                  onChange={(e) => setDateRange({
                    ...dateRange,
                    end: new Date(e.target.value).toISOString()
                  })}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </>
          )}

          {/* Compliance Tags */}
          {reportTypes[selectedReport].compliance && (
            <div className="flex-1">
              <label className="text-white/80 text-sm mb-2 block">Compliance Standards</label>
              <div className="flex items-center space-x-2">
                {reportTypes[selectedReport].compliance!.map(standard => (
                  <span
                    key={standard}
                    className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 
                      rounded-full text-emerald-300 text-sm flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>{standard}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">{generateReportData.title}</h3>
            <p className="text-white/60 text-sm">{generateReportData.period}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Printer className="w-5 h-5 text-white/60" />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Report Sections */}
        <div className="space-y-8">
          {generateReportData.sections.map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-medium text-white mb-4">{section.title}</h4>
              
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      'highlight' in item && item.highlight ? 'bg-blue-500/10 border border-blue-400/30' :
                      'isBenchmark' in item && item.isBenchmark ? 'bg-purple-500/10 border border-purple-400/30' :
                      'bg-white/5'
                    }`}
                  >
                    <span className={`${
                      'highlight' in item && item.highlight ? 'text-blue-200 font-medium' :
                      'isBenchmark' in item && item.isBenchmark ? 'text-purple-200' :
                      'text-white/80'
                    }`}>
                      {item.label}
                    </span>
                    
                    <div className="flex items-center space-x-3">
                      {'percentage' in item && item.percentage !== undefined && (
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${Math.min('percentage' in item ? item.percentage : 0, 100)}%` }}
                          />
                        </div>
                      )}
                      
                      <span className={`font-medium ${
                        'highlight' in item && item.highlight ? 'text-blue-200 text-lg' :
                        'status' in item && item.status === 'success' ? 'text-emerald-400' :
                        'status' in item && item.status === 'warning' ? 'text-amber-400' :
                        'text-white'
                      }`}>
                        {'isPercentage' in item && item.isPercentage ? `${item.amount}%` :
                         'isCount' in item && item.isCount ? item.amount :
                         formatCurrency(item.amount, 'CAD')}
                      </span>
                    </div>
                  </div>
                ))}
                
                {section.total !== undefined && (
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Total</span>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(section.total, 'CAD')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Compliance Status (for Indigenous Report) */}
        {selectedReport === 'indigenous' && generateReportData.compliance && (
          <div className="mt-8 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <h4 className="text-lg font-medium text-white">Compliance Status</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">Federal Target</p>
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${
                  generateReportData.compliance.federal 
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {generateReportData.compliance.federal ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{generateReportData.compliance.federal ? 'Met' : 'Not Met'}</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">Reporting</p>
                <div className="inline-flex items-center space-x-2 px-3 py-1 
                  bg-emerald-500/20 text-emerald-300 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span>Compliant</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">Verification</p>
                <div className="inline-flex items-center space-x-2 px-3 py-1 
                  bg-amber-500/20 text-amber-300 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{generateReportData.compliance.verification}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-white/60 text-sm">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Generated on {formatFinancialDate(new Date(), 'long')}</span>
            </div>
            <span>Report ID: {`${selectedReport.toUpperCase()}-${Date.now()}`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}