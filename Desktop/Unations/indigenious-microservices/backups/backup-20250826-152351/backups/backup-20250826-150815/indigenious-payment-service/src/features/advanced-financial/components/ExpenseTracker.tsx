// Expense Tracker Component
// Track and categorize business expenses

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Search, Filter, Calendar, Tag,
  Paperclip, Camera, Upload, Check, X, AlertCircle,
  TrendingUp, TrendingDown, PieChart, Users, Feather,
  Building, Car, Coffee, Briefcase, Globe, DollarSign, Clock
} from 'lucide-react'
import { Transaction, TransactionCategory } from '../types/financial.types'
import { formatCurrency, formatRelativeTime } from '../utils/formatters'

interface ExpenseTrackerProps {
  budgetId?: string
  onAddExpense?: (expense: Transaction) => void
}

export function ExpenseTracker({ budgetId, onAddExpense }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<Transaction[]>([
    {
      id: 'exp-001',
      accountId: 'account-001',
      type: 'expense',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 1250.00,
      currency: 'CAD',
      category: 'travel',
      description: 'Flight to Thunder Bay for community consultation',
      merchantName: 'Air Canada',
      projectId: 'proj-001',
      status: 'completed',
      attachments: [{ id: 'att-001', name: 'receipt-001.pdf', type: 'application/pdf', size: 1024, url: '#', uploadedAt: new Date().toISOString(), uploadedBy: 'user-1' }],
      tags: ['indigenous-engagement', 'travel', 'consultation'],
      reconciled: true
    },
    {
      id: 'exp-002',
      accountId: 'account-001',
      type: 'expense',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 3500.00,
      currency: 'CAD',
      category: 'professional_fees',
      description: 'Elder consultation and ceremony',
      merchantName: 'Eagle Spirit Consulting',
      projectId: 'proj-001',
      status: 'completed',
      attachments: [{ id: 'att-002', name: 'receipt-002.pdf', type: 'application/pdf', size: 1024, url: '#', uploadedAt: new Date().toISOString(), uploadedBy: 'user-1' }],
      tags: ['elder-services', 'ceremony', 'cultural'],
      reconciled: true,
      indigenousImpact: {
        communityInvestment: 0,
        elderCompensation: 3500,
        youthTraining: 0,
        culturalActivities: 3500,
        languagePrograms: 0,
        localSuppliers: 0,
        employmentHours: 8,
        environmentalBenefit: 'Traditional ceremony'
      }
    },
    {
      id: 'exp-003',
      accountId: 'account-001',
      type: 'expense',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 450.00,
      currency: 'CAD',
      category: 'materials',
      description: 'Office supplies from Indigenous supplier',
      merchantName: 'Turtle Island Office Solutions',
      projectId: 'proj-002',
      status: 'pending',
      attachments: [],
      tags: ['office', 'supplies'],
      reconciled: false,
      taxDetails: {
        gst: { rate: 5, amount: 21.43 },
        pst: { rate: 7, amount: 30.00 },
        totalTax: 51.43
      },
      indigenousImpact: {
        communityInvestment: 450,
        elderCompensation: 0,
        youthTraining: 0,
        culturalActivities: 0,
        languagePrograms: 0,
        localSuppliers: 450,
        employmentHours: 0
      }
    }
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'disputed'>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null)

  // New expense form
  const [newExpense, setNewExpense] = useState<Partial<Transaction>>({
    accountId: 'account-001',
    type: 'expense',
    date: new Date().toISOString(),
    currency: 'CAD',
    category: 'other',
    status: 'pending',
    attachments: [],
    tags: [],
    reconciled: false
  })

  // Category icons and colors
  const categoryConfig: Record<TransactionCategory, { icon: any; color: string; label: string }> = {
    revenue: { icon: TrendingUp, color: 'emerald', label: 'Revenue' },
    materials: { icon: Building, color: 'blue', label: 'Materials' },
    labor: { icon: Users, color: 'purple', label: 'Labor' },
    equipment: { icon: Car, color: 'amber', label: 'Equipment' },
    travel: { icon: Globe, color: 'red', label: 'Travel' },
    professional_fees: { icon: Briefcase, color: 'indigo', label: 'Professional Fees' },
    utilities: { icon: Building, color: 'gray', label: 'Utilities' },
    rent: { icon: Building, color: 'pink', label: 'Rent' },
    insurance: { icon: Building, color: 'cyan', label: 'Insurance' },
    taxes: { icon: Receipt, color: 'orange', label: 'Taxes' },
    cultural_activities: { icon: Feather, color: 'purple', label: 'Cultural Activities' },
    community_investment: { icon: Users, color: 'emerald', label: 'Community Investment' },
    elder_compensation: { icon: Feather, color: 'indigo', label: 'Elder Compensation' },
    other: { icon: DollarSign, color: 'gray', label: 'Other' }
  }

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (!expense.description.toLowerCase().includes(search) &&
            !(expense.merchantName?.toLowerCase().includes(search)) &&
            !(expense.tags?.some(tag => tag.toLowerCase().includes(search)))) {
          return false
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && expense.status !== statusFilter) {
        return false
      }

      // Date range filter
      if (dateRange.start && new Date(expense.date) < new Date(dateRange.start)) {
        return false
      }
      if (dateRange.end && new Date(expense.date) > new Date(dateRange.end)) {
        return false
      }

      return true
    })
  }, [expenses, searchTerm, categoryFilter, statusFilter, dateRange])

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const pending = filteredExpenses.filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.amount, 0)
    const indigenousSpend = filteredExpenses
      .filter(exp => exp.indigenousImpact && (exp.indigenousImpact.communityInvestment > 0 || exp.indigenousImpact.localSuppliers > 0 || exp.indigenousImpact.elderCompensation > 0))
      .reduce((sum, exp) => sum + exp.amount, 0)
    const byCategory = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {} as Record<TransactionCategory, number>)

    return {
      total,
      pending,
      indigenousSpend,
      indigenousPercentage: total > 0 ? (indigenousSpend / total) * 100 : 0,
      byCategory,
      count: filteredExpenses.length
    }
  }, [filteredExpenses])

  // Handle expense submission
  const handleSubmit = () => {
    if (!newExpense.amount || !newExpense.description || !newExpense.merchantName) {
      return
    }

    const expense: Transaction = {
      id: `exp-${Date.now()}`,
      accountId: newExpense.accountId || 'account-001',
      type: 'expense',
      date: newExpense.date || new Date().toISOString(),
      amount: newExpense.amount,
      currency: newExpense.currency || 'CAD',
      category: newExpense.category as TransactionCategory,
      description: newExpense.description,
      merchantName: newExpense.merchantName,
      projectId: newExpense.projectId,
      status: 'pending',
      attachments: newExpense.attachments || [],
      tags: newExpense.tags || [],
      reconciled: false,
      reference: newExpense.reference,
      taxDetails: newExpense.taxDetails
    }

    setExpenses([expense, ...expenses])
    onAddExpense?.(expense)
    setNewExpense({
      accountId: 'account-001',
      type: 'expense',
      date: new Date().toISOString(),
      currency: 'CAD',
      category: 'other',
      status: 'pending',
      attachments: [],
      tags: [],
      reconciled: false
    })
    setShowAddForm(false)
  }

  // Handle receipt upload
  const handleReceiptUpload = (files: FileList) => {
    // In production, upload to cloud storage
    const newAttachments = Array.from(files).map(f => ({
      id: `att-${Date.now()}-${f.name}`,
      name: f.name,
      type: f.type,
      size: f.size,
      url: '#',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'user-1'
    }))
    setNewExpense({
      ...newExpense,
      attachments: [...(newExpense.attachments || []), ...newAttachments]
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Expense Tracker</h2>
          <p className="text-white/70">
            Track and categorize business expenses
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
            border border-blue-400/50 rounded-lg text-blue-200 
            font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(stats.total, 'CAD')}
          </p>
          <p className="text-white/60 text-sm">{stats.count} expenses</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-white/60 text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(stats.pending, 'CAD')}
          </p>
          <p className="text-white/60 text-sm">Awaiting approval</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 
          backdrop-blur-md border border-purple-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Feather className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm">Indigenous</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(stats.indigenousSpend, 'CAD')}
          </p>
          <p className="text-purple-300 text-sm">
            {stats.indigenousPercentage.toFixed(1)}% of total
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span className="text-white/60 text-sm">Top Category</span>
          </div>
          <p className="text-lg font-bold text-white">
            {Object.entries(stats.byCategory)
              .sort(([,a], [,b]) => b - a)[0]?.[0]
              .replace(/_/g, ' ') || 'N/A'}
          </p>
          <p className="text-white/60 text-sm">Most spending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TransactionCategory | 'all')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Categories</option>
            {Object.entries(categoryConfig).map(([value, config]) => (
              <option key={value} value={value} className="bg-gray-800">
                {config.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'disputed')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all" className="bg-gray-800">All Status</option>
            <option value="pending" className="bg-gray-800">Pending</option>
            <option value="completed" className="bg-gray-800">Completed</option>
            <option value="failed" className="bg-gray-800">Failed</option>
            <option value="cancelled" className="bg-gray-800">Cancelled</option>
            <option value="disputed" className="bg-gray-800">Disputed</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-white/60">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.map(expense => {
          const config = categoryConfig[expense.category]
          const Icon = config.icon

          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 
                rounded-xl p-4 hover:bg-white/15 transition-all cursor-pointer"
              onClick={() => setSelectedExpense(expense)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 bg-${config.color}-500/20 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${config.color}-400`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-medium text-white">{expense.description}</h4>
                        <p className="text-white/70 text-sm">{expense.merchantName}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {expense.indigenousImpact && (expense.indigenousImpact.communityInvestment > 0 || expense.indigenousImpact.localSuppliers > 0 || expense.indigenousImpact.elderCompensation > 0) && (
                          <span className="p-1 bg-purple-500/20 rounded">
                            <Feather className="w-4 h-4 text-purple-400" />
                          </span>
                        )}
                        {expense.attachments && expense.attachments.length > 0 && (
                          <span className="p-1 bg-blue-500/20 rounded">
                            <Paperclip className="w-4 h-4 text-blue-400" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-white/60">
                        {formatRelativeTime(expense.date)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        expense.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : expense.status === 'failed' || expense.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {expense.status}
                      </span>
                      {expense.tags?.map(tag => (
                        <span key={tag} className="text-white/50">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  {expense.taxDetails && (
                    <p className="text-white/60 text-sm">
                      +{formatCurrency(expense.taxDetails.totalTax, expense.currency)} tax
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 
              flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/90 backdrop-blur-md border border-white/20 
                rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-6">Add Expense</h3>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Date</label>
                    <input
                      type="date"
                      value={newExpense.date?.split('T')[0] || ''}
                      onChange={(e) => setNewExpense({
                        ...newExpense,
                        date: new Date(e.target.value).toISOString()
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white focus:outline-none focus:ring-2 
                        focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Amount</label>
                    <input
                      type="number"
                      value={newExpense.amount || ''}
                      onChange={(e) => setNewExpense({
                        ...newExpense,
                        amount: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white placeholder-white/50 focus:outline-none 
                        focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Description & Vendor */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Description</label>
                  <input
                    type="text"
                    value={newExpense.description || ''}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      description: e.target.value
                    })}
                    placeholder="What was this expense for?"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-2 block">Merchant</label>
                  <input
                    type="text"
                    value={newExpense.merchantName || ''}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      merchantName: e.target.value
                    })}
                    placeholder="Company or individual"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Category</label>
                    <select
                      value={newExpense.category || 'other'}
                      onChange={(e) => setNewExpense({
                        ...newExpense,
                        category: e.target.value as TransactionCategory
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white focus:outline-none focus:ring-2 
                        focus:ring-blue-400"
                    >
                      {Object.entries(categoryConfig).map(([value, config]) => (
                        <option key={value} value={value} className="bg-gray-800">
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Reference</label>
                    <input
                      type="text"
                      value={newExpense.reference || ''}
                      onChange={(e) => setNewExpense({
                        ...newExpense,
                        reference: e.target.value
                      })}
                      placeholder="Invoice or reference number"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white placeholder-white/50 focus:outline-none 
                        focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Project ID */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Project</label>
                  <input
                    type="text"
                    value={newExpense.projectId || ''}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      projectId: e.target.value
                    })}
                    placeholder="Associated project (optional)"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Receipts</label>
                  <div className="p-4 border-2 border-dashed border-white/20 
                    rounded-lg text-center hover:border-white/40 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files && handleReceiptUpload(e.target.files)}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                      <p className="text-white/60 text-sm">
                        Drop receipts here or click to upload
                      </p>
                    </label>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Tags</label>
                  <input
                    type="text"
                    value={newExpense.tags?.join(', ') || ''}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    })}
                    placeholder="Tags separated by commas"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 
                    border border-white/20 rounded-lg text-white/80 
                    transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                    border border-blue-400/50 rounded-lg text-blue-200 
                    font-medium transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}