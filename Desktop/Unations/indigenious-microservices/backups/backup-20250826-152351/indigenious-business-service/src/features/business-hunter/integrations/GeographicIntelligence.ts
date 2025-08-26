/**
 * Geographic Intelligence System
 * Analyzes location data for partnership opportunities and strategic insights
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Redis } from 'ioredis';
import axios from 'axios';
import * as turf from '@turf/turf';
import { createLogger } from '../core/utils/logger';
import {
  EnrichedBusiness,
  BusinessAddress,
  BusinessType
} from '../types';
import {
  GeographicIntelligence,
  CommunityDistance,
  GeographicOpportunity
} from '../types/enhanced-types';

export interface GeographicConfig {
  mapboxApiKey?: string;
  googleMapsApiKey?: string;
  enableRouting: boolean;
  enableTerritoryMapping: boolean;
  maxSearchRadius: number; // km
  cacheExpiry: number; // hours
}

export interface TerritoryData {
  name: string;
  nation: string;
  boundaries: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  population: number;
  languages: string[];
  economicActivities: string[];
}

export interface CommunityData {
  name: string;
  nation: string;
  location: {
    lat: number;
    lng: number;
  };
  population: number;
  hasRoadAccess: boolean;
  nearestUrbanCenter: string;
  distanceToUrbanCenter: number;
  industries: string[];
}

export interface ProcurementZone {
  id: string;
  name: string;
  type: 'federal' | 'provincial' | 'municipal' | 'indigenous';
  boundaries: GeoJSON.Polygon;
  procurementVolume: number;
  preferredSuppliers: string[];
}

export interface TransportationRoute {
  type: 'road' | 'air' | 'water' | 'winter_road';
  distance: number;
  duration: number;
  cost: number;
  availability: 'year_round' | 'seasonal';
  restrictions?: string[];
}

export class GeographicIntelligenceSystem extends EventEmitter {
  private readonly logger: Logger;
  private readonly redis: Redis;
  private readonly config: GeographicConfig;
  private territoriesCache: Map<string, TerritoryData>;
  private communitiesCache: Map<string, CommunityData>;

  constructor(redis: Redis, config: GeographicConfig) {
    super();
    this.logger = createLogger('geographic-intelligence');
    this.redis = redis;
    this.config = config;
    this.territoriesCache = new Map();
    this.communitiesCache = new Map();

    this.loadGeographicData();
  }

  /**
   * Analyze geographic intelligence for a business
   */
  async analyzeBusinessLocation(
    business: EnrichedBusiness
  ): Promise<GeographicIntelligence | null> {
    if (!business.address || !business.address.postalCode) {
      this.logger.warn(`No address for business: ${business.name}`);
      return null;
    }

    try {
      // Geocode address if needed
      const coordinates = await this.geocodeAddress(business.address);
      if (!coordinates) {
        this.logger.error(`Failed to geocode address for ${business.name}`);
        return null;
      }

      // Analyze territory
      const territoryAnalysis = await this.analyzeTerritoryContext(coordinates);

      // Find nearby communities
      const nearestCommunities = await this.findNearbyCommunities(
        coordinates,
        this.config.maxSearchRadius
      );

      // Identify procurement zones
      const procurementZones = await this.identifyProcurementZones(coordinates);

      // Find partnership opportunities
      const opportunities = await this.findPartnershipOpportunities(
        business,
        coordinates,
        nearestCommunities
      );

      const intelligence: GeographicIntelligence = {
        businessId: business.id,
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: business.address.street || '',
          city: business.address.city || '',
          province: business.address.province || '',
          postalCode: business.address.postalCode
        },
        territoryAnalysis: {
          traditionalTerritory: territoryAnalysis.territory,
          nearestIndigenousCommunities: nearestCommunities,
          procurementZones: procurementZones.map(z => z.name),
          economicRegion: await this.getEconomicRegion(coordinates)
        },
        partnershipOpportunities: opportunities
      };

      // Cache the analysis
      await this.cacheIntelligence(business.id, intelligence);

      this.emit('intelligence:analyzed', {
        businessId: business.id,
        hasOpportunities: opportunities.length > 0
      });

      return intelligence;

    } catch (error) {
      this.logger.error(`Geographic analysis failed for ${business.name}:`, error);
      return null;
    }
  }

  /**
   * Find businesses within radius
   */
  async findNearbyBusinesses(
    center: { lat: number; lng: number },
    radiusKm: number,
    filters?: {
      type?: BusinessType;
      industry?: string[];
      minTier?: string;
    }
  ): Promise<Array<{ business: EnrichedBusiness; distance: number }>> {
    const nearbyBusinesses: Array<{ business: EnrichedBusiness; distance: number }> = [];

    try {
      // Get all businesses from cache/database
      const businesses = await this.getAllBusinessesWithLocation();

      const centerPoint = turf.point([center.lng, center.lat]);

      for (const business of businesses) {
        if (!business.coordinates) continue;

        // Apply filters
        if (filters) {
          if (filters.type && business.type !== filters.type) continue;
          if (filters.industry && !business.industry?.some(i => filters.industry!.includes(i))) continue;
        }

        const businessPoint = turf.point([business.coordinates.lng, business.coordinates.lat]);
        const distance = turf.distance(centerPoint, businessPoint, { units: 'kilometers' });

        if (distance <= radiusKm) {
          nearbyBusinesses.push({
            business: business as EnrichedBusiness,
            distance
          });
        }
      }

      // Sort by distance
      nearbyBusinesses.sort((a, b) => a.distance - b.distance);

      return nearbyBusinesses;

    } catch (error) {
      this.logger.error('Failed to find nearby businesses:', error);
      return [];
    }
  }

  /**
   * Calculate optimal meeting points
   */
  async calculateMeetingPoints(
    businesses: Array<{ id: string; weight?: number }>
  ): Promise<Array<{
    location: { lat: number; lng: number };
    city: string;
    averageDistance: number;
    accessibility: string;
  }>> {
    const meetingPoints = [];

    try {
      // Get coordinates for all businesses
      const businessCoordinates = await Promise.all(
        businesses.map(async b => {
          const coords = await this.getBusinessCoordinates(b.id);
          return coords ? { ...coords, weight: b.weight || 1 } : null;
        })
      );

      const validCoordinates = businessCoordinates.filter(c => c !== null);
      if (validCoordinates.length < 2) {
        return [];
      }

      // Calculate weighted centroid
      const centroid = this.calculateWeightedCentroid(validCoordinates);

      // Find nearest city to centroid
      const nearestCity = await this.findNearestCity(centroid);

      // Calculate average distance
      const avgDistance = this.calculateAverageDistance(centroid, validCoordinates);

      meetingPoints.push({
        location: centroid,
        city: nearestCity.name,
        averageDistance: avgDistance,
        accessibility: nearestCity.hasAirport ? 'excellent' : 'good'
      });

      // Find major cities within reasonable distance
      const majorCities = await this.findMajorCitiesNearby(centroid, 200);
      
      for (const city of majorCities) {
        const avgDist = this.calculateAverageDistance(city.location, validCoordinates);
        
        meetingPoints.push({
          location: city.location,
          city: city.name,
          averageDistance: avgDist,
          accessibility: city.hasAirport ? 'excellent' : 'good'
        });
      }

      // Sort by average distance
      meetingPoints.sort((a, b) => a.averageDistance - b.averageDistance);

      return meetingPoints.slice(0, 5); // Top 5 options

    } catch (error) {
      this.logger.error('Failed to calculate meeting points:', error);
      return [];
    }
  }

  /**
   * Analyze supply chain routes
   */
  async analyzeSupplyChainRoutes(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number; demand: number }>
  ): Promise<{
    optimalRoute: any;
    totalDistance: number;
    estimatedCost: number;
    timeEstimate: number;
  }> {
    try {
      // Use routing API if available
      if (this.config.mapboxApiKey || this.config.googleMapsApiKey) {
        return await this.calculateOptimalRoute(origin, destinations);
      }

      // Fallback to straight-line distance calculation
      const route = this.calculateSimpleRoute(origin, destinations);
      
      return {
        optimalRoute: route,
        totalDistance: route.totalDistance,
        estimatedCost: route.totalDistance * 2.5, // $2.50 per km estimate
        timeEstimate: route.totalDistance / 60 // 60 km/h average
      };

    } catch (error) {
      this.logger.error('Supply chain route analysis failed:', error);
      throw error;
    }
  }

  /**
   * Geocode address to coordinates
   */
  private async geocodeAddress(address: BusinessAddress): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `geo:${address.postalCode}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Try Canadian postal code geocoding first
      const coordinates = await this.geocodeCanadianPostalCode(address.postalCode!);
      
      if (coordinates) {
        // Cache result
        await this.redis.setex(
          cacheKey,
          3600 * 24 * 30, // 30 days
          JSON.stringify(coordinates)
        );
        
        return coordinates;
      }

      // Fallback to full address geocoding
      if (this.config.googleMapsApiKey) {
        return await this.geocodeWithGoogle(address);
      } else if (this.config.mapboxApiKey) {
        return await this.geocodeWithMapbox(address);
      }

      return null;

    } catch (error) {
      this.logger.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Geocode Canadian postal code
   */
  private async geocodeCanadianPostalCode(postalCode: string): Promise<{ lat: number; lng: number } | null> {
    // Canadian postal codes have known approximate coordinates
    // This would integrate with a postal code database
    
    const postalData = this.getPostalCodeData(postalCode);
    if (postalData) {
      return postalData.coordinates;
    }

    return null;
  }

  /**
   * Analyze territory context
   */
  private async analyzeTerritoryContext(
    coordinates: { lat: number; lng: number }
  ): Promise<{ territory: string | undefined; nation: string | undefined }> {
    const point = turf.point([coordinates.lng, coordinates.lat]);

    // Check against traditional territory boundaries
    for (const [name, territory] of this.territoriesCache) {
      if (turf.booleanPointInPolygon(point, territory.boundaries)) {
        return {
          territory: territory.name,
          nation: territory.nation
        };
      }
    }

    return { territory: undefined, nation: undefined };
  }

  /**
   * Find nearby Indigenous communities
   */
  private async findNearbyCommunities(
    center: { lat: number; lng: number },
    maxRadius: number
  ): Promise<CommunityDistance[]> {
    const communities: CommunityDistance[] = [];
    const centerPoint = turf.point([center.lng, center.lat]);

    for (const [name, community] of this.communitiesCache) {
      const communityPoint = turf.point([community.location.lng, community.location.lat]);
      const distance = turf.distance(centerPoint, communityPoint, { units: 'kilometers' });

      if (distance <= maxRadius) {
        // Calculate travel time
        const travelTime = await this.estimateTravelTime(center, community.location, community.hasRoadAccess);

        communities.push({
          communityName: community.name,
          nation: community.nation,
          distance: Math.round(distance),
          travelTime,
          hasRoadAccess: community.hasRoadAccess
        });
      }
    }

    // Sort by distance
    communities.sort((a, b) => a.distance - b.distance);

    return communities.slice(0, 10); // Top 10 nearest
  }

  /**
   * Identify procurement zones
   */
  private async identifyProcurementZones(
    coordinates: { lat: number; lng: number }
  ): Promise<ProcurementZone[]> {
    const zones: ProcurementZone[] = [];
    
    // This would check against actual procurement zone data
    // For now, return placeholder zones
    
    zones.push({
      id: 'fed-ncr',
      name: 'National Capital Region',
      type: 'federal',
      boundaries: turf.polygon([[]]) as any,
      procurementVolume: 5000000000, // $5B
      preferredSuppliers: []
    });

    return zones;
  }

  /**
   * Find partnership opportunities
   */
  private async findPartnershipOpportunities(
    business: EnrichedBusiness,
    coordinates: { lat: number; lng: number },
    nearestCommunities: CommunityDistance[]
  ): Promise<GeographicOpportunity[]> {
    const opportunities: GeographicOpportunity[] = [];

    // Find complementary businesses nearby
    const nearbyBusinesses = await this.findNearbyBusinesses(coordinates, 100, {
      type: business.type === BusinessType.INDIGENOUS_OWNED 
        ? BusinessType.CANADIAN_GENERAL 
        : BusinessType.INDIGENOUS_OWNED
    });

    // Score opportunities based on industry match
    for (const nearby of nearbyBusinesses.slice(0, 20)) {
      const industryMatch = this.calculateIndustryMatch(
        business.industry || [],
        nearby.business.industry || []
      );

      if (industryMatch > 0.3) {
        // Determine opportunity type
        let opportunityType: 'supply_chain' | 'joint_venture' | 'subcontract';
        
        if (this.isSupplyChainMatch(business.industry, nearby.business.industry)) {
          opportunityType = 'supply_chain';
        } else if (industryMatch > 0.7) {
          opportunityType = 'joint_venture';
        } else {
          opportunityType = 'subcontract';
        }

        const score = this.calculateOpportunityScore(
          industryMatch,
          nearby.distance,
          business,
          nearby.business
        );

        opportunities.push({
          type: opportunityType,
          partner: nearby.business.name,
          distance: nearby.distance,
          industryMatch,
          score
        });
      }
    }

    // Sort by score
    opportunities.sort((a, b) => b.score - a.score);

    return opportunities.slice(0, 10); // Top 10 opportunities
  }

  /**
   * Load geographic data
   */
  private async loadGeographicData(): Promise<void> {
    try {
      // Load traditional territories
      const territories = await this.loadTerritories();
      for (const territory of territories) {
        this.territoriesCache.set(territory.name, territory);
      }

      // Load Indigenous communities
      const communities = await this.loadCommunities();
      for (const community of communities) {
        this.communitiesCache.set(community.name, community);
      }

      this.logger.info('Geographic data loaded', {
        territories: this.territoriesCache.size,
        communities: this.communitiesCache.size
      });

    } catch (error) {
      this.logger.error('Failed to load geographic data:', error);
    }
  }

  /**
   * Helper methods
   */
  private async loadTerritories(): Promise<TerritoryData[]> {
    // This would load from a GeoJSON file or database
    // For now, return sample data
    return [
      {
        name: 'Treaty 1',
        nation: 'Anishinaabe and Dakota',
        boundaries: turf.polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]) as any,
        population: 50000,
        languages: ['Ojibwe', 'Dakota', 'English'],
        economicActivities: ['Agriculture', 'Manufacturing', 'Services']
      }
    ];
  }

  private async loadCommunities(): Promise<CommunityData[]> {
    // This would load from a database
    // For now, return sample data
    return [
      {
        name: 'Peguis First Nation',
        nation: 'Ojibway',
        location: { lat: 52.5, lng: -97.5 },
        population: 10000,
        hasRoadAccess: true,
        nearestUrbanCenter: 'Winnipeg',
        distanceToUrbanCenter: 190,
        industries: ['Agriculture', 'Construction', 'Retail']
      }
    ];
  }

  private async estimateTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    hasRoadAccess: boolean
  ): Promise<number> {
    const distance = turf.distance(
      turf.point([origin.lng, origin.lat]),
      turf.point([destination.lng, destination.lat]),
      { units: 'kilometers' }
    );

    // Estimate based on transportation mode
    if (hasRoadAccess) {
      return Math.round(distance / 80 * 60); // 80 km/h average
    } else {
      return Math.round(distance / 200 * 60 + 120); // Flight + ground transport
    }
  }

  private calculateIndustryMatch(industries1: string[], industries2: string[]): number {
    if (industries1.length === 0 || industries2.length === 0) return 0;

    const set1 = new Set(industries1.map(i => i.toLowerCase()));
    const set2 = new Set(industries2.map(i => i.toLowerCase()));

    // Direct matches
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    if (intersection.size > 0) {
      return intersection.size / Math.min(set1.size, set2.size);
    }

    // Check for complementary industries
    const complementaryPairs = [
      ['construction', 'engineering'],
      ['manufacturing', 'wholesale'],
      ['agriculture', 'food processing'],
      ['mining', 'transportation'],
      ['forestry', 'lumber']
    ];

    for (const [ind1, ind2] of complementaryPairs) {
      if ((set1.has(ind1) && set2.has(ind2)) || (set1.has(ind2) && set2.has(ind1))) {
        return 0.6;
      }
    }

    return 0;
  }

  private isSupplyChainMatch(industries1?: string[], industries2?: string[]): boolean {
    if (!industries1 || !industries2) return false;

    const supplyChainPairs = [
      ['raw materials', 'manufacturing'],
      ['agriculture', 'food processing'],
      ['forestry', 'construction'],
      ['mining', 'metal fabrication'],
      ['manufacturing', 'wholesale'],
      ['wholesale', 'retail']
    ];

    const set1 = new Set(industries1.map(i => i.toLowerCase()));
    const set2 = new Set(industries2.map(i => i.toLowerCase()));

    for (const [supplier, customer] of supplyChainPairs) {
      if (set1.has(supplier) && set2.has(customer)) return true;
      if (set2.has(supplier) && set1.has(customer)) return true;
    }

    return false;
  }

  private calculateOpportunityScore(
    industryMatch: number,
    distance: number,
    business1: EnrichedBusiness,
    business2: EnrichedBusiness
  ): number {
    let score = industryMatch * 40; // Industry match weight: 40%

    // Distance factor (closer is better)
    if (distance < 50) score += 30;
    else if (distance < 100) score += 20;
    else if (distance < 200) score += 10;

    // Business size compatibility
    if (business1.financialInfo && business2.financialInfo) {
      const size1 = business1.financialInfo.employeeCount || 0;
      const size2 = business2.financialInfo.employeeCount || 0;
      
      if (Math.abs(size1 - size2) < 50) score += 10;
    }

    // Certification bonus
    if (business1.certifications?.length && business2.certifications?.length) {
      score += 10;
    }

    // Indigenous partnership bonus
    if (business1.type === BusinessType.INDIGENOUS_OWNED || 
        business2.type === BusinessType.INDIGENOUS_OWNED) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateWeightedCentroid(
    points: Array<{ lat: number; lng: number; weight: number }>
  ): { lat: number; lng: number } {
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;

    for (const point of points) {
      weightedLat += point.lat * point.weight;
      weightedLng += point.lng * point.weight;
      totalWeight += point.weight;
    }

    return {
      lat: weightedLat / totalWeight,
      lng: weightedLng / totalWeight
    };
  }

  private calculateAverageDistance(
    center: { lat: number; lng: number },
    points: Array<{ lat: number; lng: number }>
  ): number {
    const centerPoint = turf.point([center.lng, center.lat]);
    let totalDistance = 0;

    for (const point of points) {
      const p = turf.point([point.lng, point.lat]);
      totalDistance += turf.distance(centerPoint, p, { units: 'kilometers' });
    }

    return totalDistance / points.length;
  }

  private async getAllBusinessesWithLocation(): Promise<any[]> {
    // This would fetch from database
    return [];
  }

  private async getBusinessCoordinates(businessId: string): Promise<{ lat: number; lng: number } | null> {
    const business = await this.redis.get(`business:${businessId}`);
    if (!business) return null;

    const data = JSON.parse(business);
    if (data.coordinates) return data.coordinates;
    
    if (data.address) {
      return await this.geocodeAddress(data.address);
    }

    return null;
  }

  private async findNearestCity(
    location: { lat: number; lng: number }
  ): Promise<{ name: string; hasAirport: boolean }> {
    // This would use a cities database
    return { name: 'Unknown City', hasAirport: false };
  }

  private async findMajorCitiesNearby(
    center: { lat: number; lng: number },
    radiusKm: number
  ): Promise<Array<{ name: string; location: { lat: number; lng: number }; hasAirport: boolean }>> {
    // This would query a cities database
    return [];
  }

  private async calculateOptimalRoute(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number; demand: number }>
  ): Promise<any> {
    // This would use routing APIs
    return this.calculateSimpleRoute(origin, destinations);
  }

  private calculateSimpleRoute(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number; demand: number }>
  ): any {
    // Simple nearest neighbor algorithm
    const route = [origin];
    const remaining = [...destinations];
    let current = origin;
    let totalDistance = 0;

    while (remaining.length > 0) {
      let nearest = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const dest = remaining[i];
        const distance = turf.distance(
          turf.point([current.lng, current.lat]),
          turf.point([dest.lng, dest.lat]),
          { units: 'kilometers' }
        );

        if (distance < nearestDistance) {
          nearest = dest;
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      if (nearest) {
        route.push(nearest);
        totalDistance += nearestDistance;
        current = nearest;
        remaining.splice(nearestIndex, 1);
      }
    }

    // Return to origin
    totalDistance += turf.distance(
      turf.point([current.lng, current.lat]),
      turf.point([origin.lng, origin.lat]),
      { units: 'kilometers' }
    );
    route.push(origin);

    return { route, totalDistance };
  }

  private async geocodeWithGoogle(address: BusinessAddress): Promise<{ lat: number; lng: number } | null> {
    // Google Maps Geocoding implementation
    return null;
  }

  private async geocodeWithMapbox(address: BusinessAddress): Promise<{ lat: number; lng: number } | null> {
    // Mapbox Geocoding implementation
    return null;
  }

  private getPostalCodeData(postalCode: string): { coordinates: { lat: number; lng: number } } | null {
    // This would use a postal code database
    return null;
  }

  private async getEconomicRegion(coordinates: { lat: number; lng: number }): Promise<string> {
    // This would determine the economic region
    return 'Unknown Region';
  }

  private async cacheIntelligence(businessId: string, intelligence: GeographicIntelligence): Promise<void> {
    const key = `geo:intelligence:${businessId}`;
    await this.redis.setex(
      key,
      3600 * this.config.cacheExpiry,
      JSON.stringify(intelligence)
    );
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.territoriesCache.clear();
    this.communitiesCache.clear();
  }
}