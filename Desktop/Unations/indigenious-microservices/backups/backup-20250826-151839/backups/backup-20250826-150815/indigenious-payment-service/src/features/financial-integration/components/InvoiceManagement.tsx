// Invoice Management Component
// Create, manage, and track invoices

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Plus, Filter, Search, Download, Send, 
  CheckCircle, Clock, AlertCircle, XCircle, Calendar,
  DollarSign, Building, ChevronRight, Eye, Edit,
  Copy, Trash2, MoreVertical, Upload
} from 'lucide-react'
import { InvoiceCreator } from './InvoiceCreator'
import { InvoiceDetails } from './InvoiceDetails'
import { useInvoices } from '../hooks/useInvoices'
import type { Invoice, InvoiceStatus } from '../types/financial.types'

interface InvoiceManagementProps {
  vendorId: string
  userRole: 'vendor' | 'buyer' | 'admin'
}

export function InvoiceManagement({ vendorId, userRole }: InvoiceManagementProps) {
  const [showCreator, setShowCreator] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    status: 'all' as InvoiceStatus | 'all',
    search: '',
    dateRange: 'all' as 'all' | 'week' | 'month' | 'quarter'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const {
    invoices,
    loading,
    createInvoice,
    updateInvoice,
    sendInvoice,
    deleteInvoice
  } = useInvoices(vendorId, filter)

  // Calculate stats
  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    unpaidAmount: invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + i.balanceDue, 0)
  }

  // Get status icon
  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'partial':
        return <Clock className="w-5 h-5 text-blue-400" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Clock className="w-5 h-5 text-amber-400" />
    }
  }

  // Get status color
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
      case 'partial':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30'
      case 'overdue':
        return 'text-red-400 bg-red-500/20 border-red-400/30'
      case 'cancelled':
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
      case 'draft':
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
      default:
        return 'text-amber-400 bg-amber-500/20 border-amber-400/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Invoices</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Unpaid</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.unpaid}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.overdue}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Amount</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white">
            ${stats.totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Outstanding</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">
            ${stats.unpaidAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions and Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:border-blue-400/50 
                  focus:outline-none transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as unknown }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Status</option>
              <option value="draft" className="bg-gray-800">Draft</option>
              <option value="sent" className="bg-gray-800">Sent</option>
              <option value="viewed" className="bg-gray-800">Viewed</option>
              <option value="paid" className="bg-gray-800">Paid</option>
              <option value="partial" className="bg-gray-800">Partial</option>
              <option value="overdue" className="bg-gray-800">Overdue</option>
              <option value="cancelled" className="bg-gray-800">Cancelled</option>
            </select>

            {/* Date Filter */}
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value as unknown }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Time</option>
              <option value="week" className="bg-gray-800">This Week</option>
              <option value="month" className="bg-gray-800">This Month</option>
              <option value="quarter" className="bg-gray-800">This Quarter</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode */}
            <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${
                  viewMode === 'list' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>

            {/* Create Invoice */}
            {userRole === 'vendor' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreator(true)}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                  border-emerald-400/50 rounded-lg text-emerald-100 font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No invoices found</p>
          {userRole === 'vendor' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreator(true)}
              className="mt-4 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                border-emerald-400/50 rounded-lg text-emerald-100 font-medium 
                transition-all duration-200"
            >
              Create First Invoice
            </motion.button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-4'
        }>
          {invoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedInvoice(invoice.id)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                p-6 cursor-pointer hover:bg-white/15 transition-all duration-200"
            >
              {viewMode === 'list' ? (
                // List View
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-white">
                          Invoice #{invoice.invoiceNumber}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                          border ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-white/60">
                        <span>{invoice.clientName}</span>
                        <span>•</span>
                        <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                        {invoice.projectName && (
                          <>
                            <span>•</span>
                            <span>{invoice.projectName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        ${invoice.totalAmount.toLocaleString()}
                      </p>
                      {invoice.balanceDue > 0 && (
                        <p className="text-sm text-white/60">
                          ${invoice.balanceDue.toLocaleString()} due
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-2">
                      {invoice.status === 'draft' && userRole === 'vendor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            sendInvoice(invoice.id)
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Send Invoice"
                        >
                          <Send className="w-4 h-4 text-white/60" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Download invoice
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-white/60" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </div>
                </div>
              ) : (
                // Grid View
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white">
                        #{invoice.invoiceNumber}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">
                        {invoice.clientName}
                      </p>
                    </div>
                    {getStatusIcon(invoice.status)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Amount</span>
                      <span className="font-medium text-white">
                        ${invoice.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    {invoice.balanceDue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Balance</span>
                        <span className="font-medium text-amber-400">
                          ${invoice.balanceDue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Due</span>
                      <span className="text-white">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                      border ${getStatusColor(invoice.status)}`}>
                      {invoice.status.toUpperCase()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {invoice.status === 'draft' && userRole === 'vendor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            sendInvoice(invoice.id)
                          }}
                          className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Download
                        }}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-white/60" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Invoice Creator Modal */}
      <AnimatePresence>
        {showCreator && (
          <InvoiceCreator
            vendorId={vendorId}
            onClose={() => setShowCreator(false)}
            onSave={createInvoice}
          />
        )}
      </AnimatePresence>

      {/* Invoice Details Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetails
            invoiceId={selectedInvoice}
            userRole={userRole}
            onClose={() => setSelectedInvoice(null)}
            onUpdate={updateInvoice}
            onSend={sendInvoice}
            onDelete={deleteInvoice}
          />
        )}
      </AnimatePresence>
    </div>
  )
}