// Territory Map Component
// Interactive map showing Indigenous territories and communities

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, Layers, Navigation, Info, Search, Filter,
  MapPin, Users, Briefcase, AlertCircle, ChevronRight,
  Maximize2, Download, Share2, Eye, EyeOff, Feather,
  X
} from 'lucide-react'
import { Territory, Community, MapFeature, MapInteraction } from '../types/geographic.types'
import { useTerritory } from '../hooks/useTerritory'
import { useCommunityData } from '../hooks/useCommunityData'

interface TerritoryMapProps {
  initialCenter?: [number, number]
  initialZoom?: number
  selectedTerritories?: string[]
  onTerritoryClick?: (territory: Territory) => void
  onCommunityClick?: (community: Community) => void
  showControls?: boolean
}

export function TerritoryMap({
  initialCenter = [-106.3468, 56.1304], // Canada center
  initialZoom = 4,
  selectedTerritories = [],
  onTerritoryClick,
  onCommunityClick,
  showControls = true
}: TerritoryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null)
  const [showLayers, setShowLayers] = useState({
    territories: true,
    communities: true,
    businesses: false,
    opportunities: false,
    sacredSites: false
  })
  const [mapStyle, setMapStyle] = useState<'light' | 'satellite' | 'terrain'>('light')
  const [showInfo, setShowInfo] = useState(true)

  const { territories, isLoading: territoriesLoading } = useTerritory()
  const { communities, isLoading: communitiesLoading } = useCommunityData()

  // Mock map implementation (replace with actual Mapbox/Leaflet in production)
  useEffect(() => {
    if (!mapContainer.current) return

    // Simulate map loading
    setTimeout(() => {
      setIsMapLoaded(true)
    }, 1500)

    return () => {
      // Cleanup
    }
  }, [])

  // Toggle layer visibility
  const toggleLayer = (layer: keyof typeof showLayers) => {
    setShowLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  // Change map style
  const changeMapStyle = (style: typeof mapStyle) => {
    setMapStyle(style)
  }

  const isLoading = !isMapLoaded || territoriesLoading || communitiesLoading

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full">
        {/* Placeholder map background */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900">
          {isMapLoaded && (
            <div className="w-full h-full relative">
              {/* Mock map visualization */}
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Mock territories */}
                {showLayers.territories && territories.map((territory, index) => (
                  <g key={territory.id}>
                    <circle
                      cx={`${30 + (index % 5) * 15}%`}
                      cy={`${30 + Math.floor(index / 5) * 20}%`}
                      r="60"
                      fill="rgba(139, 92, 246, 0.2)"
                      stroke="rgba(139, 92, 246, 0.5)"
                      strokeWidth="2"
                      className="cursor-pointer hover:fill-purple-500/40 transition-colors"
                      onClick={() => {
                        onTerritoryClick?.(territory)
                        setSelectedFeature({
                          id: territory.id,
                          type: 'community',
                          name: territory.name,
                          coordinates: [0, 0],
                          properties: { nation: territory.nation },
                          visible: true
                        })
                      }}
                    />
                    <text
                      x={`${30 + (index % 5) * 15}%`}
                      y={`${30 + Math.floor(index / 5) * 20}%`}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      className="pointer-events-none"
                    >
                      {territory.name}
                    </text>
                  </g>
                ))}

                {/* Mock communities */}
                {showLayers.communities && communities.map((community, index) => (
                  <g key={community.id}>
                    <circle
                      cx={`${20 + (index % 6) * 13}%`}
                      cy={`${25 + Math.floor(index / 6) * 18}%`}
                      r="20"
                      fill="rgba(59, 130, 246, 0.4)"
                      stroke="rgba(59, 130, 246, 0.8)"
                      strokeWidth="2"
                      className="cursor-pointer hover:fill-blue-500/60 transition-colors"
                      onClick={() => {
                        onCommunityClick?.(community)
                        setSelectedFeature({
                          id: community.id,
                          type: 'community',
                          name: community.name,
                          coordinates: community.location.coordinates,
                          properties: { 
                            population: community.population.total,
                            businesses: community.economic.businesses 
                          },
                          visible: true
                        })
                      }}
                    />
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm 
              flex items-center justify-center z-20"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-400/30 
                border-t-purple-400 rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Loading territories...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 space-y-3 z-10">
          {/* Layer Controls */}
          <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 
            rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Layers className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Layers</span>
            </div>

            {Object.entries(showLayers).map(([layer, visible]) => {
              if (layer === 'sacredSites') return null // Never show sacred sites toggle
              
              const icons = {
                territories: Map,
                communities: Users,
                businesses: Briefcase,
                opportunities: MapPin
              }
              const Icon = icons[layer as keyof typeof icons]

              return (
                <button
                  key={layer}
                  onClick={() => toggleLayer(layer as keyof typeof showLayers)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 
                    rounded-lg transition-colors ${
                      visible
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm capitalize">{layer}</span>
                  {visible ? <Eye className="w-4 h-4 ml-auto" /> : <EyeOff className="w-4 h-4 ml-auto" />}
                </button>
              )
            })}
          </div>

          {/* Map Style Controls */}
          <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 
            rounded-xl p-4 space-y-2">
            <p className="text-white text-sm font-medium mb-2">Map Style</p>
            {(['light', 'satellite', 'terrain'] as const).map(style => (
              <button
                key={style}
                onClick={() => changeMapStyle(style)}
                className={`w-full px-3 py-2 rounded-lg text-sm capitalize 
                  transition-colors ${
                    mapStyle === style
                      ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Feature Info */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 w-80 bg-gray-900/90 
              backdrop-blur-md border border-white/20 rounded-xl p-4 z-10"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold">{selectedFeature.name}</h3>
                <p className="text-white/60 text-sm capitalize">{selectedFeature.type}</p>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(selectedFeature.properties).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white/60 text-sm capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-purple-500/20 
              hover:bg-purple-500/30 border border-purple-400/50 
              rounded-lg text-purple-200 text-sm font-medium 
              transition-colors flex items-center justify-center space-x-2">
              <Info className="w-4 h-4" />
              <span>View Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Territory Acknowledgment */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 max-w-sm bg-gray-900/90 
            backdrop-blur-md border border-white/20 rounded-xl p-4 z-10"
        >
          <div className="flex items-start space-x-3">
            <Feather className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-white text-sm">
                This map displays traditional territories and current communities 
                of Indigenous peoples across Canada.
              </p>
              <button
                onClick={() => setShowInfo(false)}
                className="text-purple-300 hover:text-purple-200 text-sm mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}