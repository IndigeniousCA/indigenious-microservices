import { PrismaClient, Band, Prisma, GovernanceType } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import * as turf from '@turf/turf';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

// Validation schemas
const BandCreateSchema = z.object({
  nationId: z.string().uuid(),
  bandNumber: z.string().min(1),
  name: z.string().min(1),
  indigenousName: z.string().optional(),
  chiefName: z.string().optional(),
  chiefEmail: z.string().email().optional(),
  chiefPhone: z.string().optional(),
  councilSize: z.number().min(1).optional(),
  administratorName: z.string().optional(),
  administratorEmail: z.string().email().optional(),
  administratorPhone: z.string().optional(),
  population: z.number().min(0).optional(),
  onReservePopulation: z.number().min(0).optional(),
  offReservePopulation: z.number().min(0).optional(),
  economicDevelopmentOfficer: z.string().optional(),
  edoEmail: z.string().email().optional(),
  edoPhone: z.string().optional(),
  mainOfficeAddress: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  reserveBoundaries: z.any().optional(),
  timezone: z.string().optional(),
  website: z.string().url().optional(),
  socialMedia: z.any().optional(),
  governanceType: z.nativeEnum(GovernanceType).default('ELECTED'),
  electionCycle: z.number().min(1).max(10).optional(),
  lastElection: z.string().datetime().optional(),
  nextElection: z.string().datetime().optional(),
  fiscalYearEnd: z.string().optional(),
  annualBudget: z.number().min(0).optional(),
  procurementBudget: z.number().min(0).optional(),
  preferredVendorTypes: z.array(z.string()).default([]),
  certificationRequired: z.array(z.string()).default([])
});

const ProcurementPreferenceSchema = z.object({
  bandId: z.string().uuid(),
  category: z.string(),
  weightings: z.object({
    price: z.number().min(0).max(100),
    indigenous: z.number().min(0).max(100),
    climate: z.number().min(0).max(100),
    local: z.number().min(0).max(100),
    quality: z.number().min(0).max(100),
    social: z.number().min(0).max(100)
  }),
  mandatoryRequirements: z.array(z.string()),
  preferredCertifications: z.array(z.string()),
  minimumIndigenousContent: z.number().min(0).max(100).optional(),
  localPreference: z.number().min(0).optional(),
  environmentalStandards: z.array(z.string()),
  socialImpactFactors: z.array(z.string()),
  excludedVendors: z.array(z.string()).default([]),
  notes: z.string().optional(),
  effectiveDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  approvedBy: z.string().optional()
});

export class BandService {
  private static readonly CACHE_PREFIX = 'band:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Create a new band
   */
  static async createBand(data: z.infer<typeof BandCreateSchema>) {
    const validated = BandCreateSchema.parse(data);
    
    // Check if band number already exists
    const existing = await prisma.band.findUnique({
      where: { bandNumber: validated.bandNumber }
    });

    if (existing) {
      throw new Error(`Band number ${validated.bandNumber} already exists`);
    }

    // Validate reserve boundaries if provided
    if (validated.reserveBoundaries) {
      this.validateGeoJSON(validated.reserveBoundaries);
    }

    const band = await prisma.band.create({
      data: {
        ...validated,
        lastElection: validated.lastElection ? new Date(validated.lastElection) : undefined,
        nextElection: validated.nextElection ? new Date(validated.nextElection) : undefined
      },
      include: {
        nation: true,
        councilMembers: true,
        departments: true
      }
    });

    // Cache the band
    await this.cacheBand(band);

    // Emit event for other services
    eventEmitter.emit('band:created', band);

    return band;
  }

  /**
   * Get band by ID or band number
   */
  static async getBand(identifier: string) {
    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${identifier}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const band = await prisma.band.findFirst({
      where: {
        OR: [
          { id: identifier },
          { bandNumber: identifier }
        ]
      },
      include: {
        nation: true,
        councilMembers: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        },
        departments: {
          where: { isActive: true }
        },
        procurementPreferences: {
          where: {
            isActive: true,
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: new Date() } }
            ]
          }
        },
        communityProjects: {
          where: {
            status: {
              in: ['PLANNING', 'APPROVED', 'TENDER', 'IN_PROGRESS']
            }
          },
          orderBy: { priority: 'asc' },
          take: 5
        },
        businessRegistry: {
          where: { isActive: true },
          select: {
            id: true,
            businessName: true,
            businessType: true,
            indigenousOwnership: true,
            certifications: true
          }
        },
        _count: {
          select: {
            councilMembers: true,
            departments: true,
            communityProjects: true,
            businessRegistry: true
          }
        }
      }
    });

    if (band) {
      await this.cacheBand(band);
    }

    return band;
  }

  /**
   * List bands with filtering
   */
  static async listBands(filters: {
    nationId?: string;
    province?: string;
    governanceType?: GovernanceType;
    hasEDO?: boolean;
    minPopulation?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BandWhereInput = {
      isActive: true
    };

    if (filters.nationId) {
      where.nationId = filters.nationId;
    }
    if (filters.province) {
      where.nation = {
        province: filters.province
      };
    }
    if (filters.governanceType) {
      where.governanceType = filters.governanceType;
    }
    if (filters.hasEDO) {
      where.economicDevelopmentOfficer = {
        not: null
      };
    }
    if (filters.minPopulation) {
      where.population = {
        gte: filters.minPopulation
      };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { indigenousName: { contains: filters.search, mode: 'insensitive' } },
        { bandNumber: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [bands, total] = await Promise.all([
      prisma.band.findMany({
        where,
        skip,
        take: limit,
        include: {
          nation: {
            select: {
              id: true,
              name: true,
              indigenousName: true
            }
          },
          _count: {
            select: {
              councilMembers: true,
              departments: true,
              communityProjects: true,
              businessRegistry: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.band.count({ where })
    ]);

    return {
      bands,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Set procurement preferences for a band
   */
  static async setProcurementPreferences(data: z.infer<typeof ProcurementPreferenceSchema>) {
    const validated = ProcurementPreferenceSchema.parse(data);

    // Validate weightings sum to 100
    const weightSum = Object.values(validated.weightings).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) {
      throw new Error('Procurement weightings must sum to 100%');
    }

    // Deactivate existing preferences for this category
    await prisma.procurementPreference.updateMany({
      where: {
        bandId: validated.bandId,
        category: validated.category,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Create new preference
    const preference = await prisma.procurementPreference.create({
      data: {
        ...validated,
        effectiveDate: new Date(validated.effectiveDate),
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : undefined
      }
    });

    // Emit event for RFQ service
    eventEmitter.emit('procurement:preferences:updated', {
      bandId: validated.bandId,
      category: validated.category,
      preference
    });

    return preference;
  }

  /**
   * Get band procurement preferences
   */
  static async getBandProcurementPreferences(bandId: string) {
    const preferences = await prisma.procurementPreference.findMany({
      where: {
        bandId,
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    });

    // Group by category
    const grouped = preferences.reduce((acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = pref;
      }
      return acc;
    }, {} as Record<string, typeof preferences[0]>);

    return grouped;
  }

  /**
   * Get band statistics and metrics
   */
  static async getBandStatistics(bandId: string) {
    const currentYear = new Date().getFullYear();

    const [
      band,
      projects,
      businesses,
      metrics,
      recentDecisions
    ] = await Promise.all([
      prisma.band.findUnique({
        where: { id: bandId },
        include: {
          _count: {
            select: {
              councilMembers: true,
              departments: true,
              communityProjects: true,
              businessRegistry: true
            }
          }
        }
      }),
      prisma.communityProject.groupBy({
        by: ['status'],
        where: { bandId },
        _count: {
          _all: true
        },
        _sum: {
          budget: true
        }
      }),
      prisma.businessRegistration.aggregate({
        where: {
          bandId,
          isActive: true
        },
        _count: {
          _all: true
        },
        _sum: {
          indigenousOwnership: true,
          bandMemberEmployees: true
        },
        _avg: {
          indigenousOwnership: true
        }
      }),
      prisma.communityMetric.findMany({
        where: {
          bandId,
          year: currentYear
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      prisma.councilDecision.findMany({
        where: {
          councilMember: {
            bandId
          },
          isPublic: true
        },
        orderBy: {
          meetingDate: 'desc'
        },
        take: 5,
        include: {
          councilMember: {
            select: {
              name: true,
              position: true
            }
          }
        }
      })
    ]);

    if (!band) {
      throw new Error('Band not found');
    }

    // Calculate economic impact
    const totalProjectValue = projects.reduce((sum, p) => sum + (p._sum.budget || 0), 0);
    const activeProjects = projects.find(p => p.status === 'IN_PROGRESS')?._count._all || 0;
    const completedProjects = projects.find(p => p.status === 'COMPLETED')?._count._all || 0;

    return {
      band: {
        ...band,
        economicActivity: {
          totalProjectValue,
          activeProjects,
          completedProjects,
          registeredBusinesses: businesses._count._all,
          averageIndigenousOwnership: businesses._avg.indigenousOwnership || 0,
          totalEmployment: businesses._sum.bandMemberEmployees || 0
        }
      },
      metrics: this.categorizeMetrics(metrics),
      recentDecisions,
      procurementOpportunities: await this.getUpcomingOpportunities(bandId)
    };
  }

  /**
   * Create community project
   */
  static async createCommunityProject(bandId: string, projectData: any) {
    // Generate project number
    const projectCount = await prisma.communityProject.count({
      where: { bandId }
    });
    const projectNumber = `${bandId.substring(0, 8)}-${currentYear}-${String(projectCount + 1).padStart(4, '0')}`;

    const project = await prisma.communityProject.create({
      data: {
        ...projectData,
        bandId,
        projectNumber,
        status: 'PLANNING'
      }
    });

    // Emit event for notifications
    eventEmitter.emit('project:created', project);

    return project;
  }

  /**
   * Get band's community notifications
   */
  static async getBandNotifications(bandId: string, filters: {
    type?: string;
    priority?: string;
    active?: boolean;
  }) {
    const where: Prisma.CommunityNotificationWhereInput = {
      bandId
    };

    if (filters.type) {
      where.type = filters.type as any;
    }
    if (filters.priority) {
      where.priority = filters.priority as any;
    }
    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    const notifications = await prisma.communityNotification.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });

    return notifications;
  }

  /**
   * Register business with band
   */
  static async registerBusiness(bandId: string, businessData: {
    businessId: string;
    businessName: string;
    ownerName: string;
    businessType: string;
    registrationNumber?: string;
    indigenousOwnership: number;
    bandMemberEmployees?: number;
    communityBenefit?: string;
    certifications: string[];
  }) {
    // Check if business already registered
    const existing = await prisma.businessRegistration.findFirst({
      where: {
        bandId,
        businessId: businessData.businessId,
        isActive: true
      }
    });

    if (existing) {
      throw new Error('Business already registered with this band');
    }

    const registration = await prisma.businessRegistration.create({
      data: {
        ...businessData,
        bandId
      }
    });

    // Update band's business count
    await prisma.band.update({
      where: { id: bandId },
      data: {
        numberOfBusinesses: {
          increment: 1
        }
      }
    });

    return registration;
  }

  /**
   * Cache band data
   */
  private static async cacheBand(band: any) {
    await redis.setex(
      `${this.CACHE_PREFIX}${band.id}`,
      this.CACHE_TTL,
      JSON.stringify(band)
    );
    await redis.setex(
      `${this.CACHE_PREFIX}${band.bandNumber}`,
      this.CACHE_TTL,
      JSON.stringify(band)
    );
  }

  /**
   * Validate GeoJSON
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
   * Categorize metrics by type
   */
  private static categorizeMetrics(metrics: any[]) {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.metricType]) {
        acc[metric.metricType] = [];
      }
      acc[metric.metricType].push(metric);
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Get upcoming procurement opportunities
   */
  private static async getUpcomingOpportunities(bandId: string) {
    return prisma.communityProject.findMany({
      where: {
        bandId,
        status: {
          in: ['APPROVED', 'TENDER']
        },
        publicTender: true
      },
      orderBy: {
        expectedEndDate: 'asc'
      },
      take: 5
    });
  }
}

const currentYear = new Date().getFullYear();