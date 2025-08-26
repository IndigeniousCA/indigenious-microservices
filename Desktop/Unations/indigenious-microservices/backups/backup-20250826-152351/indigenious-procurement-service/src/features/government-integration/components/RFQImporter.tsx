// RFQ Importer Component
// Import and manage RFQs from government systems

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Filter, Search, Calendar, DollarSign,
  Tag, Building, Shield, AlertCircle, CheckCircle,
  Clock, FileText, Zap, MapPin, Users
} from 'lucide-react'
import { GovernmentSystem, GovernmentRFQ, SetAsideType } from '../types/integration.types'
import { useRFQImporter } from '../hooks/useRFQImporter'

interface RFQImporterProps {
  system?: GovernmentSystem
  onImport?: (rfqs: GovernmentRFQ[]) => void
  onRFQSelect?: (rfq: GovernmentRFQ) => void
}

export function RFQImporter({ 
  system, 
  onImport,
  onRFQSelect 
}: RFQImporterProps) {
  const { 
    availableRFQs, 
    importedRFQs,
    isLoading, 
    importRFQs, 
    refreshRFQs,
    getSystemRFQs 
  } = useRFQImporter()

  const [selectedSystem, setSelectedSystem] = useState<GovernmentSystem | 'all'>(system || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRFQs, setSelectedRFQs] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    setAsideOnly: true,
    minValue: 0,
    maxValue: 0,
    categories: [] as string[],
    dateRange: 'all' as 'today' | 'week' | 'month' | 'all'
  })

  // Get RFQs for selected system
  const displayRFQs = selectedSystem === 'all' 
    ? availableRFQs 
    : getSystemRFQs(selectedSystem)

  // Apply filters and search
  const filteredRFQs = displayRFQs.filter(rfq => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!rfq.title.toLowerCase().includes(searchLower) &&
          !rfq.description.toLowerCase().includes(searchLower) &&
          !rfq.referenceNumber.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Set-aside filter
    if (filters.setAsideOnly && rfq.procurement.setAside === 'none') {
      return false
    }

    // Value filter
    if (filters.minValue > 0 && rfq.procurement.estimatedValue) {
      if (rfq.procurement.estimatedValue.max < filters.minValue) {
        return false
      }
    }

    if (filters.maxValue > 0 && rfq.procurement.estimatedValue) {
      if (rfq.procurement.estimatedValue.min > filters.maxValue) {
        return false
      }
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const publishedDate = new Date(rfq.dates.published)
      const now = new Date()
      const daysDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 3600 * 24)
      
      if (filters.dateRange === 'today' && daysDiff > 1) return false
      if (filters.dateRange === 'week' && daysDiff > 7) return false
      if (filters.dateRange === 'month' && daysDiff > 30) return false
    }

    return true
  })

  // Toggle RFQ selection
  const toggleRFQSelection = (rfqId: string) => {
    const newSelection = new Set(selectedRFQs)
    if (newSelection.has(rfqId)) {
      newSelection.delete(rfqId)
    } else {
      newSelection.add(rfqId)
    }
    setSelectedRFQs(newSelection)
  }

  // Select all filtered RFQs
  const selectAll = () => {
    const allIds = new Set(filteredRFQs.map(rfq => rfq.id))
    setSelectedRFQs(allIds)
  }

  // Import selected RFQs
  const handleImport = async () => {
    const rfqsToImport = filteredRFQs.filter(rfq => selectedRFQs.has(rfq.id))
    await importRFQs(rfqsToImport)
    onImport?.(rfqsToImport)
    setSelectedRFQs(new Set())
  }

  // Get set-aside badge color
  const getSetAsideColor = (setAside: SetAsideType) => {
    switch (setAside) {
      case 'indigenous_business':
        return 'purple'
      case 'comprehensive_land_claim':
        return 'indigo'
      case 'small_business':
        return 'blue'
      default:
        return 'gray'
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Import Government RFQs</h2>
            <p className="text-white/70 text-sm mt-1">
              {filteredRFQs.length} opportunities available • {selectedRFQs.size} selected
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={refreshRFQs}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-lg text-white/80 text-sm transition-colors flex items-center space-x-2"
            >
              <Download className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {selectedRFQs.size > 0 && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border 
                  border-purple-400/50 rounded-lg text-purple-200 text-sm font-medium 
                  transition-colors flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Import {selectedRFQs.size} RFQ{selectedRFQs.size > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* System Selector */}
        <div className="flex items-center space-x-4">
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value as GovernmentSystem | 'all')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all" className="bg-gray-800">All Systems</option>
            <option value="GETS" className="bg-gray-800">GETS</option>
            <option value="SAP_ARIBA" className="bg-gray-800">SAP Ariba</option>
            <option value="BUY_AND_SELL" className="bg-gray-800">Buy and Sell</option>
            <option value="MERX" className="bg-gray-800">MERX</option>
            <option value="BC_BID" className="bg-gray-800">BC Bid</option>
            <option value="PSIB" className="bg-gray-800">PSIB Portal</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search RFQs..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center 
              space-x-2 ${showFilters 
                ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' 
                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.setAsideOnly}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      setAsideOnly: e.target.checked 
                    }))}
                    className="w-4 h-4 bg-white/10 border-white/20 rounded 
                      text-purple-500 focus:ring-purple-400"
                  />
                  <span className="text-white/80 text-sm">Indigenous Set-Asides Only</span>
                </label>

                <div>
                  <label className="text-white/60 text-xs mb-1 block">Min Value</label>
                  <input
                    type="number"
                    value={filters.minValue}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minValue: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-1 bg-white/10 border border-white/20 
                      rounded text-white text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs mb-1 block">Max Value</label>
                  <input
                    type="number"
                    value={filters.maxValue}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxValue: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-1 bg-white/10 border border-white/20 
                      rounded text-white text-sm"
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs mb-1 block">Posted</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: e.target.value as unknown 
                    }))}
                    className="w-full px-3 py-1 bg-white/10 border border-white/20 
                      rounded text-white text-sm"
                  >
                    <option value="all" className="bg-gray-800">All time</option>
                    <option value="today" className="bg-gray-800">Today</option>
                    <option value="week" className="bg-gray-800">This week</option>
                    <option value="month" className="bg-gray-800">This month</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RFQ List */}
      <div className="space-y-4">
        {/* Select All */}
        {filteredRFQs.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={selectAll}
              className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              Select all {filteredRFQs.length} RFQs
            </button>
          </div>
        )}

        {/* RFQ Cards */}
        {filteredRFQs.map((rfq) => (
          <motion.div
            key={rfq.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white/10 backdrop-blur-md border rounded-xl p-6 
              hover:bg-white/15 transition-all cursor-pointer ${
                selectedRFQs.has(rfq.id) 
                  ? 'border-purple-400/50 bg-purple-500/10' 
                  : 'border-white/20'
              }`}
            onClick={() => onRFQSelect?.(rfq)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRFQs.has(rfq.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleRFQSelection(rfq.id)
                    }}
                    className="mt-1 w-4 h-4 bg-white/10 border-white/20 rounded 
                      text-purple-500 focus:ring-purple-400"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{rfq.title}</h3>
                    <p className="text-white/60 text-sm">{rfq.referenceNumber}</p>
                  </div>
                </div>
              </div>

              {/* Source System Badge */}
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 
                rounded-full text-blue-300 text-xs font-medium">
                {rfq.sourceSystem}
              </span>
            </div>

            <p className="text-white/80 text-sm mb-4 line-clamp-2">{rfq.description}</p>

            {/* RFQ Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-white/60 text-xs">Organization</p>
                  <p className="text-white/90 text-sm">{rfq.issuingOrganization.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-white/60 text-xs">Closing</p>
                  <p className="text-white/90 text-sm">
                    {new Date(rfq.dates.closingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {rfq.procurement.estimatedValue && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-white/60 text-xs">Value</p>
                    <p className="text-white/90 text-sm">
                      {formatCurrency(rfq.procurement.estimatedValue.min)} - 
                      {formatCurrency(rfq.procurement.estimatedValue.max)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-white/60 text-xs">Documents</p>
                  <p className="text-white/90 text-sm">{rfq.documents.length} files</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center space-x-2 flex-wrap">
              {rfq.procurement.setAside !== 'none' && (
                <span className={`px-2 py-1 bg-${getSetAsideColor(rfq.procurement.setAside)}-500/20 
                  border border-${getSetAsideColor(rfq.procurement.setAside)}-400/30 
                  rounded text-${getSetAsideColor(rfq.procurement.setAside)}-300 text-xs`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {rfq.procurement.setAside.replace(/_/g, ' ')}
                </span>
              )}

              {rfq.procurement.securityClearance && rfq.procurement.securityClearance !== 'none' && (
                <span className="px-2 py-1 bg-red-500/20 border border-red-400/30 
                  rounded text-red-300 text-xs">
                  Security: {rfq.procurement.securityClearance}
                </span>
              )}

              {rfq.categories.keywords.slice(0, 3).map((keyword, index) => (
                <span key={index} className="px-2 py-1 bg-white/10 border border-white/20 
                  rounded text-white/70 text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </motion.div>
        ))}

        {filteredRFQs.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No RFQs Found</h3>
            <p className="text-white/60">
              {searchTerm || showFilters 
                ? 'Try adjusting your search or filters'
                : 'No new RFQs available for import'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}