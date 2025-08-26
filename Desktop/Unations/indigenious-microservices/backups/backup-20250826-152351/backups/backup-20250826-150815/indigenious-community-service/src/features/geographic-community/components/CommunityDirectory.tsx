// Community Directory Component
// Searchable database of Indigenous communities

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, MapPin, Users, Briefcase, Globe,
  Phone, Mail, ChevronRight, Grid, List, Download,
  Wifi, Car, Building, Heart, BookOpen, Calendar,
  TrendingUp, Award, Info, X, Feather
} from 'lucide-react'
import { Community, GeographicFilter } from '../types/geographic.types'
import { useCommunityData } from '../hooks/useCommunityData'

interface CommunityDirectoryProps {
  onCommunitySelect?: (community: Community) => void
  onViewOnMap?: (community: Community) => void
  initialFilters?: GeographicFilter
}

export function CommunityDirectory({
  onCommunitySelect,
  onViewOnMap,
  initialFilters
}: CommunityDirectoryProps) {
  const { communities, stats, isLoading } = useCommunityData(initialFilters)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<GeographicFilter>(initialFilters || {})
  const [sortBy, setSortBy] = useState<'name' | 'population' | 'businesses' | 'employment'>('name')

  // Filter communities based on search and filters
  const filteredCommunities = useMemo(() => {
    let filtered = communities

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(community => 
        community.name.toLowerCase().includes(search) ||
        community.nation.toLowerCase().includes(search) ||
        community.location.province.toLowerCase().includes(search) ||
        community.location.region.toLowerCase().includes(search)
      )
    }

    // Province filter
    if (filters.provinces?.length) {
      filtered = filtered.filter(c => 
        filters.provinces!.includes(c.location.province)
      )
    }

    // Internet filter
    if (filters.internetAvailable !== undefined) {
      filtered = filtered.filter(c => {
        const hasGoodInternet = ['fiber', 'broadband'].includes(
          c.infrastructure.internetSpeed || ''
        )
        return filters.internetAvailable ? hasGoodInternet : !hasGoodInternet
      })
    }

    // Road access filter
    if (filters.accessibility?.length) {
      filtered = filtered.filter(c => 
        filters.accessibility!.includes(c.infrastructure.roadAccess)
      )
    }

    // Population filter
    if (filters.populationMin) {
      filtered = filtered.filter(c => c.population.total >= filters.populationMin!)
    }
    if (filters.populationMax) {
      filtered = filtered.filter(c => c.population.total <= filters.populationMax!)
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'population':
          return b.population.total - a.population.total
        case 'businesses':
          return b.economic.businesses - a.economic.businesses
        case 'employment':
          return b.economic.employmentRate - a.economic.employmentRate
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [communities, searchTerm, filters, sortBy])

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    return {
      provinces: Array.from(new Set(communities.map(c => c.location.province))).sort(),
      nations: Array.from(new Set(communities.map(c => c.nation))).sort(),
      roadAccess: Array.from(new Set(communities.map(c => c.infrastructure.roadAccess)))
    }
  }, [communities])

  // Get infrastructure quality
  const getInfrastructureQuality = (community: Community) => {
    const hasGoodInternet = ['fiber', 'broadband'].includes(
      community.infrastructure.internetSpeed || ''
    )
    const hasYearRoundAccess = community.infrastructure.roadAccess === 'year-round'
    
    if (hasGoodInternet && hasYearRoundAccess) {
      return { level: 'excellent', color: 'emerald' }
    } else if (hasGoodInternet || hasYearRoundAccess) {
      return { level: 'good', color: 'blue' }
    } else {
      return { level: 'limited', color: 'amber' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Community Directory</h2>
          <p className="text-white/70">
            Explore {stats.total} Indigenous communities across Canada
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="bg-white/10 border border-white/20 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
            border border-purple-400/50 rounded-lg text-purple-200 
            transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-white/60 text-sm">Communities</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm">Population</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.totalPopulation.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <span className="text-white/60 text-sm">Businesses</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalBusinesses}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="text-white/60 text-sm">Employment</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.avgEmploymentRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">Connected</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.withFiberInternet}</p>
          <p className="text-white/60 text-sm">Fiber internet</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Car className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm">Access</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.yearRoundAccess}</p>
          <p className="text-white/60 text-sm">Year-round</p>
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
              placeholder="Search communities, nations, or regions..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="name" className="bg-gray-800">Sort by Name</option>
            <option value="population" className="bg-gray-800">Sort by Population</option>
            <option value="businesses" className="bg-gray-800">Sort by Businesses</option>
            <option value="employment" className="bg-gray-800">Sort by Employment</option>
          </select>

          {/* Filter Toggle */}
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
                {/* Province Filter */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Province</label>
                  <select
                    value={filters.provinces?.[0] || 'all'}
                    onChange={(e) => setFilters({
                      ...filters,
                      provinces: e.target.value === 'all' ? undefined : [e.target.value]
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white text-sm focus:outline-none 
                      focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all" className="bg-gray-800">All Provinces</option>
                    {filterOptions.provinces.map(province => (
                      <option key={province} value={province} className="bg-gray-800">
                        {province}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Internet Filter */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Internet</label>
                  <select
                    value={filters.internetAvailable === undefined ? 'all' : 
                           filters.internetAvailable ? 'yes' : 'no'}
                    onChange={(e) => setFilters({
                      ...filters,
                      internetAvailable: e.target.value === 'all' ? undefined :
                                       e.target.value === 'yes'
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white text-sm focus:outline-none 
                      focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all" className="bg-gray-800">All Communities</option>
                    <option value="yes" className="bg-gray-800">High-Speed Available</option>
                    <option value="no" className="bg-gray-800">Limited Internet</option>
                  </select>
                </div>

                {/* Road Access Filter */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Road Access</label>
                  <select
                    value={filters.accessibility?.[0] || 'all'}
                    onChange={(e) => setFilters({
                      ...filters,
                      accessibility: e.target.value === 'all' ? undefined : [e.target.value as unknown]
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white text-sm focus:outline-none 
                      focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all" className="bg-gray-800">All Access Types</option>
                    <option value="year-round" className="bg-gray-800">Year-Round</option>
                    <option value="seasonal" className="bg-gray-800">Seasonal</option>
                    <option value="winter-road" className="bg-gray-800">Winter Road</option>
                    <option value="fly-in" className="bg-gray-800">Fly-In Only</option>
                  </select>
                </div>

                {/* Population Range */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Population</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.populationMin || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        populationMin: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-1/2 px-2 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white text-sm placeholder-white/50"
                    />
                    <span className="text-white/60">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.populationMax || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        populationMax: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-1/2 px-2 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white text-sm placeholder-white/50"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setFilters({})
                  setSearchTerm('')
                }}
                className="mt-4 text-purple-300 hover:text-purple-200 text-sm"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-white/60">
          Showing <span className="text-white font-medium">{filteredCommunities.length}</span> of{' '}
          <span className="text-white font-medium">{communities.length}</span> communities
        </p>
      </div>

      {/* Community Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map(community => {
            const infrastructure = getInfrastructureQuality(community)
            
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 
                  rounded-xl p-6 hover:bg-white/15 transition-all cursor-pointer"
                onClick={() => onCommunitySelect?.(community)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Feather className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{community.name}</h3>
                      <p className="text-white/70 text-sm">{community.nation}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewOnMap?.(community)
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <MapPin className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{community.location.region}</span>
                    </span>
                    <span className="text-white/80 text-sm">{community.location.province}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>Population</span>
                    </span>
                    <span className="text-white font-medium">
                      {community.population.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm flex items-center space-x-1">
                      <Briefcase className="w-4 h-4" />
                      <span>Businesses</span>
                    </span>
                    <span className="text-white font-medium">{community.economic.businesses}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>Employment</span>
                    </span>
                    <span className="text-white font-medium">
                      {community.economic.employmentRate}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 bg-${infrastructure.color}-500/20 
                      text-${infrastructure.color}-300 text-xs rounded-full capitalize`}>
                      {infrastructure.level} Infrastructure
                    </span>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCommunities.map(community => {
            const infrastructure = getInfrastructureQuality(community)
            
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 
                  rounded-xl p-6 hover:bg-white/15 transition-all cursor-pointer"
                onClick={() => onCommunitySelect?.(community)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Feather className="w-8 h-8 text-purple-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{community.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-white/70">
                        <span>{community.nation}</span>
                        <span>•</span>
                        <span>{community.location.region}, {community.location.province}</span>
                        {community.bandNumber && (
                          <>
                            <span>•</span>
                            <span>Band #{community.bandNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-white font-medium">
                          {community.population.total.toLocaleString()}
                        </p>
                        <p className="text-white/60 text-xs">Population</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">{community.economic.businesses}</p>
                        <p className="text-white/60 text-xs">Businesses</p>
                      </div>
                      <div>
                        <p className="text-white font-medium">{community.economic.employmentRate}%</p>
                        <p className="text-white/60 text-xs">Employment</p>
                      </div>
                      <div>
                        <p className={`font-medium text-${infrastructure.color}-300 capitalize`}>
                          {infrastructure.level}
                        </p>
                        <p className="text-white/60 text-xs">Infrastructure</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewOnMap?.(community)
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MapPin className="w-5 h-5 text-white/60" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-4">
                  {community.infrastructure.internetSpeed && (
                    <span className={`flex items-center space-x-1 text-sm ${
                      ['fiber', 'broadband'].includes(community.infrastructure.internetSpeed)
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}>
                      <Wifi className="w-4 h-4" />
                      <span className="capitalize">{community.infrastructure.internetSpeed}</span>
                    </span>
                  )}
                  
                  <span className={`flex items-center space-x-1 text-sm ${
                    community.infrastructure.roadAccess === 'year-round'
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}>
                    <Car className="w-4 h-4" />
                    <span className="capitalize">
                      {community.infrastructure.roadAccess.replace(/-/g, ' ')}
                    </span>
                  </span>

                  {community.economic.majorIndustries.slice(0, 3).map(industry => (
                    <span key={industry} className="text-white/60 text-sm">
                      {industry}
                    </span>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* No Results */}
      {filteredCommunities.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No communities found</h3>
          <p className="text-white/60">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}