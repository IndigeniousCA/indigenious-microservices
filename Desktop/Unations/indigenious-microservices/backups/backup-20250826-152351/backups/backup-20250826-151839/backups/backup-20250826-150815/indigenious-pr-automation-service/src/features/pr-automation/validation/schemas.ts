import { z } from 'zod';

// Safe string validation - no SQL injection or XSS
const safeString = z.string().regex(/^[a-zA-Z0-9\s\-_.,!?'"]+$/, 'Contains invalid characters');
const safeText = z.string().max(5000).transform(val => 
  val.replace(/[<>&'"]/g, char => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&#39;',
    '"': '&quot;'
  }[char] || char))
);

export const createOperationSchema = z.object({
  objective: safeString
    .min(10, 'Objective too short')
    .max(500, 'Objective too long'),
  type: z.enum(['grassroots', 'competitor_discredit', 'market_manipulation', 'perception_shift']),
  description: safeText.optional(),
  targetAudience: z.array(safeString).max(10).optional(),
  timeline: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  budget: z.number().min(0).max(1000000).optional()
});

export const createResponseRuleSchema = z.object({
  name: safeString.min(3).max(100),
  enabled: z.boolean(),
  triggers: z.object({
    keywords: z.array(safeString.max(50)).max(20),
    sources: z.array(safeString).max(50).optional(),
    politicians: z.array(safeString).max(100).optional(),
    topics: z.array(safeString).max(20).optional(),
    sentiment: z.object({
      min: z.number().min(-1).max(1),
      max: z.number().min(-1).max(1)
    }).optional(),
    location: z.array(safeString).max(50).optional(),
    minRelevance: z.number().min(0).max(1).default(0.5)
  }),
  conditions: z.object({
    requireAll: z.boolean().default(false),
    timeWindow: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    dayOfWeek: z.array(z.number().min(0).max(6)).max(7).optional(),
    maxResponsesPerDay: z.number().min(1).max(100).default(10),
    cooldownHours: z.number().min(1).max(168).default(24)
  }),
  response: z.object({
    template: safeText.max(1000),
    tone: z.enum(['supportive', 'neutral', 'corrective', 'defensive', 'offensive']),
    channels: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'press', 'email'])).min(1),
    speed: z.enum(['instant', 'fast', 'standard']),
    requiresApproval: z.boolean(),
    approvalTimeout: z.number().min(60000).max(3600000).optional()
  })
});

export const createCampaignSchema = z.object({
  name: safeString.min(3).max(200),
  type: z.enum(['awareness', 'crisis', 'thought_leadership', 'competitive', 'seasonal']),
  objective: safeText.max(1000),
  duration: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  budget: z.object({
    total: z.number().min(0).max(10000000),
    perChannel: z.record(z.string(), z.number()).optional()
  }).optional(),
  targetAudience: z.array(z.object({
    segment: safeString,
    priority: z.enum(['primary', 'secondary', 'tertiary'])
  })).max(10),
  channels: z.array(z.enum(['social', 'email', 'press', 'seo', 'paid'])),
  kpis: z.array(z.object({
    metric: safeString,
    target: z.number(),
    unit: safeString
  })).max(20).optional()
});

export const contentGenerationSchema = z.object({
  topic: safeString.max(200),
  tone: z.enum(['professional', 'casual', 'urgent', 'empathetic', 'authoritative']),
  format: z.enum(['tweet', 'linkedin_post', 'press_release', 'email', 'blog']),
  targetAudience: safeString.max(100),
  keywords: z.array(safeString).max(20).optional(),
  length: z.object({
    min: z.number().min(10).max(10000),
    max: z.number().min(10).max(10000)
  }).optional(),
  includeStats: z.boolean().default(true),
  includeCallToAction: z.boolean().default(true)
});

export const crisisResponseSchema = z.object({
  crisisId: z.string().uuid(),
  strategy: z.enum(['acknowledge', 'counter', 'redirect', 'ignore']),
  urgency: z.enum(['immediate', 'high', 'medium', 'low']),
  channels: z.array(z.enum(['all', 'social', 'press', 'direct'])),
  keyMessages: z.array(safeText.max(500)).min(1).max(5),
  spokesperson: safeString.optional(),
  legalReview: z.boolean().default(false)
});

export const monitoringConfigSchema = z.object({
  sources: z.array(z.object({
    type: z.enum(['news', 'social', 'government', 'competitor']),
    name: safeString,
    url: z.string().url().optional(),
    priority: z.enum(['high', 'medium', 'low'])
  })).max(200),
  keywords: z.array(z.object({
    term: safeString.max(100),
    category: safeString,
    weight: z.number().min(0).max(1)
  })).max(500),
  updateFrequency: z.number().min(300000).max(86400000), // 5 min to 24 hours
  alertThreshold: z.number().min(0).max(1)
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500).transform(val => 
    // Remove SQL injection attempts
    val.replace(/[';"\-\-\/\*\*\/]/g, '')
  ),
  sources: z.array(safeString).max(50).optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'all']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (body: unknown): Promise<{ valid: boolean; data?: T; errors?: z.ZodError }> => {
    try {
      const data = await schema.parseAsync(body);
      return { valid: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error };
      }
      throw error;
    }
  };
}