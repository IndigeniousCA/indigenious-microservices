// Bid Pricing Form Component
// Handles detailed cost breakdown and payment terms

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, Plus, Trash2, Calculator, AlertCircle,
  TrendingUp, Calendar, FileText, Info
} from 'lucide-react'
import type { PriceBreakdown } from '../types/bid.types'

interface BidPricingFormProps {
  data: unknown
  onChange: (data: unknown) => void
  errors?: string[]
}

export function BidPricingForm({ data, onChange, errors }: BidPricingFormProps) {
  const [breakdown, setBreakdown] = useState<PriceBreakdown[]>(
    data?.breakdown || [
      {
        id: '1',
        category: 'Labor',
        description: '',
        quantity: 1,
        unit: 'hours',
        unitPrice: 0,
        totalPrice: 0
      }
    ]
  )
  const [paymentTerms, setPaymentTerms] = useState(data?.paymentTerms || 'net-30')
  const [validityPeriod, setValidityPeriod] = useState(data?.validityPeriod || 30)
  const [assumptions, setAssumptions] = useState<string[]>(data?.assumptions || [''])
  const [exclusions, setExclusions] = useState<string[]>(data?.exclusions || [''])

  // Calculate totals
  const subtotal = breakdown.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const tax = subtotal * 0.13 // 13% HST for Ontario
  const total = subtotal + tax

  // Common cost categories
  const categories = [
    'Labor',
    'Materials',
    'Equipment',
    'Subcontracting',
    'Travel',
    'Overhead',
    'Other'
  ]

  // Common units
  const units = [
    'hours',
    'days',
    'weeks',
    'months',
    'units',
    'km',
    'sqm',
    'cubic m',
    'lump sum'
  ]

  // Add new line item
  const addLineItem = () => {
    const newItem: PriceBreakdown = {
      id: Date.now().toString(),
      category: 'Labor',
      description: '',
      quantity: 1,
      unit: 'hours',
      unitPrice: 0,
      totalPrice: 0
    }
    setBreakdown([...breakdown, newItem])
  }

  // Update line item
  const updateLineItem = (id: string, field: keyof PriceBreakdown, value: unknown) => {
    setBreakdown(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // Recalculate total if quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice
        }
        
        return updated
      }
      return item
    }))
  }

  // Remove line item
  const removeLineItem = (id: string) => {
    if (breakdown.length > 1) {
      setBreakdown(prev => prev.filter(item => item.id !== id))
    }
  }

  // Add assumption/exclusion
  const addItem = (type: 'assumptions' | 'exclusions') => {
    if (type === 'assumptions') {
      setAssumptions([...assumptions, ''])
    } else {
      setExclusions([...exclusions, ''])
    }
  }

  // Update assumption/exclusion
  const updateItem = (type: 'assumptions' | 'exclusions', index: number, value: string) => {
    if (type === 'assumptions') {
      const updated = [...assumptions]
      updated[index] = value
      setAssumptions(updated)
    } else {
      const updated = [...exclusions]
      updated[index] = value
      setExclusions(updated)
    }
  }

  // Remove assumption/exclusion
  const removeItem = (type: 'assumptions' | 'exclusions', index: number) => {
    if (type === 'assumptions' && assumptions.length > 1) {
      setAssumptions(assumptions.filter((_, i) => i !== index))
    } else if (type === 'exclusions' && exclusions.length > 1) {
      setExclusions(exclusions.filter((_, i) => i !== index))
    }
  }

  // Update parent component
  useEffect(() => {
    onChange({
      totalAmount: total,
      breakdown,
      assumptions: assumptions.filter(a => a.trim()),
      exclusions: exclusions.filter(e => e.trim()),
      paymentTerms,
      validityPeriod
    })
  }, [breakdown, assumptions, exclusions, paymentTerms, validityPeriod, total])

  return (
    <div className="space-y-6">
      {/* Price Breakdown Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Cost Breakdown</h3>
          <button
            onClick={addLineItem}
            className="text-sm text-blue-300 hover:text-blue-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-sm font-medium text-white/80">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-white/80">Description</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-white/80">Qty</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-white/80">Unit</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-white/80">Unit Price</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-white/80">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="px-4 py-3">
                    <select
                      value={item.category}
                      onChange={(e) => updateLineItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                        text-white text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-gray-800">{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                        text-white text-sm placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                        text-white text-sm text-center focus:border-blue-400/50 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.unit}
                      onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                      className="w-24 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                        text-white text-sm focus:border-blue-400/50 focus:outline-none appearance-none"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit} className="bg-gray-800">{unit}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-32 pl-8 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                          text-white text-sm text-right focus:border-blue-400/50 focus:outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-medium">
                      ${item.totalPrice.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {breakdown.length > 1 && (
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20">
                <td colSpan={5} className="px-4 py-3 text-right text-white/80">Subtotal:</td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  ${subtotal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-white/80">HST (13%):</td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  ${tax.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
              <tr className="border-t border-white/10">
                <td colSpan={5} className="px-4 py-3 text-right text-lg font-medium text-white">Total:</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-blue-400">
                  ${total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Terms & Validity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Payment Terms <span className="text-red-400">*</span>
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl
              text-white focus:border-blue-400/50 focus:outline-none appearance-none"
          >
            <option value="net-30" className="bg-gray-800">Net 30 days</option>
            <option value="net-60" className="bg-gray-800">Net 60 days</option>
            <option value="2-10-net-30" className="bg-gray-800">2/10 Net 30</option>
            <option value="milestone" className="bg-gray-800">Milestone-based</option>
            <option value="custom" className="bg-gray-800">Custom terms</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Quote Validity Period <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={validityPeriod}
              onChange={(e) => setValidityPeriod(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl
                text-white focus:border-blue-400/50 focus:outline-none"
            />
            <span className="text-white/60">days</span>
          </div>
          <p className="mt-1 text-xs text-white/60">
            Standard is 30-90 days. Longer periods may be less competitive.
          </p>
        </div>
      </div>

      {/* Assumptions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-white/80">
            Assumptions
          </label>
          <button
            onClick={() => addItem('assumptions')}
            className="text-sm text-blue-300 hover:text-blue-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {assumptions.map((assumption, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={assumption}
                onChange={(e) => updateItem('assumptions', index, e.target.value)}
                placeholder="e.g., Materials will be provided by client"
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl
                  text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
              />
              {assumptions.length > 1 && (
                <button
                  onClick={() => removeItem('assumptions', index)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Exclusions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-white/80">
            Exclusions
          </label>
          <button
            onClick={() => addItem('exclusions')}
            className="text-sm text-blue-300 hover:text-blue-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {exclusions.map((exclusion, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={exclusion}
                onChange={(e) => updateItem('exclusions', index, e.target.value)}
                placeholder="e.g., Permits and approvals"
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl
                  text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
              />
              {exclusions.length > 1 && (
                <button
                  onClick={() => removeItem('exclusions', index)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Tips */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-100 mb-2">Pricing Best Practices</h4>
            <ul className="text-sm text-blue-100/80 space-y-1">
              <li>• Be transparent with your breakdown - buyers appreciate detail</li>
              <li>• Include all costs to avoid change orders later</li>
              <li>• Consider offering early payment discounts</li>
              <li>• Clearly state what's included and excluded</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-100 mb-1">Please fix the following:</p>
              <ul className="text-sm text-red-100/80 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}