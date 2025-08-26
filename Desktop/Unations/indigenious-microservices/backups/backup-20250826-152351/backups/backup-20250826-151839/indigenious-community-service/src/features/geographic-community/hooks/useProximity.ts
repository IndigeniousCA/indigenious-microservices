// Proximity Hook
// Calculate distances and find nearby features

import { useCallback, useMemo } from 'react'
import { 
  Coordinates, 
  Community, 
  Territory, 
  ProximitySearch, 
  ProximityResult,
  MapFeature 
} from '../types/geographic.types'

export function useProximity() {
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((
    coord1: Coordinates,
    coord2: Coordinates,
    unit: 'km' | 'mi' = 'km'
  ): number => {
    const [lon1, lat1] = coord1
    const [lon2, lat2] = coord2

    const R = unit === 'km' ? 6371 : 3959 // Earth's radius
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return Math.round(distance * 10) / 10
  }, [])

  // Convert degrees to radians
  const toRad = (deg: number): number => {
    return deg * (Math.PI / 180)
  }

  // Calculate bearing between two points
  const calculateBearing = useCallback((
    coord1: Coordinates,
    coord2: Coordinates
  ): number => {
    const [lon1, lat1] = coord1
    const [lon2, lat2] = coord2

    const dLon = toRad(lon2 - lon1)
    const lat1Rad = toRad(lat1)
    const lat2Rad = toRad(lat2)

    const y = Math.sin(dLon) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

    const bearing = Math.atan2(y, x)
    return (toDeg(bearing) + 360) % 360
  }, [])

  // Convert radians to degrees
  const toDeg = (rad: number): number => {
    return rad * (180 / Math.PI)
  }

  // Find communities within search parameters
  const findNearbyCommunities = useCallback((
    search: ProximitySearch,
    communities: Community[]
  ): ProximityResult[] => {
    const results: ProximityResult[] = []

    communities.forEach(community => {
      const distance = calculateDistance(
        search.center,
        community.location.coordinates,
        search.units
      )

      if (distance <= search.radius) {
        const bearing = calculateBearing(
          search.center,
          community.location.coordinates
        )

        // Estimate travel time based on road access
        let drivingTime: number | undefined
        if (community.infrastructure.roadAccess === 'year-round') {
          drivingTime = distance * 1.2 // 50 km/h average
        } else if (community.infrastructure.roadAccess === 'seasonal') {
          drivingTime = distance * 1.5 // 40 km/h average
        } else if (community.infrastructure.roadAccess === 'winter-road') {
          drivingTime = distance * 2 // 30 km/h average
        }

        const feature: MapFeature = {
          id: community.id,
          type: 'community',
          name: community.name,
          description: `${community.nation} - ${community.location.province}`,
          coordinates: community.location.coordinates,
          properties: {
            population: community.population.total,
            businesses: community.economic.businesses,
            roadAccess: community.infrastructure.roadAccess
          },
          visible: true
        }

        results.push({
          feature,
          distance,
          bearing,
          travelTime: drivingTime ? { driving: drivingTime } : undefined
        })
      }
    })

    return results.sort((a, b) => a.distance - b.distance)
  }, [calculateDistance, calculateBearing])

  // Find features within territory
  const findFeaturesInTerritory = useCallback((
    territory: Territory,
    features: MapFeature[]
  ): MapFeature[] => {
    // Simplified - in production, use proper point-in-polygon algorithm
    return features.filter(feature => {
      // Mock implementation - check if feature is associated with territory
      return feature.properties?.territoryId === territory.id
    })
  }, [])

  // Calculate proximity score (0-100)
  const calculateProximityScore = useCallback((
    distance: number,
    maxDistance: number
  ): number => {
    if (distance >= maxDistance) return 0
    return Math.round((1 - distance / maxDistance) * 100)
  }, [])

  // Get compass direction from bearing
  const getCompassDirection = useCallback((bearing: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }, [])

  // Find optimal route considering seasonal access
  const findOptimalRoute = useCallback((
    start: Coordinates,
    end: Coordinates,
    season: 'spring' | 'summer' | 'fall' | 'winter',
    communities: Community[]
  ): {
    distance: number
    estimatedTime: number
    waypoints: Community[]
    warnings: string[]
  } => {
    // Simplified implementation
    const directDistance = calculateDistance(start, end, 'km')
    const warnings: string[] = []
    const waypoints: Community[] = []

    // Check for communities along the route that might affect travel
    const routeCommunities = communities.filter(community => {
      const distFromStart = calculateDistance(start, community.location.coordinates, 'km')
      const distFromEnd = calculateDistance(community.location.coordinates, end, 'km')
      const totalDist = distFromStart + distFromEnd
      
      // Community is roughly along the route if total distance is close to direct distance
      return totalDist < directDistance * 1.3
    })

    // Check seasonal access
    routeCommunities.forEach(community => {
      if (season === 'winter' && community.infrastructure.roadAccess === 'seasonal') {
        warnings.push(`${community.name} has limited winter access`)
      }
      if (community.infrastructure.roadAccess === 'fly-in') {
        warnings.push(`${community.name} is fly-in only`)
      }
    })

    // Estimate travel time
    const estimatedTime = directDistance * 1.5 // Base estimate
    
    return {
      distance: directDistance,
      estimatedTime,
      waypoints,
      warnings
    }
  }, [calculateDistance])

  // Check if location is within sacred site buffer
  const isNearSacredSite = useCallback((
    location: Coordinates,
    sacredSites: Array<{ coordinates: Coordinates; bufferZone: number }>
  ): boolean => {
    return sacredSites.some(site => {
      const distance = calculateDistance(location, site.coordinates, 'km')
      return distance * 1000 <= site.bufferZone // Convert km to meters
    })
  }, [calculateDistance])

  return {
    calculateDistance,
    calculateBearing,
    calculateProximityScore,
    findNearbyCommunities,
    findFeaturesInTerritory,
    getCompassDirection,
    findOptimalRoute,
    isNearSacredSite
  }
}