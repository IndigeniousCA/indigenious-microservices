// Data Explorer Component
// Interactive data browsing and filtering interface

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, Download, Calendar, BarChart3, Table,
  Settings, Layers, Eye, EyeOff, ChevronDown, ChevronRight,
  X, Plus, Minus, SortAsc, SortDesc, MoreHorizontal,
  Database, Zap, Bookmark, Share, RefreshCw
} from 'lucide-react'
import { AnalyticsQuery, QueryFilter, OrderBy } from '../types/analytics.types'
import { useAnalytics } from '../hooks/useAnalytics'

interface DataExplorerProps {
  initialQuery?: AnalyticsQuery
  onQueryChange?: (query: AnalyticsQuery) => void
  onExport?: (data: unknown[], format: 'csv' | 'excel' | 'json') => void
  showSQLEditor?: boolean
}

interface ColumnDefinition {
  id: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  filterable: boolean
  sortable: boolean
  aggregatable?: boolean
}

export function DataExplorer({
  initialQuery,
  onQueryChange,
  onExport,
  showSQLEditor = false
}: DataExplorerProps) {
  const { query, isLoading } = useAnalytics()
  
  const [activeQuery, setActiveQuery] = useState<AnalyticsQuery>(initialQuery || {
    metrics: ['total_procurement', 'indigenous_spend', 'compliance_rate'],
    dimensions: ['department', 'date'],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      preset: 'last30days'
    },
    granularity: 'month',
    limit: 100
  })
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'department', 'total_procurement', 'indigenous_spend', 'compliance_rate'
  ])
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [sortBy, setSortBy] = useState<OrderBy[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [savedQueries, setSavedQueries] = useState<Array<{id: string, name: string, query: AnalyticsQuery}>>([])

  // Available columns/fields
  const availableColumns: ColumnDefinition[] = [
    { id: 'department', label: 'Department', type: 'string', filterable: true, sortable: true },
    { id: 'date', label: 'Date', type: 'date', filterable: true, sortable: true },
    { id: 'total_procurement', label: 'Total Procurement', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'indigenous_spend', label: 'Indigenous Spend', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'compliance_rate', label: 'Compliance Rate', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'contract_count', label: 'Contract Count', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'supplier_count', label: 'Supplier Count', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'business_name', label: 'Business Name', type: 'string', filterable: true, sortable: true },
    { id: 'community', label: 'Community', type: 'string', filterable: true, sortable: true },
    { id: 'province', label: 'Province', type: 'string', filterable: true, sortable: true },
    { id: 'contract_value', label: 'Contract Value', type: 'number', filterable: true, sortable: true, aggregatable: true },
    { id: 'win_rate', label: 'Win Rate', type: 'number', filterable: true, sortable: true },
    { id: 'employment_impact', label: 'Employment Impact', type: 'number', filterable: true, sortable: true, aggregatable: true }
  ]

  // Mock data for demonstration
  const mockData = [
    {
      department: 'Public Services and Procurement Canada',
      date: '2024-06',
      total_procurement: 350000000,
      indigenous_spend: 25200000,
      compliance_rate: 7.2,
      contract_count: 892,
      supplier_count: 134
    },
    {
      department: 'Indigenous Services Canada', 
      date: '2024-06',
      total_procurement: 180000000,
      indigenous_spend: 28440000,
      compliance_rate: 15.8,
      contract_count: 456,
      supplier_count: 89
    },
    {
      department: 'Natural Resources Canada',
      date: '2024-06', 
      total_procurement: 120000000,
      indigenous_spend: 5400000,
      compliance_rate: 4.5,
      contract_count: 234,
      supplier_count: 28
    },
    {
      department: 'Transport Canada',
      date: '2024-06',
      total_procurement: 95000000,
      indigenous_spend: 2660000,
      compliance_rate: 2.8,
      contract_count: 178,
      supplier_count: 15
    }
  ]

  // Add filter
  const addFilter = () => {
    const newFilter: QueryFilter = {
      field: 'department',
      operator: 'eq',
      value: ''
    }
    setFilters([...filters, newFilter])
  }

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  // Update filter
  const updateFilter = (index: number, updates: Partial<QueryFilter>) => {
    setFilters(filters.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    ))
  }

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    if (selectedColumns.includes(columnId)) {
      setSelectedColumns(selectedColumns.filter(id => id !== columnId))
    } else {
      setSelectedColumns([...selectedColumns, columnId])
    }
  }

  // Add sort
  const addSort = (field: string) => {
    const existingSort = sortBy.find(s => s.field === field)
    if (existingSort) {
      // Toggle direction
      setSortBy(sortBy.map(s => 
        s.field === field 
          ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
          : s
      ))
    } else {
      setSortBy([...sortBy, { field, direction: 'asc' }])
    }
  }

  // Format value for display
  const formatValue = (value: unknown, column: ColumnDefinition) => {
    if (value === null || value === undefined) return '-'
    
    switch (column.type) {
      case 'number':
        const numValue = value as number;
        if (column.id.includes('rate') || column.id.includes('percent')) {
          return `${numValue.toFixed(1)}%`
        }
        if (column.id.includes('spend') || column.id.includes('procurement') || column.id.includes('value')) {
          return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            notation: 'compact'
          }).format(numValue)
        }
        return numValue.toLocaleString()
      case 'date':
        return new Date(value as string | number).toLocaleDateString()
      default:
        return String(value)
    }
  }

  // Execute query
  const executeQuery = async () => {
    const queryToExecute: AnalyticsQuery = {
      ...activeQuery,
      filters,
      orderBy: sortBy
    }
    
    onQueryChange?.(queryToExecute)
    
    // In production, this would call the actual query function
    // const result = await query(queryToExecute)
  }

  // Save query
  const saveQuery = () => {
    const name = prompt('Enter query name:')
    if (name) {
      const newQuery = {
        id: `query-${Date.now()}`,
        name,
        query: { ...activeQuery, filters, orderBy: sortBy }
      }
      setSavedQueries([...savedQueries, newQuery])
    }
  }

  // Get visible columns
  const visibleColumns = availableColumns.filter(col => 
    selectedColumns.includes(col.id)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Data Explorer</h2>
          <p className="text-white/70">
            Interactive data browsing and analysis
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'chart'
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={saveQuery}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white transition-colors flex items-center space-x-2"
          >
            <Bookmark className="w-4 h-4" />
            <span>Save Query</span>
          </button>

          <button
            onClick={() => onExport?.(mockData, 'csv')}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
              border border-purple-400/50 rounded-lg text-purple-200 
              transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Query Builder */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Query Builder</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 
              rounded-lg text-white/80 text-sm transition-colors flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters ({filters.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${
              showFilters ? 'rotate-180' : ''
            }`} />
          </button>
        </div>

        {/* Column Selection */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-2 block">Columns</label>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map(column => (
              <button
                key={column.id}
                onClick={() => toggleColumn(column.id)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedColumns.includes(column.id)
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/20'
                }`}
              >
                {column.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/80 text-sm">Filters</label>
                <button
                  onClick={addFilter}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 
                    rounded-lg text-white/80 text-sm transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Filter</span>
                </button>
              </div>

              <div className="space-y-2">
                {filters.map((filter, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, { field: e.target.value })}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded 
                        text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      {availableColumns.filter(col => col.filterable).map(column => (
                        <option key={column.id} value={column.id} className="bg-gray-800">
                          {column.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, { operator: e.target.value as 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between' })}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded 
                        text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="eq" className="bg-gray-800">Equals</option>
                      <option value="ne" className="bg-gray-800">Not equals</option>
                      <option value="gt" className="bg-gray-800">Greater than</option>
                      <option value="gte" className="bg-gray-800">Greater or equal</option>
                      <option value="lt" className="bg-gray-800">Less than</option>
                      <option value="lte" className="bg-gray-800">Less or equal</option>
                      <option value="contains" className="bg-gray-800">Contains</option>
                    </select>

                    <input
                      type="text"
                      value={filter.value as string}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded 
                        text-white text-sm placeholder-white/50 focus:outline-none 
                        focus:ring-2 focus:ring-purple-400"
                    />

                    <button
                      onClick={() => removeFilter(index)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Execute Query */}
        <div className="flex items-center space-x-3">
          <button
            onClick={executeQuery}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
              disabled:opacity-50 border border-purple-400/50 rounded-lg 
              text-purple-200 transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Run Query</span>
          </button>

          <span className="text-white/60 text-sm">
            {mockData.length} rows • {visibleColumns.length} columns
          </span>
        </div>
      </div>

      {/* Data Table */}
      {viewMode === 'table' && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {visibleColumns.map(column => (
                    <th
                      key={column.id}
                      className="text-left px-6 py-4 text-white/80 font-medium cursor-pointer 
                        hover:bg-white/5 transition-colors"
                      onClick={() => column.sortable && addSort(column.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            <SortAsc className={`w-3 h-3 ${
                              sortBy.find(s => s.field === column.id && s.direction === 'asc')
                                ? 'text-purple-400' : 'text-white/30'
                            }`} />
                            <SortDesc className={`w-3 h-3 -mt-1 ${
                              sortBy.find(s => s.field === column.id && s.direction === 'desc')
                                ? 'text-purple-400' : 'text-white/30'
                            }`} />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockData.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {visibleColumns.map(column => (
                      <td key={column.id} className="px-6 py-4 text-white">
                        {formatValue(row[column.id as keyof typeof row], column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="h-64 flex items-center justify-center text-white/40">
            <BarChart3 className="w-8 h-8 mr-2" />
            <span>Chart visualization will be displayed here</span>
          </div>
        </div>
      )}

      {/* Saved Queries */}
      {savedQueries.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Saved Queries</h3>
          <div className="space-y-2">
            {savedQueries.map(savedQuery => (
              <div
                key={savedQuery.id}
                className="flex items-center justify-between p-3 bg-white/5 
                  rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-white">{savedQuery.name}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setActiveQuery(savedQuery.query)
                      setFilters(savedQuery.query.filters || [])
                      setSortBy(savedQuery.query.orderBy || [])
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Eye className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-1 hover:bg-white/10 rounded transition-colors">
                    <Share className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}