// Proximity Matcher Component
// Location-based matching of opportunities to communities

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Navigation, Users, Briefcase, Route,
  Clock, Car, Calendar, AlertCircle, ChevronRight,
  Filter, TrendingUp, Award, CheckCircle, Info,
  Zap, Shield, Feather, Building
} from 'lucide-react'
import { Community, Territory, ProximitySearch, ProximityResult } from '../types/geographic.types'
import { useTerritory } from '../hooks/useTerritory'
import { useCommunityData } from '../hooks/useCommunityData'
import { useProximity } from '../hooks/useProximity'

interface Opportunity {
  id: string
  title: string
  location: {
    coordinates: [number, number]
    address: string
  }
  value: number
  deadline: string
  indigenousRequirement?: {
    setAside: boolean
    preference: number
  }
  categories: string[]
}

interface ProximityMatcherProps {
  opportunity: Opportunity
  onCommunitySelect?: (community: Community) => void
  onCreateAlert?: (communityId: string) => void
}

export function ProximityMatcher({
  opportunity,
  onCommunitySelect,
  onCreateAlert
}: ProximityMatcherProps) {
  const { territories } = useTerritory()
  const { communities } = useCommunityData()
  const { calculateProximity, findNearbyCommunities } = useProximity()

  const [searchRadius, setSearchRadius] = useState(100) // km
  const [sortBy, setSortBy] = useState<'distance' | 'capability' | 'capacity'>('distance')
  const [showOnlyQualified, setShowOnlyQualified] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null)

  // Find nearby communities
  const nearbyResults = useMemo(() => {
    const search: ProximitySearch = {
      center: opportunity.location.coordinates,
      radius: searchRadius,
      units: 'km',
      includeTypes: ['community'],
      excludeSacredSites: true,
      respectTerritories: true
    }

    return findNearbyCommunities(search, communities)
  }, [opportunity.location.coordinates, searchRadius, communities, findNearbyCommunities])

  // Calculate match scores
  const communityMatches = useMemo(() => {
    return nearbyResults.map(result => {
      const community = communities.find(c => c.id === result.feature.id)
      if (!community) return null

      // Calculate capability score based on categories
      const capabilityScore = opportunity.categories.reduce((score, category) => {
        if (community.economic.majorIndustries.some(ind => 
          ind.toLowerCase().includes(category.toLowerCase())
        )) {
          return score + 20
        }
        return score
      }, 0)

      // Calculate capacity score
      const capacityScore = Math.min(
        (community.economic.businesses / 10) * 10 +
        (community.economic.employmentRate / 10) +
        (community.population.workforce / 100),
        100
      )

      // Infrastructure bonus
      const infrastructureBonus = 
        (community.infrastructure.internetSpeed === 'fiber' ? 10 : 0) +
        (community.infrastructure.roadAccess === 'year-round' ? 10 : 0)

      // Calculate travel time estimate
      const travelTime = result.distance < 50 ? result.distance * 1.2 : 
                        result.distance < 200 ? result.distance * 1.5 :
                        result.distance * 2

      return {
        ...result,
        community,
        scores: {
          capability: capabilityScore,
          capacity: capacityScore,
          infrastructure: infrastructureBonus,
          total: capabilityScore + capacityScore + infrastructureBonus
        },
        travelTime,
        isQualified: capabilityScore >= 40 && capacityScore >= 30
      }
    }).filter(Boolean)
  }, [nearbyResults, communities, opportunity.categories])

  // Sort matches
  const sortedMatches = useMemo(() => {
    let matches = [...communityMatches]

    if (showOnlyQualified) {
      matches = matches.filter(m => m!.isQualified)
    }

    return matches.sort((a, b) => {
      if (!a || !b) return 0
      
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance
        case 'capability':
          return b.scores.capability - a.scores.capability
        case 'capacity':
          return b.scores.capacity - a.scores.capacity
        default:
          return b.scores.total - a.scores.total
      }
    })
  }, [communityMatches, sortBy, showOnlyQualified])

  // Get match quality color
  const getMatchQuality = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'emerald' }
    if (score >= 60) return { level: 'Good', color: 'blue' }
    if (score >= 40) return { level: 'Fair', color: 'amber' }
    return { level: 'Limited', color: 'gray' }
  }

  // Format distance
  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
  }

  // Format time
  const formatTravelTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 
        backdrop-blur-md border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Community Proximity Matching
            </h2>
            <p className="text-white/70">
              Finding qualified Indigenous communities near this opportunity
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            <span className="text-white">{opportunity.location.address}</span>
          </div>
        </div>

        {/* Search Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="text-white/80 text-sm mb-1 block">
              Search Radius: {searchRadius} km
            </label>
            <input
              type="range"
              min="25"
              max="500"
              step="25"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white/80 text-sm mb-1 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white focus:outline-none focus:ring-2 
                focus:ring-purple-400"
            >
              <option value="distance" className="bg-gray-800">Distance</option>
              <option value="capability" className="bg-gray-800">Capability Match</option>
              <option value="capacity" className="bg-gray-800">Capacity Score</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOnlyQualified}
                onChange={(e) => setShowOnlyQualified(e.target.checked)}
                className="w-4 h-4 bg-white/10 border-white/20 rounded 
                  text-purple-500 focus:ring-purple-400"
              />
              <span className="text-white/80 text-sm">Show qualified only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white">
                <span className="font-bold">{sortedMatches.length}</span> communities found
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-white">
                <span className="font-bold text-emerald-300">
                  {sortedMatches.filter(m => m?.isQualified).length}
                </span> qualified
              </span>
            </div>
          </div>

          {opportunity.indigenousRequirement?.setAside && (
            <div className="flex items-center space-x-2 px-3 py-1 
              bg-purple-500/20 border border-purple-400/30 rounded-full">
              <Shield className="w-4 h-4 text-purple-300" />
              <span className="text-purple-200 text-sm">
                Indigenous Set-Aside
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Community Matches */}
      <div className="space-y-4">
        {sortedMatches.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <MapPin className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No communities found
            </h3>
            <p className="text-white/60">
              Try increasing the search radius or adjusting filters
            </p>
          </div>
        ) : (
          sortedMatches.map(match => {
            if (!match) return null
            
            const { community, distance, scores, travelTime, isQualified } = match
            const matchQuality = getMatchQuality(scores.total)
            const isSelected = selectedCommunity === community.id

            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedCommunity(
                  isSelected ? null : community.id
                )}
                className={`bg-white/10 backdrop-blur-md border rounded-xl p-6 
                  hover:bg-white/15 transition-all cursor-pointer ${
                    isSelected ? 'border-purple-400/50' : 'border-white/20'
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 bg-${matchQuality.color}-500/20 rounded-lg`}>
                      <Feather className={`w-6 h-6 text-${matchQuality.color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {community.name}
                      </h3>
                      <p className="text-white/70">{community.nation}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="flex items-center space-x-1 text-white/60">
                          <Navigation className="w-4 h-4" />
                          <span>{formatDistance(distance)}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-white/60">
                          <Car className="w-4 h-4" />
                          <span>~{formatTravelTime(travelTime)}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-white/60">
                          <Users className="w-4 h-4" />
                          <span>{community.population.total.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 
                      bg-${matchQuality.color}-500/20 border border-${matchQuality.color}-400/30 
                      rounded-full mb-2`}>
                      <span className={`text-${matchQuality.color}-300 font-medium`}>
                        {matchQuality.level} Match
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(scores.total)}%
                    </p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-white/60 text-sm mb-1">Capability</div>
                    <div className="flex items-center justify-center space-x-1">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">
                        {scores.capability}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60 text-sm mb-1">Capacity</div>
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-medium">
                        {Math.round(scores.capacity)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60 text-sm mb-1">Infrastructure</div>
                    <div className="flex items-center justify-center space-x-1">
                      <Building className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium">
                        +{scores.infrastructure}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Community Details */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-white/60 text-sm">Businesses</p>
                          <p className="text-white font-medium">
                            {community.economic.businesses}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm">Employment</p>
                          <p className="text-white font-medium">
                            {community.economic.employmentRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm">Internet</p>
                          <p className="text-white font-medium capitalize">
                            {community.infrastructure.internetSpeed}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm">Access</p>
                          <p className="text-white font-medium capitalize">
                            {community.infrastructure.roadAccess.replace(/-/g, ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-white/60 text-sm mb-2">Major Industries</p>
                        <div className="flex flex-wrap gap-2">
                          {community.economic.majorIndustries.map(industry => (
                            <span
                              key={industry}
                              className={`px-2 py-1 text-xs rounded-full ${
                                opportunity.categories.some(cat => 
                                  industry.toLowerCase().includes(cat.toLowerCase())
                                )
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-white/10 text-white/60'
                              }`}
                            >
                              {industry}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCommunitySelect?.(community)
                          }}
                          className="flex-1 px-4 py-2 bg-purple-500/20 
                            hover:bg-purple-500/30 border border-purple-400/50 
                            rounded-lg text-purple-200 font-medium 
                            transition-colors flex items-center justify-center space-x-2"
                        >
                          <Users className="w-4 h-4" />
                          <span>View Profile</span>
                        </button>
                        
                        {isQualified && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateAlert?.(community.id)
                            }}
                            className="flex-1 px-4 py-2 bg-blue-500/20 
                              hover:bg-blue-500/30 border border-blue-400/50 
                              rounded-lg text-blue-200 font-medium 
                              transition-colors flex items-center justify-center space-x-2"
                          >
                            <Zap className="w-4 h-4" />
                            <span>Create Alert</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Qualification Badges */}
                <div className="flex items-center space-x-2 mt-4">
                  {isQualified && (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 
                      text-xs rounded-full flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Qualified</span>
                    </span>
                  )}
                  {community.infrastructure.internetSpeed === 'fiber' && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 
                      text-xs rounded-full">
                      High-Speed Internet
                    </span>
                  )}
                  {community.infrastructure.roadAccess === 'year-round' && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 
                      text-xs rounded-full">
                      Year-Round Access
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-200 font-medium mb-1">
              Proximity Matching Algorithm
            </p>
            <p className="text-blue-100/80 text-sm">
              Communities are matched based on distance, capability alignment with project 
              categories, business capacity, and infrastructure readiness. Scores help identify 
              the best potential partners for this opportunity.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}