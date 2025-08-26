import { PrismaClient, Nation, Prisma } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import * as turf from '@turf/turf';
import { Feature, Polygon, MultiPolygon } from 'geojson';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Validation schemas
const NationCreateSchema = z.object({
  name: z.string().min(1),
  indigenousName: z.string().optional(),
  confederacy: z.string().optional(),
  region: z.string(),
  province: z.string(),
  country: z.string().default('Canada'),
  population: z.number().optional(),
  languageFamily: z.string().optional(),
  primaryLanguages: z.array(z.string()).default([]),
  treatyNumber: z.string().optional(),
  treatyDate: z.string().datetime().optional(),
  traditionalTerritory: z.any().optional(),
  currentReserves: z.any().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  culturalProtocols: z.any().optional()
});

export class NationService {
  private static readonly CACHE_PREFIX = 'nation:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Create a new nation
   */
  static async createNation(data: z.infer<typeof NationCreateSchema>) {
    const validated = NationCreateSchema.parse(data);
    
    // Validate GeoJSON if provided
    if (validated.traditionalTerritory) {
      this.validateGeoJSON(validated.traditionalTerritory);
    }
    if (validated.currentReserves) {
      this.validateGeoJSON(validated.currentReserves);
    }

    const nation = await prisma.nation.create({
      data: {
        ...validated,
        treatyDate: validated.treatyDate ? new Date(validated.treatyDate) : undefined
      },
      include: {
        bands: true,
        elders: true,
        languages: true
      }
    });

    // Cache the nation
    await this.cacheNation(nation);

    // Index for search
    await this.indexNation(nation);

    return nation;
  }

  /**
   * Get nation by ID
   */
  static async getNationById(id: string) {
    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const nation = await prisma.nation.findUnique({
      where: { id },
      include: {
        bands: {
          include: {
            councilMembers: {
              where: { isActive: true }
            }
          }
        },
        elders: {
          where: { isActive: true }
        },
        languages: true,
        treaties: true,
        landAcknowledgments: true,
        culturalEvents: {
          where: {
            startDate: {
              gte: new Date()
            }
          },
          orderBy: {
            startDate: 'asc'
          },
          take: 5
        }
      }
    });

    if (nation) {
      await this.cacheNation(nation);
    }

    return nation;
  }

  /**
   * List all nations with filtering
   */
  static async listNations(filters: {
    region?: string;
    province?: string;
    treatyNumber?: string;
    hasLanguagePrograms?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NationWhereInput = {
      isActive: true
    };

    if (filters.region) {
      where.region = filters.region;
    }
    if (filters.province) {
      where.province = filters.province;
    }
    if (filters.treatyNumber) {
      where.treatyNumber = filters.treatyNumber;
    }
    if (filters.hasLanguagePrograms) {
      where.languages = {
        some: {
          revitalizationPrograms: {
            not: Prisma.JsonNull
          }
        }
      };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { indigenousName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [nations, total] = await Promise.all([
      prisma.nation.findMany({
        where,
        skip,
        take: limit,
        include: {
          bands: {
            select: {
              id: true,
              name: true,
              bandNumber: true,
              population: true
            }
          },
          _count: {
            select: {
              bands: true,
              elders: true,
              languages: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.nation.count({ where })
    ]);

    return {
      nations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get nations by geographic point
   */
  static async getNationsByLocation(lat: number, lng: number, radiusKm: number = 100) {
    const point = turf.point([lng, lat]);
    const buffer = turf.buffer(point, radiusKm, { units: 'kilometers' });

    const nations = await prisma.nation.findMany({
      where: {
        isActive: true
      },
      include: {
        bands: {
          where: {
            AND: [
              { latitude: { not: null } },
              { longitude: { not: null } }
            ]
          }
        }
      }
    });

    // Filter nations within radius
    const nearbyNations = nations.filter(nation => {
      // Check if any bands are within radius
      const bandsInRadius = nation.bands.filter(band => {
        if (!band.latitude || !band.longitude) return false;
        const bandPoint = turf.point([band.longitude, band.latitude]);
        return turf.booleanPointInPolygon(bandPoint, buffer);
      });

      // Check traditional territory overlap
      if (nation.traditionalTerritory) {
        try {
          const territory = nation.traditionalTerritory as any;
          if (territory.type === 'Feature' || territory.type === 'FeatureCollection') {
            return turf.booleanOverlap(territory, buffer) || 
                   turf.booleanWithin(point, territory);
          }
        } catch (e) {
          console.error('Error checking territory overlap:', e);
        }
      }

      return bandsInRadius.length > 0;
    });

    // Calculate distances
    const nationsWithDistance = nearbyNations.map(nation => {
      const distances = nation.bands
        .filter(band => band.latitude && band.longitude)
        .map(band => {
          const bandPoint = turf.point([band.longitude!, band.latitude!]);
          return turf.distance(point, bandPoint, { units: 'kilometers' });
        });

      const nearestDistance = distances.length > 0 ? Math.min(...distances) : null;

      return {
        ...nation,
        distance: nearestDistance
      };
    });

    // Sort by distance
    nationsWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return nationsWithDistance;
  }

  /**
   * Get nation statistics
   */
  static async getNationStatistics(nationId: string) {
    const [
      nation,
      totalBusinesses,
      activeProjects,
      upcomingEvents,
      languageSpeakers
    ] = await Promise.all([
      prisma.nation.findUnique({
        where: { id: nationId },
        include: {
          _count: {
            select: {
              bands: true,
              elders: true,
              languages: true,
              culturalEvents: true
            }
          }
        }
      }),
      prisma.businessRegistration.count({
        where: {
          band: {
            nationId
          },
          isActive: true
        }
      }),
      prisma.communityProject.count({
        where: {
          band: {
            nationId
          },
          status: 'IN_PROGRESS'
        }
      }),
      prisma.culturalEvent.count({
        where: {
          nationId,
          startDate: {
            gte: new Date()
          }
        }
      }),
      prisma.language.aggregate({
        where: {
          nationId
        },
        _sum: {
          numberOfSpeakers: true,
          fluentSpeakers: true
        }
      })
    ]);

    if (!nation) {
      throw new Error('Nation not found');
    }

    // Calculate economic metrics
    const economicMetrics = await prisma.communityMetric.groupBy({
      by: ['metricType'],
      where: {
        band: {
          nationId
        },
        metricType: 'ECONOMIC',
        year: new Date().getFullYear()
      },
      _sum: {
        value: true
      }
    });

    return {
      nation,
      statistics: {
        bands: nation._count.bands,
        elders: nation._count.elders,
        languages: nation._count.languages,
        culturalEvents: nation._count.culturalEvents,
        businesses: totalBusinesses,
        activeProjects,
        upcomingEvents,
        totalSpeakers: languageSpeakers._sum.numberOfSpeakers || 0,
        fluentSpeakers: languageSpeakers._sum.fluentSpeakers || 0,
        economicActivity: economicMetrics.reduce((sum, metric) => 
          sum + (metric._sum.value || 0), 0
        )
      }
    };
  }

  /**
   * Update nation information
   */
  static async updateNation(id: string, data: Partial<z.infer<typeof NationCreateSchema>>) {
    const nation = await prisma.nation.update({
      where: { id },
      data: {
        ...data,
        treatyDate: data.treatyDate ? new Date(data.treatyDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        bands: true,
        elders: true,
        languages: true
      }
    });

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${id}`);
    
    // Re-index
    await this.indexNation(nation);

    return nation;
  }

  /**
   * Get treaty information for a nation
   */
  static async getNationTreaties(nationId: string) {
    const treaties = await prisma.treaty.findMany({
      where: {
        nationId,
        isActive: true
      },
      orderBy: {
        signatureDate: 'desc'
      }
    });

    return treaties.map(treaty => ({
      ...treaty,
      age: this.calculateTreatyAge(treaty.signatureDate),
      modernRelevance: this.assessTreatyRelevance(treaty)
    }));
  }

  /**
   * Get cultural protocols for a nation
   */
  static async getNationProtocols(nationId: string) {
    const nation = await prisma.nation.findUnique({
      where: { id: nationId },
      select: {
        culturalProtocols: true,
        bands: {
          select: {
            culturalProtocols: {
              where: {
                isPublic: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!nation) {
      throw new Error('Nation not found');
    }

    // Combine nation-level and band-level protocols
    const protocols = {
      nationLevel: nation.culturalProtocols || {},
      bandProtocols: nation.bands.flatMap(band => band.culturalProtocols)
    };

    return protocols;
  }

  /**
   * Cache nation data
   */
  private static async cacheNation(nation: any) {
    await redis.setex(
      `${this.CACHE_PREFIX}${nation.id}`,
      this.CACHE_TTL,
      JSON.stringify(nation)
    );
  }

  /**
   * Index nation for search
   */
  private static async indexNation(nation: Nation) {
    // In production, this would index to Elasticsearch
    console.log('Indexing nation:', nation.id);
  }

  /**
   * Validate GeoJSON data
   */
  private static validateGeoJSON(geojson: any) {
    if (!geojson.type) {
      throw new Error('Invalid GeoJSON: missing type');
    }
    if (!['Feature', 'FeatureCollection', 'Polygon', 'MultiPolygon'].includes(geojson.type)) {
      throw new Error('Invalid GeoJSON type');
    }
  }

  /**
   * Calculate treaty age
   */
  private static calculateTreatyAge(signatureDate: Date): string {
    const years = Math.floor((Date.now() - signatureDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (years < 50) return 'Modern';
    if (years < 100) return 'Historical';
    if (years < 150) return 'Pre-Confederation';
    return 'Ancient';
  }

  /**
   * Assess treaty relevance
   */
  private static assessTreatyRelevance(treaty: any): string {
    // Simplified assessment - in production would be more sophisticated
    if (treaty.modernInterpretation) return 'High';
    const age = Date.now() - treaty.signatureDate.getTime();
    const yearsSince = age / (365.25 * 24 * 60 * 60 * 1000);
    return yearsSince < 50 ? 'High' : yearsSince < 100 ? 'Medium' : 'Historical';
  }
}