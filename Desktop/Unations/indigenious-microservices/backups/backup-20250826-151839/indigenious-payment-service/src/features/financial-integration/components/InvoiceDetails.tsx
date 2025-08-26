// Invoice Details Component
// Modal for viewing and managing invoice details

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Download, Send, Edit, Trash2, Check, Clock,
  FileText, Calendar, DollarSign, Building, AlertCircle,
  MessageSquare, Receipt, Share2, Printer, Copy
} from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import type { Invoice } from '../types/financial.types'

interface InvoiceDetailsProps {
  invoiceId: string
  userRole: 'vendor' | 'buyer' | 'admin'
  onClose: () => void
  onUpdate: (invoiceId: string, updates: Partial<Invoice>) => Promise<void>
  onSend: (invoiceId: string) => Promise<void>
  onDelete: (invoiceId: string) => Promise<void>
}

export function InvoiceDetails({ 
  invoiceId, 
  userRole, 
  onClose, 
  onUpdate, 
  onSend, 
  onDelete 
}: InvoiceDetailsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'payments'>('details')
  
  const { getInvoice } = useInvoices()
  const invoice = getInvoice(invoiceId)

  if (!invoice) return null

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { color: 'gray', icon: Edit, label: 'Draft' },
      sent: { color: 'blue', icon: Send, label: 'Sent' },
      viewed: { color: 'indigo', icon: Check, label: 'Viewed' },
      approved: { color: 'purple', icon: Check, label: 'Approved' },
      paid: { color: 'emerald', icon: Check, label: 'Paid' },
      partial: { color: 'amber', icon: Clock, label: 'Partial' },
      overdue: { color: 'red', icon: AlertCircle, label: 'Overdue' },
      cancelled: { color: 'gray', icon: X, label: 'Cancelled' },
      disputed: { color: 'orange', icon: AlertCircle, label: 'Disputed' }
    }

    const config = statusConfig[invoice.status]
    const Icon = config.icon

    return (
      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg bg-${config.color}-500/20 
        text-${config.color}-300 border border-${config.color}-400/30`}>
        <Icon className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    )
  }

  const handleSend = async () => {
    try {
      setLoading(true)
      await onSend(invoiceId)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      await onDelete(invoiceId)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true)
      await onUpdate(invoiceId, {
        status: 'paid',
        paidAmount: invoice.totalAmount,
        balanceDue: 0,
        paidDate: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">
                  Invoice #{invoice.invoiceNumber}
                </h2>
                {getStatusBadge()}
              </div>
              <div className="flex items-center space-x-4 text-sm text-white/60">
                <span>{invoice.clientName}</span>
                <span>•</span>
                <span>Issued {new Date(invoice.issueDate).toLocaleDateString()}</span>
                <span>•</span>
                <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {invoice.status === 'draft' && userRole === 'vendor' && (
              <>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                    transition-all duration-200 flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </button>
                <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
                  border-white/20 rounded-lg text-white text-sm font-medium 
                  transition-all duration-200 flex items-center">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
              </>
            )}
            
            {['sent', 'viewed', 'approved'].includes(invoice.status) && userRole === 'buyer' && (
              <button
                onClick={handleMarkAsPaid}
                disabled={loading}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                  border-emerald-400/50 rounded-lg text-emerald-100 text-sm font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as Paid
              </button>
            )}

            <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
              border-white/20 rounded-lg text-white text-sm font-medium 
              transition-all duration-200 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </button>

            <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
              border-white/20 rounded-lg text-white text-sm font-medium 
              transition-all duration-200 flex items-center">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>

            <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border 
              border-white/20 rounded-lg text-white text-sm font-medium 
              transition-all duration-200 flex items-center">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>

            {userRole === 'vendor' && invoice.status === 'draft' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border 
                  border-red-400/50 rounded-lg text-red-100 text-sm font-medium 
                  transition-all duration-200 flex items-center ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 p-1 bg-white/5 mx-6 mt-6 rounded-xl">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'details'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'payments'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Payments
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Invoice Preview */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">INVOICE</h3>
                    <p className="text-white/60">#{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{invoice.vendorName}</p>
                    <p className="text-sm text-white/60">GST: 123456789RT0001</p>
                  </div>
                </div>

                {/* Bill To / From */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2">BILL TO</p>
                    <p className="font-semibold text-white">{invoice.clientName}</p>
                    {invoice.projectName && (
                      <p className="text-sm text-white/80 mt-1">Project: {invoice.projectName}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2">INVOICE DATE</p>
                    <p className="text-white">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                    <p className="text-sm font-medium text-white/60 mb-2 mt-4">DUE DATE</p>
                    <p className="text-white">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 text-sm font-medium text-white/60">Description</th>
                        <th className="text-right py-3 text-sm font-medium text-white/60">Qty</th>
                        <th className="text-right py-3 text-sm font-medium text-white/60">Rate</th>
                        <th className="text-right py-3 text-sm font-medium text-white/60">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.map((item, index) => (
                        <tr key={item.id} className="border-b border-white/10">
                          <td className="py-3 text-white">
                            {item.description}
                            {item.isIndigenous && (
                              <span className="ml-2 text-xs text-purple-400">(Indigenous)</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-white">{item.quantity}</td>
                          <td className="py-3 text-right text-white">${item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 text-right text-white">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-white/60">Subtotal</span>
                      <span className="text-white">${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-white/60">Tax (GST 5%)</span>
                      <span className="text-white">${invoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t border-white/20 font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-white">${invoice.totalAmount.toFixed(2)} CAD</span>
                    </div>
                    {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount && (
                      <>
                        <div className="flex justify-between py-2">
                          <span className="text-white/60">Paid</span>
                          <span className="text-emerald-400">-${invoice.paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-3 border-t border-white/20 font-semibold">
                          <span className="text-white">Balance Due</span>
                          <span className="text-amber-400">${invoice.balanceDue.toFixed(2)} CAD</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Indigenous Content */}
                {invoice.indigenousContentPercentage && invoice.indigenousContentPercentage > 0 && (
                  <div className="mt-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-100">Indigenous Content</span>
                      <span className="text-sm font-semibold text-purple-100">
                        ${invoice.indigenousContentValue?.toFixed(2)} ({invoice.indigenousContentPercentage}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-6 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm font-medium text-white/60 mb-2">NOTES</p>
                    <p className="text-sm text-white/80">{invoice.notes}</p>
                  </div>
                )}

                {/* Payment Instructions */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <p className="text-sm font-medium text-blue-100 mb-2">PAYMENT INSTRUCTIONS</p>
                  <p className="text-sm text-blue-100/80">
                    Payment can be made by EFT to account ending in 1234. 
                    Please reference invoice #{invoice.invoiceNumber} in your payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Activity History</h3>
              {/* Activity timeline */}
              <div className="space-y-3">
                {[
                  { date: invoice.issueDate, action: 'Invoice created', icon: FileText },
                  invoice.status !== 'draft' && { date: invoice.issueDate, action: 'Invoice sent', icon: Send },
                  invoice.status === 'viewed' && { date: invoice.issueDate, action: 'Invoice viewed by client', icon: Check },
                  invoice.paidDate && { date: invoice.paidDate, action: 'Payment received', icon: DollarSign }
                ].filter(Boolean).map((event: any, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <event.icon className="w-4 h-4 text-white/60" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{event.action}</p>
                      <p className="text-sm text-white/60">
                        {new Date(event.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
              {invoice.paidAmount === 0 ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 text-center">
                  <Receipt className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">No payments received yet</p>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Payment Received</p>
                      <p className="text-sm text-white/60">
                        {invoice.paidDate && new Date(invoice.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-emerald-400">
                      ${invoice.paidAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Delete Invoice</h3>
              </div>
              
              <p className="text-white/80 mb-6">
                Are you sure you want to delete this invoice? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white font-medium 
                    transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                    border border-red-400/50 rounded-lg text-red-100 font-medium 
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}