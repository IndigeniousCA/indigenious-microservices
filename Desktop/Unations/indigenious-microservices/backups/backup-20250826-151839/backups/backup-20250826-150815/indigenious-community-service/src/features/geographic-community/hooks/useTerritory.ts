// Territory Hook
// Manage territory data and boundaries

import { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { Territory, BoundingBox } from '../types/geographic.types'

export function useTerritory() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load territories on mount
  useEffect(() => {
    loadTerritories()
  }, [])

  const loadTerritories = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In production, fetch from API
      const mockTerritories: Territory[] = [
        {
          id: 'territory-1',
          nation: 'Haudenosaunee',
          name: 'Six Nations of the Grand River',
          type: 'reserve',
          boundaries: {
            type: 'Polygon',
            coordinates: [[
              [-80.1, 43.0], [-80.0, 43.0], [-80.0, 42.9], [-80.1, 42.9], [-80.1, 43.0]
            ]]
          },
          area: 183.2,
          communities: ['ohsweken', 'new-credit'],
          languages: ['Mohawk', 'Cayuga', 'Onondaga', 'Oneida', 'Seneca', 'Tuscarora'],
          population: 27276,
          established: '1784',
          treaties: ['Haldimand Treaty'],
          governance: {
            type: 'band_council',
            name: 'Six Nations Elected Council',
            leadership: ['Chief Mark Hill']
          },
          protocols: {
            preferredMethods: ['email', 'phone', 'in-person'],
            languages: ['English', 'Mohawk'],
            decisionTimeline: '2-4 weeks for major decisions',
            elderConsultation: true,
            introductionRequired: true,
            giftGiving: {
              expected: true,
              guidelines: 'Tobacco is traditional for requests'
            }
          },
          seasonalAccess: [
            {
              season: 'winter',
              startMonth: 12,
              endMonth: 3,
              accessibility: 'full',
              notes: 'Roads maintained year-round'
            }
          ],
          acknowledgment: 'We acknowledge that we are on the traditional territory of the Haudenosaunee Confederacy'
        },
        {
          id: 'territory-2',
          nation: 'Anishinaabe',
          name: 'Treaty 3',
          type: 'treaty',
          boundaries: {
            type: 'Polygon',
            coordinates: [[
              [-95.5, 50.0], [-91.0, 50.0], [-91.0, 48.0], [-95.5, 48.0], [-95.5, 50.0]
            ]]
          },
          area: 140000,
          communities: ['kenora', 'fort-frances', 'red-lake'],
          languages: ['Ojibwe', 'English'],
          population: 25000,
          established: '1873',
          treaties: ['Treaty 3'],
          governance: {
            type: 'tribal_council',
            name: 'Grand Council Treaty #3'
          },
          protocols: {
            preferredMethods: ['in-person', 'phone'],
            languages: ['Ojibwe', 'English'],
            decisionTimeline: '1-2 months',
            elderConsultation: true,
            introductionRequired: true
          }
        },
        {
          id: 'territory-3',
          nation: 'Inuit',
          name: 'Nunavut',
          type: 'settlement',
          boundaries: {
            type: 'Polygon',
            coordinates: [[
              [-120.0, 70.0], [-80.0, 70.0], [-80.0, 60.0], [-120.0, 60.0], [-120.0, 70.0]
            ]]
          },
          area: 2093190,
          communities: ['iqaluit', 'rankin-inlet', 'cambridge-bay'],
          languages: ['Inuktitut', 'Inuinnaqtun', 'English', 'French'],
          population: 39536,
          established: '1999',
          treaties: ['Nunavut Land Claims Agreement'],
          governance: {
            type: 'self_government',
            name: 'Government of Nunavut'
          },
          protocols: {
            preferredMethods: ['email', 'video', 'phone'],
            languages: ['Inuktitut', 'English'],
            decisionTimeline: '3-6 weeks',
            elderConsultation: true,
            introductionRequired: false
          },
          seasonalAccess: [
            {
              season: 'summer',
              startMonth: 6,
              endMonth: 9,
              accessibility: 'full',
              notes: 'Sea lift season for supplies'
            },
            {
              season: 'winter',
              startMonth: 10,
              endMonth: 5,
              accessibility: 'limited',
              notes: 'Air access only'
            }
          ]
        },
        {
          id: 'territory-4',
          nation: 'Cree',
          name: 'Eeyou Istchee',
          type: 'traditional',
          boundaries: {
            type: 'Polygon',
            coordinates: [[
              [-79.0, 54.0], [-74.0, 54.0], [-74.0, 49.0], [-79.0, 49.0], [-79.0, 54.0]
            ]]
          },
          area: 400000,
          communities: ['mistissini', 'waskaganish', 'chisasibi'],
          languages: ['Cree', 'English', 'French'],
          population: 18000,
          established: 'Time immemorial',
          treaties: ['James Bay and Northern Quebec Agreement'],
          governance: {
            type: 'self_government',
            name: 'Grand Council of the Crees'
          },
          protocols: {
            preferredMethods: ['in-person', 'through-council'],
            languages: ['Cree', 'English', 'French'],
            decisionTimeline: '4-8 weeks',
            elderConsultation: true,
            introductionRequired: true,
            giftGiving: {
              expected: false,
              guidelines: 'Not required but appreciated'
            }
          }
        },
        {
          id: 'territory-5',
          nation: "Mi'kmaq",
          name: "Mi'kma'ki",
          type: 'traditional',
          boundaries: {
            type: 'Polygon',
            coordinates: [[
              [-66.0, 48.0], [-59.0, 48.0], [-59.0, 43.0], [-66.0, 43.0], [-66.0, 48.0]
            ]]
          },
          area: 75000,
          communities: ['membertou', 'eskasoni', 'millbrook'],
          languages: ["Mi'kmaq", 'English', 'French'],
          population: 65000,
          established: 'Time immemorial',
          treaties: ['Peace and Friendship Treaties'],
          governance: {
            type: 'tribal_council',
            name: "Mi'kmaq Grand Council"
          },
          protocols: {
            preferredMethods: ['in-person', 'email'],
            languages: ["Mi'kmaq", 'English'],
            decisionTimeline: '2-6 weeks',
            elderConsultation: true,
            introductionRequired: true
          },
          sacredSites: [
            {
              id: 'sacred-1',
              type: 'ceremonial',
              bufferZone: 1000,
              restrictions: ['No development', 'Permission required for access'],
              contactRequired: true
            }
          ]
        }
      ]

      setTerritories(mockTerritories)
    } catch (err) {
      setError('Failed to load territories')
      logger.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get territory by ID
  const getTerritoryById = (id: string) => {
    return territories.find(t => t.id === id)
  }

  // Get territories by nation
  const getTerritoriesByNation = (nation: string) => {
    return territories.filter(t => 
      t.nation.toLowerCase().includes(nation.toLowerCase())
    )
  }

  // Get territories by type
  const getTerritoriesByType = (type: Territory['type']) => {
    return territories.filter(t => t.type === type)
  }

  // Check if point is within territory
  const isPointInTerritory = (
    point: [number, number], 
    territoryId: string
  ): boolean => {
    const territory = getTerritoryById(territoryId)
    if (!territory) return false

    // Simplified point-in-polygon check
    // In production, use proper geographic library
    const bounds = territory.boundaries
    if (bounds.type === 'Polygon') {
      const coords = bounds.coordinates[0]
      const minLng = Math.min(...coords.map(c => c[0]))
      const maxLng = Math.max(...coords.map(c => c[0]))
      const minLat = Math.min(...coords.map(c => c[1]))
      const maxLat = Math.max(...coords.map(c => c[1]))

      return point[0] >= minLng && point[0] <= maxLng &&
             point[1] >= minLat && point[1] <= maxLat
    }

    return false
  }

  // Get territories within bounding box
  const getTerritoriesInBounds = (bounds: BoundingBox) => {
    return territories.filter(territory => {
      // Check if territory overlaps with bounds
      // Simplified check - in production use proper geographic intersection
      return true
    })
  }

  // Calculate total area
  const totalArea = useMemo(() => {
    return territories.reduce((sum, t) => sum + t.area, 0)
  }, [territories])

  // Calculate total population
  const totalPopulation = useMemo(() => {
    return territories.reduce((sum, t) => sum + (t.population || 0), 0)
  }, [territories])

  // Get unique nations
  const nations = useMemo(() => {
    return Array.from(new Set(territories.map(t => t.nation)))
  }, [territories])

  // Get unique languages
  const languages = useMemo(() => {
    const allLanguages = territories.flatMap(t => t.languages)
    return Array.from(new Set(allLanguages))
  }, [territories])

  return {
    territories,
    isLoading,
    error,
    getTerritoryById,
    getTerritoriesByNation,
    getTerritoriesByType,
    isPointInTerritory,
    getTerritoriesInBounds,
    totalArea,
    totalPopulation,
    nations,
    languages,
    refresh: loadTerritories
  }
}