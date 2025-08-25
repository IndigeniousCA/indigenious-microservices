// Budget Manager Component
// Create and manage project budgets

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator, TrendingUp, TrendingDown, AlertCircle,
  Plus, Minus, PieChart, BarChart3, Calendar,
  Lock, Users, Feather, ChevronRight, Edit,
  Save, X, Info, Target, DollarSign
} from 'lucide-react'
import { Budget, BudgetCategory, BudgetPeriod } from '../types/financial.types'
import { formatCurrency, formatPercentage } from '../utils/formatters'

interface BudgetManagerProps {
  projectId?: string
  onSave?: (budget: Budget) => void
}

export function BudgetManager({ projectId, onSave }: BudgetManagerProps) {
  const [budget, setBudget] = useState<Budget>({
    id: '',
    name: '',
    type: 'project',
    entityId: projectId || '',
    period: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    currency: 'CAD',
    categories: [],
    totalBudget: 0,
    totalSpent: 0,
    totalCommitted: 0,
    status: 'active',
    approvals: [],
    alerts: []
    // indigenousRequirement: {
    //   targetPercentage: 33,
    //   currentPercentage: 0,
    //   targetAmount: 0,
    //   currentAmount: 0
    // },
    // contingency: {
    //   percentage: 10,
    //   amount: 0,
    //   used: 0
    // }
  } as any)

  const [isEditing, setIsEditing] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<BudgetCategory>>({
    name: '',
    category: 'other' as const,
    budgeted: 0,
    spent: 0,
    committed: 0,
    variance: 0
  })

  // Calculate budget health
  const budgetHealth = useMemo(() => {
    if (budget.totalBudget === 0) return 'neutral'
    const spentPercentage = (budget.totalSpent / budget.totalBudget) * 100
    const timeElapsed = 50 // Mock - should calculate based on dates
    
    if (spentPercentage > timeElapsed + 10) return 'critical'
    if (spentPercentage > timeElapsed) return 'warning'
    return 'healthy'
  }, [budget])

  // Default budget categories
  const defaultCategories = [
    { name: 'Labor', icon: Users, color: 'blue' },
    { name: 'Materials', icon: Calculator, color: 'emerald' },
    { name: 'Equipment', icon: BarChart3, color: 'purple' },
    { name: 'Professional Services', icon: Users, color: 'amber' },
    { name: 'Travel & Accommodation', icon: Calendar, color: 'red' },
    { name: 'Indigenous Engagement', icon: Feather, color: 'indigo' },
    { name: 'Training & Development', icon: Target, color: 'pink' },
    { name: 'Other', icon: DollarSign, color: 'gray' }
  ]

  // Add category
  const addCategory = () => {
    if (!newCategory.name || !newCategory.budgeted) return

    const category: BudgetCategory = {
      id: `cat-${Date.now()}`,
      name: newCategory.name,
      category: newCategory.category || 'other',
      budgeted: newCategory.budgeted || 0,
      spent: 0,
      committed: 0,
      variance: 0
    }

    const updatedCategories = [...budget.categories, category]
    const totalBudget = updatedCategories.reduce((sum, cat) => sum + cat.budgeted, 0)

    setBudget({
      ...budget,
      categories: updatedCategories,
      totalBudget: totalBudget
    })

    setNewCategory({ name: '', category: 'other' as const, budgeted: 0, spent: 0, committed: 0, variance: 0 })
    setShowCategoryForm(false)
  }

  // Update category
  const updateCategory = (categoryId: string, updates: Partial<BudgetCategory>) => {
    const updatedCategories = budget.categories.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    )
    
    const totalBudget = updatedCategories.reduce((sum, cat) => sum + cat.budgeted, 0)

    setBudget({
      ...budget,
      categories: updatedCategories,
      totalBudget: totalBudget
    })
  }

  // Remove category
  const removeCategory = (categoryId: string) => {
    const updatedCategories = budget.categories.filter(cat => cat.id !== categoryId)
    const totalBudget = updatedCategories.reduce((sum, cat) => sum + cat.budgeted, 0)

    setBudget({
      ...budget,
      categories: updatedCategories,
      totalBudget: totalBudget
    })
  }

  // Save budget
  const handleSave = () => {
    const savedBudget = {
      ...budget,
      id: budget.id || `budget-${Date.now()}`
    }
    setBudget(savedBudget)
    setIsEditing(false)
    onSave?.(savedBudget)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Budget Manager</h2>
          <p className="text-white/70">
            Plan and track project budgets with Indigenous procurement targets
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                border border-blue-400/50 rounded-lg text-blue-200 
                font-medium transition-colors flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Budget</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 
                  border border-white/20 rounded-lg text-white/80 
                  transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                  border border-emerald-400/50 rounded-lg text-emerald-200 
                  font-medium transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Budget</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Budget */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 
          backdrop-blur-md border border-blue-400/30 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <Calculator className="w-6 h-6 text-blue-400" />
            <span className={`px-2 py-1 text-xs rounded-full ${
              budgetHealth === 'healthy' 
                ? 'bg-emerald-500/20 text-emerald-300'
                : budgetHealth === 'warning'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-red-500/20 text-red-300'
            }`}>
              {budgetHealth}
            </span>
          </div>
          <p className="text-white/70 text-sm">Total Budget</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(budget.totalBudget, 'CAD')}
          </p>
          <p className="text-blue-300 text-sm mt-2">
            Budget allocation
          </p>
        </div>

        {/* Spent */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 
          backdrop-blur-md border border-amber-400/30 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <TrendingDown className="w-6 h-6 text-amber-400" />
            <span className="text-sm text-amber-300">
              {formatPercentage((budget.totalSpent / budget.totalBudget) * 100)}
            </span>
          </div>
          <p className="text-white/70 text-sm">Spent to Date</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(budget.totalSpent, 'CAD')}
          </p>
          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
              style={{ width: `${Math.min((budget.totalSpent / budget.totalBudget) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 
          backdrop-blur-md border border-emerald-400/30 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span className="text-sm text-emerald-300">Available</span>
          </div>
          <p className="text-white/70 text-sm">Remaining Budget</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(budget.totalBudget - budget.totalSpent, 'CAD')}
          </p>
          <p className="text-emerald-300 text-sm mt-2">
            {formatPercentage(((budget.totalBudget - budget.totalSpent) / budget.totalBudget) * 100)} of total
          </p>
        </div>
      </div>

      {/* Indigenous Procurement Target */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 
        backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Feather className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">
              Indigenous Procurement Target
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-purple-300" />
            <span className="text-purple-300 text-sm">
              Federal requirement: 5% minimum
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-white/70 text-sm mb-1">Target</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-white">
                5%
              </p>
              <p className="text-purple-300">
                ({formatCurrency(budget.totalBudget * 0.05, 'CAD')})
              </p>
            </div>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Current</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-white">
                0%
              </p>
              <p className="text-purple-300">
                ({formatCurrency(0, 'CAD')})
              </p>
            </div>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-1">Progress</p>
            <div className="flex items-center space-x-3">
              <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-indigo-600"
                  style={{ 
                    width: `0%` 
                  }}
                />
              </div>
              <span className="text-sm font-medium text-amber-400">
                0%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Budget Categories</h3>
          {isEditing && (
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 
                border border-blue-400/50 rounded text-blue-200 text-sm
                flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
        </div>

        {/* Category Form */}
        <AnimatePresence>
          {showCategoryForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newCategory.name || ''}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Category name"
                  className="px-4 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white placeholder-white/50 
                    focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="number"
                  value={newCategory.budgeted || ''}
                  onChange={(e) => setNewCategory({ 
                    ...newCategory, 
                    budgeted: parseFloat(e.target.value) || 0 
                  })}
                  placeholder="Budget amount"
                  className="px-4 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white placeholder-white/50 
                    focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addCategory}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                      border border-emerald-400/50 rounded-lg text-emerald-200"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowCategoryForm(false)
                      setNewCategory({ name: '', category: 'other' as const, budgeted: 0, spent: 0, committed: 0, variance: 0 })
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 
                      border border-white/20 rounded-lg text-white/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories List */}
        <div className="space-y-3">
          {budget.categories.length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No budget categories defined</p>
              <p className="text-white/40 text-sm">Add categories to allocate your budget</p>
            </div>
          ) : (
            budget.categories.map(category => {
              const spentPercentage = category.budgeted > 0 
                ? (category.spent / category.budgeted) * 100 
                : 0
              const categoryConfig = defaultCategories.find(
                c => c.name.toLowerCase() === category.name.toLowerCase()
              )
              const Icon = categoryConfig?.icon || DollarSign
              const color = categoryConfig?.color || 'gray'

              return (
                <div
                  key={category.id}
                  className={`p-4 bg-white/5 border rounded-lg transition-all cursor-pointer ${
                    selectedCategory === category.id
                      ? 'border-blue-400/50'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${color}-400`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white">{category.name}</h4>
                          {category.name.toLowerCase().includes('indigenous') && (
                            <span className="px-2 py-0.5 bg-purple-500/20 
                              text-purple-300 text-xs rounded">
                              Indigenous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-white font-medium">
                        {formatCurrency(category.budgeted, 'CAD')}
                      </p>
                      <p className="text-white/60 text-sm">
                        {formatCurrency(category.spent, 'CAD')} spent
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">
                        {formatPercentage(spentPercentage)} used
                      </span>
                      <span className={`font-medium ${
                        spentPercentage > 90 ? 'text-red-400' :
                        spentPercentage > 75 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {formatCurrency(category.budgeted - category.spent, 'CAD')} left
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          spentPercentage > 90 
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : spentPercentage > 75
                            ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                            : `bg-gradient-to-r from-${color}-400 to-${color}-600`
                        }`}
                        style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {isEditing && selectedCategory === category.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 
                      flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCategory(category.id)
                        }}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 
                          border border-red-400/50 rounded text-red-200 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Budget Alerts */}
      {budget.alerts.length > 0 && (
        <div className="space-y-3">
          {budget.alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${
                alert.severity === 'critical'
                  ? 'bg-red-500/10 border-red-400/30'
                  : alert.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-400/30'
                  : 'bg-blue-500/10 border-blue-400/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  alert.severity === 'critical'
                    ? 'text-red-400'
                    : alert.severity === 'warning'
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`} />
                <div>
                  <p className={`font-medium ${
                    alert.severity === 'critical'
                      ? 'text-red-200'
                      : alert.severity === 'warning'
                      ? 'text-amber-200'
                      : 'text-blue-200'
                  }`}>
                    {alert.message}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {new Date(alert.triggeredAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}