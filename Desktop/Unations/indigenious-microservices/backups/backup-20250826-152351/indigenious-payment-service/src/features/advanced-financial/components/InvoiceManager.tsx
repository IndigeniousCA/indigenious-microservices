// Invoice Manager Component
// Create, manage, and track invoices

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Search, Filter, Download, Send,
  Clock, CheckCircle, AlertCircle, DollarSign,
  Calendar, Eye, Edit, Trash2, Copy, Mail,
  CreditCard, Building, Users, Feather
} from 'lucide-react'
import { Invoice, InvoiceStatus, PaymentTerms } from '../types/financial.types'
import { useInvoices } from '../hooks/useInvoices'
import { formatCurrency } from '../utils/formatters'

interface InvoiceManagerProps {
  onCreateNew?: () => void
  onSelectInvoice?: (invoice: Invoice) => void
}

export function InvoiceManager({
  onCreateNew,
  onSelectInvoice
}: InvoiceManagerProps) {
  const { invoices, isLoading, sendInvoice, deleteInvoice } = useInvoices()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (!invoice.invoiceNumber.toLowerCase().includes(search) &&
            !invoice.clientName.toLowerCase().includes(search)) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [invoices, searchTerm, statusFilter])

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      total: filteredInvoices.length,
      totalValue: filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
      outstanding: filteredInvoices
        .filter(inv => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.balance, 0),
      overdue: filteredInvoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.balance, 0)
    }
  }, [filteredInvoices])

  // Get status color
  const getStatusColor = (status: InvoiceStatus) => {
    const colors: Record<InvoiceStatus, string> = {
      draft: 'gray',
      sent: 'blue',
      viewed: 'indigo',
      partial: 'amber',
      paid: 'emerald',
      overdue: 'red',
      cancelled: 'gray',
      disputed: 'orange'
    }
    return colors[status]
  }

  // Get status icon
  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return FileText
      case 'sent': return Send
      case 'viewed': return Eye
      case 'partial': return Clock
      case 'paid': return CheckCircle
      case 'overdue': return AlertCircle
      case 'cancelled': return Trash2
      case 'disputed': return AlertCircle
    }
  }

  // Handle bulk actions
  const handleBulkSend = async () => {
    const selected = Array.from(selectedInvoices)
    for (const id of selected) {
      const invoice = invoices.find(inv => inv.id === id)
      if (invoice && invoice.status === 'draft') {
        await sendInvoice(id)
      }
    }
    setSelectedInvoices(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Invoices</h2>
          <p className="text-white/70">
            Manage customer invoices and payment tracking
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
            border-blue-400/50 rounded-lg text-blue-200 font-medium 
            transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-white/60 text-sm">
            {formatCurrency(stats.totalValue, 'CAD')}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-white/60 text-sm">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(stats.outstanding, 'CAD')}
          </p>
          <p className="text-white/60 text-sm">
            {filteredInvoices.filter(inv => ['sent', 'viewed', 'partial'].includes(inv.status)).length} invoices
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-white/60 text-sm">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(stats.overdue, 'CAD')}
          </p>
          <p className="text-white/60 text-sm">
            {filteredInvoices.filter(inv => inv.status === 'overdue').length} invoices
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-white/60 text-sm">Paid</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {filteredInvoices.filter(inv => inv.status === 'paid').length}
          </p>
          <p className="text-white/60 text-sm">This month</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Status</option>
            <option value="draft" className="bg-gray-800">Draft</option>
            <option value="sent" className="bg-gray-800">Sent</option>
            <option value="viewed" className="bg-gray-800">Viewed</option>
            <option value="partial" className="bg-gray-800">Partial</option>
            <option value="paid" className="bg-gray-800">Paid</option>
            <option value="overdue" className="bg-gray-800">Overdue</option>
          </select>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center 
              space-x-2 ${showFilters 
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' 
                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <div className="mt-4 flex items-center space-x-3">
            <span className="text-white/60 text-sm">
              {selectedInvoices.size} selected
            </span>
            <button
              onClick={handleBulkSend}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 
                border border-blue-400/50 rounded text-blue-200 text-sm"
            >
              Send Selected
            </button>
            <button
              onClick={() => setSelectedInvoices(new Set())}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 
                border border-white/20 rounded text-white/80 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Invoice List */}
      <div className="space-y-4">
        {filteredInvoices.map(invoice => {
          const StatusIcon = getStatusIcon(invoice.status)
          const statusColor = getStatusColor(invoice.status)
          const isSelected = selectedInvoices.has(invoice.id)

          return (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/10 backdrop-blur-md border rounded-xl p-6 
                hover:bg-white/15 transition-all cursor-pointer ${
                  isSelected ? 'border-blue-400/50' : 'border-white/20'
                }`}
              onClick={() => onSelectInvoice?.(invoice)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      const newSelection = new Set(selectedInvoices)
                      if (isSelected) {
                        newSelection.delete(invoice.id)
                      } else {
                        newSelection.add(invoice.id)
                      }
                      setSelectedInvoices(newSelection)
                    }}
                    className="mt-1 w-4 h-4 bg-white/10 border-white/20 rounded 
                      text-blue-500 focus:ring-blue-400"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {invoice.invoiceNumber}
                        </h3>
                        <p className="text-white/70">{invoice.clientName}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {invoice.indigenousBusiness && (
                          <span className="p-1 bg-purple-500/20 rounded">
                            <Feather className="w-4 h-4 text-purple-400" />
                          </span>
                        )}
                        {invoice.governmentContract && (
                          <span className="p-1 bg-blue-500/20 rounded">
                            <Building className="w-4 h-4 text-blue-400" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-white/60 text-sm">Amount</p>
                        <p className="text-white font-medium">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-white/60 text-sm">Balance</p>
                        <p className={`font-medium ${
                          invoice.balance > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {formatCurrency(invoice.balance, invoice.currency)}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/60 text-sm">Due Date</p>
                        <p className="text-white">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/60 text-sm">Status</p>
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 
                          bg-${statusColor}-500/20 border border-${statusColor}-400/30 
                          rounded text-${statusColor}-300 text-sm`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{invoice.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Preview */}
                    <div className="text-white/60 text-sm">
                      {invoice.lineItems.length} items • 
                      Terms: {invoice.terms.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {invoice.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        sendInvoice(invoice.id)
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Send Invoice"
                    >
                      <Send className="w-4 h-4 text-blue-400" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Download invoice
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4 text-white/60" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Duplicate invoice
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No invoices found</h3>
          <p className="text-white/60">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first invoice to get started'}
          </p>
        </div>
      )}
    </div>
  )
}