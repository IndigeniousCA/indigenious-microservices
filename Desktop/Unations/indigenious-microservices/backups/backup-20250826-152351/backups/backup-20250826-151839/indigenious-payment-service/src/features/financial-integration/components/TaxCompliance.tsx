// Tax Compliance Component
// Manage tax calculations, reporting, and compliance

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Download, Calculator, AlertCircle, CheckCircle,
  TrendingUp, Calendar, Shield, Info, ChevronRight, Building,
  DollarSign, BarChart3, Clock, Users, Upload, Send
} from 'lucide-react'
import { useTaxCompliance } from '../hooks/useTaxCompliance'

interface TaxComplianceProps {
  vendorId: string
  timeRange: 'month' | 'quarter' | 'year'
}

export function TaxCompliance({ vendorId, timeRange }: TaxComplianceProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'gst' | 'qst' | 'payroll' | 'filings'>('overview')
  const [showFilingModal, setShowFilingModal] = useState(false)
  
  const {
    taxData,
    loading,
    generateReturn,
    submitFiling,
    exportData
  } = useTaxCompliance(vendorId, timeRange)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Get filing status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filed':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
      case 'pending':
        return 'text-amber-400 bg-amber-500/20 border-amber-400/30'
      case 'overdue':
        return 'text-red-400 bg-red-500/20 border-red-400/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tax Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">GST/HST Collected</span>
            <Calculator className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(taxData.gstCollected || 0)}
          </p>
          <p className="text-sm text-white/60 mt-1">
            {taxData.gstRate || 5}% on {formatCurrency(taxData.taxableSales || 0)}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">ITCs Available</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(taxData.itcAvailable || 0)}
          </p>
          <p className="text-sm text-white/60 mt-1">
            Input Tax Credits
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Net Owing</span>
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(taxData.netOwing || 0)}
          </p>
          <p className="text-sm text-white/60 mt-1">
            Due {taxData.nextFilingDate || 'N/A'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Compliance Score</span>
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {taxData.complianceScore || 0}%
          </p>
          <p className="text-sm text-white/60 mt-1">
            {taxData.filedOnTime || 0} of {taxData.totalFilings || 0} on time
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'gst', label: 'GST/HST', icon: Calculator },
          { id: 'qst', label: 'QST', icon: Building },
          { id: 'payroll', label: 'Payroll', icon: Users },
          { id: 'filings', label: 'Filings', icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as unknown)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 
              flex items-center justify-center ${
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Upcoming Filings */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Upcoming Filings</h3>
                <div className="space-y-3">
                  {taxData.upcomingFilings?.map((filing: unknown) => (
                    <div key={filing.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          filing.daysUntilDue <= 7 ? 'bg-amber-500/20' : 'bg-blue-500/20'
                        }`}>
                          <Calendar className={`w-5 h-5 ${
                            filing.daysUntilDue <= 7 ? 'text-amber-400' : 'text-blue-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{filing.type}</p>
                          <p className="text-sm text-white/60">
                            Due {new Date(filing.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm ${
                          filing.daysUntilDue <= 7 ? 'text-amber-400' : 'text-white/60'
                        }`}>
                          {filing.daysUntilDue} days
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowFilingModal(true)}
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border 
                            border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                            transition-all duration-200"
                        >
                          Prepare
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Summary Chart */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tax Collection Summary</h3>
                
                {/* Chart placeholder */}
                <div className="h-64 bg-white/5 rounded-lg mb-6 flex items-center justify-center">
                  <p className="text-white/40">Tax collection trend chart would go here</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-1">Total Collected</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(taxData.totalCollected || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-1">Total Remitted</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(taxData.totalRemitted || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-1">Outstanding</p>
                    <p className="text-lg font-semibold text-amber-400">
                      {formatCurrency(taxData.outstanding || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gst' && (
            <div className="space-y-6">
              {/* GST Return Summary */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">GST/HST Return</h3>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generateReturn('gst')}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                      border-blue-400/50 rounded-lg text-blue-100 font-medium 
                      transition-all duration-200 flex items-center"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Generate Return
                  </motion.button>
                </div>

                <div className="space-y-4">
                  {/* Sales */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Sales</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Total Sales</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.totalSales || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Zero-Rated Sales</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.zeroRatedSales || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Exempt Sales</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.exemptSales || 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t border-white/10">
                        <span className="text-white">GST/HST Collected</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.collected || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ITCs */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Input Tax Credits</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Purchases</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.itcPurchases || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Capital Property</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.itcCapital || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/60">Other</span>
                        <span className="text-white">{formatCurrency(taxData.gst?.itcOther || 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t border-white/10">
                        <span className="text-white">Total ITCs</span>
                        <span className="text-emerald-400">{formatCurrency(taxData.gst?.totalItc || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Tax */}
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-blue-100/80 mb-1">Net Tax Owing</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(taxData.gst?.netTax || 0)}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                          border-blue-400/50 rounded-lg text-blue-100 font-medium 
                          transition-all duration-200 flex items-center"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        File Return
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indigenous Sales Tracking */}
              <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-100 mb-2">
                      Indigenous Sales Tax Exemption
                    </h4>
                    <p className="text-sm text-purple-100/80 mb-3">
                      Sales to Status Indians and Indian bands on reserve are GST/HST exempt. 
                      Ensure proper documentation is maintained.
                    </p>
                    <div className="bg-purple-900/20 rounded-lg p-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-purple-100/80">Exempt Sales This Period</span>
                        <span className="font-medium text-purple-100">
                          {formatCurrency(taxData.indigenousExemptSales || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-purple-100/80">Number of Transactions</span>
                        <span className="font-medium text-purple-100">
                          {taxData.indigenousTransactionCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Payroll Deductions */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payroll Deductions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-2">Employee Deductions</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">Income Tax</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.incomeTax || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">CPP</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.cppEmployee || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">EI</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.eiEmployee || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-2">Employer Contributions</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">CPP</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.cppEmployer || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">EI</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.eiEmployer || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/80">Health Tax</span>
                        <span className="text-white">{formatCurrency(taxData.payroll?.healthTax || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-amber-100/80 mb-1">Total Remittance Due</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(taxData.payroll?.totalRemittance || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-100/80">Due Date</p>
                      <p className="font-medium text-amber-100">
                        {taxData.payroll?.dueDate || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* T4 Summary */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">T4 Summary</h3>
                  <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white text-sm font-medium 
                    transition-all duration-200 flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export T4s
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-1">Employees</p>
                    <p className="text-2xl font-bold text-white">{taxData.payroll?.employeeCount || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-1">Total Wages</p>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(taxData.payroll?.totalWages || 0)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-1">Status</p>
                    <p className="text-lg font-bold text-emerald-400">Ready</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filings' && (
            <div className="space-y-6">
              {/* Recent Filings */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Filing History</h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Upload className="w-4 h-4 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {taxData.filingHistory?.map((filing: unknown) => (
                    <div key={filing.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg 
                      hover:bg-white/10 transition-all duration-200 cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{filing.type}</p>
                          <p className="text-sm text-white/60">
                            Period: {filing.period} • Filed {new Date(filing.filedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          getStatusColor(filing.status)
                        }`}>
                          {filing.status.toUpperCase()}
                        </span>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Calendar */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Compliance Calendar</h3>
                
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm text-white/60 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar placeholder */}
                <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center">
                  <p className="text-white/40">Compliance calendar would display here</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-100 mb-2">Tax Data Security</h4>
            <p className="text-sm text-blue-100/80">
              All tax information is encrypted and stored securely. We maintain audit trails 
              for all filings and comply with CRA requirements for electronic record keeping.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}