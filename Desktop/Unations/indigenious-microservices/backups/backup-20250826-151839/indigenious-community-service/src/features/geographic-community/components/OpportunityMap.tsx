// Opportunity Map Component
// Geographic visualization of RFQs and opportunities

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Briefcase, DollarSign, Calendar, Filter,
  Search, Building, Award, TrendingUp, Users,
  Clock, AlertCircle, ChevronRight, Layers,
  X, Info, Navigation, ZoomIn, ZoomOut
} from 'lucide-react'
import { Territory, Community, ProximitySearch } from '../types/geographic.types'
import { useTerritory } from '../hooks/useTerritory'
import { useCommunityData } from '../hooks/useCommunityData'

interface Opportunity {
  id: string
  title: string
  organization: string
  type: 'rfq' | 'rfp' | 'contract' | 'grant'
  value: number
  deadline: string
  location: {
    coordinates: [number, number]
    address: string
    territoryId?: string
    communityId?: string
  }
  indigenousRequirement?: {
    setAside: boolean
    preference: number
    mandatory: boolean
  }
  categories: string[]
  status: 'open' | 'closing_soon' | 'awarded' | 'cancelled'
}

interface OpportunityMapProps {
  opportunities?: Opportunity[]
  selectedOpportunity?: string
  onOpportunityClick?: (opportunity: Opportunity) => void
  onCommunityClick?: (community: Community) => void
  showCommunities?: boolean
  filters?: {
    type?: Opportunity['type'][]
    minValue?: number
    maxValue?: number
    indigenousOnly?: boolean
    categories?: string[]
  }
}

export function OpportunityMap({
  opportunities = [],
  selectedOpportunity,
  onOpportunityClick,
  onCommunityClick,
  showCommunities = true,
  filters
}: OpportunityMapProps) {
  const { territories } = useTerritory()
  const { communities } = useCommunityData()
  
  const [mapView, setMapView] = useState<'opportunities' | 'heatmap' | 'territories'>('opportunities')
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchRadius, setSearchRadius] = useState(50) // km

  // Mock opportunities data
  const mockOpportunities: Opportunity[] = [
    {
      id: 'opp-1',
      title: 'IT Infrastructure Modernization',
      organization: 'Indigenous Services Canada',
      type: 'rfq',
      value: 2500000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        coordinates: [-75.6972, 45.4215],
        address: 'Ottawa, ON',
        territoryId: 'territory-1'
      },
      indigenousRequirement: {
        setAside: true,
        preference: 100,
        mandatory: true
      },
      categories: ['IT', 'Infrastructure'],
      status: 'open'
    },
    {
      id: 'opp-2',
      title: 'Environmental Assessment Services',
      organization: 'Natural Resources Canada',
      type: 'rfp',
      value: 850000,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        coordinates: [-114.0719, 51.0447],
        address: 'Calgary, AB',
        territoryId: 'territory-2'
      },
      indigenousRequirement: {
        setAside: false,
        preference: 20,
        mandatory: false
      },
      categories: ['Environmental', 'Consulting'],
      status: 'closing_soon'
    },
    {
      id: 'opp-3',
      title: 'Community Health Center Construction',
      organization: 'First Nations Health Authority',
      type: 'contract',
      value: 5000000,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        coordinates: [-123.1207, 49.2827],
        address: 'Vancouver, BC',
        communityId: 'comm-3'
      },
      indigenousRequirement: {
        setAside: true,
        preference: 100,
        mandatory: true
      },
      categories: ['Construction', 'Healthcare'],
      status: 'open'
    }
  ]

  const allOpportunities = opportunities.length > 0 ? opportunities : mockOpportunities

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = allOpportunities

    if (filters) {
      if (filters.type?.length) {
        filtered = filtered.filter(opp => filters.type!.includes(opp.type))
      }
      if (filters.minValue) {
        filtered = filtered.filter(opp => opp.value >= filters.minValue!)
      }
      if (filters.maxValue) {
        filtered = filtered.filter(opp => opp.value <= filters.maxValue!)
      }
      if (filters.indigenousOnly) {
        filtered = filtered.filter(opp => opp.indigenousRequirement?.setAside)
      }
      if (filters.categories?.length) {
        filtered = filtered.filter(opp => 
          opp.categories.some(cat => filters.categories!.includes(cat))
        )
      }
    }

    if (selectedTerritory) {
      filtered = filtered.filter(opp => opp.location.territoryId === selectedTerritory)
    }

    return filtered
  }, [allOpportunities, filters, selectedTerritory])

  // Calculate opportunity density by territory
  const territoryStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {}
    
    territories.forEach(territory => {
      const territoryOpps = filteredOpportunities.filter(
        opp => opp.location.territoryId === territory.id
      )
      stats[territory.id] = {
        count: territoryOpps.length,
        value: territoryOpps.reduce((sum, opp) => sum + opp.value, 0)
      }
    })

    return stats
  }, [territories, filteredOpportunities])

  // Get opportunity type color
  const getOpportunityColor = (type: Opportunity['type']) => {
    const colors = {
      rfq: 'blue',
      rfp: 'purple',
      contract: 'emerald',
      grant: 'amber'
    }
    return colors[type]
  }

  // Get opportunity icon
  const getOpportunityIcon = (type: Opportunity['type']) => {
    const icons = {
      rfq: Briefcase,
      rfp: Building,
      contract: Award,
      grant: DollarSign
    }
    return icons[type]
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Calculate days until deadline
  const daysUntilDeadline = (deadline: string): number => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Map Container */}
      <div className="w-full h-full">
        {/* Mock map background */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 relative">
          <svg className="w-full h-full">
            <defs>
              <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            
            {/* Territory overlay */}
            {mapView === 'territories' && territories.map((territory, index) => {
              const stats = territoryStats[territory.id]
              const opacity = stats ? Math.min(stats.count * 0.1, 0.6) : 0.1
              
              return (
                <g key={territory.id}>
                  <circle
                    cx={`${30 + (index % 5) * 15}%`}
                    cy={`${30 + Math.floor(index / 5) * 20}%`}
                    r="80"
                    fill={`rgba(139, 92, 246, ${opacity})`}
                    stroke="rgba(139, 92, 246, 0.5)"
                    strokeWidth="2"
                    className="cursor-pointer hover:fill-purple-500/40 transition-all"
                    onClick={() => setSelectedTerritory(
                      selectedTerritory === territory.id ? null : territory.id
                    )}
                  />
                  <text
                    x={`${30 + (index % 5) * 15}%`}
                    y={`${30 + Math.floor(index / 5) * 20}%`}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    className="pointer-events-none"
                  >
                    {stats?.count || 0} opportunities
                  </text>
                </g>
              )
            })}

            {/* Communities */}
            {showCommunities && communities.map((community, index) => (
              <g key={community.id}>
                <circle
                  cx={`${25 + (index % 6) * 12}%`}
                  cy={`${25 + Math.floor(index / 6) * 15}%`}
                  r="15"
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="rgba(59, 130, 246, 0.8)"
                  strokeWidth="2"
                  className="cursor-pointer hover:fill-blue-500/50 transition-colors"
                  onClick={() => onCommunityClick?.(community)}
                />
              </g>
            ))}

            {/* Opportunities */}
            {mapView === 'opportunities' && filteredOpportunities.map((opportunity, index) => {
              const Icon = getOpportunityIcon(opportunity.type)
              const color = getOpportunityColor(opportunity.type)
              const isSelected = selectedOpportunity === opportunity.id
              const daysLeft = daysUntilDeadline(opportunity.deadline)
              
              return (
                <g key={opportunity.id}>
                  <circle
                    cx={`${20 + (index % 7) * 11}%`}
                    cy={`${20 + Math.floor(index / 7) * 14}%`}
                    r={isSelected ? "35" : "25"}
                    fill={`rgba(${color === 'blue' ? '59, 130, 246' : 
                           color === 'purple' ? '139, 92, 246' :
                           color === 'emerald' ? '16, 185, 129' :
                           '245, 158, 11'}, ${isSelected ? 0.5 : 0.3})`}
                    stroke={`rgba(${color === 'blue' ? '59, 130, 246' : 
                            color === 'purple' ? '139, 92, 246' :
                            color === 'emerald' ? '16, 185, 129' :
                            '245, 158, 11'}, 0.8)`}
                    strokeWidth={isSelected ? "3" : "2"}
                    className="cursor-pointer transition-all"
                    onClick={() => onOpportunityClick?.(opportunity)}
                  />
                  {opportunity.indigenousRequirement?.setAside && (
                    <circle
                      cx={`${20 + (index % 7) * 11}%`}
                      cy={`${20 + Math.floor(index / 7) * 14}%`}
                      r="35"
                      fill="none"
                      stroke="rgba(168, 85, 247, 0.6)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="animate-pulse"
                    />
                  )}
                  {daysLeft <= 7 && (
                    <text
                      x={`${20 + (index % 7) * 11}%`}
                      y={`${18 + Math.floor(index / 7) * 14}%`}
                      textAnchor="middle"
                      fill="#F59E0B"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {daysLeft}d
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 left-4 space-y-3 z-10">
        {/* View Mode */}
        <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 
          rounded-xl p-4">
          <p className="text-white text-sm font-medium mb-2">Map View</p>
          <div className="space-y-2">
            {(['opportunities', 'heatmap', 'territories'] as const).map(view => (
              <button
                key={view}
                onClick={() => setMapView(view)}
                className={`w-full px-3 py-2 rounded-lg text-sm capitalize 
                  transition-colors text-left ${
                    mapView === view
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                {view === 'opportunities' ? 'Opportunities' :
                 view === 'heatmap' ? 'Density Map' : 'By Territory'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center 
            space-x-2 ${showFilters 
              ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30' 
              : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/20'}`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-md 
        border border-white/20 rounded-xl p-4 z-10">
        <p className="text-white text-sm font-medium mb-2">Legend</p>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500/30 border-2 border-blue-500 rounded-full" />
            <span className="text-white/60 text-sm">RFQ</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500/30 border-2 border-purple-500 rounded-full" />
            <span className="text-white/60 text-sm">RFP</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-emerald-500/30 border-2 border-emerald-500 rounded-full" />
            <span className="text-white/60 text-sm">Contract</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-dashed rounded-full" />
            <span className="text-white/60 text-sm">Indigenous Set-Aside</span>
          </div>
        </div>
      </div>

      {/* Opportunity Stats */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-md 
        border border-white/20 rounded-xl p-4 z-10 w-64">
        <h3 className="text-white font-semibold mb-3">Opportunity Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Total Opportunities</span>
            <span className="text-white font-medium">{filteredOpportunities.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Total Value</span>
            <span className="text-white font-medium">
              {formatCurrency(filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0))}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Indigenous Set-Asides</span>
            <span className="text-purple-300 font-medium">
              {filteredOpportunities.filter(opp => opp.indigenousRequirement?.setAside).length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Closing Soon</span>
            <span className="text-amber-300 font-medium">
              {filteredOpportunities.filter(opp => 
                daysUntilDeadline(opp.deadline) <= 7
              ).length}
            </span>
          </div>
        </div>

        {selectedTerritory && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-purple-300 text-sm mb-2">
              Selected Territory: {territories.find(t => t.id === selectedTerritory)?.name}
            </p>
            <button
              onClick={() => setSelectedTerritory(null)}
              className="text-white/60 hover:text-white text-sm"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="absolute top-24 left-4 w-80 bg-gray-900/90 
              backdrop-blur-md border border-white/20 rounded-xl p-4 z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Filter Opportunities</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Search Radius */}
              <div>
                <label className="text-white/80 text-sm mb-2 block">
                  Search Radius: {searchRadius} km
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Indigenous Only */}
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 bg-white/10 border-white/20 rounded 
                    text-purple-500 focus:ring-purple-400"
                />
                <span className="text-white/80">Indigenous set-asides only</span>
              </label>

              {/* Opportunity Types */}
              <div>
                <p className="text-white/80 text-sm mb-2">Opportunity Types</p>
                <div className="space-y-2">
                  {(['rfq', 'rfp', 'contract', 'grant'] as const).map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 bg-white/10 border-white/20 rounded"
                      />
                      <span className="text-white/60 text-sm uppercase">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Value Range */}
              <div>
                <p className="text-white/80 text-sm mb-2">Value Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Opportunity Details */}
      {selectedOpportunity && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 w-96 
            bg-gray-900/90 backdrop-blur-md border border-white/20 
            rounded-xl p-4 z-10"
        >
          {(() => {
            const opportunity = filteredOpportunities.find(o => o.id === selectedOpportunity)
            if (!opportunity) return null
            
            const Icon = getOpportunityIcon(opportunity.type)
            const color = getOpportunityColor(opportunity.type)
            const daysLeft = daysUntilDeadline(opportunity.deadline)
            
            return (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
                      <Icon className={`w-5 h-5 text-${color}-400`} />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{opportunity.title}</h4>
                      <p className="text-white/60 text-sm">{opportunity.organization}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpportunityClick?.(opportunity)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <ChevronRight className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-white/60 text-sm">Value</p>
                    <p className="text-white font-medium">
                      {formatCurrency(opportunity.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Deadline</p>
                    <p className={`font-medium ${
                      daysLeft <= 7 ? 'text-amber-300' : 'text-white'
                    }`}>
                      {daysLeft} days
                    </p>
                  </div>
                </div>

                {opportunity.indigenousRequirement && (
                  <div className="p-3 bg-purple-500/10 border border-purple-400/30 
                    rounded-lg mb-3">
                    <p className="text-purple-200 text-sm">
                      {opportunity.indigenousRequirement.setAside 
                        ? '100% Indigenous Set-Aside'
                        : `${opportunity.indigenousRequirement.preference}% Indigenous Preference`}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">{opportunity.location.address}</span>
                </div>
              </>
            )
          })()}
        </motion.div>
      )}
    </div>
  )
}