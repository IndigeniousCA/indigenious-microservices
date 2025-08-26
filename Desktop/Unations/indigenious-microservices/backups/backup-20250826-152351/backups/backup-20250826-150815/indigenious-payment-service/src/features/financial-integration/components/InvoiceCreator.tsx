// Invoice Creator Component
// Modal for creating new invoices

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { 
  X, Plus, Trash2, Calendar, DollarSign, FileText,
  Building, Users, Calculator, Upload, Save, Send
} from 'lucide-react'
import type { Invoice, InvoiceLineItem, PaymentTerms } from '../types/financial.types'

interface InvoiceCreatorProps {
  vendorId: string
  projectId?: string
  onClose: () => void
  onSave: (invoice: Partial<Invoice>, send?: boolean) => Promise<void>
}

export function InvoiceCreator({ vendorId, projectId, onClose, onSave }: InvoiceCreatorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    projectId: projectId || '',
    projectName: '',
    paymentTerms: 'net_30' as PaymentTerms,
    dueDate: '',
    notes: '',
    lineItems: [
      {
        id: '1',
        description: '',
        category: 'labor' as const,
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        taxRate: 0.05, // 5% GST
        taxAmount: 0,
        total: 0,
        isIndigenous: false
      }
    ] as InvoiceLineItem[]
  })

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = formData.lineItems.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalAmount = subtotal + taxAmount
    
    // Calculate Indigenous content
    const indigenousValue = formData.lineItems
      .filter(item => item.isIndigenous)
      .reduce((sum, item) => sum + item.amount, 0)
    const indigenousPercentage = subtotal > 0 ? (indigenousValue / subtotal) * 100 : 0

    return {
      subtotal,
      taxAmount,
      totalAmount,
      indigenousContentValue: indigenousValue,
      indigenousContentPercentage: Math.round(indigenousPercentage)
    }
  }

  // Update line item
  const updateLineItem = (index: number, updates: Partial<InvoiceLineItem>) => {
    const updatedItems = [...formData.lineItems]
    const item = { ...updatedItems[index], ...updates }
    
    // Recalculate amounts
    if ('quantity' in updates || 'unitPrice' in updates) {
      item.amount = item.quantity * item.unitPrice
      item.taxAmount = item.amount * item.taxRate
      item.total = item.amount + item.taxAmount
    }
    
    updatedItems[index] = item
    setFormData(prev => ({ ...prev, lineItems: updatedItems }))
  }

  // Add line item
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: '',
      category: 'other',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 0.05,
      taxAmount: 0,
      total: 0,
      isIndigenous: false
    }
    setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }))
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }))
    }
  }

  // Calculate due date based on payment terms
  const calculateDueDate = (terms: PaymentTerms) => {
    const today = new Date()
    let dueDate = new Date()

    switch (terms) {
      case 'due_on_receipt':
        dueDate = today
        break
      case 'net_15':
        dueDate.setDate(today.getDate() + 15)
        break
      case 'net_30':
        dueDate.setDate(today.getDate() + 30)
        break
      case 'net_45':
        dueDate.setDate(today.getDate() + 45)
        break
      case 'net_60':
        dueDate.setDate(today.getDate() + 60)
        break
      case 'net_90':
        dueDate.setDate(today.getDate() + 90)
        break
    }

    return dueDate.toISOString().split('T')[0]
  }

  // Handle submit
  const handleSubmit = async (send: boolean = false) => {
    try {
      setLoading(true)
      const totals = calculateTotals()
      
      const invoice: Partial<Invoice> = {
        vendorId,
        vendorName: 'Your Company', // Would come from vendor profile
        clientId: formData.clientId,
        clientName: formData.clientName,
        projectId: formData.projectId || undefined,
        projectName: formData.projectName || undefined,
        status: send ? 'sent' : 'draft',
        issueDate: new Date().toISOString(),
        dueDate: formData.dueDate || calculateDueDate(formData.paymentTerms),
        paymentTerms: formData.paymentTerms,
        lineItems: formData.lineItems,
        ...totals,
        balanceDue: totals.totalAmount,
        paidAmount: 0,
        currency: 'CAD',
        notes: formData.notes,
        attachments: []
      }

      await onSave(invoice, send)
      onClose()
    } catch (error) {
      logger.error('Failed to create invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

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
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Create Invoice</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white placeholder-white/40 focus:border-blue-400/50 
                      focus:outline-none transition-colors"
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white placeholder-white/40 focus:border-blue-400/50 
                      focus:outline-none transition-colors"
                    placeholder="Enter project name"
                  />
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => {
                      const terms = e.target.value as PaymentTerms
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentTerms: terms,
                        dueDate: calculateDueDate(terms)
                      }))
                    }}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white focus:border-blue-400/50 focus:outline-none appearance-none"
                  >
                    <option value="due_on_receipt">Due on Receipt</option>
                    <option value="net_15">Net 15</option>
                    <option value="net_30">Net 30</option>
                    <option value="net_45">Net 45</option>
                    <option value="net_60">Net 60</option>
                    <option value="net_90">Net 90</option>
                    <option value="2_10_net_30">2/10 Net 30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate || calculateDueDate(formData.paymentTerms)}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                      text-white placeholder-white/40 focus:border-blue-400/50 
                      focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Line Items</h3>
                <button
                  onClick={addLineItem}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border 
                    border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                    transition-all duration-200 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.lineItems.map((item, index) => (
                  <div key={item.id} className="bg-white/5 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <label className="block text-xs text-white/60 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded 
                            text-white text-sm placeholder-white/40 focus:border-blue-400/50 
                            focus:outline-none transition-colors"
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => updateLineItem(index, { category: e.target.value as unknown })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded 
                            text-white text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
                        >
                          <option value="labor">Labor</option>
                          <option value="materials">Materials</option>
                          <option value="equipment">Equipment</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs text-white/60 mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded 
                            text-white text-sm placeholder-white/40 focus:border-blue-400/50 
                            focus:outline-none transition-colors"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Unit Price</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded 
                            text-white text-sm placeholder-white/40 focus:border-blue-400/50 
                            focus:outline-none transition-colors"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Amount</label>
                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded 
                          text-white text-sm">
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          onClick={() => removeLineItem(index)}
                          disabled={formData.lineItems.length === 1}
                          className="p-2 hover:bg-red-500/20 rounded text-red-400 
                            hover:text-red-300 transition-colors disabled:opacity-30 
                            disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Indigenous content toggle */}
                    <div className="mt-3">
                      <label className="flex items-center space-x-2 text-sm text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isIndigenous}
                          onChange={(e) => updateLineItem(index, { isIndigenous: e.target.checked })}
                          className="rounded"
                        />
                        <span>Indigenous supplier/subcontractor</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Notes</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:border-blue-400/50 
                  focus:outline-none transition-colors resize-none"
                placeholder="Add any additional notes or payment instructions..."
              />
            </div>

            {/* Summary */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-white">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Tax (GST)</span>
                  <span className="text-white">${totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t border-white/20">
                  <span className="text-white">Total</span>
                  <span className="text-white">${totals.totalAmount.toFixed(2)}</span>
                </div>
                {totals.indigenousContentPercentage > 0 && (
                  <div className="flex justify-between text-sm pt-3 border-t border-white/20">
                    <span className="text-purple-300">Indigenous Content</span>
                    <span className="text-purple-300">
                      ${totals.indigenousContentValue.toFixed(2)} ({totals.indigenousContentPercentage}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-white/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubmit(false)}
              disabled={loading || !formData.clientName}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg text-white font-medium transition-all duration-200 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubmit(true)}
              disabled={loading || !formData.clientName}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                border-emerald-400/50 rounded-lg text-emerald-100 font-medium 
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
                flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Create & Send
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}