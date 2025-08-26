import { PrismaClient, Elder, ElderApproval, ApprovalStatus, TeachingType } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { EventEmitter } from 'events';
import crypto from 'crypto';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

// Validation schemas
const ElderCreateSchema = z.object({
  nationId: z.string().uuid().optional(),
  bandId: z.string().uuid().optional(),
  name: z.string().min(1),
  indigenousName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  specializations: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  biography: z.string().optional(),
  isPublic: z.boolean().default(false),
  approvalAuthority: z.boolean().default(false)
});

const ApprovalRequestSchema = z.object({
  elderId: z.string().uuid(),
  requestType: z.string(),
  requestId: z.string(),
  requestDetails: z.any(),
  culturalConsiderations: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
});

const TeachingSchema = z.object({
  elderId: z.string().uuid(),
  title: z.string(),
  indigenousTitle: z.string().optional(),
  type: z.nativeEnum(TeachingType),
  content: z.string(),
  language: z.string().optional(),
  audioFile: z.string().url().optional(),
  videoFile: z.string().url().optional(),
  relatedStories: z.any().optional(),
  culturalContext: z.string().optional(),
  appropriateSharing: z.string().optional(),
  seasonalRelevance: z.string().optional(),
  ageAppropriate: z.string().optional(),
  isPublic: z.boolean().default(false)
});

export class ElderService {
  private static readonly CACHE_PREFIX = 'elder:';
  private static readonly APPROVAL_CACHE_PREFIX = 'elder:approval:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Register a new elder
   */
  static async registerElder(data: z.infer<typeof ElderCreateSchema>) {
    const validated = ElderCreateSchema.parse(data);

    if (!validated.nationId && !validated.bandId) {
      throw new Error('Elder must be associated with either a nation or band');
    }

    const elder = await prisma.elder.create({
      data: validated,
      include: {
        nation: true
      }
    });

    // Cache elder data
    await this.cacheElder(elder);

    // Emit event for notifications
    eventEmitter.emit('elder:registered', elder);

    return elder;
  }

  /**
   * Get elder by ID
   */
  static async getElderById(id: string) {
    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const elder = await prisma.elder.findUnique({
      where: { id },
      include: {
        nation: true,
        approvals: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        teachings: {
          where: {
            isPublic: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (elder) {
      await this.cacheElder(elder);
    }

    return elder;
  }

  /**
   * List elders with filtering
   */
  static async listElders(filters: {
    nationId?: string;
    bandId?: string;
    specialization?: string;
    language?: string;
    hasApprovalAuthority?: boolean;
    isPublic?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true
    };

    if (filters.nationId) {
      where.nationId = filters.nationId;
    }
    if (filters.bandId) {
      where.OR = [
        { nation: { bands: { some: { id: filters.bandId } } } }
      ];
    }
    if (filters.specialization) {
      where.specializations = {
        has: filters.specialization
      };
    }
    if (filters.language) {
      where.languages = {
        has: filters.language
      };
    }
    if (filters.hasApprovalAuthority !== undefined) {
      where.approvalAuthority = filters.hasApprovalAuthority;
    }
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { indigenousName: { contains: filters.search, mode: 'insensitive' } },
        { role: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [elders, total] = await Promise.all([
      prisma.elder.findMany({
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
              approvals: true,
              teachings: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.elder.count({ where })
    ]);

    return {
      elders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Request elder approval for cultural matters
   */
  static async requestApproval(data: z.infer<typeof ApprovalRequestSchema>) {
    const validated = ApprovalRequestSchema.parse(data);

    // Check if elder has approval authority
    const elder = await prisma.elder.findUnique({
      where: { id: validated.elderId },
      select: {
        approvalAuthority: true,
        name: true,
        email: true
      }
    });

    if (!elder) {
      throw new Error('Elder not found');
    }

    if (!elder.approvalAuthority) {
      throw new Error('This elder does not have approval authority');
    }

    // Create approval request
    const approval = await prisma.elderApproval.create({
      data: {
        elderId: validated.elderId,
        requestType: validated.requestType,
        requestId: validated.requestId,
        requestDetails: validated.requestDetails,
        culturalConsiderations: validated.culturalConsiderations,
        status: 'PENDING'
      }
    });

    // Cache the approval request
    await redis.setex(
      `${this.APPROVAL_CACHE_PREFIX}${approval.id}`,
      86400, // 24 hours
      JSON.stringify(approval)
    );

    // Send notification to elder if urgent
    if (validated.urgency === 'URGENT' || validated.urgency === 'HIGH') {
      eventEmitter.emit('elder:urgent:approval', {
        elder,
        approval,
        urgency: validated.urgency
      });
    }

    return approval;
  }

  /**
   * Process elder approval
   */
  static async processApproval(
    approvalId: string,
    elderId: string,
    decision: {
      status: ApprovalStatus;
      decision?: string;
      conditions?: string[];
      notes?: string;
      expiryDate?: string;
    }
  ) {
    // Verify elder owns this approval
    const approval = await prisma.elderApproval.findFirst({
      where: {
        id: approvalId,
        elderId
      }
    });

    if (!approval) {
      throw new Error('Approval request not found or unauthorized');
    }

    if (approval.status !== 'PENDING') {
      throw new Error('Approval has already been processed');
    }

    // Update approval
    const updated = await prisma.elderApproval.update({
      where: { id: approvalId },
      data: {
        status: decision.status,
        decision: decision.decision,
        conditions: decision.conditions || [],
        notes: decision.notes,
        approvalDate: new Date(),
        expiryDate: decision.expiryDate ? new Date(decision.expiryDate) : undefined
      }
    });

    // Invalidate cache
    await redis.del(`${this.APPROVAL_CACHE_PREFIX}${approvalId}`);

    // Emit event for dependent services
    eventEmitter.emit('elder:approval:processed', {
      approval: updated,
      originalRequest: approval.requestDetails
    });

    return updated;
  }

  /**
   * Get pending approvals for an elder
   */
  static async getPendingApprovals(elderId: string) {
    const approvals = await prisma.elderApproval.findMany({
      where: {
        elderId,
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Enrich with urgency based on age
    return approvals.map(approval => {
      const ageInDays = Math.floor((Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      let urgency = 'NORMAL';
      if (ageInDays > 7) urgency = 'HIGH';
      if (ageInDays > 14) urgency = 'URGENT';

      return {
        ...approval,
        ageInDays,
        urgency
      };
    });
  }

  /**
   * Record elder teaching
   */
  static async recordTeaching(data: z.infer<typeof TeachingSchema>) {
    const validated = TeachingSchema.parse(data);

    // Verify elder exists
    const elder = await prisma.elder.findUnique({
      where: { id: validated.elderId },
      select: {
        id: true,
        name: true,
        languages: true
      }
    });

    if (!elder) {
      throw new Error('Elder not found');
    }

    // Create teaching record
    const teaching = await prisma.teaching.create({
      data: validated,
      include: {
        elder: {
          select: {
            name: true,
            indigenousName: true
          }
        }
      }
    });

    // Index for search if public
    if (teaching.isPublic) {
      await this.indexTeaching(teaching);
    }

    return teaching;
  }

  /**
   * Get elder teachings
   */
  static async getElderTeachings(elderId: string, filters: {
    type?: TeachingType;
    language?: string;
    isPublic?: boolean;
  }) {
    const where: any = {
      elderId
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.language) {
      where.language = filters.language;
    }
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    const teachings = await prisma.teaching.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return teachings;
  }

  /**
   * Get cultural knowledge by topic
   */
  static async getCulturalKnowledge(topic: string, options: {
    nationId?: string;
    language?: string;
    teachingType?: TeachingType;
  }) {
    const where: any = {
      isPublic: true,
      OR: [
        { title: { contains: topic, mode: 'insensitive' } },
        { indigenousTitle: { contains: topic, mode: 'insensitive' } },
        { content: { contains: topic, mode: 'insensitive' } },
        { culturalContext: { contains: topic, mode: 'insensitive' } }
      ]
    };

    if (options.nationId) {
      where.elder = {
        nationId: options.nationId
      };
    }
    if (options.language) {
      where.language = options.language;
    }
    if (options.teachingType) {
      where.type = options.teachingType;
    }

    const teachings = await prisma.teaching.findMany({
      where,
      include: {
        elder: {
          select: {
            name: true,
            indigenousName: true,
            nation: {
              select: {
                name: true,
                indigenousName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return teachings;
  }

  /**
   * Get elder council for decision making
   */
  static async getElderCouncil(criteria: {
    nationId?: string;
    bandId?: string;
    requiredSpecializations?: string[];
    minimumElders?: number;
  }) {
    const where: any = {
      isActive: true,
      approvalAuthority: true
    };

    if (criteria.nationId) {
      where.nationId = criteria.nationId;
    }
    if (criteria.bandId) {
      where.OR = [
        { nation: { bands: { some: { id: criteria.bandId } } } }
      ];
    }
    if (criteria.requiredSpecializations && criteria.requiredSpecializations.length > 0) {
      where.specializations = {
        hasEvery: criteria.requiredSpecializations
      };
    }

    const elders = await prisma.elder.findMany({
      where,
      include: {
        nation: true,
        _count: {
          select: {
            approvals: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Respect seniority
      }
    });

    const minimumRequired = criteria.minimumElders || 3;
    if (elders.length < minimumRequired) {
      throw new Error(`Insufficient elders for council. Required: ${minimumRequired}, Found: ${elders.length}`);
    }

    // Create council session
    const councilId = crypto.randomUUID();
    const council = {
      id: councilId,
      elders: elders.map(e => ({
        id: e.id,
        name: e.name,
        indigenousName: e.indigenousName,
        specializations: e.specializations,
        approvalCount: e._count.approvals
      })),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    // Cache council session
    await redis.setex(
      `council:${councilId}`,
      604800, // 7 days
      JSON.stringify(council)
    );

    return council;
  }

  /**
   * Get elder approval statistics
   */
  static async getElderStatistics(elderId: string) {
    const [
      elder,
      approvalStats,
      teachingStats,
      recentActivity
    ] = await Promise.all([
      prisma.elder.findUnique({
        where: { id: elderId }
      }),
      prisma.elderApproval.groupBy({
        by: ['status'],
        where: { elderId },
        _count: {
          _all: true
        }
      }),
      prisma.teaching.groupBy({
        by: ['type'],
        where: { elderId },
        _count: {
          _all: true
        }
      }),
      prisma.elderApproval.findMany({
        where: { elderId },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    if (!elder) {
      throw new Error('Elder not found');
    }

    const totalApprovals = approvalStats.reduce((sum, stat) => sum + stat._count._all, 0);
    const approvedCount = approvalStats.find(s => s.status === 'APPROVED')?._count._all || 0;
    const approvalRate = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0;

    return {
      elder,
      statistics: {
        totalApprovals,
        approvalRate,
        pendingApprovals: approvalStats.find(s => s.status === 'PENDING')?._count._all || 0,
        totalTeachings: teachingStats.reduce((sum, stat) => sum + stat._count._all, 0),
        teachingsByType: teachingStats,
        languagesSpoken: elder.languages.length,
        specializations: elder.specializations.length
      },
      recentActivity
    };
  }

  /**
   * Cache elder data
   */
  private static async cacheElder(elder: any) {
    await redis.setex(
      `${this.CACHE_PREFIX}${elder.id}`,
      this.CACHE_TTL,
      JSON.stringify(elder)
    );
  }

  /**
   * Index teaching for search
   */
  private static async indexTeaching(teaching: any) {
    // In production, this would index to Elasticsearch
    console.log('Indexing teaching:', teaching.id);
  }
}