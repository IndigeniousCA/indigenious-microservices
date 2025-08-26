// Geographic & Community Types
// Type definitions for mapping and community features

import { GeoJSON } from 'geojson'

// Coordinate types
export type Coordinates = [number, number] // [longitude, latitude]
export type BoundingBox = [number, number, number, number] // [west, south, east, north]

// Territory types
export interface Territory {
  id: string
  nation: string
  name: string
  type: 'traditional' | 'treaty' | 'reserve' | 'settlement' | 'urban'
  boundaries: GeoJSON.Polygon | GeoJSON.MultiPolygon
  area: number // square kilometers
  communities: string[]
  languages: string[]
  population?: number
  established?: string
  treaties?: string[]
  governance?: {
    type: 'band_council' | 'tribal_council' | 'self_government' | 'other'
    name: string
    leadership?: string[]
  }
  protocols?: ContactProtocol
  sacredSites?: SacredSite[]
  seasonalAccess?: SeasonalPattern[]
  acknowledgment?: string
}

// Community types
export interface Community {
  id: string
  name: string
  nation: string
  territoryId: string
  bandNumber?: string
  location: {
    coordinates: Coordinates
    address?: string
    region: string
    province: string
    postalCode?: string
    accessNotes?: string
  }
  population: {
    total: number
    onReserve?: number
    offReserve?: number
    workforce?: number
    youth?: number
    elders?: number
  }
  economic: {
    businesses: number
    employmentRate: number
    medianIncome?: number
    majorIndustries: string[]
    businessGrowth?: number
    economicLeakage?: number
  }
  infrastructure: {
    internetSpeed?: 'fiber' | 'broadband' | 'satellite' | 'limited' | 'none'
    internetReliability?: 'excellent' | 'good' | 'fair' | 'poor'
    roadAccess: 'year-round' | 'seasonal' | 'winter-road' | 'fly-in' | 'boat-only'
    utilities: Utility[]
    nearestCity?: {
      name: string
      distance: number
      driveTime?: number
    }
  }
  services: {
    healthCenter: boolean
    school: boolean
    communityCenter: boolean
    eldersCare: boolean
    youthPrograms: boolean
    culturalCenter: boolean
  }
  contacts: CommunityContact[]
  culturalInfo?: CulturalInformation
  opportunities?: {
    strengths: string[]
    challenges: string[]
    priorities: string[]
    partnerships: string[]
  }
}

// Sacred sites (limited information for protection)
export interface SacredSite {
  id: string
  type: 'ceremonial' | 'burial' | 'historical' | 'cultural' | 'other'
  bufferZone: number // meters
  restrictions?: string[]
  contactRequired: boolean
  seasonalAccess?: SeasonalPattern[]
  // Intentionally no coordinates for protection
}

// Contact protocols
export interface ContactProtocol {
  preferredMethods: ContactMethod[]
  languages: string[]
  decisionTimeline?: string
  elderConsultation: boolean
  protocolDocument?: string
  culturalAdvisor?: CommunityContact
  introductionRequired: boolean
  giftGiving?: {
    expected: boolean
    guidelines?: string
  }
}

export type ContactMethod = 'email' | 'phone' | 'in-person' | 'video' | 'mail' | 'through-council'

// Community contacts
export interface CommunityContact {
  id: string
  name: string
  role: string
  department?: string
  email?: string
  phone?: string
  preferredContact: ContactMethod
  languages: string[]
  availability?: string
  pronouns?: string
}

// Cultural information
export interface CulturalInformation {
  languages: Language[]
  traditions: string[]
  ceremonies?: {
    types: string[]
    season?: string
    participation?: 'open' | 'invitation' | 'members-only'
  }
  calendar?: CulturalEvent[]
  artsCrafts?: string[]
  stories?: {
    sharing: 'open' | 'restricted' | 'permission-required'
    keeper?: string
  }
}

export interface Language {
  name: string
  speakers: number
  status: 'fluent' | 'conversational' | 'learning' | 'endangered'
  revitalization?: boolean
  writingSystem?: 'latin' | 'syllabics' | 'both'
}

export interface CulturalEvent {
  name: string
  type: 'ceremony' | 'gathering' | 'festival' | 'teaching'
  season: string
  duration?: string
  isPublic: boolean
}

// Seasonal patterns
export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  startMonth: number
  endMonth: number
  accessibility: 'full' | 'limited' | 'restricted' | 'closed'
  notes?: string
}

// Utilities
export interface Utility {
  type: 'electricity' | 'water' | 'sewer' | 'gas' | 'internet' | 'phone'
  provider?: string
  reliability: 'excellent' | 'good' | 'fair' | 'poor'
  notes?: string
}

// Map features
export interface MapFeature {
  id: string
  type: 'community' | 'business' | 'project' | 'opportunity' | 'infrastructure'
  name: string
  description?: string
  coordinates: Coordinates
  properties: Record<string, any>
  icon?: string
  color?: string
  visible: boolean
}

// Proximity search
export interface ProximitySearch {
  center: Coordinates
  radius: number // kilometers
  units: 'km' | 'mi'
  includeTypes: MapFeature['type'][]
  excludeSacredSites: boolean
  respectTerritories: boolean
}

export interface ProximityResult {
  feature: MapFeature
  distance: number
  bearing: number
  territory?: Territory
  travelTime?: {
    driving?: number
    walking?: number
    note?: string
  }
}

// Regional analytics
export interface RegionalMetrics {
  region: string
  boundingBox: BoundingBox
  territories: string[]
  communities: number
  population: number
  businesses: number
  opportunities: {
    total: number
    value: number
    awarded: number
    indigenous: number
  }
  economicImpact: {
    totalSpend: number
    indigenousSpend: number
    percentageIndigenous: number
    jobsCreated: number
  }
  infrastructure: {
    connectedCommunities: number
    limitedAccess: number
    seasonalAccess: number
  }
}

// Map interaction events
export interface MapInteraction {
  type: 'click' | 'hover' | 'drag' | 'zoom'
  coordinates?: Coordinates
  feature?: MapFeature
  territory?: Territory
  timestamp: Date
}

// Route planning
export interface Route {
  id: string
  name?: string
  start: Coordinates
  end: Coordinates
  waypoints?: Coordinates[]
  distance: number
  duration: number
  seasonalVariations?: SeasonalPattern[]
  territories: string[]
  restrictions?: string[]
  alternativeRoutes?: Route[]
}

// Geographic filters
export interface GeographicFilter {
  territories?: string[]
  communities?: string[]
  radius?: {
    center: Coordinates
    distance: number
  }
  provinces?: string[]
  accessibility?: Community['infrastructure']['roadAccess'][]
  internetAvailable?: boolean
  populationMin?: number
  populationMax?: number
}

// Export all types
export type {
  GeoJSON,
  ContactMethod
}